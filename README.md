# Flotsam

A browser extension that auto-closes tabs after a set time unless you explicitly anchor them.

## Why

Tabs accumulate. What starts as a quick lookup turns into dozens of stale pages silently consuming memory and attention. Flotsam flips the default: tabs are temporary unless you decide otherwise. The ones you care about get anchored; the rest drift away on their own.

## How it works

### Basics

1. Install the extension.
2. Each tab on a **managed domain** (standard **http** or **https** addresses) gets a countdown (default **10 minutes**; you can change this in **Flotsam Settings**).
3. When the countdown finishes, that tab closes automatically.
4. Click the toolbar icon to **anchor** the current tab — it stays open until you unanchor it.
5. Click again to **unanchor**; the countdown applies again from there.

### Which tab is timed

Only tabs that are **in the background** run their countdown. The tab you are looking at does not count down. When you switch to another tab, the one you left gets a **new** full countdown.

### Domains you want to exclude

You can **exclude entire domains** so their tabs are never auto-closed. Add or remove exclusions in **Flotsam Settings**, or right-click the extension icon and use the menu for the **current tab’s domain**. Excluding **example.com** also covers subdomains such as **www.example.com**.

### What Flotsam never auto-closes

- **Anchored** tabs.
- **Pinned** tabs.
- **Grouped** tabs (tabs in any tab group).
- Tabs on **excluded** domains.
- Tabs the browser treats as **audible** (playing sound). Muted tabs and silent playback are not treated as audible.
- Tabs **outside normal web domains** (anything that isn’t a standard **http** or **https** tab) — for example built-in browser pages, settings, or local files opened in the browser. **Flotsam only applies to http and https tabs.**

### Windows

If Flotsam closes the **last tab** in a window, that window closes too. That is intentional.

## Development

```bash
npm install
npm run build      # one-off production build
npm run watch      # rebuild on changes
npm run typecheck  # run TypeScript type checking
npm test           # run unit tests
npm run release    # build and package into a .zip for submission
```

Load the `dist/` directory as an unpacked extension in your browser.

## Releasing

```bash
npm run release -- 0.2.0
```

This updates the version in `package.json`, `src/manifest.json`, and `package-lock.json`,
runs a production build, packages the result into `flotsam-v0.2.0.zip` ready for store submission,
and creates an annotated git tag `v0.2.0`.

Push the commit and tag to the remote:

```bash
git push --follow-tags
```

## Support

- [Buy Me a Coffee](https://ko-fi.com/I3I61GPLRC)
- [Report an issue](https://github.com/gniewomir/flotsam/issues)
- [Blog](https://gniewomir.com)
- [Email](mailto:gniewomir.swiechowski+flotsam@gmail.com)
