# smart-file-logger

> Production-ready, **zero-dependency** file logger for Node.js — written in TypeScript.

[![npm version](https://img.shields.io/npm/v/smart-file-logger.svg)](https://www.npmjs.com/package/smart-file-logger)
[![Build Status](https://github.com/your-username/smart-file-logger/actions/workflows/ci.yml/badge.svg)](https://github.com/your-username/smart-file-logger/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/node/v/smart-file-logger.svg)](https://nodejs.org)

---

## Features

- **Weekly log rotation** — one file per 7-day window, e.g. `2026-06-29_to_2026-07-05.log`
- **Automatic day separators** — written once per calendar day, never repeated
- **Configurable retention** — keep N weekly files; older ones are deleted automatically
- **Five log levels** — `INFO`, `SUCCESS`, `WARN`, `ERROR`, `DEBUG`
- **ANSI console colours** — per level, with `NO_COLOR` support
- **Optional JSON mode** — NDJSON output for log-aggregation pipelines
- **Optional metadata** — attach any key/value object to any log entry
- **Express middleware** — request logging with method, URL, status, duration, and IP
- **Never crashes your app** — all I/O errors are caught and reported via `process.stderr`
- **Non-blocking** — async write-queue; never stalls the event loop
- **Zero dependencies** — only Node.js built-in modules (`fs/promises`, `path`, `os`)
- **Fully typed** — no `any`, ships its own `.d.ts` files

---

## Requirements

- Node.js **≥ 18.0.0**
- TypeScript **≥ 5.0** (if using from TypeScript source)

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

### Log file output

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
  logDir: './logs',        // Directory to write log files into (created automatically)
  retentionWeeks: 4,       // Number of weekly files to keep (1–52)
  console: true,           // Print to stdout (with ANSI colour)
  file: true,              // Write to disk
  json: false,             // true → NDJSON per line; false → human-readable text
});
```

| Option | Type | Default | Description |
|---|---|---|---|
| `logDir` | `string` | `'./logs'` | Log directory path |
| `retentionWeeks` | `number` | `4` | Weekly files to retain (1–52) |
| `console` | `boolean` | `true` | Enable console output |
| `file` | `boolean` | `true` | Enable file output |
| `json` | `boolean` | `false` | NDJSON format instead of text |

---

## Log Levels & Console Colors

| Method | Level | Console Color |
|---|---|---|
| `logger.info()` | `INFO` | Blue |
| `logger.success()` | `SUCCESS` | Green |
| `logger.warn()` | `WARN` | Yellow |
| `logger.error()` | `ERROR` | Red |
| `logger.debug()` | `DEBUG` | Gray |

---

## Metadata

Attach any structured data as a second argument:

```ts
await logger.error('Payment failed', {
  orderId: 'ORD-9912',
  amount: 99.99,
  currency: 'USD',
  reason: 'insufficient_funds',
});
```

Text output:
```
[14:05:33] ERROR   Payment failed  {"orderId":"ORD-9912","amount":99.99,"currency":"USD","reason":"insufficient_funds"}
```

JSON output (when `json: true`):
```json
{"timestamp":"2026-06-29T14:05:33.000Z","level":"ERROR","message":"Payment failed","metadata":{"orderId":"ORD-9912","amount":99.99,"currency":"USD","reason":"insufficient_funds"}}
```

---

## Weekly Log Rotation

Log files span exactly 7 days, calculated from a fixed epoch so windows are always the same regardless of when the logger first starts.

```
logs/
  2026-06-29_to_2026-07-05.log   ← current week
  2026-07-06_to_2026-07-12.log   ← next week (auto-created on 2026-07-06)
```

After rotation, the retention policy runs automatically and removes files beyond `retentionWeeks`.

---

## Express Middleware

### Via the logger instance

```ts
import express from 'express';
import { createLogger } from 'smart-file-logger';

const app = express();
const logger = createLogger({ logDir: './logs' });

app.use(logger.middleware());
```

### Via the standalone factory

```ts
import { createLogger, createHttpMiddleware } from 'smart-file-logger';

const logger = createLogger();
app.use(createHttpMiddleware(logger, { errorsOnly: false }));
```

Each request is logged as:
```
[14:05:33] INFO    GET /api/users 200 12ms  {"ip":"127.0.0.1","statusCode":200,"durationMs":12}
```

Level mapping: `5xx → ERROR`, `4xx → WARN`, `2xx/3xx → INFO`.

---

## JSON Mode

Enable NDJSON output for integration with log aggregators (Datadog, Loki, Elastic, etc.):

```ts
const logger = createLogger({ json: true });
```

Each line is a self-contained JSON object:
```json
{"timestamp":"2026-06-29T10:20:15.000Z","level":"INFO","message":"Server started"}
{"timestamp":"2026-06-29T10:22:30.000Z","level":"ERROR","message":"DB failed","metadata":{"host":"localhost"}}
```

---

## Error Handling

The logger **never throws or crashes your application**. If a file write fails (disk full, permissions, etc.), the error is written to `process.stderr` and the write queue continues with the next entry.

---

## Folder Structure

```
src/
  config/       — resolveConfig() + defaults
  formatter/    — pure text/JSON/console formatters
  logger/       — SmartLogger class (core orchestrator)
  middleware/   — createHttpMiddleware() factory
  cleanup/      — enforceRetention() policy
  writer/       — FileWriter + WriteQueue (all disk I/O)
  utils/        — date helpers + ANSI color helpers
  types/        — all TypeScript interfaces and types
  index.ts      — public API surface
```

---

## TypeScript

The package ships its own type declarations — no `@types/*` package needed.

```ts
import type { Logger, LogLevel, LogMetadata, LoggerOptions } from 'smart-file-logger';
```

---

## License

[MIT](LICENSE) © smart-file-logger contributors
