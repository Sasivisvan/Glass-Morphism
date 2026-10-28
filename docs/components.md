# Components

The components are plain markup that `LiquidGlass.init()` enhances. Switch and slider wrap real `<input>`s, so keyboard use, forms and screen readers keep working. Live demo: [`demo/components.html`](../demo/components.html).

Every component accepts `data-liquid-glass="<preset>"` to change its material.

## Glass surface

![Presets](images/presets.jpg)

```html
<div class="lg" data-liquid-glass="regular">…</div>
<div class="lg lg--clear" data-liquid-glass="clear">…</div>
<div class="lg lg--tinted" data-liquid-glass="tinted">…</div>
```

Shape helpers: `.lg--pill` (fully rounded), `.lg--circle`. Any `border-radius` works; the glass reads it.

## Button

![Buttons](images/buttons.jpg)

```html
<button class="lg-button">Glass</button>
<button class="lg-button lg-button--prominent">Prominent</button>
<button class="lg-button lg-button--icon" aria-label="Like"><svg>…</svg></button>
<button class="lg-button lg-button--small">Small</button>
```

On press it scales up with a spring and glows from the touch point (`--lg-px`, `--lg-py`). `--prominent` tints with `--lg-accent`.

## Switch

![Switch and slider, resting and pressed](images/switch-slider.jpg)

```html
<label class="lg-switch"><input type="checkbox" checked aria-label="Wi-Fi"></label>
```

Tap to toggle, or hold and drag the thumb. While pressed, the white thumb turns into a clear magnifying lens over the track. The input fires normal `input` and `change` events. Colour: `--lg-on`.

## Slider

```html
<div class="lg-slider"><input type="range" min="0" max="100" value="45" aria-label="Volume"></div>
```

Drag anywhere on the track. The thumb becomes a lens while dragging. Listen to the input's `input` and `change` events. The fill uses `--lg-accent`, and the current fraction is exposed as `--lg-value`.

## Segmented control

![Segmented control, resting and dragging](images/segmented.jpg)

```html
<div class="lg-segmented">
  <button>Day</button><button aria-pressed="true">Week</button><button>Month</button>
</div>
```

```js
el.addEventListener('lg-change', e => console.log(e.detail.index, e.detail.item));
el.lgSelect(2); // select programmatically
```

Click a segment, or drag the selection: it turns into a droplet that magnifies the labels, then snaps to the nearest one.

## Tab bar

![Tab bar, resting and dragging](images/tabbar.jpg)

```html
<nav class="lg-tabbar">
  <a class="lg-tabbar__item" href="#home" aria-current="page"><svg>…</svg><span>Home</span></a>
  <a class="lg-tabbar__item" href="#browse"><svg>…</svg><span>Browse</span></a>
</nav>
```

Behaves like the segmented control, sets `aria-current="page"` on the active item, and fires `lg-change`. For the iOS 26 minimise-on-scroll behaviour, see [`demo/tabbar.html`](../demo/tabbar.html).

## Toolbar

![Toolbar](images/toolbar.jpg)

```html
<div class="lg-toolbar">
  <button aria-label="Back">…</button><hr>
  <button aria-label="Favourite">…</button><button aria-label="Search">…</button>
</div>
```

A glass capsule grouping icon buttons. `<hr>` draws a hairline separator.

## Morphing menu

![Menu, closed and open](images/menu.jpg)

```html
<div class="lg-menu">
  <button class="lg-menu__trigger" aria-label="More">…</button>
  <div class="lg-menu__panel">
    <button class="lg-menu__item">Share <svg>…</svg></button>
    <button class="lg-menu__item">Settings <svg>…</svg></button>
  </div>
</div>
```

The trigger morphs into the panel; the glass map is rebuilt as the shape changes. It closes on item click, outside click or <kbd>Esc</kbd>, keeps `aria-expanded` in sync, and fires `lg-open` / `lg-close`. The trigger sits in the top-right corner, so the panel grows down and to the left.

## Glass text

![Glass text](images/glass-text.jpg)

```html
<div id="title"></div>
<script>LiquidGlass.attachText(title, 'Glass', { preset: 'clear', font: '800 104px Inter' });</script>
```

## Theming

All colours and materials are CSS custom properties, set per element or globally:

| Variable | Default | Affects |
| --- | --- | --- |
| `--lg-tint` | `rgba(255,255,255,.08)` | Background wash of the glass |
| `--lg-rim` | `1` | Rim highlight intensity (0–1) |
| `--lg-shadow` | soft drop shadow | Outer shadow |
| `--lg-blur`, `--lg-saturate` | `16px`, `180%` | The CSS-only fallback material |
| `--lg-light` | `135deg` | Rim gradient angle (`setLight()` updates it) |
| `--lg-accent` | `#0a84ff` | Prominent buttons, slider fill, active tab |
| `--lg-on` | `#34c759` | Switch on colour |

```css
.my-bar { --lg-tint: rgba(10, 10, 12, .3); --lg-rim: .8; }
:root { --lg-accent: #ff375f; }
```

`prefers-reduced-transparency` swaps glass for an opaque surface, and `prefers-reduced-motion` removes the spring animations.
