# Validation status

Validation performed in the generation container:

- All TypeScript/TSX files parsed with the TypeScript compiler API: **pass**.
- All local `@/` and relative imports resolve to files in the project: **pass**.
- Domain types + status rules + demo seed strict TypeScript check: **pass**.
- Mock repository boundary strict TypeScript check: **pass**.
- Lead/domain service layer strict TypeScript check against the mock repository: **pass**.
- `package.json` and `tsconfig.json` JSON parsing: **pass**.

Not executed in the generation container:

- `npm install`, because outbound npm registry access is unavailable in this environment.
- `next build`, ESLint and Vitest, because project dependencies could not be installed.
- PostgreSQL integration test, because the container does not have project dependencies/database tooling installed.

Run after extracting:

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run build
```
