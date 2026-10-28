# Changelog

## 1.0.2 — 2026-10-29

- **Clearer glass.** Frost is now applied *after* refraction, inside the SVG filter, so rim lensing stays visible even on frosted presets. Before, the backdrop was blurred first and the lens had nothing left to bend.
- `regular` preset is clearer (blur 1.5, thickness 20), closer to iOS.
- Sliders no longer keep keyboard focus after a pointer drag, so later key presses (End, arrows) and the scroll wheel can't change their values by accident.
- `update()` calls are coalesced into one rebuild per frame, so dragging a control that updates glass stays smooth.
- Fallback blur in Firefox and Safari now follows each preset's `blur` instead of a fixed 14px.

## 1.0.1 — 2026-10-29

- `init()` now also accepts options as its first argument: `LiquidGlass.init({ light: 'pointer' })`.
- Published to npm as `@sasivisvan/glass-morphism`.
- New showcase site with a live playground.

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
