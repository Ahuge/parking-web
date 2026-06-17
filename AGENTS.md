<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Vancouver Parking Web — Agent Guide

## Project
Next.js 16 static export for parking price comparison. See sibling repo `parking-data` for data pipeline.

## Key facts (learned during Sprint 0)
- Walking penalty: `$1.00/min` — hardcoded in `pricing-engine.ts`
- Use UTC date methods (`getUTCDay`, `getUTCHours`) for `isOpenAt` timezone safety
- `vitest.config.mts` must be excluded from `tsconfig.json` to avoid Next.js/vite type conflicts
- Use `output: 'export'` in `next.config.ts` for static export
- Custom image loader required for static export (`src/lib/image-loader.ts`)
- `SearchResult.id` does not exist — access lot ID via `result.lot.id`

## Conventions
- **Commit discipline**: Every logical change gets its own commit. No staging unrelated files. Commits are frequent and atomic — each one compiles, passes tests, and represents a single coherent change. Squash/WIP commits are forbidden.
- **Test coverage**: All code paths should be tested. Every change must validate existing tests still pass and add new tests for new functionality. No PR without passing tests.
- **No backend, no database, no auth**: Static export only.

## Source structure
```
src/
  __tests__/           # Vitest test files
  lib/
    schemas.ts         # Zod schemas (ParkingLot, PricingRule, SearchQuery, etc.)
    pricing-engine.ts  # Core engine: computeResults(), filters, sort modes
    image-loader.ts    # Custom image loader for static export
```

## Commands
- `npm run dev` — dev server
- `npm run build` — static export build
- `npm test` — run Vitest
- `npm run lint` — ESLint
