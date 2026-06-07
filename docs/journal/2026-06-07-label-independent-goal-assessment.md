# Journal Entry: 2026-06-07 — Label-Independent Goal Matching

## Context & Rationale

Prior to this change, the Euclid assessment engine validated constructions using `"meaning"` goals, which relied on resolving an ID mapping between the user's construction graph and the static, predefined curriculum targets. This approach was highly fragile:

1. It forced a strict "recipe" on the student (e.g., in Lesson 2, the user was required to draw two circles with specific centers, intersect them, and connect the intersections).
2. It failed if the student used alternative tools or construction paths (e.g., using the Midpoint tool and then drawing a perpendicular line, which is mathematically equivalent but results in a completely different DAG).
3. It contradicted the core architectural precept of **Denotational Design**: "Meaning is independent of realization." The mathematical meaning of the bisector is its geometric property, not the arbitrary labels or specific construction order of the vertices.

## The Solution: Dynamic Coordinate Perturbation

We introduced the `"geometric-equivalent"` goal type. Instead of checking matching labels or expression-equivalence, we evaluate the target program alongside the user's program and check if their outputs are geometrically congruent across multiple coordinates:

1. **Free Point Synchronization**: We identify the initial free points defined in the starter lesson.
2. **Dynamic Perturbation**: We run 3 perturbation loops, applying deterministic pseudo-random offsets to the free points.
3. **Re-Evaluation**: We re-evaluate both the user's construction program and the target program under these modified coordinates.
4. **Congruence Check**: We check if the user's candidate primitive remains collinear, concentric, or coincident with the target primitive within a floating-point tolerance ($\epsilon = 10^{-6}$).

This makes the evaluation robust against dragging, verifying the **geometric relationship** of the result rather than just the construction path or provenance.

## Integration & Verification

- **Curriculum Updates**: Replaced the 5 rigid `"meaning"` goals of the Perpendicular Bisector lesson (Lesson 2) with a single `"geometric-equivalent"` goal. Students can now construct it using circles, or by using the midpoint + perpendicular tools.
- **Test Suite**: Implemented rigorous unit tests verifying that both construction paths correctly pass, and incorrect/static solutions correctly fail.
- **Verification Pipeline**: Verified all checks using `npm run check`.
