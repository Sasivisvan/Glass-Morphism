/*
 * liquid-glass.js — refraction for the web, modelled on Apple's Liquid Glass.
 *
 * How it works
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
(function (global) {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const brands = (navigator.userAgentData && navigator.userAgentData.brands) || [];
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
      this.ro.disconnect();
      cancelAnimationFrame(this.raf);
      if (this.filter) this.filter.remove();
      this.el.style.backdropFilter = this.el.style.webkitBackdropFilter = '';
    }
  }

  const LiquidGlass = {
    supported,
    DEFAULTS,
    PROFILES,
    attach(el, opts) {
      LiquidGlass.detach(el);
      const h = new Handle(el, opts || {});
      handles.set(el, h);
      return h;
    },
    detach(el) {
      const h = handles.get(el);
      if (h) { h.destroy(); handles.delete(el); }
    },
    get(el) { return handles.get(el); },
    rectMaps,
    alphaMaps,
  };

  global.LiquidGlass = LiquidGlass;
})(window);
