/* Property Inspector logic for MIDI Bridge.
   Connects to Stream Deck, binds fields to settings, and drives the interactive
   piano, sliders, color swatches, test button, activity LED, and port status. */

let websocket = null;
let propertyInspectorUUID = null;
let actionUUID = null;
let settings = {};

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const WHITE_SEMITONES = [0, 2, 4, 5, 7, 9, 11];
const BLACK_SEMITONES = [1, 3, 6, 8, 10];

/** MIDI note number → name like "C2" (60 = C4). */
function noteName(note) {
  const octave = Math.floor(note / 12) - 1;
  return NOTE_NAMES[((note % 12) + 12) % 12] + octave;
}

/* ---------------- Stream Deck connection ---------------- */

function connectElgatoStreamDeckSocket(inPort, inUUID, inRegisterEvent, inInfo, inActionInfo) {
  propertyInspectorUUID = inUUID;

  const actionInfo = JSON.parse(inActionInfo);
  actionUUID = actionInfo.action;
  settings = actionInfo.payload.settings || {};

  websocket = new WebSocket("ws://127.0.0.1:" + inPort);
  websocket.onopen = function handleOpen() {
    sendToStreamDeck({ event: inRegisterEvent, uuid: inUUID });
    initFields();
    initSliders();
    initSwatches();
    initPiano();
    initButtons();
    requestPorts();
  };
  websocket.onmessage = handleSocketMessage;
}

function sendToStreamDeck(payload) {
  if (websocket && websocket.readyState === WebSocket.OPEN) {
    websocket.send(JSON.stringify(payload));
  }
}

function persistSettings() {
  sendToStreamDeck({ event: "setSettings", context: propertyInspectorUUID, payload: settings });
}

function updateSetting(key, value) {
  settings[key] = value;
  persistSettings();
}

function sendToPlugin(payload) {
  sendToStreamDeck({ event: "sendToPlugin", action: actionUUID, context: propertyInspectorUUID, payload });
}

function requestPorts() {
  sendToPlugin({ event: "getPorts" });
}

function handleSocketMessage(event) {
  const data = JSON.parse(event.data);
  if (data.event !== "sendToPropertyInspector" || !data.payload) return;

  if (data.payload.event === "ports") {
    populatePorts(data.payload.ports || []);
  } else if (data.payload.event === "activity") {
    pulseActivity();
  }
}

/* ---------------- Generic field binding ---------------- */

