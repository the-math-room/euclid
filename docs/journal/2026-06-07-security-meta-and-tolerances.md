# 2026-06-07: Security Meta And Tolerances

## Summary

Made two small hardening/refactor moves:

- production builds now emit a stricter CSP meta tag than local development
- anonymous numeric epsilon literals were replaced with semantic tolerance constants

We also reviewed symbolic geometric proving as a future direction and decided not to integrate a prover yet.

## What Changed

`index.html` now includes:

- `meta name="referrer" content="strict-origin-when-cross-origin"`
- the existing dev-friendly CSP meta tag with localhost and local WebSocket allowances

`vite.config.ts` now applies a production-only HTML transform during `vite build`. Production output keeps the CSP self-contained in static HTML, but removes dev-only network sources:

- no `http://localhost:*`
- no `http://127.0.0.1:*`
- no `ws://localhost:*`
- no `ws://127.0.0.1:*`
- `connect-src 'self'`
- `upgrade-insecure-requests`

This is not a substitute for deployment response headers. GitHub Pages does not give us normal arbitrary header configuration, so `X-Content-Type-Options`, true HTTP `Referrer-Policy`, and `frame-ancestors` remain hosting/CDN concerns.

Added semantic tolerance constants:

- `packages/geometry/src/tolerance.ts`: `REALIZATION_EPSILON`
- `packages/rendering/src/tolerance.ts`: `SCENE_GEOMETRY_EPSILON`, `LABEL_LAYOUT_SCORE_EPSILON`
- `apps/web/src/tolerance.ts`: `PREVIEW_DIRECTION_EPSILON`
- `packages/assessment/src/assessment.ts`: `DEFAULT_ASSESSMENT_EPSILON`

Updated realization, rendering, preview, and assessment code to use those names instead of bare `1e-9` / `1e-6` literals.

## Principle: Security Headers Need The Host

HTML meta tags can improve some browser behavior, but they are not equivalent to HTTP response headers.

The pragmatic split for the current GitHub Pages deployment is:

- use meta CSP as a low-friction static-site fallback
- keep local development allowances in source HTML
- strip dev-only sources from production build output
- defer full header hardening until the deployment target supports response headers

This gives a better Lighthouse/security scan result without making local Vite development painful.

## Principle: Tolerances Are Semantic

Numeric epsilons should not be centralized as one global magic value merely because the numbers match.

The same literal can mean different things in different layers:

- realization degeneracy
- scene clipping and duplicate projected intersections
- label-layout score improvement
- preview direction normalization
- assessment equivalence

Naming the tolerance by semantic role makes future tuning safer. If label layout needs a different threshold, it should not accidentally change geometric realization.

## Symbolic Proof Direction

We reviewed whether geometric proof from denotation is a stock problem.

The answer is yes in the broader field, but not as a low-friction TypeScript dependency. GeoGebra's automated reasoning tools are the closest practical stock system: commands like `Prove` use symbolic methods to decide general truth rather than checking only current numeric coordinates.

For Euclid, the right near-term posture is:

- keep strengthening the denotational construction model
- keep exact meaning separate from approximate realization
- do not embed a theorem prover yet
- revisit symbolic statements later as an export or integration boundary

The likely first experiment should be exporting a construction program and conjecture into a prover-friendly symbolic representation, not replacing realization.

## Verification

Ran focused tests for touched areas:

```bash
npx vitest run packages/geometry/src/approx.test.ts packages/geometry/src/evaluate.test.ts packages/rendering/src/scene.test.ts packages/rendering/src/labelLayout.test.ts apps/web/src/workspacePreview.test.ts packages/assessment/src/assessment.test.ts
```

Result: 5 passing test files and 40 passing tests.

Ran full validation:

```bash
npm run check
```

Result: lint, format check, app/test typecheck, Vitest, and Vite production build all passed. The test suite reported 34 passing test files and 213 passing tests.
