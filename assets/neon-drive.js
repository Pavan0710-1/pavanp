/* NEON DRIVE — pavanp.me
   Complete self-contained 3D driving game.
   Three.js is loaded only when the game is opened.
*/
(function () {
'use strict';

if (window.NeonDrive) return;

const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
const VERSION = '3.0';
const LANES = [-5.25, -1.75, 1.75, 5.25];
const ROAD_WIDTH = 14;
const CHUNK_LENGTH = 100;
const CHUNK_COUNT = 12;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const damp = (a, b, l, dt) => a + (b - a) * (1 - Math.exp(-l * dt));

const save = {
  get(key, fallback) {
    try {
      const value = localStorage.getItem('nd3-' + key);
      return value === null ? fallback : JSON.parse(value);
    } catch (_) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('nd3-' + key, JSON.stringify(value)); }
    catch (_) {}
  }
};

const MODES = {
  free: {
    name: 'Free Roam',
    description: 'Explore the city at your own pace. No timer and no damage.',
    traffic: 0.38, damage: false, objective: 'Explore'
  },
  endless: {
    name: 'Endless Drive',
    description: 'Travel as far as possible. Avoid traffic and collect points.',
    traffic: 0.72, damage: true, objective: 'Distance'
  },
  race: {
    name: 'Street Race',
    description: 'Race through the city and reach the finish before time runs out.',
    traffic: 0.55, damage: true, time: 100, goal: 5000, objective: 'Race'
  },
  trial: {
    name: 'Time Trial',
    description: 'Beat the clock. Pass each checkpoint to earn extra time.',
    traffic: 0.28, damage: true, time: 75, goal: 4000, objective: 'Time'
  },
  drift: {
    name: 'Drift Challenge',
    description: 'Build drift points by holding controlled slides.',
    traffic: 0.35, damage: true, objective: 'Drift'
  },
  checkpoint: {
    name: 'Checkpoint Run',
    description: 'Drive through every glowing checkpoint gate.',
    traffic: 0.48, damage: true, goal: 6000, objective: 'Gates'
  },
  traffic: {
    name: 'Traffic Challenge',
    description: 'Survive dense traffic. You have three lives.',
    traffic: 1.2, damage: true, lives: 3, objective: 'Survival'
  }
};

const CARS = [
  { name:'APEX GT', type:'Sport', speed:76, accel:24, handling:82, grip:1.05, color:'#ff2e79', price:0 },
  { name:'VOLT XR', type:'Hyper', speed:91, accel:20, handling:75, grip:.91, color:'#00d9ff', price:1200 },
  { name:'NOVA R', type:'Track', speed:83, accel:27, handling:94, grip:1.2, color:'#a17aff', price:2200 },
  { name:'PHANTOM S', type:'Super', speed:96, accel:23, handling:80, grip:1, color:'#f4f0ff', price:4000 },
  { name:'TITAN X', type:'Muscle', speed:84, accel:30, handling:68, grip:.83, color:'#ffb52e', price:5500 },
  { name:'ZENITH', type:'Electric', speed:100, accel:32, handling:91, grip:1.12, color:'#35e69a', price:9000 }
];

const PAINTS = [
  ['Neon Pink','#ff2e79'], ['Electric Blue','#2675ff'],
  ['Cyber Cyan','#00d9ff'], ['Violet','#925cff'],
  ['Solar Gold','#ffb52e'], ['Mint','#35e69a'],
  ['Pearl White','#f4f0ff'], ['Graphite','#424454']
];

const DISTRICTS = [
  { name:'NEON DISTRICT', sky:0x16082c, fog:0x190b30, road:0x11101c, accent:0xff2e93 },
  { name:'CYBER HEIGHTS', sky:0x061a31, fog:0x10233a, road:0x101724, accent:0x00d9ff },
  { name:'GOLDEN MILE', sky:0x29152a, fog:0x38203b, road:0x17131b, accent:0xffb52e },
  { name:'NIGHT MARKET', sky:0x100c2b, fog:0x1d1740, road:0x11101c, accent:0x925cff }
];

const CSS = `
.nd3{position:fixed;inset:0;z-index:99999;background:#05030c;color:#f4f1ff;
font:14px/1.5 Inter,system-ui,sans-serif;overflow:hidden;touch-action:none;
user-select:none;-webkit-user-select:none}
.nd3 *{box-sizing:border-box}
.nd3 button,.nd3 select{font:inherit;color:inherit}
.nd3 button{cursor:pointer}
.nd3 button:focus-visible,.nd3 select:focus-visible{outline:2px solid #00e5ff;outline-offset:3px}
.nd3-canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.nd3-panel{position:absolute;inset:0;overflow:auto;background:linear-gradient(90deg,rgba(5,3,12,.96),rgba(5,3,12,.78) 55%,rgba(5,3,12,.18));padding:clamp(20px,4vw,55px);display:flex;flex-direction:column;gap:20px;touch-action:pan-y}
.nd3-brand{font-size:11px;letter-spacing:.32em;color:#ffb52e;text-transform:uppercase;font-weight:800}
.nd3-title{font-size:clamp(48px,8vw,100px);line-height:.86;letter-spacing:-.075em;margin:8px 0 14px;font-weight:950;
background:linear-gradient(100deg,#ff2e93,#925cff 48%,#00d9ff);color:transparent;background-clip:text;-webkit-background-clip:text}
.nd3-sub{color:#c7bfd9;max-width:490px;font-size:15px}
.nd3-kicker{font-size:10px;letter-spacing:.25em;color:#ffb52e;text-transform:uppercase;font-weight:800;margin-bottom:9px}
.nd3-modes{display:grid;grid-template-columns:repeat(2,minmax(130px,220px));gap:8px;max-width:470px}
.nd3-btn{border:1px solid #ffffff38;background:#100c1dcc;padding:12px 17px;border-radius:7px;text-transform:uppercase;
letter-spacing:.09em;font-size:11px;font-weight:800;transition:.18s}
.nd3-btn:hover,.nd3-btn.selected{border-color:#00d9ff;background:#123044aa;transform:translateY(-1px)}
.nd3-btn.primary{background:linear-gradient(100deg,#ff2e93,#925cff);border:0;color:white}
.nd3-btn:disabled{opacity:.35;cursor:not-allowed}
.nd3-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.nd3-garage{display:flex;align-items:center;gap:14px;max-width:470px}
.nd3-carname{font-size:23px;font-weight:900;letter-spacing:-.04em}
.nd3-carinfo{font-size:11px;color:#b7adc9}
.nd3-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:9px}
.nd3-stat{font-size:10px;color:#aaa1bb}
.nd3-stat i{display:block;height:4px;background:#ffffff24;border-radius:9px;margin-top:5px;overflow:hidden}
.nd3-stat i:after{content:'';display:block;height:100%;width:var(--v);background:linear-gradient(90deg,#ff2e93,#00d9ff)}
.nd3-colours{display:flex;gap:12px;flex-wrap:wrap;margin-top:13px}
.nd3-colour{width:25px;height:25px;border-radius:50%;border:2px solid #ffffff55;box-shadow:0 0 0 2px #080510}
.nd3-colour.selected{outline:2px solid white;outline-offset:3px}
.nd3-select{background:#100c1d;border:1px solid #ffffff44;border-radius:6px;padding:7px}
.nd3-help{font-size:11px;color:#a79db9;max-width:520px}
.nd3-hud{position:absolute;inset:0;padding:calc(17px + env(safe-area-inset-top)) 18px 18px;pointer-events:none}
.nd3-top{display:flex;gap:clamp(12px,3vw,36px);align-items:flex-start;flex-wrap:wrap}
.nd3-metric small{display:block;color:#a89dbb;font-size:9px;letter-spacing:.2em;text-transform:uppercase}
.nd3-metric strong{font-size:clamp(17px,3vw,27px);font-weight:900}
.nd3-actions{position:absolute;right:17px;top:calc(15px + env(safe-area-inset-top));display:flex;gap:7px;pointer-events:auto}
.nd3-actions .nd3-btn{padding:8px 11px;font-size:9px}
.nd3-speed{position:absolute;bottom:calc(18px + env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);text-align:center;text-shadow:0 2px 12px #000}
.nd3-speed strong{font-size:clamp(43px,8vw,75px);line-height:1;font-weight:950;letter-spacing:-.07em}
.nd3-speed small{display:block;font-size:10px;letter-spacing:.3em;color:#c0b7d1}
.nd3-map{position:absolute;right:18px;bottom:90px;width:130px;height:130px;border:1px solid #ffffff55;border-radius:50%;background:#080610aa;overflow:hidden}
.nd3-map canvas{width:100%;height:100%}
.nd3-message{position:absolute;top:23%;left:0;right:0;text-align:center;font-size:clamp(20px,4vw,34px);font-weight:950;letter-spacing:.08em;color:#ffcf66;text-shadow:0 3px 20px #000;pointer-events:none}
.nd3-overlay{position:absolute;inset:0;background:#05030ce8;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:15px;text-align:center;padding:22px}
.nd3-overlay h2{font-size:clamp(38px,7vw,70px);line-height:1;margin:0;letter-spacing:-.06em}
.nd3-overlay p{max-width:470px;color:#c6bdd5}
.nd3-touch{position:absolute;bottom:calc(12px + env(safe-area-inset-bottom));left:12px;right:12px;display:flex;justify-content:space-between;pointer-events:none}
.nd3-touch>div{display:flex;gap:9px;pointer-events:auto}
.nd3-touch button{width:65px;height:65px;border-radius:50%;border:1px solid #ffffff88;background:#080610aa;font-size:11px;font-weight:900;touch-action:none}
.nd3-touch button.active{background:#ff2e93aa;border-color:white}
.nd3-toast{position:absolute;left:50%;bottom:25px;transform:translateX(-50%);background:#f4f1ff;color:#080510;padding:10px 18px;border-radius:6px;font-size:12px;font-weight:800;z-index:5}
.nd3-hidden{display:none!important}
.nd3-progress{height:6px;background:#ffffff22;border-radius:8px;overflow:hidden;max-width:350px}
.nd3-progress span{display:block;height:100%;background:linear-gradient(90deg,#ff2e93,#00d9ff)}
@media(max-width:650px){
 .nd3-panel{inset:auto 0 0;height:77%;background:linear-gradient(0deg,#05030c 70%,#05030ccc 90%,transparent)}
 .nd3-modes{grid-template-columns:repeat(2,minmax(0,1fr))}
 .nd3-map{width:90px;height:90px;right:12px;bottom:110px}
 .nd3-touch button{width:58px;height:58px}
 .nd3-actions{top:auto;bottom:calc(90px + env(safe-area-inset-bottom));right:12px}
}
`;

let active = null;
let threePromise = null;

function loadThree() {
  if (window.THREE) return Promise.resolve();
  if (threePromise) return threePromise;
  threePromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = THREE_URL;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Unable to load the 3D engine.'));
    document.head.appendChild(script);
    setTimeout(() => reject(new Error('3D engine loading timed out.')), 15000);
  }).catch(error => {
    threePromise = null;
    throw error;
  });
  return threePromise;
}

