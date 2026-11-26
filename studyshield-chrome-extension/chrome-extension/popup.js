async function render() {
  const { focusOn = false, sites = [], goalTitle = "", connected = false } =
    await chrome.storage.local.get(["focusOn", "sites", "goalTitle", "connected"]);
  const statusEl = document.getElementById("status");
  const goalEl = document.getElementById("goal");
  const listEl = document.getElementById("list");

  if (!connected) {
    statusEl.textContent = "Open localhost:8080 & log in";
    statusEl.className = "badge off";
  } else if (focusOn) {
    statusEl.textContent = "Focus Session ACTIVE — Blocking ON";
    statusEl.className = "badge on";
    goalEl.textContent = goalTitle ? `Goal: ${goalTitle}` : "";
  } else {
    statusEl.textContent = "Synced — Start a session to block";
    statusEl.className = "badge off";
    goalEl.textContent = "";
  }

  listEl.innerHTML = sites.length
    ? sites.map((s) => `<li>${s}</li>`).join("")
    : "<li>No enabled sites</li>";
}
render();
setInterval(render, 1500);
