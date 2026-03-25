# Flotsam

A browser extension that auto-closes tabs after a set time unless you explicitly anchor them.

## Why

Tabs accumulate. What starts as a quick lookup turns into dozens of stale pages silently consuming memory and attention. Flotsam flips the default: tabs are temporary unless you decide otherwise. The ones you care about get anchored; the rest drift away on their own.

## How it works

### Basics

1. Install the extension.
2. Each tab on a **managed domain** (standard **http** or **https** addresses) gets a countdown (default **15 minutes**; you can change this in **Flotsam Settings**).
3. If you change the timeout value, Flotsam resets timers using the new value.
4. When the countdown finishes, that tab closes automatically.
5. Click the toolbar icon to **anchor** the current tab — it stays open until you unanchor it.
6. Click again to **unanchor**; the countdown applies again from there.

### Domains you want to exclude

You can **exclude entire domains** so their tabs are never auto-closed. Add or remove exclusions in **Flotsam Settings**, or right-click the extension icon and choose **Exclude tab domain** for the **current tab’s domain**. Excluding **example.com** also covers subdomains such as **www.example.com**.

### What Flotsam never auto-closes

- **Anchored** tabs.
- The **focused** tab.
- **Pinned** tabs.
- **Grouped** tabs.
- Tabs on **excluded** domains.
- Tabs the browser treats as **audible** (playing sound). Muted tabs and silent playback are not treated as audible.
- Tabs **outside normal web domains** (anything that isn’t a standard **http** or **https** tab) — for example built-in browser pages, settings, or local files opened in the browser. **Flotsam only applies to http and https tabs.**

## Development

```bash
npm install
npm run build      # one-off production build
npm run watch      # rebuild on changes
npm run typecheck  # run TypeScript type checking
npm test           # run unit tests
npm run release    # version bump, build, commit, tag, push (see Releasing)
```

Load the `dist/` directory as an unpacked extension in your browser.

## Releasing

Run from a **clean** working tree on branch **`main`**. The version argument must be **semver with a `v` prefix** (for example `v0.2.0`).

```bash
npm run release -- v0.2.0
```

The script:

1. Creates and checks out a new branch named `release/<version>` (it fails if that branch already exists).
2. Updates `package.json` and `src/manifest.json` to the release version (the leading `v` is stripped), then runs `npm install --package-lock-only` so `package-lock.json` stays in sync.
3. Formats the updated files (`prettier` on the relevant JSON files, then `npm run format`).
4. Runs `npm run build`.
5. Commits the version bump, creates an **annotated** git tag matching the argument (e.g. `v0.2.0`), and **pushes** both the `release/<version>` branch and the tag to `origin`.

Pushing the tag triggers the **Release** GitHub workflow: it rebuilds and checks the tree, zips `dist/` as `flotsam-<tag>.zip`, and publishes a GitHub Release with that artifact. Download the zip from the release page for store submission; nothing is zipped on your machine by this script.

## Support

- [Buy Me a Coffee](https://ko-fi.com/I3I61GPLRC)
- [Report an issue](https://github.com/gniewomir/flotsam/issues)
- [Blog](https://gniewomir.com)
- [Email](mailto:gniewomir.swiechowski+flotsam@gmail.com)