function notify(message) {
  const el = document.createElement('div');
  el.className = 'nd3-toast';
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function webglAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch (_) { return false; }
}

async function open(options) {
  if (active) return true;
  if (!webglAvailable()) {
    notify('NEON DRIVE requires WebGL. Try enabling hardware acceleration in your browser.');
    return false;
  }
  try { await loadThree(); }
  catch (error) { notify(error.message); return false; }
  if (active) return true;
  try {
    active = createGame(options || {});
    return true;
  } catch (error) {
    console.error('[NEON DRIVE]', error);
    active = null;
    notify('The game could not start. Check the browser console for details.');
    return false;
  }
}

function close() {
  if (!active) return;
  const game = active;
  active = null;
  game.close();
}

window.NeonDrive = {
  open,
  close,
  isOpen: () => !!active,
  version: VERSION
};

function createGame(options) {
  const T = window.THREE;
  const previousFocus = document.activeElement;
  const previousOverflow = document.documentElement.style.overflow;
  const previousBodyOverflow = document.body.style.overflow;
  const originalSiblings = [...document.body.children];
  const disposables = { geometries:[], materials:[], textures:[] };
  const track = (type, value) => (disposables[type].push(value), value);
  const geo = value => track('geometries', value);
  const mat = value => track('materials', value);
  const tex = value => track('textures', value);

  const profile = Object.assign({
    credits:0, xp:0, level:1, selectedCar:0, paint:0,
    owned:[0], mode:'free', quality:'auto',
    best:{}, achievements:[], missions:{}
  }, save.get('profile', {}));

  if (!Array.isArray(profile.owned)) profile.owned = [0];
  if (!profile.owned.includes(0)) profile.owned.unshift(0);
  if (!profile.best) profile.best = {};
  if (!profile.achievements) profile.achievements = [];
  if (options.mode && MODES[options.mode]) profile.mode = options.mode;

  const settings = Object.assign({
    sound:true, music:false, quality:profile.quality || 'auto'
  }, save.get('settings', {}));

  const lowDevice = (navigator.hardwareConcurrency || 8) <= 4 ||
    (navigator.deviceMemory || 8) <= 4 ||
    navigator.maxTouchPoints > 0;

  let quality = settings.quality === 'auto' ? (lowDevice ? 1 : 0) : +settings.quality;
  quality = clamp(quality, 0, 2);

  const canvas = document.createElement('canvas');
  canvas.className = 'nd3-canvas';
  const renderer = new T.WebGLRenderer({
    canvas, antialias:quality === 0 && !lowDevice,
    powerPreference:'high-performance', alpha:false
  });
  renderer.setClearColor(0x090514);
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const root = document.createElement('div');
  root.className = 'nd3';
  root.setAttribute('role','dialog');
  root.setAttribute('aria-modal','true');
  root.setAttribute('aria-label','NEON DRIVE 3D driving game');
  root.appendChild(canvas);

  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  root.insertAdjacentHTML('beforeend', `
    <section class="nd3-panel" aria-label="Game garage">
      <div>
        <div class="nd3-brand">PAVANP.ME · ORIGINAL DRIVING EXPERIENCE</div>
        <h1 class="nd3-title">NEON<br>DRIVE</h1>
        <p class="nd3-sub">A city after dark. Six machines. Seven ways to drive. Your road starts here.</p>
      </div>
      <div>
        <div class="nd3-kicker">01 / Select your mode</div>
        <div class="nd3-modes"></div>
        <p class="nd3-sub mode-description" aria-live="polite"></p>
      </div>
      <div>
        <div class="nd3-kicker">02 / Your garage</div>
        <div class="nd3-garage">
          <button class="nd3-btn car-prev" aria-label="Previous car">‹</button>
          <div style="flex:1">
            <div class="nd3-carname"></div>
            <div class="nd3-carinfo"></div>
            <div class="nd3-stats"></div>
          </div>
          <button class="nd3-btn car-next" aria-label="Next car">›</button>
        </div>
        <div class="nd3-colours"></div>
        <p class="nd3-sub car-price"></p>
      </div>
      <div class="nd3-row">
        <label class="nd3-help">Graphics
          <select class="nd3-select quality">
            <option value="auto">Auto</option><option value="0">High</option>
            <option value="1">Medium</option><option value="2">Low</option>
          </select>
        </label>
        <label class="nd3-help"><input type="checkbox" class="sound"> Sound</label>
        <label class="nd3-help"><input type="checkbox" class="music"> Music</label>
      </div>
      <div class="nd3-row">
        <button class="nd3-btn primary start">START ENGINE</button>
        <button class="nd3-btn exit">EXIT TO WEBSITE</button>
      </div>
      <p class="nd3-help">W / ↑ accelerate · S / ↓ brake · A D / ← → steer · Space drift · P or Esc pause · R restart</p>
      <p class="nd3-help profile-summary"></p>
    </section>

    <section class="nd3-hud nd3-hidden">
      <div class="nd3-top">
        <div class="nd3-metric"><small>Distance</small><strong class="distance">0 m</strong></div>
        <div class="nd3-metric"><small>Score</small><strong class="score">0</strong></div>
        <div class="nd3-metric"><small>Credits</small><strong class="credits">0</strong></div>
        <div class="nd3-metric"><small>Objective</small><strong class="objective">Explore</strong></div>
      </div>
      <div class="nd3-actions">
        <button class="nd3-btn pause">PAUSE</button>
        <button class="nd3-btn restart">RESTART</button>
        <button class="nd3-btn leave">EXIT</button>
      </div>
      <div class="nd3-speed"><strong class="speed">0</strong><small>KM/H</small></div>
      <div class="nd3-map"><canvas width="180" height="180"></canvas></div>
    </section>

    <div class="nd3-message" aria-live="polite"></div>
    <div class="nd3-touch nd3-hidden">
      <div><button data-control="left">◀</button><button data-control="right">▶</button></div>
      <div><button data-control="brake">BRAKE</button><button data-control="gas">GAS</button></div>
    </div>

    <section class="nd3-overlay nd3-hidden pause-screen">
      <div class="nd3-brand">NEON DRIVE</div><h2>PAUSED</h2>
      <p>Your drive is safely paused.</p>
      <div class="nd3-row">
        <button class="nd3-btn primary resume">RESUME</button>
        <button class="nd3-btn restart">RESTART</button>
        <button class="nd3-btn garage">GARAGE</button>
        <button class="nd3-btn leave">EXIT</button>
      </div>
    </section>

    <section class="nd3-overlay nd3-hidden result-screen">
      <div class="nd3-brand">DRIVE COMPLETE</div><h2 class="result-title">FINISHED</h2>
      <p class="result-details"></p>
      <div class="nd3-row">
        <button class="nd3-btn primary restart">DRIVE AGAIN</button>
        <button class="nd3-btn garage">GARAGE</button>
        <button class="nd3-btn leave">EXIT</button>
      </div>
    </section>
  `);

  const $ = selector => root.querySelector(selector);
  const $$ = selector => [...root.querySelectorAll(selector)];
  const ui = {
    panel:$('.nd3-panel'), hud:$('.nd3-hud'), pause:$('.pause-screen'),
    result:$('.result-screen'), touch:$('.nd3-touch'), message:$('.nd3-message'),
    map:$('.nd3-map canvas')
  };

  originalSiblings.forEach(element => {
    if (element !== root) {
      element.__nd3Inert = element.inert;
      element.inert = true;
    }
  });
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
  document.body.appendChild(root);

  /* 3D WORLD */
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(65, 1, .1, 1800);
  const hemi = new T.HemisphereLight(0x9bbcff, 0x180820, 1.25);
  scene.add(hemi);
  const keyLight = new T.DirectionalLight(0xffb7db, 1.25);
  keyLight.position.set(-40, 90, 25);
  scene.add(keyLight);
  const fillLight = new T.PointLight(0x7b5cff, 2.2, 100);
  fillLight.position.set(0, 15, -20);
  scene.add(fillLight);
  const playerLight = new T.PointLight(0x00d9ff, 1.4, 22);
  scene.add(playerLight);

  const materialCache = new Map();
  function basic(color, extra) {
    const key = String(color) + JSON.stringify(extra || {});
    if (!materialCache.has(key)) {
      materialCache.set(key, mat(new T.MeshBasicMaterial(
        Object.assign({color}, extra || {})
      )));
    }
    return materialCache.get(key);
  }
  function phong(color, extra) {
    return mat(new T.MeshPhongMaterial(
      Object.assign({color, shininess:65, specular:0x555566}, extra || {})
    ));
  }

  const boxGeo = geo(new T.BoxGeometry(1,1,1));
  const planeGeo = geo(new T.PlaneGeometry(1,1));
  const wheelGeo = geo(new T.CylinderGeometry(.34,.34,.28,16));
  wheelGeo.rotateZ(Math.PI/2);

  function canvasTexture(width, height, draw) {
    const c = document.createElement('canvas');
    c.width = width; c.height = height;
    draw(c.getContext('2d'), width, height);
    const texture = tex(new T.CanvasTexture(c));
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return texture;
  }

  const glowTexture = canvasTexture(128,128,(ctx,w,h) => {
    const g = ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);
    g.addColorStop(0,'rgba(255,255,255,.9)');
    g.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0,0,w,h);
  });

  const roadTexture = canvasTexture(256,512,(ctx,w,h) => {
    ctx.fillStyle = '#11111b'; ctx.fillRect(0,0,w,h);
    for (let i=0;i<1000;i++) {
      ctx.fillStyle = 'rgba(255,255,255,'+(Math.random()*.045)+')';
      ctx.fillRect(Math.random()*w,Math.random()*h,2,2);
    }
    ctx.fillStyle = '#f3eaff';
    ctx.fillRect(5,0,3,h); ctx.fillRect(w-8,0,3,h);
    ctx.fillStyle = '#ff2e93';
    ctx.fillRect(w/2-3,0,2,h); ctx.fillRect(w/2+2,0,2,h);
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    for (const x of [w*.25,w*.75]) {
      for (let y=0;y<h;y+=65) ctx.fillRect(x-2,y,4,30);
    }
  });
  roadTexture.wrapS = roadTexture.wrapT = T.RepeatWrapping;
  roadTexture.repeat.set(1,4);

  const groundTexture = canvasTexture(128,128,(ctx,w,h) => {
    ctx.fillStyle='#080611';ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='#21143d';ctx.lineWidth=2;
    for(let x=0;x<w;x+=32){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
    for(let y=0;y<h;y+=32){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
  });
  groundTexture.wrapS = groundTexture.wrapT = T.RepeatWrapping;
  groundTexture.repeat.set(20,8);

  const windowTexture = canvasTexture(128,256,(ctx,w,h) => {
    ctx.fillStyle='#080b17';ctx.fillRect(0,0,w,h);
    const colours=['#ffb7df','#78dcff','#ffd879','#a58cff','#8fffd6'];
    for(let y=7;y<h;y+=25) for(let x=7;x<w;x+=22) {
      if(Math.random()>.37) {
        ctx.fillStyle=pick(colours);
        ctx.globalAlpha=rand(.35,.95);
        ctx.fillRect(x,y,11,13);
      }
    }
    ctx.globalAlpha=1;
  });

  const sky = new T.Mesh(
    geo(new T.SphereGeometry(850,24,16)),
    mat(new T.MeshBasicMaterial({color:0x170a30,side:T.BackSide,fog:false}))
  );
  scene.add(sky);

  const starPositions = new Float32Array(900*3);
  for(let i=0;i<900;i++) {
    const a=Math.random()*Math.PI*2;
    const y=rand(-.1,1);
    const r=790;
    starPositions[i*3]=Math.cos(a)*r;
    starPositions[i*3+1]=y*r*.65+120;
    starPositions[i*3+2]=Math.sin(a)*r;
  }
  const starGeo=geo(new T.BufferGeometry());
  starGeo.setAttribute('position',new T.BufferAttribute(starPositions,3));
  const stars=new T.Points(starGeo,mat(new T.PointsMaterial({
    color:0xffffff,size:1.8,sizeAttenuation:false
  })));
  scene.add(stars);

  /* CITY CHUNKS */
  const chunks=[];
  const buildingMaterials = [
    new T.MeshBasicMaterial({map:windowTexture,color:0x9b9ac8}),
    new T.MeshBasicMaterial({map:windowTexture,color:0xffb8dc}),
    new T.MeshBasicMaterial({map:windowTexture,color:0x8bdfff}),
    new T.MeshBasicMaterial({map:windowTexture,color:0xb8a5ff})
  ].map(m=>mat(m));

  function makeBuilding(group,x,z,width,height,depth) {
    const building=new T.Mesh(boxGeo,pick(buildingMaterials));
    building.scale.set(width,height,depth);
    building.position.set(x,height/2-1,z);
    group.add(building);

    const roof=new T.Mesh(boxGeo,basic(pick([0xff2e93,0x00d9ff,0x925cff])));
    roof.scale.set(width*.72,.16,depth*.72);
    roof.position.set(x,height-.85,z);
    group.add(roof);

    if(Math.random()<.35) {
      const antenna=new T.Mesh(boxGeo,basic(0x9f8cff));
      antenna.scale.set(.12,rand(2,7),.12);
      antenna.position.set(x,height+rand(1,4),z);
      group.add(antenna);
    }
  }

  function makeChunk(index) {
    const group=new T.Group();

    const ground=new T.Mesh(planeGeo,new T.MeshBasicMaterial({map:groundTexture}));
    ground.rotation.x=-Math.PI/2;
    ground.scale.set(260,CHUNK_LENGTH,1);
    ground.position.set(0,-.08,-CHUNK_LENGTH/2);
    group.add(ground);

    const road=new T.Mesh(planeGeo,new T.MeshBasicMaterial({map:roadTexture}));
    road.rotation.x=-Math.PI/2;
    road.scale.set(ROAD_WIDTH,CHUNK_LENGTH,1);
    road.position.set(0,0,-CHUNK_LENGTH/2);
    group.add(road);

    for(const side of [-1,1]) {
      const pavement=new T.Mesh(boxGeo,phong(0x242039));
      pavement.scale.set(3,.25,CHUNK_LENGTH);
      pavement.position.set(side*8.5,.04,-CHUNK_LENGTH/2);
      group.add(pavement);

      const rail=new T.Mesh(boxGeo,basic(side<0?0xff2e93:0x00d9ff));
      rail.scale.set(.12,.13,CHUNK_LENGTH);
      rail.position.set(side*7.1,.35,-CHUNK_LENGTH/2);
      group.add(rail);

      for(let z=-8;z>-CHUNK_LENGTH;z-=rand(17,25)) {
        const width=rand(9,17),height=rand(18,95),depth=rand(10,18);
        makeBuilding(group,side*(16+width/2),z,width,height,depth);
      }

      for(let z=-15;z>-CHUNK_LENGTH;z-=42) {
        const pole=new T.Mesh(boxGeo,phong(0x303044));
        pole.scale.set(.2,7,.2);
        pole.position.set(side*11,3.5,z);
        group.add(pole);

        const lamp=new T.Mesh(boxGeo,basic(side<0?0xffb52e:0x00d9ff));
        lamp.scale.set(1.2,.16,.4);
        lamp.position.set(side*10.5,7,z);
        group.add(lamp);

        const pool=new T.Mesh(planeGeo,basic(side<0?0xffb52e:0x00d9ff,{
          map:glowTexture,transparent:true,opacity:.28,
          blending:T.AdditiveBlending,depthWrite:false
        }));
        pool.rotation.x=-Math.PI/2;
        pool.scale.set(8,8,1);
        pool.position.set(side*7,.08,z);
        group.add(pool);
      }
    }

    const divider=new T.Mesh(boxGeo,basic(0xff2e93));
    divider.scale.set(.07,.025,CHUNK_LENGTH);
    divider.position.set(0,.025,-CHUNK_LENGTH/2);
    group.add(divider);

    scene.add(group);
    return {group,index};
  }

  for(let i=0;i<CHUNK_COUNT;i++) chunks.push(makeChunk(i));

  function positionChunks(worldZ) {
    const base=Math.floor(-worldZ/CHUNK_LENGTH)-2;
    chunks.forEach((chunk,i)=>{
      chunk.index=base+i;
      chunk.group.position.z=-chunk.index*CHUNK_LENGTH;
      chunk.group.visible=i<CHUNK_COUNT;
    });
  }

  /* VEHICLE MODELS */
  function makeWheel(x,z,group) {
    const wheel=new T.Mesh(wheelGeo,phong(0x090a10));
    wheel.position.set(x,.36,z);
    group.add(wheel);
    const hub=new T.Mesh(
      geo(new T.CylinderGeometry(.16,.16,.3,12)),
      phong(0xbac3d8,{shininess:120})
    );
    hub.rotation.z=Math.PI/2;
    hub.position.copy(wheel.position);
    group.add(hub);
    return wheel;
  }

  function buildPlayer(carIndex,paintIndex) {
    const car=CARS[carIndex];
    const paint=PAINTS[paintIndex][1];
    const group=new T.Group();
    const bodyMaterial=phong(new T.Color(paint).getHex(),{
      shininess:130,specular:0xaaaaaa
    });
    const glass=phong(0x090d1b,{shininess:220,specular:0xffffff});
    const body=new T.Mesh(boxGeo,bodyMaterial);
    body.scale.set(1.85,.52,4.3);
    body.position.y=.65;
    group.add(body);

    const bonnet=new T.Mesh(boxGeo,bodyMaterial);
    bonnet.scale.set(1.72,.22,1.45);
    bonnet.position.set(0,.93,-1.35);
    group.add(bonnet);

    const cabin=new T.Mesh(boxGeo,glass);
    cabin.scale.set(1.42,.68,1.95);
    cabin.position.set(0,1.13,.12);
    group.add(cabin);

    const roof=new T.Mesh(boxGeo,bodyMaterial);
    roof.scale.set(1.43,.1,1.8);
    roof.position.set(0,1.51,.12);
    group.add(roof);

    const front=new T.Mesh(boxGeo,basic(0xffffff));
    front.scale.set(1.3,.1,.07);
    front.position.set(0,.72,-2.19);
    group.add(front);

    const rear=new T.Mesh(boxGeo,basic(0xff203c));
    rear.scale.set(1.35,.12,.07);
    rear.position.set(0,.72,2.19);
    group.add(rear);

    const wheels=[];
    for(const x of [-.94,.94]) for(const z of [-1.42,1.42])
      wheels.push(makeWheel(x,z,group));

    const underglow=new T.Mesh(planeGeo,basic(new T.Color(paint).getHex(),{
      map:glowTexture,transparent:true,opacity:.65,
      blending:T.AdditiveBlending,depthWrite:false
    }));
    underglow.rotation.x=-Math.PI/2;
    underglow.scale.set(3.3,5.8,1);
    underglow.position.y=.08;
    group.add(underglow);

    const shadow=new T.Mesh(planeGeo,basic(0x000000,{
      map:glowTexture,transparent:true,opacity:.5,depthWrite:false
    }));
    shadow.rotation.x=-Math.PI/2;
    shadow.scale.set(3.2,5.4,1);
    shadow.position.y=.035;
    group.add(shadow);

    const headLight=new T.PointLight(0xd7eaff,1.4,28);
    headLight.position.set(0,.8,-2.5);
    group.add(headLight);

    return {group,wheels,bodyMaterial,underglow,headLight};
  }

  function buildTrafficCar(colour,truck) {
    const group=new T.Group();
    const body=new T.Mesh(boxGeo,phong(colour));
    body.scale.set(truck?2.3:1.8,truck?1.5:.58,truck?5.3:4.2);
    body.position.y=truck?1.15:.6;
    group.add(body);
    const cabin=new T.Mesh(boxGeo,phong(0x101321,{shininess:180}));
    cabin.scale.set(truck?2:1.45,truck?1.35:.48,truck?2.2:1.9);
    cabin.position.set(0,truck?2:.98,truck?-.5:.1);
    group.add(cabin);
    for(const x of [-1,1]) for(const z of [-1.35,1.35]) {
      const wheel=new T.Mesh(wheelGeo,phong(0x07080c));
      wheel.position.set(x*(truck?1.12:.92),.36,z*(truck?1.5:1));
      group.add(wheel);
    }
    return group;
  }

  function buildGate() {
    const group=new T.Group();
    for(const x of [-7,7]) {
      const post=new T.Mesh(boxGeo,basic(0x00e5ff));
      post.scale.set(.28,7,.3);
      post.position.set(x,3.5,0);
      group.add(post);
    }
    const top=new T.Mesh(boxGeo,basic(0xff2e93));
    top.scale.set(14,.3,.35);
    top.position.y=7;
    group.add(top);
    return group;
  }

  /* GAME STATE — continued in Part 2 */
  let state='garage';
  let player=null;
  let animationFrame=0;
  let lastFrame=0;
  let elapsed=0;
  let closed=false;
  let messageTimer=0;
  let traffic=[];
  let gates=[];
  let particles=[];
  let districtIndex=0;

  const game={
    x:0,z:0,speed:0,velocityX:0,steer:0,
    distance:0,score:0,driftScore:0,creditsEarned:0,
    health:100,lives:3,time:0,gateCount:0,
    invulnerable:0,shake:0,combo:0,comboTimer:0,
    driftTime:0,checkpoint:0
  };

  const keys={up:false,down:false,left:false,right:false,handbrake:false};
  const touch={gas:false,brake:false,left:false,right:false};
  let audio=null;
  let audioTimer=null;
  let currentDistrict=DISTRICTS[0];
  let currentPaint=profile.paint || 0;
  let playerModel=null;

  function makePlayer() {
    if(playerModel) {
      scene.remove(playerModel.group);
    }
    playerModel=buildPlayer(profile.selectedCar,currentPaint);
    player=playerModel.group;
    scene.add(player);
    player.position.set(game.x,0,game.z);
  }

  function disposeTraffic() {
    traffic.forEach(item=>scene.remove(item.mesh));
    traffic=[];
    gates.forEach(item=>scene.remove(item.mesh));
    gates=[];
  }

  function resetWorld() {
    disposeTraffic();
    Object.assign(game,{
      x:LANES[1],z:0,speed:0,velocityX:0,steer:0,
      distance:0,score:0,driftScore:0,creditsEarned:0,
      health:100,lives:MODES[profile.mode].lives || 3,
      time:MODES[profile.mode].time || 0,
      gateCount:0,invulnerable:0,shake:0,combo:0,
      comboTimer:0,driftTime:0,checkpoint:0
    });
    districtIndex=0;
    currentDistrict=DISTRICTS[0];
    scene.fog=new T.Fog(currentDistrict.fog,100,450);
    scene.background=new T.Color(currentDistrict.sky);
    positionChunks(0);
    makePlayer();
  }

  /* PART 2 CONTINUES HERE */ 
   /* AUDIO */
  function initAudio() {
    if(audio) {
      if(audio.context.state==='suspended') audio.context.resume();
      return;
    }
    const AudioContextClass=window.AudioContext || window.webkitAudioContext;
    if(!AudioContextClass) return;

    const context=new AudioContextClass();
    const master=context.createGain();
    master.gain.value=settings.sound?.45:0;
    master.connect(context.destination);

    const engineFilter=context.createBiquadFilter();
    engineFilter.type='lowpass';
    engineFilter.frequency.value=400;

    const engineGain=context.createGain();
    engineGain.gain.value=0;
    engineFilter.connect(engineGain);
    engineGain.connect(master);

    const engine1=context.createOscillator();
    const engine2=context.createOscillator();
    engine1.type='sawtooth';
    engine2.type='triangle';
    engine1.connect(engineFilter);
    engine2.connect(engineFilter);
    engine1.start();
    engine2.start();

    const musicGain=context.createGain();
    musicGain.gain.value=settings.music?.16:0;
    musicGain.connect(master);

    audio={context,master,engineFilter,engineGain,engine1,engine2,musicGain,next:0,step:0};
    if(settings.music) startMusic();
  }

  function startMusic() {
    if(!audio || audio.musicTimer) return;
    const notes=[57,60,64,67,69,67,64,60,55,59,62,67];
    audio.musicTimer=setInterval(()=>{
      if(!audio || !settings.music || state==='paused' || state==='garage') return;
      const ctx=audio.context;
      if(ctx.state!=='running') return;
      const now=ctx.currentTime;
      const note=notes[audio.step++%notes.length];
      const osc=ctx.createOscillator();
      const gain=ctx.createGain();
      osc.type='triangle';
      osc.frequency.value=440*Math.pow(2,(note-69)/12);
      gain.gain.setValueAtTime(.0001,now);
      gain.gain.exponentialRampToValueAtTime(.09,now+.025);
      gain.gain.exponentialRampToValueAtTime(.0001,now+.38);
      osc.connect(gain);
      gain.connect(audio.musicGain);
      osc.start(now);
      osc.stop(now+.4);
    },300);
  }

  function applyAudio() {
    if(!audio) return;
    const now=audio.context.currentTime;
    audio.master.gain.setTargetAtTime(settings.sound?.45:0,now,.08);
    audio.musicGain.gain.setTargetAtTime(settings.music?.16:0,now,.12);
    if(settings.music) startMusic();
  }

  function updateAudio() {
    if(!audio) return;
    const ctx=audio.context;
    const now=ctx.currentTime;
    const speed=game.speed;
    const accelerating=keys.up||touch.gas;
    const running=state==='driving';
    audio.engine1.frequency.setTargetAtTime(38+speed*2.2,now,.06);
    audio.engine2.frequency.setTargetAtTime(22+speed*1.2,now,.06);
    audio.engineFilter.frequency.setTargetAtTime(250+speed*17+(accelerating?250:0),now,.1);
    audio.engineGain.gain.setTargetAtTime(running?.035+speed*.0007:0,now,.12);
  }

  function soundTone(frequency,duration,type) {
    if(!audio || !settings.sound) return;
    const ctx=audio.context;
    const osc=ctx.createOscillator();
    const gain=ctx.createGain();
    osc.type=type||'sine';
    osc.frequency.setValueAtTime(frequency,ctx.currentTime);
    gain.gain.setValueAtTime(.15,ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+duration);
    osc.connect(gain);
    gain.connect(audio.master);
    osc.start();
    osc.stop(ctx.currentTime+duration+.02);
  }

  function crashSound() {
    soundTone(95,.25,'sawtooth');
    setTimeout(()=>soundTone(55,.18,'square'),65);
  }

  function message(text) {
    ui.message.textContent=text;
    ui.message.classList.remove('nd3-hidden');
    clearTimeout(messageTimer);
    messageTimer=setTimeout(()=>{
      ui.message.classList.add('nd3-hidden');
    },1500);
  }

  function formatDistance(value) {
    return value>=1000?(value/1000).toFixed(2)+' km':Math.floor(value)+' m';
  }

  function saveProfile() {
    profile.paint=currentPaint;
    profile.quality=settings.quality;
    save.set('profile',profile);
    save.set('settings',settings);
  }

  function addXP(amount) {
    profile.xp+=amount;
    let required=profile.level*500;
    while(profile.xp>=required) {
      profile.xp-=required;
      profile.level++;
      profile.credits+=250;
      required=profile.level*500;
      message('LEVEL UP · LEVEL '+profile.level);
      soundTone(660,.2);
      setTimeout(()=>soundTone(880,.3),130);
    }
    saveProfile();
  }

  function awardCredits(amount) {
    const earned=Math.max(0,Math.floor(amount));
    profile.credits+=earned;
    game.creditsEarned+=earned;
    saveProfile();
  }

  function unlockAchievement(id,title,reward) {
    if(profile.achievements.includes(id)) return;
    profile.achievements.push(id);
    profile.credits+=reward||100;
    message('ACHIEVEMENT · '+title);
    addXP(100);
    saveProfile();
  }

  function checkAchievements() {
    if(game.distance>=1000) unlockAchievement('one-km','First Kilometre',100);
    if(game.distance>=5000) unlockAchievement('five-km','Road Explorer',250);
    if(game.score>=1000) unlockAchievement('score-1k','Rising Driver',150);
    if(game.driftScore>=500) unlockAchievement('drift-500','Slide Artist',200);
    if(profile.level>=5) unlockAchievement('level-five','Street Legend',500);
  }

  function updateDistrict() {
    const next=Math.floor(game.distance/2500)%DISTRICTS.length;
    if(next===districtIndex) return;
    districtIndex=next;
    currentDistrict=DISTRICTS[next];
    scene.fog.color.setHex(currentDistrict.fog);
    scene.background=new T.Color(currentDistrict.sky);
    message(currentDistrict.name);
  }

  /* TRAFFIC AND OBJECTS */
  function spawnTraffic() {
    const mode=MODES[profile.mode];
    const maxTraffic=quality===0?16:quality===1?11:7;
    if(traffic.length>=maxTraffic) return;

    const lane=Math.floor(Math.random()*LANES.length);
    const x=LANES[lane];
    const z=game.z-rand(190,330);

    if(traffic.some(t=>Math.abs(t.x-x)<2.6 && Math.abs(t.z-z)<32)) return;

    const truck=Math.random()<.12;
    const colour=pick([0xff526f,0x4d91ff,0xe7e5ef,0x9b6dff,0xffbd4b,0x35d8a0]);
    const mesh=buildTrafficCar(colour,truck);
    mesh.position.set(x,0,z);
    scene.add(mesh);

    const baseSpeed=truck?rand(12,19):rand(17,31);
    traffic.push({
      mesh,x,z,speed:baseSpeed,
      width:truck?1.25:.95,
      length:truck?3.3:2.1,
      passed:false,hit:false,
      lateral:0,truck
    });
  }

  function spawnGate(distance) {
    const mesh=buildGate();
    mesh.position.set(0,0,-distance);
    scene.add(mesh);
    gates.push({mesh,distance,passed:false});
  }

  function createSparks(x,z) {
    for(let i=0;i<12;i++) {
      const particle=new T.Mesh(
        geo(new T.SphereGeometry(.045,5,5)),
        basic(pick([0xffcf66,0xff2e93,0x00d9ff]))
      );
      particle.position.set(x+rand(-.6,.6),rand(.3,1.3),z);
      scene.add(particle);
      particles.push({
        mesh:particle,
        vx:rand(-5,5),
        vy:rand(1,6),
        vz:rand(-5,5),
        life:rand(.25,.65)
      });
    }
  }

  function removeTraffic() {
    for(let i=traffic.length-1;i>=0;i--) {
      const item=traffic[i];
      if(item.z>game.z+45 || item.z<game.z-650) {
        scene.remove(item.mesh);
        traffic.splice(i,1);
      }
    }
  }

  function collision(kind) {
    if(game.invulnerable>0) return;
    game.invulnerable=1.15;
    game.shake=1;
    game.speed*=.43;
    createSparks(game.x,game.z);
    crashSound();

    if(MODES[profile.mode].damage) {
      if(profile.mode==='traffic') {
        game.lives--;
        message('COLLISION · '+Math.max(0,game.lives)+' LIVES LEFT');
        if(game.lives<=0) finish(false,'OUT OF LIVES');
      } else {
        game.health-=kind==='wall'?12:28;
        message(kind==='wall'?'WALL SCRAPE':'COLLISION');
        if(game.health<=0) finish(false,'VEHICLE DAMAGED');
      }
    } else {
      message('CONTACT');
    }

    if(navigator.vibrate) {
      try { navigator.vibrate(55); } catch (_) {}
    }
  }

  function checkTraffic() {
    for(let i=traffic.length-1;i>=0;i--) {
      const item=traffic[i];
      const dz=item.z-game.z;
      const dx=item.x-game.x;

      if(!item.hit && game.invulnerable<=0 &&
        Math.abs(dz)<item.length+1.2 &&
        Math.abs(dx)<item.width+0.75) {
        item.hit=true;
        item.lateral=dx>=0?4:-4;
        collision('traffic');
        if(state!=='driving') return;
      }

      if(!item.passed && dz>0 && dz<9 && Math.abs(dx)<3.1) {
        item.passed=true;
        if(profile.mode!=='free') {
          const bonus=Math.round(25+game.speed*1.1);
          game.score+=bonus;
          game.combo++;
          game.comboTimer=3;
          awardCredits(2);
          if(game.combo>=3) message('NEAR MISS · COMBO x'+game.combo);
          else message('NEAR MISS +'+bonus);
        }
      }

      item.z+=item.speed*.12*(1/60);
      item.z-=item.speed*(1/60);
      item.x+=item.lateral*(1/60);
      item.mesh.position.set(item.x,0,item.z);
    }
    removeTraffic();
  }

  function checkGates() {
    const mode=MODES[profile.mode];
    if(!mode.goal) return;

    const next=(game.gateCount+1)*1000;
    if(next<=mode.goal && game.distance>next-220 &&
      !gates.some(g=>g.distance===next)) {
      spawnGate(next);
    }

    for(const gate of gates) {
      if(!gate.passed && game.distance>=gate.distance) {
        gate.passed=true;
        game.gateCount++;
        soundTone(700,.2);
        if(profile.mode==='trial') {
          game.time+=12;
          message('CHECKPOINT · +12 SECONDS');
        } else {
          message('CHECKPOINT '+game.gateCount);
          awardCredits(50);
          addXP(50);
        }
      }
    }

    if(game.distance>=mode.goal) {
      finish(true,'FINISH LINE REACHED');
    }
  }

  /* DRIVING PHYSICS */
  function drive(dt) {
    const car=CARS[profile.selectedCar];
    const mode=MODES[profile.mode];
    const accelerating=keys.up||touch.gas;
    const braking=keys.down||touch.brake;
    const steering=(keys.right||touch.right?1:0)-(keys.left||touch.left?1:0);
    const handbrake=keys.handbrake;

    const maxSpeed=car.speed/3.6;
    const acceleration=car.accel*.42;
    const brakePower=braking?19:0;
    const drag=accelerating?0:2.5;
    const handbrakePower=handbrake?13:0;

    game.steer=damp(game.steer,steering,8,dt);

    game.speed=clamp(
      game.speed+(accelerating?acceleration:0)*dt-
      (brakePower+drag+handbrakePower)*dt,
      0,maxSpeed
    );

    const speedFactor=clamp(game.speed/7,0,1);
    const grip=car.grip*(handbrake?.56:1);
    const desiredVelocity=game.steer*10.5*grip*speedFactor;
    game.velocityX=damp(game.velocityX,desiredVelocity,handbrake?2.8:7.5,dt);
    game.x+=game.velocityX*dt;
    game.z-=game.speed*dt;
    game.distance=-game.z;

    if(game.invulnerable>0) game.invulnerable-=dt;
    if(game.comboTimer>0) game.comboTimer-=dt;
    else game.combo=0;

    const roadLimit=ROAD_WIDTH/2-1.15;
    if(Math.abs(game.x)>roadLimit) {
      const side=Math.sign(game.x);
      game.x=side*roadLimit;
      game.velocityX=-side*Math.abs(game.velocityX)*.3;
      game.speed*=.97;
      if(mode.damage && game.invulnerable<=0 && game.speed>8)
        collision('wall');
    }

    /* Drifting rewards */
    const lateral= Math.abs(game.velocityX);
    const drifting=handbrake && game.speed>9 && lateral>1.3;
    if(drifting && profile.mode!=='free') {
      const points=Math.round(lateral*game.speed*dt*1.5);
      game.driftScore+=points;
      game.score+=points;
      game.driftTime+=dt;
      if(game.driftTime>1.2 && Math.floor(game.driftTime*2)%3===0)
        message('DRIFT +' + points);
    } else {
      game.driftTime=Math.max(0,game.driftTime-dt*2);
    }

    /* Distance and score */
    if(profile.mode==='endless' || profile.mode==='race' ||
      profile.mode==='trial' || profile.mode==='checkpoint' ||
      profile.mode==='traffic') {
      game.score+=game.speed*dt*.55;
    }

    /* Spawn traffic */
    game.spawnTimer=(game.spawnTimer||0)-dt;
    if(game.spawnTimer<=0) {
      spawnTraffic();
      game.spawnTimer=rand(.45,1.1)/mode.traffic;
    }

    checkTraffic();
    if(state!=='driving') return;

    checkGates();
    if(state!=='driving') return;

    if(profile.mode==='trial' || profile.mode==='race') {
      game.time-=dt;
      if(game.time<=0) {
        game.time=0;
        finish(false,'TIME EXPIRED');
        return;
      }
    }

    updateDistrict();

    /* Car animation */
    const speedRatio=game.speed/maxSpeed;
    player.rotation.y=-game.velocityX*.025;
    player.rotation.z=-game.steer*.055*speedRatio;
    player.position.set(game.x,Math.sin(elapsed*game.speed*.5)*.018,game.z);

    playerModel.wheels.forEach(wheel=>{
      wheel.rotation.x-=game.speed*dt*2.2;
    });

    playerLight.position.set(game.x,3,game.z+2);
    playerModel.headLight.intensity=1.1+speedRatio*.6;

    /* Camera follows smoothly */
    const cameraTarget=new T.Vector3(
      game.x*.48,3.1+speedRatio*.35,game.z+8.5+speedRatio*1.7
    );
    camera.position.lerp(cameraTarget,1-Math.exp(-5*dt));
    camera.lookAt(game.x*.35,1.05,game.z-12);

    camera.fov=damp(camera.fov,65+speedRatio*12,3,dt);
    camera.updateProjectionMatrix();

    game.shake=Math.max(0,game.shake-dt*2);
    updateHUD();
    checkAchievements();
  }

  function updateHUD() {
    const mode=MODES[profile.mode];
    $('.distance').textContent=formatDistance(game.distance);
    $('.score').textContent=Math.floor(game.score).toLocaleString();
    $('.credits').textContent=profile.credits.toLocaleString();
    $('.speed').textContent=Math.round(game.speed*3.6);

    let objective=mode.objective;
    if(profile.mode==='trial' || profile.mode==='race')
      objective=Math.ceil(game.time)+'s';
    else if(profile.mode==='traffic')
      objective='♥ '.repeat(Math.max(0,game.lives));
    else if(profile.mode==='endless')
      objective='INTEGRITY '+Math.max(0,Math.ceil(game.health))+'%';
    else if(profile.mode==='drift')
      objective=Math.floor(game.driftScore)+' DRIFT';

    $('.objective').textContent=objective;
    drawMinimap();
  }

  function drawMinimap() {
    const canvas=ui.map;
    const ctx=canvas.getContext('2d');
    const w=canvas.width,h=canvas.height;
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle='rgba(8,6,18,.92)';
    ctx.fillRect(0,0,w,h);

    ctx.strokeStyle='rgba(255,255,255,.18)';
    ctx.lineWidth=2;
    ctx.beginPath();
    ctx.moveTo(w/2,0);ctx.lineTo(w/2,h);ctx.stroke();

    ctx.strokeStyle='#ff2e93';
    ctx.lineWidth=18;
    ctx.beginPath();
    ctx.moveTo(w/2,0);ctx.lineTo(w/2,h);ctx.stroke();

    ctx.strokeStyle='#f6eaff';
    ctx.lineWidth=2;
    ctx.setLineDash([8,9]);
    for(const x of [w*.25,w*.75]) {
      ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();
    }
    ctx.setLineDash([]);

    ctx.fillStyle='#00e5ff';
    ctx.beginPath();
    ctx.arc(w/2+game.x*4, h*.76, 7,0,Math.PI*2);
    ctx.fill();

    ctx.fillStyle='#ffb52e';
    traffic.forEach(item=>{
      const dz=item.z-game.z;
      if(dz<0 && dz>-100) {
        const y=h*.76+dz*1.25;
        const x=w/2+item.x*4;
        ctx.fillRect(x-3,y-3,6,6);
      }
    });
  }

  /* PARTICLES */
  function updateParticles(dt) {
    for(let i=particles.length-1;i>=0;i--) {
      const p=particles[i];
      p.life-=dt;
      p.mesh.position.x+=p.vx*dt;
      p.mesh.position.y+=p.vy*dt;
      p.mesh.position.z+=p.vz*dt;
      p.vy-=8*dt;
      p.mesh.scale.multiplyScalar(.98);
      if(p.life<=0) {
        scene.remove(p.mesh);
        particles.splice(i,1);
      }
    }
  }

  function finish(won,reason) {
    if(state==='finished') return;
    state='finished';
    keys.up=keys.down=keys.left=keys.right=keys.handbrake=false;
    touch.gas=touch.brake=touch.left=touch.right=false;

    const mode=profile.mode;
    const finalScore=Math.floor(game.score+game.driftScore);
    const previous=profile.best[mode]||0;
    const best=Math.max(previous,finalScore);
    profile.best[mode]=best;

    const reward=Math.max(0,Math.floor(game.distance/100)+
      Math.floor(finalScore/100)+(won?250:0));
    awardCredits(reward);
    addXP(Math.floor(game.distance/20)+(won?250:50));

    $('.result-title').textContent=won?'VICTORY':'DRIVE OVER';
    $('.result-details').textContent=
      reason+' · Distance '+formatDistance(game.distance)+
      ' · Score '+finalScore.toLocaleString()+
      ' · Earned '+reward+' credits'+
      (best===finalScore?' · NEW PERSONAL BEST':' · Best '+best.toLocaleString());

    ui.result.classList.remove('nd3-hidden');
    ui.touch.classList.add('nd3-hidden');
    updateHUD();
    saveProfile();
  }

  /* GAME LOOP */
  function resetDrive() {
    resetWorld();
    ui.result.classList.add('nd3-hidden');
    ui.pause.classList.add('nd3-hidden');
    ui.panel.classList.add('nd3-hidden');
    ui.hud.classList.remove('nd3-hidden');
    ui.touch.classList.toggle('nd3-hidden',!isTouchDevice());
    state='countdown';
    game.countdown=3;
    game.spawnTimer=.8;
    message('3');
    startLoop();
  }

  function isTouchDevice() {
    return navigator.maxTouchPoints>0 ||
      window.matchMedia('(pointer:coarse)').matches;
  }

  function pauseGame() {
    if(state!=='driving' && state!=='countdown') return;
    state='paused';
    keys.up=keys.down=keys.left=keys.right=keys.handbrake=false;
    ui.pause.classList.remove('nd3-hidden');
    ui.touch.classList.add('nd3-hidden');
    stopLoop();
    render();
  }

  function resumeGame() {
    if(state!=='paused') return;
    state='driving';
    ui.pause.classList.add('nd3-hidden');
    ui.touch.classList.toggle('nd3-hidden',!isTouchDevice());
    startLoop();
  }

  function startLoop() {
    if(animationFrame || closed) return;
    lastFrame=performance.now();
    animationFrame=requestAnimationFrame(frame);
  }

  function stopLoop() {
    if(animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame=0;
  }

  function frame(now) {
    animationFrame=requestAnimationFrame(frame);
    const dt=Math.min((now-lastFrame)/1000,.05);
    lastFrame=now;
    elapsed+=dt;

    try {
      if(state==='countdown') {
        game.countdown-=dt;
        const number=Math.ceil(game.countdown);
        if(number>0) {
          if(ui.message.textContent!==String(number)) message(String(number));
        } else {
          state='driving';
          ui.message.textContent='GO!';
          setTimeout(()=>{
            if(state==='driving') ui.message.classList.add('nd3-hidden');
          },650);
        }
      } else if(state==='driving') {
        drive(dt);
      } else if(state==='garage') {
        if(player) {
          player.rotation.y+=dt*.45;
          const angle=elapsed*.3+.7;
          camera.position.set(Math.sin(angle)*8,3,Math.cos(angle)*8);
          camera.lookAt(0,.8,0);
        }
      }

      updateParticles(dt);
      updateAudio();
      sky.position.copy(camera.position);
      stars.position.copy(camera.position);
      render();
    } catch(error) {
      console.error('[NEON DRIVE FRAME]',error);
      pauseGame();
      notify('A game error occurred. You can restart the drive.');
    }
  }

  function render() {
    renderer.render(scene,camera);
  }

  function resize() {
    const width=window.innerWidth;
    const height=window.innerHeight;
    renderer.setSize(width,height,false);
    camera.aspect=width/height;
    camera.updateProjectionMatrix();
  }

  function applyQuality() {
    const pixelRatio=Math.min(
      window.devicePixelRatio||1,
      quality===0?1.75:quality===1?1.25:1
    );
    renderer.setPixelRatio(pixelRatio);
    resize();
    scene.fog.far=quality===0?450:quality===1?360:280;
    stars.visible=quality<2;
  }

  /* PART 3 CONTINUES HERE */
   /* GARAGE AND CUSTOMISATION */

  function selectedCar() {
    return CARS[profile.selectedCar];
  }

  function updateGarage() {
    const car=selectedCar();
    const owned=profile.owned.includes(profile.selectedCar);
    const paint=PAINTS[currentPaint];

    $('.nd3-carname').textContent=car.name;
    $('.nd3-carinfo').textContent=car.type+' CLASS · '+car.speed+' KM/H TOP SPEED';

    const stats=[
      ['TOP SPEED',car.speed/105],
      ['ACCELERATION',car.accel/34],
      ['HANDLING',car.handling/100]
    ];

    $('.nd3-stats').innerHTML=stats.map(item=>
      '<div class="nd3-stat">'+item[0]+
      '<i style="--v:'+Math.round(clamp(item[1],0,1)*100)+'%"></i></div>'
    ).join('');

    $('.car-price').textContent=owned
      ? 'OWNED VEHICLE · '+paint[0]+' PAINT'
      : 'LOCKED VEHICLE · '+car.price.toLocaleString()+' CREDITS';

    $('.start').textContent=owned?'START ENGINE':'BUY VEHICLE · '+car.price.toLocaleString();

    $$('.nd3-colours').forEach(container=>{
      container.innerHTML='';
      PAINTS.forEach((item,index)=>{
        const button=document.createElement('button');
        button.className='nd3-colour'+(index===currentPaint?' selected':'');
        button.style.background=item[1];
        button.title=item[0];
        button.setAttribute('aria-label',item[0]);
        button.addEventListener('click',()=>{
          currentPaint=index;
          profile.paint=index;
          saveProfile();
          updateGarage();
          makePlayer();
        });
        container.appendChild(button);
      });
    });

    $('.profile-summary').textContent=
      'LEVEL '+profile.level+
      ' · '+profile.xp+' XP'+
      ' · '+profile.credits.toLocaleString()+' CREDITS'+
      ' · '+profile.achievements.length+' ACHIEVEMENTS';

    $('.quality').value=String(settings.quality);
    $('.sound').checked=!!settings.sound;
    $('.music').checked=!!settings.music;
  }

  function updateModes() {
    const container=$('.nd3-modes');
    container.innerHTML='';

    Object.entries(MODES).forEach(([id,mode])=>{
      const button=document.createElement('button');
      button.className='nd3-btn'+(profile.mode===id?' selected':'');
      button.textContent=mode.name;
      button.addEventListener('click',()=>{
        profile.mode=id;
        saveProfile();
        updateModes();
        $('.mode-description').textContent=mode.description;
      });
      container.appendChild(button);
    });

    $('.mode-description').textContent=MODES[profile.mode].description;
  }

  function purchaseOrStart() {
    const car=selectedCar();
    const owned=profile.owned.includes(profile.selectedCar);

    if(!owned) {
      if(profile.credits<car.price) {
        message('NOT ENOUGH CREDITS');
        return;
      }
      profile.credits-=car.price;
      profile.owned.push(profile.selectedCar);
      saveProfile();
      updateGarage();
      message(car.name+' UNLOCKED');
      soundTone(750,.25);
      return;
    }

    initAudio();
    if(audio && audio.context.state==='suspended') audio.context.resume();
    applyAudio();
    resetDrive();
  }

  function cycleCar(direction) {
    let next=profile.selectedCar;
    next=(next+direction+CARS.length)%CARS.length;
    profile.selectedCar=next;
    saveProfile();
    updateGarage();
    makePlayer();
  }

  /* INPUT AND EVENT CLEANUP */

  const removers=[];

  function listen(target,event,handler,options) {
    target.addEventListener(event,handler,options);
    removers.push(()=>target.removeEventListener(event,handler,options));
  }

  function clearControls() {
    Object.keys(keys).forEach(key=>keys[key]=false);
    Object.keys(touch).forEach(key=>touch[key]=false);
    $$('.nd3-touch button').forEach(button=>button.classList.remove('active'));
  }

  const keyMap={
    ArrowUp:'up',KeyW:'up',
    ArrowDown:'down',KeyS:'down',
    ArrowLeft:'left',KeyA:'left',
    ArrowRight:'right',KeyD:'right',
    Space:'handbrake'
  };

  listen(window,'keydown',event=>{
    if(closed) return;

    const key=event.code;
    const target=event.target;
    const editing=target && (
      target.tagName==='INPUT' ||
      target.tagName==='SELECT' ||
      target.tagName==='TEXTAREA' ||
      target.isContentEditable
    );

    if(editing) return;

    const control=keyMap[key];

    if(control) {
      if(state==='driving' || state==='countdown') {
        keys[control]=true;
        event.preventDefault();
      }
      return;
    }

    if(key==='Escape' || key==='KeyP') {
      if(state==='driving' || state==='countdown') pauseGame();
      else if(state==='paused') resumeGame();
      else if(state==='garage') close();
      event.preventDefault();
      return;
    }

    if(key==='KeyR' && (state==='driving' || state==='finished')) {
      resetDrive();
      event.preventDefault();
    }
  },true);

  listen(window,'keyup',event=>{
    const control=keyMap[event.code];
    if(control) keys[control]=false;
  },true);

  listen(window,'blur',()=>{
    clearControls();
    if(state==='driving' || state==='countdown') pauseGame();
  });

  $$('.nd3-touch button').forEach(button=>{
    const control=button.dataset.control;

    const set=(value,event)=>{
      if(event) event.preventDefault();
      touch[control]=value;
      button.classList.toggle('active',value);
    };

    listen(button,'pointerdown',event=>{
      set(true,event);
      try { button.setPointerCapture(event.pointerId); } catch (_) {}
    });

    ['pointerup','pointercancel','lostpointercapture'].forEach(type=>{
      listen(button,type,event=>set(false,event));
    });

    listen(button,'contextmenu',event=>event.preventDefault());
  });

  /* BUTTON ACTIONS */

  listen(root,'click',event=>{
    const button=event.target.closest('button');
    if(!button) return;

    if(button.classList.contains('car-prev')) {
      cycleCar(-1);
    } else if(button.classList.contains('car-next')) {
      cycleCar(1);
    } else if(button.classList.contains('start')) {
      purchaseOrStart();
    } else if(button.classList.contains('exit') ||
              button.classList.contains('leave')) {
      close();
    } else if(button.classList.contains('pause')) {
      pauseGame();
    } else if(button.classList.contains('resume')) {
      resumeGame();
    } else if(button.classList.contains('restart')) {
      resetDrive();
    } else if(button.classList.contains('garage')) {
      returnToGarage();
    }
  });

  function returnToGarage() {
    state='garage';
    stopLoop();
    clearControls();

    ui.hud.classList.add('nd3-hidden');
    ui.pause.classList.add('nd3-hidden');
    ui.result.classList.add('nd3-hidden');
    ui.touch.classList.add('nd3-hidden');
    ui.panel.classList.remove('nd3-hidden');

    resetWorld();
    updateGarage();
    updateModes();
    applyQuality();
    startLoop();

    const startButton=$('.start');
    if(startButton) startButton.focus();
  }

  /* SETTINGS */

  listen($('.quality'),'change',event=>{
    settings.quality=event.target.value;
    quality=settings.quality==='auto'
      ? (lowDevice?1:0)
      : clamp(+settings.quality,0,2);
    applyQuality();
    saveProfile();
  });

  listen($('.sound'),'change',event=>{
    settings.sound=event.target.checked;
    saveProfile();
    initAudio();
    applyAudio();
  });

  listen($('.music'),'change',event=>{
    settings.music=event.target.checked;
    saveProfile();
    initAudio();
    applyAudio();
  });

  /* WINDOW AND GRAPHICS EVENTS */

  listen(window,'resize',()=>{
    resize();
    render();
  });

  listen(document,'visibilitychange',()=>{
    if(document.hidden) {
      clearControls();
      if(state==='driving' || state==='countdown') pauseGame();
      stopLoop();
    } else if(!closed && state!=='paused' && state!=='finished') {
      startLoop();
    }
  });

  listen(canvas,'webglcontextlost',event=>{
    event.preventDefault();
    close();
    notify('Graphics context lost. Reopen NEON DRIVE to try again.');
  });

  /* GAME WORLD MAINTENANCE */

  const worldTimer=setInterval(()=>{
    if(closed) return;

    if(state==='driving' || state==='countdown') {
      positionChunks(game.z);

      /* Drift challenge has a clear target. */
      if(state==='driving' && profile.mode==='drift' &&
         game.driftScore>=2500) {
        finish(true,'DRIFT TARGET COMPLETED');
      }

      /* Keep the HUD and saved progress current. */
      if(state==='driving') {
        updateHUD();
      }
    }
  },250);

  /* STARTUP */

  function boot() {
    if(!MODES[profile.mode]) profile.mode='free';

    profile.selectedCar=clamp(
      Math.floor(profile.selectedCar||0),0,CARS.length-1
    );

    if(!profile.owned.includes(profile.selectedCar))
      profile.selectedCar=0;

    currentPaint=clamp(
      Math.floor(currentPaint||0),0,PAINTS.length-1
    );

    updateModes();
    updateGarage();
    applyQuality();
    resetWorld();

    state='garage';
    ui.panel.classList.remove('nd3-hidden');
    ui.hud.classList.add('nd3-hidden');
    ui.touch.classList.add('nd3-hidden');

    startLoop();

    setTimeout(()=>{
      if(!closed) $('.start').focus();
    },100);
  }

  /* FULL CLEANUP */

  function destroy() {
    if(closed) return;
    closed=true;

    stopLoop();
    clearInterval(worldTimer);
    clearTimeout(messageTimer);
    clearControls();

    removers.forEach(remove=> {
      try { remove(); } catch (_) {}
    });

    if(audio) {
      if(audio.musicTimer) clearInterval(audio.musicTimer);
      try { audio.engine1.stop(); } catch (_) {}
      try { audio.engine2.stop(); } catch (_) {}
      try { audio.context.close(); } catch (_) {}
      audio=null;
    }

    scene.traverse(object=>{
      if(object.geometry) object.geometry.dispose();
    });

    disposables.geometries.forEach(item=>{
      try { item.dispose(); } catch (_) {}
    });

    disposables.materials.forEach(item=>{
      try { item.dispose(); } catch (_) {}
    });

    disposables.textures.forEach(item=>{
      try { item.dispose(); } catch (_) {}
    });

    renderer.dispose();
    try { renderer.forceContextLoss(); } catch (_) {}

    root.remove();
    style.remove();

    originalSiblings.forEach(element=>{
      if(element !== root && element.__nd3Inert !== undefined) {
        element.inert=element.__nd3Inert;
        delete element.__nd3Inert;
      }
    });

    document.documentElement.style.overflow=previousOverflow;
    document.body.style.overflow=previousBodyOverflow;

    try {
      if(previousFocus && previousFocus.focus) previousFocus.focus();
    } catch (_) {}
  }

  boot();

  return {close:destroy};
}

})();
