/* NEON DRIVE for pavanp.me. Self-contained: injects its own UI, loads Three.js r128 on demand, cleans up fully on close. */
(function(){
'use strict';
if(window.NeonDrive)return;
const THREE_URL='https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
const CH=60,HALF=7,NCH=10,LANES=[-5.25,-1.75,1.75,5.25];
const PAL={pink:0xff2e93,cyan:0x00e5ff,violet:0x7c5cff,amber:0xffb020};
const clamp=(v,a,b)=>Math.min(Math.max(v,a),b),lerp=(a,b,t)=>a+(b-a)*t,damp=(a,b,l,dt)=>a+(b-a)*(1-Math.exp(-l*dt)),rr=(a,b)=>a+Math.random()*(b-a);
const store={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const reduced=()=>matchMedia('(prefers-reduced-motion:reduce)').matches,coarse=()=>matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0;
const MODES={
 endless:{n:'Endless Drive',d:'Drive as far as you can. Near-misses earn bonus points. Integrity is your only life.',traffic:.55,block:true,crash:'damage'},
 trial:{n:'Time Trial',d:'Reach 5,000 m before the clock hits zero. Each 1,000 m gate adds 12 seconds. Crashes cost 4 seconds.',traffic:.3,goal:5000,time:75,gate:1000,add:12,crash:'time'},
 traffic:{n:'Traffic Challenge',d:'Dense traffic and three lives. Weave through it and survive.',traffic:1.15,crash:'lives'},
 free:{n:'Free Drive',d:'No score, no timer, no damage. Cruise the neon city.',traffic:.22,crash:'none'}};
const CARS=[
 {n:'Apex',vmax:72,acc:20,grip:1,w:1.8,spoiler:1,prof:[[-2.2,.32],[2.1,.32],[2.2,.55],[1.55,.72],[.75,.8],[.05,1.22],[-.95,1.24],[-1.65,.86],[-2.2,.82]],cab:[[.55,.84],[.05,1.17],[-.9,1.19],[-1.45,.88]]},
 {n:'Volt',vmax:78,acc:17,grip:.9,w:1.85,spoiler:1,prof:[[-2.2,.3],[2.25,.3],[2.3,.5],[1.2,.66],[.3,.82],[-.2,1.05],[-1.3,1.1],[-2.2,.9]],cab:[[.4,.84],[-.15,1.0],[-1.15,1.04],[-1.6,.92]]},
 {n:'Nova',vmax:66,acc:24,grip:1.15,w:1.8,spoiler:0,prof:[[-2.1,.34],[2.0,.34],[2.1,.58],[1.5,.78],[.8,.84],[.2,1.32],[-1.5,1.34],[-2.1,.95]],cab:[[.65,.88],[.15,1.27],[-1.45,1.29],[-1.9,.98]]}];
const COLS=[['Crimson','#e8283c'],['Cobalt','#2a6bff'],['Mint','#19d3a2'],['Solar','#ffb020'],['Violet','#9b5cff'],['Pearl','#e9e6f0']];
const CSS=`.nd{position:fixed;inset:0;z-index:2000;background:#05010f;color:#f2efe9;font:400 15px/1.5 Inter,system-ui,sans-serif;overflow:hidden;touch-action:none;-webkit-user-select:none;user-select:none}
.nd,.nd *{cursor:auto!important;box-sizing:border-box}.nd button,.nd select,.nd label{cursor:pointer!important}.nd [hidden]{display:none!important}
.nd-cv{position:absolute;inset:0;width:100%;height:100%;display:block}.nd button,.nd select{font:inherit;color:inherit}
.nd-b{padding:12px 20px;border:1px solid rgba(255,255,255,.28);background:rgba(8,6,18,.72);border-radius:999px;font:500 12px 'JetBrains Mono',monospace;letter-spacing:.14em;text-transform:uppercase}
.nd-b:hover,.nd-b:focus-visible,.nd select:focus-visible,.nd input:focus-visible{border-color:#ffb020;outline:2px solid #ffb020;outline-offset:2px}.nd-b.p{background:linear-gradient(90deg,#ff2e93,#ffb020);border-color:transparent;color:#fff}
.nd-b[aria-checked=true],.nd-b.on{border-color:#00e5ff;box-shadow:inset 0 0 0 1px #00e5ff}
.nd-k{font:500 11px 'JetBrains Mono',monospace;letter-spacing:.3em;text-transform:uppercase;color:#ffb020;margin-bottom:8px}
.nd-menu{position:absolute;left:0;top:0;bottom:0;width:min(470px,100%);padding:clamp(18px,4vw,36px);overflow:auto;background:linear-gradient(90deg,rgba(5,1,15,.94),rgba(5,1,15,.6) 82%,transparent);display:flex;flex-direction:column;gap:18px;touch-action:pan-y}
.nd-title{font:700 clamp(2.6rem,7vw,4.4rem)/.9 'Space Grotesk',Inter,sans-serif;letter-spacing:-.05em;background:linear-gradient(90deg,#ff2e93,#00e5ff);-webkit-background-clip:text;background-clip:text;color:transparent}
.nd-sub,.nd-md,.nd-help,.nd-best{color:#cfc9dc;font-size:14px}.nd-modes{display:grid;grid-template-columns:1fr 1fr;gap:8px}.nd-modes .nd-b{padding:12px 10px;letter-spacing:.08em}
.nd-car{display:flex;align-items:center;gap:12px;justify-content:space-between}.nd-car b{font:700 22px 'Space Grotesk',sans-serif}.nd-stats{display:grid;gap:4px;margin-top:6px;min-width:160px}
.nd-stats i{display:block;height:5px;border-radius:9px;background:rgba(255,255,255,.14);overflow:hidden}.nd-stats i::after{content:'';display:block;height:100%;width:var(--v);background:linear-gradient(90deg,#ff2e93,#00e5ff)}
.nd-cols{display:flex;gap:10px;margin-top:12px}.nd-cols button{width:34px;height:34px;border-radius:50%;border:2px solid transparent;outline:1px solid rgba(255,255,255,.35);outline-offset:2px}.nd-cols button[aria-checked=true]{border-color:#fff}
.nd-set{display:flex;gap:16px;flex-wrap:wrap;font-size:14px;align-items:center}.nd-set select{background:#0b0716;border:1px solid rgba(255,255,255,.3);border-radius:8px;padding:6px 8px}
.nd-row{display:flex;gap:10px;flex-wrap:wrap}
.nd-hud{position:absolute;inset:0;pointer-events:none;padding:calc(14px + env(safe-area-inset-top)) 16px 16px}
.nd-hl{display:flex;gap:26px;flex-wrap:wrap}.nd-hl span{display:block;font:500 10px 'JetBrains Mono',monospace;letter-spacing:.2em;color:#9d96b3;text-transform:uppercase}.nd-hl b{font:700 24px 'Space Grotesk',sans-serif}
.nd-hr{position:absolute;top:calc(12px + env(safe-area-inset-top));right:14px;display:flex;gap:8px;pointer-events:auto}.nd-hr .nd-b{padding:8px 12px;font-size:10px}
.nd-spd{position:absolute;left:50%;bottom:calc(18px + env(safe-area-inset-bottom));transform:translateX(-50%);text-align:center}.nd-spd b{font:700 clamp(2.6rem,8vw,4.4rem)/1 'Space Grotesk',sans-serif;letter-spacing:-.04em}.nd-spd span{display:block;font:500 11px 'JetBrains Mono',monospace;letter-spacing:.3em;color:#9d96b3}
.nd-msg{position:absolute;top:22%;left:0;right:0;text-align:center;font:700 clamp(1.4rem,4vw,2.2rem) 'Space Grotesk',sans-serif;letter-spacing:-.02em;color:#ffb020;opacity:0;pointer-events:none;text-shadow:0 0 30px #000}.nd-msg.on{animation:ndm 1.3s ease-out}
@keyframes ndm{0%{opacity:0;transform:translateY(10px)}15%{opacity:1;transform:none}80%{opacity:1}100%{opacity:0}}
.nd-big{position:absolute;inset:0;display:grid;place-items:center;font:700 clamp(5rem,22vw,14rem) 'Space Grotesk',sans-serif;color:#fff;text-shadow:0 0 60px #ff2e93;pointer-events:none}
.nd-flash{position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle,transparent 40%,rgba(255,46,147,.6));opacity:0}.nd-flash.on{animation:ndf .5s ease-out}@keyframes ndf{from{opacity:1}to{opacity:0}}
.nd-ov{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:rgba(5,1,15,.82);text-align:center;padding:20px;overflow:auto}
.nd-ov h2{font:700 clamp(2.4rem,7vw,4.4rem)/1 'Space Grotesk',sans-serif;letter-spacing:-.05em}.nd-ov p{color:#cfc9dc;max-width:46ch}
.nd-touch{position:absolute;left:0;right:0;bottom:0;display:flex;justify-content:space-between;align-items:flex-end;padding:14px 14px calc(14px + env(safe-area-inset-bottom));pointer-events:none}
.nd-touch>div{display:flex;gap:12px;pointer-events:auto}.nd-t{width:84px;height:84px;border-radius:50%;border:2px solid rgba(255,255,255,.35);background:rgba(8,6,18,.55);font:700 13px 'JetBrains Mono',monospace;letter-spacing:.08em;touch-action:none}.nd-t.on{background:rgba(255,46,147,.5);border-color:#fff}
@media(max-width:700px){.nd-menu{top:auto;height:64%;width:100%;background:linear-gradient(0deg,rgba(5,1,15,.96),rgba(5,1,15,.82) 82%,transparent)}.nd-hl{gap:14px}.nd-hl b{font-size:19px}}`;

let inst=null,threeP=null;
function loadThree(){if(window.THREE)return Promise.resolve();if(threeP)return threeP;
 threeP=new Promise((res,rej)=>{const s=document.createElement('script');s.src=THREE_URL;s.async=true;s.onload=res;s.onerror=()=>rej(new Error('Could not load the 3D library.'));document.head.appendChild(s);setTimeout(()=>rej(new Error('Loading the 3D library timed out.')),10000)});
 threeP.catch(()=>{threeP=null});return threeP}
function webglOK(){try{const c=document.createElement('canvas');return !!(c.getContext('webgl')||c.getContext('experimental-webgl'))}catch(e){return false}}
function fail(msg){const d=document.createElement('div');d.setAttribute('role','alert');d.textContent=msg;d.style.cssText='position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2100;background:#fff;color:#000;padding:12px 20px;border-radius:99px;font:500 13px Inter,sans-serif;max-width:92vw';document.body.appendChild(d);setTimeout(()=>d.remove(),4500)}
async function open(opts){
 if(inst)return true;opts=opts||{};
 if(!webglOK()){fail('NEON DRIVE needs WebGL, which is not available on this device or browser.');return false}
 try{await loadThree()}catch(e){fail(e.message);return false}
 if(inst)return true;
 try{inst=createGame(opts)}catch(e){console.error('[NeonDrive]',e);inst=null;fail('The game could not start on this device.');return false}
 return true}
function close(){if(inst){const i=inst;inst=null;i.close()}}
window.NeonDrive={open,close,isOpen:()=>!!inst};

function createGame(opts){
 const T=window.THREE,prevFocus=document.activeElement;
 const disp={g:[],m:[],t:[]},track=(a,o)=>(a.push(o),o),G=o=>track(disp.g,o),M=o=>track(disp.m,o),X=o=>track(disp.t,o);
 const ST=Object.assign({mode:'endless',car:0,col:0,q:'auto',snd:true,mus:false},store.get('nd-set',{}));
 if(opts.mode&&MODES[opts.mode])ST.mode=opts.mode;
 const save=()=>store.set('nd-set',ST),bests=store.get('nd-best',{});
 const lowEnd=(navigator.hardwareConcurrency||8)<=4||(navigator.deviceMemory||8)<=4||coarse();
 const Q={lvl:ST.q==='auto'?(lowEnd?1:0):+ST.q,auto:ST.q==='auto',ema:16,n:0,warm:0};
 const cvs=document.createElement('canvas');cvs.className='nd-cv';cvs.setAttribute('aria-hidden','true');
 const renderer=new T.WebGLRenderer({canvas:cvs,antialias:Q.lvl<2&&!lowEnd,powerPreference:'high-performance'});renderer.setClearColor(0x120426,1);

 /* ---------- DOM ---------- */
 if(!document.getElementById('nd-css')){const st=document.createElement('style');st.id='nd-css';st.textContent=CSS;document.head.appendChild(st)}
 const root=document.createElement('div');root.className='nd';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','NEON DRIVE');
 root.appendChild(cvs);
 root.insertAdjacentHTML('beforeend',`
 <section class="nd-hud" hidden><div class="nd-hl"><div><span>Distance</span><b class="h-d">0 m</b></div><div><span>Score</span><b class="h-s">0</b></div><div><span class="h-m">Mode</span><b class="h-x"></b></div></div>
  <div class="nd-hr"><button class="nd-b h-pa">Pause</button><button class="nd-b h-rs">Restart</button><button class="nd-b h-sn" aria-pressed="true">Sound</button></div>
  <div class="nd-spd"><b class="h-v">0</b><span>KM/H</span></div></section>
 <div class="nd-msg" aria-live="polite"></div><div class="nd-big" aria-hidden="true"></div><div class="nd-flash"></div>
 <section class="nd-menu" aria-labelledby="nd-t"><div><div class="nd-k">Original 3D driving game</div><h2 id="nd-t" class="nd-title">NEON DRIVE</h2><p class="nd-sub">An endless neon city. Choose a car, choose a mode, drive.</p></div>
  <div><div class="nd-k" id="nd-ml">Mode</div><div class="nd-modes" role="radiogroup" aria-labelledby="nd-ml"></div><p class="nd-md" aria-live="polite"></p></div>
  <div><div class="nd-k">Vehicle</div><div class="nd-car"><button class="nd-b" data-car="-1" aria-label="Previous vehicle">‹</button><div><b class="nd-cn"></b><div class="nd-stats"></div></div><button class="nd-b" data-car="1" aria-label="Next vehicle">›</button></div><div class="nd-cols" role="radiogroup" aria-label="Paint colour"></div></div>
  <div class="nd-set"><label>Quality <select class="s-q"><option value="auto">Auto</option><option value="0">High</option><option value="1">Medium</option><option value="2">Low</option></select></label><label><input type="checkbox" class="s-sn"> Sound</label><label><input type="checkbox" class="s-mu"> Music</label></div>
  <p class="nd-help">Keyboard: W / ↑ accelerate · S / ↓ brake · A D / ← → steer · Space handbrake · Esc pause. Touch: on-screen buttons.</p>
  <div class="nd-row"><button class="nd-b p m-go">Start driving</button><button class="nd-b m-ex">Exit to website</button></div><p class="nd-best"></p></section>
 <section class="nd-ov o-pa" hidden><h2>Paused</h2><div class="nd-row"><button class="nd-b p p-re">Resume</button><button class="nd-b p-rs">Restart</button><button class="nd-b p-mn">Garage</button><button class="nd-b p-ex">Exit to website</button></div></section>
 <section class="nd-ov o-en" hidden><h2 class="e-t"></h2><p class="e-b"></p><div class="nd-row"><button class="nd-b p e-rs">Drive again</button><button class="nd-b e-mn">Garage</button><button class="nd-b e-ex">Exit to website</button></div></section>
 <div class="nd-touch" hidden><div><button class="nd-t" data-k="left" aria-label="Steer left">◀</button><button class="nd-t" data-k="right" aria-label="Steer right">▶</button></div><div><button class="nd-t" data-k="brake" aria-label="Brake">BRAKE</button><button class="nd-t" data-k="gas" aria-label="Accelerate">GAS</button></div></div>`);
 const q=s=>root.querySelector(s);
 const E={hud:q('.nd-hud'),menu:q('.nd-menu'),pa:q('.o-pa'),en:q('.o-en'),touch:q('.nd-touch'),msg:q('.nd-msg'),big:q('.nd-big'),flash:q('.nd-flash'),d:q('.h-d'),s:q('.h-s'),x:q('.h-x'),m:q('.h-m'),v:q('.h-v'),sn:q('.h-sn')};
 const sib=[...document.body.children].filter(e=>e!==root);sib.forEach(e=>{e._ndI=e.inert;e.inert=true});
 const htmlOv=document.documentElement.style.overflow;document.documentElement.style.overflow='hidden';
 document.body.appendChild(root);

 /* ---------- three.js scene ---------- */
 const scene=new T.Scene();scene.fog=new T.Fog(0x2a0a40,90,400);
 const camera=new T.PerspectiveCamera(62,1,.1,1600);
 scene.add(new T.HemisphereLight(0x9a7cff,0x1a0630,.95));
 const sun=new T.DirectionalLight(0xff9ad8,.85);sun.position.set(-30,60,40);scene.add(sun);
 const carLight=new T.PointLight(0xff5aa0,1.1,16);scene.add(carLight);
 const ctex=(w,h,draw)=>{const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=X(new T.CanvasTexture(c));t.anisotropy=4;return t};
 const gBox=G(new T.BoxGeometry(1,1,1)),gCyl=G(new T.CylinderGeometry(1,1,1,12)),gPlane=G(new T.PlaneGeometry(1,1));
 const gWheel=G(new T.CylinderGeometry(.34,.34,.26,18));gWheel.rotateZ(Math.PI/2);const gRim=G(new T.CylinderGeometry(.2,.2,.28,12));gRim.rotateZ(Math.PI/2);
 const bmC={},lmC={};
 const bm=(h,o)=>bmC[h+(o||'')]||(bmC[h+(o||'')]=M(new T.MeshBasicMaterial(Object.assign({color:h},o||{}))));
 const lm=h=>lmC[h]||(lmC[h]=M(new T.MeshLambertMaterial({color:h})));
 const glowT=ctex(128,128,(c,w,h)=>{const g=c.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(0,0,w,h)});
 const shadowT=ctex(128,128,(c,w,h)=>{const g=c.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(0,0,0,.7)');g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(0,0,w,h)});
 const coneT=ctex(64,256,(c,w,h)=>{const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(1,'rgba(255,255,255,.42)');c.fillStyle=g;c.fillRect(0,0,w,h)});
 const roadT=ctex(256,512,(c,w,h)=>{c.fillStyle='#10101c';c.fillRect(0,0,w,h);for(let i=0;i<1600;i++){c.fillStyle='rgba(255,255,255,'+(Math.random()*.05)+')';c.fillRect(Math.random()*w,Math.random()*h,2,2)}
  c.fillStyle='rgba(216,216,255,.8)';c.fillRect(5,0,4,h);c.fillRect(w-9,0,4,h);c.fillStyle='#ff2e93';c.fillRect(w/2-5,0,3,h);c.fillRect(w/2+2,0,3,h);
  c.fillStyle='rgba(255,255,255,.7)';for(const x of [w/4,w*3/4])for(let k=0;k<10;k++)c.fillRect(x-2,k*51.2,4,25.6)});
 const groundT=ctex(256,256,(c,w,h)=>{c.fillStyle='#07030f';c.fillRect(0,0,w,h);c.strokeStyle='#3a1a6a';c.lineWidth=2;c.strokeRect(0,0,w,h);c.beginPath();c.moveTo(w/2,0);c.lineTo(w/2,h);c.moveTo(0,h/2);c.lineTo(w,h/2);c.stroke()});
 groundT.wrapS=groundT.wrapT=T.RepeatWrapping;groundT.repeat.set(18,3);
 const winC=document.createElement('canvas');winC.width=128;winC.height=256;{const c=winC.getContext('2d');c.fillStyle='#0a0b14';c.fillRect(0,0,128,256);const cs=['#ffcf6b','#6bd1ff','#ff7ad9','#ffffff'];for(let r=0;r<8;r++)for(let k=0;k<4;k++)if(Math.random()<.46){c.fillStyle=cs[Math.random()*4|0];c.fillRect(k*32+8,r*32+8,16,16)}}
 const VAR=[{w:10,h:30},{w:12,h:55},{w:9,h:80},{w:14,h:40},{w:11,h:100},{w:8,h:65}].map(v=>{const t=X(new T.CanvasTexture(winC));t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(v.w/10,v.h/12);v.mat=M(new T.MeshBasicMaterial({map:t,color:[0xb8c4ff,0xffb8e6,0xb8fff0][Math.random()*3|0]}));return v});
 const skyT=ctex(2,512,(c,w,h)=>{const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#05010f');g.addColorStop(.45,'#2a0a4a');g.addColorStop(.7,'#ff3d8b');g.addColorStop(.74,'#1a0630');g.addColorStop(1,'#10031f');c.fillStyle=g;c.fillRect(0,0,w,h)});
 const sky=new T.Mesh(G(new T.SphereGeometry(900,24,16)),M(new T.MeshBasicMaterial({map:skyT,side:T.BackSide,fog:false,depthWrite:false})));sky.renderOrder=-10;scene.add(sky);
 const sunT=ctex(256,256,(c,w,h)=>{const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#ffe36b');g.addColorStop(1,'#ff2e93');c.fillStyle=g;c.beginPath();c.arc(128,128,126,0,7);c.fill();c.globalCompositeOperation='destination-out';for(let i=0;i<7;i++){c.fillRect(0,130+i*17,w,3+i*1.6)}});
 const sunM=new T.Mesh(G(new T.CircleGeometry(70,48)),M(new T.MeshBasicMaterial({map:sunT,transparent:true,fog:false,depthWrite:false})));scene.add(sunM);
 const sN=400,sPos=new Float32Array(sN*3);for(let i=0;i<sN;i++){const a=Math.random()*6.283,e=Math.random()*1.2+.1,r=820;sPos[i*3]=Math.cos(a)*Math.cos(e)*r;sPos[i*3+1]=Math.sin(e)*r;sPos[i*3+2]=Math.sin(a)*Math.cos(e)*r}
 const sg=G(new T.BufferGeometry());sg.setAttribute('position',new T.BufferAttribute(sPos,3));const stars=new T.Points(sg,M(new T.PointsMaterial({color:0xffffff,size:2,fog:false,sizeAttenuation:false})));scene.add(stars);
 const air=[];for(let i=0;i<12;i++){const m=new T.Mesh(gBox,bm(i%2?PAL.cyan:PAL.pink,{fog:false}));m.scale.set(.9,.3,2.2);air.push(m);scene.add(m)}
 const sNum=60,slPos=new Float32Array(sNum*6),slRel=new Float32Array(sNum*3);for(let i=0;i<sNum;i++){slRel[i*3]=rr(-14,14);slRel[i*3+1]=rr(.2,8);slRel[i*3+2]=-rr(4,60)}
 const slG=G(new T.BufferGeometry());slG.setAttribute('position',new T.BufferAttribute(slPos,3));const lines=new T.LineSegments(slG,M(new T.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.35,fog:false})));lines.frustumCulled=false;scene.add(lines);
 const spN=40,spPos=new Float32Array(spN*3),spVel=new Float32Array(spN*3);const spG=G(new T.BufferGeometry());spG.setAttribute('position',new T.BufferAttribute(spPos,3));
 const sparks=new T.Points(spG,M(new T.PointsMaterial({color:0xffcf6b,size:.35,transparent:true,blending:T.AdditiveBlending,depthWrite:false})));sparks.frustumCulled=false;sparks.visible=false;scene.add(sparks);

 /* chunks: road, barriers, lights and buildings, recycled forever */
 const chunks=[];
 function makeChunk(){const g=new T.Group();
  const gr=new T.Mesh(gPlane,M(new T.MeshBasicMaterial({map:groundT})));gr.rotation.x=-Math.PI/2;gr.scale.set(360,CH,1);gr.position.set(0,-.06,-CH/2);g.add(gr);
  const rd=new T.Mesh(gPlane,M(new T.MeshBasicMaterial({map:roadT})));rd.rotation.x=-Math.PI/2;rd.scale.set(HALF*2,CH,1);rd.position.set(0,.01,-CH/2);g.add(rd);
  for(const sd of [-1,1]){const w=new T.Mesh(gBox,lm(0x1a1030));w.scale.set(.5,.9,CH);w.position.set(sd*(HALF+.25),.45,-CH/2);g.add(w);
   const n=new T.Mesh(gBox,bm(sd<0?PAL.cyan:PAL.pink));n.scale.set(.14,.14,CH);n.position.set(sd*(HALF-.05),.9,-CH/2);g.add(n)}
  for(const sd of [-1,1])for(const z0 of [-8,-38]){const x=sd*(HALF+1.6),p=new T.Mesh(gBox,lm(0x2a2a40));p.scale.set(.22,7,.22);p.position.set(x,3.5,z0);g.add(p);
   const hd=new T.Mesh(gBox,bm(sd<0?0xffc66b:0xff7ad9));hd.scale.set(1.3,.2,.5);hd.position.set(x-sd*.6,7,z0);g.add(hd);
   const pool=new T.Mesh(gPlane,bm(sd<0?0xffc66b:0xff7ad9,{map:glowT,transparent:true,opacity:.5,blending:T.AdditiveBlending,depthWrite:false}));pool.rotation.x=-Math.PI/2;pool.scale.set(11,11,1);pool.position.set(sd*(HALF-3.5),.04,z0);g.add(pool)}
  scene.add(g);const c={g,k:0,dyn:[]};return c}
 function fillChunk(c){c.dyn.forEach(m=>c.g.remove(m));c.dyn=[];
  for(const sd of [-1,1]){let z=-3;while(z>-CH+8){const v=VAR[Math.random()*VAR.length|0],dep=12,face=HALF+7+Math.random()*4;
    if(Math.random()<.75){const b=new T.Mesh(gBox,v.mat);b.scale.set(v.w,v.h,dep);b.position.set(sd*(face+v.w/2),v.h/2-2,z-dep/2);c.g.add(b);c.dyn.push(b);
     const sgn=new T.Mesh(gPlane,bm([PAL.pink,PAL.cyan,PAL.violet,PAL.amber][Math.random()*4|0]));sgn.scale.set(v.w*.7,1.6,1);sgn.rotation.y=-sd*Math.PI/2;sgn.position.set(sd*(face-.06),rr(5,16),z-dep/2);c.g.add(sgn);c.dyn.push(sgn)}
    z-=dep+rr(2,8)}}}
 for(let i=0;i<NCH;i++){const c=makeChunk();chunks.push(c)}
 let visN=NCH;
 function placeChunks(zc){const base=Math.floor(-zc/CH)-1;chunks.forEach((c,i)=>{c.k=base+i;c.g.position.z=-c.k*CH;fillChunk(c)})}
 function recycle(zc){const base=Math.floor(-zc/CH)-1;while(chunks[0].k<base){const c=chunks.shift();c.k=chunks[chunks.length-1].k+1;c.g.position.z=-c.k*CH;fillChunk(c);chunks.push(c)}chunks.forEach((c,i)=>{c.g.visible=i<visN})}

 /* ---------- vehicles ---------- */
 function wheel(x,z,front){const piv=new T.Group();piv.position.set(x,.34,z);const spin=new T.Group();spin.add(new T.Mesh(gWheel,lm(0x0b0b10)),new T.Mesh(gRim,bm(0xc9ccd8)));piv.add(spin);return{piv,spin,front}}
 function buildPlayer(def,hex){
  const root=new T.Group(),rig=new T.Group();root.add(rig);
  const bodyM=M(new T.MeshPhongMaterial({color:hex,shininess:110,specular:0x999999})),dep=def.w-.2;
  const sh=new T.Shape();def.prof.forEach((p,i)=>i?sh.lineTo(p[0],p[1]):sh.moveTo(p[0],p[1]));sh.closePath();
  const bg=G(new T.ExtrudeGeometry(sh,{depth:dep,bevelEnabled:true,bevelThickness:.1,bevelSize:.08,bevelSegments:2,steps:1}));bg.translate(0,0,-dep/2);bg.rotateY(Math.PI/2);rig.add(new T.Mesh(bg,bodyM));
  const gs=new T.Shape();def.cab.forEach((p,i)=>i?gs.lineTo(p[0],p[1]):gs.moveTo(p[0],p[1]));gs.closePath();
  const gd=def.w+.02,gg=G(new T.ExtrudeGeometry(gs,{depth:gd,bevelEnabled:false}));gg.translate(0,0,-gd/2);gg.rotateY(Math.PI/2);
  rig.add(new T.Mesh(gg,M(new T.MeshPhongMaterial({color:0x06070c,shininess:220,specular:0xffffff}))));
  const under=new T.Mesh(gBox,lm(0x08080c));under.scale.set(def.w-.1,.2,4.2);under.position.y=.28;rig.add(under);
  if(def.spoiler){const wg=new T.Mesh(gBox,bodyM);wg.scale.set(1.7,.06,.5);wg.position.set(0,1.08,2.05);rig.add(wg);for(const x of [-.6,.6]){const s=new T.Mesh(gBox,lm(0x111118));s.scale.set(.06,.28,.1);s.position.set(x,.92,2.05);rig.add(s)}}
  for(const x of [-.6,.6]){const h=new T.Mesh(gBox,bm(0xffffff));h.scale.set(.34,.1,.06);h.position.set(x,.5,-2.27);rig.add(h)}
  const brake=M(new T.MeshBasicMaterial({color:0x661018})),tl=new T.Mesh(gBox,brake);tl.scale.set(1.5,.1,.06);tl.position.set(0,.72,2.27);rig.add(tl);
  const wh=[wheel(-.8,-1.35,1),wheel(.8,-1.35,1),wheel(-.8,1.35,0),wheel(.8,1.35,0)];wh.forEach(w=>rig.add(w.piv));
  const ug=new T.Mesh(gPlane,bm(PAL.cyan,{map:glowT,transparent:true,opacity:.55,blending:T.AdditiveBlending,depthWrite:false}));ug.rotation.x=-Math.PI/2;ug.scale.set(2.8,5.6,1);ug.position.y=.07;root.add(ug);
  const sd=new T.Mesh(gPlane,bm(0xffffff,{map:shadowT,transparent:true,depthWrite:false}));sd.rotation.x=-Math.PI/2;sd.scale.set(2.6,5.4,1);sd.position.y=.03;root.add(sd);
  const cone=new T.Mesh(gPlane,bm(0xcfe8ff,{map:coneT,transparent:true,blending:T.AdditiveBlending,depthWrite:false}));cone.rotation.x=-Math.PI/2;cone.scale.set(5,26,1);cone.position.set(0,.06,-15);root.add(cone);
  return{root,rig,wh,brake,cone}}
 function buildTraffic(kind,hex){const g=new T.Group();
  if(kind==='truck'){const cg=new T.Mesh(gBox,lm(0x2b2b3a));cg.scale.set(2.3,2.6,5.2);cg.position.set(0,1.9,.9);g.add(cg);const cb=new T.Mesh(gBox,lm(hex));cb.scale.set(2.2,1.8,1.8);cb.position.set(0,1.2,-2.9);g.add(cb);
   for(const z of [-2.8,2.6])for(const x of [-1,1]){const w=new T.Mesh(gWheel,lm(0x0b0b10));w.scale.set(1.2,1.2,1.2);w.position.set(x,.4,z);g.add(w)}
   const tl=new T.Mesh(gBox,bm(0xff2030));tl.scale.set(2,.15,.06);tl.position.set(0,.9,3.52);g.add(tl)}
  else{const b=new T.Mesh(gBox,lm(hex));b.scale.set(1.8,.55,4.3);b.position.y=.58;g.add(b);const c=new T.Mesh(gBox,lm(0x0a0b12));c.scale.set(1.5,.5,2.1);c.position.set(0,1.1,.35);g.add(c);
   for(const x of [-.85,.85])for(const z of [-1.3,1.3]){const w=new T.Mesh(gWheel,lm(0x0b0b10));w.position.set(x,.34,z);g.add(w)}
   const tl=new T.Mesh(gBox,bm(0xff2030));tl.scale.set(1.5,.1,.06);tl.position.set(0,.7,2.17);g.add(tl);for(const x of [-.6,.6]){const h=new T.Mesh(gBox,bm(0xffffff));h.scale.set(.3,.1,.06);h.position.set(x,.55,-2.17);g.add(h)}}
  return g}
 function buildBarrier(){const g=new T.Group(),s=bm(0xffb020),d=bm(0x1a1020);for(let i=0;i<5;i++){const b=new T.Mesh(gBox,i%2?s:d);b.scale.set(.7,.9,.7);b.position.set(-1.4+i*.7,.5,0);g.add(b)}return g}
 function buildGate(final){const g=new T.Group(),col=final?0xffffff:PAL.cyan;for(const x of [-7.4,7.4]){const p=new T.Mesh(gBox,bm(col));p.scale.set(.5,8,.5);p.position.set(x,4,0);g.add(p)}
  const bar=new T.Mesh(gBox,bm(col));bar.scale.set(15,.6,.6);bar.position.y=8;g.add(bar);
  const chk=ctex(256,32,(c,w,h)=>{for(let i=0;i<32;i++)for(let j=0;j<4;j++){c.fillStyle=(i+j)%2?'#fff':'#111';c.fillRect(i*8,j*8,8,8)}});const bn=new T.Mesh(gPlane,M(new T.MeshBasicMaterial({map:chk,transparent:true,opacity:final?1:.35,side:T.DoubleSide})));bn.scale.set(14,1.6,1);bn.position.y=6.8;g.add(bn);return g}

 /* ---------- game state ---------- */
 let S='garage',player=null,raf=0,last=0,tm=0,closed=false,hudT=0;
 const s={x:0,z:0,speed:0,vx:0,steer:0,yaw:0,pitch:0,roll:0,t:0,inv:0,shake:0,hp:100,lives:3,time:0,bonus:0,score:0,cd:0,gates:0,spT:0,camFrom:new T.Vector3(),bumpT:0,sparkT:0};
 const K={up:0,down:0,left:0,right:0,space:0},touch={gas:0,brake:0,left:0,right:0};
 let traffic=[],gates=[];
 function mountPlayer(){if(player){scene.remove(player.root)}const def=CARS[ST.car];player=buildPlayer(def,new T.Color(COLS[ST.col][1]).getHex());scene.add(player.root);player.root.position.set(s.x,0,s.z);player.root.rotation.y=s.yaw}
 function resetWorld(){traffic.forEach(t=>scene.remove(t.m));gates.forEach(g=>scene.remove(g.m));traffic=[];gates=[];Object.assign(s,{x:LANES[1],z:0,speed:0,vx:0,steer:0,t:0,inv:0,shake:0,hp:100,lives:3,bonus:0,score:0,cd:0,gates:0,spT:0});const m=MODES[ST.mode];s.time=m.time||0;placeChunks(0);mountPlayer()}

 /* ---------- audio ---------- */
 let A=null;
 function audioInit(){if(A)return;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;const c=new AC(),master=c.createGain();master.gain.value=ST.snd?.5:0;master.connect(c.destination);
  const eg=c.createGain();eg.gain.value=0;const ef=c.createBiquadFilter();ef.type='lowpass';ef.frequency.value=400;ef.connect(eg);eg.connect(master);
  const o1=c.createOscillator(),o2=c.createOscillator();o1.type='sawtooth';o2.type='square';o1.connect(ef);o2.connect(ef);o1.start();o2.start();
  const mg=c.createGain();mg.gain.value=ST.mus?.28:0;mg.connect(master);
  const nb=c.createBuffer(1,c.sampleRate,c.sampleRate),nd=nb.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;
  A={c,master,eg,ef,o1,o2,mg,nb,step:0,next:c.currentTime+.1,tid:setInterval(musicTick,40)}}
 function musicTick(){if(!A||!ST.mus||A.c.state!=='running'||S==='paused')return;const c=A.c,sd=60/118/4,N=[57,60,64,67,64,60,69,67],B=[45,45,48,43];
  while(A.next<c.currentTime+.15){const i=A.step++,t=A.next;A.next+=sd;
   const o=c.createOscillator(),g=c.createGain();o.type=i%2?'triangle':'square';o.frequency.value=440*Math.pow(2,(N[i%8]+(i%32>=16?5:0)-69)/12);g.gain.setValueAtTime(.12,t);g.gain.exponentialRampToValueAtTime(.001,t+sd*1.6);o.connect(g);g.connect(A.mg);o.start(t);o.stop(t+sd*1.7);
   if(i%4===0){const b=c.createOscillator(),bg=c.createGain();b.type='sawtooth';b.frequency.value=440*Math.pow(2,(B[(i>>4)%4]-69)/12);bg.gain.setValueAtTime(.2,t);bg.gain.exponentialRampToValueAtTime(.001,t+sd*3.5);b.connect(bg);bg.connect(A.mg);b.start(t);b.stop(t+sd*4)}}}
 function sfxCrash(){if(!A||!ST.snd)return;const c=A.c,t=c.currentTime,n=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();n.buffer=A.nb;f.type='lowpass';f.frequency.value=900;g.gain.setValueAtTime(.7,t);g.gain.exponentialRampToValueAtTime(.001,t+.35);n.connect(f);f.connect(g);g.connect(A.master);n.start(t);
  const o=c.createOscillator(),og=c.createGain();o.frequency.setValueAtTime(110,t);o.frequency.exponentialRampToValueAtTime(30,t+.25);og.gain.setValueAtTime(.8,t);og.gain.exponentialRampToValueAtTime(.001,t+.3);o.connect(og);og.connect(A.master);o.start(t);o.stop(t+.35)}
 function sfxChime(a,b){if(!A||!ST.snd)return;const c=A.c,t=c.currentTime;[a,b].forEach((f,i)=>{const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(.25,t+i*.1);g.gain.exponentialRampToValueAtTime(.001,t+i*.1+.4);o.connect(g);g.connect(A.master);o.start(t+i*.1);o.stop(t+i*.1+.45)})}
 function audioApply(){if(!A)return;A.master.gain.setTargetAtTime(ST.snd?.5:0,A.c.currentTime,.1);A.mg.gain.setTargetAtTime(ST.mus?.28:0,A.c.currentTime,.1)}
 function audioFrame(){if(!A)return;const t=A.c.currentTime,run=S==='run'||S==='count',sp=s.speed,th=(K.up||touch.gas)?1:0;A.o1.frequency.setTargetAtTime(46+sp*2.5,t,.05);A.o2.frequency.setTargetAtTime(23+sp*1.25,t,.05);A.ef.frequency.setTargetAtTime(260+sp*16+th*350,t,.08);A.eg.gain.setTargetAtTime(run&&ST.snd?.03+.05*th+sp*.0004:0,t,.1)}

 /* ---------- HUD, messages, bests ---------- */
 let msgT=0;function say(t,ms){E.msg.textContent=t;E.msg.classList.remove('on');void E.msg.offsetWidth;E.msg.classList.add('on')}
 const fmtD=d=>d>=1000?(d/1000).toFixed(2)+' km':Math.floor(d)+' m';
 function hud(){const m=MODES[ST.mode],d=-s.z;E.d.textContent=fmtD(d);E.s.textContent=m.crash==='none'?'-':Math.floor(s.score);E.v.textContent=Math.round(s.speed*3.6);
  E.m.textContent=m.n;E.x.textContent=m.crash==='damage'?'Integrity '+Math.max(0,Math.round(s.hp))+'%':m.crash==='lives'?'♥'.repeat(Math.max(0,s.lives))+'♡'.repeat(Math.max(0,3-s.lives)):m.crash==='time'?Math.max(0,Math.ceil(s.time))+' s · '+Math.min(100,Math.round(d/m.goal*100))+'%':'Cruising'}
 function bestText(){const b=bests[ST.mode];q('.nd-best').textContent=b?('Best in '+MODES[ST.mode].n+': '+(ST.mode==='free'?fmtD(b):Math.floor(b)+' points')):'No best score yet in this mode.'}

 /* ---------- gameplay ---------- */
 const spawnClear=(x,z)=>!traffic.some(t=>Math.abs(t.x-x)<2.4&&Math.abs(t.z-z)<34);
 function spawnTraffic(m){const cap=[14,11,8][Q.lvl],ramp=clamp(-s.z/6000,0,1),target=Math.round(cap*m.traffic*(.5+.7*ramp));
  if(traffic.length>=target)return;const lane=Math.random()*4|0,z=s.z-rr(230,360),x=LANES[lane];if(!spawnClear(x,z))return;
  let kind='car',hex=[0x3a3a50,0xff5a7a,0x5ab0ff,0xf2efe9,0x7a5aff][Math.random()*5|0],sp=[16,20,24,28][lane]*rr(.9,1.1),hw=.95,hl=2.15;
  if(Math.random()<.15){kind='truck';sp=14;hw=1.2;hl=3.6}
  else if(m.block&&Math.random()<.18){kind='barrier';sp=0;hw=1.8;hl=.5}
  const mesh=kind==='barrier'?buildBarrier():buildTraffic(kind,hex);mesh.position.set(kind==='barrier'?x+(Math.random()<.5?-1.75:0):x,0,z);scene.add(mesh);
  traffic.push({m:mesh,x:mesh.position.x,z,sp,hw,hl,kind,pz:-1,hit:false,vx:0})}
 function spark(x,z){sparks.visible=true;s.sparkT=.7;for(let i=0;i<spN;i++){spPos[i*3]=x;spPos[i*3+1]=.6;spPos[i*3+2]=z;spVel[i*3]=rr(-6,6);spVel[i*3+1]=rr(1,6);spVel[i*3+2]=rr(-6,6)}spG.attributes.position.needsUpdate=true}
 function crash(kind){const m=MODES[ST.mode];s.inv=1.1;s.shake=1;spark(s.x,s.z);sfxCrash();E.flash.classList.remove('on');void E.flash.offsetWidth;E.flash.classList.add('on');try{navigator.vibrate&&navigator.vibrate(60)}catch(e){}
  if(kind!=='wall')s.speed*=.45;
  if(m.crash==='damage'){s.hp-=kind==='wall'?9:30;if(s.hp<=0)return end(false,'Crashed')}
  else if(m.crash==='lives'&&kind!=='wall'){s.lives--;if(s.lives<=0)return end(false,'Out of lives')}
  else if(m.crash==='time'){s.time-=kind==='wall'?2:4}
  say(kind==='wall'?'SCRAPE':'CRASH')}
 function drive(dt){const m=MODES[ST.mode],car=CARS[ST.car],th=(K.up||touch.gas)?1:0,br=(K.down||touch.brake)?1:0,hb=K.space?1:0,tg=((K.right||touch.right)?1:0)-((K.left||touch.left)?1:0);
  s.steer=damp(s.steer,tg,9,dt);const acc=th*car.acc*(1-s.speed/car.vmax);
  s.speed=Math.max(0,s.speed+(acc-(br*40+hb*26+.05*s.speed+(th?0:2.5)))*dt);
  const sf=clamp(s.speed/10,0,1)*(1-.28*s.speed/car.vmax);s.vx=damp(s.vx,s.steer*11*car.grip*(hb?1.5:1)*sf,hb?3:9,dt);
  s.x+=s.vx*dt;s.z-=s.speed*dt;s.t+=dt;if(s.inv>0)s.inv-=dt;
  const lim=HALF-1.05;if(Math.abs(s.x)>lim){const sg=Math.sign(s.x);s.x=sg*lim;if(s.inv<=0&&s.speed>6)crash('wall');s.vx=-sg*Math.abs(s.vx)*.3;s.speed*=1-Math.min(.5,dt*3)}
  s.spT-=dt;if(s.spT<=0){spawnTraffic(m);s.spT=.35}
  for(let i=traffic.length-1;i>=0;i--){const t=traffic[i];t.z-=t.sp*dt;t.x+=t.vx*dt;t.vx=damp(t.vx,0,3,dt);t.m.position.set(t.x,0,t.z);
   const dz=t.z-s.z,dx=s.x-t.x;
   if(!t.hit&&s.inv<=0&&Math.abs(dz)<2.2+t.hl-.25&&Math.abs(dx)<.9+t.hw-.12){t.hit=true;t.vx=-Math.sign(dx||1)*5;s.vx+=Math.sign(dx||1)*6;crash('car');if(S!=='run')return}
   if(t.pz<0&&dz>=0&&!t.hit&&Math.abs(dx)<2.8&&m.crash!=='none'){const b=Math.round(25+s.speed*1.2);s.bonus+=b;say('NEAR MISS +'+b)}
   t.pz=dz<0?-1:1;
   if(t.z>s.z+45||t.z<s.z-560){scene.remove(t.m);traffic.splice(i,1)}}
  if(m.gate){const dist=-s.z;while(s.gates*m.gate<dist+420&&(s.gates+1)*m.gate<=m.goal){s.gates++;const f=s.gates*m.gate>=m.goal,mesh=buildGate(f);mesh.position.set(0,0,-s.gates*m.gate);scene.add(mesh);gates.push({m:mesh,z:-s.gates*m.gate,final:f,done:false})}
   for(const g of gates){if(!g.done&&s.z<g.z){g.done=true;if(g.final){s.score=-s.z*.5+s.bonus+Math.max(0,s.time)*50;return end(true,'You made it')}s.time+=m.add;sfxChime(660,880);say('CHECKPOINT +'+m.add+' s')}}
   s.time-=dt;if(s.time<=0){s.time=0;return end(false,'Time is up')}}
  s.score=-s.z*.5+s.bonus;
  // visuals
  const sr=s.speed/car.vmax;s.yaw=-clamp(s.vx*.03,-.35,.35)-s.steer*.02*hb;player.root.rotation.y=s.yaw;
  const pt=th*.02*(1-sr)-br*.035;s.pitch=damp(s.pitch,pt,6,dt);s.roll=damp(s.roll,-clamp(s.vx*.006,-.09,.09),6,dt);
  player.rig.rotation.x=s.pitch;player.rig.rotation.z=s.roll;player.rig.position.y=Math.sin(s.t*s.speed*.35)*.012*sr+(s.bumpT>0?.03:0);
  const spin=s.speed/.34*dt;player.wh.forEach(w=>{w.spin.rotation.x-=spin;if(w.front)w.piv.rotation.y=-s.steer*.45});
  player.brake.color.setHex(br||hb?0xff2030:0x661018);
  hud()}
 function end(win,why){if(S==='over')return;S='over';const m=MODES[ST.mode];const val=ST.mode==='free'?-s.z:s.score;
  if(!bests[ST.mode]||val>bests[ST.mode]){bests[ST.mode]=val;store.set('nd-best',bests)}
  E.hud.hidden=false;E.touch.hidden=true;q('.e-t').textContent=why;
  q('.e-b').textContent=m.crash==='none'?('Distance '+fmtD(-s.z)):('Distance '+fmtD(-s.z)+' · Score '+Math.floor(val)+' · Best '+Math.floor(bests[ST.mode]||val));
  E.en.hidden=false;q('.e-rs').focus();audioFrame()}

 /* ---------- state changes ---------- */
 function toMenu(){S='garage';E.menu.hidden=false;E.hud.hidden=true;E.touch.hidden=true;E.pa.hidden=true;E.en.hidden=true;E.big.textContent='';resetWorld();s.yaw=0;bestText();q('.m-go').focus();startLoop()}
 function toCount(){audioInit();if(A&&A.c.state==='suspended')A.c.resume();audioApply();resetWorld();s.yaw=((s.yaw+Math.PI)%(2*Math.PI))-Math.PI;camera.clearViewOffset();s.camFrom.copy(camera.position);
  S='count';s.cd=0;E.menu.hidden=true;E.pa.hidden=true;E.en.hidden=true;E.hud.hidden=false;E.touch.hidden=!coarse();hud();q('.h-pa').focus()}
 function pause(){if(S!=='run'&&S!=='count')return;S='paused';E.pa.hidden=false;q('.p-re').focus();audioFrame();render();stopLoop()}
 function resume(){if(S!=='paused')return;S=s.cd<3?'count':'run';E.pa.hidden=true;startLoop();q('.h-pa').focus()}
 function startLoop(){if(raf||closed)return;last=performance.now();raf=requestAnimationFrame(frame)}
 function stopLoop(){cancelAnimationFrame(raf);raf=0}
 function applyQ(){const pr=Math.min(devicePixelRatio||1,[1.75,1.25,1][Q.lvl]);renderer.setPixelRatio(pr);resize();visN=[10,9,7][Q.lvl];scene.fog.far=[400,340,260][Q.lvl];lines.visible=Q.lvl<2;air.forEach(a=>a.visible=Q.lvl<2)}
 function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;if(S==='garage'){camera.setViewOffset(w,h,innerWidth>700?-w*.17:0,innerWidth>700?0:h*.16,w,h)}else camera.clearViewOffset();camera.updateProjectionMatrix()}
 function render(){renderer.render(scene,camera)}
 function frame(now){raf=requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.05);last=now;tm+=dt;
  try{update(dt)}catch(e){console.error('[NeonDrive]',e);stopLoop();return}
  render();
  if(Q.auto){Q.ema=Q.ema*.95+dt*1000*.05;if(tm>3&&++Q.n%90===0&&Q.ema>28&&Q.lvl<2){Q.lvl++;Q.ema=16;applyQ()}}}
 function update(dt){
  const rm=reduced();
  if(S==='garage'){s.yaw+=dt*.45;player.root.rotation.y=s.yaw;const a=tm*.25+.6;camera.position.set(Math.sin(a)*8.2,2.4+Math.sin(tm*.4)*.2,Math.cos(a)*8.2);camera.lookAt(0,.8,0);player.wh.forEach(w=>{w.piv.rotation.y=0})}
  else if(S==='count'){s.cd+=dt;const k=clamp(s.cd/2.8,0,1),e=k*k*(3-2*k);s.yaw=damp(s.yaw,0,6,dt);player.root.rotation.y=s.yaw;
   camera.position.set(lerp(s.camFrom.x,s.x*.55,e),lerp(s.camFrom.y,3.2,e),lerp(s.camFrom.z,s.z+7.8,e));camera.lookAt(lerp(0,s.x*.5,e),lerp(.8,1.2,e),lerp(0,s.z-12,e));
   const n=s.cd<.8?'3':s.cd<1.6?'2':s.cd<2.4?'1':s.cd<3?'GO':'';if(E.big.textContent!==n)E.big.textContent=n;
   if(s.cd>=3){S='run';E.big.textContent=''}}
  else if(S==='run'){drive(dt);if(S==='run'){
   const sr=s.speed/CARS[ST.car].vmax;camera.fov=lerp(camera.fov,62+sr*(rm?5:20),dt*4);camera.updateProjectionMatrix();
   s.shake=Math.max(0,s.shake-dt*2.2);const sh=rm?0:(s.shake*.4+sr*.02);
   camera.position.set(damp(camera.position.x,s.x*.55,6,dt)+rr(-sh,sh),3.1+rr(-sh,sh),s.z+7.6+sr*1.5);camera.lookAt(s.x*.5,1.15,s.z-12)}}
  if(S!=='garage'&&S!=='over'){/* keep lights on car */}
  const zc=player.root.position.z;player.root.position.set(s.x,0,s.z);carLight.position.set(s.x,4,s.z+2);
  recycle(s.z);sky.position.copy(camera.position);stars.position.copy(camera.position);sunM.position.set(0,90,camera.position.z-780);
  const slen=clamp(s.speed*.05,0,5);air.forEach((a,i)=>{a.position.set(Math.sin(tm*.1+i)*140,45+i*3,camera.position.z-200-((tm*(18+i)+i*97)%520))});
  if(lines.visible){const sp=s.speed;for(let i=0;i<sNum;i++){let z=slRel[i*3+2]+sp*1.1*dt;if(z>6||S!=='run'){z=-rr(20,60);slRel[i*3]=rr(-14,14);slRel[i*3+1]=rr(.2,8)}slRel[i*3+2]=z;const x=camera.position.x+slRel[i*3],y=slRel[i*3+1],zz=camera.position.z+z;slPos[i*6]=x;slPos[i*6+1]=y;slPos[i*6+2]=zz;slPos[i*6+3]=x;slPos[i*6+4]=y;slPos[i*6+5]=zz-slen}slG.attributes.position.needsUpdate=true}
  if(sparks.visible){s.sparkT-=dt;for(let i=0;i<spN;i++){spVel[i*3+1]-=12*dt;spPos[i*3]+=spVel[i*3]*dt;spPos[i*3+1]=Math.max(.05,spPos[i*3+1]+spVel[i*3+1]*dt);spPos[i*3+2]+=spVel[i*3+2]*dt}spG.attributes.position.needsUpdate=true;if(s.sparkT<=0)sparks.visible=false}
  audioFrame();void zc}

 /* ---------- menu wiring ---------- */
 const mg=q('.nd-modes');Object.keys(MODES).forEach(k=>{const b=document.createElement('button');b.className='nd-b';b.dataset.mode=k;b.setAttribute('role','radio');b.textContent=MODES[k].n;mg.appendChild(b)});
 const cg=q('.nd-cols');COLS.forEach((c,i)=>{const b=document.createElement('button');b.dataset.col=i;b.setAttribute('role','radio');b.setAttribute('aria-label',c[0]);b.style.background=c[1];cg.appendChild(b)});
 function paintMenu(){mg.querySelectorAll('button').forEach(b=>b.setAttribute('aria-checked',b.dataset.mode===ST.mode));q('.nd-md').textContent=MODES[ST.mode].d;cg.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-checked',i===ST.col));
  const c=CARS[ST.car];q('.nd-cn').textContent=c.n;q('.nd-stats').innerHTML=[['Top speed',c.vmax/80],['Acceleration',c.acc/26],['Handling',c.grip/1.2]].map(x=>`<i style="--v:${Math.round(clamp(x[1],0,1)*100)}%" title="${x[0]}" aria-label="${x[0]}"></i>`).join('');
  q('.s-q').value=ST.q;q('.s-sn').checked=!!ST.snd;q('.s-mu').checked=!!ST.mus;E.sn.setAttribute('aria-pressed',!!ST.snd);bestText()}
 const on=(el,ev,fn,o)=>{el.addEventListener(ev,fn,o);return()=>el.removeEventListener(ev,fn,o)},offs=[];
 offs.push(on(root,'click',e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.mode){ST.mode=b.dataset.mode;save();paintMenu();resetWorld()}
  else if(b.dataset.car){ST.car=(ST.car+ +b.dataset.car+CARS.length)%CARS.length;save();paintMenu();mountPlayer()}
  else if(b.dataset.col!==undefined){ST.col=+b.dataset.col;save();paintMenu();mountPlayer()}
  else if(b.classList.contains('m-go')||b.classList.contains('e-rs')||b.classList.contains('p-rs')||b.classList.contains('h-rs'))toCount();
  else if(b.classList.contains('m-ex')||b.classList.contains('p-ex')||b.classList.contains('e-ex'))close_();
  else if(b.classList.contains('h-pa'))pause();else if(b.classList.contains('p-re'))resume();
  else if(b.classList.contains('p-mn')||b.classList.contains('e-mn'))toMenu();
  else if(b.classList.contains('h-sn')){ST.snd=!ST.snd;save();audioInit();audioApply();paintMenu()}}));
 offs.push(on(q('.s-q'),'change',e=>{ST.q=e.target.value;save();Q.auto=ST.q==='auto';Q.lvl=Q.auto?(lowEnd?1:0):+ST.q;applyQ()}));
 offs.push(on(q('.s-sn'),'change',e=>{ST.snd=e.target.checked;save();audioInit();audioApply();paintMenu()}));
 offs.push(on(q('.s-mu'),'change',e=>{ST.mus=e.target.checked;save();audioInit();if(A&&A.c.state==='suspended')A.c.resume();audioApply()}));
 q('.nd-touch').querySelectorAll('.nd-t').forEach(b=>{const k=b.dataset.k,set=v=>{touch[k]=v;b.classList.toggle('on',!!v)};
  offs.push(on(b,'pointerdown',e=>{e.preventDefault();try{b.setPointerCapture(e.pointerId)}catch(x){}set(1)}));['pointerup','pointercancel','lostpointercapture'].forEach(ev=>offs.push(on(b,ev,()=>set(0))))});
 const KEYS={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',Space:'space'};
 offs.push(on(window,'keydown',e=>{e.stopImmediatePropagation();const inForm=/^(SELECT|INPUT)$/.test((e.target||{}).tagName);
  if(e.code==='Escape'){e.preventDefault();if(S==='run'||S==='count')pause();else if(S==='paused')resume();else if(S==='garage')close_();return}
  if(e.code==='KeyP'&&!inForm){if(S==='paused')resume();else pause();return}
  if(e.code==='KeyR'&&!inForm&&(S==='run'||S==='over')){toCount();return}
  if(e.code==='Tab'){const f=[...root.querySelectorAll('button,select,input')].filter(x=>!x.disabled&&x.offsetParent!==null);if(f.length){const i=f.indexOf(document.activeElement);if(e.shiftKey&&i<=0){e.preventDefault();f[f.length-1].focus()}else if(!e.shiftKey&&i===f.length-1){e.preventDefault();f[0].focus()}}return}
  const k=KEYS[e.code];if(k&&!(inForm&&S!=='run')){K[k]=1;if(S==='run'||S==='count')e.preventDefault()}},true));
 offs.push(on(window,'keyup',e=>{const k=KEYS[e.code];if(k)K[k]=0;e.stopImmediatePropagation()},true));
 offs.push(on(window,'blur',()=>{for(const k in K)K[k]=0;for(const k in touch)touch[k]=0;if(S==='run')pause()}));
 offs.push(on(window,'resize',()=>{resize();render()}));
 offs.push(on(document,'visibilitychange',()=>{if(document.hidden){if(S==='run'||S==='count')pause();stopLoop()}else if(S!=='paused'&&S!=='over'&&!closed)startLoop();else render()}));
 offs.push(on(cvs,'webglcontextlost',e=>{e.preventDefault();close_();fail('The graphics context was lost. Reopen NEON DRIVE to continue.')}));

 function close_(){close()}
 function destroy(){if(closed)return;closed=true;stopLoop();offs.forEach(f=>f());
  if(A){clearInterval(A.tid);try{A.o1.stop();A.o2.stop()}catch(e){}try{A.c.close()}catch(e){}A=null}
  scene.traverse(o=>{if(o.geometry)o.geometry.dispose()});disp.g.forEach(g=>g.dispose());disp.m.forEach(m=>m.dispose());disp.t.forEach(t=>t.dispose());
  renderer.dispose();try{renderer.forceContextLoss()}catch(e){}
  root.remove();sib.forEach(e=>{e.inert=!!e._ndI;delete e._ndI});document.documentElement.style.overflow=htmlOv;
  try{prevFocus&&prevFocus.focus&&prevFocus.focus()}catch(e){}}

 /* ---------- boot ---------- */
 applyQ();resetWorld();paintMenu();toMenu();
 return{close:destroy}}
})();
