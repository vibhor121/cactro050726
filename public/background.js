chrome.runtime.onInstalled.addListener(async () => {
  const result = await chrome.storage.local.get('highlights');
  if (!Array.isArray(result.highlights)) {
    await chrome.storage.local.set({ highlights: [] });
  }
  await updateBadge();
});

async function updateBadge() {
  const result = await chrome.storage.local.get('highlights');
  const count = Array.isArray(result.highlights) ? result.highlights.length : 0;
  await chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
  await chrome.action.setBadgeBackgroundColor({ color: '#0891b2' });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.highlights) {
    void updateBadge();
  }
});

const GEMINI_PREFERRED = [
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
];

function friendlyGeminiError(message) {
  const msg = String(message);
  if (msg.includes('quota') || msg.includes('Quota') || msg.includes('limit: 0')) {
    return 'Free limit reached. Wait 1 minute and try again, or try again tomorrow.';
  }
  if (msg.includes('API key not valid') || msg.includes('API_KEY_INVALID')) {
    return 'Invalid API key. Copy the full key from aistudio.google.com/apikey (starts with AIza).';
  }
  if (msg.includes('referer') || msg.includes('referrer') || msg.includes('blocked')) {
    return 'API key is restricted. In Google Cloud Console, set key restrictions to "None", then create a new key.';
  }
  if (msg.includes('SERVICE_DISABLED') || msg.includes('has not been used') || msg.includes('it is disabled')) {
    return 'Enable Generative Language API for your project in Google Cloud Console, then try again.';
  }
  if (msg.includes('denied access') || msg.includes('PERMISSION_DENIED')) {
    return [
      'Google blocked this API project (not an extension bug).',
      'Fix: 1) Go to aistudio.google.com/apikey',
      '2) Click Create API key → pick "Create in new project"',
      '3) Paste the NEW key here.',
      'If still blocked: open console.cloud.google.com, select your project, and check for an appeal banner.',
    ].join(' ');
  }
  if (msg.length > 180) {
    return msg.slice(0, 180) + '...';
  }
  return msg || 'Summary failed. Try creating a new key at aistudio.google.com/apikey';
}

async function listGeminiModels(apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message ?? 'Could not list Gemini models.');
  }

  return (data.models || [])
    .filter((model) => model.supportedGenerationMethods?.includes('generateContent'))
    .map((model) => model.name.replace('models/', ''))
    .filter((name) => !name.includes('tts') && !name.includes('image') && !name.includes('live'));
}

function pickModels(available) {
  const picked = [];
  for (const preferred of GEMINI_PREFERRED) {
    if (available.includes(preferred)) picked.push(preferred);
  }
  for (const name of available) {
    if (!picked.includes(name) && name.includes('flash')) {
      picked.push(name);
    }
  }
  return picked.length ? picked : GEMINI_PREFERRED;
}

async function callGeminiModel(apiKey, model, text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: `Summarize this highlight in 2-3 short sentences:\n\n${text}` }],
        },
      ],
    }),
  });

  const data = await response.json();
  return { response, data, model };
}

async function summarizeWithGemini(apiKey, text) {
  const trimmed = String(text).slice(0, 6000);
  let modelsToTry = GEMINI_PREFERRED;
  let lastError = 'All Gemini models failed.';

  try {
    const available = await listGeminiModels(apiKey);
    modelsToTry = pickModels(available);
  } catch (error) {
    lastError = String(error);
    if (lastError.includes('API key') || lastError.includes('PERMISSION')) {
      return { ok: false, error: friendlyGeminiError(lastError) };
    }
  }

  for (const model of modelsToTry) {
    const { response, data } = await callGeminiModel(apiKey, model, trimmed);

    if (response.ok) {
      const summary = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Summary not available.';
      return { ok: true, summary, model };
    }

    lastError = data?.error?.message ?? `Request failed (${response.status}).`;

    if (lastError.includes('API key') || lastError.includes('API_KEY') || lastError.includes('PERMISSION_DENIED')) {
      return { ok: false, error: friendlyGeminiError(lastError) };
    }

    const retryable =
      lastError.includes('quota') ||
      lastError.includes('Quota') ||
      lastError.includes('limit: 0') ||
      lastError.includes('not found') ||
      lastError.includes('not supported') ||
      response.status === 404;

    if (!retryable) {
      return { ok: false, error: friendlyGeminiError(lastError) };
    }
  }

  return { ok: false, error: friendlyGeminiError(lastError) };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'SAVE_HIGHLIGHT' && message.entry) {
    (async () => {
      try {
        const result = await chrome.storage.local.get('highlights');
        const existing = Array.isArray(result.highlights) ? result.highlights : [];
        const next = [message.entry, ...existing];
        await chrome.storage.local.set({ highlights: next });
        sendResponse({ ok: true, count: next.length });
      } catch (error) {
        sendResponse({ ok: false, error: String(error) });
      }
    })();
    return true;
  }

  if (message?.type === 'GEMINI_SUMMARIZE' && message.apiKey && message.text) {
    (async () => {
      const result = await summarizeWithGemini(message.apiKey.trim(), message.text);
      sendResponse(result);
    })();
    return true;
  }

  return false;
});
