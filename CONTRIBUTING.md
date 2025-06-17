# Contributing to OBVIO

Thank you for helping improve this project! The following guidelines keep the repository consistent.

## Development workflow

1. Install dependencies with `npm install`.
2. Run the linter and tests before committing:
   ```bash
   npm run lint
   npm test
   ```
3. Commit messages should follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) format, e.g. `feat: add ride endpoint` or `fix: handle invalid token`.

## Linting

This project uses ESLint. Run `npm run lint` to check all source files. Issues should be fixed automatically where possible using `npm run lint -- --fix`.

## Tests

Tests are written with Jest and Supertest. They run quickly without any external services. Execute `npm test` to ensure your changes do not break existing functionality.
