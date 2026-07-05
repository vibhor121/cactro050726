const listEl = document.getElementById('list');
const countLabel = document.getElementById('count-label');
const apiKeyInput = document.getElementById('api-key');
const providerSelect = document.getElementById('ai-provider');

let highlights = [];
let summaries = {};

const PLACEHOLDERS = {
  gemini: 'Paste your Gemini API key here (AIza...)',
  openai: 'Paste your OpenAI API key here (sk-...)',
};

async function loadSettings() {
  const result = await chrome.storage.local.get(['aiProvider', 'aiApiKey', 'openaiApiKey']);
  const provider = result.aiProvider === 'openai' ? 'openai' : 'gemini';
  providerSelect.value = provider;

  const savedKey =
    typeof result.aiApiKey === 'string'
      ? result.aiApiKey
      : typeof result.openaiApiKey === 'string'
        ? result.openaiApiKey
        : '';

  apiKeyInput.value = savedKey;
  apiKeyInput.placeholder = PLACEHOLDERS[provider];
}

async function saveSettings() {
  await chrome.storage.local.set({
    aiProvider: providerSelect.value,
    aiApiKey: apiKeyInput.value,
  });
}

providerSelect.addEventListener('change', async () => {
  apiKeyInput.placeholder = PLACEHOLDERS[providerSelect.value];
  await saveSettings();
});

apiKeyInput.addEventListener('input', async () => {
  await saveSettings();
});

async function loadHighlights() {
  const result = await chrome.storage.local.get('highlights');
  highlights = Array.isArray(result.highlights) ? result.highlights : [];
  render();
}

function render() {
  countLabel.textContent =
    highlights.length === 0
      ? 'No highlights saved yet.'
      : `${highlights.length} highlight${highlights.length === 1 ? '' : 's'} saved.`;

  if (highlights.length === 0) {
    listEl.innerHTML = `
      <div class="empty">
        <p><strong>No highlights yet</strong></p>
        <p style="margin-top:10px">Select text on a page, click <span style="color:#67e8f9">Save Highlight</span>, then open this popup again.</p>
      </div>`;
    return;
  }

  listEl.innerHTML = highlights
    .map(
      (item) => `
    <article class="item" data-id="${item.id}">
      <div class="item-top">
        <div style="min-width:0;flex:1">
          <a class="item-title" href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noreferrer">
            ${escapeHtml(item.title)}
          </a>
          <p class="item-text">${escapeHtml(item.text)}</p>
        </div>
        <button class="delete-btn" data-delete="${item.id}" title="Delete">🗑</button>
      </div>
      <div class="item-footer">
        <span class="item-date">${new Date(item.createdAt).toLocaleString()}</span>
        <button class="summarize-btn" data-summarize="${item.id}">✦ Summarize</button>
      </div>
      ${summaries[item.id] ? `<div class="summary">${escapeHtml(summaries[item.id])}</div>` : ''}
    </article>`,
    )
    .join('');

  listEl.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', () => void deleteHighlight(btn.dataset.delete));
  });

  listEl.querySelectorAll('[data-summarize]').forEach((btn) => {
    btn.addEventListener('click', () => void summarizeHighlight(btn.dataset.summarize, btn));
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

async function deleteHighlight(id) {
  highlights = highlights.filter((item) => item.id !== id);
  delete summaries[id];
  await chrome.storage.local.set({ highlights });
  render();
}

// Gemini summarize runs in background.js for reliability
async function summarizeWithGemini(apiKey, text) {
  const response = await chrome.runtime.sendMessage({
    type: 'GEMINI_SUMMARIZE',
    apiKey,
    text,
  });

  if (!response) {
    return 'Extension busy — reload the extension and try again.';
  }

  if (response.ok) {
    return response.summary;
  }

  return response.error ?? 'Summary failed. Create a new key at aistudio.google.com/apikey';
}

async function summarizeWithOpenAI(apiKey, text) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant. Give a short summary of the highlight in 2-3 sentences.',
        },
        { role: 'user', content: text },
      ],
      temperature: 0.2,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    return data?.error?.message ?? `OpenAI request failed (${response.status}).`;
  }

  return data?.choices?.[0]?.message?.content ?? 'Summary not available.';
}

async function summarizeHighlight(id, button) {
  const item = highlights.find((h) => h.id === id);
  if (!item) return;

  const apiKey = apiKeyInput.value.trim();
  const provider = providerSelect.value;

  if (!apiKey) {
    summaries[id] =
      provider === 'gemini'
        ? 'Add your free Gemini API key above. Get one at aistudio.google.com/apikey'
        : 'Add your OpenAI API key above to use Summarize.';
    render();
    return;
  }

  button.disabled = true;
  button.textContent = 'Summarizing...';

  try {
    summaries[id] =
      provider === 'openai'
        ? await summarizeWithOpenAI(apiKey, item.text)
        : await summarizeWithGemini(apiKey, item.text);
  } catch {
    summaries[id] = 'Summary failed. Check your API key and internet connection.';
  }

  render();
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.highlights) {
    void loadHighlights();
  }
});

void loadSettings();
void loadHighlights();
