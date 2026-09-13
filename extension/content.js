const TOKEN_KEY = "gwcToken";
const LEGACY_TOKEN_KEY = "maeToken";
const HASH_PARAM = "gwc";
const DIALOG_HEADING = /send this message/i;
const CONFIRM_DIALOG = '[data-analytics-name="link-query-confirm-dialog"]';
const MODEL_TRIGGER = "#model-select-trigger";
const MODEL_NAMES = ["Fast", "Auto", "Expert", "Heavy", "Build"];
const MAX_WAIT_MS = 20000;
const LOCATION_POLL_MS = 500;

const DEFAULTS = {
  stripTokenOnTimeout: false,
  compactDensity: true,
  hideImagine: true,
  blockAutoplay: true,
  persistModel: true,
  preferredModel: "",
};

const STYLE_TEXT = `
#ftw-toast {
  position: fixed;
  z-index: 2147483647;
  right: 1rem;
  bottom: 1rem;
  max-width: min(22rem, calc(100vw - 2rem));
  padding: 0.55rem 0.85rem;
  border-radius: 999px;
  background: color-mix(in srgb, CanvasText 88%, Canvas);
  color: Canvas;
  font: 13px/1.35 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  box-shadow: 0 8px 24px color-mix(in srgb, CanvasText 18%, transparent);
  pointer-events: none;
  opacity: 0;
  transform: translateY(6px);
  transition: opacity 160ms ease, transform 160ms ease;
}
#ftw-toast[data-show="true"] {
  opacity: 1;
  transform: none;
}

html[data-ftw-hide-imagine] a[href="/imagine"],
html[data-ftw-hide-imagine] a[href^="/imagine?"],
html[data-ftw-hide-imagine] a[href^="/imagine#"],
html[data-ftw-hide-imagine] a[aria-label="Imagine"] {
  display: none !important;
}

html[data-ftw-compact] {
  --content-max-width: min(80rem, calc(100% - 2rem)) !important;
}
html[data-ftw-compact] #grok-content-area,
html[data-ftw-compact] #grok-content-area .breakout,
html[data-ftw-compact] #grok-content-area .max-w-breakout,
html[data-ftw-compact] #grok-content-area .query-bar,
html[data-ftw-compact] #grok-content-area [class*="content-max-width"],
html[data-ftw-compact] #grok-content-area [style*="--content-max-width"] {
  --content-max-width: min(80rem, 100%) !important;
  max-width: min(80rem, 100%) !important;
  width: 100% !important;
}
html[data-ftw-compact] #grok-content-area .gap-6 {
  gap: 0.85rem !important;
}
html[data-ftw-compact] #grok-content-area .gap-4 {
  gap: 0.6rem !important;
}
html[data-ftw-compact] #grok-content-area h1 {
  font-size: 1.35rem !important;
  letter-spacing: -0.03em;
}
html[data-ftw-compact] #grok-content-area .query-bar {
  padding-bottom: 0 !important;
}
html[data-ftw-compact] #grok-content-area .query-bar-editor {
  padding-top: 8px !important;
}
`;

let settings = { ...DEFAULTS, token: "" };
let armed = false;
let finished = false;
let observer = null;
let timeoutId = 0;
let toastTimer = 0;
let lastArmKey = "";
let lastHref = location.href;
let modelApplyTimer = 0;
let armGeneration = 0;

function booleanSetting(value, fallback) {
  return typeof value === "boolean" ? value : fallback;
}

function parseHashParams(hash) {
  const raw = (hash || location.hash).replace(/^#/, "");
  return new URLSearchParams(raw);
}

function hashHasToken(hash) {
  return parseHashParams(hash).has(HASH_PARAM);
}

function tokensEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length === 0 || a.length !== b.length) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function hasQueryParam() {
  return new URLSearchParams(location.search).has("q");
}

function serializeHash(params) {
  const parts = [];
  for (const [key, value] of params.entries()) {
    if (value === "") {
      parts.push(key);
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }
  }
  return parts.length ? `#${parts.join("&")}` : "";
}

function stripTokenFromHash() {
  const params = parseHashParams(location.hash);
  if (!params.has(HASH_PARAM)) {
    return;
  }
  params.delete(HASH_PARAM);
  const next = `${location.pathname}${location.search}${serializeHash(params)}`;
  history.replaceState(history.state, "", next);
  lastHref = location.href;
}

function armKey() {
  const query = new URLSearchParams(location.search).get("q") || "";
  const token = parseHashParams(location.hash).get(HASH_PARAM) || "";
  return `${location.pathname}?${query}#${token}`;
}

