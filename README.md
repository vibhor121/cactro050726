# Highlight Saver Chrome Extension

A Chrome extension built with Next.js and Tailwind that lets you:

- Select text on any website.
- Save highlights locally in the browser.
- Open a popup to view, delete, and summarize saved highlights.

## How it works

- The content script detects highlighted text and shows a small floating action.
- Saving stores entries in Chrome local storage.
- The popup reads the saved highlights and shows them in a scrollable list.
- The optional AI summary uses your own OpenAI API key directly from the popup.

## Frontend vs backend

This project is frontend-only. It uses the browser's built-in local storage and does not require a server.

If you later want to hide your API key or add user accounts, a small backend would be useful.

## Run locally

1. Install dependencies:
   - `bun install`
2. Build the extension bundle:
   - `bun run build`
3. Load the generated `out` folder in Chrome:
   - Open `chrome://extensions`
   - Enable Developer mode
   - Click **Load unpacked**
   - Select the `out` folder

## Usage

1. Visit any website and select text with your mouse.
2. Click **Save Highlight?** in the floating popup near your selection.
3. Click the extension icon in the toolbar to view, delete, or summarize saved highlights.
4. Optionally paste an OpenAI API key in the popup to enable **Summarize** (stored locally in your browser).

## Preview

- `bun run dev --port 3001`
