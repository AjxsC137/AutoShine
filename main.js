// ============================================================
//  AUTOSHINE — main.js  v3
//  • Spring-back drag rotation on all sections
//  • Light / dark theme toggle with fog update
//  • Smart cursor: changes colour based on surface beneath
// ============================================================

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const DEFAULT_MODEL = './car.glb';
const ACCENT = new THREE.Color(0x00c9a7);

// Registry of all WebGL renderers — used by cursor pixel-sampling
const _glRenderers = [];

// ============================================================
//  SCENE BUILDER
// ============================================================
function buildScene(canvasId, options = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  const container = canvas.parentElement;

  const {
    modelPath          = DEFAULT_MODEL,
    restAngleY: initAng = 0,
    camX = 0, camY = 1.1, camZ = 5.5,
    lights   = 'standard',
    fogNear  = 7,
    fogFar   = 18,
  } = options;

  let restAngleY = initAng;

  // ── Renderer ──
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled    = true;
  renderer.shadowMap.type       = THREE.PCFSoftShadowMap;
  renderer.toneMapping          = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure  = 0.95;
  renderer.outputColorSpace     = THREE.SRGBColorSpace;

  function syncSize() {
    const w = container.offsetWidth  || container.clientWidth  || 600;
    const h = container.offsetHeight || container.clientHeight || window.innerHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    // On mobile push camera back 25% so car appears smaller
    const mobScale = window.innerWidth <= 960 ? 1.25 : 1.0;
    camera.position.setZ(camZ * mobScale);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  // ── Scene ──
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x080808, fogNear, fogFar);
  canvas.__scene = scene; // exposed for theme fog updates

  // ── Camera ──
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(camX, camY, camZ);
  camera.lookAt(0, 0.3, 0);

  // ── Lights ──
  const setupLights = {
    standard() {
      scene.add(new THREE.AmbientLight(0xffffff, 0.75));
      const key = new THREE.DirectionalLight(0x00c9a7, 2.2);
      key.position.set(-3, 7, 5); key.castShadow = true; key.shadow.mapSize.setScalar(1024);
      scene.add(key);
      const ff = new THREE.DirectionalLight(0xfff5e8, 1.6); ff.position.set(0, 2, 8); scene.add(ff);
      const sf = new THREE.DirectionalLight(0xffeedd, 1.0); sf.position.set(6, 3, -2); scene.add(sf);
      const rim = new THREE.DirectionalLight(0x00c9a7, 1.5); rim.position.set(0, 2, -8); scene.add(rim);
      scene.add(new THREE.HemisphereLight(0x334444, 0x111111, 0.5));
    },
    dramatic() {
      scene.add(new THREE.AmbientLight(0xffffff, 0.6));
      const spot = new THREE.SpotLight(0x00c9a7, 5);
      spot.position.set(0, 9, 1); spot.angle = Math.PI / 4.5; spot.penumbra = 0.6; spot.castShadow = true;
      scene.add(spot);
      const ff = new THREE.DirectionalLight(0xfff0e0, 2.0); ff.position.set(0, 1, 8); scene.add(ff);
      const side = new THREE.DirectionalLight(0xffe8c8, 1.4); side.position.set(7, 3, 2); scene.add(side);
      const rim = new THREE.DirectionalLight(0x00c9a7, 1.8); rim.position.set(-2, 3, -8); scene.add(rim);
      scene.add(new THREE.HemisphereLight(0x223333, 0x111111, 0.45));
    },
    cool() {
      scene.add(new THREE.AmbientLight(0xffffff, 0.7));
      const top = new THREE.DirectionalLight(0xc8e8ff, 2.2);
      top.position.set(1, 8, 3); top.castShadow = true; top.shadow.mapSize.setScalar(1024);
      scene.add(top);
      const ff = new THREE.DirectionalLight(0xeef8ff, 1.8); ff.position.set(0, 1, 8); scene.add(ff);
      const acc = new THREE.DirectionalLight(0x00c9a7, 2.0); acc.position.set(-6, 3, -2); scene.add(acc);
      const warm = new THREE.DirectionalLight(0xffd8a8, 1.0); warm.position.set(5, 2, 2); scene.add(warm);
      scene.add(new THREE.HemisphereLight(0x223344, 0x111118, 0.5));
    },
  };
  (setupLights[lights] || setupLights.standard)();

  // ── Grid ──
  // To change grid colour: edit the two hex values below
  // GridHelper(size, divisions, centerLineColor, gridLineColor)
  const grid = new THREE.GridHelper(22, 22, 0x2a4a44, 0x1e3330);
  grid.position.y = 0.001; grid.material.opacity = 0.85; grid.material.transparent = true;
  scene.add(grid);
  const grid2 = new THREE.GridHelper(22, 44, 0x0d2220, 0x0d2220);
  grid2.position.y = 0.002; grid2.material.opacity = 0.5; grid2.material.transparent = true;
  scene.add(grid2);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), new THREE.ShadowMaterial({ opacity: 0.5 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  scene.add(ground);

  // ── Glow ring ──
  const ringGeo = new THREE.RingGeometry(0.9, 1.6, 80);
  const ringMat = new THREE.MeshBasicMaterial({ color: ACCENT, side: THREE.DoubleSide, transparent: true, opacity: 0.10 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.005;
  scene.add(ring);

  // ── Particles ──
  // ↓↓ CHANGE THIS NUMBER to adjust floating cyan particle count ↓↓
  const pCount = 400;
  // ↑↑ ——————————————————————————————————————————————————————————— ↑↑
  const pPos = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    pPos[i*3]   = (Math.random() - 0.5) * 16;
    pPos[i*3+1] = Math.random() * 7;
    pPos[i*3+2] = (Math.random() - 0.5) * 16;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  scene.add(new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0x00c9a7, size: 0.022, transparent: true, opacity: 0.4, sizeAttenuation: true })));

  // ── Placeholder car (shown until GLB loads) ──
  const placeholder = new THREE.Group();
  const bodyMat  = new THREE.MeshStandardMaterial({ color: 0x1a2a28, metalness: 0.7, roughness: 0.3, emissive: new THREE.Color(0x00c9a7), emissiveIntensity: 0.08 });
  const roofMat  = new THREE.MeshStandardMaterial({ color: 0x0f1f1d, metalness: 0.8, roughness: 0.25, emissive: new THREE.Color(0x00c9a7), emissiveIntensity: 0.06 });
  const windMat  = new THREE.MeshStandardMaterial({ color: 0x00c9a7, transparent: true, opacity: 0.18, metalness: 0.1, roughness: 0.05 });
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.3, roughness: 0.8 });
  const rimMat   = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9, roughness: 0.15, emissive: new THREE.Color(0x00c9a7), emissiveIntensity: 0.12 });
  const lightMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: new THREE.Color(0x00c9a7), emissiveIntensity: 0.9 });
  const tailMat  = new THREE.MeshStandardMaterial({ color: 0xff2200, emissive: new THREE.Color(0xff2200), emissiveIntensity: 0.6 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.9, 1.8), bodyMat);
  body.position.y = 0.45; body.castShadow = true; placeholder.add(body);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.75, 1.6), roofMat);
  roof.position.set(-0.1, 1.27, 0); roof.castShadow = true; placeholder.add(roof);

  const windGeo = new THREE.BoxGeometry(0.08, 0.65, 1.5);
  const wf = new THREE.Mesh(windGeo, windMat); wf.position.set( 0.95, 1.25, 0); placeholder.add(wf);
  const wr = new THREE.Mesh(windGeo, windMat); wr.position.set(-1.15, 1.25, 0); placeholder.add(wr);

  [[-1.2,0.38,1.1],[-1.2,0.38,-1.1],[1.2,0.38,1.1],[1.2,0.38,-1.1]].forEach(([x,y,z]) => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.38,0.38,0.28,28), wheelMat);
    w.rotation.z = Math.PI/2; w.position.set(x,y,z); w.castShadow = true; placeholder.add(w);
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.22,0.3,16), rimMat);
    r.rotation.z = Math.PI/2; r.position.set(x,y,z); placeholder.add(r);
  });

  const lGeo = new THREE.BoxGeometry(0.1, 0.18, 0.4);
  [-0.5,0.5].forEach(z => {
    const hl = new THREE.Mesh(lGeo, lightMat); hl.position.set( 1.95, 0.6, z); placeholder.add(hl);
    const tl = new THREE.Mesh(lGeo, tailMat);  tl.position.set(-1.95, 0.6, z); placeholder.add(tl);
  });

  const wfMesh = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.9, 1.8),
    new THREE.MeshBasicMaterial({ color: 0x00c9a7, wireframe: true, transparent: true, opacity: 0.06 }));
  wfMesh.position.y = 0.45; placeholder.add(wfMesh);

  // ── Car pivot ──
  const carPivot = new THREE.Object3D();
  carPivot.add(placeholder);
  carPivot.rotation.y = restAngleY;
  scene.add(carPivot);

  // ── Load GLB ──
  new GLTFLoader().load(modelPath, (gltf) => {
    const m = gltf.scene;
    const box    = new THREE.Box3().setFromObject(m);
    const size   = box.getSize(new THREE.Vector3());
    const centre = box.getCenter(new THREE.Vector3());
    const scale  = 3.4 / Math.max(size.x, size.y, size.z);
    m.scale.setScalar(scale);
    m.position.set(-centre.x * scale, -box.min.y * scale, -centre.z * scale);
    m.traverse(c => { if (c.isMesh) { c.castShadow = c.receiveShadow = true; if (c.material) c.material.envMapIntensity = 1.3; } });
    carPivot.remove(placeholder);
    carPivot.add(m);
  });

  // ── Drag / spring-back ──
  let currentY   = restAngleY;
  let velocityY  = 0;
  let isDragging = false;
  let lastX      = 0;
  let dragDeltaY = 0;
  const SPRING_K = 0.08, DRAG_SENS = 0.008, DAMPING = 0.88, MAX_DRAG = Math.PI * 0.85;

  const onDown = e => { isDragging = true; lastX = e.touches ? e.touches[0].clientX : e.clientX; dragDeltaY = 0; };
  const onMove = e => {
    if (!isDragging) return;
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const dx = cx - lastX; lastX = cx;
    dragDeltaY = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, dragDeltaY + dx * DRAG_SENS));
    velocityY = dx * DRAG_SENS;
  };
  const onUp = () => { isDragging = false; };

  container.addEventListener('mousedown',  onDown, { passive: true });
  container.addEventListener('touchstart', onDown, { passive: true });
  window.addEventListener('mousemove',  onMove, { passive: true });
  window.addEventListener('touchmove',  onMove, { passive: true });
  window.addEventListener('mouseup',    onUp);
  window.addEventListener('touchend',   onUp);

  // ── Animate ──
  let t = 0, rafId;
  function animate() {
    rafId = requestAnimationFrame(animate);
    t += 0.01;
    if (isDragging) {
      currentY = restAngleY + dragDeltaY;
    } else {
      const diff = restAngleY - currentY;
      velocityY += diff * SPRING_K;
      velocityY *= DAMPING;
      currentY  += velocityY;
      dragDeltaY = currentY - restAngleY;
    }
    carPivot.rotation.y = currentY;
    carPivot.position.y = Math.sin(t * 0.5) * 0.04;
    ring.material.opacity = 0.07 + Math.sin(t * 1.1) * 0.05;
    ring.scale.setScalar(1 + Math.sin(t * 0.7) * 0.04);
    renderer.render(scene, camera);
  }

  new IntersectionObserver(entries => {
    entries[0].isIntersecting ? animate() : cancelAnimationFrame(rafId);
  }, { threshold: 0.05 }).observe(container);

  setTimeout(syncSize, 0);
  new ResizeObserver(syncSize).observe(container);
  window.addEventListener('resize', syncSize, { passive: true });

  // Register for cursor pixel sampling
  _glRenderers.push({ canvas, renderer });

  return {
    scene,
    setAngle(a) { restAngleY = a; },
  };
}