function findConfirmDialog() {
  const named = document.querySelector(CONFIRM_DIALOG);
  if (named) {
    return named;
  }

  const dialogs = document.querySelectorAll("[role='dialog'], [role='alertdialog'], [aria-modal='true']");
  for (const dialog of dialogs) {
    if (DIALOG_HEADING.test(dialog.textContent || "")) {
      return dialog;
    }
  }

  const headings = document.querySelectorAll("h1, h2, h3, h4, [role='heading']");
  for (const heading of headings) {
    if (DIALOG_HEADING.test((heading.textContent || "").trim())) {
      return heading.closest("[role='dialog'], [role='alertdialog'], [aria-modal='true']") || heading.parentElement;
    }
  }
  return null;
}

function findDialogSendButton(dialog) {
  if (!dialog) {
    return null;
  }
  const buttons = [...dialog.querySelectorAll("button")];
  return (
    buttons.find((button) => /^(send)$/i.test((button.textContent || "").trim())) ||
    buttons.find((button) => /^(send)$/i.test((button.getAttribute("aria-label") || "").trim()))
  );
}

function clickSend() {
  const button = findDialogSendButton(findConfirmDialog());
  if (!button || button.disabled) {
    return false;
  }
  button.click();
  return true;
}

function stopWatching() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = 0;
  }
}

function injectStyle() {
  let style = document.getElementById("ftw-style");
  if (!style) {
    style = document.createElement("style");
    style.id = "ftw-style";
    (document.head || document.documentElement).append(style);
  }
  style.textContent = STYLE_TEXT;
}

function showToast(message) {
  injectStyle();
  let toast = document.getElementById("ftw-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "ftw-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.documentElement.append(toast);
  }
  toast.textContent = message;
  toast.dataset.show = "true";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.dataset.show = "false";
  }, 2800);
}

function finish(didClick) {
  if (finished) {
    return;
  }
  finished = true;
  stopWatching();
  if (didClick || settings.stripTokenOnTimeout) {
    stripTokenFromHash();
  }
  showToast(didClick ? "Sent" : "No confirm dialog");
  if (didClick) {
    schedulePreferredModel();
  }
}

function watchForDialog() {
  if (clickSend()) {
    finish(true);
    return;
  }

  let scheduled = false;
  observer = new MutationObserver(() => {
    if (finished || scheduled) {
      return;
    }
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      if (!finished && clickSend()) {
        finish(true);
      }
    });
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["data-state", "data-analytics-name", "role"],
  });

  timeoutId = setTimeout(() => {
    finish(false);
  }, MAX_WAIT_MS);
}

async function maybeArm() {
  if (finished || armed) {
    return;
  }
  if (!hasQueryParam() || !hashHasToken(location.hash)) {
    return;
  }

  const generation = ++armGeneration;
  const key = armKey();
  armed = true;
  lastArmKey = key;

  const stored = await chrome.storage.local.get([TOKEN_KEY, LEGACY_TOKEN_KEY]);
  if (generation !== armGeneration) {
    return;
  }
  const expected = stored[TOKEN_KEY] || stored[LEGACY_TOKEN_KEY] || settings.token;
  const actual = parseHashParams(location.hash).get(HASH_PARAM) || "";
  if (!tokensEqual(expected, actual)) {
    armed = false;
    return;
  }

  watchForDialog();
}

function resetForNewNavigation() {
  const shouldArm = hasQueryParam() && hashHasToken(location.hash);
  if (!shouldArm) {
    return;
  }
  const key = armKey();
  if (armed && !finished && lastArmKey === key) {
    return;
  }
  armGeneration += 1;
  lastArmKey = key;
  armed = false;
  finished = false;
  stopWatching();
  maybeArm();
}

function applyChromeFlags() {
  injectStyle();
  const root = document.documentElement;
  root.toggleAttribute("data-ftw-compact", settings.compactDensity);
  root.toggleAttribute("data-ftw-hide-imagine", settings.hideImagine);
  root.toggleAttribute("data-ftw-no-autoplay", settings.blockAutoplay);
}

function isMedia(node) {
  return node instanceof HTMLMediaElement;
}

function silenceMedia(media) {
  if (!settings.blockAutoplay || media.dataset.ftwAllowPlay === "1") {
    return;
  }
  media.autoplay = false;
  media.removeAttribute("autoplay");
  if (!media.paused) {
    media.pause();
  }
}

function silenceTree(root) {
  if (!settings.blockAutoplay) {
    return;
  }
  if (isMedia(root)) {
    silenceMedia(root);
  }
  if (root.querySelectorAll) {
    root.querySelectorAll("video, audio").forEach(silenceMedia);
  }
}

function setupAutoplay() {
  silenceTree(document);
  const mediaObserver = new MutationObserver((records) => {
    if (!settings.blockAutoplay) {
      return;
    }
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          silenceTree(node);
        }
      }
    }
  });
  mediaObserver.observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener(
    "play",
    (event) => {
      if (!settings.blockAutoplay || !isMedia(event.target)) {
        return;
      }
      silenceMedia(event.target);
    },
    true
  );

  document.addEventListener(
    "click",
    (event) => {
      const media = event.target.closest?.("video, audio");
      if (media) {
        media.dataset.ftwAllowPlay = "1";
      }
    },
    true
  );
}

