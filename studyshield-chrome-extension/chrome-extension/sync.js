function pushAuthToExtension() {
  try {
    const token = localStorage.getItem("ss_token") || "";
    const apiUrl = localStorage.getItem("ss_api_url") || "http://localhost:8081";
    chrome.storage.local.set({ ss_token: token, ss_api_url: apiUrl });
  } catch (e) {}
}

pushAuthToExtension();
setInterval(pushAuthToExtension, 1500);
window.addEventListener("storage", pushAuthToExtension);
