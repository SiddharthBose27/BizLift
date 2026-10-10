# BizLift Sample and Demo Data

BizLift includes sample datasets and demo workspace fixtures for local
development and demonstration.

## Included datasets

The `backend/data/sample/` directory contains CSV datasets for sales,
inventory transactions, waste events, purchase orders, demand observations,
suppliers, inventory master data, and recipes.

The root `sample-data/` directory contains a demo inventory CSV and XLSX
workbook for testing spreadsheet workflows.

## Demo workspace fixtures

- `backend/data/demoDb.json` is the clean demo seed used by
  `npm run bootstrap:demo`.
- `backend/data/generatedWorkspaceData.json` contains generated demo
  workspace data used by the demo workspace module.
- `backend/data/db.json` is the mutable local operational JSON database.
  It is intentionally excluded from Git so local changes are not committed.

Demo fixtures are intended for local development and demonstration only.
Before publishing or deploying, verify that they contain no real customer
information, personal data, or credentials. Password hashes in demo fixtures
should not be treated as a security guarantee.

## Initialize a local demo

From the `backend/` directory, install dependencies and configure the
environment using `.env.example`. For a PostgreSQL setup, ensure PostgreSQL
is running and the database specified by `DATABASE_URL` exists.

Run the repository's demo bootstrap script before starting the backend:

```bash
npm run bootstrap:demo
npm run dev
```

Use the README's Demo accounts section for the demo login details. Do not
reuse demo passwords in production.
