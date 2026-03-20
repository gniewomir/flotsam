# Contributing

Thanks for considering a contribution! Simplicity is a core feature of this extension, so please keep that in mind when proposing changes.

## Getting started

```bash
npm install
npm run build       # production build
npm run watch       # rebuild on changes
npm run typecheck   # type-check without emitting
npm test            # run unit tests
```

Load the `dist/` directory as an unpacked extension in Chrome (or any Chromium browser) to test locally.

## Submitting changes

1. Fork the repo and create a branch from `main`.
2. Make your changes. Add or update tests if relevant.
3. Run `npm run typecheck && npm test` and make sure everything passes.
4. Open a pull request with a clear description of _what_ and _why_.

## Reporting issues

Open an issue at <https://github.com/gniewomir/flotsam/issues>. Bug reports with reproduction steps are especially helpful.
