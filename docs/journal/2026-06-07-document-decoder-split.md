# 2026-06-07: Document Decoder Split

## Summary

Split the document codec into focused decoder modules after the “parse, don’t validate” hardening made `packages/document/src/codec.ts` too large.

The parser behavior stayed the same. The change was about making the boundary easier to understand and extend without concentrating document envelope parsing, construction parsing, and low-level JSON decoding in one file.

## What Changed

`packages/document/src/codec.ts` is now the public facade:

- parse JSON text
- call the document decoder
- return `DocumentParseResult`
- serialize `EuclidDocument`

The implementation moved into three internal modules:

- `documentDecoder.ts`: document envelope and construction-program parsing
- `constructionDecoder.ts`: supported construction-kind parsing
- `jsonDecoder.ts`: small JSON decoding primitives such as records, strings, arrays, tuples, and numbers

The package README and LLM repo map now point future agents at the new decoder files.

## Why It Matters

The earlier parser hardening was correct but created a new maintenance problem: a single codec file had accumulated every parser concern. That made complexity warnings noisy and made future construction additions harder to reason about.

The split restores the intended layering inside the document package:

- `codec.ts` owns the text boundary.
- `documentDecoder.ts` owns the versioned document shape.
- `constructionDecoder.ts` owns the current construction syntax grammar.
- `jsonDecoder.ts` owns reusable structural parsing helpers.

This keeps “parse, don’t validate” explicit without turning the public codec into a god file.

## Verification

Ran full validation:

```bash
npm run check
```

Result: lint, format check, app/test typecheck, Vitest, and Vite production build all passed. The test suite reported 34 passing test files and 213 passing tests.
