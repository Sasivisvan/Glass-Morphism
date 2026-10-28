# Changelog

## 1.0.0 — 2026-10-28

First release.

- Snell's-law refraction engine (`attach`, `detach`, `update`) with squircle, circle, lip and linear rim profiles, magnification, dispersion and rim specular maps.
- Presets: `regular`, `clear`, `tinted`, `prism`, `lens`, `thumb`.
- `init()` with `data-liquid-glass` / `data-lg-*` attributes and an optional MutationObserver.
- Global lighting: `setLight()`, `followPointer()`.
- Text-shaped glass: `attachText()`, `textShape()`.
- Components: button, switch, slider, segmented control, tab bar, toolbar, morphing menu.
- WebGL2 renderer (`LiquidGlassGL`) with merging shapes, mipmap frost, dispersion, Fresnel and shadow.
- UMD + ES module builds, TypeScript definitions, CSS with theming variables.
- Demo site: Lens Lab, tab bar, Control Center, Lock Screen, components, classic materials.
