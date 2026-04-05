# devnotes

A Laravel 13 application with Inertia, React 19, TypeScript, Vite, and Fortify-based authentication.

## Requirements

- PHP 8.3+
- Composer
- Node.js 22+
- npm

## Initial setup

```bash
composer setup
```

That script installs PHP and JavaScript dependencies, creates `.env` if needed, generates the app key, runs migrations, and builds frontend assets.

## Local development

```bash
composer dev
```

This starts the Laravel server, queue worker, log tailing, and Vite in one command.

## Useful commands

```bash
composer test
composer ci:check
npm run lint
npm run format
npm run types:check
```

## Notes

- The default database connection is SQLite.
- If `database/database.sqlite` does not exist yet, create it before running migrations manually.
