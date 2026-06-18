# UpCheck app icon — usage guide

## What's in this package

```
icon.ico                   ← Windows icon (multi-resolution, ready to use)
upcheck-icon-source.svg    ← Master vector source (edit this if you want to tweak the design)
png/                       ← Flat PNGs at every common size (16 to 1024px)
iconset-mac/               ← Pre-named PNGs in Apple's iconset folder structure
```

## Windows — you're done already

Point `electron-builder` at `icon.ico` directly. In your `package.json`:

```json
"win": {
  "icon": "assets/icon.ico"
}
```

Drop `icon.ico` into your `assets/` folder and that's it.

## macOS — needs one extra step (Mac only)

Apple's `.icns` format has to be built with Apple's own `iconutil` tool, which only runs on macOS — it's not available on Linux or Windows, so I couldn't generate the final `.icns` here. The `iconset-mac/` folder already has every PNG named and sized exactly the way `iconutil` expects, so on your Mac (or your collaborator's), run:

```bash
iconutil -c icns iconset-mac -o icon.icns
```

That produces `icon.icns` in seconds. Drop it into `assets/` and reference it:

```json
"mac": {
  "icon": "assets/icon.icns"
}
```

If you don't have a Mac handy, `electron-builder` can actually also auto-generate `.icns` from a single 1024x1024 PNG during the build — point it at `png/icon_1024.png` instead and it'll do the conversion for you on build, no Mac required:

```json
"mac": {
  "icon": "assets/icon_1024.png"
}
```

That's the simplest path if you're not on a Mac right now.

## Tray icon (the small one in the menu bar / system tray)

Don't use the full square app icon for the tray — at 16-22px a dark square block looks chunky against the system tray background, which varies between light and dark depending on the OS and theme. Use the dedicated `tray/` folder instead, which has two purpose-built versions:

**`tray/tray-template_*.png`** — monochrome, transparent background, black shape. This is a macOS "template image" — set `setTemplateImage(true)` and macOS automatically recolors it white-on-dark or black-on-light depending on the menu bar theme. Use this one on Mac.

```js
const icon = nativeImage.createFromPath(path.join(__dirname, '../assets/tray-template_22.png'))
icon.setTemplateImage(true)
tray = new Tray(icon)
```

**`tray/tray-color_*.png`** — full color (grey ring, green check), transparent background. Windows doesn't have automatic template recoloring like macOS, so use the color version there instead.

```js
const isMac = process.platform === 'darwin'
const trayFile = isMac ? 'tray-template_22.png' : 'tray-color_32.png'
const icon = nativeImage.createFromPath(path.join(__dirname, `../assets/${trayFile}`))
if (isMac) icon.setTemplateImage(true)
tray = new Tray(icon)
```

Each comes at 16, 22, 32, and 44px, plus `@2x` Retina doubles of each. Use 22px on Mac (the standard menu bar size) and 32px on Windows.

## Editing the design later

`upcheck-icon-source.svg` is the master file — open it in any vector editor (Figma, Illustrator, Inkscape) or just edit the SVG by hand. Re-export at 1024x1024 and re-run the conversion if you want to tweak the ring thickness, checkmark angle, or colour.
