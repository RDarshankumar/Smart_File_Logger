# Contributing to smart-file-logger

Thank you for considering a contribution! This document describes the workflow.

---

## Development Setup

```bash
git clone https://github.com/your-username/smart-file-logger.git
cd smart-file-logger
npm install
npm run build
npm test
```

---

## Project Structure

```
src/
  config/     — configuration resolution
  formatter/  — pure text/JSON formatters (no I/O)
  logger/     — core SmartLogger class
  middleware/ — HTTP middleware factory
  cleanup/    — retention policy
  writer/     — FileWriter + WriteQueue
  utils/      — date helpers, ANSI colour helpers
  types/      — shared TypeScript interfaces
  index.ts    — public API surface
tests/        — Jest unit + integration tests
```

---

## Coding Standards

- TypeScript strict mode — no `any` types
- No external runtime dependencies — only Node.js built-in modules
- Pure functions in `utils/` and `formatter/` — no side effects
- All I/O in `writer/` only — formatter and logger must not touch the filesystem
- Every public function must have a JSDoc comment
- Run `npm run lint` and `npm run format:check` before opening a PR

---

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add log.child() for scoped loggers
fix: prevent duplicate day separator on midnight boundary
docs: add metadata examples to README
test: add retention edge-case coverage
chore: upgrade typescript to 5.6
```

---

## Pull Request Checklist

- [ ] `npm test` passes with no failures
- [ ] `npm run type-check` passes
- [ ] `npm run lint` passes
- [ ] New behaviour covered by tests
- [ ] Public API changes documented in README and CHANGELOG
- [ ] No new runtime dependencies added

---

## Reporting Bugs

Open an issue at [https://github.com/your-username/smart-file-logger/issues](https://github.com/your-username/smart-file-logger/issues) with:
1. Node.js version (`node --version`)
2. Package version
3. Minimal reproduction script
4. Expected vs. actual behaviour

---

## License

By contributing you agree that your contributions will be licensed under the [MIT License](LICENSE).
