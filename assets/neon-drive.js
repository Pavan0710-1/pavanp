
/* ============================================================
   NEON DRIVE — 3D OPEN CITY DRIVING
   Self-contained game for pavanp.me
   Three.js r128 loaded on demand.
   API: NeonDrive.open(), NeonDrive.close(), NeonDrive.isOpen()
   ============================================================ */

(function () {
'use strict';

if (window.NeonDrive) return;

const THREE_URL =
'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';

let game = null;
let loading = false;

const DEFAULTS = {
  quality: 'high',
  shadows: true,
  weather: 'clear',
  time: 'sunset',
  camera: 'chase',
  fov: 72,
  sensitivity: 1,
  volume: 0.35,
  music: false,
  traffic: true,
  particles: true,
  minimap: true
};

function settingsLoad() {
  try {
    return Object.assign({}, DEFAULTS,
      JSON.parse(localStorage.getItem('nd-pro-settings') || '{}'));
  } catch (e) {
    return Object.assign({}, DEFAULTS);
  }
}

function settingsSave(s) {
  try {
    localStorage.setItem('nd-pro-settings', JSON.stringify(s));
  } catch (e) {}
}

function loadThree() {
  return new Promise((resolve, reject) => {
    if (window.THREE) return resolve();

    const existing = document.querySelector(
      'script[data-neon-three]'
    );

    if (existing) {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = THREE_URL;
    script.dataset.neonThree = 'true';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

const CSS = `
#nd-root {
  position:fixed;inset:0;z-index:999999;
  background:#050810;color:#fff;
  font-family:Inter,system-ui,-apple-system,sans-serif;
  overflow:hidden;
}
#nd-root * {box-sizing:border-box}
#nd-canvas {position:absolute;inset:0;width:100%;height:100%}
.nd-screen {
  position:absolute;inset:0;display:flex;
  align-items:center;justify-content:center;
  background:linear-gradient(110deg,rgba(3,7,17,.96),rgba(5,10,25,.65));
  padding:24px;overflow:auto;
}
.nd-panel {
  width:min(100%,1050px);max-height:92vh;overflow:auto;
  background:rgba(9,15,29,.94);
  border:1px solid rgba(255,255,255,.12);
  border-radius:18px;padding:clamp(20px,4vw,42px);
  box-shadow:0 30px 100px #0009;
  backdrop-filter:blur(18px);
}
.nd-brand {
  font-size:clamp(38px,8vw,82px);
  font-weight:950;letter-spacing:-.075em;
  line-height:.9;margin:0;
}
.nd-brand span {color:#42d9ff}
.nd-kicker {
  color:#52dfff;text-transform:uppercase;
  letter-spacing:.2em;font-size:11px;font-weight:800;
}
.nd-subtitle {color:#a8b4c9;line-height:1.7}
.nd-actions {display:flex;flex-wrap:wrap;gap:10px;margin-top:25px}
.nd-btn {
  appearance:none;border:1px solid #ffffff24;
  background:#ffffff0c;color:#fff;border-radius:9px;
  padding:13px 19px;font-size:13px;font-weight:800;
  cursor:pointer;transition:.2s;
}
.nd-btn:hover {background:#ffffff20;transform:translateY(-2px)}
.nd-primary {
  color:#001018;background:#46dfff;
  border-color:#46dfff;
}
.nd-primary:hover {background:#8cecff}
.nd-grid {
  display:grid;grid-template-columns:repeat(3,minmax(0,1fr));
  gap:12px;margin-top:22px;
}
.nd-option {
  background:#ffffff08;border:1px solid #ffffff15;
  border-radius:12px;padding:17px;min-width:0;
}
.nd-option h3 {font-size:14px;margin:0 0 7px}
.nd-option p {font-size:12px;color:#9cabc1;line-height:1.5;margin:0}
.nd-option button {margin-top:12px}
.nd-heading {font-size:23px;letter-spacing:-.04em;margin:0 0 8px}
.nd-field {
  display:flex;align-items:center;justify-content:space-between;
  gap:14px;padding:12px 0;border-bottom:1px solid #ffffff12;
  font-size:13px;
}
.nd-field label {color:#dbe6f7}
.nd-field select,.nd-field input {
  max-width:170px;background:#111c30;color:white;
  border:1px solid #ffffff25;border-radius:7px;
  padding:9px;font:inherit;
}
.nd-field input[type=range] {padding:0}
.nd-hud {
  position:absolute;inset:0;pointer-events:none;
  padding:20px;display:none;
}
.nd-hud-top {
  display:flex;justify-content:space-between;align-items:flex-start;
}
.nd-hud-card {
  background:#07101dcc;border:1px solid #ffffff20;
  border-radius:11px;padding:12px 16px;
  backdrop-filter:blur(10px);
}
.nd-speed {
  font-size:42px;font-weight:900;letter-spacing:-.06em;
  font-variant-numeric:tabular-nums;
}
.nd-small {font-size:10px;color:#9eafc8;letter-spacing:.15em}
.nd-hud-bottom {
  position:absolute;bottom:20px;left:20px;right:20px;
  display:flex;justify-content:space-between;align-items:flex-end;
}
.nd-hud button {pointer-events:auto}
.nd-progress {
  height:5px;background:#ffffff20;border-radius:5px;
  overflow:hidden;margin-top:7px;
}
.nd-progress span {display:block;height:100%;background:#45dcff;width:0}
.nd-touch {
  position:absolute;bottom:25px;left:0;right:0;
  display:none;justify-content:space-between;padding:0 22px;
  pointer-events:none;
}
.nd-touch-group {display:flex;gap:12px;align-items:flex-end}
.nd-touch button {
  pointer-events:auto;width:64px;height:64px;border-radius:50%;
  background:#081326a8;border:1px solid #ffffff50;
  color:white;font-size:20px;font-weight:900;
  touch-action:none;
}
.nd-touch .nd-wide {width:76px;height:76px}
.nd-close {
  position:absolute;top:16px;right:18px;
  background:#ffffff15;border:1px solid #ffffff30;
  color:white;border-radius:8px;padding:9px 13px;
  cursor:pointer;z-index:5;
}
.nd-note {font-size:11px;color:#91a0b8;line-height:1.6}
.nd-hidden {display:none!important}
@media(max-width:700px) {
  .nd-grid {grid-template-columns:1fr 1fr}
  .nd-hud {padding:10px}
  .nd-hud-bottom {bottom:105px;left:10px;right:10px}
  .nd-touch {display:flex}
  .nd-speed {font-size:32px}
  .nd-panel {padding:20px}
}
@media(max-width:420px) {
  .nd-grid {grid-template-columns:1fr}
}
`;

function makeUI() {
  const root = document.createElement('div');
  root.id = 'nd-root';

  const style = document.createElement('style');
  style.textContent = CSS;
  root.appendChild(style);

  root.innerHTML += `
    <canvas id="nd-canvas"></canvas>
    <button class="nd-close" id="nd-exit">EXIT GAME ✕</button>

    <section class="nd-screen" id="nd-menu">
      <div class="nd-panel">
        <div class="nd-kicker">PAVANP.ME PRESENTS</div>
        <h1 class="nd-brand">NEON<span> DRIVE</span></h1>
        <p class="nd-subtitle">
          An open-city driving experience. Choose your car,
          explore the city and take control of the road.
        </p>

        <div class="nd-actions">
          <button class="nd-btn nd-primary" data-start="free">
            START DRIVING →
          </button>
          <button class="nd-btn" data-start="time">
            TIME TRIAL
          </button>
          <button class="nd-btn" data-start="traffic">
            TRAFFIC CHALLENGE
          </button>
          <button class="nd-btn" id="nd-garage">
            GARAGE
          </button>
          <button class="nd-btn" id="nd-settings">
            SETTINGS
          </button>
        </div>

        <div class="nd-grid">
          <div class="nd-option">
            <h3>OPEN CITY</h3>
            <p>Explore a procedural city with roads, buildings and traffic.</p>
          </div>
          <div class="nd-option">
            <h3>DRIVING CAMERAS</h3>
            <p>Switch between chase, bonnet, cockpit and cinematic views.</p>
          </div>
          <div class="nd-option">
            <h3>DRIVING CONDITIONS</h3>
            <p>Change weather, lighting and road atmosphere.</p>
          </div>
        </div>
        <p class="nd-note" style="margin-top:22px">
          W A S D / ARROW KEYS — DRIVE · SPACE — HANDBRAKE · C — CAMERA ·
          ESC — PAUSE
        </p>
      </div>
    </section>

    <section class="nd-screen nd-hidden" id="nd-garage-screen">
      <div class="nd-panel">
        <div class="nd-kicker">VEHICLE COLLECTION</div>
        <h2 class="nd-heading">THE GARAGE</h2>
        <p class="nd-subtitle">Choose your vehicle and paint finish.</p>
        <div class="nd-grid" id="nd-car-list"></div>
        <div class="nd-actions">
          <button class="nd-btn" id="nd-garage-back">BACK</button>
        </div>
      </div>
    </section>

    <section class="nd-screen nd-hidden" id="nd-settings-screen">
      <div class="nd-panel">
        <div class="nd-kicker">GAME CONFIGURATION</div>
        <h2 class="nd-heading">SETTINGS</h2>
        <div id="nd-settings-list"></div>
        <div class="nd-actions">
          <button class="nd-btn nd-primary" id="nd-settings-back">SAVE & BACK</button>
          <button class="nd-btn" id="nd-settings-reset">RESET SETTINGS</button>
        </div>
      </div>
    </section>

    <section class="nd-screen nd-hidden" id="nd-pause">
      <div class="nd-panel" style="max-width:520px">
        <div class="nd-kicker">GAME PAUSED</div>
        <h2 class="nd-heading">TAKE A BREAK</h2>
        <p class="nd-subtitle">Your drive is paused.</p>
        <div class="nd-actions">
          <button class="nd-btn nd-primary" id="nd-resume">RESUME</button>
          <button class="nd-btn" id="nd-pause-settings">SETTINGS</button>
          <button class="nd-btn" id="nd-restart">RESTART DRIVE</button>
          <button class="nd-btn" id="nd-main-menu">MAIN MENU</button>
        </div>
      </div>
    </section>

    <section class="nd-screen nd-hidden" id="nd-results">
      <div class="nd-panel" style="max-width:520px">
        <div class="nd-kicker">DRIVE COMPLETE</div>
        <h2 class="nd-heading">SESSION RESULTS</h2>
        <div id="nd-result-data"></div>
        <div class="nd-actions">
          <button class="nd-btn nd-primary" id="nd-result-restart">DRIVE AGAIN</button>
          <button class="nd-btn" id="nd-result-menu">MAIN MENU</button>
        </div>
      </div>
    </section>

    <div class="nd-hud" id="nd-hud">
      <div class="nd-hud-top">
        <div class="nd-hud-card">
          <div class="nd-small">VEHICLE SPEED</div>
          <div><span class="nd-speed" id="nd-speed">000</span>
          <span style="color:#a5bad0">KM/H</span></div>
          <div class="nd-small" id="nd-gear">GEAR 1</div>
        </div>
        <div class="nd-hud-card" style="text-align:right">
          <div class="nd-small" id="nd-mode">FREE DRIVE</div>
          <div id="nd-clock" style="font-size:22px;font-weight:800">00:00</div>
          <div class="nd-small" id="nd-distance">0.00 KM</div>
        </div>
      </div>
      <div class="nd-hud-bottom">
        <div class="nd-hud-card" style="min-width:160px">
          <div class="nd-small">SESSION</div>
          <div id="nd-score" style="font-size:20px;font-weight:900">0</div>
          <div class="nd-progress"><span id="nd-progress"></span></div>
        </div>
        <div style="display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end">
          <button class="nd-btn" id="nd-camera">CAMERA C</button>
          <button class="nd-btn" id="nd-pause-button">PAUSE Ⅱ</button>
        </div>
      </div>
    </div>

    <div class="nd-touch" id="nd-touch">
      <div class="nd-touch-group">
        <button data-control="left">←</button>
        <button data-control="right">→</button>
      </div>
      <div class="nd-touch-group">
        <button data-control="brake">▼</button>
        <button class="nd-wide" data-control="accelerate">▲</button>
      </div>
    </div>
  `;

  document.body.appendChild(root);
  return root;
}

const VEHICLES = [
  {name:'Apex GT',type:'SPORT',max:285,acc:30,handling:1.15,colour:0xe12b45},
  {name:'Volt RS',type:'SUPERCAR',max:335,acc:38,handling:1.05,colour:0x18aaff},
  {name:'Nova Touring',type:'GRAND TOURER',max:255,acc:24,handling:1.25,colour:0xe7e9ef},
  {name:'Ranger X',type:'PERFORMANCE SUV',max:225,acc:20,handling:.9,colour:0x27c58a}
];

const PAINTS = [
  ['Crimson',0xd92d48],
  ['Cobalt',0x176bdf],
  ['Pearl',0xe8edf2],
  ['Emerald',0x17a875],
  ['Solar',0xe9a928],
  ['Violet',0x874ee8],
  ['Obsidian',0x202632]
];

function startGame() {
  if (loading || game) return;
  loading = true;

  loadThree().then(() => {
    loading = false;
    game = new Game();
    game.init();
  }).catch(() => {
    loading = false;
    alert('NEON DRIVE could not load its 3D engine. Check your internet connection and try again.');
  });
}

class Game {
  constructor() {
    this.root = makeUI();
    this.canvas = this.root.querySelector('#nd-canvas');
    this.settings = settingsLoad();
    this.running = false;
    this.paused = false;
    this.mode = 'free';
    this.elapsed = 0;
    this.distance = 0;
    this.score = 0;
    this.speed = 0;
    this.steering = 0;
    this.heading = 0;
    this.cameraIndex = 0;
    this.cameraNames = ['chase','close','hood','cockpit','bumper','cinematic'];
    this.camera = this.settings.camera;
    this.keys = {};
    this.touch = {};
    this.traffic = [];
    this.buildings = [];
    this.roadSegments = [];
    this.lastTime = 0;
    this.frame = 0;
    this.selectedCar = 0;
    this.paint = PAINTS[0][1];
    this.audio = null;
    this.weatherParticles = null;
    this.crashed = 0;
    this.best = this.readBest();
    this.clock = new THREE.Clock();
  }

  readBest() {
    try {
      return JSON.parse(localStorage.getItem('nd-pro-best') || '{}');
    } catch (e) { return {}; }
  }

  saveBest() {
    try {
      localStorage.setItem('nd-pro-best',JSON.stringify(this.best));
    } catch (e) {}
  }

  init() {
    this.renderer = new THREE.WebGLRenderer({
      canvas:this.canvas,
      antialias:this.settings.quality !== 'low',
      powerPreference:'high-performance'
    });

    this.renderer.setPixelRatio(Math.min(
      window.devicePixelRatio || 1,
      this.settings.quality === 'ultra' ? 2 : 1.5
    ));

    this.renderer.setSize(innerWidth,innerHeight);
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x8998a9);
    this.scene.fog = new THREE.FogExp2(0x8998a9,.0045);

    this.camera3d = new THREE.PerspectiveCamera(
      this.settings.fov,
      innerWidth/innerHeight,
      .1,1500
    );

    this.makeLights();
    this.makeWorld();
    this.makePlayer();
    this.makeTraffic();
    this.makeWeather();
    this.makeGarage();
    this.makeSettings();
    this.bindEvents();
    this.applyConditions();

    this.show('nd-menu');
    this.animate();
  }

  material(col,rough=.65,metal=0) {
    return new THREE.MeshStandardMaterial({
      color:col,
      roughness:rough,
      metalness:metal
    });
  }

  makeLights() {
    this.ambient = new THREE.HemisphereLight(0xc9dcff,0x273044,1.25);
    this.scene.add(this.ambient);

    this.sun = new THREE.DirectionalLight(0xffe1bb,2.1);
    this.sun.position.set(-120,180,80);
    this.sun.castShadow = this.settings.shadows;
    this.sun.shadow.mapSize.set(1024,1024);
    this.sun.shadow.camera.left=-100;
    this.sun.shadow.camera.right=100;
    this.sun.shadow.camera.top=100;
    this.sun.shadow.camera.bottom=-100;
    this.scene.add(this.sun);

    this.fill = new THREE.PointLight(0x4baaff,.6,180);
    this.fill.position.set(0,22,30);
    this.scene.add(this.fill);
  }

  makeWorld() {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(1200,1200),
      this.material(0x303a42,.95)
    );
    ground.rotation.x=-Math.PI/2;
    ground.position.y=-.15;
    this.scene.add(ground);

    this.road = new THREE.Group();
    this.scene.add(this.road);

    const roadMat=this.material(0x20252c,.93);
    const lineMat=this.material(0xe4e6dc,.8);
    const yellowMat=this.material(0xe5b94d,.8);

    const road=new THREE.Mesh(
      new THREE.PlaneGeometry(22,1200),roadMat
    );
    road.rotation.x=-Math.PI/2;
    road.position.y=.015;
    this.road.add(road);

    for(let z=-580;z<600;z+=18) {
      const dash=new THREE.Mesh(
        new THREE.PlaneGeometry(.16,7),lineMat
      );
      dash.rotation.x=-Math.PI/2;
      dash.position.set(0,.035,z);
      this.road.add(dash);
    }

    for(const x of [-10.5,10.5]) {
      const edge=new THREE.Mesh(
        new THREE.PlaneGeometry(.18,1200),lineMat
      );
      edge.rotation.x=-Math.PI/2;
      edge.position.set(x,.04,0);
      this.road.add(edge);
    }

    for(const x of [-5.5,5.5]) {
      const line=new THREE.Mesh(
        new THREE.PlaneGeometry(.12,1200),yellowMat
      );
      line.rotation.x=-Math.PI/2;
      line.position.set(x,.035,0);
      this.road.add(line);
    }

    const blockMat=[
      this.material(0x303b4b),
      this.material(0x46515d),
      this.material(0x222d3a),
      this.material(0x4d5360)
    ];

    for(let z=-570;z<600;z+=32) {
      for(const side of [-1,1]) {
        const width=12+Math.random()*22;
        const depth=15+Math.random()*22;
        const height=12+Math.random()*65;
        const x=side*(22+Math.random()*28);

        const building=new THREE.Mesh(
          new THREE.BoxGeometry(width,height,depth),
          blockMat[Math.floor(Math.random()*blockMat.length)]
        );

        building.position.set(x,height/2,z+Math.random()*12);
        building.castShadow=this.settings.shadows;
        building.receiveShadow=true;
        this.scene.add(building);
        this.buildings.push(building);

        const windowMat=this.material(
          Math.random()>.5?0x8ccfff:0xf2c77a,.3,.2
        );

        const rows=Math.min(8,Math.floor(height/5));
        for(let r=0;r<rows;r++) {
          for(let w=0;w<3;w++) {
            if(Math.random()<.25) continue;
            const win=new THREE.Mesh(
              new THREE.BoxGeometry(.8,1.1,.08),
              windowMat
            );
            win.position.set(
              x+(w-1)*(width*.27),
              3+r*4,
              building.position.z+depth/2+.05
            );
            this.scene.add(win);
          }
        }
      }
    }

    this.makeStreetFurniture();
  }

  makeStreetFurniture() {
    const poleMat=this.material(0x303b48,.45,.7);
    const lampMat=new THREE.MeshStandardMaterial({
      color:0xffe4a0,emissive:0xffb84d,
      emissiveIntensity:1.5
    });

    for(let z=-560;z<580;z+=28) {
      for(const side of [-1,1]) {
        const x=side*12.4;

        const pole=new THREE.Mesh(
          new THREE.CylinderGeometry(.09,.13,7,8),poleMat
        );
        pole.position.set(x,3.5,z);
        this.scene.add(pole);

        const arm=new THREE.Mesh(
          new THREE.BoxGeometry(2,.09,.09),poleMat
        );
        arm.position.set(x-side,6.8,z);
        this.scene.add(arm);

        const lamp=new THREE.Mesh(
          new THREE.BoxGeometry(.65,.15,.35),lampMat
        );
        lamp.position.set(x-side*2,6.65,z);
        this.scene.add(lamp);
      }
    }
  }

  makeCar(colour,scale=1) {
    const car=new THREE.Group();
    const bodyMat=this.material(colour,.27,.72);
    const glassMat=new THREE.MeshStandardMaterial({
      color:0x152638,metalness:.55,roughness:.15
    });
    const rubber=this.material(0x111419,.9);
    const rim=this.material(0xb8c5d1,.25,.85);

    const body=new THREE.Mesh(
      new THREE.BoxGeometry(2.05,.65,4.2),bodyMat
    );
    body.position.y=.85;
    car.add(body);

    const bonnet=new THREE.Mesh(
      new THREE.BoxGeometry(1.95,.23,1.15),bodyMat
    );
    bonnet.position.set(0,1.17,-1.35);
    car.add(bonnet);

    const cabin=new THREE.Mesh(
      new THREE.BoxGeometry(1.58,.75,1.85),glassMat
    );
    cabin.position.set(0,1.48,.1);
    car.add(cabin);

    const roof=new THREE.Mesh(
      new THREE.BoxGeometry(1.52,.1,1.45),bodyMat
    );
    roof.position.set(0,1.87,.15);
    car.add(roof);

    const frontLights=this.material(0xeaf5ff,.2);
    const rearLights=new THREE.MeshStandardMaterial({
      color:0xff1a29,emissive:0x9d0000
    });

    for(const x of [-.72,.72]) {
      const head=new THREE.Mesh(
        new THREE.BoxGeometry(.42,.13,.07),frontLights
      );
      head.position.set(x,.98,-2.12);
      car.add(head);

      const tail=new THREE.Mesh(
        new THREE.BoxGeometry(.42,.13,.07),rearLights
      );
      tail.position.set(x,.98,2.12);
      car.add(tail);
    }

    const wheels=[];
    for(const x of [-1,1]) {
      for(const z of [-1.35,1.35]) {
        const wheel=new THREE.Mesh(
          new THREE.CylinderGeometry(.39,.39,.24,18),
          rubber
        );
        wheel.rotation.z=Math.PI/2;
        wheel.position.set(x,.48,z);
        car.add(wheel);
        wheels.push(wheel);

        const hub=new THREE.Mesh(
          new THREE.CylinderGeometry(.2,.2,.255,16),rim
        );
        hub.rotation.z=Math.PI/2;
        hub.position.copy(wheel.position);
        car.add(hub);
      }
    }

    car.userData.wheels=wheels;
    car.scale.setScalar(scale);
    return car;
  }

  makePlayer() {
    this.player=this.makeCar(this.paint);
    this.player.position.set(0,0,0);
    this.scene.add(this.player);

    this.physics={
      speed:0,
      x:0,
      vx:0,
      heading:0,
      yawVelocity:0,
      grip:1,
      damage:0
    };
  }

  makeTraffic() {
    if(!this.settings.traffic) return;

    for(let i=0;i<14;i++) {
      const colours=[0xeeeeee,0x2768a8,0x30343a,0x9e3444,0x9a9c9e];
      const car=this.makeCar(
        colours[Math.floor(Math.random()*colours.length)],
        .83+Math.random()*.12
      );
      car.position.set(
        [-7,-3,3,7][Math.floor(Math.random()*4)],
        0,-80-i*35
      );
      car.userData.speed=12+Math.random()*25;
      car.userData.hit=false;
      this.scene.add(car);
      this.traffic.push(car);
    }
  }

  makeWeather() {
    const count=this.settings.quality==='low'?250:900;
    const positions=new Float32Array(count*3);

    for(let i=0;i<count;i++) {
      positions[i*3]=(Math.random()-.5)*80;
      positions[i*3+1]=Math.random()*35;
      positions[i*3+2]=(Math.random()-.5)*120;
    }

    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',
      new THREE.BufferAttribute(positions,3));

    const mat=new THREE.PointsMaterial({
      color:0xb9dfff,size:.09,transparent:true,opacity:.5
    });

    this.weatherParticles=new THREE.Points(geo,mat);
    this.weatherParticles.visible=false;
    this.scene.add(this.weatherParticles);
  }

  makeGarage() {
    const list=this.root.querySelector('#nd-car-list');

    list.innerHTML=VEHICLES.map((v,i)=>`
      <div class="nd-option">
        <h3>${v.name}</h3>
        <p>${v.type}<br>TOP SPEED: ${v.max} KM/H<br>
        ACCELERATION: ${v.acc}</p>
        <button class="nd-btn ${i===this.selectedCar?'nd-primary':''}"
          data-car="${i}">SELECT VEHICLE</button>
      </div>
    `).join('') + `
      <div class="nd-option" style="grid-column:1/-1">
        <h3>PAINT FINISH</h3>
        <div style="display:flex;gap:9px;flex-wrap:wrap;margin-top:12px">
          ${PAINTS.map((p,i)=>`
            <button data-paint="${i}" title="${p[0]}"
              style="width:36px;height:36px;border-radius:50%;
              border:2px solid white;background:#${p[1].toString(16).padStart(6,'0')}">
            </button>
          `).join('')}
        </div>
      </div>
    `;

    list.querySelectorAll('[data-car]').forEach(b=>{
      b.addEventListener('click',()=>{
        this.selectedCar=Number(b.dataset.car);
        this.rebuildPlayer();
        this.makeGarage();
      });
    });

    list.querySelectorAll('[data-paint]').forEach(b=>{
      b.addEventListener('click',()=>{
        this.paint=PAINTS[Number(b.dataset.paint)][1];
        this.rebuildPlayer();
      });
    });
  }

  rebuildPlayer() {
    if(this.player) this.scene.remove(this.player);
    this.player=this.makeCar(this.paint);
    this.scene.add(this.player);
  }

  makeSettings() {
    const s=this.settings;
    const rows=[
      ['Graphics quality','quality',['low','medium','high','ultra']],
      ['Weather','weather',['clear','rain','fog']],
      ['Time of day','time',['day','sunset','night']],
      ['Camera','camera',['chase','close','hood','cockpit','bumper','cinematic']],
      ['Field of view','fov','range',55,100,1],
      ['Steering sensitivity','sensitivity','range',.5,2,.1],
      ['Sound volume','volume','range',0,1,.05],
      ['Shadows','shadows','toggle'],
      ['Traffic','traffic','toggle'],
      ['Particles','particles','toggle'],
      ['Minimap','minimap','toggle']
    ];

    const list=this.root.querySelector('#nd-settings-list');

    list.innerHTML=rows.map(r=>{
      const key=r[0];
      const prop=key.toLowerCase().replaceAll(' ','');
      const actual={
        'Graphics quality':'quality',
        'Weather':'weather',
        'Time of day':'time',
        'Camera':'camera',
        'Field of view':'fov',
        'Steering sensitivity':'sensitivity',
        'Sound volume':'volume',
        'Shadows':'shadows',
        'Traffic':'traffic',
        'Particles':'particles',
        'Minimap':'minimap'
      }[key];

      if(r[2]==='toggle') {
        return `<div class="nd-field">
          <label>${key}</label>
          <input type="checkbox" data-setting="${actual}"
          ${s[actual]?'checked':''}>
        </div>`;
      }

      if(r[2]==='range') {
        return `<div class="nd-field">
          <label>${key}</label>
          <input type="range" data-setting="${actual}"
          min="${r[3]}" max="${r[4]}" step="${r[5]}"
          value="${s[actual]}">
        </div>`;
      }

      return `<div class="nd-field">
        <label>${key}</label>
        <select data-setting="${actual}">
          ${r[2].map(v=>`<option value="${v}"
          ${s[actual]===v?'selected':''}>${v.toUpperCase()}</option>`).join('')}
        </select>
      </div>`;
    }).join('');

    list.querySelectorAll('[data-setting]').forEach(el=>{
      el.addEventListener('change',()=>{
        const k=el.dataset.setting;
        this.settings[k]=el.type==='checkbox'?el.checked:
          (el.type==='range'?Number(el.value):el.value);
        settingsSave(this.settings);
        this.applyConditions();
      });
    });
  }

  applyConditions() {
    if(!this.scene) return;

    const time=this.settings.time;
    const palettes={
      day:[0x9db8d2,0xc5d9e8,1.7],
      sunset:[0x5b4a60,0x3b3146,1.05],
      night:[0x101a32,0x101827,.45]
    };

    const p=palettes[time]||palettes.sunset;
    this.scene.background.setHex(p[0]);
    this.scene.fog.color.setHex(p[1]);
    this.ambient.intensity=p[2];
    this.sun.intensity=time==='night'?.15:
      (time==='day'?2.2:1.1);
    this.sun.color.setHex(time==='sunset'?0xffa56b:0xffffff);

    this.scene.fog.density=this.settings.weather==='fog'?.015:.0045;
    this.weatherParticles.visible=this.settings.weather==='rain';
    this.sun.castShadow=!!this.settings.shadows;
    this.renderer.shadowMap.enabled=!!this.settings.shadows;
  }

  show(id) {
    this.root.querySelectorAll('.nd-screen').forEach(el=>{
      el.classList.add('nd-hidden');
    });
    const el=this.root.querySelector('#'+id);
    if(el) el.classList.remove('nd-hidden');
  }

  begin(mode) {
    this.mode=mode;
    this.elapsed=0;
    this.distance=0;
    this.score=0;
    this.speed=0;
    this.crashed=0;
    this.physics.speed=0;
    this.physics.x=0;
    this.physics.heading=0;
    this.player.position.set(0,0,0);
    this.player.rotation.set(0,0,0);
    this.running=true;
    this.paused=false;
    this.show('nd-menu');
    this.root.querySelector('#nd-menu').classList.add('nd-hidden');
    this.root.querySelector('#nd-hud').style.display='block';
    this.root.querySelector('#nd-touch').style.display='';
    this.root.querySelector('#nd-mode').textContent=
      mode==='free'?'FREE DRIVE':
      mode==='time'?'TIME TRIAL':'TRAFFIC CHALLENGE';
    this.root.querySelector('#nd-pause').classList.add('nd-hidden');
    this.root.querySelector('#nd-results').classList.add('nd-hidden');
  }

  pause() {
    if(!this.running) return;
    this.paused=true;
    this.show('nd-pause');
  }

  resume() {
    this.paused=false;
    this.root.querySelector('#nd-pause').classList.add('nd-hidden');
  }

  finish() {
    this.running=false;
    this.paused=true;
    this.best[this.mode]=Math.max(this.best[this.mode]||0,this.score);
    this.saveBest();

    this.root.querySelector('#nd-result-data').innerHTML=`
      <div class="nd-grid">
        <div class="nd-option"><h3>DISTANCE</h3>
          <p>${(this.distance/1000).toFixed(2)} KM</p></div>
        <div class="nd-option"><h3>TIME</h3>
          <p>${this.elapsed.toFixed(1)} SEC</p></div>
        <div class="nd-option"><h3>SCORE</h3>
          <p>${Math.floor(this.score)}</p></div>
      </div>`;

    this.show('nd-results');
  }

  setCamera() {
    const names=this.cameraNames;
    let i=names.indexOf(this.camera);
    this.camera=names[(i+1)%names.length];
    this.settings.camera=this.camera;
    settingsSave(this.settings);
    this.root.querySelector('#nd-camera').textContent=
      'CAMERA '+this.camera.toUpperCase();
  }

  bindEvents() {
    this.onKeyDown=e=>{
      if(!this.root.isConnected) return;
      const key=e.key.toLowerCase();

      if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(key))
        e.preventDefault();

      this.keys[key]=true;

      if(key==='escape') {
        if(this.running&&!this.paused)this.pause();
        else if(this.paused)this.resume();
      }
      if(key==='c'&&this.running)this.setCamera();
    };

    this.onKeyUp=e=>{
      this.keys[e.key.toLowerCase()]=false;
    };

    window.addEventListener('keydown',this.onKeyDown);
    window.addEventListener('keyup',this.onKeyUp);

    this.root.querySelector('#nd-exit').onclick=()=>this.close();
    this.root.querySelectorAll('[data-start]').forEach(b=>{
      b.onclick=()=>this.begin(b.dataset.start);
    });

    this.root.querySelector('#nd-garage').onclick=()=>{
      this.makeGarage();this.show('nd-garage-screen');
    };
    this.root.querySelector('#nd-garage-back').onclick=()=>this.show('nd-menu');

    this.root.querySelector('#nd-settings').onclick=()=>{
      this.makeSettings();this.show('nd-settings-screen');
    };
    this.root.querySelector('#nd-settings-back').onclick=()=>{
      this.makeSettings();this.show(this.paused?'nd-pause':'nd-menu');
    };
    this.root.querySelector('#nd-settings-reset').onclick=()=>{
      this.settings=Object.assign({},DEFAULTS);
      settingsSave(this.settings);
      this.makeSettings();this.applyConditions();
    };

    this.root.querySelector('#nd-pause-button').onclick=()=>this.pause();
    this.root.querySelector('#nd-resume').onclick=()=>this.resume();
    this.root.querySelector('#nd-pause-settings').onclick=()=>{
      this.makeSettings();this.show('nd-settings-screen');
    };
    this.root.querySelector('#nd-restart').onclick=()=>this.begin(this.mode);
    this.root.querySelector('#nd-main-menu').onclick=()=>this.mainMenu();
    this.root.querySelector('#nd-result-restart').onclick=()=>this.begin(this.mode);
    this.root.querySelector('#nd-result-menu').onclick=()=>this.mainMenu();
    this.root.querySelector('#nd-camera').onclick=()=>this.setCamera();

    this.root.querySelectorAll('[data-control]').forEach(btn=>{
      const k=btn.dataset.control;
      const down=e=>{e.preventDefault();this.touch[k]=true;};
      const up=e=>{e.preventDefault();this.touch[k]=false;};
      btn.addEventListener('pointerdown',down);
      btn.addEventListener('pointerup',up);
      btn.addEventListener('pointerleave',up);
      btn.addEventListener('pointercancel',up);
    });

    this.onResize=()=>{
      if(!this.renderer)return;
      this.camera3d.aspect=innerWidth/innerHeight;
      this.camera3d.updateProjectionMatrix();
      this.renderer.setSize(innerWidth,innerHeight);
    };
    window.addEventListener('resize',this.onResize);
  }

  mainMenu() {
    this.running=false;
    this.paused=false;
    this.root.querySelector('#nd-hud').style.display='none';
    this.root.querySelector('#nd-touch').style.display='none';
    this.show('nd-menu');
  }

  input(k) {
    return !!(this.keys[k]||this.touch[k]);
  }

  update(dt) {
    if(!this.running||this.paused)return;

    this.elapsed+=dt;

    const car=VEHICLES[this.selectedCar];
    const p=this.physics;

    const accel=this.input('w')||this.input('arrowup')||
      this.input('accelerate');
    const brake=this.input('s')||this.input('arrowdown')||
      this.input('brake');
    const left=this.input('a')||this.input('arrowleft')||
      this.input('left');
    const right=this.input('d')||this.input('arrowright')||
      this.input('right');
    const handbrake=this.input(' ');

    if(accel) p.speed+=car.acc*dt;
    else p.speed-=5*dt;

    if(brake) {
      if(p.speed>1)p.speed-=car.acc*1.7*dt;
      else p.speed-=car.acc*.65*dt;
    }

    p.speed=THREE.MathUtils.clamp(p.speed,-15,car.max/3.6);
    p.speed*=Math.pow(.997,dt*60);

    const steer=(right?1:0)-(left?1:0);
    const speedFactor=Math.min(1,Math.abs(p.speed)/18);
    const grip=handbrake?.48:car.handling;

    p.yawVelocity+=(steer*speedFactor*1.5*grip-p.yawVelocity*4.2)*dt;
    p.heading+=p.yawVelocity*dt;

    const direction=p.speed>=0?1:-1;
    p.x+=Math.sin(p.heading)*p.speed*dt;
    this.distance+=Math.abs(p.speed)*dt;

    const sideLimit=10.5;
    if(p.x>sideLimit) {
      p.x=sideLimit;
      if(this.mode!=='free')p.speed*=.82;
    }
    if(p.x<-sideLimit) {
      p.x=-sideLimit;
      if(this.mode!=='free')p.speed*=.82;
    }

    this.player.position.x=p.x;
    this.player.rotation.y=p.heading;
    this.player.rotation.z=-p.yawVelocity*.11;
    this.player.position.y=Math.sin(this.elapsed*13)*.018*speedFactor;

    this.player.userData.wheels.forEach(w=>{
      w.rotation.x-=p.speed*dt*1.8;
    });

    for(const t of this.traffic) {
      t.position.z+=t.userData.speed*dt;
      if(t.position.z>20) {
        t.position.z=-450-Math.random()*100;
        t.position.x=[-7,-3,3,7][Math.floor(Math.random()*4)];
        t.userData.hit=false;
      }

      const dx=Math.abs(t.position.x-p.x);
      const dz=Math.abs(t.position.z);
      if(dx<1.55&&dz<3&&Math.abs(p.speed)>4&&!t.userData.hit) {
        t.userData.hit=true;
        this.crashed++;
        if(this.mode!=='free') {
          p.speed*=.55;
          p.damage=Math.min(100,p.damage+12);
        }
      }
    }

    if(this.mode==='traffic') {
      if(p.damage>=100||this.crashed>=5)this.finish();
    }

    if(this.mode==='time'&&this.elapsed>=120)this.finish();

    this.score+=Math.max(0,p.speed)*dt*.8;
    if(handbrake&&Math.abs(p.yawVelocity)>.2)this.score+=dt*15;

    this.updateCamera(dt);
    this.updateWeather(dt);
    this.updateHUD();
  }

  updateCamera(dt) {
    const p=this.physics;
    const speed=Math.abs(p.speed);
    const forward=new THREE.Vector3(
      Math.sin(p.heading),0,-Math.cos(p.heading)
    );

    let targetPos=new THREE.Vector3();
    let targetLook=new THREE.Vector3(
      this.player.position.x,1.1,this.player.position.z-8
    );

    switch(this.camera) {
      case 'close':
        targetPos.copy(this.player.position).add(
          forward.clone().multiplyScalar(-5)
        );
        targetPos.y=2.7;
        break;
      case 'hood':
        targetPos.copy(this.player.position).add(
          forward.clone().multiplyScalar(1.3)
        );
        targetPos.y=1.55;
        targetLook.copy(this.player.position).add(
          forward.clone().multiplyScalar(25)
        );
        break;
      case 'cockpit':
        targetPos.copy(this.player.position).add(
          forward.clone().multiplyScalar(.2)
        );
        targetPos.y=1.65;
        targetLook.copy(this.player.position).add(
          forward.clone().multiplyScalar(30)
        );
        break;
      case 'bumper':
        targetPos.copy(this.player.position).add(
          forward.clone().multiplyScalar(1.7)
        );
        targetPos.y=.55;
        targetLook.copy(this.player.position).add(
          forward.clone().multiplyScalar(30)
        );
        break;
      case 'cinematic':
        targetPos.set(
          this.player.position.x-14*Math.cos(this.elapsed*.2),
          8,
          this.player.position.z+13*Math.sin(this.elapsed*.2)+10
        );
        break;
      default:
        targetPos.copy(this.player.position).add(
          forward.clone().multiplyScalar(-9)
        );
        targetPos.y=4.2+speed*.012;
    }

    this.camera3d.position.lerp(targetPos,1-Math.exp(-dt*5));
    this.camera3d.lookAt(targetLook);
    this.camera3d.fov=THREE.MathUtils.lerp(
      this.camera3d.fov,
      this.settings.fov+Math.min(12,speed*.045),
      dt*3
    );
    this.camera3d.updateProjectionMatrix();
  }

  updateWeather(dt) {
    if(!this.weatherParticles.visible)return;
    const pos=this.weatherParticles.geometry.attributes.position;
    for(let i=0;i<pos.count;i++) {
      pos.array[i*3+1]-=35*dt;
      pos.array[i*3+2]+=Math.abs(this.physics.speed)*dt*.5;
      if(pos.array[i*3+1]<0) {
        pos.array[i*3+1]=35;
        pos.array[i*3+2]=(Math.random()-.5)*120;
      }
    }
    pos.needsUpdate=true;
    this.weatherParticles.position.x=this.physics.x;
  }

  updateHUD() {
    const p=this.physics;
    const speed=Math.round(Math.abs(p.speed)*3.6);
    this.root.querySelector('#nd-speed').textContent=
      String(speed).padStart(3,'0');

    const gear=speed<2?'N':Math.min(7,Math.max(1,
      Math.floor(speed/42)+1));
    this.root.querySelector('#nd-gear').textContent='GEAR '+gear;

    const mins=Math.floor(this.elapsed/60);
    const secs=Math.floor(this.elapsed%60);
    this.root.querySelector('#nd-clock').textContent=
      String(mins).padStart(2,'0')+':'+String(secs).padStart(2,'0');

    this.root.querySelector('#nd-distance').textContent=
      (this.distance/1000).toFixed(2)+' KM';
    this.root.querySelector('#nd-score').textContent=
      Math.floor(this.score).toLocaleString();

    this.root.querySelector('#nd-progress').style.width=
      (this.mode==='time'?Math.min(100,this.elapsed/120*100):0)+'%';
  }

  animate() {
    if(!this.root.isConnected)return;

    this.raf=requestAnimationFrame(()=>this.animate());

    const now=performance.now();
    const dt=Math.min(.05,(now-(this.lastTime||now))/1000);
    this.lastTime=now;

    this.update(dt);

    if(this.renderer&&this.scene&&this.camera3d) {
      this.renderer.render(this.scene,this.camera3d);
    }
  }

  close() {
    if(this.raf)cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown',this.onKeyDown);
    window.removeEventListener('keyup',this.onKeyUp);
    window.removeEventListener('resize',this.onResize);

    if(this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
    }

    if(this.scene) {
      this.scene.traverse(obj=>{
        if(obj.geometry)obj.geometry.dispose();
        if(obj.material) {
          const materials=Array.isArray(obj.material)?
            obj.material:[obj.material];
          materials.forEach(m=>m.dispose());
        }
      });
    }

    if(this.audio) {
      try {this.audio.close();} catch(e){}
    }

    this.root.remove();
    game=null;
  }
}

window.NeonDrive = {
  open: function() {
    if(game)return;
    startGame();
  },
  close: function() {
    if(game)game.close();
  },
  isOpen: function() {
    return !!game;
  }
};

})();
