# chrome-ai-tab-groups

A minimal Chrome extension that groups open tabs with one click — no AI, no network calls, no permissions beyond `tabs` and `tabGroups`.

## How it works

Click the extension icon — it scans all open tabs in the current window and groups them in three steps:

1. **Rules** — tabs whose title + URL match a regex rule in `RULES` are grouped by rule name. Even a single matching tab gets its own group.
2. **Domain** — remaining normal tabs are grouped by hostname if 2+ share the same domain (e.g. all your `github.com` tabs).
3. **Chrome pages** — any open `chrome://` tabs (Settings, Extensions, History, etc.) are collected into a single "Chrome" group.

A badge briefly shows how many tabs were grouped.

Each run ungroups everything first, so clicking again re-groups from scratch.

## Adding rules

Open `background.js` and add entries to the `RULES` array at the top:

```js
const RULES = [
  // Groups tabs sharing the same ticket number (e.g. PX-1234) across Jira, Bitbucket, etc.
  {
    pattern: /\b([A-Z]{2,6}-\d+)\b/,
    group: match => match[1].toUpperCase()
  },

  // Examples:
  // { pattern: /github\.com/, group: 'GitHub' },
  // { pattern: /localhost/, group: 'Local Dev' },
];
```

Each rule is tested against the tab's title + URL. The first match wins. `group` can be a string or a function that receives the regex match array.

After editing rules, reload the extension at `chrome://extensions`.

## Installation

1. Clone this repo
2. Go to `chrome://extensions`
3. Enable Developer mode
4. Click "Load unpacked" and select the repo folder
