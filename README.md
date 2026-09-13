# FourtyTwolities

Unofficial grok.com helper. Not affiliated with xAI.

A Safari / Chromium extension that auto-confirms grok.com’s “Send this message?” dialog when the URL includes a matching `#gwc=TOKEN`.

Example: `https://grok.com/?q=hello#gwc=YOUR_TOKEN`

## Chromium

1. `chrome://extensions` → Developer mode → Load unpacked → `extension/`
2. Open the extension options and copy the token.

## Safari

Build and run `safari/FourtyTwolities/FourtyTwolities.xcodeproj`, then enable the extension in Safari Settings. Unsigned local builds need Develop → Allow Unsigned Extensions.
