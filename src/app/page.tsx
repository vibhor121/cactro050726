'use client';

import Link from 'next/link';
import { Sparkles, Bookmark, Trash2 } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_45%)] px-6 py-10">
      <div className="w-full max-w-4xl rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl shadow-cyan-950/40 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-cyan-500/15 p-3 text-cyan-300">
            <Sparkles className="h-7 w-7" />
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">Chrome Extension</p>
            <h1 className="text-3xl font-semibold">Highlight Saver</h1>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
            <h2 className="text-xl font-semibold">What it does</h2>
            <ul className="space-y-3 text-sm text-slate-300">
              <li className="flex gap-3"><Bookmark className="mt-0.5 h-4 w-4 text-cyan-300" />Select text on any website and save it with a floating confirmation.</li>
              <li className="flex gap-3"><Trash2 className="mt-0.5 h-4 w-4 text-cyan-300" />Open the extension popup to browse, delete, or summarize saved highlights.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-6">
            <h2 className="text-lg font-semibold">Next steps</h2>
            <p className="mt-3 text-sm text-slate-300">Build the extension bundle and load it in Chrome from the generated out folder.</p>
            <Link
              href="/popup"
              className="mt-6 inline-flex rounded-full bg-cyan-400 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-300"
            >
              Open popup preview
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
