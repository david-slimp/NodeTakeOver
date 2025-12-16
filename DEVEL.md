# Development (NodeTakeOver)

This project builds browser-ready production files into `dist/`.

If you're a player, start with `README.md`.

## Prerequisites

- Node.js + npm
- Python 3 (for the simple local HTTP server used by `npm run dev`)

## Local Development

```bash
npm install
npm run dev
```

- Serves the built game from `dist/` at `http://localhost:8000`.
- `npm run dev` runs a full `npm run build` first.

## Build

```bash
npm run build
```

- Compiles TypeScript into `dist/`
- Copies `index.html`, `style.css`, `screenshot.png`, `LICENSE`, etc into `dist/`

## Tests

```bash
npm test
```

More detail lives in `Testing_in_our_dev_env.md`.

## Useful Scripts

- `npm run lint` / `npm run lint:fix`
- `npm run format` / `npm run format:check`
- `npm run smoke-test`
- `npm run test:browser`

## Deployment

Deploy the contents of `dist/` to static hosting (the production site is `https://rock808.com/games/NodeTakeOver/`).

