# Liquid Glass on the Web

A study of Apple's iOS 26 **Liquid Glass**, and the frosted materials that came before it, recreated in the browser. Each page shows several attempts at the same UI that you can switch between (top-right switcher or keys `1`–`5`).

| Page | What it recreates | Attempts |
| --- | --- | --- |
| `index.html` | Research summary + links | — |
| `lens.html` | The material itself, with live tuning | CSS frost · SVG noise · Snell's-law map · + dispersion · WebGL |
| `tabbar.html` | iOS 26 floating tab bar, minimise-on-scroll, droplet selection | Frosted · Regular · Clear |
| `control-center.html` | Control Center modules, sliders, toggles | iOS 18 · iOS 26 Clear · iOS 26.1 Tinted |
| `lockscreen.html` | Glass clock (text-shaped lens), notification stack | iOS 18 · Clear · Tinted |
| `controls.html` | Switch/slider lens thumbs, segmented control, morphing menu | CSS · Liquid Glass · + motion |
| `materials.html` | UIBlurEffect thicknesses, light/dark | Naïve · hierarchy · + vibrancy |

## Run it

Serve the folder over HTTP (the WebGL attempt can't read images from `file://`):

```sh
python3 -m http.server 8931
# open http://localhost:8931
```

Use a Chromium browser (Chrome, Edge, Brave, Arc) for the SVG refraction attempts. Firefox and Safari fall back to a blur; the WebGL attempt works everywhere.

## How the refraction works

- `assets/liquid-glass.js`: for each element, builds a rounded-rect distance field and a squircle surface profile, applies Snell's law to get each pixel's sideways shift, packs that into an RGBA displacement map, and applies it with `backdrop-filter: blur() url(#filter)`. It also bakes a rim specular map, and can build maps from any alpha shape (used for the glass clock). Maps are rebuilt on resize.
- `assets/glass-gl.js`: the same optics in a WebGL2 shader, plus mip-based frost, per-channel dispersion, Fresnel, drop shadow and smooth-min merging of shapes.
- Chromium quirk: `backdrop-filter: url(#f)` on its own turns dark backdrop pixels transparent. Putting any CSS filter function first (`blur(0px) url(#f)`) fixes it.

Photos: Unsplash via Lorem Picsum. Independent study, not affiliated with Apple.
