const STORAGE_ENTRIES = "timeEntries";
const STORAGE_RUNNING = "runningTimer";
const STORAGE_SCRIPT_URL = "scriptUrl";
const STORAGE_KM_RATE = "kmRate";
const STORAGE_THEME = "themeMode";
const DEFAULT_KM_RATE = 0.3;

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
const kmRateInput = document.getElementById("kmRate");
const themeSelect = document.getElementById("themeSelect");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");

let tickHandle = null;
let editingId = null;

function loadEntries() {
  return JSON.parse(localStorage.getItem(STORAGE_ENTRIES) || "[]");
}

function saveEntries(entries) {
  localStorage.setItem(STORAGE_ENTRIES, JSON.stringify(entries));
}

function getScriptUrl() {
  return localStorage.getItem(STORAGE_SCRIPT_URL) || "";
}

function getKmRate() {
  const stored = parseFloat(localStorage.getItem(STORAGE_KM_RATE));
  return isNaN(stored) ? DEFAULT_KM_RATE : stored;
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

function formatAmount(amount) {
  return `${amount.toFixed(2)} €`;
}

// --- Theme ---

function applyTheme() {
  const mode = localStorage.getItem(STORAGE_THEME) || "system";
  const effective = mode === "system"
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : mode;
  document.documentElement.setAttribute("data-theme", effective);
}

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if ((localStorage.getItem(STORAGE_THEME) || "system") === "system") applyTheme();
});

// --- Rendering ---

function buildMetaText(entry) {
  if (entry.type === "km") {
    const amount = entry.amount != null ? ` · ${formatAmount(entry.amount)}` : "";
    return `${entry.date} · ${entry.km} km${amount}${entry.note ? " · " + entry.note : ""}`;
  }
  return `${entry.date} · ${entry.start}–${entry.end} · ${formatDuration(entry.durationMin)}${entry.note ? " · " + entry.note : ""}`;
}

function createViewRow(entry) {
  const li = document.createElement("li");
  li.className = "entry";

  const info = document.createElement("div");
  info.className = "entry-info";
  const title = document.createElement("div");
  title.className = "entry-title";
  title.textContent = entry.project;
  const meta = document.createElement("div");
  meta.className = "entry-meta";
  meta.textContent = buildMetaText(entry);
  info.append(title, meta);

  const status = document.createElement("span");
  status.className = `entry-status ${entry.synced ? "status-synced" : "status-pending"}`;
  status.textContent = entry.synced ? "OK" : "offen";

  const editBtn = document.createElement("button");
  editBtn.className = "entry-icon-btn";
  editBtn.textContent = "✎";
  editBtn.setAttribute("aria-label", "Bearbeiten");
  editBtn.addEventListener("click", () => {
    editingId = entry.id;
    renderEntries();
  });

  const delBtn = document.createElement("button");
  delBtn.className = "entry-icon-btn";
  delBtn.textContent = "✕";
  delBtn.setAttribute("aria-label", "Löschen");
  delBtn.addEventListener("click", () => {
    saveEntries(loadEntries().filter((e) => e.id !== entry.id));
    renderEntries();
  });

  li.append(info, status, editBtn, delBtn);
  return li;
}

function createEditRow(entry) {
  const li = document.createElement("li");
  li.className = "entry entry-editing";

  const projectField = document.createElement("input");
  projectField.type = "text";
  projectField.value = entry.project;

  const dateField = document.createElement("input");
  dateField.type = "date";
  dateField.value = entry.date;

  const noteField = document.createElement("input");
  noteField.type = "text";
  noteField.placeholder = "Notiz";
  noteField.value = entry.note || "";

  const fieldsWrap = document.createElement("div");
  fieldsWrap.className = "edit-fields";

  let kmField, startField, endField;
  if (entry.type === "km") {
    kmField = document.createElement("input");
    kmField.type = "number";
    kmField.step = "0.1";
    kmField.min = "0";
    kmField.value = entry.km;
    fieldsWrap.append(dateField, kmField);
  } else {
    startField = document.createElement("input");
    startField.type = "time";
    startField.value = entry.start;
    endField = document.createElement("input");
    endField.type = "time";
    endField.value = entry.end;
    fieldsWrap.append(dateField, startField, endField);
  }

  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.className = "btn-small primary";
  saveBtn.textContent = "Speichern";
  saveBtn.addEventListener("click", () => {
    const entries = loadEntries();
    const target = entries.find((e) => e.id === entry.id);
    if (!target) return;
    target.project = projectField.value.trim() || target.project;
    target.date = dateField.value || target.date;
    target.note = noteField.value.trim();
    if (entry.type === "km") {
      const km = parseFloat(kmField.value);
      if (!isNaN(km)) {
        target.km = km;
        target.rate = target.rate || getKmRate();
        target.amount = Math.round(km * target.rate * 100) / 100;
      }
    } else {
      target.start = startField.value || target.start;
      target.end = endField.value || target.end;
      target.durationMin = minutesBetween(target.date, target.start, target.end);
    }
    target.synced = false;
    saveEntries(entries);
    editingId = null;
    renderEntries();
    syncEntry(target);
  });

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "btn-small";
  cancelBtn.textContent = "Abbrechen";
  cancelBtn.addEventListener("click", () => {
    editingId = null;
    renderEntries();
  });

  const btnRow = document.createElement("div");
  btnRow.className = "btn-row";
  btnRow.append(saveBtn, cancelBtn);

  const wrap = document.createElement("div");
  wrap.className = "entry-edit-wrap";
  wrap.append(projectField, fieldsWrap, noteField, btnRow);
  li.appendChild(wrap);
  return li;
}

