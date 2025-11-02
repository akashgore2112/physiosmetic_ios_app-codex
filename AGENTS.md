# Repository Guidelines

## Project Structure & Module Organization
- Keep source code in `src/`, tests in `tests/`, automation in `scripts/`, and docs in `docs/`. Assets (images, fixtures) live under `assets/`.
- Example layout:
  - `src/` (implementation code)
  - `tests/` (unit/integration; mirrors `src/` paths)
  - `scripts/` (dev/build helpers; bash or python)
  - `assets/` (sample data, images)
  - `README.md`, `AGENTS.md`, `.gitignore`

## Build, Test, and Development Commands
- `make setup` — install toolchain and dependencies (idempotent).
- `make test` — run all tests with coverage report.
- `make lint` — run formatters and linters.
- `make run` — start the app or example entrypoint.
- If `Makefile` is absent, call the underlying tools directly (e.g., `pytest -q`, `ruff check`, `node scripts/dev.js`).

## Coding Style & Naming Conventions
- Indentation: 4 spaces for Python; 2 spaces for JSON/YAML/Markdown.
- Filenames: `snake_case` for Python and scripts; `kebab-case.md` for docs.
- Keep modules small and cohesive; prefer pure functions over side effects.
- Formatting/Linting (if configured): `black`, `ruff`, or equivalent. Run before opening a PR.

## Testing Guidelines
- Place tests under `tests/` mirroring `src/` paths: `tests/<module>/test_<unit>.py`.
- Aim for ≥80% line coverage on changed code.
- Write focused, deterministic tests; avoid network and time-based flakiness.
- Run `make test` locally and ensure it passes before pushing.

## Commit & Pull Request Guidelines
- Use Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
- Commits should be small, logically scoped, and pass tests/lint.
- PRs must include: clear description, rationale, before/after notes, and screenshots or logs when UI/CLI behavior changes.
- Link related issues with `Closes #<id>`.

## Security & Configuration
- Never commit secrets. Use `.env.local` (gitignored) for local config.
- Validate and sanitize all external inputs. Add minimal permission scopes.

## Agent-Specific Instructions
- Keep changes minimal and targeted; do not rename files or add new tooling unless requested.
- Prefer `rg` for search; use `apply_patch` for edits; avoid unrelated refactors.
- Update this file if conventions change.
