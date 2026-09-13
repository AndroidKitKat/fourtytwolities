# FourtyTwolities

Quality of life for [grok.com](https://grok.com).

## Auto-send

Grok asks “Send this message?” when a link pre-fills a prompt with `?q=`. Put your token in the hash as `#gwc=…` and FourtyTwolities clicks Send.

```
https://grok.com/?q=hello#gwc=YOUR_TOKEN
https://grok.com/?q=hello#private&gwc=YOUR_TOKEN
```

The token lives in the extension options. Keep it private: anyone with it can skip the confirm dialog.

Optional: strip `#gwc=` after 20 seconds even if the dialog never appeared.

## Chat

Toggles in the toolbar popup, applied on grok.com without a reload:

- Compact, wider transcript
- Hide Imagine in the header
- Block video autoplay until you click the video
- Remember Fast / Auto / Expert / Heavy / Build

Reload grok.com after you reload the extension itself (`chrome://extensions`).

## Chromium

1. `chrome://extensions` → Developer mode → Load unpacked → `extension/`
2. Open the toolbar popup, copy the token, and build a `?q=…#gwc=…` link.

## Safari

Build and run `safari/FourtyTwolities/FourtyTwolities.xcodeproj`, then enable the extension in Safari Settings. Unsigned local builds need Develop → Allow Unsigned Extensions.
