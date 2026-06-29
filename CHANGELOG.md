# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- Stream-based writer for very high-throughput scenarios
- `logger.child()` for scoped loggers with default metadata
- Gzip compression of archived log files

---

## [1.0.0] — 2026-06-29

### Added
- `createLogger(options?)` factory function
- Five log levels: `INFO`, `SUCCESS`, `WARN`, `ERROR`, `DEBUG`
- Weekly log rotation with a fixed-epoch 7-day window
- Automatic day separator (written once per calendar day)
- Configurable retention policy (`retentionWeeks`, default 4)
- ANSI console colours per log level; respects `NO_COLOR` env-var
- Optional JSON (NDJSON) output mode
- Optional metadata object on every log call
- `createHttpMiddleware(logger, options?)` for Express/Connect
- `logger.middleware()` shorthand
- Serial async write-queue — no event-loop blocking, no interleaved writes
- Crash-safe: all I/O errors reported to `process.stderr`, never thrown
- Zero external dependencies — Node.js built-ins only
- Full TypeScript types shipped with the package
- ESLint + Prettier configuration
- GitHub Actions CI workflow
- 100% JSDoc coverage on public API
