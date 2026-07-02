const STORAGE_ENTRIES = "timeEntries";
const STORAGE_RUNNING = "runningTimer";
const STORAGE_SCRIPT_URL = "scriptUrl";

const timerDisplay = document.getElementById("timerDisplay");
const projectInput = document.getElementById("projectInput");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const entriesList = document.getElementById("entriesList");
const manualForm = document.getElementById("manualForm");
const syncBtn = document.getElementById("syncBtn");

const settingsBtn = document.getElementById("settingsBtn");
const settingsModal = document.getElementById("settingsModal");
const scriptUrlInput = document.getElementById("scriptUrl");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");

let tickHandle = null;

function loadEntries() {
  return JSON.parse(localStorage.getItem(STORAGE_ENTRIES) || "[]");
}

function saveEntries(entries) {
  localStorage.setItem(STORAGE_ENTRIES, JSON.stringify(entries));
}

function getScriptUrl() {
  return localStorage.getItem(STORAGE_SCRIPT_URL) || "";
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function formatHMS(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function timeStringFromDate(d) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function dateStringFromDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function minutesBetween(dateStr, startStr, endStr) {
  const start = new Date(`${dateStr}T${startStr}:00`);
  let end = new Date(`${dateStr}T${endStr}:00`);
  if (end < start) end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
  return Math.round((end - start) / 60000);
}

function formatDuration(totalMin) {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} Min`;
  if (m === 0) return `${h} Std`;
  return `${h} Std ${m} Min`;
}

function renderEntries() {
  const entries = loadEntries().slice().sort((a, b) => (a.date + a.start < b.date + b.start ? 1 : -1));
  entriesList.innerHTML = "";
  for (const entry of entries) {
    const li = document.createElement("li");
    li.className = "entry";
    li.innerHTML = `
      <div class="entry-info">
        <div class="entry-title">${escapeHtml(entry.project)}</div>
        <div class="entry-meta">${entry.date} · ${entry.start}–${entry.end} · ${formatDuration(entry.durationMin)}${entry.note ? " · " + escapeHtml(entry.note) : ""}</div>
      </div>
      <span class="entry-status ${entry.synced ? "status-synced" : "status-pending"}">${entry.synced ? "OK" : "offen"}</span>
      <button class="entry-delete" data-id="${entry.id}" aria-label="Löschen">✕</button>
    `;
    entriesList.appendChild(li);
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

entriesList.addEventListener("click", (e) => {
  const btn = e.target.closest(".entry-delete");
  if (!btn) return;
  const id = btn.dataset.id;
  const entries = loadEntries().filter((entry) => entry.id !== id);
  saveEntries(entries);
  renderEntries();
});

function addEntry(entry) {
  const entries = loadEntries();
  entries.push(entry);
  saveEntries(entries);
  renderEntries();
  syncEntry(entry);
}

async function syncEntry(entry) {
  const url = getScriptUrl();
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(entry),
    });
    markSynced(entry.id);
  } catch (err) {
    // bleibt als "offen" markiert, wird beim naechsten Sync erneut versucht
  }
}

function markSynced(id) {
  const entries = loadEntries();
  const target = entries.find((e) => e.id === id);
  if (target) target.synced = true;
  saveEntries(entries);
  renderEntries();
}

syncBtn.addEventListener("click", async () => {
  const url = getScriptUrl();
  if (!url) {
    alert("Bitte zuerst in den Einstellungen die Apps-Script-URL hinterlegen.");
    return;
  }
  const entries = loadEntries().filter((e) => !e.synced);
  for (const entry of entries) {
    await syncEntry(entry);
  }
});

// --- Timer ---

function getRunning() {
  const raw = localStorage.getItem(STORAGE_RUNNING);
  return raw ? JSON.parse(raw) : null;
}

function setRunning(state) {
  if (state) {
    localStorage.setItem(STORAGE_RUNNING, JSON.stringify(state));
  } else {
    localStorage.removeItem(STORAGE_RUNNING);
  }
}

function updateTimerDisplay() {
  const running = getRunning();
  if (!running) {
    timerDisplay.textContent = "00:00:00";
    return;
  }
  const elapsed = (Date.now() - running.startTs) / 1000;
  timerDisplay.textContent = formatHMS(elapsed);
}

function startTick() {
  if (tickHandle) clearInterval(tickHandle);
  tickHandle = setInterval(updateTimerDisplay, 1000);
  updateTimerDisplay();
}

function stopTick() {
  if (tickHandle) clearInterval(tickHandle);
  tickHandle = null;
}

function refreshTimerUI() {
  const running = getRunning();
  if (running) {
    projectInput.value = running.project;
    projectInput.disabled = true;
    startBtn.disabled = true;
    stopBtn.disabled = false;
    startTick();
  } else {
    projectInput.disabled = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    stopTick();
    timerDisplay.textContent = "00:00:00";
  }
}

startBtn.addEventListener("click", () => {
  const project = projectInput.value.trim();
  if (!project) {
    alert("Bitte Projekt/Aufgabe eingeben.");
    return;
  }
  setRunning({ project, startTs: Date.now() });
  refreshTimerUI();
});

stopBtn.addEventListener("click", () => {
  const running = getRunning();
  if (!running) return;
  const startDate = new Date(running.startTs);
  const endDate = new Date();
  const entry = {
    id: `${running.startTs}-${Math.random().toString(36).slice(2, 8)}`,
    project: running.project,
    date: dateStringFromDate(startDate),
    start: timeStringFromDate(startDate),
    end: timeStringFromDate(endDate),
    durationMin: Math.max(1, Math.round((endDate - startDate) / 60000)),
    note: "",
    synced: false,
  };
  setRunning(null);
  projectInput.value = "";
  refreshTimerUI();
  addEntry(entry);
});

// --- Manuelle Eingabe ---

const mDateInput = document.getElementById("mDate");
const mStartInput = document.getElementById("mStart");
const mEndInput = document.getElementById("mEnd");
const mDurationPreview = document.getElementById("mDurationPreview");

function updateManualDurationPreview() {
  const date = mDateInput.value;
  const start = mStartInput.value;
  const end = mEndInput.value;
  if (!date || !start || !end) {
    mDurationPreview.textContent = "";
    return;
  }
  mDurationPreview.textContent = `Dauer: ${formatDuration(minutesBetween(date, start, end))}`;
}

[mDateInput, mStartInput, mEndInput].forEach((el) =>
  el.addEventListener("input", updateManualDurationPreview)
);

manualForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const project = document.getElementById("mProject").value.trim();
  const date = document.getElementById("mDate").value;
  const start = document.getElementById("mStart").value;
  const end = document.getElementById("mEnd").value;
  const note = document.getElementById("mNote").value.trim();
  if (!project || !date || !start || !end) return;

  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    project,
    date,
    start,
    end,
    durationMin: minutesBetween(date, start, end),
    note,
    synced: false,
  };
  addEntry(entry);
  manualForm.reset();
  document.getElementById("mDate").valueAsDate = new Date();
  updateManualDurationPreview();
});

// --- Einstellungen ---

settingsBtn.addEventListener("click", () => {
  scriptUrlInput.value = getScriptUrl();
  settingsModal.classList.remove("hidden");
});

closeSettingsBtn.addEventListener("click", () => {
  settingsModal.classList.add("hidden");
});

saveSettingsBtn.addEventListener("click", () => {
  localStorage.setItem(STORAGE_SCRIPT_URL, scriptUrlInput.value.trim());
  settingsModal.classList.add("hidden");
});

// --- Init ---

document.getElementById("mDate").valueAsDate = new Date();
refreshTimerUI();
renderEntries();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
