# chrome-ai-tab-groups

A minimal Chrome extension that groups open tabs by regex rules with one click.

## How it works

Click the extension icon — it scans all open tabs, matches them against the rules in `background.js`, and groups matching tabs together. A badge briefly shows how many tabs were grouped.

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

Tabs that match no rule are left ungrouped. After editing rules, reload the extension at `chrome://extensions`.

## Installation

1. Clone this repo
2. Go to `chrome://extensions`
3. Enable Developer mode
4. Click "Load unpacked" and select the repo folder
