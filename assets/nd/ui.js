/* UI: premium dark interface with electric-blue accents. All screens are real: every button maps to a game action, every setting changes behaviour.
   The game object g exposes: S (settings), act(name,dataset), set(path,value). */
(function(){'use strict';const N=window.NDM,U=N.U;
const CSS=`.nd{position:fixed;inset:0;z-index:2000;background:#04060c;color:#e8ecf4;font:400 15px/1.5 Inter,system-ui,sans-serif;overflow:hidden;touch-action:none;-webkit-user-select:none;user-select:none}
.nd *{box-sizing:border-box}.nd [hidden]{display:none!important}.nd-cv{position:absolute;inset:0;width:100%;height:100%;display:block}
.nd button,.nd select,.nd input,.nd label{font:inherit;color:inherit;cursor:pointer}.nd-ui{position:absolute;inset:0;pointer-events:none}.nd-ui>*{pointer-events:auto}
.nd-b{padding:11px 18px;border:1px solid rgba(120,180,255,.3);background:rgba(8,14,28,.78);border-radius:10px;font:500 12px 'JetBrains Mono',monospace;letter-spacing:.12em;text-transform:uppercase;text-align:left}
.nd-b:hover,.nd-b:focus-visible,.nd select:focus-visible,.nd input:focus-visible{border-color:#37c8ff;outline:2px solid #37c8ff;outline-offset:2px}.nd-b.p{background:linear-gradient(90deg,#1b6dff,#19c8ff);border-color:transparent;color:#fff}
.nd-b[aria-checked=true],.nd-b.on{border-color:#37c8ff;box-shadow:inset 0 0 0 1px #37c8ff}
.nd-k{font:500 11px 'JetBrains Mono',monospace;letter-spacing:.28em;text-transform:uppercase;color:#37c8ff;margin-bottom:6px}
.nd-scr{position:absolute;left:0;top:0;bottom:0;width:min(520px,100%);padding:clamp(16px,3.5vw,34px);overflow:auto;background:linear-gradient(90deg,rgba(4,6,12,.94),rgba(4,6,12,.62) 85%,transparent);display:flex;flex-direction:column;gap:14px;touch-action:pan-y}
.nd-scr.full{width:100%;align-items:center;justify-content:center;text-align:center;background:rgba(4,6,12,.84)}
.nd-logo{font:700 clamp(2.4rem,7vw,4rem)/.9 'Space Grotesk',Inter,sans-serif;letter-spacing:-.05em;background:linear-gradient(90deg,#fff,#37c8ff);-webkit-background-clip:text;background-clip:text;color:transparent}
.nd-sub,.nd-note{color:#a9b4c8;font-size:14px}.nd-col{display:flex;flex-direction:column;gap:8px}.nd-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.nd-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.nd-bar{display:grid;grid-template-columns:90px 1fr;gap:8px;align-items:center;font-size:12px;color:#a9b4c8}.nd-bar i{display:block;height:6px;border-radius:9px;background:rgba(255,255,255,.12);overflow:hidden}.nd-bar i::after{content:'';display:block;height:100%;width:var(--v);background:linear-gradient(90deg,#1b6dff,#19c8ff)}
.nd-sw{display:flex;gap:8px;flex-wrap:wrap}.nd-sw button{width:30px;height:30px;border-radius:50%;border:2px solid transparent;outline:1px solid rgba(255,255,255,.3);outline-offset:2px}.nd-sw button[aria-checked=true]{border-color:#fff}
.nd-f{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.08);font-size:14px}.nd-f select,.nd-f input[type=text]{background:#0a1224;border:1px solid rgba(120,180,255,.3);border-radius:8px;padding:6px 8px}.nd-f input[type=range]{width:min(210px,48%);accent-color:#37c8ff}
.nd-tabs{display:flex;gap:6px;flex-wrap:wrap}.nd-tabs .nd-b{padding:8px 12px}
.nd-hud{position:absolute;inset:0;pointer-events:none;padding:calc(12px + env(safe-area-inset-top)) 14px 14px}.nd-hud>*{pointer-events:none}
.nd-tl{position:absolute;left:14px;top:calc(12px + env(safe-area-inset-top))}.nd-tl b{font:700 22px 'Space Grotesk',sans-serif;display:block}.nd-tl span{font:500 10px 'JetBrains Mono',monospace;letter-spacing:.2em;color:#8aa0c0;text-transform:uppercase}
.nd-tr{position:absolute;right:12px;top:calc(12px + env(safe-area-inset-top));display:flex;gap:8px;pointer-events:auto!important}.nd-tr .nd-b{padding:8px 12px;font-size:10px}
.nd-mm{position:absolute;right:14px;bottom:calc(14px + env(safe-area-inset-bottom));width:190px;height:128px;border:1px solid rgba(120,180,255,.3);border-radius:10px;background:rgba(4,8,18,.7)}
.nd-gauge{position:absolute;left:50%;bottom:calc(14px + env(safe-area-inset-bottom));transform:translateX(-50%);text-align:center;min-width:220px}.nd-gauge b{font:700 clamp(2.6rem,8vw,4.2rem)/1 'Space Grotesk',sans-serif;letter-spacing:-.04em}.nd-gauge small{display:block;font:500 11px 'JetBrains Mono',monospace;letter-spacing:.28em;color:#8aa0c0}
.nd-rpm{height:6px;border-radius:9px;background:rgba(255,255,255,.14);overflow:hidden;margin:6px 0}.nd-rpm i{display:block;height:100%;width:0;background:linear-gradient(90deg,#19c8ff,#fff 85%,#ff3d5e)}
.nd-gear{font:700 28px 'Space Grotesk',sans-serif;color:#37c8ff}.nd-obj{position:absolute;left:50%;top:calc(14px + env(safe-area-inset-top));transform:translateX(-50%);text-align:center;font:500 13px 'JetBrains Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:#cfe6ff;text-shadow:0 0 18px #000}
.nd-big{position:absolute;inset:0;display:grid;place-items:center;font:700 clamp(5rem,22vw,13rem) 'Space Grotesk',sans-serif;color:#fff;text-shadow:0 0 60px #19c8ff;pointer-events:none}
.nd-toast{position:absolute;left:50%;bottom:calc(150px + env(safe-area-inset-bottom));transform:translateX(-50%);background:rgba(8,16,32,.92);border:1px solid rgba(120,180,255,.4);padding:10px 18px;border-radius:99px;font:500 12px 'JetBrains Mono',monospace;letter-spacing:.1em;opacity:0;transition:opacity .3s;pointer-events:none;max-width:92vw;text-align:center}.nd-toast.on{opacity:1}
.nd-touch{position:absolute;left:0;right:0;bottom:0;display:flex;justify-content:space-between;align-items:flex-end;padding:14px 14px calc(14px + env(safe-area-inset-bottom));pointer-events:none!important}.nd-touch>div{display:flex;gap:10px;pointer-events:auto}
.nd-t{width:76px;height:76px;border-radius:50%;border:2px solid rgba(255,255,255,.35);background:rgba(8,14,28,.55);font:700 11px 'JetBrains Mono',monospace;letter-spacing:.06em;touch-action:none}.nd-t.on{background:rgba(27,109,255,.55);border-color:#fff}.nd-t.sm{width:54px;height:54px;font-size:10px}
.nd-warn{position:absolute;inset:0;display:none;place-items:center;background:#04060c;font:500 14px system-ui;text-align:center;padding:30px}
@media(max-width:700px){.nd-scr{width:100%;background:rgba(4,6,12,.9)}.nd-mm{width:140px;height:94px;bottom:calc(130px + env(safe-area-inset-bottom))}.nd-gauge{min-width:150px;bottom:calc(100px + env(safe-area-inset-bottom))}.nd-toast{bottom:calc(210px + env(safe-area-inset-bottom))}}
@media(orientation:portrait) and (pointer:coarse){.nd-warn.show{display:grid}}`;
const KL=c=>({Space:'Space',ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→',Escape:'Esc'}[c]||c.replace(/^Key|^Digit/,''));
const ACTS={accel:'Accelerate',brake:'Brake / reverse',left:'Steer left',right:'Steer right',hb:'Handbrake',cam:'Change camera',reset:'Reset vehicle',pause:'Pause',up:'Shift up (manual)',down:'Shift down (manual)',lights:'Headlights',map:'Toggle minimap'};
const sel=(path,val,opts)=>`<select data-set="${path}" aria-label="${path}">${opts.map(o=>`<option value="${o[0]}"${String(val)===String(o[0])?' selected':''}>${o[1]}</option>`).join('')}</select>`;
const chk=(path,val)=>`<input type="checkbox" data-set="${path}" ${val?'checked':''} aria-label="${path}">`;
const rng=(path,val,a,b,st)=>`<input type="range" data-set="${path}" min="${a}" max="${b}" step="${st}" value="${val}" aria-label="${path}">`;
const F=(l,c)=>`<div class="nd-f"><span>${l}</span>${c}</div>`;
N.UI=class{
 constructor(root,g){this.g=g;this.r=root;if(!document.getElementById('nd-css')){const s=document.createElement('style');s.id='nd-css';s.textContent=CSS;document.head.appendChild(s)}
  root.insertAdjacentHTML('beforeend',`<div class="nd-ui"><div class="nd-scr" hidden></div>
   <div class="nd-hud" hidden><div class="nd-tl"><b class="h-md"></b><span class="h-in"></span></div><div class="nd-obj" aria-live="polite"></div>
    <div class="nd-tr"><button class="nd-b" data-act="cam" aria-label="Change camera">Cam</button><button class="nd-b" data-act="pause">Pause</button></div>
    <canvas class="nd-mm" width="380" height="256" aria-label="Minimap"></canvas>
    <div class="nd-gauge"><div class="nd-row" style="justify-content:center;gap:16px"><span class="nd-gear h-g">1</span><b class="h-v">0</b></div><small class="h-u">KM/H</small><div class="nd-rpm"><i></i></div><small class="h-c"></small></div></div>
   <div class="nd-big" aria-hidden="true"></div><div class="nd-toast" role="status" aria-live="polite"></div>
   <div class="nd-touch" hidden><div><button class="nd-t" data-k="left" aria-label="Steer left">◀</button><button class="nd-t" data-k="right" aria-label="Steer right">▶</button></div>
    <div><button class="nd-t sm" data-k="cam" aria-label="Camera">CAM</button><button class="nd-t sm" data-k="hb" aria-label="Handbrake">HB</button><button class="nd-t" data-k="brake" aria-label="Brake">BRAKE</button><button class="nd-t" data-k="gas" aria-label="Accelerate">GAS</button></div></div>
   <div class="nd-warn" role="status">Rotate your device to landscape for the best driving experience.</div></div>`);
  const q=s=>root.querySelector(s);this.q=q;this.scr=q('.nd-scr');this.hud=q('.nd-hud');this.touch=q('.nd-touch');this.big=q('.nd-big');this.mm=q('.nd-mm');this.mc=this.mm.getContext('2d');this.warn=q('.nd-warn')}
 toast(t){const e=this.q('.nd-toast');e.textContent=t;e.classList.add('on');clearTimeout(this._t);this._t=setTimeout(()=>e.classList.remove('on'),2200)}
 count(t){this.big.textContent=t}
 show(name,d){const g=this.g,S=g.S,scr=this.scr;scr.hidden=!name;scr.classList.toggle('full',name==='results'||name==='pause');if(!name){return}
  let h='';
  if(name==='menu'){const st=g.stats,c=N.CARS[g.carIdx];
   h=`<div><div class="nd-k">PAVAN CITY · Stage 1</div><h2 class="nd-logo" id="nd-t">NEON DRIVE</h2><p class="nd-sub">Realistic driving physics on the Proving Ground.</p></div>
    <div class="nd-col"><button class="nd-b p" data-act="mode" data-mode="free">Free drive</button><button class="nd-b" data-act="mode" data-mode="trial">Time trial</button><button class="nd-b" data-act="garage">Garage · ${c.name}</button><button class="nd-b" data-act="settings" data-tab="drive">Settings</button><button class="nd-b" data-act="stats">Statistics</button><button class="nd-b" data-act="exit">Exit to website</button></div>
    <p class="nd-note">Progress is saved in this browser only and does not transfer between devices or browsers. Clearing site data resets it.</p>`}
  else if(name==='garage'){const c=N.CARS[g.carIdx],cu=g.cust(),mx=k=>Math.max.apply(null,N.CARS.map(k));
   const topv=c.tq*c.pk*.1047/(c.cda*.6*1000),pw=c.tq*c.pk/9549,bars=[['Power',pw/mx(x=>x.tq*x.pk/9549)],['Handling',c.mu*c.bf/13],['Braking',c.brake/c.m/16],['Grip',c.mu/1.15],['Light weight',1-c.m/2800]];
   h=`<div><div class="nd-k">Garage</div><h2 class="nd-logo" id="nd-t" style="font-size:2.4rem">${c.name}</h2><p class="nd-sub">${c.cls} · ${c.drive.toUpperCase()} · ${c.m} kg · ${c.gears.length} gears · ${Math.round(pw)} kW peak torque power</p></div>
    <div class="nd-row"><button class="nd-b" data-act="car" data-d="-1" aria-label="Previous vehicle">‹ Prev</button><button class="nd-b" data-act="car" data-d="1" aria-label="Next vehicle">Next ›</button></div>
    <div class="nd-col">${bars.map(b=>`<div class="nd-bar"><span>${b[0]}</span><i style="--v:${Math.round(U.clamp(b[1],0.05,1)*100)}%"></i></div>`).join('')}</div>
    <div class="nd-k">Paint</div><div class="nd-sw" role="radiogroup" aria-label="Paint colour">${N.PAINTS.map(p=>`<button style="background:${p}" role="radio" aria-checked="${cu.col===p}" aria-label="${p}" data-act="cust" data-key="col" data-val="${p}"></button>`).join('')}<input type="color" value="${cu.col}" data-act="cust" data-key="col" aria-label="Custom colour" style="width:34px;height:30px;padding:0;border:0;background:none"></div>
    ${F('Finish',sel('c.finish',cu.finish,Object.keys(N.FINISH).map(k=>[k,k[0].toUpperCase()+k.slice(1)])))}
    ${F('Wheels',sel('c.wheel',cu.wheel,[['five','Five spoke'],['multi','Multi spoke'],['disc','Disc']]))}
    ${F('Wheel finish',sel('c.wcol',cu.wcol,Object.keys(N.WHEELCOL).map(k=>[k,k])))}
    ${F('Window tint',sel('c.tint',cu.tint,[[0,'Light'],[1,'Medium'],[2,'Dark'],[3,'Limo']]))}
    ${F('Brake calipers',sel('c.caliper',cu.caliper,Object.keys(N.CALIPER).map(k=>[k,k])))}
    <p class="nd-note">Drag to rotate, scroll or pinch to zoom. Changes appear instantly and are saved.</p>
    <div class="nd-row"><button class="nd-b p" data-act="menu">Done</button></div>`}
  else if(name==='stats'){const s=g.stats;h=`<div><div class="nd-k">Statistics</div><h2 class="nd-logo" id="nd-t" style="font-size:2.2rem">Your driving</h2></div>
   <div class="nd-col">${F('Distance driven',(s.dist/1000).toFixed(1)+' km')}${F('Time driving',Math.floor(s.time/60)+' min')}${F('Top speed',Math.round(s.top)+' km/h')}${F('Laps completed',s.laps)}
   ${N.CARS.map(c=>F('Best lap · '+c.name,s.best[c.id]?U.fmtT(s.best[c.id]):'—')).join('')}</div><button class="nd-b p" data-act="menu">Back</button>`}
  else if(name==='settings'){const tab=d&&d.tab||this.tab||'drive';this.tab=tab;const tabs=[['drive','Driving'],['camera','Camera'],['graphics','Graphics'],['audio','Audio'],['controls','Controls']];let b='';
   if(tab==='drive')b=F('Speed unit',sel('units',S.units,[['kmh','km/h'],['mph','mph']]))+F('Transmission',sel('trans',S.trans,[['auto','Automatic'],['manual','Manual (E / Q)']]))+F('Traction control',chk('tc',S.tc))+F('ABS',chk('abs',S.abs))+F('Stability control',chk('esc',S.esc))+F('Steering assist',rng('assist',S.assist,0,1,.05));
   if(tab==='camera')b=F('Field of view',rng('fov',S.fov,55,95,1))+F('Camera shake',rng('shake',S.shake,0,1,.05))+F('Look sensitivity',rng('sens',S.sens,.3,2,.05))+`<p class="nd-note">Press C to cycle cameras: ${N.CAMS.join(', ')}. Free look: drag.</p>`;
   if(tab==='graphics')b=F('Quality preset',sel('preset',S.preset,[['auto','Auto (detected: '+N.autoPreset()+')'],['low','Low'],['medium','Medium'],['high','High'],['ultra','Ultra']]))+F('Resolution scale',rng('res',S.res,.5,1,.05))+F('Shadows',chk('shadows',S.shadows))+F('Frame-rate limit',sel('fpsCap',S.fpsCap,[[0,'Unlimited (display rate)'],[30,'30'],[60,'60']]))+`<p class="nd-note">Anti-aliasing is set when the game opens. Changing the preset applies shadows, view distance and trees immediately; reopen the game to change anti-aliasing. No frame rate is guaranteed.</p>`;
   if(tab==='audio')b=F('Master',rng('vol.master',S.vol.master,0,1,.05))+F('Engine',rng('vol.engine',S.vol.engine,0,1,.05))+F('Environment',rng('vol.env',S.vol.env,0,1,.05))+F('Interface',rng('vol.ui',S.vol.ui,0,1,.05))+`<p class="nd-note">Music arrives in a later stage, so there is no music slider yet.</p>`;
   if(tab==='controls')b=Object.keys(ACTS).map(a=>F(ACTS[a],`<button class="nd-b" data-act="remap" data-key="${a}">${S.bind[a].map(KL).join(' / ')}</button>`)).join('')+`<div class="nd-row"><button class="nd-b" data-act="resetbind">Reset to defaults</button></div><p class="nd-note">Gamepad: left stick steer · RT throttle · LT brake · A handbrake · Y camera · Start pause · Back reset · bumpers shift.</p>`;
   h=`<div><div class="nd-k">Settings</div><div class="nd-tabs" role="tablist">${tabs.map(t=>`<button class="nd-b${t[0]===tab?' on':''}" role="tab" aria-selected="${t[0]===tab}" data-act="settings" data-tab="${t[0]}">${t[1]}</button>`).join('')}</div></div><div class="nd-col" id="nd-t" tabindex="-1">${b}</div><div class="nd-row"><button class="nd-b p" data-act="${g.fromPause?'pause':'menu'}">${g.fromPause?'Back to pause':'Done'}</button></div>`}
  else if(name==='pause'){h=`<h2 class="nd-logo" id="nd-t">Paused</h2><div class="nd-col" style="min-width:min(320px,100%)"><button class="nd-b p" data-act="resume">Resume</button><button class="nd-b" data-act="restart">Restart</button><button class="nd-b" data-act="settings" data-tab="camera" data-from="pause">Camera settings</button><button class="nd-b" data-act="settings" data-tab="controls" data-from="pause">Controls</button><button class="nd-b" data-act="settings" data-tab="graphics" data-from="pause">Graphics settings</button><button class="nd-b" data-act="settings" data-tab="audio" data-from="pause">Audio settings</button><button class="nd-b" data-act="garage">Return to garage</button><button class="nd-b" data-act="menu">Exit to main menu</button><button class="nd-b" data-act="exit">Exit to website</button></div>`}
  else if(name==='results'){h=`<div class="nd-k">${d.title}</div><h2 class="nd-logo" id="nd-t">${d.big}</h2><div class="nd-col" style="min-width:min(320px,100%)">${d.rows.map(r=>F(r[0],r[1])).join('')}</div><div class="nd-row" style="justify-content:center"><button class="nd-b p" data-act="restart">Try again</button><button class="nd-b" data-act="garage">Garage</button><button class="nd-b" data-act="menu">Main menu</button></div>`}
  scr.setAttribute('role','dialog');scr.setAttribute('aria-modal','false');scr.setAttribute('aria-labelledby','nd-t');scr.innerHTML=h;const f=scr.querySelector('.nd-b.p')||scr.querySelector('.nd-b');if(f&&name!=='settings')f.focus({preventScroll:true})}
 showHud(v){this.hud.hidden=!v}
 showTouch(v){this.touch.hidden=!v}
 hudUpdate(m){const q=this.q,u=this.g.S.units==='mph'?.621371:1;q('.h-v').textContent=Math.round(m.kmh*u);q('.h-u').textContent=this.g.S.units==='mph'?'MPH':'KM/H';q('.h-g').textContent=m.gear===-1?'R':m.gear;
  q('.nd-rpm i').style.width=Math.round(U.clamp(m.rpm/m.red,0,1)*100)+'%';q('.h-c').textContent=m.cam+(m.dmg>1?' · damage '+Math.round(m.dmg)+'%':'')+(m.assist?' · '+m.assist:'');q('.h-md').textContent=m.title;q('.h-in').textContent=m.info;q('.nd-obj').textContent=m.obj}
 drawMap(w,p,gate,show){const c=this.mc,W=this.mm.width,H=this.mm.height;this.mm.style.display=show?'block':'none';if(!show)return;c.clearRect(0,0,W,H);
  const sx=(W-30)/(2*(w.HX+30)),sz=(H-30)/(2*(w.HZ+30)),k=Math.min(sx,sz),X=x=>W/2+x*k,Z=z=>H/2+z*k;
  c.strokeStyle='rgba(120,180,255,.55)';c.lineWidth=w.W*k;c.lineJoin='round';c.beginPath();w.path.forEach((q,i)=>i?c.lineTo(X(q[0]),Z(q[1])):c.moveTo(X(q[0]),Z(q[1])));c.closePath();c.stroke();
  c.fillStyle='rgba(120,180,255,.25)';c.fillRect(X(-w.PLX),Z(-w.PLZ),w.PLX*2*k,w.PLZ*2*k);
  if(gate>=0){const g=w.gates[gate];c.fillStyle='#19c8ff';c.beginPath();c.arc(X(g.x),Z(g.z),6,0,7);c.fill()}
  c.save();c.translate(X(p.x),Z(p.z));c.rotate(-p.psi);c.fillStyle='#fff';c.beginPath();c.moveTo(0,-9);c.lineTo(6,7);c.lineTo(-6,7);c.closePath();c.fill();c.restore()}
};
N.KL=KL;N.ACTS=ACTS;N._ui=1;
})();
