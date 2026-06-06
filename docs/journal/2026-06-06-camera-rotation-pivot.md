# 2026-06-06: Camera Rotation Pivot

## Summary

Fixed camera rotation after panning so rotation pivots around the visible scene center instead of the original world center.

## Change

`moveCameraInScreen` now represents panning by updating the camera's world `center` through the current rotation and scale. It no longer accumulates pan as a persistent `screenOffset`.

This preserves the existing interaction meaning:

- camera motion still moves the rendered scene in the opposite screen direction
- direct manipulation can still invert pointer deltas so the scene follows the pointer

But it changes the rotation invariant:

- after panning, the world point at the viewport center remains at the viewport center through rotation

## Why

The previous offset-based pan made rotation continue around the old camera center. Visually, this felt like rotation around the world instead of the currently centered scene.