function renderEntries() {
  const entries = loadEntries()
    .slice()
    .sort((a, b) => (a.date + (a.start || "") < b.date + (b.start || "") ? 1 : -1));
  entriesList.innerHTML = "";
  for (const entry of entries) {
    entriesList.appendChild(entry.id === editingId ? createEditRow(entry) : createViewRow(entry));
  }
}

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
    type: "time",
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

const mProject = document.getElementById("mProject");
const mDateInput = document.getElementById("mDate");
const mStartInput = document.getElementById("mStart");
const mEndInput = document.getElementById("mEnd");
const mKmInput = document.getElementById("mKm");
const mNoteInput = document.getElementById("mNote");
const mPreview = document.getElementById("mPreview");
const timeFields = document.getElementById("timeFields");
const kmFields = document.getElementById("kmFields");
const tabBtns = document.querySelectorAll(".tab-btn");

let manualType = "time";

function setManualType(type) {
  manualType = type;
  const isKm = type === "km";
  tabBtns.forEach((btn) => btn.classList.toggle("active", btn.dataset.type === type));
  timeFields.classList.toggle("hidden", isKm);
  kmFields.classList.toggle("hidden", !isKm);
  mStartInput.required = !isKm;
  mEndInput.required = !isKm;
  mKmInput.required = isKm;
  mProject.placeholder = isKm ? "Zweck / Strecke" : "Projekt / Aufgabe";
  updateManualPreview();
}

tabBtns.forEach((btn) => btn.addEventListener("click", () => setManualType(btn.dataset.type)));

function updateManualPreview() {
  const date = mDateInput.value;
  if (manualType === "km") {
    const km = parseFloat(mKmInput.value);
    if (!date || isNaN(km)) {
      mPreview.textContent = "";
      return;
    }
    const rate = getKmRate();
    mPreview.textContent = `Betrag: ${formatAmount(km * rate)} (${km} km × ${rate.toFixed(2)} €)`;
  } else {
    const start = mStartInput.value;
    const end = mEndInput.value;
    if (!date || !start || !end) {
      mPreview.textContent = "";
      return;
    }
    mPreview.textContent = `Dauer: ${formatDuration(minutesBetween(date, start, end))}`;
  }
}

[mDateInput, mStartInput, mEndInput, mKmInput].forEach((el) =>
  el.addEventListener("input", updateManualPreview)
);

manualForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const project = mProject.value.trim();
  const date = mDateInput.value;
  const note = mNoteInput.value.trim();
  if (!project || !date) return;

  let entry;
  if (manualType === "km") {
    const km = parseFloat(mKmInput.value);
    if (isNaN(km)) return;
    const rate = getKmRate();
    entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: "km",
      project,
      date,
      km,
      rate,
      amount: Math.round(km * rate * 100) / 100,
      note,
      synced: false,
    };
  } else {
    const start = mStartInput.value;
    const end = mEndInput.value;
    if (!start || !end) return;
    entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: "time",
      project,
      date,
      start,
      end,
      durationMin: minutesBetween(date, start, end),
      note,
      synced: false,
    };
  }
  addEntry(entry);
  manualForm.reset();
  mDateInput.valueAsDate = new Date();
  updateManualPreview();
});

// --- Einstellungen ---

settingsBtn.addEventListener("click", () => {
  scriptUrlInput.value = getScriptUrl();
  kmRateInput.value = getKmRate();
  themeSelect.value = localStorage.getItem(STORAGE_THEME) || "system";
  settingsModal.classList.remove("hidden");
});

closeSettingsBtn.addEventListener("click", () => {
  settingsModal.classList.add("hidden");
});

saveSettingsBtn.addEventListener("click", () => {
  localStorage.setItem(STORAGE_SCRIPT_URL, scriptUrlInput.value.trim());
  const rate = parseFloat(kmRateInput.value);
  localStorage.setItem(STORAGE_KM_RATE, isNaN(rate) ? DEFAULT_KM_RATE : rate);
  localStorage.setItem(STORAGE_THEME, themeSelect.value);
  applyTheme();
  updateManualPreview();
  settingsModal.classList.add("hidden");
});

// --- Init ---

mDateInput.valueAsDate = new Date();
refreshTimerUI();
renderEntries();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