function normalizeModelName(text) {
  const value = (text || "").replace(/\s+/g, " ").trim();
  return MODEL_NAMES.find((name) => value === name || value.startsWith(name)) || "";
}

function currentModel() {
  const trigger = document.querySelector(MODEL_TRIGGER);
  return trigger ? normalizeModelName(trigger.textContent) : "";
}

function rememberModel(name) {
  if (!settings.persistModel || !name || name === settings.preferredModel) {
    return;
  }
  settings.preferredModel = name;
  chrome.storage.local.set({ preferredModel: name });
}

async function applyPreferredModel() {
  if (!settings.persistModel || !settings.preferredModel || findConfirmDialog()) {
    return;
  }
  const trigger = document.querySelector(MODEL_TRIGGER);
  if (!trigger) {
    return;
  }
  if (currentModel() === settings.preferredModel) {
    return;
  }

  trigger.click();
  await new Promise((resolve) => requestAnimationFrame(resolve));
  const item = [...document.querySelectorAll("[role='menuitemradio']")].find(
    (el) => normalizeModelName(el.textContent) === settings.preferredModel
  );
  if (item) {
    item.click();
  } else if (trigger.getAttribute("aria-expanded") === "true") {
    trigger.click();
  }
}

function schedulePreferredModel() {
  clearTimeout(modelApplyTimer);
  modelApplyTimer = setTimeout(() => {
    applyPreferredModel();
  }, 250);
}

function setupModelPersist() {
  document.addEventListener(
    "click",
    (event) => {
      const item = event.target.closest?.("[role='menuitemradio']");
      if (!item) {
        return;
      }
      const name = normalizeModelName(item.textContent);
      if (name) {
        rememberModel(name);
      }
    },
    true
  );
  schedulePreferredModel();
}

function onLocationChange() {
  resetForNewNavigation();
  schedulePreferredModel();
}

function watchLocation() {
  const notify = () => {
    if (location.href === lastHref) {
      return;
    }
    lastHref = location.href;
    onLocationChange();
  };

  window.addEventListener("hashchange", notify);
  window.addEventListener("popstate", notify);
  if (window.navigation && typeof window.navigation.addEventListener === "function") {
    window.navigation.addEventListener("navigate", () => {
      queueMicrotask(notify);
    });
  }
  setInterval(notify, LOCATION_POLL_MS);
}

async function loadSettings() {
  const stored = await chrome.storage.local.get([
    TOKEN_KEY,
    LEGACY_TOKEN_KEY,
    "stripTokenOnTimeout",
    "compactDensity",
    "hideImagine",
    "blockAutoplay",
    "persistModel",
    "preferredModel",
  ]);
  settings = {
    token: stored[TOKEN_KEY] || stored[LEGACY_TOKEN_KEY] || "",
    stripTokenOnTimeout: Boolean(stored.stripTokenOnTimeout),
    compactDensity: booleanSetting(stored.compactDensity, DEFAULTS.compactDensity),
    hideImagine: booleanSetting(stored.hideImagine, DEFAULTS.hideImagine),
    blockAutoplay: booleanSetting(stored.blockAutoplay, DEFAULTS.blockAutoplay),
    persistModel: booleanSetting(stored.persistModel, DEFAULTS.persistModel),
    preferredModel: typeof stored.preferredModel === "string" ? stored.preferredModel : "",
  };
}

function applySettingsPatch(changes) {
  let chromeChanged = false;
  for (const [key, change] of Object.entries(changes)) {
    if (key === TOKEN_KEY || key === LEGACY_TOKEN_KEY) {
      settings.token = change.newValue || settings.token;
    } else if (key === "preferredModel" && typeof change.newValue === "string") {
      settings.preferredModel = change.newValue;
    } else if (key in DEFAULTS && key !== "preferredModel") {
      const fallback = DEFAULTS[key];
      settings[key] = typeof fallback === "boolean" ? booleanSetting(change.newValue, fallback) : change.newValue;
      if (key !== "stripTokenOnTimeout" && key !== "persistModel") {
        chromeChanged = true;
      }
    }
  }
  if (chromeChanged) {
    applyChromeFlags();
    if (settings.blockAutoplay) {
      silenceTree(document);
    }
  }
  if (settings.persistModel) {
    schedulePreferredModel();
  }
}

async function boot() {
  await loadSettings();
  applyChromeFlags();
  setupAutoplay();
  setupModelPersist();
  watchLocation();
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local") {
      applySettingsPatch(changes);
    }
  });
  maybeArm();
}

boot();
