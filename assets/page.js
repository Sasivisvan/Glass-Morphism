/*
 * page.js — shared scaffolding for every experiment page:
 *   - the top bar with the "Try" switcher (keys 1–9, remembered in the URL hash)
 *   - the notes column describing the active try
 *   - attaching liquid-glass.js to every [data-glass] element per try
 *   - icons, status bar, draggable helper, pointer-driven light angle
 */
(function (global) {
  'use strict';

  /* ---------- icons (SF Symbols-like, 24×24) ---------- */
  const I = {
    house: '<path d="M12 3.2 2.9 10.5c-.7.6-.3 1.8.6 1.8H5V20c0 .6.4 1 1 1h4v-5.5h4V21h4c.6 0 1-.4 1-1v-7.7h1.5c.9 0 1.3-1.2.6-1.8z"/>',
    search: '<circle class="s" cx="10.5" cy="10.5" r="6.3" style="stroke-width:2.5"/><path class="s" d="m15.3 15.3 5.2 5.2" style="stroke-width:2.8"/>',
    play: '<path d="M7 4.6v14.8c0 .8.9 1.3 1.5.9l12-7.4c.7-.4.7-1.4 0-1.8l-12-7.4C7.9 3.3 7 3.8 7 4.6z"/>',
    pause: '<rect x="5.5" y="4" width="4.6" height="16" rx="1.4"/><rect x="13.9" y="4" width="4.6" height="16" rx="1.4"/>',
    forward: '<path d="M1.5 6.3v11.4c0 .7.8 1.1 1.3.7L11.5 13v4.7c0 .7.8 1.1 1.3.7l9.3-5.7c.5-.3.5-1.1 0-1.4l-9.3-5.7c-.5-.4-1.3 0-1.3.7V11L2.8 5.6c-.5-.4-1.3 0-1.3.7z"/>',
    backward: '<g transform="matrix(-1 0 0 1 24 0)"><path d="M1.5 6.3v11.4c0 .7.8 1.1 1.3.7L11.5 13v4.7c0 .7.8 1.1 1.3.7l9.3-5.7c.5-.3.5-1.1 0-1.4l-9.3-5.7c-.5-.4-1.3 0-1.3.7V11L2.8 5.6c-.5-.4-1.3 0-1.3.7z"/></g>',
    wifi: '<circle cx="12" cy="18.4" r="2"/><path class="s" d="M8.1 14.8a5.5 5.5 0 0 1 7.8 0M5 11.7a9.9 9.9 0 0 1 14 0M2 8.6a14.1 14.1 0 0 1 20 0" style="stroke-width:2.4"/>',
    cellular: '<rect x="2.5" y="15" width="3.8" height="5.5" rx="1.1"/><rect x="7.7" y="11.3" width="3.8" height="9.2" rx="1.1"/><rect x="12.9" y="7.6" width="3.8" height="12.9" rx="1.1"/><rect x="18.1" y="3.8" width="3.8" height="16.7" rx="1.1"/>',
    antenna: '<circle cx="12" cy="10" r="2.2"/><path class="s" d="M12 12v9M8.3 6.3a5.2 5.2 0 0 0 0 7.4M15.7 6.3a5.2 5.2 0 0 1 0 7.4M5.4 3.4a9.4 9.4 0 0 0 0 13.2M18.6 3.4a9.4 9.4 0 0 1 0 13.2"/>',
    airplane: '<path d="M21.3 15.6v-1.9l-7.8-4.9V3.9c0-.8-.7-1.4-1.5-1.4s-1.5.6-1.5 1.4v4.9l-7.8 4.9v1.9l7.8-2.4v5.1l-2.1 1.5v1.4l3.6-1 3.6 1v-1.4l-2.1-1.5v-5.1z"/>',
    bluetooth: '<path class="s" d="m6.8 7.6 10.4 8.9L12 21V3l5.2 4.5-10.4 8.9" style="stroke-width:2.3"/>',
    flashlight: '<path d="M7.5 2h9v3.3L14.4 9v12c0 .6-.4 1-1 1h-2.8c-.6 0-1-.4-1-1V9L7.5 5.3zM12 12.2a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4z"/>',
    camera: '<path fill-rule="evenodd" d="M9.1 4.2 7.7 6.3H4.9A2.4 2.4 0 0 0 2.5 8.7v9.4a2.4 2.4 0 0 0 2.4 2.4h14.2a2.4 2.4 0 0 0 2.4-2.4V8.7a2.4 2.4 0 0 0-2.4-2.4h-2.8l-1.4-2.1zM12 9a4.3 4.3 0 1 1 0 8.6A4.3 4.3 0 0 1 12 9z"/>',
    moon: '<path d="M20.6 14.7A8.7 8.7 0 0 1 9.3 3.4a8.7 8.7 0 1 0 11.3 11.3z"/>',
    sun: '<circle cx="12" cy="12" r="4.4"/><path class="s" d="M12 2.2v2.2M12 19.6v2.2M2.2 12h2.2M19.6 12h2.2M5.1 5.1l1.5 1.5M17.4 17.4l1.5 1.5M5.1 18.9l1.5-1.5M17.4 6.6l1.5-1.5"/>',
    speaker: '<path d="M3 9.3v5.4h3.7L11.5 19V5L6.7 9.3z"/><path class="s" d="M14.6 9a4.3 4.3 0 0 1 0 6M17.3 6.4a8 8 0 0 1 0 11.2"/>',
    lock: '<rect x="5" y="10.3" width="14" height="11" rx="2.4"/><path class="s" d="M8 10.3V7.4a4 4 0 0 1 8 0v2.9"/>',
    unlock: '<rect x="5" y="10.3" width="14" height="11" rx="2.4"/><path class="s" d="M8 10.3V7.4a4 4 0 0 1 7.7-1.5"/>',
    timer: '<circle class="s" cx="12" cy="13.2" r="7.8"/><path class="s" d="M12 13.2V8.8M9.6 2.4h4.8"/>',
    calculator: '<rect class="s" x="5" y="2.6" width="14" height="18.8" rx="3" style="stroke-width:2"/><rect x="8" y="5.6" width="8" height="3.2" rx="1"/><circle cx="9" cy="12.6" r="1.25"/><circle cx="12" cy="12.6" r="1.25"/><circle cx="15" cy="12.6" r="1.25"/><circle cx="9" cy="16.6" r="1.25"/><circle cx="12" cy="16.6" r="1.25"/><circle cx="15" cy="16.6" r="1.25"/>',
    rotation: '<path class="s" d="M19.6 12a7.6 7.6 0 1 1-4-6.7"/><path class="s" d="m14 2.2 2.4 3-3 2.3"/><rect x="9" y="11.2" width="6" height="4.8" rx="1"/><path class="s" d="M10.3 11.2V9.9a1.7 1.7 0 0 1 3.4 0v1.3" style="stroke-width:1.5"/>',
    mirror: '<rect class="s" x="2.4" y="4" width="13.6" height="9.8" rx="2.2" style="stroke-width:2"/><rect x="8" y="9.4" width="13.6" height="9.8" rx="2.2"/>',
    bell: '<path d="M12 2.6a6 6 0 0 0-6 6v4.1l-1.9 3.4c-.3.6.1 1.3.8 1.3h14.2c.7 0 1.1-.7.8-1.3L18 12.7V8.6a6 6 0 0 0-6-6zM9.5 18.6a2.5 2.5 0 0 0 5 0z"/>',
    note: '<path class="s" d="M9 18.4V6.2l11-2.6v12"/><circle cx="6.4" cy="18.4" r="2.8"/><circle cx="17.4" cy="15.8" r="2.8"/>',
    stack: '<rect x="2.5" y="7" width="14.5" height="14.5" rx="2.8"/><path class="s" d="M7 3.5h10.5a3 3 0 0 1 3 3V17"/>',
    radio: '<circle cx="12" cy="12" r="2.5"/><path class="s" d="M8.2 8.2a5.4 5.4 0 0 0 0 7.6M15.8 8.2a5.4 5.4 0 0 1 0 7.6M5.3 5.3a9.5 9.5 0 0 0 0 13.4M18.7 5.3a9.5 9.5 0 0 1 0 13.4"/>',
    grid: '<rect x="3" y="3" width="8" height="8" rx="2.2"/><rect x="13" y="3" width="8" height="8" rx="2.2"/><rect x="3" y="13" width="8" height="8" rx="2.2"/><rect x="13" y="13" width="8" height="8" rx="2.2"/>',
    plus: '<path class="s" d="M12 4.5v15M4.5 12h15" style="stroke-width:2.5"/>',
    minus: '<path class="s" d="M4.5 12h15" style="stroke-width:2.5"/>',
    power: '<path class="s" d="M12 2.8v8.4"/><path class="s" d="M6.8 5.8a8 8 0 1 0 10.4 0"/>',
    person: '<circle cx="12" cy="8.2" r="4.3"/><path d="M3.8 20.4c.6-4 4-6.4 8.2-6.4s7.6 2.4 8.2 6.4c.1.6-.4 1.1-1 1.1H4.8c-.6 0-1.1-.5-1-1.1z"/>',
    ellipsis: '<circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>',
    chevronLeft: '<path class="s" d="M15 4.5 7.5 12l7.5 7.5" style="stroke-width:2.6"/>',
    chevronRight: '<path class="s" d="m9 4.5 7.5 7.5L9 19.5" style="stroke-width:2.6"/>',
    chevronDown: '<path class="s" d="m4.5 9 7.5 7.5L19.5 9" style="stroke-width:2.6"/>',
    heart: '<path d="M12 20.6s-8.3-5-8.3-11A4.7 4.7 0 0 1 12 6.8a4.7 4.7 0 0 1 8.3 2.8c0 6-8.3 11-8.3 11z"/>',
    message: '<path d="M12 3.2c-5.3 0-9.5 3.6-9.5 8.2 0 2.5 1.3 4.8 3.4 6.3-.2 1.3-.8 2.5-1.8 3.4 1.9 0 3.6-.7 4.8-1.6 1 .3 2 .4 3.1.4 5.3 0 9.5-3.7 9.5-8.3S17.3 3.2 12 3.2z"/>',
    calendar: '<rect class="s" x="3" y="4.6" width="18" height="16.4" rx="3" style="stroke-width:2"/><path d="M3 8.2h18V7.6a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3z"/><path class="s" d="M8 2.6v3.6M16 2.6v3.6"/>',
    cloud: '<path d="M7.2 19.5a4.7 4.7 0 0 1-.6-9.4 6 6 0 0 1 11.6 1.5 4 4 0 0 1-.4 7.9z"/>',
    star: '<path d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z"/>',
    gear: '<path fill-rule="evenodd" d="M10.3 2.5h3.4l.5 2.7 1.7.8 2.3-1.6 2.4 2.4-1.6 2.3.7 1.7 2.8.5v3.4l-2.8.5-.7 1.7 1.6 2.3-2.4 2.4-2.3-1.6-1.7.7-.5 2.8h-3.4l-.5-2.8-1.7-.7-2.3 1.6-2.4-2.4 1.6-2.3-.7-1.7-2.8-.5v-3.4l2.8-.5.7-1.7-1.6-2.3 2.4-2.4 2.3 1.6 1.7-.8zM12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8z"/>',
    photo: '<rect class="s" x="2.8" y="4.5" width="18.4" height="15" rx="3" style="stroke-width:2"/><circle cx="8.5" cy="9.5" r="1.8"/><path d="m4 18 5.2-5.3 3.3 3.2 3.7-4.1L20 16v1.5c0 .5-.4 1-1 1H5z"/>',
    map: '<path d="M3 6.5 8.5 4l7 2.5L21 4v13.5L15.5 20l-7-2.5L3 20z" opacity=".35"/><path class="s" d="M8.5 4v13.5M15.5 6.5V20"/><path class="s" d="M3 6.5 8.5 4l7 2.5L21 4v13.5L15.5 20l-7-2.5L3 20z" style="stroke-width:1.8"/>',
    mail: '<rect x="2.5" y="5" width="19" height="14" rx="2.6"/><path d="m3.5 6.5 8.5 6.8 8.5-6.8" fill="none" stroke="#000" stroke-opacity=".25" stroke-width="1.6"/>',
    phone: '<path d="M6.6 2.8 9 5.3c.6.6.7 1.6.1 2.3L7.8 9.2a13 13 0 0 0 7 7l1.6-1.3c.7-.6 1.7-.5 2.3.1l2.5 2.4c.6.7.6 1.7 0 2.3l-1.4 1.5c-.9.9-2.2 1.2-3.4.8A20 20 0 0 1 2 7.6c-.4-1.2-.1-2.5.8-3.4l1.5-1.4c.6-.6 1.6-.6 2.3 0z"/>',
    book: '<path d="M3 5.2C5.5 4 8.6 4 11.2 5.5V20c-2.6-1.4-5.7-1.4-8.2-.2zM12.8 5.5C15.4 4 18.5 4 21 5.2v14.6c-2.5-1.2-5.6-1.2-8.2.2z"/>',
    folder: '<path d="M2.8 7a2.4 2.4 0 0 1 2.4-2.4h4.2l2 2.1h7.4A2.4 2.4 0 0 1 21.2 9v8.6a2.4 2.4 0 0 1-2.4 2.4H5.2a2.4 2.4 0 0 1-2.4-2.4z"/>',
    clock: '<circle class="s" cx="12" cy="12" r="8.6"/><path class="s" d="M12 6.8V12l3.4 2.2"/>',
    wallet: '<rect x="2.5" y="5.5" width="19" height="14" rx="3"/><rect x="4" y="3.4" width="16" height="4" rx="1.5" opacity=".55"/>',
    heartPulse: '<path d="M12 20.6s-8.3-5-8.3-11A4.7 4.7 0 0 1 12 6.8a4.7 4.7 0 0 1 8.3 2.8c0 6-8.3 11-8.3 11z"/>',
    check: '<path class="s" d="m5 12.5 4.5 4.5L19 7.5" style="stroke-width:2.6"/>',
    shuffle: '<path class="s" d="M3 7h3.5c4 0 6.5 10 11 10H21M3 17h3.5c1.6 0 2.9-1.6 4-3.5M13.5 10.5c1.1-1.9 2.4-3.5 4-3.5H21M18.5 4.5 21 7l-2.5 2.5M18.5 14.5 21 17l-2.5 2.5"/>',
    repeat: '<path class="s" d="M4 11.5V10a3.5 3.5 0 0 1 3.5-3.5H20M17 3.5l3 3-3 3M20 12.5V14a3.5 3.5 0 0 1-3.5 3.5H4M7 20.5l-3-3 3-3"/>',
    airplay: '<path class="s" d="M6 17H5a2.5 2.5 0 0 1-2.5-2.5v-8A2.5 2.5 0 0 1 5 4h14a2.5 2.5 0 0 1 2.5 2.5v8A2.5 2.5 0 0 1 19 17h-1" style="stroke-width:2"/><path d="m12 13.5 5.5 7h-11z"/>',
    text: '<path d="M5 4.5h14v3.2h-1.6l-.4-1.5h-3.6v12.3l1.8.4v1.6H8.8v-1.6l1.8-.4V6.2H7l-.4 1.5H5z"/>',
  };
  function icon(name, cls) {
    return `<svg class="i ${cls || ''}" viewBox="0 0 24 24" fill="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[name] || ''}</svg>`;
  }

  function statusBar(time) {
    return `<div class="statusbar"><span>${time || '9:41'}</span><span class="right">${icon('cellular')}${icon('wifi')}<span class="battery"></span></span></div>`;
  }

  /* ---------- draggable ---------- */
  function draggable(el, opts) {
    opts = opts || {};
    const bounds = opts.bounds || el.parentElement;
    let sx = 0, sy = 0, ox = 0, oy = 0, id = null;
    el.style.touchAction = 'none';
    el.addEventListener('pointerdown', e => {
      if (opts.handle && !e.target.closest(opts.handle)) return;
      if (e.target.closest('input,button:not([data-drag])')) return;
      id = e.pointerId;
      el.setPointerCapture(id);
      sx = e.clientX; sy = e.clientY; ox = el.offsetLeft; oy = el.offsetTop;
      el.classList.add('dragging');
      opts.onStart && opts.onStart(e);
    });
    el.addEventListener('pointermove', e => {
      if (e.pointerId !== id) return;
      const maxX = bounds.clientWidth - el.offsetWidth, maxY = bounds.clientHeight - el.offsetHeight;
      el.style.left = Math.max(0, Math.min(maxX, ox + e.clientX - sx)) + 'px';
      el.style.top = Math.max(0, Math.min(maxY, oy + e.clientY - sy)) + 'px';
      opts.onMove && opts.onMove(e);
    });
    const end = e => {
      if (e.pointerId !== id) return;
      id = null;
      el.classList.remove('dragging');
      opts.onEnd && opts.onEnd(e);
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  /* ---------- pointer / device-motion light ----------
     Liquid Glass highlights move with the device; on desktop the pointer
     stands in for the tilt. Updates --la on <html>. */
  function motionLight(onAngle) {
    let raf = 0, angle = 135;
    const set = a => {
      angle = a;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        document.documentElement.style.setProperty('--la', angle.toFixed(1) + 'deg');
        onAngle && onAngle(angle);
      });
    };
    addEventListener('pointermove', e => {
      const dx = e.clientX / innerWidth - .5, dy = e.clientY / innerHeight - .5;
      set(135 + dx * 70 - dy * 40);
    });
    addEventListener('deviceorientation', e => {
      if (e.gamma == null) return;
      set(135 + e.gamma * 1.2 - (e.beta - 45) * .6);
    });
  }

  /* ---------- page / tries ---------- */
  const Page = {
    icon, statusBar, draggable, motionLight, current: null, tries: [],

    init(cfg) {
      this.cfg = cfg;
      this.tries = cfg.tries;
      const bar = document.createElement('header');
      bar.className = 'topbar';
      bar.innerHTML = `<a class="back" href="index.html">${icon('chevronLeft')} All experiments</a>
        <div class="ttl">${cfg.title}</div>
        <div class="tries" role="group" aria-label="Attempts">${cfg.tries.map((t, i) =>
          `<button type="button" data-i="${i}" title="${t.title}">${t.label || 'Try ' + (i + 1)}</button>`).join('')}</div>`;
      document.body.prepend(bar);
      bar.querySelectorAll('.tries button').forEach(b => b.addEventListener('click', () => this.set(+b.dataset.i)));

      const notes = document.querySelector('.notes');
      if (notes) {
        notes.insertAdjacentHTML('afterbegin',
          `<div class="card" id="try-card"><div class="eyebrow" id="try-eyebrow"></div><h2 id="try-title"></h2><div id="try-desc"></div>
           <p class="kbd" style="margin:10px 0 0">Press <b>1</b>–<b>${cfg.tries.length}</b> to switch attempts.</p></div>`);
        if (!global.LiquidGlass || !LiquidGlass.supported) {
          notes.insertAdjacentHTML('afterbegin', `<div class="banner">SVG refraction only runs in Chromium browsers (Chrome, Edge, Brave, Arc, Opera). In this browser the refraction attempts fall back to a plain blur — the WebGL attempt still works everywhere.</div>`);
        }
      }
      addEventListener('keydown', e => {
        if (e.target.closest('input,textarea')) return;
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= this.tries.length) this.set(n - 1);
      });
      const m = location.hash.match(/try=(\d+)/);
      this.set(m ? Math.min(this.tries.length - 1, Math.max(0, m[1] - 1)) : (cfg.start || 0));
    },

    set(i) {
      const prev = this.tries[this.current], next = this.tries[i];
      if (prev && prev.exit) prev.exit();
      if (prev && prev.cls) document.body.classList.remove(...prev.cls.split(' '));
      this.current = i;
      if (next.cls) document.body.classList.add(...next.cls.split(' '));
      document.querySelectorAll('.tries button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.i === i)));
      const card = document.getElementById('try-card');
      if (card) {
        document.getElementById('try-eyebrow').textContent = `Attempt ${i + 1} of ${this.tries.length}`;
        document.getElementById('try-title').textContent = next.title;
        document.getElementById('try-desc').innerHTML = next.desc;
      }
      history.replaceState(null, '', '#try=' + (i + 1));
      this.applyGlass();
      if (next.enter) next.enter();
      if (this.cfg.onChange) this.cfg.onChange(i, next);
    },

    /* Attach refraction to every [data-glass] element using the active try's options. */
    applyGlass(root) {
      const t = this.tries[this.current];
      (root || document).querySelectorAll('[data-glass]').forEach(el => {
        const role = el.dataset.glass;
        const opts = t && t.glass && (t.glass[role] !== undefined ? t.glass[role] : t.glass.default);
        if (opts && global.LiquidGlass) LiquidGlass.attach(el, typeof opts === 'function' ? opts(el) : opts);
        else if (global.LiquidGlass) LiquidGlass.detach(el);
      });
    },
  };

  global.Page = Page;
})(window);
