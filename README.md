# smart-file-logger

> Production-ready, **zero-dependency** file logger for Node.js — written in TypeScript.

[![npm version](https://img.shields.io/npm/v/smart-file-logger.svg)](https://www.npmjs.com/package/smart-file-logger)
[![npm downloads](https://img.shields.io/npm/dm/smart-file-logger.svg)](https://www.npmjs.com/package/smart-file-logger)
[![CI](https://github.com/RDarshankumar/Smart_File_Logger/actions/workflows/ci.yml/badge.svg)](https://github.com/RDarshankumar/Smart_File_Logger/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/node/v/smart-file-logger.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org)

---

## Table of Contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Log Levels & Console Colors](#log-levels--console-colors)
- [Metadata](#metadata)
- [Weekly Log Rotation](#weekly-log-rotation)
- [Retention Policy](#retention-policy)
- [Express / Fastify Middleware](#express--fastify-middleware)
- [Middleware Options](#middleware-options)
- [JSON Mode](#json-mode)
- [CommonJS Usage](#commonjs-usage)
- [TypeScript](#typescript)
- [Error Handling](#error-handling)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [Changelog](#changelog)
- [License](#license)

---

## Features

- **Weekly log rotation** — one file per 7-day window, e.g. `2026-06-29_to_2026-07-05.log`
- **Automatic day separators** — written once per calendar day, never repeated
- **Configurable retention** — keep N weekly files; older ones are deleted automatically
- **Five log levels** — `INFO`, `SUCCESS`, `WARN`, `ERROR`, `DEBUG`
- **ANSI console colours** — per level, with `NO_COLOR` support
- **Optional JSON mode** — NDJSON output for log-aggregation pipelines (Datadog, Loki, Elastic)
- **Optional metadata** — attach any key/value object to any log entry
- **Express / Fastify middleware** — request logging with method, URL, status, duration, and IP
- **Never crashes your app** — all I/O errors are caught and reported via `process.stderr`
- **Non-blocking** — async write-queue; never stalls the event loop
- **Zero dependencies** — only Node.js built-ins (`fs/promises`, `path`, `os`)
- **Fully typed** — no `any`, ships its own `.d.ts` files
- **Dual package** — ships both ESM (`.mjs`) and CJS (`.js`)

---

## Requirements

| Requirement | Version |
|-------------|---------|
| Node.js | **≥ 18.0.0** |
| TypeScript | **≥ 5.0** _(optional — CJS/ESM also supported)_ |

---

## Installation

```bash
npm install smart-file-logger
# or
yarn add smart-file-logger
# or
pnpm add smart-file-logger
```

---

## Quick Start

```ts
import { createLogger } from 'smart-file-logger';

const logger = createLogger({
  logDir: './logs',
  retentionWeeks: 4,
  console: true,
  file: true,
  json: false,
});

await logger.info('Server started');
await logger.success('Database connected');
await logger.warn('Memory usage high');
await logger.error('Database connection failed', { host: 'localhost', db: 'postgres' });
await logger.debug('User object loaded', { userId: 42 });
```

### Sample log file output

```
=========================================================
Monday | 29-06-2026
=========================================================

[10:20:15] INFO     Server started
[10:21:10] SUCCESS  Database connected
[10:22:05] WARN     Memory usage high
[10:22:30] ERROR    Database connection failed  {"host":"localhost","db":"postgres"}
[10:23:01] DEBUG    User object loaded  {"userId":42}

=========================================================
Tuesday | 30-06-2026
=========================================================

[09:00:11] INFO     Application restarted
```

---

## Configuration

All options are optional — defaults are shown below.

```ts
const logger = createLogger({
  logDir: './logs',       // Directory to write log files (created automatically)
  retentionWeeks: 4,      // Number of weekly files to keep (1–52)
  console: true,          // Print to stdout with ANSI colour
  file: true,             // Write to disk
  json: false,            // true → NDJSON per line; false → human-readable text
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `logDir` | `string` | `'./logs'` | Log directory path (created if missing) |
| `retentionWeeks` | `number` | `4` | Weekly files to retain — must be `1–52` |
| `console` | `boolean` | `true` | Enable ANSI-coloured console output |
| `file` | `boolean` | `true` | Enable file output |
| `json` | `boolean` | `false` | Write NDJSON instead of plain text |

> **Note:** `createLogger()` with no arguments is valid and uses all defaults.

---

## Log Levels & Console Colors

| Method | Level | Console Color |
|--------|-------|---------------|
| `logger.info()` | `INFO` | Blue |
| `logger.success()` | `SUCCESS` | Green |
| `logger.warn()` | `WARN` | Yellow |
| `logger.error()` | `ERROR` | Red |
| `logger.debug()` | `DEBUG` | Gray |

To disable colours, set the `NO_COLOR` environment variable (respects [no-color.org](https://no-color.org)):

```bash
NO_COLOR=1 node app.js
```

---

## Metadata

Attach any structured data as a second argument to any log method:

```ts
await logger.error('Payment failed', {
  orderId: 'ORD-9912',
  amount: 99.99,
  currency: 'USD',
  reason: 'insufficient_funds',
});
```

**Text output:**
```
[14:05:33] ERROR   Payment failed  {"orderId":"ORD-9912","amount":99.99,"currency":"USD","reason":"insufficient_funds"}
```

**JSON output** (`json: true`):
```json
{"timestamp":"2026-06-29T14:05:33.000Z","level":"ERROR","message":"Payment failed","metadata":{"orderId":"ORD-9912","amount":99.99,"currency":"USD","reason":"insufficient_funds"}}
```

---

## Weekly Log Rotation

Log files span exactly 7 days. Windows are computed from a fixed epoch so the boundaries are always consistent regardless of when the logger first starts.

```
logs/
  2026-06-22_to_2026-06-28.log   ← previous week
  2026-06-29_to_2026-07-05.log   ← current week  (active)
  2026-07-06_to_2026-07-12.log   ← next week      (auto-created on 2026-07-06)
```

Rotation happens automatically on the first log call after a new week begins — no cron job or manual trigger required.

---

## Retention Policy

After every rotation, files older than `retentionWeeks` are deleted automatically:

```ts
// Keep the last 8 weeks of logs (≈ 2 months)
const logger = createLogger({ retentionWeeks: 8 });
```

| `retentionWeeks` | Files kept | Approximate history |
|-----------------|------------|---------------------|
| `2` | 2 files | ~2 weeks |
| `4` _(default)_ | 4 files | ~1 month |
| `8` | 8 files | ~2 months |
| `52` | 52 files | ~1 year |

---

## Express / Fastify Middleware

### Via the logger instance (Express)

```ts
import express from 'express';
import { createLogger } from 'smart-file-logger';

const app = express();
const logger = createLogger({ logDir: './logs' });

app.use(logger.middleware());

app.get('/', (_req, res) => res.send('Hello World'));
app.listen(3000);
```

### Via the standalone factory

```ts
import { createLogger, createHttpMiddleware } from 'smart-file-logger';

const logger = createLogger({ logDir: './logs' });

// Log only errors and warnings — skip 2xx noise
app.use(createHttpMiddleware(logger, { errorsOnly: true }));
```

### Fastify (via raw middleware)

```ts
import Fastify from 'fastify';
import middie from '@fastify/middie';
import { createLogger } from 'smart-file-logger';

const app = Fastify();
const logger = createLogger({ logDir: './logs' });

await app.register(middie);
app.use(logger.middleware());
```

**Each request logs:**
```
[14:05:33] INFO    GET /api/users 200 12ms  {"ip":"127.0.0.1","statusCode":200,"durationMs":12}
```

**Level mapping:** `5xx → ERROR` | `4xx → WARN` | `2xx / 3xx → INFO`

---

## Middleware Options

`createHttpMiddleware(logger, options?)` accepts:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `errorsOnly` | `boolean` | `false` | Skip logging requests where `statusCode < 400` |
| `getIp` | `(req) => string` | built-in | Custom function to extract client IP |

**Custom IP extractor example:**
```ts
app.use(createHttpMiddleware(logger, {
  getIp: (req) => req.headers['cf-connecting-ip'] as string ?? 'unknown',
}));
```

---

## JSON Mode

Enable NDJSON for integration with log aggregators:

```ts
const logger = createLogger({ file: true, json: true, console: false });
```

Each line is a self-contained JSON object — ready for Datadog, Grafana Loki, Elasticsearch, etc.:

```json
{"timestamp":"2026-06-29T10:20:15.000Z","level":"INFO","message":"Server started"}
{"timestamp":"2026-06-29T10:22:30.000Z","level":"ERROR","message":"DB failed","metadata":{"host":"localhost"}}
```

---

## CommonJS Usage

```js
const { createLogger } = require('smart-file-logger');

const logger = createLogger({ logDir: './logs' });

logger.info('Server started').then(() => {
  console.log('logged');
});
```

---

## TypeScript

The package ships its own declaration files — no `@types/*` package needed.

```ts
import type {
  Logger,
  LogLevel,
  LogMetadata,
  LogEntry,
  LoggerOptions,
  FormattedEntry,
} from 'smart-file-logger';

function logRequest(logger: Logger, level: LogLevel, msg: string): void {
  void logger[level.toLowerCase() as Lowercase<LogLevel>](msg);
}
```

---

## Error Handling

The logger **never throws or crashes your application**.

- File write failures (disk full, bad permissions, etc.) are caught internally and written to `process.stderr`
- The write queue continues processing subsequent entries after any error
- Retention cleanup failures are also caught — a bad delete never blocks future writes

```ts
// stderr output on write failure:
// [smart-file-logger] write error: Error: ENOSPC: no space left on device
```

---

## Project Structure

```
src/
├── config/       — resolveConfig() + defaults
├── formatter/    — pure text / JSON / console formatters
├── logger/       — SmartLogger class (core orchestrator)
├── middleware/   — createHttpMiddleware() factory
├── cleanup/      — enforceRetention() policy
├── writer/       — FileWriter + WriteQueue (all disk I/O)
├── utils/        — date helpers + ANSI colour helpers
├── types/        — all TypeScript interfaces and types
└── index.ts      — public API surface
```

---

## Contributing

Contributions are welcome! Please open an issue or pull request on [GitHub](https://github.com/RDarshankumar/Smart_File_Logger).

```bash
# Clone and install
git clone https://github.com/RDarshankumar/Smart_File_Logger.git
cd Smart_File_Logger
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint + type-check
npm run lint
npm run type-check

# Build
npm run build
```

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release history.

---

## License

[MIT](LICENSE) © [RDarshankumar](https://github.com/RDarshankumar)
