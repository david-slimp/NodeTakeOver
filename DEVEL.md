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

- Runs the Vite dev server with hot reload at `http://localhost:8000`.

For the legacy static-server workflow (build then serve `dist/`):

```bash
npm run dev:static
```

## Build

```bash
npm run build
```

- Compiles TypeScript into `dist/`
- Copies `style.css`, `assets/` images, `LICENSE`, etc into `dist/`

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

### Production Deploy Script

This repo includes a simple `rsync` deploy helper:

```bash
cp .env.example .env
# edit .env
npm run deploy:prod
```
