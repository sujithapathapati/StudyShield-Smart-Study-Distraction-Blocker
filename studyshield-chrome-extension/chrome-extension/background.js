const DEFAULT_API = "http://localhost:8081";

async function applyRules(focusOn, sites) {
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const cleanSites = [...new Set((sites || []).map((s) =>
    s.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "")
  ).filter(Boolean))];

  const addRules = focusOn ? cleanSites.map((domain, i) => ({
    id: i + 1,
    priority: 1,
    action: { type: "redirect", redirect: { extensionPath: "/blocked.html" } },
    condition: { requestDomains: [domain], resourceTypes: ["main_frame"] }
  })) : [];

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existing.map((r) => r.id),
    addRules
  });

  // Immediately redirect any already-open tab matching a blocked domain
  if (focusOn && cleanSites.length > 0) {
    const blockedUrl = chrome.runtime.getURL("blocked.html");
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (!tab.url || tab.url.startsWith("chrome")) continue;
      try {
        const host = new URL(tab.url).hostname.toLowerCase();
        const isBlocked = cleanSites.some((d) => host === d || host.endsWith("." + d));
        if (isBlocked) {
          chrome.tabs.update(tab.id, { url: blockedUrl });
        }
      } catch (e) {}
    }
  }
}

async function syncFromBackend() {
  const { ss_token = "", ss_api_url = DEFAULT_API } = await chrome.storage.local.get(["ss_token", "ss_api_url"]);
  if (!ss_token) {
    await chrome.storage.local.set({ focusOn: false, sites: [], goalTitle: "", connected: false });
    await applyRules(false, []);
    return;
  }
  try {
    const res = await fetch(`${ss_api_url}/api/extension/state`, {
      headers: { Authorization: `Bearer ${ss_token}` }
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    const focusOn = Boolean(data.focusOn);
    const sites = Array.isArray(data.sites) ? data.sites : [];
    const goalTitle = data.goalTitle || "";
    await chrome.storage.local.set({ focusOn, sites, goalTitle, connected: true });
    await applyRules(focusOn, sites);
  } catch (e) {
    // Keep last known rules if a single poll hiccups
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("syncState", { periodInMinutes: 0.1 });
  syncFromBackend();
});
chrome.runtime.onStartup.addListener(syncFromBackend);
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "syncState") syncFromBackend();
});
chrome.tabs.onActivated.addListener(syncFromBackend);
chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status === "loading") syncFromBackend();
});
chrome.storage.onChanged.addListener((changes) => {
  if (changes.ss_token || changes.ss_api_url) syncFromBackend();
});

// Fast 2-second loop while service worker is awake
setInterval(syncFromBackend, 2000);
syncFromBackend();