// ============================================================
//  INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {

  // ── Build scenes (YOUR customised angles preserved) ──

  // ── ANGLE TUNING GUIDE ──
  // restAngleY in radians:  0=front  Math.PI=rear  Math.PI/2=left  -Math.PI/2=right
  // quarter views: ±Math.PI*0.25 (45°)  ±Math.PI*0.75 (135°)
  // Tip: adjust in steps of 0.1 (~6°)

  // HERO
  const heroScene = buildScene('canvas-hero', {
    restAngleY: 0,
    camX: 0, camY: 1.3, camZ: 5.8,
    lights: 'standard', fogNear: 8, fogFar: 20,
  });

  // CHANGE VIEW button
  const heroAngles = [
    { label: 'Left Side',   angle: 0               },
    { label: 'Front-Left',  angle: Math.PI * 0.25  },
    { label: 'Front',       angle: Math.PI / 2     },
    { label: 'Front-Right', angle: Math.PI * 0.75  },
    { label: 'Right Side',  angle: Math.PI         },
    { label: 'Rear-Right',  angle: -Math.PI * 0.75 },
    { label: 'Rear',        angle: -Math.PI / 2    },
    { label: 'Rear-Left',   angle: -Math.PI * 0.25 },
  ];
  let heroAngleIdx = 0;
  const btnView = document.getElementById('btn-change-view');
  if (btnView && heroScene) {
    btnView.addEventListener('click', () => {
      heroAngleIdx = (heroAngleIdx + 1) % heroAngles.length;
      const next = heroAngles[heroAngleIdx];
      heroScene.setAngle(next.angle);
      btnView.classList.remove('spinning');
      void btnView.offsetWidth;
      btnView.classList.add('spinning');
      setTimeout(() => btnView.classList.remove('spinning'), 520);
      const lbl = btnView.querySelector('.view-label');
      if (lbl) lbl.textContent = next.label;
    });
  }

  // SERVICES  ↓ YOUR angle
  buildScene('canvas-services', {
    restAngleY: Math.PI * 0.65,
    camX: 0, camY: 1.1, camZ: 5.2,
    lights: 'dramatic', fogNear: 7, fogFar: 17,
  });

  // ABOUT  ↓ YOUR angle
  buildScene('canvas-about', {
    restAngleY: Math.PI / 2,
    camX: 0, camY: 1.1, camZ: 5.2,
    lights: 'cool', fogNear: 7, fogFar: 17,
  });

  // PRICING  ↓ YOUR angle
  buildScene('canvas-pricing', {
    restAngleY: Math.PI * 0.40,
    camX: 0, camY: 1.2, camZ: 5.5,
    lights: 'dramatic', fogNear: 7, fogFar: 18,
  });

  // CONTACT  ↓ YOUR angle
  buildScene('canvas-contact', {
    restAngleY: Math.PI,
    camX: 0.4, camY: 1.0, camZ: 5.5,
    lights: 'standard', fogNear: 7, fogFar: 18,
  });

  // ── Navbar scroll ──
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 30);
  }, { passive: true });

  // ── Active nav link ──
  document.querySelectorAll('.section').forEach(s => {
    new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      document.querySelectorAll('.nav-link').forEach(l => { if (!l.classList.contains('nav-cta')) l.style.color = ''; });
      const m = document.querySelector(`.nav-link[href="#${s.id}"]`);
      if (m && !m.classList.contains('nav-cta')) m.style.color = 'var(--text)';
    }, { threshold: 0.5 }).observe(s);
  });

  // ── Hamburger ──
  const hamburger   = document.getElementById('hamburger');
  const navLinksEl  = document.getElementById('nav-links');
  hamburger.addEventListener('click', () => navLinksEl.classList.toggle('open'));
  document.querySelectorAll('.nav-link').forEach(l => l.addEventListener('click', () => navLinksEl.classList.remove('open')));

  // ── Theme toggle (desktop + mobile in drawer) ──
  const html          = document.documentElement;
  const themeBtn      = document.getElementById('theme-toggle');
  const themeBtnMob   = document.getElementById('theme-toggle-mobile');

  function applyFogToScenes(isLight) {
    document.querySelectorAll('canvas').forEach(c => {
      if (c.__scene && c.__scene.fog) c.__scene.fog.color.set(isLight ? 0xf0ece4 : 0x080808);
    });
  }

  // Always start in dark mode — ignore any previously saved preference
  localStorage.removeItem('autoshine-theme');
  html.setAttribute('data-theme', 'dark');
  applyFogToScenes(false);

  function handleToggle() {
    const isLight = html.getAttribute('data-theme') === 'light';
    if (isLight) {
      html.setAttribute('data-theme', 'dark');
      localStorage.setItem('autoshine-theme', 'dark');
      applyFogToScenes(false);
    } else {
      html.setAttribute('data-theme', 'light');
      localStorage.setItem('autoshine-theme', 'light');
      applyFogToScenes(true);
    }
  }

  if (themeBtn)    themeBtn.addEventListener('click', handleToggle);
  if (themeBtnMob) themeBtnMob.addEventListener('click', handleToggle);

  // ── Custom cursor — teal in dark mode, black in light mode ──
  const dot  = document.createElement('div'); dot.className = 'cursor';
  const ring = document.createElement('div'); ring.className = 'cursor-ring';
  document.body.appendChild(dot);
  document.body.appendChild(ring);

  let cx = -200, cy = -200, rx = -200, ry = -200;

  document.addEventListener('mousemove', e => {
    cx = e.clientX; cy = e.clientY;
    dot.style.left = cx + 'px'; dot.style.top = cy + 'px';
  }, { passive: true });

  (function followRing() {
    rx += (cx - rx) * 0.11; ry += (cy - ry) * 0.11;
    ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
    requestAnimationFrame(followRing);
  })();

  document.querySelectorAll('a, button').forEach(el => {
    el.addEventListener('mouseenter', () => { dot.style.width = dot.style.height = '18px'; ring.style.width = ring.style.height = '54px'; });
    el.addEventListener('mouseleave', () => { dot.style.width = dot.style.height = '10px'; ring.style.width = ring.style.height = '36px'; });
  });

  // ── Scroll reveal ──
  const revealIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      setTimeout(() => e.target.classList.add('visible'), Number(e.target.dataset.delay || 0));
      revealIO.unobserve(e.target);
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el => revealIO.observe(el));

  // ── Booking Form ──
  // ★ OWNER CONFIG — change these two values ★
  const OWNER_WHATSAPP = '918930341368'; // WhatsApp number with country code, no +
  const OWNER_EMAIL    = 'samplemail@gmail.com'; // Gmail / any email address

  const form         = document.getElementById('booking-form');
  const successBox   = document.getElementById('booking-success');
  const errorMsg     = document.getElementById('form-error');
  const btnWA        = document.getElementById('btn-whatsapp');
  const btnMail      = document.getElementById('btn-email');
  const btnNewBooking = document.getElementById('btn-new-booking');

  function getFields() {
    return {
      name:    document.getElementById('f-name').value.trim(),
      phone:   document.getElementById('f-phone').value.trim(),
      address: document.getElementById('f-address').value.trim(),
      car:     document.getElementById('f-car').value.trim(),
      model:   document.getElementById('f-model').value.trim(),
      date:    document.getElementById('f-date').value,
      time:    document.getElementById('f-time').value,
    };
  }

  function validate(f) {
    if (!f.name)    return 'Please enter your name.';
    if (!f.phone)   return 'Please enter your phone number.';
    if (!f.address) return 'Please enter your address.';
    if (!f.car)     return 'Please enter your car name.';
    if (!f.date)    return 'Please choose a preferred date.';
    if (!f.time)    return 'Please select a time slot.';
    return null;
  }

  function buildMessage(f) {
    return `🚗 *New AutoShine Booking*\n\n` +
      `👤 *Name:* ${f.name}\n` +
      `📞 *Phone:* ${f.phone}\n` +
      `📍 *Address:* ${f.address}\n` +
      `🚘 *Car:* ${f.car}${f.model ? ' — ' + f.model : ''}\n` +
      `📅 *Date:* ${f.date}\n` +
      `⏰ *Time:* ${f.time}\n\n` +
      `Please confirm the booking. Thank you!`;
  }

  function showSuccess() {
    form.style.display = 'none';
    successBox.style.display = 'flex';
  }

  if (btnWA) {
    btnWA.addEventListener('click', () => {
      const f = getFields();
      const err = validate(f);
      if (err) { errorMsg.textContent = err; return; }
      errorMsg.textContent = '';
      const msg = buildMessage(f);
      const encoded = encodeURIComponent(msg);
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile) {
        // Opens WhatsApp app directly on mobile — no browser confirmation page
        const appLink = `whatsapp://send?phone=${OWNER_WHATSAPP}&text=${encoded}`;
        const webFallback = `https://wa.me/${OWNER_WHATSAPP}?text=${encoded}`;
        const start = Date.now();
        window.location.href = appLink;
        setTimeout(() => {
          // Only redirect to web if app didn't open (still on page after 1.5s)
          if (Date.now() - start < 1800) window.location.href = webFallback;
        }, 1500);
      } else {
        // Desktop: open WhatsApp Web directly (bypasses the wa.me landing page)
        window.open(`https://web.whatsapp.com/send?phone=${OWNER_WHATSAPP}&text=${encoded}`, '_blank', 'noopener');
      }
      showSuccess();
    });
  }

  if (btnMail) {
    btnMail.addEventListener('click', () => {
      const f = getFields();
      const err = validate(f);
      if (err) { errorMsg.textContent = err; return; }
      errorMsg.textContent = '';
      const subject = `AutoShine Booking — ${f.name} — ${f.date}`;
      const body =
        `New Booking Request\n\n` +
        `Name: ${f.name}\n` +
        `Phone: ${f.phone}\n` +
        `Address: ${f.address}\n` +
        `Car: ${f.car}${f.model ? ' (' + f.model + ')' : ''}\n` +
        `Date: ${f.date}\n` +
        `Time: ${f.time}\n\n` +
        `Please confirm the booking.`;
      const url = `mailto:${OWNER_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = url;
      showSuccess();
    });
  }

  if (btnNewBooking) {
    btnNewBooking.addEventListener('click', () => {
      // reset form fields
      ['f-name','f-phone','f-address','f-car','f-model','f-date'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
      });
      const sel = document.getElementById('f-time'); if (sel) sel.selectedIndex = 0;
      successBox.style.display = 'none';
      form.style.display = 'flex';
    });
  }

});
