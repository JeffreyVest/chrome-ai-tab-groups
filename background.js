const COLORS = ['blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange', 'grey'];
let colorIndex = 0;

// --- Grouping rules (Step 1) ---
// Each rule: { pattern: RegExp, group: string | fn(match) => string }
// Rules are tested against "<title> <url>" for each tab.
// The first matching rule wins.
// If group is a function, it receives the regex match array and returns the group name.
const RULES = [
  // Groups tabs sharing the same ticket number (e.g. PX-1234) across Jira, Bitbucket, etc.
  {
    pattern: /\b([A-Z]{2,6}-\d+)\b/,
    group: match => match[1].toUpperCase()
  },

  // Add more rules below, e.g.:
  // { pattern: /github\.com/, group: 'GitHub' },
  // { pattern: /localhost/, group: 'Local Dev' },
];
// ----------------------

chrome.action.onClicked.addListener(() => {
  chrome.action.setBadgeText({ text: '...' });
  chrome.action.setBadgeBackgroundColor({ color: '#cba6f7' });
  groupAllTabs().then(({ grouped, total }) => {
    chrome.action.setBadgeText({ text: `${grouped}` });
    setTimeout(() => chrome.action.setBadgeText({ text: '' }), 2000);
  });
});

function matchRule(tab) {
  const text = `${tab.title} ${tab.url}`;
  for (const rule of RULES) {
    const match = text.match(rule.pattern);
    if (match) {
      return typeof rule.group === 'function' ? rule.group(match) : rule.group;
    }
  }
  return null;
}

async function createGroup(name, tabIds) {
  if (tabIds.length === 0) return;
  const groupId = await chrome.tabs.group({ tabIds });
  await chrome.tabGroups.update(groupId, {
    title: name,
    color: COLORS[colorIndex % COLORS.length]
  });
  colorIndex++;
}

// Step 1: Regex rules — tabs whose title+URL match a RULE; even solo matches get grouped.
async function groupByRule(tabs, groupedIds) {
  const buckets = {};
  for (const tab of tabs) {
    if (!tab.url) continue;
    const name = matchRule(tab);
    if (name) {
      if (!buckets[name]) buckets[name] = [];
      buckets[name].push(tab.id);
    }
  }
  let count = 0;
  for (const [name, tabIds] of Object.entries(buckets)) {
    await createGroup(name, tabIds);
    count += tabIds.length;
    tabIds.forEach(id => groupedIds.add(id));
  }
  return count;
}

// Step 2: Domain grouping — unmatched normal tabs with 2+ open on the same hostname.
async function groupByDomain(tabs, groupedIds) {
  const buckets = {};
  for (const tab of tabs) {
    if (!tab.url || groupedIds.has(tab.id)) continue;
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) continue;
    try {
      const host = new URL(tab.url).hostname.replace(/^www\./, '');
      if (!buckets[host]) buckets[host] = [];
      buckets[host].push(tab.id);
    } catch { /* skip unparseable URLs */ }
  }
  let count = 0;
  for (const [host, tabIds] of Object.entries(buckets)) {
    if (tabIds.length >= 2) {
      await createGroup(host, tabIds);
      count += tabIds.length;
      tabIds.forEach(id => groupedIds.add(id));
    }
  }
  return count;
}

// Step 3: Chrome pages — all chrome:// tabs collected into a single "Chrome" group.
async function groupChromePages(tabs, groupedIds) {
  const tabIds = tabs.filter(t => t.url?.startsWith('chrome://') && !groupedIds.has(t.id)).map(t => t.id);
  if (tabIds.length === 0) return 0;
  await createGroup('Chrome', tabIds);
  return tabIds.length;
}

async function groupAllTabs() {
  const allTabs = await chrome.tabs.query({ currentWindow: true });

  // Ungroup everything first so each run starts clean
  const alreadyGrouped = allTabs.filter(t => t.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE);
  if (alreadyGrouped.length > 0) {
    await chrome.tabs.ungroup(alreadyGrouped.map(t => t.id));
  }

  const groupedIds = new Set();
  let grouped = 0;
  grouped += await groupByRule(allTabs, groupedIds);
  grouped += await groupByDomain(allTabs, groupedIds);
  grouped += await groupChromePages(allTabs, groupedIds);

  return { grouped, total: allTabs.length };
}
