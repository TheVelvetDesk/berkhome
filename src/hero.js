/* Berkley Construction — "Drawn, framed, closed in, home."
   A three.js bungalow (36' x 24' = 864 sq ft, the size of the Hillcrest
   whole-home remodel) that starts life as a blueprint on the ground and is
   built piece by piece as the visitor scrolls: plan lines, wire elevations,
   stem walls, subfloor, studs at 16" on center, plates and headers, rafters at
   24", OSB sheathing, lap siding installed bottom-up, roofing, trim, and
   finally warm light in the windows at dusk. */
import * as THREE from 'https://unpkg.com/three@0.169.0/build/three.module.min.js';

const host = document.querySelector('[data-hero-stage]');
const canvas = host && host.querySelector('canvas');
if (host && canvas) {
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SMALL = Math.min(innerWidth, innerHeight) < 700;

  /* ---------- helpers ---------- */
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ramp = (p, a, b) => clamp((p - a) / (b - a));
  const ease = (t) => t * t * (3 - 2 * t);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  /* ---------- renderer / scene ---------- */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, SMALL ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.5, 600);

  const hemi = new THREE.HemisphereLight(0xcfe0ff, 0x6b5a48, 1.1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1dd, 2.4);
  sun.position.set(40, 46, 28);
  sun.castShadow = true;
  sun.shadow.mapSize.set(SMALL ? 1024 : 2048, SMALL ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 160 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;
  scene.add(sun);

  /* ---------- the house, in feet ---------- */
  const FY = 1.5;                 // finished floor height (stem walls)
  const H = 9;                    // plate height above floor
  const TOP = FY + H;
  const PITCH = 6 / 12;
  const HALF = 12;                // half span (24' deep)
  const OH = 1.6;                 // eave overhang
  const RIDGE = TOP + HALF * PITCH;
  const WIN = [3, 7.2];           // window sill / head above floor
  const DOOR = [0, 7];

  const EXT = [
    { a: [-18, 12], b: [18, 12], open: [[3, 8, ...WIN], [15, 18, ...DOOR, 'door'], [22, 27, ...WIN], [29, 33, ...WIN]] },
    { a: [18, 12], b: [18, -12], open: [[4, 9, ...WIN], [15, 19, ...WIN]] },
    { a: [18, -12], b: [-18, -12], open: [[4, 8, ...WIN], [14, 16.5, 5, 7.2], [24, 30, ...WIN]] },
    { a: [-18, -12], b: [-18, 12], open: [[5, 11, 2.4, 7.2], [15, 19, ...WIN]] },
  ];
  const PARTS = [
    [[4, -12], [4, -4]], [[4, 6], [4, 12]],
    [[8, -12], [8, -4]], [[8, -1], [8, 1]], [[8, 4], [8, 12]],
    [[4, -4], [5, -4]], [[7, -4], [8, -4]],
    [[4, 6], [5, 6]], [[7, 6], [8, 6]],
    [[8, 0], [18, 0]],
  ];
  EXT.forEach((w) => {
    const dx = w.b[0] - w.a[0], dz = w.b[1] - w.a[1];
    w.len = Math.hypot(dx, dz);
    w.dir = V(dx / w.len, 0, dz / w.len);
    const mid = V((w.a[0] + w.b[0]) / 2, 0, (w.a[1] + w.b[1]) / 2);
    w.n = V(-w.dir.z, 0, w.dir.x);
    if (w.n.dot(mid) < 0) w.n.negate();
    w.at = (u, y = 0, off = 0) => V(w.a[0] + w.dir.x * u + w.n.x * off, y, w.a[1] + w.dir.z * u + w.n.z * off);
    w.rot = Math.atan2(-w.dir.z, w.dir.x);
  });

  /* ---------- blueprint plan (lines on the ground) ---------- */
  const planPts = [];
  const seg = (p, q) => planPts.push(p.x, p.y, p.z, q.x, q.y, q.z);
  const GY = 0.04;
  EXT.forEach((w) => {
    const cuts = [0, ...w.open.flatMap((o) => [o[0], o[1]]), w.len];
    for (let i = 0; i < cuts.length; i += 2) {
      for (const off of [-0.25, 0.25]) seg(w.at(cuts[i], GY, off), w.at(cuts[i + 1], GY, off));
    }
    w.open.forEach((o) => {
      seg(w.at(o[0], GY, -0.25), w.at(o[0], GY, 0.25));
      seg(w.at(o[1], GY, -0.25), w.at(o[1], GY, 0.25));
      if (o[4] === 'door') {
        const hinge = w.at(o[0], GY, -0.25);
        const r = o[1] - o[0];
        const inward = w.n.clone().negate();
        seg(hinge, hinge.clone().addScaledVector(inward, r));
        let prev = hinge.clone().addScaledVector(w.dir, r);
        for (let k = 1; k <= 12; k++) {
          const t = (k / 12) * Math.PI / 2;
          const p = hinge.clone().addScaledVector(w.dir, Math.cos(t) * r).addScaledVector(inward, Math.sin(t) * r);
          seg(prev, p); prev = p;
        }
      } else {
        seg(w.at(o[0], GY, 0), w.at(o[1], GY, 0));
      }
    });
  });
  PARTS.forEach(([a, b]) => {
    const p = V(a[0], GY, a[1]), q = V(b[0], GY, b[1]);
    const d = q.clone().sub(p).normalize();
    const n = V(-d.z, 0, d.x).multiplyScalar(0.18);
    seg(p.clone().add(n), q.clone().add(n));
    seg(p.clone().sub(n), q.clone().sub(n));
  });
  // kitchen island + counters
  const rect = (x0, z0, x1, z1) => { seg(V(x0, GY, z0), V(x1, GY, z0)); seg(V(x1, GY, z0), V(x1, GY, z1)); seg(V(x1, GY, z1), V(x0, GY, z1)); seg(V(x0, GY, z1), V(x0, GY, z0)); };
  rect(-11, -6.5, -5, -4.2);
  rect(-17.6, -11.6, -4, -9.6);
  // dimension strings
  const dim = (p, q, n) => {
    const a = p.clone().addScaledVector(n, 3), b = q.clone().addScaledVector(n, 3);
    seg(a, b);
    for (const e of [p, q]) {
      const s = e.clone().addScaledVector(n, 1.2), t = e.clone().addScaledVector(n, 3.8);
      seg(s, t);
      const c = e.clone().addScaledVector(n, 3);
      seg(c.clone().add(V(-0.5, 0, -0.5)), c.clone().add(V(0.5, 0, 0.5)));
    }
  };
  dim(V(-18, GY, 12), V(18, GY, 12), V(0, 0, 1));
  dim(V(18, GY, 12), V(18, GY, -12), V(1, 0, 0));
  const planGeo = new THREE.BufferGeometry();
  planGeo.setAttribute('position', new THREE.Float32BufferAttribute(planPts, 3));
  const planMat = new THREE.LineBasicMaterial({ color: 0xd6e7ff, transparent: true, opacity: 0.95, depthWrite: false });
  const plan = new THREE.LineSegments(planGeo, planMat);
  plan.renderOrder = 2;
  scene.add(plan);
  const PLAN_VERTS = planPts.length / 3;

  /* ---------- wire elevations (lines that rise) ---------- */
  const wirePts = [];
  const wseg = (p, q) => wirePts.push(p.x, p.y, p.z, q.x, q.y, q.z);
  EXT.forEach((w) => {
    wseg(w.at(0, 0), w.at(w.len, 0));
    wseg(w.at(0, H), w.at(w.len, H));
    wseg(w.at(0, 0), w.at(0, H));
    w.open.forEach((o) => {
      const [u0, u1, v0, v1] = o;
      wseg(w.at(u0, v0), w.at(u1, v0)); wseg(w.at(u0, v1), w.at(u1, v1));
      wseg(w.at(u0, v0), w.at(u0, v1)); wseg(w.at(u1, v0), w.at(u1, v1));
    });
  });
  for (const x of [-18, 18]) {
    wseg(V(x, H, 12), V(x, H + HALF * PITCH, 0));
    wseg(V(x, H, -12), V(x, H + HALF * PITCH, 0));
  }
  wseg(V(-18, H + HALF * PITCH, 0), V(18, H + HALF * PITCH, 0));
  const wireGeo = new THREE.BufferGeometry();
  wireGeo.setAttribute('position', new THREE.Float32BufferAttribute(wirePts, 3));
  const wireMat = new THREE.LineBasicMaterial({ color: 0xe8f1ff, transparent: true, opacity: 0, depthWrite: false });
  const wire = new THREE.LineSegments(wireGeo, wireMat);
  wire.position.y = FY;
  scene.add(wire);

  /* ---------- instanced pieces ---------- */
  const Y = V(0, 1, 0);
  const box = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const groups = new Map();
  const group = (name, material, opts = {}) => {
    const g = { name, material, items: [], ...opts };
    groups.set(name, g);
    return g;
  };
  // A piece grows from `start` along `dir` to length `len`; cross-section w x d.
  const UP = V(0, 1, 0);
  const piece = (g, start, dir, len, w, d, twist = 0, mode = 'grow') => {
    dir = dir.clone().normalize();
    let q;
    if (Math.abs(dir.y) > 0.999) {
      q = new THREE.Quaternion().setFromAxisAngle(Y, twist);
    } else {
      // horizontal or sloped member: local X is "up-ish", so w is the member's depth
      const X = Math.abs(dir.y) < 1e-3 ? UP.clone() : UP.clone().cross(dir).normalize();
      const Z = X.clone().cross(dir).normalize();
      q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, dir, Z));
      if (Math.abs(dir.y) < 1e-3) start = start.clone().add(V(0, w / 2, 0));
    }
    g.items.push({ start, q, len, w, d, mode, t0: 0, dur: 0.05 });
  };
  const time = (g, a, b, dur, order) => {
    const n = g.items.length;
    const idx = g.items.map((it, i) => [order ? order(it, i) : i, i]).sort((x, y) => x[0] - y[0]);
    idx.forEach(([, i], k) => {
      const it = g.items[i];
      it.dur = dur;
      it.t0 = a + (b - a - dur) * (n > 1 ? k / (n - 1) : 0);
    });
  };

  // canvas grain for lumber / OSB
  const grain = (base, streaks, kind) => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const x = c.getContext('2d');
    x.fillStyle = base; x.fillRect(0, 0, 256, 256);
    let s = 7;
    const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    if (kind === 'osb') {
      for (let i = 0; i < 900; i++) {
        x.fillStyle = streaks[(r() * streaks.length) | 0];
        x.save(); x.translate(r() * 256, r() * 256); x.rotate(r() * Math.PI);
        x.fillRect(-10 - r() * 14, -2 - r() * 3, 20 + r() * 28, 4 + r() * 6); x.restore();
      }
    } else {
      for (let i = 0; i < 70; i++) {
        x.strokeStyle = streaks[(r() * streaks.length) | 0];
        x.lineWidth = 0.6 + r() * 2;
        x.beginPath();
        const y0 = r() * 256;
        x.moveTo(0, y0);
        x.bezierCurveTo(80, y0 + (r() - 0.5) * 12, 170, y0 + (r() - 0.5) * 12, 256, y0 + (r() - 0.5) * 8);
        x.stroke();
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  };
  const lumberMat = new THREE.MeshStandardMaterial({ map: grain('#d9b07a', ['#c99a62', '#e6c493', '#b9874f'], 'wood'), roughness: 0.85 });
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0xb9b5ad, roughness: 0.95 });
  const osbMat = new THREE.MeshStandardMaterial({ map: grain('#c9a46b', ['#b88d52', '#dcb97f', '#a77c46', '#e5c891'], 'osb'), roughness: 0.9 });

  // shader patches: lap siding and shingle courses in world space
  const worldPatch = (mat, fragment) => {
    mat.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vW;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vec4 wpos = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            wpos = instanceMatrix * wpos;
          #endif
          vW = (modelMatrix * wpos).xyz;`);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vW;')
        .replace('#include <color_fragment>', '#include <color_fragment>\n' + fragment);
    };
  };
  const clipSiding = new THREE.Plane(V(0, -1, 0), -1);
  const clipRoof = new THREE.Plane(V(0, -1, 0), -1);
  const sidingMat = new THREE.MeshStandardMaterial({ color: 0xf1ece2, roughness: 0.7, clippingPlanes: [clipSiding], clipShadows: true });
  worldPatch(sidingMat, `
    float lap = fract((vW.y - ${FY.toFixed(2)}) / 0.583);
    diffuseColor.rgb *= 1.0 - 0.32 * smoothstep(0.86, 1.0, lap) + 0.04 * smoothstep(0.0, 0.2, lap);`);
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x5b5e66, roughness: 0.92, clippingPlanes: [clipRoof], clipShadows: true });
  worldPatch(roofMat, `
    float row = floor(vW.y / 0.21);
    float course = fract(vW.y / 0.21);
    float tab = fract(vW.x / 1.0 + row * 0.5);
    float n = fract(sin(row * 12.9898 + floor(vW.x + row * 0.5) * 78.233) * 43758.5453);
    diffuseColor.rgb *= (0.86 + 0.22 * n) * (1.0 - 0.4 * smoothstep(0.82, 1.0, course)) * (1.0 - 0.3 * step(0.97, tab));`);
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xfaf8f3, roughness: 0.55 });
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x1d3a6e, roughness: 0.45 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x1b2433, roughness: 0.15, metalness: 0.1, emissive: 0xffb35c, emissiveIntensity: 0 });

  const gFound = group('found', concreteMat, { shadow: true });
  const gFloor = group('floor', osbMat, { shadow: true });
  const gStud = group('stud', lumberMat, { shadow: true });
  const gPlate = group('plate', lumberMat, { shadow: true });
  const gHeader = group('header', lumberMat, { shadow: true });
  const gRafter = group('rafter', lumberMat, { shadow: true });
  const gOsb = group('osb', osbMat, { shadow: true });
  const gRoofOsb = group('roofosb', osbMat, { shadow: true });
  const gSiding = group('siding', sidingMat, { shadow: true });
  const gRoof = group('roof', roofMat, { shadow: true });
  const gTrim = group('trim', trimMat, { shadow: true });
  const gDoor = group('door', doorMat, {});
  const gGlass = group('glass', glassMat, {});

  const S2 = 0.125, D2 = 0.29;   // 2x4 actual: 1.5" x 3.5"
  const OC = 16 / 12;

  // stem walls
  EXT.forEach((w) => piece(gFound, w.at(-0.3, 0), w.dir, w.len + 0.6, FY, 0.6, 0, 'grow-along'));
  // subfloor sheets 4' x 8'
  for (let x = -18; x < 18; x += 8) for (let z = -12; z < 12; z += 4) {
    piece(gFloor, V(x + 4, FY - 0.06, z + 2), Y, 0.06, Math.min(8, 18 - x) - 0.05, 3.95, 0, 'drop');
  }
  // studs, plates, headers on exterior walls
  EXT.forEach((w, wi) => {
    const inOpen = (u) => w.open.find((o) => u > o[0] - 0.2 && u < o[1] + 0.2);
    for (let u = 0.07; u <= w.len - 0.06; u += OC) {
      const o = inOpen(u);
      if (!o) piece(gStud, w.at(u, FY + S2), Y, H - 3 * S2, S2, D2, w.rot);
      else {
        // cripples below the sill and above the header
        if (o[2] > 0.5) piece(gStud, w.at(u, FY + S2), Y, o[2] - S2 * 2, S2, D2, w.rot);
        const hdTop = o[3] + 1;
        if (H - 3 * S2 - hdTop > 0.4) piece(gStud, w.at(u, FY + hdTop), Y, H - 2 * S2 - hdTop, S2, D2, w.rot);
      }
    }
    w.open.forEach((o) => {
      for (const u of [o[0] - 0.1, o[1] + 0.1]) piece(gStud, w.at(u, FY + S2), Y, H - 3 * S2, S2, D2, w.rot);
      piece(gHeader, w.at(o[0] - 0.2, FY + o[3]), w.dir, o[1] - o[0] + 0.4, 1, D2 + 0.02, 0, 'grow-along');
      if (o[2] > 0.5) piece(gHeader, w.at(o[0], FY + o[2] - S2), w.dir, o[1] - o[0], S2, D2, 0, 'grow-along');
    });
    piece(gPlate, w.at(0, FY), w.dir, w.len, S2, D2, 0, 'grow-along');
    piece(gPlate, w.at(0, TOP - 2 * S2), w.dir, w.len, S2, D2, 0, 'grow-along');
    piece(gPlate, w.at(0, TOP - S2), w.dir, w.len, S2, D2, 0, 'grow-along');
  });
  // interior partitions: studs only (they disappear behind the siding later)
  PARTS.forEach(([a, b]) => {
    const p = V(a[0], 0, a[1]), q = V(b[0], 0, b[1]);
    const len = p.distanceTo(q), d = q.clone().sub(p).normalize();
    const rot = Math.atan2(-d.z, d.x);
    for (let u = 0.07; u <= len; u += OC) piece(gStud, p.clone().addScaledVector(d, u).setY(FY + S2), Y, H - 3 * S2, S2, D2, rot);
    piece(gPlate, p.clone().setY(FY), d, len, S2, D2, 0, 'grow-along');
    piece(gPlate, p.clone().setY(TOP - 2 * S2), d, len, S2, D2, 0, 'grow-along');
  });
  // gable-end studs
  for (const x of [-18, 18]) for (let z = -12 + OC; z < 12; z += OC) {
    const h = (HALF - Math.abs(z)) * PITCH;
    if (h > 0.4) piece(gStud, V(x, TOP, z), Y, h - 0.15, S2, D2, Math.PI / 2);
  }
  // rafters at 24" o.c., ridge board
  const rafterLen = Math.hypot(HALF + OH, (HALF + OH) * PITCH);
  for (let x = -18 - 0.6; x <= 18.6; x += 2) {
    for (const side of [1, -1]) {
      const start = V(x, TOP - OH * PITCH, side * (HALF + OH));
      const dir = V(0, (HALF + OH) * PITCH, -side * (HALF + OH)).normalize();
      piece(gRafter, start, dir, rafterLen - 0.1, S2, 0.46, 0);
    }
  }
  piece(gPlate, V(-19.2, RIDGE - 0.75, 0), V(1, 0, 0), 38.4, 0.7, 0.125, 0, 'grow-along');

  // wall sheathing / siding cells around the openings
  const cells = (w, step) => {
    const us = new Set([0, w.len]); const vs = new Set([0, H]);
    for (let u = step; u < w.len; u += step) us.add(+u.toFixed(3));
    for (let v = 4; v < H; v += 4) vs.add(v);
    w.open.forEach((o) => { us.add(o[0]); us.add(o[1]); vs.add(o[2]); vs.add(o[3]); });
    const U = [...us].sort((a, b) => a - b), Vv = [...vs].sort((a, b) => a - b);
    const out = [];
    for (let i = 0; i < U.length - 1; i++) for (let j = 0; j < Vv.length - 1; j++) {
      const cu = (U[i] + U[i + 1]) / 2, cv = (Vv[j] + Vv[j + 1]) / 2;
      if (w.open.some((o) => cu > o[0] && cu < o[1] && cv > o[2] && cv < o[3])) continue;
      out.push([U[i], U[i + 1], Vv[j], Vv[j + 1]]);
    }
    return out;
  };
  EXT.forEach((w) => {
    cells(w, 4).forEach(([u0, u1, v0, v1]) => {
      const c = w.at((u0 + u1) / 2, FY + v0, 0.2);
      piece(gOsb, c, Y, v1 - v0 - 0.03, u1 - u0 - 0.03, 0.06, w.rot, 'drop');
    });
    // siding is one continuous skin per cell column, but cut at the openings
    cells(w, 1e9).forEach(([u0, u1, v0, v1]) => {
      const c = w.at((u0 + u1) / 2, FY + v0 - (v0 === 0 ? 0.25 : 0), 0.27);
      piece(gSiding, c, Y, v1 - v0 + (v0 === 0 ? 0.25 : 0), u1 - u0 + (u0 === 0 || u1 === w.len ? 0.1 : 0), 0.06, w.rot, 'static');
    });
    // trim: casings around every opening, corner boards
    w.open.forEach(([u0, u1, v0, v1, kind]) => {
      const tw = 0.33;
      piece(gTrim, w.at(u0 - tw / 2, FY + v0 - (kind ? 0 : tw), 0.33), Y, v1 - v0 + (kind ? tw : tw * 2), tw, 0.1, w.rot, 'pop');
      piece(gTrim, w.at(u1 + tw / 2, FY + v0 - (kind ? 0 : tw), 0.33), Y, v1 - v0 + (kind ? tw : tw * 2), tw, 0.1, w.rot, 'pop');
      piece(gTrim, w.at((u0 + u1) / 2, FY + v1, 0.32), Y, tw * 1.3, u1 - u0 + tw * 2.2, 0.12, w.rot, 'pop');
      if (!kind) piece(gTrim, w.at((u0 + u1) / 2, FY + v0 - tw, 0.36), Y, tw * 0.8, u1 - u0 + tw * 2.4, 0.18, w.rot, 'pop');
      const g = kind ? gDoor : gGlass;
      piece(g, w.at((u0 + u1) / 2, FY + v0, kind ? 0.1 : 0.02), Y, v1 - v0, u1 - u0, 0.05, w.rot, 'pop');
    });
  });
  for (const [x, z] of [[-18, 12], [18, 12], [18, -12], [-18, -12]]) piece(gTrim, V(x + Math.sign(x) * 0.22, FY - 0.25, z + Math.sign(z) * 0.22), Y, H + 0.25, 0.5, 0.5, 0, 'pop');
  // window mullions
  EXT.forEach((w) => w.open.forEach(([u0, u1, v0, v1, kind]) => {
    if (kind) return;
    piece(gTrim, w.at((u0 + u1) / 2, FY + v0, 0.08), Y, v1 - v0, 0.12, 0.08, w.rot, 'pop');
    piece(gTrim, w.at((u0 + u1) / 2, FY + (v0 + v1) / 2 + 0.6, 0.08), Y, 0.12, u1 - u0, 0.08, w.rot, 'pop');
  }));
  // front stoop, steps and a walkway out to the street
  const gSite = group('site', concreteMat, { shadow: true });
  piece(gSite, V(-1.5, 0, 14.2), Y, FY, 6, 4.4, 0, 'pop');
  piece(gSite, V(-1.5, 0, 16.9), Y, FY * 0.66, 5, 1.1, 0, 'pop');
  piece(gSite, V(-1.5, 0, 18), Y, FY * 0.33, 5, 1.1, 0, 'pop');
  piece(gSite, V(-1.5, 0, 27), Y, 0.08, 4, 17, 0, 'pop');
  const gShrub = group('shrub', new THREE.MeshStandardMaterial({ color: 0x557a45, roughness: 1, flatShading: true }), { shadow: true, geo: new THREE.IcosahedronGeometry(1, 1).translate(0, 0.7, 0) });
  [[-14, 14.2, 1.5], [-10.5, 14, 1.2], [5, 14.2, 1.4], [9, 14.4, 1.1], [14.5, 14, 1.6], [20.2, 8, 1.3], [20.4, -3, 1.5]].forEach(([x, z, r]) => piece(gShrub, V(x, 0, z), Y, r * 0.9, r * 1.1, r * 1.0, x, 'pop'));
  // fascia + rake boards
  for (const side of [1, -1]) piece(gTrim, V(-19.3, TOP - OH * PITCH - 0.5, side * (HALF + OH + 0.05)), V(1, 0, 0), 38.6, 0.6, 0.12, 0, 'pop-along');
  for (const x of [-19.3, 19.3]) for (const side of [1, -1]) {
    const start = V(x, TOP - OH * PITCH - 0.1, side * (HALF + OH));
    piece(gTrim, start, V(0, (HALF + OH) * PITCH, -side * (HALF + OH)).normalize(), rafterLen + 0.05, 0.12, 0.6, 0, 'pop-along');
  }
  // roof decking + shingles: slabs lying on the rafters
  const slope = Math.atan(PITCH);
  for (const side of [1, -1]) {
    for (let x = -19.2; x < 19.2; x += 8) {
      for (let k = 0; k < 4; k++) {
        const s0 = (k / 4) * rafterLen, s1 = ((k + 1) / 4) * rafterLen;
        const mid = (s0 + s1) / 2;
        const zc = side * (HALF + OH - Math.cos(slope) * mid);
        const yc = TOP - OH * PITCH + Math.sin(slope) * mid + 0.36;
        const w = Math.min(8, 19.2 - x);
        const normal = V(0, Math.cos(slope), side * Math.sin(slope));
        const it = { center: V(x + w / 2, yc, zc), normal, w: w - 0.04, l: s1 - s0 - 0.04 };
        const q = new THREE.Quaternion().setFromUnitVectors(Y, normal);
        gRoofOsb.items.push({ start: it.center, q, len: 0.06, w: it.w, d: it.l, mode: 'drop', t0: 0, dur: 0.05 });
      }
    }
    const zc = side * (HALF + OH - Math.cos(slope) * rafterLen / 2);
    const yc = TOP - OH * PITCH + Math.sin(slope) * rafterLen / 2 + 0.42;
    const q = new THREE.Quaternion().setFromUnitVectors(Y, V(0, Math.cos(slope), side * Math.sin(slope)));
    gRoof.items.push({ start: V(0, yc, zc), q, len: 0.08, w: 38.6, d: rafterLen + 0.1, mode: 'static', t0: 0, dur: 0.1 });
  }
  // gable triangles (OSB, then siding) as plain meshes
  const triGeo = (x, off) => {
    const g = new THREE.BufferGeometry();
    const h = HALF * PITCH;
    g.setAttribute('position', new THREE.Float32BufferAttribute([x + off, TOP, -12, x + off, TOP, 12, x + off, TOP + h, 0], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 3, 0, 1.5, 1], 2));
    g.computeVertexNormals();
    return g;
  };
  const gables = [];
  for (const x of [-18, 18]) {
    const s = Math.sign(x);
    const o = new THREE.Mesh(triGeo(x, s * 0.2), osbMat.clone()); o.material.side = THREE.DoubleSide; o.material.transparent = true; o.material.opacity = 0;
    const sd = new THREE.Mesh(triGeo(x, s * 0.3), sidingMat); sd.material.side = THREE.DoubleSide;
    o.castShadow = sd.castShadow = true;
    scene.add(o, sd);
    gables.push(o);
  }

  // timings (fractions of the hero scroll)
  const byWall = (it) => Math.atan2(it.start.z, it.start.x);
  time(gFound, 0.2, 0.29, 0.04);
  time(gFloor, 0.26, 0.34, 0.025, (it) => it.start.x + it.start.z * 0.1);
  time(gStud, 0.31, 0.5, 0.03, byWall);
  time(gPlate, 0.33, 0.52, 0.05, byWall);
  time(gHeader, 0.4, 0.5, 0.03, byWall);
  time(gRafter, 0.49, 0.61, 0.025, (it) => it.start.x + (it.start.z > 0 ? 0 : 0.2));
  time(gOsb, 0.58, 0.72, 0.03, byWall);
  time(gRoofOsb, 0.64, 0.74, 0.03, (it) => it.start.x + it.start.y * 3);
  time(gTrim, 0.84, 0.9, 0.02, byWall);
  time(gDoor, 0.86, 0.88, 0.02);
  time(gGlass, 0.7, 0.76, 0.02, byWall);
  time(gSite, 0.86, 0.91, 0.02);
  time(gShrub, 0.88, 0.95, 0.02, (it) => it.start.x);

  const meshes = [];
  const m4 = new THREE.Matrix4(), sc = V(1, 1, 1), pos = V(0, 0, 0);
  groups.forEach((g) => {
    const geo = g.name === 'glass' ? new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0) : box;
    const mesh = new THREE.InstancedMesh(g.geo || geo, g.material, g.items.length);
    mesh.castShadow = !!g.shadow;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    g.mesh = mesh;
    scene.add(mesh);
    meshes.push(mesh);
  });
  const writeGroup = (g, p) => {
    g.items.forEach((it, i) => {
      let t = it.mode === 'static' ? 1 : easeOut(ramp(p, it.t0, it.t0 + it.dur));
      pos.copy(it.start);
      if (it.mode === 'drop') {
        pos.y += (1 - t) * 4;
        sc.set(it.w * (t > 0 ? 1 : 0), it.len * (t > 0 ? 1 : 0), it.d * (t > 0 ? 1 : 0));
      } else if (it.mode === 'pop') {
        sc.set(it.w * t, it.len * t, it.d * t);
      } else if (it.mode === 'pop-along') {
        sc.set(it.w * t, it.len, it.d * t);
        if (t === 0) sc.set(0, 0, 0);
      } else if (it.mode === 'static') {
        sc.set(it.w, it.len, it.d);
      } else {
        sc.set(it.w, Math.max(1e-4, it.len * t), it.d);
        if (t === 0) sc.set(0, 0, 0);
      }
      m4.compose(pos, it.q, sc);
      g.mesh.setMatrixAt(i, m4);
    });
    g.mesh.instanceMatrix.needsUpdate = true;
  };

  const porch = new THREE.PointLight(0xffb26b, 0, 26, 1.6);
  porch.position.set(-1.5, FY + 7.8, 13.2);
  scene.add(porch);
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.6, 0.35), new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xffc27a, emissiveIntensity: 0 }));
  lamp.position.set(-3.6, FY + 6.6, 12.5);
  scene.add(lamp);

  /* ---------- ground: blueprint grid that becomes a lot ---------- */
  const groundMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uLine: { value: new THREE.Color(0x9cc3ff) },
      uBase: { value: new THREE.Color(0x3b352f) },
      uLineA: { value: 0.5 },
      uBaseA: { value: 0 },
    },
    vertexShader: 'varying vec3 vP; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `
      uniform vec3 uLine; uniform vec3 uBase; uniform float uLineA; uniform float uBaseA;
      varying vec3 vP;
      float grid(vec2 p, float s, float w){ vec2 g = abs(fract(p / s - 0.5) - 0.5) / (fwidth(p / s) * w); return 1.0 - min(min(g.x, g.y), 1.0); }
      void main(){
        float minor = grid(vP.xz, 2.0, 1.0) * 0.35;
        float major = grid(vP.xz, 8.0, 1.4);
        float r = length(vP.xz);
        float fade = 1.0 - smoothstep(30.0, 95.0, r);
        float lot = 1.0 - smoothstep(28.0, 92.0, r);
        float a = max(uLineA * max(minor, major) * fade, uBaseA * lot);
        vec3 c = mix(uBase, uLine, uLineA * max(minor, major) / max(a, 1e-3) * fade);
        gl_FragColor = vec4(c, a);
      }`,
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.renderOrder = 1;
  scene.add(ground);
  const shadowCatcher = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.ShadowMaterial({ opacity: 0.3 }));
  shadowCatcher.rotation.x = -Math.PI / 2;
  shadowCatcher.position.y = 0.02;
  shadowCatcher.receiveShadow = true;
  scene.add(shadowCatcher);

  /* ---------- labels pinned to 3D points ---------- */
  const labels = [...host.querySelectorAll('[data-at]')].map((el) => {
    const [x, y, z] = el.dataset.at.split(',').map(Number);
    return { el, p: V(x, y, z), show: (el.dataset.show || '0,0.3').split(',').map(Number) };
  });
  const caps = [...document.querySelectorAll('[data-cap]')].map((el) => ({ el, r: el.dataset.cap.split(',').map(Number) }));

  /* ---------- camera path ---------- */
  const KEYS = [
    [0.0, V(0, 96, 12), V(0, 0, 0.5)],
    [0.16, V(4, 84, 26), V(0, 0, 0)],
    [0.32, V(34, 42, 58), V(0, 4, 0)],
    [0.6, V(54, 24, 42), V(0, 6, 0)],
    [0.84, V(50, 13, 50), V(0, 7, 0)],
    [1.0, V(36, 8.5, 60), V(0, 7.6, 0)],
  ];
  const camPos = new THREE.CatmullRomCurve3(KEYS.map((k) => k[1]), false, 'centripetal');
  const camTgt = new THREE.CatmullRomCurve3(KEYS.map((k) => k[2]), false, 'centripetal');
  const keyT = (p) => {
    for (let i = 0; i < KEYS.length - 1; i++) {
      if (p <= KEYS[i + 1][0]) return (i + ease((p - KEYS[i][0]) / (KEYS[i + 1][0] - KEYS[i][0]))) / (KEYS.length - 1);
    }
    return 1;
  };
  let W = 1, Hh = 1, aspect = 1, distK = 1;
  const resize = () => {
    W = host.clientWidth; Hh = host.clientHeight;
    aspect = W / Math.max(1, Hh);
    renderer.setSize(W, Hh, false);
    camera.aspect = aspect;
    // keep the whole house in frame on tall screens; nudge it right of the copy on wide ones
    distK = aspect < 1.25 ? Math.min(2.6, 1.25 / aspect) : 1;
    if (aspect > 1.25) camera.setViewOffset(W, Hh, -W * 0.14, 0, W, Hh);
    else camera.setViewOffset(W, Hh, 0, -Hh * 0.24, W, Hh);
    camera.updateProjectionMatrix();
    dirty = true;
  };

  /* ---------- state ---------- */
  const section = host.closest('[data-hero]');
  let target = 0, shown = -1, intro = REDUCED ? 1 : 0, dirty = true, visible = true;
  let mx = 0, my = 0, smx = 0, smy = 0;
  const t0 = performance.now();
  const scrollP = () => {
    const r = section.getBoundingClientRect();
    return clamp(-r.top / Math.max(1, r.height - innerHeight));
  };
  addEventListener('pointermove', (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; }, { passive: true });
  addEventListener('resize', resize);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(host);

  const dusk = new THREE.Color(), tmp = new THREE.Color();
  const apply = (p) => {
    // plan + wire
    const draw = ease(ramp(p, 0, 0.14));
    planGeo.setDrawRange(0, Math.floor(PLAN_VERTS * draw / 2) * 2);
    planMat.opacity = 0.95 * (1 - ease(ramp(p, 0.3, 0.52)));
    const rise = ease(ramp(p, 0.12, 0.28));
    wire.scale.y = Math.max(1e-3, rise);
    wireMat.opacity = Math.min(rise * 3, 1) * 0.9 * (1 - ease(ramp(p, 0.36, 0.5)));
    wire.visible = wireMat.opacity > 0.01;
    // members
    groups.forEach((g) => writeGroup(g, p));
    clipSiding.constant = FY - 0.3 + ease(ramp(p, 0.74, 0.86)) * (RIDGE - FY + 1);
    clipRoof.constant = TOP - 2 + ease(ramp(p, 0.76, 0.87)) * (RIDGE - TOP + 2.6);
    gables.forEach((m) => { m.material.opacity = ramp(p, 0.64, 0.7); m.visible = m.material.opacity > 0; });
    // dusk
    const d = ease(ramp(p, 0.78, 0.97));
    glassMat.emissiveIntensity = d * 2.2;
    porch.intensity = d * 60;
    lamp.material.emissiveIntensity = d * 4;
    lamp.visible = d > 0.01;
    sun.intensity = 2.4 - d * 0.7;
    sun.color.copy(tmp.set(0xfff1dd).lerp(dusk.set(0xffc49a), d));
    sun.position.set(40 - d * 6, 46 - d * 24, 28 + d * 14);
    hemi.intensity = 1.1 - d * 0.2;
    hemi.color.copy(tmp.set(0xcfe0ff).lerp(dusk.set(0xaab4dd), d));
    const bp = 1 - ease(ramp(p, 0.3, 0.7));
    groundMat.uniforms.uLineA.value = 0.15 + 0.45 * bp;
    groundMat.uniforms.uBaseA.value = 0.9 * ease(ramp(p, 0.4, 0.8));
    groundMat.uniforms.uLine.value.set(0x9cc3ff).lerp(tmp.set(0x5d5348), 1 - bp);
    groundMat.uniforms.uBase.value.set(0x6b6052).lerp(tmp.set(0x4a4038), d);
    shadowCatcher.material.opacity = 0.3 * (1 - d * 0.5);
    host.style.setProperty('--plan', (1 - ease(ramp(p, 0.26, 0.6))).toFixed(3));
    host.style.setProperty('--dusk', d.toFixed(3));
    host.style.setProperty('--p', p.toFixed(4));
    caps.forEach(({ el, r }) => el.classList.toggle('on', p >= r[0] && p < r[1]));
  };

  const place = (p) => {
    const t = keyT(p);
    const pos = camPos.getPoint(t), tg = camTgt.getPoint(t);
    const off = pos.clone().sub(tg).multiplyScalar(distK);
    off.applyAxisAngle(Y, -smx * 0.12 * ramp(p, 0.2, 0.4));
    camera.position.copy(tg).add(off);
    camera.position.y += smy * 3 * ramp(p, 0.2, 0.4);
    camera.lookAt(tg);
    // keep the top-down shot from flipping
    camera.up.set(0, 1, 0);
  };

  const project = (p) => {
    const v = V(0, 0, 0);
    labels.forEach(({ el, p: at, show }) => {
      v.copy(at).project(camera);
      const o = clamp(Math.min(ramp(p, show[0], show[0] + 0.04), 1 - ramp(p, show[1] - 0.06, show[1])));
      el.style.transform = `translate(${((v.x + 1) / 2 * W).toFixed(1)}px, ${((1 - v.y) / 2 * Hh).toFixed(1)}px)`;
      el.style.opacity = (o * (v.z < 1 ? 1 : 0)).toFixed(3);
    });
  };

  const frame = (now) => {
    requestAnimationFrame(frame);
    if (!visible) return;
    if (intro < 1) { intro = Math.min(1, (now - t0) / 2600); dirty = true; }
    target = 0.14 * ease(intro) + 0.86 * scrollP();
    const prev = shown;
    shown = shown < 0 ? target : shown + (target - shown) * (REDUCED ? 1 : 0.12);
    if (Math.abs(target - shown) < 1e-4) shown = target;
    smx += (mx - smx) * 0.05; smy += (my - smy) * 0.05;
    const moving = Math.abs(mx - smx) > 1e-3 || Math.abs(my - smy) > 1e-3;
    if (!dirty && shown === prev && !moving) return;
    dirty = false;
    apply(shown);
    place(shown);
    project(shown);
    renderer.render(scene, camera);
  };

  resize();
  host.classList.add('ready');
  requestAnimationFrame(frame);
  window.berkHero = { set: (p) => { shown = -1; target = p; }, apply, scrollP };
}
