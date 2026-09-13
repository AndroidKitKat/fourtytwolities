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

Reload grok.com after you reload the extension itself.

## Develop

One tree: `extension/`. Chromium and Firefox load it directly. Safari’s Xcode target references those same files; don’t duplicate them.

After you change code, reload the extension, then reload grok.com. Open the toolbar popup, copy the token, and build a `?q=…#gwc=…` link.

### Chromium

`chrome://extensions` → Developer mode → Load unpacked → `extension/`

### Firefox

Needs Firefox 140+ (142+ on Android).

1. `about:debugging#/runtime/this-firefox` → Load Temporary Add-on → `extension/manifest.json`
2. Allow grok.com if Firefox asks (Add-ons Manager → FourtyTwolities → Permissions).
3. Pin the toolbar button.

Temporary add-ons disappear when Firefox quits. Reload from about:debugging after you pull; the gecko id is `fourtytwolities@michaeleisemann.com`, so storage survives a reload in the same session.

```
npx web-ext lint
```

### Safari

Build and run `safari/FourtyTwolities/FourtyTwolities.xcodeproj`, then enable the extension in Safari Settings. Unsigned local builds need Develop → Allow Unsigned Extensions.

## Package

Bump `version` in `extension/manifest.json`. For Safari, also bump `MARKETING_VERSION` in `safari/FourtyTwolities/FourtyTwolities.xcodeproj/project.pbxproj`.

```
./package.sh
```

Builds Chromium and Firefox zips in parallel under `web-ext-artifacts/`. Upload `fourtytwolities-<version>-chromium.zip` in the [Chrome Web Store dashboard](https://chrome.google.com/webstore/devconsole) (`manifest.json` is at the zip root; Chrome ignores `browser_specific_settings`). Submit `fourtytwolities-<version>.zip` on [addons.mozilla.org](https://addons.mozilla.org/developers/). Nothing leaves the browser; AMO data collection is declared as `none`.

### Safari

In Xcode: Product → Archive on the FourtyTwolities Mac app, then Distribute App. The wrapper app is `com.michaeleisemann.fourtytwolities`; the extension is `.Extension`.
