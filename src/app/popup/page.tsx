'use client';

import { useEffect, useMemo, useState } from 'react';
import { Trash2, Sparkles, Loader2, ExternalLink } from 'lucide-react';

type HighlightEntry = {
  id: string;
  text: string;
  sourceUrl: string;
  title: string;
  createdAt: string;
};

export default function PopupPage() {
  const [highlights, setHighlights] = useState<HighlightEntry[]>([]);
  const [apiKey, setApiKey] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [summary, setSummary] = useState<Record<string, string>>({});

  const loadHighlights = async () => {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
    const result = await chrome.storage.local.get('highlights');
    setHighlights((result.highlights as HighlightEntry[] | undefined) ?? []);
  };

  useEffect(() => {
    void loadHighlights();

    const loadApiKey = async () => {
      if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
      const result = await chrome.storage.local.get('openaiApiKey');
      if (typeof result.openaiApiKey === 'string') {
        setApiKey(result.openaiApiKey);
      }
    };
    void loadApiKey();

    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.onChanged?.addListener) {
        const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
          if (area !== 'local') return;
          if (changes.highlights) {
            void loadHighlights();
          }
        };
        chrome.storage.onChanged.addListener(listener);
        return () => chrome.storage.onChanged.removeListener(listener);
      }
    } catch {
      // dev preview without chrome API
    }
  }, []);

  const saveApiKey = async (value: string) => {
    setApiKey(value);
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
    await chrome.storage.local.set({ openaiApiKey: value });
  };

  const deleteHighlight = async (id: string) => {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
    const next = highlights.filter((item) => item.id !== id);
    setHighlights(next);
    setSummary((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    await chrome.storage.local.set({ highlights: next });
  };

  const summarizeHighlight = async (item: HighlightEntry) => {
    if (!apiKey.trim()) {
      setSummary((prev) => ({
        ...prev,
        [item.id]: 'Add your OpenAI API key above to use Summarize.',
      }));
      return;
    }

    setBusyId(item.id);
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant. Give a short summary of the highlight in 2-3 sentences.',
            },
            {
              role: 'user',
              content: item.text,
            },
          ],
          temperature: 0.2,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        const message = data?.error?.message ?? `Request failed (${response.status}).`;
        setSummary((prev) => ({ ...prev, [item.id]: message }));
        return;
      }

      const text = data?.choices?.[0]?.message?.content ?? 'Summary was not available.';
      setSummary((prev) => ({ ...prev, [item.id]: text }));
    } catch {
      setSummary((prev) => ({
        ...prev,
        [item.id]: 'The summary request failed. Check your API key and network connection.',
      }));
    } finally {
      setBusyId(null);
    }
  };

  const emptyState = useMemo(() => highlights.length === 0, [highlights.length]);

  return (
    <main className="flex h-[600px] flex-col bg-slate-950 px-4 py-4 text-slate-100">
      <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col gap-3 overflow-hidden">
        <div className="shrink-0 rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl shadow-black/30">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-cyan-500/15 p-2 text-cyan-300">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Highlight Saver</h1>
              <p className="text-xs text-slate-400">
                {highlights.length === 0
                  ? 'No highlights saved yet.'
                  : `${highlights.length} highlight${highlights.length === 1 ? '' : 's'} saved.`}
              </p>
            </div>
          </div>
        </div>

        <div className="shrink-0 rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
          <label className="mb-2 block text-sm text-slate-300">OpenAI API key (optional)</label>
          <input
            value={apiKey}
            onChange={(event) => void saveApiKey(event.target.value)}
            placeholder="sk-..."
            type="password"
            autoComplete="off"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none ring-0 focus:border-cyan-500/50"
          />
          <p className="mt-2 text-[11px] leading-5 text-slate-500">
            Stored locally in your browser. Used only when you click Summarize.
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {emptyState ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/70 p-5 text-left text-sm text-slate-400">
              <p className="mb-3 text-center font-medium text-slate-300">No highlights yet</p>
              <ol className="list-decimal space-y-2 pl-5 leading-6">
                <li>Select text on any webpage (drag your mouse over words).</li>
                <li>
                  A small <span className="text-cyan-300">Save Highlight?</span> button appears near your selection.
                </li>
                <li>
                  <strong className="text-slate-300">Click that button first</strong> — selecting text alone does not save it.
                </li>
                <li>Then open this popup to see your saved highlights.</li>
              </ol>
              <p className="mt-3 text-center text-[11px] text-slate-500">
                Tip: refresh the page once after installing the extension.
              </p>
            </div>
          ) : (
            highlights.map((item) => (
              <article key={item.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.25em] text-cyan-300 hover:text-cyan-200"
                    >
                      <span className="truncate">{item.title}</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                    <p className="mt-1 text-sm leading-6 text-slate-200">{item.text}</p>
                  </div>
                  <button
                    onClick={() => void deleteHighlight(item.id)}
                    className="shrink-0 rounded-full border border-slate-700 p-2 text-slate-300 transition hover:border-rose-500 hover:text-rose-300"
                    aria-label="Delete highlight"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-[11px] text-slate-500">{new Date(item.createdAt).toLocaleString()}</p>
                  <button
                    onClick={() => void summarizeHighlight(item)}
                    disabled={busyId === item.id}
                    className="inline-flex items-center gap-2 rounded-full bg-cyan-500/15 px-3 py-1.5 text-sm text-cyan-300 transition hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busyId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Summarize
                  </button>
                </div>

                {summary[item.id] ? (
                  <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-sm leading-6 text-slate-300">
                    {summary[item.id]}
                  </div>
                ) : null}
              </article>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
