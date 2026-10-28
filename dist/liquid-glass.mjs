/*!
 * Glass Morphism — Liquid Glass for the web
 * https://github.com/Sasivisvan/Glass-Morphism
 * MIT License · (c) 2026 Sasivisvan and contributors
 */
/*
 * How the refraction works
 *   1. For an element of size W×H with corner radius R we build a rounded-rect
 *      signed-distance field. Inside a "bezel" band near the edge the glass
 *      surface curves (squircle profile by default).
 *   2. For each pixel in the bezel we take the surface slope, apply Snell's law
 *      (air n=1 → glass n=ior) and compute how far the refracted ray travels
 *      sideways through the glass. That lateral shift is the displacement.
 *   3. Displacements are packed into an RGBA image (R = x, G = y, 128 = none)
 *      and fed to <feDisplacementMap>, used as `backdrop-filter: url(#id)`.
 *   4. A second image holds a rim specular highlight lit from `lightAngle`.
 *
 * Only Chromium browsers accept SVG filters in backdrop-filter. Elsewhere the
 * element falls back to a plain blur so the page still looks like glass.
 */
const LiquidGlass = (function () {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const hasDOM = typeof document !== 'undefined';
  const brands = (typeof navigator !== 'undefined' && navigator.userAgentData && navigator.userAgentData.brands) || [];
  const supported = brands.some(b => /Chromium/i.test(b.brand));

  const DEFAULTS = {
    bezel: 20,          // width of the curved rim, px
    thickness: 24,      // glass height, px — more = stronger lensing
    ior: 1.5,           // index of refraction
    profile: 'squircle',
    strength: 1,        // multiplier on the final displacement
    magnify: 0,         // 0..0.3 — pulls the whole interior toward the centre
    blur: 2,            // frost, px (applied before refraction)
    saturate: 1.5,
    brightness: 1,
    chromatic: 0,       // 0..0.3 — splits R/G/B displacement scales
    specular: 0.7,      // 0..1 rim highlight opacity
    lightAngle: -135,   // degrees, screen space, direction toward the light (-90 = above, -135 = top-left)
    fixedLight: false,  // true = ignore LiquidGlass.setLight()
    radius: null,       // override corner radius; null = read from CSS
    fallbackBlur: 14,
  };

  const PROFILES = {
    squircle: x => Math.pow(1 - Math.pow(1 - x, 4), 0.25),
    circle: x => Math.sqrt(Math.max(0, 1 - (1 - x) * (1 - x))),
    // raised rim with a shallow dip in the middle (used by Apple's switch thumb)
    lip: x => {
      const s = x * x * x * (x * (x * 6 - 15) + 10);
      return PROFILES.squircle(x) * (1 - 0.35 * s);
    },
    linear: x => x,
  };

  let defs = null;
  let uid = 0;
  const cache = new Map();
  const handles = new WeakMap();
  const live = new Set();

  function svgEl(tag, attrs) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  function getDefs() {
    if (!defs) {
      const svg = svgEl('svg', { width: 0, height: 0, 'aria-hidden': 'true' });
      svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
      defs = svgEl('defs', {});
      svg.appendChild(defs);
      document.body.appendChild(svg);
    }
    return defs;
  }

  function sdRoundRect(px, py, hw, hh, r) {
    const qx = Math.abs(px) - hw + r;
    const qy = Math.abs(py) - hh + r;
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
  }

  // Lateral shift of a vertical ray refracted by a surface of the given slope.
  function refractShift(slope, height, ior) {
    const t1 = Math.atan(slope);
    const t2 = Math.asin(Math.min(1, Math.sin(t1) / ior));
    return Math.tan(t1 - t2) * height;
  }

  /* Build displacement + specular images for a rounded rectangle. */
  function rectMaps(w, h, r, o) {
    const key = ['rect', w, h, r, o.bezel, o.thickness, o.ior, o.profile, o.magnify, o.lightAngle, o.specular].join('|');
    if (cache.has(key)) return cache.get(key);

    const W = Math.max(2, Math.round(w)), H = Math.max(2, Math.round(h));
    const hw = W / 2, hh = H / 2;
    const rad = Math.min(r, hw, hh);
    const bezel = Math.max(1, Math.min(o.bezel, Math.min(hw, hh)));
    const f = PROFILES[o.profile] || PROFILES.squircle;

    // Radial lookup: displacement magnitude & slope as a function of depth into the bezel.
    const N = 256, magLut = new Float32Array(N + 1), slopeLut = new Float32Array(N + 1);
    for (let i = 0; i <= N; i++) {
      const t = i / N, e = 1 / N;
      const d = (f(Math.min(1, t + e)) - f(Math.max(0, t - e))) / ((Math.min(1, t + e) - Math.max(0, t - e)) || e);
      const slope = Math.min(40, d * o.thickness / bezel);
      slopeLut[i] = slope;
      magLut[i] = refractShift(slope, o.thickness * f(t), o.ior);
    }

    const vx = new Float32Array(W * H), vy = new Float32Array(W * H);
    const spec = new Float32Array(W * H);
    const la = o.lightAngle * Math.PI / 180, lx = Math.cos(la), ly = Math.sin(la);
    let max = 0.0001;

    for (let y = 0; y < H; y++) {
      const py = y + 0.5 - hh;
      for (let x = 0; x < W; x++) {
        const px = x + 0.5 - hw;
        const d = sdRoundRect(px, py, hw, hh, rad);
        const i = y * W + x;
        if (d > 0) continue;
        let dx = 0, dy = 0;
        const depth = -d;
        if (depth < bezel) {
          // outward normal from the SDF gradient
          let gx = sdRoundRect(px + 0.5, py, hw, hh, rad) - sdRoundRect(px - 0.5, py, hw, hh, rad);
          let gy = sdRoundRect(px, py + 0.5, hw, hh, rad) - sdRoundRect(px, py - 0.5, hw, hh, rad);
          const gl = Math.hypot(gx, gy) || 1;
          gx /= gl; gy /= gl;
          const li = Math.min(N, Math.floor(depth / bezel * N));
          const m = magLut[li];
          dx = -gx * m; dy = -gy * m; // sample from further inside
          // rim light: strongest at the very edge, on the side facing the light (and a weaker opposite kick)
          const facing = gx * lx + gy * ly;
          const lit = Math.max(facing, 0) + Math.max(-facing, 0) * 0.55;
          const rim = Math.pow(1 - depth / bezel, 2.2);
          const fres = Math.min(1, slopeLut[li] / 6);
          spec[i] = Math.min(1, o.specular * lit * lit * rim * (0.35 + 0.65 * fres) * 1.6);
        }
        if (o.magnify) { dx -= px * o.magnify; dy -= py * o.magnify; }
        vx[i] = dx; vy[i] = dy;
        const mm = Math.max(Math.abs(dx), Math.abs(dy));
        if (mm > max) max = mm;
      }
    }

    const out = encode(W, H, vx, vy, spec, max);
    cache.set(key, out);
    if (cache.size > 200) cache.delete(cache.keys().next().value);
    return out;
  }

  /*
   * Build maps for an arbitrary shape given as an alpha canvas (e.g. text).
   * The height field is the blurred alpha; its gradient is the surface normal.
   */
  function alphaMaps(canvas, o) {
    const W = canvas.width, H = canvas.height;
    const src = canvas.getContext('2d').getImageData(0, 0, W, H).data;
    let a = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) a[i] = src[i * 4 + 3] / 255;
    const shape = a.slice();
    const rad = Math.max(1, Math.round(o.bezel / 2));
    for (let pass = 0; pass < 3; pass++) a = boxBlur(a, W, H, rad);

    const vx = new Float32Array(W * H), vy = new Float32Array(W * H), spec = new Float32Array(W * H);
    const la = o.lightAngle * Math.PI / 180, lx = Math.cos(la), ly = Math.sin(la);
    let max = 0.0001;
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        if (shape[i] < 0.01) continue;
        const gx = (a[i + 1] - a[i - 1]) * 0.5, gy = (a[i + W] - a[i - W]) * 0.5;
        const slope = Math.hypot(gx, gy) * o.thickness;
        if (slope < 1e-4) continue;
        const nx = -gx / Math.hypot(gx, gy), ny = -gy / Math.hypot(gx, gy); // outward
        const m = refractShift(slope, o.thickness * a[i], o.ior);
        vx[i] = -nx * m; vy[i] = -ny * m;
        const facing = nx * lx + ny * ly;
        const lit = Math.max(facing, 0) + Math.max(-facing, 0) * 0.5;
        spec[i] = Math.min(1, o.specular * lit * lit * Math.min(1, slope / 2) * (1 - a[i]) * 3 * shape[i]);
        const mm = Math.max(Math.abs(vx[i]), Math.abs(vy[i]));
        if (mm > max) max = mm;
      }
    }
    return encode(W, H, vx, vy, spec, max);
  }

  function boxBlur(src, W, H, r) {
    const tmp = new Float32Array(W * H), out = new Float32Array(W * H), n = 2 * r + 1;
    for (let y = 0; y < H; y++) {
      let s = 0;
      for (let x = -r; x <= r; x++) s += src[y * W + Math.min(W - 1, Math.max(0, x))];
      for (let x = 0; x < W; x++) {
        tmp[y * W + x] = s / n;
        s += src[y * W + Math.min(W - 1, x + r + 1)] - src[y * W + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < W; x++) {
      let s = 0;
      for (let y = -r; y <= r; y++) s += tmp[Math.min(H - 1, Math.max(0, y)) * W + x];
      for (let y = 0; y < H; y++) {
        out[y * W + x] = s / n;
        s += tmp[Math.min(H - 1, y + r + 1) * W + x] - tmp[Math.max(0, y - r) * W + x];
      }
    }
    return out;
  }

  function encode(W, H, vx, vy, spec, max) {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    const dImg = ctx.createImageData(W, H), sImg = ctx.createImageData(W, H);
    const dd = dImg.data, sd = sImg.data;
    for (let i = 0, j = 0; i < W * H; i++, j += 4) {
      dd[j] = 128 + Math.round(vx[i] / max * 127);
      dd[j + 1] = 128 + Math.round(vy[i] / max * 127);
      dd[j + 2] = 128; dd[j + 3] = 255;
      sd[j] = sd[j + 1] = sd[j + 2] = 255;
      sd[j + 3] = Math.round(spec[i] * 255);
    }
    ctx.putImageData(dImg, 0, 0);
    const disp = c.toDataURL();
    ctx.clearRect(0, 0, W, H);
    ctx.putImageData(sImg, 0, 0);
    const specUrl = c.toDataURL();
    // feDisplacementMap shifts by scale * (C - 0.5); C spans ±127/255, so scale = 2·max
    return { disp, spec: specUrl, scale: max * 2 * 255 / 254, W, H };
  }

  function buildFilter(id, maps, o) {
    const { W, H } = maps;
    const f = svgEl('filter', {
      id, x: 0, y: 0, width: W, height: H,
      filterUnits: 'userSpaceOnUse', primitiveUnits: 'userSpaceOnUse',
      'color-interpolation-filters': 'sRGB',
    });
    const img = (href, result) => svgEl('feImage', { href, x: 0, y: 0, width: W, height: H, preserveAspectRatio: 'none', result });
    f.appendChild(img(maps.disp, 'map'));
    const src = 'SourceGraphic';
    const scale = maps.scale * o.strength;
    if (o.chromatic > 0) {
      const ch = [['R', 1 + o.chromatic, '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0'],
                  ['G', 1, '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0'],
                  ['B', 1 - o.chromatic, '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0']];
      ch.forEach(([c, k, m]) => {
        f.appendChild(svgEl('feDisplacementMap', { in: src, in2: 'map', scale: scale * k, xChannelSelector: 'R', yChannelSelector: 'G', result: 'd' + c }));
        f.appendChild(svgEl('feColorMatrix', { in: 'd' + c, type: 'matrix', values: m, result: 'c' + c }));
      });
      f.appendChild(svgEl('feComposite', { in: 'cR', in2: 'cG', operator: 'arithmetic', k1: 0, k2: 1, k3: 1, k4: 0, result: 'rg' }));
      f.appendChild(svgEl('feComposite', { in: 'rg', in2: 'cB', operator: 'arithmetic', k1: 0, k2: 1, k3: 1, k4: 0, result: 'disp' }));
    } else {
      f.appendChild(svgEl('feDisplacementMap', { in: src, in2: 'map', scale, xChannelSelector: 'R', yChannelSelector: 'G', result: 'disp' }));
    }
    f.appendChild(svgEl('feColorMatrix', { in: 'disp', type: 'saturate', values: o.saturate, result: 'sat' }));
    let last = 'sat';
    if (o.brightness !== 1) {
      const ct = svgEl('feComponentTransfer', { in: 'sat', result: 'bright' });
      ['R', 'G', 'B'].forEach(c => ct.appendChild(svgEl('feFunc' + c, { type: 'linear', slope: o.brightness })));
      f.appendChild(ct);
      last = 'bright';
    }
    if (o.specular > 0) {
      f.appendChild(img(maps.spec, 'spec'));
      f.appendChild(svgEl('feComposite', { in: 'spec', in2: last, operator: 'over' }));
    }
    return f;
  }

  function cornerRadius(el, w, h) {
    const cs = getComputedStyle(el);
    const v = cs.borderTopLeftRadius;
    let r = parseFloat(v) || 0;
    if (v.includes('%')) r = r / 100 * Math.min(w, h);
    return Math.min(r, w / 2, h / 2);
  }

  class Handle {
    constructor(el, opts) {
      this.el = el;
      this.id = 'lg' + (++uid);
      this.opts = Object.assign({}, DEFAULTS, opts);
      this.raf = 0;
      this.gen = 0;
      this.filter = null;
      this.size = '';
      this.ro = new ResizeObserver(() => this.schedule());
      this.ro.observe(el);
      live.add(this);
      this.render();
    }
    schedule() {
      if (this.raf) return;
      this.raf = requestAnimationFrame(() => { this.raf = 0; this.render(); });
    }
    update(opts) {
      Object.assign(this.opts, opts);
      this.size = '';
      this.render();
    }
    render() {
      const o = this.opts, el = this.el;
      if (!supported) {
        const fb = `blur(${o.fallbackBlur}px) saturate(${o.saturate})`;
        el.style.backdropFilter = el.style.webkitBackdropFilter = fb;
        return;
      }
      const w = el.offsetWidth, h = el.offsetHeight;
      if (!w || !h) return;
      let maps;
      if (o.shape) {
        maps = o.shape._maps || (o.shape._maps = alphaMaps(o.shape, o));
      } else {
        const r = o.radius != null ? o.radius : cornerRadius(el, w, h);
        const sig = [w, h, r].join('x');
        if (sig === this.size && this.filter) return;
        maps = rectMaps(w, h, r, o);
        this.size = sig;
      }
      // a fresh id per build makes Chrome re-resolve the url() reference
      const id = this.id + '_' + (++this.gen);
      const f = buildFilter(id, maps, o);
      if (this.filter) this.filter.replaceWith(f); else getDefs().appendChild(f);
      this.filter = f;
      // A CSS function before url() is required: without it Chromium feeds the
      // SVG filter a backdrop whose dark pixels come through as transparent.
      el.style.backdropFilter = `blur(${Math.max(0, o.blur)}px) url(#${id})`;
    }
    destroy() {
      live.delete(this);
      this.ro.disconnect();
      cancelAnimationFrame(this.raf);
      if (this.filter) this.filter.remove();
      this.el.style.backdropFilter = this.el.style.webkitBackdropFilter = '';
    }
  }


  /* =====================================================================
   * Presets — tuned from the side-by-side attempts in the demo site.
   * ===================================================================== */
  const PRESETS = {
    // Apple's default "Regular" glass: light frost, strong rim lensing.
    regular: { bezel: 16, thickness: 18, blur: 3, saturate: 1.7, brightness: 0.95, specular: 0.75 },
    // "Clear" glass for use over media: almost no frost, the lens does the work.
    clear: { bezel: 20, thickness: 24, blur: 0.5, saturate: 1.5, brightness: 0.98, specular: 0.9, chromatic: 0.05 },
    // iOS 26.1 "Tinted": more frost and less sparkle, for legibility.
    tinted: { bezel: 18, thickness: 18, blur: 6, saturate: 1.5, brightness: 0.95, specular: 0.55 },
    // Heavy lens with dispersion and magnification, a showpiece.
    prism: { bezel: 34, thickness: 40, ior: 1.6, blur: 0.5, saturate: 1.4, specular: 0.85, chromatic: 0.16, magnify: 0.08 },
    // A pressed control: clear magnifying lens.
    lens: { bezel: 10, thickness: 16, ior: 1.6, blur: 0, saturate: 1.3, specular: 0.9, magnify: 0.22 },
    // A resting thumb/indicator: barely-there glass.
    thumb: { bezel: 10, thickness: 10, blur: 0, saturate: 1.2, specular: 0.4 },
  };

  function resolve(opts) {
    if (!opts) return Object.assign({}, PRESETS.regular);
    if (typeof opts === 'string') return Object.assign({}, PRESETS[opts] || PRESETS.regular);
    if (opts.preset) return Object.assign({}, PRESETS[opts.preset] || PRESETS.regular, opts);
    return Object.assign({}, opts);
  }

  /* ---------- lighting ---------- */
  let lightAngle = DEFAULTS.lightAngle;
  let relightTimer = 0;

  // light direction (screen space) → CSS gradient angle where the rim starts bright
  function lightToCss(deg) {
    const r = deg * Math.PI / 180;
    return Math.atan2(-Math.cos(r), Math.sin(r)) * 180 / Math.PI;
  }

  function setLight(deg, opts) {
    lightAngle = deg;
    if (hasDOM) document.documentElement.style.setProperty('--lg-light', lightToCss(deg).toFixed(1) + 'deg');
    clearTimeout(relightTimer);
    const run = () => live.forEach(h => { if (!h.opts.fixedLight) h.update({ lightAngle: deg }); });
    if (opts && opts.immediate) run(); else relightTimer = setTimeout(run, 90);
  }

  // Desktop: the pointer stands in for device tilt. Phones: deviceorientation.
  function followPointer(opts) {
    opts = Object.assign({ range: 70 }, opts);
    const base = DEFAULTS.lightAngle;
    const onMove = e => setLight(base + (e.clientX / innerWidth - 0.5) * opts.range + (e.clientY / innerHeight - 0.5) * opts.range * 0.5);
    const onTilt = e => { if (e.gamma != null) setLight(base + e.gamma * 1.1 + (e.beta - 45) * 0.5); };
    addEventListener('pointermove', onMove, { passive: true });
    addEventListener('deviceorientation', onTilt);
    return () => { removeEventListener('pointermove', onMove); removeEventListener('deviceorientation', onTilt); };
  }

  /* ---------- text-shaped glass ---------- */
  function textShape(text, opts) {
    const given = {};
    for (const k in opts || {}) if (opts[k] !== undefined) given[k] = opts[k];
    opts = Object.assign({ font: '700 118px system-ui, sans-serif', padding: 14, letterSpacing: 0, scale: 2 }, given);
    const m = document.createElement('canvas').getContext('2d');
    m.font = opts.font;
    if ('letterSpacing' in m) m.letterSpacing = opts.letterSpacing + 'px';
    const met = m.measureText(text);
    const ascent = Math.ceil(met.actualBoundingBoxAscent || parseFloat(opts.font.match(/(\d+)px/)[1]) * 0.8);
    const descent = Math.ceil(met.actualBoundingBoxDescent || 0);
    const w = Math.ceil(met.width) + opts.padding * 2, h = ascent + descent + opts.padding * 2;
    const draw = k => {
      const c = document.createElement('canvas');
      c.width = w * k; c.height = h * k;
      const x = c.getContext('2d');
      x.scale(k, k);
      x.font = opts.font; x.fillStyle = '#fff';
      if ('letterSpacing' in x) x.letterSpacing = opts.letterSpacing + 'px';
      x.fillText(text, opts.padding, opts.padding + ascent);
      return c;
    };
    return { canvas: draw(1), mask: draw(opts.scale).toDataURL(), width: w, height: h };
  }

  async function attachText(el, text, opts) {
    opts = resolve(opts);
    const font = opts.font || getComputedStyle(el).font;
    if (document.fonts && document.fonts.load) await document.fonts.load(font).catch(() => {});
    const shape = textShape(text, { font, padding: opts.padding, letterSpacing: opts.letterSpacing });
    el.style.width = shape.width + 'px';
    el.style.height = shape.height + 'px';
    el.style.webkitMaskImage = el.style.maskImage = `url(${shape.mask})`;
    el.style.webkitMaskSize = el.style.maskSize = '100% 100%';
    el.setAttribute('aria-label', text);
    return LiquidGlass.attach(el, Object.assign(opts, { shape: shape.canvas }));
  }

  /* =====================================================================
   * Components — progressive enhancement of plain markup.
   * ===================================================================== */
  const READY = 'lgReady';

  function lensOn(el, preset) {
    el.classList.add('is-lens');
    const h = handles.get(el);
    if (h) h.update(Object.assign({}, PRESETS.lens, preset));
  }
  function lensOff(el, preset) {
    el.classList.remove('is-lens');
    const h = handles.get(el);
    if (h) h.update(Object.assign({}, h.base, { lightAngle: h.opts.lightAngle }, preset));
  }
  function glassFor(el, fallback) {
    const name = el.getAttribute('data-liquid-glass');
    return LiquidGlass.attach(el, name ? resolve(name) : resolve(fallback));
  }
  function emit(el, name, detail) { el.dispatchEvent(new CustomEvent(name, { detail, bubbles: true })); }

  /* Button — grows and glows from the touch point. */
  function button(el) {
    glassFor(el, 'regular');
    const pos = e => {
      const r = el.getBoundingClientRect(), k = r.width / el.offsetWidth || 1;
      el.style.setProperty('--lg-px', (e.clientX - r.left) / k + 'px');
      el.style.setProperty('--lg-py', (e.clientY - r.top) / k + 'px');
    };
    el.addEventListener('pointerdown', e => { pos(e); el.classList.add('is-pressed'); });
    el.addEventListener('pointermove', pos);
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => el.addEventListener(t, () => el.classList.remove('is-pressed')));
  }

  /* Switch — <label class="lg-switch"><input type="checkbox"></label> */
  function toggle(label) {
    const input = label.querySelector('input');
    if (!input) return;
    const thumb = document.createElement('span');
    thumb.className = 'lg-thumb';
    label.appendChild(thumb);
    LiquidGlass.attach(thumb, resolve('thumb'));
    const sync = () => label.classList.toggle('is-on', input.checked);
    input.addEventListener('change', sync);
    sync();
    let drag = null;
    label.addEventListener('click', e => { if (e.target !== input) e.preventDefault(); });
    label.addEventListener('pointerdown', e => {
      if (input.disabled) return;
      drag = { x: e.clientX, moved: false };
      label.setPointerCapture(e.pointerId);
      lensOn(thumb);
    });
    label.addEventListener('pointermove', e => {
      if (!drag) return;
      if (Math.abs(e.clientX - drag.x) > 3) drag.moved = true;
      if (!drag.moved) return;
      const r = label.getBoundingClientRect(), k = r.width / label.offsetWidth || 1;
      const max = label.clientWidth - thumb.offsetWidth - 4;
      const x = Math.max(2, Math.min(2 + max, (e.clientX - r.left) / k - thumb.offsetWidth / 2));
      thumb.style.transition = 'transform .35s cubic-bezier(.3,1.6,.4,1), background-color .25s';
      thumb.style.left = x + 'px';
      drag.pos = (x - 2) / max;
    });
    const up = () => {
      if (!drag) return;
      const next = drag.moved ? drag.pos > 0.5 : !input.checked;
      drag = null;
      thumb.style.transition = thumb.style.left = '';
      if (next !== input.checked) {
        input.checked = next;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
      setTimeout(() => lensOff(thumb), 120);
    };
    label.addEventListener('pointerup', up);
    label.addEventListener('pointercancel', up);
  }

  /* Slider — <div class="lg-slider"><input type="range"></div> */
  function slider(wrap) {
    const input = wrap.querySelector('input[type=range]');
    if (!input) return;
    wrap.insertAdjacentHTML('beforeend', '<span class="lg-slider__track"><span class="lg-slider__fill"></span></span><span class="lg-thumb"></span>');
    const thumb = wrap.querySelector('.lg-thumb');
    LiquidGlass.attach(thumb, resolve('thumb'));
    const min = () => +input.min || 0, max = () => (input.max === '' ? 100 : +input.max);
    const sync = () => wrap.style.setProperty('--lg-value', ((+input.value - min()) / (max() - min() || 1)).toFixed(4));
    input.addEventListener('input', sync);
    sync();
    let down = false;
    const set = e => {
      const r = wrap.getBoundingClientRect(), t = thumb.offsetWidth * (r.width / wrap.offsetWidth || 1);
      const f = Math.max(0, Math.min(1, (e.clientX - r.left - t / 2) / (r.width - t)));
      input.value = min() + f * (max() - min());
      input.dispatchEvent(new Event('input', { bubbles: true }));
    };
    wrap.addEventListener('pointerdown', e => {
      if (input.disabled) return;
      down = true;
      wrap.setPointerCapture(e.pointerId);
      wrap.classList.add('is-dragging');
      lensOn(thumb);
      set(e);
      e.preventDefault();
      input.focus({ preventScroll: true });
    });
    wrap.addEventListener('pointermove', e => { if (down) set(e); });
    const up = () => {
      if (!down) return;
      down = false;
      wrap.classList.remove('is-dragging');
      lensOff(thumb);
      input.dispatchEvent(new Event('change', { bubbles: true }));
    };
    wrap.addEventListener('pointerup', up);
    wrap.addEventListener('pointercancel', up);
  }

  /* Selector — shared by segmented controls and tab bars: a droplet indicator
     that becomes a magnifying lens while dragged, then snaps to an item. */
  function selector(host, itemSel, attr) {
    glassFor(host, 'regular');
    const items = () => [...host.querySelectorAll(itemSel)];
    const ind = document.createElement('span');
    ind.className = 'lg-indicator';
    ind.setAttribute('aria-hidden', 'true');
    host.appendChild(ind); // after the items so its backdrop contains them
    LiquidGlass.attach(ind, resolve('thumb'));
    let index = Math.max(0, items().findIndex(b => b.getAttribute(attr) === 'true' || b.getAttribute(attr) === 'page'));
    const place = () => {
      const b = items()[index];
      if (!b) return;
      ind.style.left = b.offsetLeft + 'px';
      ind.style.top = b.offsetTop + 'px';
      ind.style.width = b.offsetWidth + 'px';
      ind.style.height = b.offsetHeight + 'px';
    };
    const select = (i, fire) => {
      index = i;
      items().forEach((b, j) => {
        if (attr === 'aria-current') { if (j === i) b.setAttribute(attr, 'page'); else b.removeAttribute(attr); }
        else b.setAttribute(attr, String(j === i));
      });
      place();
      if (fire) emit(host, 'lg-change', { index: i, item: items()[i] });
    };
    select(index, false);
    new ResizeObserver(place).observe(host);
    host.addEventListener('click', e => {
      const b = e.target.closest(itemSel);
      if (b && !host.classList.contains('is-dragging')) select(items().indexOf(b), true);
    });
    let down = null;
    host.addEventListener('pointerdown', e => {
      down = { x: e.clientX, moved: false, id: e.pointerId };
    });
    host.addEventListener('pointermove', e => {
      if (!down) return;
      if (!down.moved && Math.abs(e.clientX - down.x) > 6) {
        down.moved = true;
        host.setPointerCapture(down.id);
        host.classList.add('is-dragging');
        lensOn(ind);
      }
      if (!down.moved) return;
      const r = host.getBoundingClientRect(), k = r.width / host.offsetWidth || 1, w = ind.offsetWidth;
      ind.style.transition = 'transform .35s cubic-bezier(.3,1.6,.4,1)';
      ind.style.left = Math.max(0, Math.min(host.clientWidth - w, (e.clientX - r.left) / k - w / 2)) + 'px';
    });
    const up = e => {
      if (!down) return;
      const moved = down.moved;
      down = null;
      if (!moved) return;
      const r = host.getBoundingClientRect(), k = r.width / host.offsetWidth || 1, x = (e.clientX - r.left) / k;
      let best = 0, bd = Infinity;
      items().forEach((b, i) => { const d = Math.abs(b.offsetLeft + b.offsetWidth / 2 - x); if (d < bd) { bd = d; best = i; } });
      ind.style.transition = '';
      lensOff(ind);
      select(best, true);
      setTimeout(() => host.classList.remove('is-dragging'), 0);
    };
    host.addEventListener('pointerup', up);
    host.addEventListener('pointercancel', up);
    host.lgSelect = i => select(i, true);
  }

  /* Morphing menu — <div class="lg-menu"><button class="lg-menu__trigger"></button><div class="lg-menu__panel"></div></div> */
  function menu(el) {
    glassFor(el, 'regular');
    const trigger = el.querySelector('.lg-menu__trigger'), panel = el.querySelector('.lg-menu__panel');
    if (!trigger || !panel) return;
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-haspopup', 'true');
    const closed = () => { el.style.width = trigger.offsetWidth + 'px'; el.style.height = trigger.offsetHeight + 'px'; };
    const set = open => {
      el.classList.toggle('is-open', open);
      trigger.setAttribute('aria-expanded', String(open));
      if (open) { el.style.width = panel.scrollWidth + 'px'; el.style.height = panel.scrollHeight + 'px'; }
      else closed();
      emit(el, open ? 'lg-open' : 'lg-close');
    };
    closed();
    trigger.addEventListener('click', () => set(!el.classList.contains('is-open')));
    panel.addEventListener('click', e => { if (e.target.closest('[data-close], button, a, li')) set(false); });
    document.addEventListener('pointerdown', e => { if (!el.contains(e.target) && el.classList.contains('is-open')) set(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && el.classList.contains('is-open')) { set(false); trigger.focus(); } });
  }

  const COMPONENTS = [
    ['.lg-button', button],
    ['.lg-switch', toggle],
    ['.lg-slider', slider],
    ['.lg-segmented', el => selector(el, 'button', 'aria-pressed')],
    ['.lg-tabbar', el => selector(el, '.lg-tabbar__item', 'aria-current')],
    ['.lg-menu', menu],
    ['.lg-toolbar', el => glassFor(el, 'regular')],
  ];

  function initComponents(root) {
    root = root || document;
    COMPONENTS.forEach(([sel, fn]) => root.querySelectorAll(sel).forEach(el => {
      if (el.dataset[READY]) return;
      el.dataset[READY] = '1';
      fn(el);
    }));
  }

  /* data-liquid-glass="clear" data-lg-bezel="24" … */
  function readData(el) {
    const o = resolve(el.getAttribute('data-liquid-glass') || 'regular');
    for (const k in el.dataset) {
      if (!/^lg[A-Z]/.test(k) || k === READY) continue;
      const key = k[2].toLowerCase() + k.slice(3), v = el.dataset[k];
      o[key] = v === 'true' ? true : v === 'false' ? false : isNaN(+v) ? v : +v;
    }
    return o;
  }

  // init(), init(root), init(options) or init(root, options)
  function init(root, opts) {
    if (root && typeof root.querySelectorAll !== 'function') { opts = root; root = null; }
    root = root || document;
    opts = opts || {};
    const isComponent = el => COMPONENTS.some(([sel]) => el.matches(sel)) || el.classList.contains('lg-thumb') || el.classList.contains('lg-indicator');
    root.querySelectorAll('[data-liquid-glass]').forEach(el => { if (!isComponent(el)) LiquidGlass.attach(el, readData(el)); });
    initComponents(root);
    if (opts.light === 'pointer') followPointer();
    if (opts.observe && !init.mo) {
      init.mo = new MutationObserver(muts => muts.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) init(n.parentNode || n); })));
      init.mo.observe(root === document ? document.body : root, { childList: true, subtree: true });
    }
    return LiquidGlass;
  }

  /* ---------- public API ---------- */
  const LiquidGlass = {
    version: '1.0.1',
    supported,
    DEFAULTS,
    PRESETS,
    PROFILES,
    /** Attach refraction to an element. `opts` is a preset name or an options object (may include `preset`). */
    attach(el, opts) {
      LiquidGlass.detach(el);
      const o = resolve(opts);
      if (o.lightAngle == null) o.lightAngle = lightAngle;
      const h = new Handle(el, o);
      h.base = Object.assign({}, o);
      handles.set(el, h);
      return h;
    },
    detach(el) {
      const h = handles.get(el);
      if (h) { h.destroy(); handles.delete(el); }
    },
    get(el) { return handles.get(el); },
    init,
    initComponents,
    setLight,
    followPointer,
    textShape,
    attachText,
    lens: { on: lensOn, off: lensOff },
    rectMaps,
    alphaMaps,
  };

  return LiquidGlass;
})();
export default LiquidGlass;
export const { attach, detach, get, init, initComponents, setLight, followPointer, textShape, attachText, PRESETS, DEFAULTS, supported } = LiquidGlass;