function coerce(field, value) {
  if (field.getAttribute("data-type") === "int") {
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return value;
}

/** Bind selects, number inputs, and checkboxes (sliders handled separately). */
function initFields() {
  const fields = document.querySelectorAll("select[data-setting], input[type='number'][data-setting], input[type='checkbox'][data-setting]");
  fields.forEach(function bindField(field) {
    const key = field.getAttribute("data-setting");

    if (field.type === "checkbox") {
      if (settings[key] !== undefined) field.checked = !!settings[key];
      field.addEventListener("change", function onCheck() {
        updateSetting(key, field.checked);
      });
      return;
    }

    if (settings[key] !== undefined && settings[key] !== null) {
      field.value = settings[key];
    } else if (field.value !== "") {
      settings[key] = coerce(field, field.value);
    }
    field.addEventListener("change", function onChange() {
      updateSetting(key, coerce(field, field.value));
    });
  });
}

/* ---------------- Range sliders with live value ---------------- */

function initSliders() {
  const sliders = document.querySelectorAll("input[type='range'][data-setting]");
  sliders.forEach(function bindSlider(slider) {
    const key = slider.getAttribute("data-setting");
    const output = document.querySelector("[data-for='" + slider.id + "']");

    if (settings[key] !== undefined && settings[key] !== null) {
      slider.value = settings[key];
    } else {
      settings[key] = coerce(slider, slider.value);
    }
    if (output) output.textContent = slider.value;

    slider.addEventListener("input", function onInput() {
      if (output) output.textContent = slider.value;
    });
    slider.addEventListener("change", function onCommit() {
      updateSetting(key, coerce(slider, slider.value));
    });
  });
}

/* ---------------- Color swatches ---------------- */

function initSwatches() {
  const swatches = document.querySelectorAll(".ac-swatch");
  if (swatches.length === 0) return;

  const container = swatches[0].parentElement;
  const fallback = container.getAttribute("data-default") || "#7c3aed";
  const current = settings.keyColor || fallback;
  settings.keyColor = current;

  swatches.forEach(function bindSwatch(swatch) {
    const color = swatch.getAttribute("data-color");
    swatch.style.background = color;
    if (color.toLowerCase() === current.toLowerCase()) swatch.classList.add("is-selected");

    swatch.addEventListener("click", function onPick() {
      swatches.forEach((s) => s.classList.remove("is-selected"));
      swatch.classList.add("is-selected");
      updateSetting("keyColor", color);
    });
  });
}

/* ---------------- Piano note picker ---------------- */

function currentNote() {
  return settings.note !== undefined ? settings.note : 36;
}

function currentOctave() {
  return Math.floor(currentNote() / 12) - 1;
}

function initPiano() {
  const piano = document.getElementById("ac-piano");
  if (!piano) return;

  // White keys
  WHITE_SEMITONES.forEach(function addWhite(semi) {
    const key = document.createElement("div");
    key.className = "ac-key-white";
    key.setAttribute("data-semi", semi);
    key.addEventListener("click", () => setNoteFromPiano(semi));
    piano.appendChild(key);
  });
  // Black keys (absolute, positioned via CSS)
  BLACK_SEMITONES.forEach(function addBlack(semi) {
    const key = document.createElement("div");
    key.className = "ac-key-black";
    key.setAttribute("data-semi", semi);
    key.addEventListener("click", () => setNoteFromPiano(semi));
    piano.appendChild(key);
  });

  const dec = document.querySelector(".ac-oct-dec");
  const inc = document.querySelector(".ac-oct-inc");
  if (dec) dec.addEventListener("click", () => shiftOctave(-1));
  if (inc) inc.addEventListener("click", () => shiftOctave(1));

  refreshPiano();
}

function setNoteFromPiano(semitone) {
  const octave = currentOctave();
  const note = Math.max(0, Math.min(127, (octave + 1) * 12 + semitone));
  updateSetting("note", note);
  refreshPiano();
}

function shiftOctave(direction) {
  const semitone = ((currentNote() % 12) + 12) % 12;
  const octave = Math.max(-1, Math.min(9, currentOctave() + direction));
  const note = Math.max(0, Math.min(127, (octave + 1) * 12 + semitone));
  updateSetting("note", note);
  refreshPiano();
}

function refreshPiano() {
  const note = currentNote();
  const activeSemi = ((note % 12) + 12) % 12;

  document.querySelectorAll("#ac-piano [data-semi]").forEach(function markKey(key) {
    const semi = parseInt(key.getAttribute("data-semi"), 10);
    key.classList.toggle("is-selected", semi === activeSemi);
  });

  const badge = document.getElementById("ac-note-name");
  if (badge) badge.textContent = noteName(note);
  const octaveLabel = document.getElementById("ac-octave");
  if (octaveLabel) octaveLabel.textContent = currentOctave();
}

/* ---------------- Buttons: test, set-default, refresh ---------------- */

function initButtons() {
  const testBtn = document.querySelector("[data-action='test']");
  if (testBtn) testBtn.addEventListener("click", () => sendToPlugin({ event: "test" }));

  const defaultBtn = document.querySelector("[data-action='set-default']");
  if (defaultBtn) {
    defaultBtn.addEventListener("click", function onSetDefault() {
      if (settings.portName) sendToPlugin({ event: "setDefaultPort", port: settings.portName });
    });
  }

  const refreshBtn = document.querySelector("[data-action='refresh-ports']");
  if (refreshBtn) refreshBtn.addEventListener("click", requestPorts);
}

/* ---------------- Ports + status ---------------- */

function populatePorts(ports) {
  const select = document.querySelector("[data-ports]");
  if (!select) return;

  const saved = settings.portName || "";
  select.innerHTML = "";

  if (ports.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No MIDI ports — start loopMIDI";
    select.appendChild(option);
    updatePortStatus(false, ports);
    return;
  }

  ports.forEach(function addOption(name) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    if (name === saved) option.selected = true;
    select.appendChild(option);
  });

  if (!saved) {
    settings.portName = ports[0];
    select.value = ports[0];
    persistSettings();
  }

  updatePortStatus(ports.includes(settings.portName), ports);
}

function updatePortStatus(isOnline) {
  const status = document.getElementById("ac-status");
  if (!status) return;
  status.classList.toggle("is-online", isOnline);
  status.classList.toggle("is-offline", !isOnline);
  const label = status.querySelector(".label");
  if (label) label.textContent = isOnline ? "Port online" : "Port offline";
}

/* ---------------- Activity LED ---------------- */

let ledTimer = null;
function pulseActivity() {
  const led = document.getElementById("ac-led");
  if (!led) return;
  led.classList.add("is-active");
  clearTimeout(ledTimer);
  ledTimer = setTimeout(() => led.classList.remove("is-active"), 180);
}
