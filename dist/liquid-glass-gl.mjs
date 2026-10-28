/*!
 * Glass Morphism — WebGL2 renderer
 * https://github.com/Sasivisvan/Glass-Morphism
 * MIT License · (c) 2026 Sasivisvan and contributors
 */
/*
 * liquid-glass-gl.js — a WebGL2 Liquid Glass renderer.
 *
 * Unlike the SVG approach this runs in every modern browser, and because the
 * whole scene is one shader it can do things CSS cannot: shapes that melt into
 * each other (smooth-min of their distance fields, like SwiftUI's
 * GlassEffectContainer), per-channel dispersion, a proper drop shadow, and a
 * frosted blur from texture mipmaps.
 *
 * The background has to be a texture, so the page paints its backdrop into a
 * <canvas> and hands it over as `source`.
 */
const LiquidGlassGL = (function () {
  'use strict';

  const VS = `#version 300 es
  in vec2 aPos;
  void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

  const FS = `#version 300 es
  precision highp float;
  uniform sampler2D uTex;
  uniform vec2 uRes;
  uniform float uDpr;
  uniform vec4 uShape[8];
  uniform float uRad[8];
  uniform int uCount;
  uniform float uBezel, uThick, uIor, uFrost, uCA, uSpec, uMerge, uTint, uMag, uShadow, uSat;
  uniform vec2 uLight;
  out vec4 outColor;

  float sdRR(vec2 p, vec2 b, float r) {
    r = min(r, min(b.x, b.y));
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }
  float smin(float a, float b, float k) {
    if (k <= 0.0) return min(a, b);
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
  }
  float scene(vec2 p) {
    float d = 1e5;
    for (int i = 0; i < 8; i++) {
      if (i >= uCount) break;
      d = smin(d, sdRR(p - uShape[i].xy, uShape[i].zw, uRad[i]), uMerge);
    }
    return d;
  }
  // blend of shape centres weighted by proximity — used for magnification
  vec2 centre(vec2 p) {
    vec2 c = vec2(0.0); float w = 0.0;
    for (int i = 0; i < 8; i++) {
      if (i >= uCount) break;
      float d = sdRR(p - uShape[i].xy, uShape[i].zw, uRad[i]);
      float k = exp(-max(d, 0.0) / max(uMerge, 1.0) * 3.0) * step(d, uMerge + 1.0);
      c += uShape[i].xy * k; w += k;
    }
    return w > 0.0 ? c / w : p;
  }
  vec3 bg(vec2 p, float lod) {
    return textureLod(uTex, clamp(p / uRes, vec2(0.001), vec2(0.999)), lod).rgb;
  }
  vec3 frost(vec2 p, float r) {
    if (r < 0.3) return bg(p, 0.0);
    float lod = log2(max(r * uDpr * 0.6, 1.0));
    vec3 s = bg(p, lod) * 0.2;
    for (int i = 0; i < 8; i++) {
      float a = float(i) * 0.785398 + 0.39;
      s += bg(p + vec2(cos(a), sin(a)) * r * 0.75, lod) * 0.1;
    }
    return s;
  }

  void main() {
    vec2 p = vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr;
    float d = scene(p);
    vec3 col = bg(p, 0.0);

    // soft drop shadow, offset downward
    float ds = scene(p - vec2(0.0, 10.0));
    float sh = (1.0 - smoothstep(-14.0, 34.0, ds)) * uShadow;
    col *= 1.0 - sh * smoothstep(-1.0, 1.0, d);

    if (d < 1.0) {
      float depth = max(-d, 0.0);
      float t = clamp(depth / uBezel, 0.0, 1.0);
      vec2 e = vec2(0.75, 0.0);
      vec2 n = vec2(scene(p + e.xy) - scene(p - e.xy), scene(p + e.yx) - scene(p - e.yx));
      n = length(n) > 1e-5 ? normalize(n) : vec2(0.0);

      // squircle height profile and its slope → Snell's law lateral shift
      float u = 1.0 - t;
      float f = pow(1.0 - pow(u, 4.0), 0.25);
      float df = pow(max(1.0 - pow(u, 4.0), 1e-4), -0.75) * pow(u, 3.0);
      float slope = min(df * uThick / uBezel, 40.0);
      float th1 = atan(slope);
      float th2 = asin(sin(th1) / uIor);
      float shift = tan(th1 - th2) * uThick * f;
      vec2 off = -n * shift;

      vec2 q = p + off + (centre(p) - p) * uMag;
      vec3 g;
      g.r = frost(q + off * uCA, uFrost).r;
      g.g = frost(q, uFrost).g;
      g.b = frost(q - off * uCA, uFrost).b;

      float l = dot(g, vec3(0.2126, 0.7152, 0.0722));
      g = mix(vec3(l), g, uSat);
      g = mix(g, vec3(1.0), uTint);

      float facing = dot(n, uLight);
      float lit = max(facing, 0.0) + max(-facing, 0.0) * 0.5;
      float rim = pow(1.0 - t, 5.0);
      float edge = 1.0 - smoothstep(0.0, 1.6, depth);
      g += vec3(pow(1.0 - t, 2.5) * 0.06);                 // fresnel brightening toward the rim
      g += vec3(lit * lit * rim * 0.55 * uSpec);           // broad specular along the lit rim
      g += vec3(edge * (0.18 + 0.7 * lit) * uSpec);        // crisp edge highlight
      g *= 1.0 - max(-facing, 0.0) * pow(1.0 - t, 2.0) * 0.07; // faint inner shade on the far side

      float a = 1.0 - smoothstep(-0.75, 0.75, d);
      col = mix(col, g, a);
    }
    outColor = vec4(col, 1.0);
  }`;

  class GlassGL {
    constructor(canvas, source, params) {
      this.canvas = canvas;
      this.source = source;
      this.params = Object.assign({
        bezel: 22, thickness: 26, ior: 1.5, frost: 2, chromatic: 0.12, specular: 0.8,
        merge: 28, tint: 0.04, magnify: 0.06, shadow: 0.22, saturate: 1.35, lightAngle: -135,
      }, params);
      this.shapes = () => [];
      const gl = canvas.getContext('webgl2', { antialias: false, premultipliedAlpha: false });
      this.gl = gl;
      if (!gl) return;
      const prog = gl.createProgram();
      [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, FS]].forEach(([type, src]) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
        gl.attachShader(prog, s);
      });
      gl.linkProgram(prog);
      gl.useProgram(prog);
      this.prog = prog;
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'aPos');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      this.tex = gl.createTexture();
      this.u = {};
      ['uTex', 'uRes', 'uDpr', 'uShape', 'uRad', 'uCount', 'uBezel', 'uThick', 'uIor', 'uFrost', 'uCA',
        'uSpec', 'uMerge', 'uTint', 'uMag', 'uShadow', 'uSat', 'uLight'].forEach(n => { this.u[n] = gl.getUniformLocation(prog, n); });
      this.uploadSource();
    }

    get ok() { return !!this.gl; }

    uploadSource() {
      const gl = this.gl;
      if (!gl) return;
      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.source);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    render() {
      const gl = this.gl;
      if (!gl) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
      if (this.canvas.width !== Math.round(w * dpr) || this.canvas.height !== Math.round(h * dpr)) {
        this.canvas.width = Math.round(w * dpr);
        this.canvas.height = Math.round(h * dpr);
      }
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      const P = this.params, u = this.u;
      const shapes = this.shapes().slice(0, 8);
      const sv = new Float32Array(32), rv = new Float32Array(8);
      shapes.forEach((s, i) => {
        sv.set([s.x + s.w / 2, s.y + s.h / 2, s.w / 2, s.h / 2], i * 4);
        rv[i] = s.r;
      });
      gl.uniform1i(u.uTex, 0);
      gl.uniform2f(u.uRes, w, h);
      gl.uniform1f(u.uDpr, dpr);
      gl.uniform4fv(u.uShape, sv);
      gl.uniform1fv(u.uRad, rv);
      gl.uniform1i(u.uCount, shapes.length);
      gl.uniform1f(u.uBezel, P.bezel);
      gl.uniform1f(u.uThick, P.thickness);
      gl.uniform1f(u.uIor, P.ior);
      gl.uniform1f(u.uFrost, P.frost);
      gl.uniform1f(u.uCA, P.chromatic);
      gl.uniform1f(u.uSpec, P.specular);
      gl.uniform1f(u.uMerge, P.merge);
      gl.uniform1f(u.uTint, P.tint);
      gl.uniform1f(u.uMag, P.magnify);
      gl.uniform1f(u.uShadow, P.shadow);
      gl.uniform1f(u.uSat, P.saturate);
      const a = P.lightAngle * Math.PI / 180;
      gl.uniform2f(u.uLight, Math.cos(a), Math.sin(a));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    start() {
      if (this.running) return;
      this.running = true;
      const loop = () => {
        if (!this.running) return;
        this.render();
        requestAnimationFrame(loop);
      };
      loop();
    }

    stop() { this.running = false; }
  }

  return GlassGL;
})();
export default LiquidGlassGL;
