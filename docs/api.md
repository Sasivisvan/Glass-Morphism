# API reference

All functions live on the `LiquidGlass` object (the global, the default export, or named ES module exports).

## `attach(el, options?)` → `GlassHandle`

Turns `el` into refracting glass. `options` is a preset name, an options object, or an options object with a `preset` key to extend. Attaching again replaces the previous glass.

```js
const h = LiquidGlass.attach(card, { preset: 'regular', chromatic: .08 });
```

### Options

| Option | Default | Description |
| --- | --- | --- |
| `bezel` | `20` | Width of the curved rim in px. Refraction happens only inside this band. |
| `thickness` | `24` | Glass height in px. Higher means stronger lensing. |
| `ior` | `1.5` | Index of refraction (window glass ≈ 1.5, diamond ≈ 2.4). |
| `profile` | `'squircle'` | Rim surface shape: `'squircle'`, `'circle'`, `'lip'` (raised rim), `'linear'`. |
| `strength` | `1` | Multiplier on the final displacement. |
| `magnify` | `0` | `0`–`0.3`. Pulls the interior toward the centre, like a magnifier. |
| `blur` | `2` | Frost in px, applied before refraction. |
| `saturate` | `1.5` | Saturation of what's seen through the glass. |
| `brightness` | `1` | Brightness multiplier. Below 1 helps white text on bright backgrounds. |
| `chromatic` | `0` | `0`–`0.4`. Splits R/G/B for colour fringing at the rim. |
| `specular` | `0.7` | `0`–`1`. Opacity of the rim highlight. |
| `lightAngle` | `-135` | Direction toward the light in degrees, screen space. `-90` is straight up, `-135` is top-left. |
| `fixedLight` | `false` | Ignore `setLight()` / `followPointer()`. |
| `radius` | `null` | Corner radius override in px. `null` reads `border-radius` from CSS. |
| `fallbackBlur` | `14` | Blur used in browsers without SVG backdrop filters. |
| `shape` | — | An alpha `<canvas>` for non-rectangular glass. See `attachText`. |

### `GlassHandle`

| Member | Description |
| --- | --- |
| `update(options)` | Merge options and re-render. |
| `destroy()` | Same as `detach(el)`. |
| `opts` | The resolved options. |
| `el` | The element. |

## `detach(el)` / `get(el)`

Remove glass from an element, or get its handle (`undefined` if none).

## `init(root?, options?)` / `init(options)`

Attaches every `[data-liquid-glass]` element under `root` (default `document`) and enhances all [components](components.md). Safe to call more than once: already-enhanced elements are skipped.

| Option | Description |
| --- | --- |
| `observe: true` | Watch for added elements with a `MutationObserver`. |
| `light: 'pointer'` | Same as calling `followPointer()`. |

### Data attributes

```html
<div class="lg" data-liquid-glass="clear" data-lg-bezel="28" data-lg-chromatic="0.1"></div>
```

`data-liquid-glass` names the preset. Any `data-lg-*` attribute overrides one option (camel-cased: `data-lg-light-angle` → `lightAngle`).

## Presets

| Preset | Use for | Values |
| --- | --- | --- |
| `regular` | Bars, cards, buttons: the default | bezel 16 · thickness 18 · blur 3 · saturate 1.7 · brightness .95 · specular .75 |
| `clear` | Over photos and video | bezel 20 · thickness 24 · blur .5 · saturate 1.5 · specular .9 · chromatic .05 |
| `tinted` | Maximum legibility (like iOS 26.1 "Tinted") | bezel 18 · thickness 18 · blur 6 · saturate 1.5 · specular .55 |
| `prism` | Showpiece lenses | bezel 34 · thickness 40 · ior 1.6 · chromatic .16 · magnify .08 |
| `lens` | A pressed control (magnifier) | bezel 10 · thickness 16 · ior 1.6 · blur 0 · magnify .22 |
| `thumb` | Resting thumbs and indicators | bezel 10 · thickness 10 · blur 0 · specular .4 |

