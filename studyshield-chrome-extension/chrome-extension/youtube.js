// Smart YouTube mode: during focus, hide Shorts, the home feed and recommendations; keep search and watch pages.
let style;
function update(on) {
  if (on && !style) {
    style = document.createElement("style");
    style.textContent = `ytd-reel-shelf-renderer, ytd-rich-shelf-renderer[is-shorts], a[title="Shorts"], ytd-guide-entry-renderer:has(a[title="Shorts"]),
      ytd-browse[page-subtype="home"] #contents, #related, ytd-watch-next-secondary-results-renderer, .ytp-endscreen-content { display:none !important; }`;
    document.documentElement.appendChild(style);
  } else if (!on && style) { style.remove(); style = null; }
  if (on && location.pathname.startsWith("/shorts")) location.replace("https://www.youtube.com/results?search_query=study");
}
chrome.storage.local.get("focusOn").then(({ focusOn }) => update(!!focusOn));
chrome.storage.onChanged.addListener((c) => c.focusOn && update(!!c.focusOn.newValue));
setInterval(() => chrome.storage.local.get("focusOn").then(({ focusOn }) => update(!!focusOn)), 2000);
