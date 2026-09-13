const TOKEN_KEY = "gwcToken";
const LEGACY_TOKEN_KEY = "maeToken";
const HASH_PARAM = "gwc";
const DIALOG_HEADING = /send this message\?/i;
const MAX_WAIT_MS = 20000;

let armed = false;
let finished = false;
let observer = null;
let timeoutId = 0;

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
}

function findConfirmDialog() {
  const headings = document.querySelectorAll("h1, h2, h3, h4, [role='heading']");
  for (const heading of headings) {
    if (DIALOG_HEADING.test((heading.textContent || "").trim())) {
      return (
        heading.closest("[role='dialog'], [role='alertdialog'], [aria-modal='true']") ||
        heading.parentElement
      );
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
    buttons.find((button) => /send/i.test(button.getAttribute("aria-label") || ""))
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

function finish(didClick) {
  if (finished) {
    return;
  }
  finished = true;
  stopWatching();
  if (didClick) {
    stripTokenFromHash();
  }
}

function watchForDialog() {
  if (clickSend()) {
    finish(true);
    return;
  }

  observer = new MutationObserver(() => {
    if (finished) {
      return;
    }
    if (clickSend()) {
      finish(true);
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

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

  const stored = await chrome.storage.local.get([TOKEN_KEY, LEGACY_TOKEN_KEY]);
  const expected = stored[TOKEN_KEY] || stored[LEGACY_TOKEN_KEY];
  const actual = parseHashParams(location.hash).get(HASH_PARAM) || "";
  if (!tokensEqual(expected, actual)) {
    return;
  }

  armed = true;
  watchForDialog();
}

function resetForNewNavigation() {
  const shouldArm = hasQueryParam() && hashHasToken(location.hash);
  if (!shouldArm) {
    return;
  }
  armed = false;
  finished = false;
  stopWatching();
  maybeArm();
}

maybeArm();
window.addEventListener("hashchange", resetForNewNavigation);
window.addEventListener("popstate", resetForNewNavigation);