Presets live in `LiquidGlass.PRESETS`. Add your own by assigning to it before calling `init()`:

```js
LiquidGlass.PRESETS.frostedPill = { bezel: 14, thickness: 14, blur: 8, specular: .5 };
```

Pair CSS variants with presets for the tint: `.lg--clear`, `.lg--tinted`, `.lg--dark`, `.lg--light`, `.lg--frosted`. See [theming](components.md#theming).

## Lighting

### `setLight(angle, { immediate }?)`

Moves the light for every glass element that isn't `fixedLight`. It also updates the `--lg-light` CSS variable that drives the rim gradient. Re-rendering is debounced (~90 ms) unless `immediate: true`.

### `followPointer({ range }?)` → `stop()`

Light follows the pointer, or device tilt on phones, the way Apple's highlights move when you tilt an iPhone. `range` is the swing in degrees (default 70). Call the returned function to stop.

## Text and custom shapes

### `attachText(el, text, options?)` → `Promise<GlassHandle>`

Makes `el` a piece of glass shaped like `text`, like the iOS 26 lock screen clock. The text is rasterised, its alpha blurred into a height field, and the gradient of that field becomes the surface normal. The element is sized to the text and clipped with `mask-image`.

```js
LiquidGlass.attachText(clock, '9:41', {
  preset: 'clear', font: '700 118px Inter, sans-serif', letterSpacing: -5,
  thickness: 30, brightness: 1.25, specular: 1,
});
```

Extra options: `font` (CSS font shorthand; defaults to the element's computed font), `padding` (default 14), `letterSpacing` (px). It waits for the font to load.

### `textShape(text, options)` → `{ canvas, mask, width, height }`

The lower-level helper: an alpha canvas you can pass as `shape`, plus a 2× mask data URL. Any alpha canvas works as `shape`, so you can draw logos and icons too.

## Lens helpers

`LiquidGlass.lens.on(el, options?)` / `lens.off(el, options?)` switch an attached element to the `lens` preset (plus overrides) and toggle its `is-lens` class. The components use these on press.

## WebGL renderer

`dist/liquid-glass-gl.js` (global `LiquidGlassGL`, or `import LiquidGlassGL from 'glass-morphism/gl'`) renders the same optics in a WebGL2 shader. It works in every browser and adds frost from mipmaps, dispersion, a Fresnel rim, a drop shadow, and **shapes that melt together**.

The trade-off: the shader can only refract a texture you give it, so you paint your backdrop into a canvas.

```js
const gl = new LiquidGlassGL(canvas, backgroundCanvasOrImage, { merge: 30, chromatic: .1 });
gl.shapes = () => [{ x: 40, y: 40, w: 240, h: 80, r: 40 }, { x: 300, y: 60, w: 120, h: 120, r: 60 }];
gl.start();         // render every frame
gl.uploadSource();  // call after the background changes
```

| Param | Default | Description |
| --- | --- | --- |
| `bezel`, `thickness`, `ior`, `chromatic`, `specular`, `magnify`, `saturate`, `lightAngle` | as above | Same meaning as the SVG options. |
| `frost` | `2` | Blur radius in px. |
| `merge` | `28` | Smooth-min radius: shapes closer than this blend into one. `0` disables merging. |
| `tint` | `0.04` | White wash. |
| `shadow` | `0.22` | Drop shadow strength. |

Up to 8 shapes. `gl.ok` is `false` when WebGL2 is unavailable. See [`demo/lens.html`](../demo/lens.html) for a full example with draggable DOM handles.

## Low level

`rectMaps(w, h, radius, options)` and `alphaMaps(canvas, options)` return the generated `{ disp, spec, scale, W, H }` maps (data URLs plus the displacement scale). Use them to build your own SVG filters.
