/* Berkley Construction — page interactions (vanilla + Lenis) */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- smooth scroll ---------- */
  const lenis = window.Lenis && !REDUCED ? new Lenis({ lerp: 0.1 }) : null;
  window.__lenis = lenis;
  const go = (target) => {
    const el = typeof target === 'string' ? $(target) : target;
    if (!el) return;
    if (!lenis) return el.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' });
    // aim at a number (not the element) and correct once on arrival
    const y = () => el.getBoundingClientRect().top + scrollY;
    lenis.scrollTo(y(), { duration: 1.4, onComplete: () => { if (Math.abs(el.getBoundingClientRect().top) > 2) lenis.scrollTo(y(), { duration: 0.5 }); } });
  };
  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    e.preventDefault();
    if (a.dataset.preset) presetForm(a.dataset.preset);
    go(id === '#top' ? document.body : id);
  }));

  /* progress of a tall section whose child is sticky: 0 at pin start, 1 at pin end */
  const pinP = (el) => {
    const r = el.getBoundingClientRect();
    return clamp(-r.top / Math.max(1, r.height - innerHeight));
  };
  const narrow = () => innerWidth <= 900;

  /* ---------- nav ---------- */
  const nav = $('#nav');
  const hero = $('[data-hero]');
  let lastY = 0;
  const navTick = (y) => {
    const past = y > hero.offsetHeight - 90;
    nav.classList.toggle('solid', past);
    nav.classList.toggle('hide', past && y > lastY + 2 && y > hero.offsetHeight + 300);
    if (y < lastY - 2) nav.classList.remove('hide');
    lastY = y;
  };

  /* ---------- hero copy is clickable only while it is visible ---------- */
  const heroCopy = $('.hero-copy');
  const heroStage = $('[data-hero-stage]');

  /* ---------- process: the cone of certainty ---------- */
  const proc = $('[data-process]');
  const coneClip = $('[data-cone-clip]');
  const coneCursor = $('[data-cone-cursor]');
  const stages = $$('[data-stages] .stage');
  const axis = $$('.cone-axis li');
  const procTick = () => {
    const p = narrow() ? 1 : pinP(proc);
    const x = 60 + 880 * clamp(p / 0.92);
    coneClip.setAttribute('width', x + (p > 0.92 ? 60 : 0));
    coneCursor.setAttribute('x1', x); coneCursor.setAttribute('x2', x);
    const k = Math.min(4, Math.floor(clamp(p / 0.92) * 5 - 1e-6 + (p >= 0.92 ? 1 : 0)));
    const idx = Math.max(0, k);
    stages.forEach((s, i) => { s.classList.toggle('on', i === idx); s.classList.toggle('past', i < idx); });
    axis.forEach((a, i) => a.classList.toggle('on', i <= idx));
    proc.classList.toggle('done', p > 0.9);
  };
  // clicking the axis jumps to that stage
  axis.forEach((a, i) => a.addEventListener('click', () => {
    if (narrow()) return;
    const top = proc.getBoundingClientRect().top + scrollY;
    const span = proc.offsetHeight - innerHeight;
    const y = top + span * ((i + 0.5) / 5) * 0.92;
    lenis ? lenis.scrollTo(y, { duration: 1.2 }) : scrollTo({ top: y, behavior: 'smooth' });
  }));

  /* ---------- scope: Stage 1, right now ---------- */
  const PERMIT_MEP = 'Typically required for electrical, plumbing or structural changes. We handle the permitting for you.';
  const TYPES = {
    kitchen: {
      project: 'Kitchen remodel', form: 'Kitchen remodel',
      range: () => 'Mid to high five figures', time: '6–12 weeks', permits: PERMIT_MEP,
      chips: { label: 'How far are you going?', multi: false, options: ['Refresh the finishes', 'New cabinets and counters', 'Change the layout', 'Full gut, open the walls'] },
      photo: ['assets/dm-kitchen.webp', 'Del Mar kitchen · built by Berkley'],
      note: 'Recent Del Mar kitchen: concrete waterfall countertop, farm sink, custom maple shaker cabinets.',
    },
    bath: {
      project: 'Bathroom remodel', form: 'Bathroom remodel',
      range: () => '$15,000 – $50,000+', time: '3–8 weeks', permits: PERMIT_MEP,
      chips: { label: 'Which bathroom?', multi: false, options: ['Guest bath', 'Primary bath', 'Tub to walk-in shower', 'Powder room'] },
      photo: ['assets/cf-shower.webp', 'Cardiff by the Sea · built by Berkley'],
      note: 'Tub to walk-in shower conversions are something we do regularly.',
    },
    addition: {
      project: 'Room addition', form: 'Room addition',
      size: { label: 'Approximate size', min: 100, max: 800, step: 10, value: 300, unit: 'sq ft' },
      range: (s) => `${money(s.size * 300)} – ${money(s.size * 600)}+`,
      time: '3–6 months, including design and permitting',
      permits: 'Yes. We guide the design and permit process.',
      chips: { label: "What's the new space for?", multi: false, options: ['Bedroom', 'Primary suite', 'Home office', 'Family room'] },
      photo: ['assets/hc-framing.webp', 'New framing · Hillcrest'],
      note: 'Additions typically run <b>$300 to $600+ per square foot</b> in San Diego, depending on design, structure and finishes. We design them to match your home.',
    },
    adu: {
      project: 'ADU', form: 'ADU',
      size: { label: 'Approximate size', min: 300, max: 1200, step: 25, value: 600, unit: 'sq ft' },
      range: () => '$150,000 – $400,000+',
      time: '6–12 months, including design and permitting',
      permits: 'Required before construction. We help you through the permit process.',
      chips: { label: 'Type of ADU', multi: false, options: ['Detached', 'Attached', 'Garage conversion', 'Junior ADU'] },
      photo: ['assets/hc-before-roof.webp', 'Every ADU starts with the lot you have'],
      note: 'Many San Diego homeowners build an ADU for rental income, family or flexible space. Not sure what fits your lot? Ask about a <b>feasibility report</b>.',
    },
    backyard: {
      project: 'Backyard remodel', form: 'Backyard remodel',
      range: () => '$20,000 – $100,000+', time: 'Depends on the features. We map it out on the first call.',
      permits: 'Structures, plumbing or electrical may need permits. We guide you through it.',
      chips: { label: 'What do you want out there?', multi: true, options: ['Patio', 'Deck', 'Outdoor kitchen', 'Fire feature', 'Covered living space'] },
      photo: ['assets/pj-fireplace.webp', 'Covered patio and stone fireplace'],
      note: 'Patios, decks, outdoor kitchens and living areas, built for San Diego\'s year-round outdoor living.',
    },
    sauna: {
      project: 'Sauna or steam room', form: 'Sauna or steam room',
      range: () => 'Custom, priced on a first call', time: 'We\'ll cover it on the first call.',
      permits: 'Depends on location and utilities. We\'ll cover it on the first call.',
      chips: { label: 'Which experience?', multi: false, options: ['Sauna (dry heat)', 'Steam room (wet heat)', 'Both'] },
      chips2: { label: 'Where?', multi: false, options: ['Bathroom', 'Garage', 'Backyard', 'Commercial space'] },
      photo: ['assets/sa-led.webp', 'Commercial cedar sauna · built by Berkley'],
      note: 'No prefab corner units. Western red cedar saunas, and steam rooms with three layers of waterproofing under the tile.',
    },
  };
  const money = (n) => '$' + Math.round(n / 1000).toLocaleString('en-US') + ',000';
  const state = { type: 'kitchen', size: 0, picks: [], picks2: [] };
  const ctl = $('[data-scope-controls]');
  const B = (k) => $(`[data-b="${k}"]`);
  const briefNo = $('[data-brief-no]');
  briefNo.textContent = 'No. ' + String(1000 + Math.floor(Math.random() * 9000));

  const chipGroup = (cfg, key) => {
    const wrap = document.createElement('div');
    wrap.innerHTML = `<div class="ctl-label">${cfg.label}${cfg.multi ? '<b>pick any</b>' : ''}</div><div class="chips"></div>`;
    const box = wrap.querySelector('.chips');
    cfg.options.forEach((o, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = o;
      const on = !cfg.multi && i === 0;
      b.setAttribute('aria-pressed', on);
      if (on) state[key] = [o];
      b.addEventListener('click', () => {
        if (cfg.multi) {
          const now = b.getAttribute('aria-pressed') !== 'true';
          b.setAttribute('aria-pressed', now);
          state[key] = $$('button', box).filter((x) => x.getAttribute('aria-pressed') === 'true').map((x) => x.textContent);
        } else {
          $$('button', box).forEach((x) => x.setAttribute('aria-pressed', x === b));
          state[key] = [o];
        }
        renderBrief(false);
      });
      box.appendChild(b);
    });
    return wrap;
  };

  const renderControls = () => {
    const t = TYPES[state.type];
    ctl.innerHTML = '';
    state.picks = []; state.picks2 = [];
    if (t.size) {
      state.size = t.size.value;
      const w = document.createElement('div');
      w.innerHTML = `<div class="ctl-label">${t.size.label}<b data-size-read>${t.size.value} ${t.size.unit}</b></div>
        <input class="range" type="range" min="${t.size.min}" max="${t.size.max}" step="${t.size.step}" value="${t.size.value}" aria-label="${t.size.label}">`;
      const input = w.querySelector('input');
      input.addEventListener('input', () => {
        state.size = +input.value;
        w.querySelector('[data-size-read]').textContent = `${state.size} ${t.size.unit}`;
        renderBrief(false);
      });
      ctl.appendChild(w);
    }
    if (t.chips) ctl.appendChild(chipGroup(t.chips, 'picks'));
    if (t.chips2) ctl.appendChild(chipGroup(t.chips2, 'picks2'));
    const note = document.createElement('p');
    note.className = 'ctl-note'; note.innerHTML = t.note;
    ctl.appendChild(note);
    const ph = document.createElement('figure');
    ph.className = 'ctl-photo';
    ph.innerHTML = `<img src="${t.photo[0]}" alt="" loading="lazy"><span>${t.photo[1]}</span>`;
    ctl.appendChild(ph);
    renderBrief(true);
  };

  const details = () => {
    const t = TYPES[state.type];
    const bits = [];
    if (state.type === 'adu' && state.picks[0]) bits.push(state.picks[0]);
    if (t.size) bits.push(`about ${state.size} sq ft`);
    if (state.type !== 'adu') bits.push(...state.picks);
    bits.push(...state.picks2);
    return bits.join(' · ') || '—';
  };
  let lastRange = '';
  const renderBrief = (fresh) => {
    const t = TYPES[state.type];
    B('project').textContent = t.project;
    B('details').textContent = details();
    const r = t.range(state);
    const el = B('range');
    el.textContent = r;
    if (r !== lastRange || fresh) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
    lastRange = r;
    B('time').textContent = t.time;
    B('permits').textContent = t.permits;
  };

  $$('[data-scope-tabs] button').forEach((b) => b.addEventListener('click', () => {
    $$('[data-scope-tabs] button').forEach((x) => x.setAttribute('aria-selected', x === b));
    state.type = b.dataset.type;
    renderControls();
  }));
  renderControls();

  const formProject = $('[data-f-project]');
  const formBrief = $('[data-f-brief]');
  const fillForm = (project, text) => {
    [...formProject.options].forEach((o) => { if (o.text === project) formProject.value = o.value; });
    formBrief.value = text;
    formBrief.classList.remove('filled'); void formBrief.offsetWidth; formBrief.classList.add('filled');
  };
  function presetForm(kind) {
    if (kind === 'sauna') fillForm('Sauna or steam room', 'I\'m interested in a custom sauna or steam room.\n\nWhere it would go:\nAnything else:');
  }
  $('[data-brief-send]').addEventListener('click', () => {
    const t = TYPES[state.type];
    const lines = [
      `Project: ${t.project}`,
      details() !== '—' ? `Details: ${details()}` : '',
      `Typical range I saw: ${t.range(state)}`,
      '',
      'What I\'m hoping for:',
      '',
    ].filter((l, i) => l !== '' || i > 2);
    fillForm(t.form, lines.join('\n'));
    go('#start');
    setTimeout(() => $('input[name="name"]').focus({ preventScroll: true }), 1300);
  });

  /* ---------- Hillcrest job file ---------- */
  const jf = $('[data-jobfile]');
  const jfPhotos = $$('[data-jf-photos] figure');
  const gRows = $$('[data-gantt] .gantt-row');
  const gPct = $('[data-gantt-pct]');
  const jfTick = () => {
    const p = pinP(jf);
    const pi = Math.min(jfPhotos.length - 1, Math.floor(p * jfPhotos.length));
    jfPhotos.forEach((f, i) => f.classList.toggle('on', i === pi));
    const n = gRows.length;
    let cur = 0;
    gRows.forEach((r, i) => {
      const f = clamp(p * (n + 0.6) - i * 0.95);
      r.querySelector('b').style.width = (f * 100).toFixed(1) + '%';
      r.classList.toggle('on', f > 0);
      if (f > 0) cur = i;
    });
    gRows.forEach((r, i) => r.classList.toggle('cur', i === cur));
    gPct.textContent = Math.round(clamp(p / 0.96) * 100) + '% complete';
  };

  /* ---------- job file folders ---------- */
  const FILES = {
    speakeasy: {
      kicker: 'North Park · basement', title: 'Basement to speakeasy',
      body: ['A plain basement under a North Park home became a warm speakeasy lounge, with a custom bar and shelving, alder wood wainscoting, intricate tile work and even a secret cellar-door entrance.', 'Guests come in two ways: through old-school cellar doors, like a classic Midwestern storm shelter, or down a staircase from the kitchen. The custom epoxy floor follows a pattern the homeowner designed. A mini-split keeps it comfortable year-round, and the bathroom has its own detailed tile and a full shower.', 'Now it hosts live music and cocktails with friends.'],
      photos: ['se-lounge', 'se-bar', 'se-cellar', 'se-music'],
    },
    kirk: {
      kicker: 'Coronado · historic', title: 'The Kirk House, 1911',
      body: ['Graham Memorial Presbyterian Church asked us to remodel the Kirk House: a 4,500 square foot, three-story Victorian Queen Anne Revival landmark that holds the manse and church offices.', 'The repair ran from the roof down, and earning historic designation meant every element had to replicate the original, much of it 100-year-old native wood. For the railing, we drew and computerized every curve to a tolerance of 1/64 of an inch, specified African mahogany for longevity, and had three companies make samples before hiring two of them.', 'Working under a Professional Service Agreement kept the scope, timeline and pricing clear from the start.'],
      photos: ['kh-house', 'kh-rail'],
    },
    sauna: {
      kicker: 'San Diego · golf resort + spa', title: 'Commercial cedar sauna',
      body: ['For a golf course and spa in San Diego, we designed and installed a custom cedar sauna: warm, durable wood that naturally resists heat and moisture, and a tile floor built for high traffic.', 'Multi-colored LED lighting lets guests set the mood, from spa whites to calming blues and amber.'],
      photos: ['sa-led', 'sa-heater', 'sa-bench'],
    },
    delmar: {
      kicker: 'Del Mar · kitchen', title: 'Kitchen remodel',
      body: ['The old kitchen came out completely to make room for a brighter, more open design for cooking and entertaining.', 'A concrete countertop with a waterfall edge, a farm sink in the island, a microwave drawer and a double trash pull-out. Custom maple shaker cabinets painted in Sherwin-Williams "Cityscape" with a conversion varnish finish, a herringbone porcelain backsplash, and a custom range hood clad in wood siding.'],
      photos: ['dm-kitchen', 'dm-stools'],
    },
    montana: {
      kicker: 'Gallatin River, Montana', title: 'Three kinds of cedar',
      body: ['Vertical shiplap painted black, horizontal natural-stained cedar, and tongue-and-groove cedar soffits, separated by rough-sawn 1x4 cedar painted black.', 'A job this size normally takes at least five weeks. Through heavy snow and wet conditions, often working into the night under lights, the crew finished in three, with enough time left over to install two bedroom windows that had been scheduled for a later trip.'],
      photos: ['mt-done', 'mt-wrap', 'mt-snow', 'mt-night'],
    },
    cardiff: {
      kicker: 'Cardiff by the Sea · guest quarters', title: 'Guest bath + kitchen',
      body: ['A small job with a big impact on the guest quarters: a new bathroom, plus a new kitchen countertop, sink and faucet.', 'Silestone across three slabs, Fusion Cemento floor tile to echo the main house\'s polished concrete, and white 3x6 subway tile in the walk-in shower. Mid-grout, the client switched the shower walls to black grout to match the floor. A great call.'],
      photos: ['cf-bath', 'cf-shower'],
    },
  };
  const dlg = $('[data-filedlg]');
  $$('[data-file]').forEach((b) => b.addEventListener('click', () => {
    const f = FILES[b.dataset.file];
    $('[data-fd-kicker]').textContent = f.kicker;
    $('[data-fd-title]').textContent = f.title;
    $('[data-fd-body]').innerHTML = f.body.map((p) => `<p>${p}</p>`).join('');
    $('[data-fd-photos]').innerHTML = f.photos.map((p) => `<img src="assets/${p}.webp" alt="" loading="lazy">`).join('');
    if (lenis) lenis.stop();
    dlg.showModal();
  }));
  const closeDlg = () => dlg.close();
  $('[data-fd-close]').addEventListener('click', closeDlg);
  dlg.addEventListener('click', (e) => { if (e.target === dlg) closeDlg(); });
  dlg.addEventListener('close', () => lenis && lenis.start());

  /* ---------- wellness: exploded wall ---------- */
  const well = $('[data-wellness]');
  const w3d = $('[data-w3d]');
  const heatNote = $('[data-heat-note]');
  const NOTES = {
    steam: 'Steam rooms use moist heat. Behind the tile: framing, backer board, then three separate layers of waterproofing.',
    sauna: 'Saunas use dry heat, lined in high-quality western red cedar. Built to fit a bathroom, a garage or the backyard.',
  };
  $$('[data-heat-k]').forEach((b) => b.addEventListener('click', () => {
    $$('[data-heat-k]').forEach((x) => x.setAttribute('aria-selected', x === b));
    well.classList.toggle('sauna', b.dataset.heatK === 'sauna');
    heatNote.textContent = NOTES[b.dataset.heatK];
  }));
  const wellTick = () => {
    if (narrow()) return;
    const p = pinP(well);
    const e = clamp((p - 0.08) / 0.55);
    w3d.style.setProperty('--e', (e * e * (3 - 2 * e)).toFixed(3));
    w3d.style.transform = `rotateX(${58 - p * 6}deg) rotateZ(${-38 + p * 12}deg)`;
  };

  /* ---------- proposal opens when seen ---------- */
  const prop = $('[data-proposal]');
  new IntersectionObserver(([e]) => { if (e.isIntersecting) prop.classList.add('open'); }, { threshold: 0.55 }).observe(prop);

  /* ---------- quotes: drag to scroll ---------- */
  const q = $('[data-quotes]');
  let qd = null;
  q.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return; qd = { x: e.clientX, s: q.scrollLeft }; q.style.scrollSnapType = 'none'; });
  addEventListener('pointermove', (e) => { if (qd) q.scrollLeft = qd.s - (e.clientX - qd.x); });
  addEventListener('pointerup', () => { if (qd) { qd = null; q.style.scrollSnapType = ''; } });

  /* ---------- form (front-end only in this preview) ---------- */
  const form = $('[data-form]');
  const msg = $('[data-form-msg]');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const need = ['name', 'phone'].map((n) => form.elements[n]);
    need.forEach((el) => el.classList.toggle('bad', !el.value.trim()));
    const bad = need.find((el) => !el.value.trim());
    if (bad) { msg.textContent = 'Please add your name and a phone number so we can call you.'; bad.focus(); return; }
    const first = form.elements.name.value.trim().split(/\s+/)[0];
    msg.textContent = `Thanks, ${first}. Your brief is ready for the Berkley team.`;
    window.berkLead = Object.fromEntries(new FormData(form));
  });

  /* ---------- footer: measure twice ---------- */
  const foot = $('[data-foot]');
  const dc = $('[data-draft]');
  const dx = dc.getContext('2d');
  const read = $('[data-draft-read]');
  const PX_PER_FT = 24;
  let FW = 1, FH = 1, FD = 1, lines = [], cur = null, hover = null, demoDone = false;
  const fitFoot = () => { FD = Math.min(devicePixelRatio || 1, 2); FW = foot.clientWidth; FH = foot.clientHeight; dc.width = FW * FD; dc.height = FH * FD; dx.setTransform(FD, 0, 0, FD, 0, 0); drawFoot(); };
  const ftin = (px) => {
    const inches = Math.round(px / PX_PER_FT * 12);
    return `${Math.floor(inches / 12)}'-${inches % 12}"`;
  };
  const snap = (v) => Math.round(v / (PX_PER_FT / 4)) * (PX_PER_FT / 4);
  const dimLine = (a, b, alpha, live) => {
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len < 4) return;
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    dx.save();
    dx.globalAlpha = alpha;
    dx.translate(a.x, a.y); dx.rotate(ang);
    dx.strokeStyle = live ? '#f0a020' : '#cfe2ff';
    dx.fillStyle = dx.strokeStyle;
    dx.lineWidth = 1.5;
    dx.beginPath();
    dx.moveTo(0, 0); dx.lineTo(len, 0);
    dx.moveTo(0, -12); dx.lineTo(0, 12);
    dx.moveTo(len, -12); dx.lineTo(len, 12);
    dx.moveTo(-6, 6); dx.lineTo(6, -6);
    dx.moveTo(len - 6, 6); dx.lineTo(len + 6, -6);
    dx.stroke();
    const label = ftin(len);
    dx.font = '500 13px "JetBrains Mono", monospace';
    const tw = dx.measureText(label).width;
    const flip = Math.abs(ang) > Math.PI / 2;
    dx.translate(len / 2, 0);
    if (flip) dx.rotate(Math.PI);
    dx.fillStyle = '#0f2547';
    dx.fillRect(-tw / 2 - 6, -20, tw + 12, 16);
    dx.fillStyle = live ? '#f0a020' : '#ffffff';
    dx.fillText(label, -tw / 2, -7);
    dx.restore();
  };
  const drawFoot = () => {
    dx.clearRect(0, 0, FW, FH);
    lines.forEach((l, i) => dimLine(l.a, l.b, 0.35 + 0.65 * ((i + 1) / lines.length), false));
    if (cur) dimLine(cur.a, cur.b, 1, true);
    if (hover && !cur) {
      dx.strokeStyle = 'rgba(240,160,32,.6)'; dx.lineWidth = 1;
      dx.beginPath(); dx.moveTo(hover.x - 14, hover.y); dx.lineTo(hover.x + 14, hover.y); dx.moveTo(hover.x, hover.y - 14); dx.lineTo(hover.x, hover.y + 14); dx.stroke();
    }
  };
  const pt = (e) => { const r = dc.getBoundingClientRect(); return { x: snap(e.clientX - r.left), y: snap(e.clientY - r.top) }; };
  dc.addEventListener('pointerdown', (e) => {
    if (e.target.closest('a')) return;
    const p = pt(e);
    cur = { a: p, b: p };
    dc.setPointerCapture(e.pointerId);
  });
  dc.addEventListener('pointermove', (e) => {
    const p = pt(e);
    hover = p;
    if (cur) { cur.b = p; read.textContent = ftin(Math.hypot(p.x - cur.a.x, p.y - cur.a.y)); }
    drawFoot();
  });
  const endDraw = () => {
    if (cur && Math.hypot(cur.b.x - cur.a.x, cur.b.y - cur.a.y) > 10) { lines.push(cur); if (lines.length > 9) lines.shift(); }
    cur = null; drawFoot();
  };
  dc.addEventListener('pointerup', endDraw);
  dc.addEventListener('pointercancel', () => { cur = null; drawFoot(); });
  dc.addEventListener('pointerleave', () => { hover = null; if (!cur) drawFoot(); });
  // a first measurement draws itself so visitors know they can
  new IntersectionObserver(([e]) => {
    if (!e.isIntersecting || demoDone) return;
    demoDone = true;
    const big = $('.foot-big span').getBoundingClientRect(), fr = foot.getBoundingClientRect();
    const a = { x: snap(big.left - fr.left), y: snap(big.top - fr.top - 26) };
    const bx = snap(Math.min(big.right, fr.right - 40) - fr.left);
    const t0 = performance.now();
    const step = (now) => {
      const t = clamp((now - t0) / 1400);
      const k = 1 - Math.pow(1 - t, 3);
      cur = { a, b: { x: a.x + (bx - a.x) * k, y: a.y } };
      read.textContent = ftin(cur.b.x - a.x);
      drawFoot();
      if (t < 1) requestAnimationFrame(step); else endDraw();
    };
    REDUCED ? (lines.push({ a, b: { x: bx, y: a.y } }), drawFoot()) : requestAnimationFrame(step);
  }, { threshold: 0.45 }).observe(foot);
  addEventListener('resize', fitFoot);
  fitFoot();
  document.fonts && document.fonts.ready.then(fitFoot);

  /* ---------- one loop for everything scroll-linked ---------- */
  const tick = (time) => {
    if (lenis) lenis.raf(time);
    const y = scrollY;
    navTick(y);
    const hp = pinP(hero);
    heroCopy.style.pointerEvents = hp > 0.08 ? 'none' : '';
    procTick();
    jfTick();
    wellTick();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  heroStage && heroStage.style.setProperty('--p', 0);
})();
