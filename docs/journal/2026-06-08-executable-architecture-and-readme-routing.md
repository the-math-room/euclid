# 2026-06-08: Executable Architecture And README Routing

## Summary

After moving free-point creation into the geometry edit boundary, we tightened the feedback loops around the same architectural commitments.

This pass did two things:

- turned several journaled principles into executable architecture tests
- rewrote the repo READMEs so they serve primarily as LLM attention-routing documents

The goal was not more documentation for its own sake. The goal was to make the rules cheaper to follow and harder to accidentally drift from.

## Executable Architecture Tests

The architecture tests now enforce more than package import direction.

We added static guards for principles that had previously lived mostly in journals and README prose:

- raw `as WorldPoint` / `as ScenePoint` casts are only allowed inside the brand constructors
- app production code may not import `generateNextPointLabel`
- app production code may not directly construct authored geometry records, except static lesson fixture content
- pure app adapter modules stay free of ambient effects and module-level mutable state
- Zod imports stay at explicit content/schema parse boundaries

These checks encode the latest boundary work directly:

- branded coordinates should be created through `toWorldPoint` / `toScenePoint`
- construction creation rules should stay in geometry edit commands
- React and app command code should wire construction edits, not invent construction semantics
- Zod should parse unknown content, not shape internal evaluation or editing

## Test Suite Shape

The first version placed all new checks in `tests/architecture/import-boundaries.test.ts`. That worked, but the file name stopped matching its contents.

We split the architecture suite by invariant type:

- `tests/architecture/import-boundaries.test.ts`: layer imports, generated-output imports, package entrypoints, explicit package exports
- `tests/architecture/pure-core.test.ts`: package purity and pure app adapter purity
- `tests/architecture/semantic-boundaries.test.ts`: branded coordinates, construction-edit ownership, and Zod parse-boundary placement
- `tests/architecture/sourceAnalysis.ts`: shared TypeScript AST/file walking helpers

This keeps the tests readable as architecture policy instead of turning one file into a miscellaneous rule pile.

## Why Not ESLint Yet

We considered whether these checks had crossed the line into custom linting.

The current decision is to stay with Vitest plus TypeScript AST helpers for now.

The principle is local complexity budget: use the simplest mechanism that keeps the invariant executable and understandable. These rules are repo-specific, run as part of `npm run check`, and are easier to read as architecture tests than as a custom ESLint plugin.

The line to watch is clear. If `sourceAnalysis.ts` starts accumulating fixer behavior, rule metadata, complex configurable matching, or checks that need editor-time feedback, then ESLint becomes the better tool. We are not there yet.

## README Refocus

We also audited every README in the repo.

The desired audience is primarily an LLM or human maintainer trying to decide where to spend attention before editing. Several READMEs had useful information, but mixed public API cataloging, broad architectural explanation, local rules, and verification instructions in inconsistent ways.

The READMEs now follow a more consistent local shape:

- purpose
- what this area owns
- what it does not own
- where to start
- local rules
- tests to run or update

The top-level README now stays at repo orientation and global commitments. Package READMEs stay scoped to their package. Example READMEs stay scoped to portable fixture boundaries. The web README stays scoped to the browser shell and pure app adapter split.

This makes the README layer match the repo map:

- `docs/llm/REPO_MAP.md` routes attention across the repo
- each README routes attention within its local area
- architecture tests enforce the rules that are cheap and precise enough to make executable

## Resulting Direction

The project now has a clearer documentation stack:

- journals explain why a boundary changed
- architecture docs explain stable design commitments
- README files guide local editing
- architecture tests enforce selected rules

That division matters for LLM-assisted development. The model should not have to rediscover ownership boundaries from source alone, and it should not rely only on prose when a cheap executable guard can catch drift.

## Verification

The architecture-test split was verified with:

```bash
npx vitest run tests/architecture/import-boundaries.test.ts tests/architecture/pure-core.test.ts tests/architecture/semantic-boundaries.test.ts
npx tsc --noEmit -p tsconfig.test.json
npm run check
```

The final full check passed with 36 passing test files, 219 passing tests, and a successful production build.

The README pass was documentation-only. Prettier was run on every touched README and `docs/llm/REPO_MAP.md`.
