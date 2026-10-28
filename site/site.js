/* Showcase site for glass-morphism — everything glassy here comes from dist/liquid-glass.js. */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const REPO = 'https://github.com/Sasivisvan/Glass-Morphism';

  /* ---------- icons ---------- */
  const I = {
    github: '<path d="M12 2.2a9.9 9.9 0 0 0-3.1 19.3c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.4-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.4 1.1 3 .8.1-.6.3-1.1.6-1.3-2.2-.3-4.5-1.1-4.5-4.9 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.6 0 0 .8-.3 2.7 1a9.4 9.4 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.3.2 2.3.1 2.6.6.7 1 1.6 1 2.7 0 3.8-2.3 4.6-4.5 4.9.4.3.7.9.7 1.8V21c0 .3.2.6.7.5A9.9 9.9 0 0 0 12 2.2z"/>',
    copy: '<rect class="s" x="8.5" y="8.5" width="12" height="12" rx="2.5" style="stroke-width:2"/><path class="s" d="M15.5 5.5v-.8A1.7 1.7 0 0 0 13.8 3H5.2A1.7 1.7 0 0 0 3.5 4.7v8.6c0 .9.8 1.7 1.7 1.7h.8" style="stroke-width:2"/>',
    check: '<path class="s" d="m5 12.5 4.5 4.5L19 7.5" style="stroke-width:2.6"/>',
    lens: '<circle class="s" cx="12" cy="12" r="8.5"/><path class="s" d="M7.5 10a5 5 0 0 1 4-3.4" style="stroke-width:2"/>',
    sun: '<circle cx="12" cy="12" r="4.4"/><path class="s" d="M12 2.2v2.2M12 19.6v2.2M2.2 12h2.2M19.6 12h2.2M5.1 5.1l1.5 1.5M17.4 17.4l1.5 1.5M5.1 18.9l1.5-1.5M17.4 6.6l1.5-1.5"/>',
    grid: '<rect x="3" y="3" width="8" height="8" rx="2.2"/><rect x="13" y="3" width="8" height="8" rx="2.2"/><rect x="3" y="13" width="8" height="8" rx="2.2"/><rect x="13" y="13" width="8" height="8" rx="2.2"/>',
    text: '<path d="M5 4.5h14v3.2h-1.6l-.4-1.5h-3.6v12.3l1.8.4v1.6H8.8v-1.6l1.8-.4V6.2H7l-.4 1.5H5z"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5z"/><path class="s" d="m3 12.5 9 5 9-5M3 16.5l9 5 9-5" style="stroke-width:1.8"/>',
    bolt: '<path d="M13.5 2 4.5 13.5h6.2L9.5 22l9-11.5h-6.2z"/>',
    heart: '<path d="M12 20.6s-8.3-5-8.3-11A4.7 4.7 0 0 1 12 6.8a4.7 4.7 0 0 1 8.3 2.8c0 6-8.3 11-8.3 11z"/>',
    chevronLeft: '<path class="s" d="M15 4.5 7.5 12l7.5 7.5" style="stroke-width:2.6"/>',
    star: '<path d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z"/>',
    search: '<circle class="s" cx="10.5" cy="10.5" r="6.3" style="stroke-width:2.5"/><path class="s" d="m15.3 15.3 5.2 5.2" style="stroke-width:2.8"/>',
    ellipsis: '<circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>',
    plus: '<path class="s" d="M12 4.5v15M4.5 12h15" style="stroke-width:2.5"/>',
    gear: '<path fill-rule="evenodd" d="M10.3 2.5h3.4l.5 2.7 1.7.8 2.3-1.6 2.4 2.4-1.6 2.3.7 1.7 2.8.5v3.4l-2.8.5-.7 1.7 1.6 2.3-2.4 2.4-2.3-1.6-1.7.7-.5 2.8h-3.4l-.5-2.8-1.7-.7-2.3 1.6-2.4-2.4 1.6-2.3-.7-1.7-2.8-.5v-3.4l2.8-.5.7-1.7-1.6-2.3 2.4-2.4 2.3 1.6 1.7-.8zM12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8z"/>',
    house: '<path d="M12 3.2 2.9 10.5c-.7.6-.3 1.8.6 1.8H5V20c0 .6.4 1 1 1h4v-5.5h4V21h4c.6 0 1-.4 1-1v-7.7h1.5c.9 0 1.3-1.2.6-1.8z"/>',
    radio: '<circle cx="12" cy="12" r="2.5"/><path class="s" d="M8.2 8.2a5.4 5.4 0 0 0 0 7.6M15.8 8.2a5.4 5.4 0 0 1 0 7.6M5.3 5.3a9.5 9.5 0 0 0 0 13.4M18.7 5.3a9.5 9.5 0 0 1 0 13.4"/>',
    stack: '<rect x="2.5" y="7" width="14.5" height="14.5" rx="2.8"/><path class="s" d="M7 3.5h10.5a3 3 0 0 1 3 3V17"/>',
  };
  const icon = n => `<svg class="i" viewBox="0 0 24 24" fill="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n] || ''}</svg>`;
  $$('[data-icon]').forEach(el => el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon)));

  $('#demoTabs').innerHTML = [['house', 'Home'], ['grid', 'Browse'], ['radio', 'Radio'], ['stack', 'Library']]
    .map(([ic, l], i) => `<a class="lg-tabbar__item" href="#components"${i === 0 ? ' aria-current="page"' : ''}>${icon(ic)}<span>${l}</span></a>`).join('');
  $$('[data-doc]').forEach(a => { a.href = `${REPO}/blob/main/docs/${a.dataset.doc}`; });

  /* ---------- tiny syntax highlighter ---------- */
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // one pass over the raw text so inserted markup is never re-matched
  const TOKENS = /(\/\/[^\n]*|<!--[\s\S]*?-->)|('[^'\n]*'|"[^"\n]*")|(<\/?)([a-z][a-z0-9]*)|\b(import|from|const|new|npm|install)\b|\b(\d+(?:\.\d+)?)\b|\b(LiquidGlass)\b/g;
  const span = (t, v) => `<span class="tok-${t}">${esc(v)}</span>`;
  function highlight(src) {
    let out = '', last = 0;
    src.replace(TOKENS, (m, c, str, lt, tag, kw, num, api, i) => {
      out += esc(src.slice(last, i));
      last = i + m.length;
      out += c ? span('c', c) : str ? span('s', str) : tag ? esc(lt) + span('t', tag) : kw ? span('k', kw) : num ? span('n', num) : span('a', api);
      return m;
    });
    return out + esc(src.slice(last));
  }
  function setCode(el, src) { el.dataset.raw = src; el.innerHTML = highlight(src); }

  /* ---------- copy buttons ---------- */
  $$('[data-copy]').forEach(btn => btn.addEventListener('click', async () => {
    const el = $(btn.dataset.copy);
    try { await navigator.clipboard.writeText(el.dataset.raw || el.textContent); } catch (e) { return; }
    btn.classList.add('done');
    btn.innerHTML = icon('check');
    setTimeout(() => { btn.classList.remove('done'); btn.innerHTML = icon('copy'); }, 1400);
  }));

  /* ---------- draggable glass ---------- */
  function draggable(el, bounds) {
    let s = null;
    el.addEventListener('pointerdown', e => {
      el.setPointerCapture(e.pointerId);
      s = { x: e.clientX, y: e.clientY, l: el.offsetLeft, t: el.offsetTop };
      el.classList.add('dragging');
    });
    el.addEventListener('pointermove', e => {
      if (!s) return;
      const maxX = bounds.clientWidth - el.offsetWidth, maxY = bounds.clientHeight - el.offsetHeight;
      el.style.left = Math.max(0, Math.min(maxX, s.l + e.clientX - s.x)) + 'px';
      el.style.top = Math.max(0, Math.min(maxY, s.t + e.clientY - s.y)) + 'px';
      el.style.right = 'auto';
    });
    const end = () => { s = null; el.classList.remove('dragging'); };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }
  draggable($('#heroLens'), $('.hero'));
  draggable($('#pgTarget'), $('#pgStage'));

  /* ---------- library ---------- */
  LiquidGlass.init({ light: 'pointer' });

  // hero headline: "Liquid Glass" as a text-shaped lens
  const word = $('#heroWord');
  let wordSize = 0;
  function buildWord() {
    const size = Math.round(Math.max(54, Math.min(150, innerWidth * 0.12)));
    if (size === wordSize) return;
    wordSize = size;
    if (!LiquidGlass.supported) { word.classList.add('fallback'); word.textContent = 'Liquid Glass'; return; }
    LiquidGlass.attachText(word, 'Liquid Glass', {
      preset: 'clear', font: `900 ${size}px Inter, system-ui, sans-serif`, letterSpacing: -size * 0.045,
      bezel: Math.round(size * 0.13), thickness: Math.round(size * 0.24), ior: 1.6, blur: 0.5,
      brightness: 1.22, saturate: 1.6, specular: 1, chromatic: 0.06, padding: 16,
    });
  }
  buildWord();
  let rt = 0;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(buildWord, 200); });

  /* ---------- playground ---------- */
  const target = $('#pgTarget');
  const CONTROLS = [
    ['bezel', 'Bezel', 4, 60, 1], ['thickness', 'Thickness', 0, 80, 1], ['ior', 'IOR', 1, 2.4, 0.05],
    ['blur', 'Frost', 0, 12, 0.5], ['saturate', 'Saturation', 0.5, 2.5, 0.05], ['chromatic', 'Dispersion', 0, 0.4, 0.01],
    ['magnify', 'Magnify', 0, 0.3, 0.01], ['specular', 'Specular', 0, 1, 0.05],
  ];
  let preset = 'regular';
  const state = {};
  const panel = $('#pgControls');
  panel.innerHTML = CONTROLS.map(([k, label, min, max, step]) =>
    `<div class="ctl"><span>${label}</span><div class="lg-slider"><input type="range" data-k="${k}" min="${min}" max="${max}" step="${step}" aria-label="${label}"></div><output data-o="${k}"></output></div>`).join('');
  LiquidGlass.initComponents(panel);

  const fmt = v => String(Math.round(v * 100) / 100);
  function full(p) { return Object.assign({}, LiquidGlass.DEFAULTS, LiquidGlass.PRESETS[p]); }
  function loadPreset(p) {
    preset = p;
    const o = full(p);
    target.className = 'pg-target lg' + (p === 'clear' || p === 'prism' ? ' lg--clear' : p === 'tinted' ? ' lg--tinted' : '');
    CONTROLS.forEach(([k]) => {
      state[k] = o[k];
      const inp = $(`input[data-k="${k}"]`, panel);
      inp.value = o[k];
      inp.dispatchEvent(new Event('input', { bubbles: true }));
    });
    apply();
  }
  function apply() {
    const h = LiquidGlass.get(target);
    const opts = Object.assign({ preset }, state);
    if (h) h.update(state); else LiquidGlass.attach(target, opts);
    CONTROLS.forEach(([k]) => { $(`[data-o="${k}"]`, panel).textContent = fmt(state[k]); });
    const base = full(preset);
    const diff = CONTROLS.filter(([k]) => Math.abs(state[k] - base[k]) > 1e-6).map(([k]) => `${k}: ${fmt(state[k])}`);
    setCode($('#pgCode'), diff.length
      ? `LiquidGlass.attach(el, {\n  preset: '${preset}',\n  ${diff.join(',\n  ')},\n});`
      : `LiquidGlass.attach(el, '${preset}');\n// or: <div data-liquid-glass="${preset}">`);
  }
  panel.addEventListener('input', e => {
    const k = e.target.dataset.k;
    if (!k) return;
    state[k] = +e.target.value;
    apply();
  });
  $('#pgPresets').addEventListener('lg-change', e => {
    LiquidGlass.detach(target);
    loadPreset(e.detail.item.textContent.trim());
  });
  loadPreset('regular');

  /* ---------- get started tabs ---------- */
  const CDN = 'https://cdn.jsdelivr.net/gh/Sasivisvan/Glass-Morphism@v1.0.1/dist';
  const SNIPPETS = {
    CDN: `<link rel="stylesheet" href="${CDN}/liquid-glass.css">
<script src="${CDN}/liquid-glass.js"></script>

<div class="lg" data-liquid-glass="clear">Hello, glass</div>
<button class="lg-button">Glass button</button>

<script>LiquidGlass.init({ light: 'pointer' });</script>`,
    npm: `npm install @sasivisvan/glass-morphism

import LiquidGlass from '@sasivisvan/glass-morphism';
import '@sasivisvan/glass-morphism/css';

LiquidGlass.init();
LiquidGlass.attach(document.querySelector('.card'), 'clear');`,
    'ES module': `<link rel="stylesheet" href="${CDN}/liquid-glass.css">
<script type="module">
  import LiquidGlass from '${CDN}/liquid-glass.mjs';
  LiquidGlass.init();
</script>`,
  };
  const startCode = $('#startCode');
  setCode(startCode, SNIPPETS.CDN);
  $('#startTabs').addEventListener('lg-change', e => setCode(startCode, SNIPPETS[e.detail.item.textContent.trim()]));
  setCode($('#installCmd'), 'npm install @sasivisvan/glass-morphism');
})();
