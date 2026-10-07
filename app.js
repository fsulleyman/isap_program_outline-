(() => {
  const $ = s => document.querySelector(s);
  const car = $('#car'), N = 3, KEY = ['Part 1', 'Part 2', 'Part 3'];
  const BIG = i => `images/p${i + 1}-2200.jpg`, SMALL = i => `images/p${i + 1}-1100.jpg`;
  const dots = [...document.querySelectorAll('#dots i')], thumbs = [...document.querySelectorAll('#thumbs button')];
  let idx = 0;
  const warm = i => { if (i >= 0 && i < N) { const im = new Image(); im.decoding = 'async'; im.src = BIG(i); } };

  function render() {
    $('#cnt').textContent = `Page ${idx + 1} of ${N}`;
    dots.forEach((d, i) => d.classList.toggle('on', i === idx));
    thumbs.forEach((t, i) => t.setAttribute('aria-current', i === idx));
    $('#prev').disabled = idx === 0; $('#next').disabled = idx === N - 1;
    $('#full').href = BIG(idx);
    warm(idx); warm(idx + 1);
  }
  function go(i) { idx = Math.max(0, Math.min(N - 1, i)); car.scrollTo({ left: idx * car.clientWidth }); render(); }
  function sync() { idx = Math.round(car.scrollLeft / car.clientWidth) || 0; render(); }
  car.addEventListener('scroll', sync, { passive: true });
  $('#prev').onclick = () => go(idx - 1); $('#next').onclick = () => go(idx + 1);
  thumbs.forEach(t => t.onclick = () => go(+t.dataset.i));
  car.addEventListener('keydown', e => { if (e.key === 'ArrowRight') { e.preventDefault(); go(idx + 1); } if (e.key === 'ArrowLeft') { e.preventDefault(); go(idx - 1); } });
  window.addEventListener('resize', () => car.scrollTo({ left: idx * car.clientWidth, behavior: 'instant' }));
  document.querySelectorAll('.hit').forEach(b => b.onclick = () => openLb(+b.dataset.i));
  $('#zoom').onclick = () => openLb(idx);
  sync();

  /* ---------- Lightbox: pinch, double-tap, pan, swipe-down, Back ---------- */
  const lb = $('#lb'), stage = $('#stage'), page = $('#page'), img = $('#lbimg');
  let s = 1, x = 0, y = 0, bw = 0, bh = 0, dragY = 0, rotation = 0;
  const P = new Map(); let pinch = null, lastTap = null, down = null;

  const apply = () => { page.style.transform = `translate(${x}px,${y + dragY}px) scale(${s})`; };
  function fit() {
    const W = stage.clientWidth, H = stage.clientHeight, r = (img.naturalWidth || 2200) / (img.naturalHeight || 1701);
    const viewRatio = rotation % 180 ? 1 / r : r;
    bw = Math.min(W, H * viewRatio); bh = bw / viewRatio;
    page.style.width = bw + 'px'; page.style.height = bh + 'px';
    img.style.width = (rotation % 180 ? bh : bw) + 'px';
    img.style.height = (rotation % 180 ? bw : bh) + 'px';
    img.style.transform = `translate(-50%,-50%) rotate(${rotation}deg)`;
    s = 1; x = (W - bw) / 2; y = (H - bh) / 2; dragY = 0; apply();
  }
  function clamp() {
    const W = stage.clientWidth, H = stage.clientHeight, sw = bw * s, sh = bh * s;
    x = sw <= W ? (W - sw) / 2 : Math.min(0, Math.max(W - sw, x));
    y = sh <= H ? (H - sh) / 2 : Math.min(0, Math.max(H - sh, y));
  }
  function zoomAt(cx, cy, ns) {
    ns = Math.max(1, Math.min(6, ns)); const k = ns / s;
    x = cx - (cx - x) * k; y = cy - (cy - y) * k; s = ns; clamp(); apply();
  }
  function openLb(i) {
    idx = i;
    img.alt = document.querySelectorAll('.hit img')[i].alt;
    img.onload = fit; img.src = SMALL(i);
    const big = new Image(); big.onload = () => { if (!lb.hidden) { img.src = big.src; } }; big.src = BIG(i);   // sharp version swaps in
    lb.hidden = false; document.documentElement.style.overflow = 'hidden'; document.body.style.overflow = 'hidden';
    rotation = stage.clientHeight > stage.clientWidth ? 90 : 0;
    $('#lbrot').setAttribute('aria-label', rotation ? 'Show page upright' : 'Rotate page 90 degrees');
    $('#lbtip').classList.remove('off'); setTimeout(() => $('#lbtip').classList.add('off'), 3500);
    history.pushState({ lb: 1 }, ''); fit(); $('#lbx').focus();
  }
  function hide() {
    if (lb.hidden) return; lb.hidden = true;
    document.documentElement.style.overflow = ''; document.body.style.overflow = '';
    go(idx);
  }
  const closeLb = () => (history.state && history.state.lb) ? history.back() : hide();
  window.addEventListener('popstate', hide);
  $('#lbx').onclick = closeLb;
  $('#lbrot').onclick = () => {
    rotation = rotation ? 0 : 90;
    $('#lbrot').setAttribute('aria-label', rotation ? 'Show page upright' : 'Rotate page 90 degrees');
    fit();
  };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !lb.hidden) closeLb(); });
  window.addEventListener('resize', () => { if (!lb.hidden) fit(); });
  window.addEventListener('orientationchange', () => setTimeout(() => {
    if (!lb.hidden) {
      rotation = stage.clientHeight > stage.clientWidth ? 90 : 0;
      $('#lbrot').setAttribute('aria-label', rotation ? 'Show page upright' : 'Rotate page 90 degrees');
      fit();
    }
  }, 250));

  const dist = () => { const [a, b] = [...P.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  const mid = () => { const [a, b] = [...P.values()]; return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; };
  stage.addEventListener('pointerdown', e => {
    if (e.target.closest('.lb-x')) return;
    stage.setPointerCapture(e.pointerId); P.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (P.size === 2) { pinch = { d: dist(), s, m: mid() }; down = null; }
    else if (P.size === 1) down = { x: e.clientX, y: e.clientY, t: Date.now(), moved: false };
  });
  stage.addEventListener('pointermove', e => {
    const p = P.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (P.size === 2 && pinch) {
      const m = mid(); x += m.x - pinch.m.x; y += m.y - pinch.m.y; pinch.m = m;
      zoomAt(m.x, m.y, pinch.s * dist() / pinch.d);
    } else if (P.size === 1) {
      if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) down.moved = true;
      if (s > 1.02) { x += dx; y += dy; clamp(); apply(); }
      else if (down && down.moved) { dragY = Math.max(0, e.clientY - down.y); lb.style.background = `rgba(0,0,0,${1 - Math.min(.7, dragY / 400)})`; apply(); }
    }
  });
  function up(e) {
    if (!P.has(e.pointerId)) return; P.delete(e.pointerId);
    if (P.size < 2) pinch = null;
    if (P.size === 0 && down) {
      const tap = !down.moved && Date.now() - down.t < 300;
      if (dragY > 110 && s <= 1.02) { closeLb(); }
      else if (tap) {
        if (lastTap && Date.now() - lastTap.t < 320 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 40) {
          s > 1.05 ? fit() : zoomAt(e.clientX, e.clientY, 2.6); lastTap = null;
        } else lastTap = { t: Date.now(), x: e.clientX, y: e.clientY };
      }
      dragY = 0; lb.style.background = ''; apply(); down = null;
    }
  }
  stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
  stage.addEventListener('wheel', e => { e.preventDefault(); zoomAt(e.clientX, e.clientY, s * (e.deltaY < 0 ? 1.18 : 1 / 1.18)); }, { passive: false });
})();
