const TOKEN_KEY = "gwcToken";
const LEGACY_TOKEN_KEY = "maeToken";
const HASH_PARAM = "gwc";

const DEFAULTS = {
  stripTokenOnTimeout: false,
  compactDensity: true,
  hideImagine: true,
  blockAutoplay: true,
  persistModel: true,
};

const tokenField = document.getElementById("token");
const sampleField = document.getElementById("sample");
const statusEl = document.getElementById("status");
const generateButton = document.getElementById("generate");
const saveButton = document.getElementById("save");
const copyTokenButton = document.getElementById("copy-token");
const copySampleButton = document.getElementById("copy-sample");
const stripTimeout = document.getElementById("strip-timeout");
const compact = document.getElementById("compact");
const hideImagine = document.getElementById("hide-imagine");
const blockAutoplay = document.getElementById("block-autoplay");
const persistModel = document.getElementById("persist-model");

const TOGGLES = [
  [stripTimeout, "stripTokenOnTimeout"],
  [compact, "compactDensity"],
  [hideImagine, "hideImagine"],
  [blockAutoplay, "blockAutoplay"],
  [persistModel, "persistModel"],
];

function booleanSetting(value, fallback) {
  return typeof value === "boolean" ? value : fallback;
}

function randomToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function sampleUrl(token) {
  const encoded = encodeURIComponent("hello from FourtyTwolities");
  return `https://grok.com/?q=${encoded}#${HASH_PARAM}=${token}`;
}

function showStatus(message) {
  statusEl.textContent = message;
}

function renderToken(token) {
  tokenField.value = token;
  sampleField.value = token ? sampleUrl(token) : "";
}

function renderToggles(stored) {
  for (const [input, key] of TOGGLES) {
    input.checked = booleanSetting(stored[key], DEFAULTS[key]);
  }
}

async function load() {
  try {
    const stored = await chrome.storage.local.get([TOKEN_KEY, LEGACY_TOKEN_KEY, ...Object.keys(DEFAULTS)]);
    let token = stored[TOKEN_KEY] || stored[LEGACY_TOKEN_KEY];
    if (!token) {
      token = randomToken();
      await chrome.storage.local.set({ [TOKEN_KEY]: token });
      showStatus("Generated a new token. Keep it private.");
    } else if (!stored[TOKEN_KEY] && stored[LEGACY_TOKEN_KEY]) {
      await chrome.storage.local.set({ [TOKEN_KEY]: token });
    }
    renderToken(token);
    renderToggles(stored);
  } catch {
    renderToggles({});
  }
}

async function save() {
  const token = tokenField.value.trim();
  if (!token) {
    showStatus("Token cannot be empty.");
    return;
  }
  await chrome.storage.local.set({ [TOKEN_KEY]: token });
  renderToken(token);
  showStatus("Saved.");
}

async function generate() {
  const token = randomToken();
  await chrome.storage.local.set({ [TOKEN_KEY]: token });
  renderToken(token);
  showStatus("Generated a new token. Old URLs will stop auto-confirming.");
}

async function copy(text, label) {
  await navigator.clipboard.writeText(text);
  showStatus(`Copied ${label}.`);
}

async function saveToggle(key, value) {
  await chrome.storage.local.set({ [key]: value });
  showStatus("Saved.");
}

generateButton.addEventListener("click", generate);
saveButton.addEventListener("click", save);
copyTokenButton.addEventListener("click", () => copy(tokenField.value, "token"));
copySampleButton.addEventListener("click", () => copy(sampleField.value, "sample link"));
tokenField.addEventListener("input", () => {
  sampleField.value = tokenField.value.trim() ? sampleUrl(tokenField.value.trim()) : "";
});
for (const [input, key] of TOGGLES) {
  input.addEventListener("change", () => saveToggle(key, input.checked));
}

load();
