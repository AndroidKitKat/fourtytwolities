const TOKEN_KEY = "gwcToken";
const LEGACY_TOKEN_KEY = "maeToken";
const HASH_PARAM = "gwc";

const tokenField = document.getElementById("token");
const sampleField = document.getElementById("sample");
const statusEl = document.getElementById("status");
const generateButton = document.getElementById("generate");
const saveButton = document.getElementById("save");
const copyTokenButton = document.getElementById("copy-token");
const copySampleButton = document.getElementById("copy-sample");

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

function render(token) {
  tokenField.value = token;
  sampleField.value = token ? sampleUrl(token) : "";
}

async function load() {
  const stored = await chrome.storage.local.get([TOKEN_KEY, LEGACY_TOKEN_KEY]);
  let token = stored[TOKEN_KEY] || stored[LEGACY_TOKEN_KEY];
  if (!token) {
    token = randomToken();
    await chrome.storage.local.set({ [TOKEN_KEY]: token });
    showStatus("Generated a new token. Keep it private.");
  } else if (!stored[TOKEN_KEY] && stored[LEGACY_TOKEN_KEY]) {
    await chrome.storage.local.set({ [TOKEN_KEY]: token });
  }
  render(token);
}

async function save() {
  const token = tokenField.value.trim();
  if (!token) {
    showStatus("Token cannot be empty.");
    return;
  }
  await chrome.storage.local.set({ [TOKEN_KEY]: token });
  render(token);
  showStatus("Saved.");
}

async function generate() {
  const token = randomToken();
  await chrome.storage.local.set({ [TOKEN_KEY]: token });
  render(token);
  showStatus("Generated a new token. Old URLs will stop auto-confirming.");
}

async function copy(text, label) {
  await navigator.clipboard.writeText(text);
  showStatus(`Copied ${label}.`);
}

generateButton.addEventListener("click", generate);
saveButton.addEventListener("click", save);
copyTokenButton.addEventListener("click", () => copy(tokenField.value, "token"));
copySampleButton.addEventListener("click", () => copy(sampleField.value, "sample URL"));
tokenField.addEventListener("input", () => {
  sampleField.value = tokenField.value.trim() ? sampleUrl(tokenField.value.trim()) : "";
});

load();
