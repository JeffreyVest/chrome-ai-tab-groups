const COLORS = ['blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange', 'grey'];
let colorIndex = 0;

// --- Grouping rules ---
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

async function groupAllTabs() {
  const tabs = await chrome.tabs.query({ currentWindow: true });

  const eligible = tabs.filter(t =>
    t.url &&
    !t.url.startsWith('chrome://') &&
    !t.url.startsWith('chrome-extension://')
  );

  if (eligible.length === 0) return { grouped: 0, total: 0 };

  // Ungroup everything first
  const alreadyGrouped = eligible.filter(t => t.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE);
  if (alreadyGrouped.length > 0) {
    await chrome.tabs.ungroup(alreadyGrouped.map(t => t.id));
  }

  // Bucket tabs by matched group name
  const buckets = {}; // groupName -> [tabId]
  for (const tab of eligible) {
    const name = matchRule(tab);
    if (name) {
      if (!buckets[name]) buckets[name] = [];
      buckets[name].push(tab.id);
    }
  }

  // Create groups for any bucket with 2+ tabs
  let grouped = 0;
  for (const [name, tabIds] of Object.entries(buckets)) {
    if (tabIds.length >= 1) {
      await createGroup(name, tabIds);
      grouped += tabIds.length;
    }
  }

  return { grouped, total: eligible.length };
}
