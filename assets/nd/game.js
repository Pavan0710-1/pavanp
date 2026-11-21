/* Game: renderer, fixed-timestep simulation, input (keyboard/gamepad/touch), Free Drive and Time Trial, state machine and full cleanup. */
(function(){'use strict';const N=window.NDM,U=N.U;
N.createGame=function(opts,onClosed){
 const T=window.THREE,bag=new N.Bag(),S=N.loadSettings(),prevFocus=document.activeElement,H=1/120;
 const stats=Object.assign({dist:0,time:0,top:0,laps:0,best:{}},N.store.get('stats',{}));
 let carIdx=Math.min(N.store.get('car',0),N.CARS.length-1);const custAll=N.store.get('cust',{});
 const g={S,stats,get carIdx(){return carIdx},fromPause:false,cust:()=>custAll[carIdx]||(custAll[carIdx]=N.defCust(carIdx))};
 const presetName=()=>S.preset==='auto'?N.autoPreset():S.preset,P=()=>N.PRESETS[presetName()];
 /* DOM and renderer */
 const root=document.createElement('div');root.className='nd';root.setAttribute('aria-label','NEON DRIVE');
 const cvs=document.createElement('canvas');cvs.className='nd-cv';cvs.setAttribute('aria-hidden','true');root.appendChild(cvs);
 const renderer=new T.WebGLRenderer({canvas:cvs,antialias:P().aa,powerPreference:'high-performance'});
 renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 const ui=new N.UI(root,g);const sib=[...document.body.children].filter(e=>e!==root);sib.forEach(e=>{e._ndI=e.inert;e.inert=true});
 const htmlOv=document.documentElement.style.overflow;document.documentElement.style.overflow='hidden';document.body.appendChild(root);
 /* scene */
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(S.fov,1,.2,P().far+400),cams=new N.Cameras(T,camera),rnd=U.rng(1234);
 const env=N.makeEnv(T,bag);scene.environment=env;
 const world=N.buildWorld(T,scene,P(),bag,rnd);
 let veh=null,model=null,mats=null;
 const audio=new N.Audio(S);
 function mountCar(){if(model){scene.remove(model.group);model.dispose()}const pose=veh?{x:veh.x,z:veh.z,psi:veh.psi}:world.plazaPose;veh=new N.Vehicle(N.CARS[carIdx]);veh.reset(pose.x,pose.z,pose.psi);
  model=N.buildCar(T,carIdx,g.cust(),env);model.group.traverse(o=>{if(o.isMesh)o.castShadow=true});scene.add(model.group);model.setLights(lights);audio.c&&audio.setCar(N.CARS[carIdx]);prev={x:veh.x,z:veh.z,psi:veh.psi}}
 function remodel(){const on=model.group.visible;scene.remove(model.group);model.dispose();model=N.buildCar(T,carIdx,g.cust(),env);model.group.traverse(o=>{if(o.isMesh)o.castShadow=true});scene.add(model.group);model.setLights(lights);model.group.visible=on}
 function applyGfx(){const Q=P(),pr=Math.min(devicePixelRatio||1,Q.pr)*S.res;renderer.setPixelRatio(pr);renderer.shadowMap.enabled=Q.shadow>0&&S.shadows;camera.far=Q.far+400;world.applyPreset(Object.assign({},Q,{shadow:S.shadows?Q.shadow:0}));resize()}
 function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();ui.warn.classList.toggle('show',matchMedia('(pointer:coarse)').matches&&h>w&&state!=='menu'&&state!=='garage')}
 /* state */
 let state='menu',mode='free',acc=0,last=0,lastR=0,raf=0,tm=0,frame=0,closed=false,lights=false,showMap=true,prev={x:0,z:0,psi:0},curPose={x:0,z:0,psi:0};
 const trial={cd:0,t:0,seq:0,run:false,done:false},safe={x:0,z:0,psi:0,t:0};
 const keys=new Set(),touch={gas:0,brake:0,left:0,right:0,hb:0};
 const inp={thr:0,brk:0,steer:0,hb:0,up:false,down:false,indicator:0,horn:false},pad={on:false,btn:{}};let remap=null;
 const down=a=>S.bind[a].some(k=>keys.has(k));
 function readInput(dt){
  let tT=(down('accel')||touch.gas)?1:0,bT=(down('brake')||touch.brake)?1:0,sT=((down('right')||touch.right)?1:0)-((down('left')||touch.left)?1:0),hb=(down('hb')||touch.hb)?1:0,an=false;
  const indicatorL=down('indicatorL'),indicatorR=down('indicatorR');
  inp.indicator=indicatorL?-1:(indicatorR?1:0);inp.horn=down('horn');
  const gp=navigator.getGamepads?navigator.getGamepads()[0]:null;pad.on=!!gp;
  if(gp){const ax=gp.axes[0]||0,dz=Math.abs(ax)<.12?0:ax,rt=gp.buttons[7]?gp.buttons[7].value:0,lt=gp.buttons[6]?gp.buttons[6].value:0;
   if(Math.abs(dz)>0||rt>.05||lt>.05||(gp.buttons[0]&&gp.buttons[0].pressed)){sT=dz;tT=Math.max(tT,rt);bT=Math.max(bT,lt);hb=Math.max(hb,gp.buttons[0]&&gp.buttons[0].pressed?1:0);an=Math.abs(dz)>0}
   const edge=(i,fn)=>{const p=gp.buttons[i]&&gp.buttons[i].pressed;if(p&&!pad.btn[i])fn();pad.btn[i]=p};
   edge(3,()=>camNext());edge(9,()=>togglePause());edge(8,()=>doReset());edge(5,()=>inp.up=true);edge(4,()=>inp.down=true);
   if(state==='drive'&&cams.mode===6){cams.yaw-=(gp.axes[2]||0)*dt*2*S.sens}}
  inp.thr=U.damp(inp.thr,tT,tT>inp.thr?14:20,dt);inp.brk=U.damp(inp.brk,bT,bT>inp.brk?14:20,dt);inp.hb=hb;
  const spf=U.clamp(Math.abs(veh.u)/30,0,1);
  if(an)inp.steer=sT;else inp.steer=U.approach(inp.steer,sT,(sT===0?7:U.lerp(4.5,2.2,spf))*dt)}
 /* actions */
 function camNext(){cams.next();ui.toast('Camera: '+N.CAMS[cams.mode]);model.cp.visible=cams.mode===3;audio.ui('tick')}
 function doReset(){if(state!=='drive')return;const p=safe.t>0?safe:world.startPose;veh.reset(p.x,p.z,p.psi);prev={x:p.x,z:p.z,psi:p.psi};cams.init=false;ui.toast('Vehicle reset');audio.ui('back')}
 function togglePause(){if(state==='drive'||state==='countdown')pause();else if(state==='paused')resume()}
 function pause(){if(state!=='drive'&&state!=='countdown')return;g.resumeTo=state;state='paused';g.fromPause=false;ui.show('pause');audio.suspend()}
 function resume(){if(state!=='paused')return;state=g.resumeTo||'drive';ui.show(null);audio.resume();last=performance.now();acc=0}
 function startMode(m){mode=m;audio.init(N.CARS[carIdx]);audio.resume();audio.vol();ui.show(null);ui.showHud(true);ui.showTouch(matchMedia('(pointer:coarse)').matches);
  const p=m==='trial'?world.startPose:world.plazaPose;veh.reset(p.x,p.z,p.psi);prev={x:p.x,z:p.z,psi:p.psi};Object.assign(safe,{x:p.x,z:p.z,psi:p.psi,t:0});veh.dmg=0;cams.init=false;cams.mode=0;model.cp.visible=false;model.group.visible=true;
  if(m==='trial'){Object.assign(trial,{cd:0,t:0,seq:0,run:false,done:false});world.setNextGate(1);state='countdown'}else{world.setNextGate(-1);state='drive'}
  ui.showHud(true);resize()}
 function toMenu(){state='menu';mode='free';ui.showHud(false);ui.showTouch(false);ui.count('');world.setNextGate(-1);veh.reset(world.plazaPose.x,world.plazaPose.z,world.plazaPose.psi);prev={x:veh.x,z:veh.z,psi:veh.psi};model.cp.visible=false;ui.show('menu');audio.suspend();cams.init=false;resize();acc=0}
 function toGarage(){state='garage';ui.showHud(false);ui.showTouch(false);ui.count('');veh.reset(world.plazaPose.x,world.plazaPose.z,world.plazaPose.psi);prev={x:veh.x,z:veh.z,psi:veh.psi};model.cp.visible=false;cams.mode=6;cams.yaw=.7;cams.pitch=.25;cams.zoom=.7;ui.show('garage');resize()}
 function finishTrial(){trial.done=true;trial.run=false;state='results';const t=trial.t,id=N.CARS[carIdx].id,old=stats.best[id],nb=!old||t<old;if(nb)stats.best[id]=t;stats.laps++;persist();audio.ui(nb?'best':'ok');ui.showHud(false);ui.showTouch(false);
  ui.show('results',{title:'Time trial · '+N.CARS[carIdx].name,big:nb?'New best':'Lap complete',rows:[['Lap time',U.fmtT(t)],['Best lap',U.fmtT(stats.best[id])],['Top speed',Math.round(veh.topSeen||0)+' km/h']]})}
 const persist=()=>{N.store.set('stats',stats);N.store.set('car',carIdx);N.store.set('cust',custAll);N.saveSettings(S)};
 g.act=(a,d)=>{audio.init(N.CARS[carIdx]);audio.resume();audio.vol();audio.ui('click');
  if(a==='mode')startMode(d.mode);else if(a==='garage')toGarage();else if(a==='menu'){g.fromPause=false;toMenu()}else if(a==='stats')ui.show('stats');else if(a==='exit')close_();
  else if(a==='settings'){if(d.from)g.fromPause=true;ui.show('settings',d)}else if(a==='pause'){if(g.fromPause&&state==='paused'){g.fromPause=false;ui.show('pause')}else pause()}
  else if(a==='resume')resume();else if(a==='restart')startMode(mode);else if(a==='cam')camNext();
  else if(a==='car'){carIdx=(carIdx+ +d.d+N.CARS.length)%N.CARS.length;persist();mountCar();toGarage()}
  else if(a==='cust'){const cu=g.cust();cu[d.key]=d.val;persist();remodel();ui.show('garage')}
  else if(a==='remap'){remap=d.key;ui.toast('Press a key for: '+N.ACTS[d.key]+' (Esc cancels)')}
  else if(a==='resetbind'){S.bind=JSON.parse(JSON.stringify(N.DEF.bind));persist();ui.show('settings',{tab:'controls'})}};
 g.set=(path,val)=>{if(path.startsWith('c.')){const cu=g.cust();cu[path.slice(2)]=isNaN(+val)||/^[a-z]/i.test(val)?val:+val;persist();remodel();ui.show('garage');return}
 const parts=path.split('.');let o=S;for(let i=0;i<parts.length-1;i++)o=o[parts[i]];o[parts[parts.length-1]]=val;persist();
 if(parts[0]==='vol')audio.vol();else if(path==='preset'||path==='res'||path==='shadows')applyGfx();else if(path==='fov'){camera.fov=val;camera.updateProjectionMatrix()}};

 /* ---------- helpers and wrappers (patched over the functions above) ---------- */
 let screen='menu',lastCrash=-9,safeT=0,dyn=1,ema=16,slow=0;
 const _show=ui.show.bind(ui);ui.show=(n,d)=>{screen=n;return _show(n,d)};
 const _dr=doReset;doReset=function(){if(state==='drive'&&mode==='trial'&&trial.run&&!trial.done){trial.t+=5;ui.toast('Reset penalty +5 s')}_dr()};
 const _sm=startMode;startMode=function(m){cams.zoom=1;acc=0;_sm(m)};
 const envObj={surf:world.surf,query:world.query,grip:1};
 const iv=setInterval(persist,10000);
 function setPR(){renderer.setPixelRatio(Math.min(devicePixelRatio||1,P().pr)*S.res*dyn);renderer.setSize(innerWidth,innerHeight,false)}
 function back(){
  if(state==='drive'||state==='countdown'){pause();return}
  if(state==='paused'){if(screen==='settings'&&g.fromPause){g.fromPause=false;ui.show('pause')}else resume();return}
  if(state==='results'){toMenu();return}
  if(state==='garage'||screen==='settings'||screen==='stats'){g.fromPause=false;toMenu();return}
  if(state==='menu'&&screen==='menu')close_()}
 function trap(e){const f=[...root.querySelectorAll('button,select,input')].filter(x=>!x.disabled&&x.offsetParent!==null);if(!f.length)return;const i=f.indexOf(document.activeElement);
  if(e.shiftKey&&i<=0){e.preventDefault();f[f.length-1].focus()}else if(!e.shiftKey&&i===f.length-1){e.preventDefault();f[0].focus()}}

 /* ---------- Time Trial: 12 gates, 11 checkpoints then the finish line (gate 0) ---------- */
 function trialStep(dt){
  if(state==='countdown'){
   if(trial.cd===0){trial.last='';trial.pd=undefined}
   trial.cd+=dt;const n=trial.cd<1?'3':trial.cd<2?'2':trial.cd<3?'1':'GO';
   if(n!==trial.last){trial.last=n;ui.count(n);audio.ui(n==='GO'?'go':'tick')}
   if(trial.cd>=3){state='drive';trial.run=true;trial.t=0;setTimeout(()=>ui.count(''),700)}
   return}
  if(!trial.run||trial.done)return;
  trial.t+=dt;
  const gi=(trial.seq+1)%12,p=world.gates[gi],dx=veh.x-p.x,dz=veh.z-p.z,d=dx*p.tx+dz*p.tz,l=-dx*p.tz+dz*p.tx;
  if(trial.pd!==undefined&&trial.pd<0&&d>=0&&Math.abs(l)<world.W/2+2){
   trial.seq++;trial.pd=undefined;
   if(trial.seq>=12){finishTrial();return}
   world.setNextGate((trial.seq+1)%12);audio.ui('ok');ui.toast('Checkpoint '+trial.seq+' / 12  ·  '+U.fmtT(trial.t))}
  else trial.pd=d}

 function hud(){
  const tr=mode==='trial',sf=world.surf(veh.x,veh.z),id=N.CARS[carIdx].id;
  ui.hudUpdate({kmh:veh.kmh,gear:veh.gear,rpm:veh.rpm,red:veh.s.red,cam:N.CAMS[cams.mode],dmg:mode==='free'?0:veh.dmg,
   assist:[veh.tc?'TC':'',veh.abs?'ABS':'',veh.esc?'ESC':'',S.trans==='manual'?'MT':''].filter(Boolean).join(' '),
   fuel:veh.fuel,indicator:veh.indicator,horn:veh.horn,
   title:tr?'Time trial':'Free drive',
   info:tr?U.fmtT(trial.t)+(stats.best[id]?'  ·  best '+U.fmtT(stats.best[id]):''):(sf.road?'Road':'Off road · reduced grip'),
   obj:tr?(trial.done?'':(state==='countdown'?'Get ready':'Checkpoint '+(trial.seq+1)+' of 12'+(trial.seq>=11?' · finish line':''))):'Explore the Proving Ground'})}

 /* ---------- per-frame update ---------- */
 function update(dt){
  const run=state==='drive'||state==='countdown';
  if(run){
   readInput(dt);acc+=dt;let sh=false,n=0;
   while(acc>=H&&n<10){
    prev.x=veh.x;prev.z=veh.z;prev.psi=veh.psi;
    if(state==='drive'){
     veh.step(H,inp,envObj,S);inp.up=inp.down=false;if(veh.shiftEv)sh=true;
     if(mode==='free')veh.dmg=0;
     const sp=veh.kmh;stats.dist+=Math.hypot(veh.u,veh.v)*H;stats.time+=H;if(sp>stats.top)stats.top=sp;if(sp>(veh.topSeen||0))veh.topSeen=sp;
     if(veh.hit>4000&&tm-lastCrash>.35){lastCrash=tm;audio.crash(veh.hit)}}
    acc-=H;n++}
   if(acc>H*10)acc=0;if(sh)veh.shiftEv=true;
   if(mode==='trial')trialStep(dt);
   safeT+=dt;
   if(safeT>.5&&state==='drive'){safeT=0;if(world.surf(veh.x,veh.z).road&&veh.kmh>3&&veh.hit===0){safe.x=veh.x;safe.z=veh.z;safe.psi=veh.psi;safe.t=1}
    if(Math.abs(veh.x)>1300||Math.abs(veh.z)>1000)doReset()}
   const al=U.clamp(acc/H,0,1);curPose.x=prev.x+(veh.x-prev.x)*al;curPose.z=prev.z+(veh.z-prev.z)*al;curPose.psi=prev.psi+U.wrap(veh.psi-prev.psi)*al}
  else{curPose.x=veh.x;curPose.z=veh.z;curPose.psi=veh.psi}
  model.group.position.set(curPose.x,0,curPose.z);model.group.rotation.y=curPose.psi;model.apply(veh);
  if(state!=='paused')cams.update(curPose,veh,model,world,S,dt,state==='menu'||state==='results');
  world.followSun(curPose.x,curPose.z);world.sky.position.copy(camera.position);
  audio.update(veh,run);
  if(frame%3===0&&(run||state==='paused')){hud();ui.drawMap(world,curPose,mode==='trial'?(trial.seq+1)%12:-1,showMap)}}

 function loop(now){
  raf=requestAnimationFrame(loop);
  const el=now-last;if(S.fpsCap&&el<1000/S.fpsCap-1)return;
  last=now;const dt=Math.min(el/1000,.1);tm+=dt;frame++;
  try{update(dt);renderer.render(scene,camera)}
  catch(e){console.error('[NeonDrive]',e);cancelAnimationFrame(raf);raf=0;ui.toast('A rendering error occurred. Close and reopen the game.');return}
  /* automatic resolution scaling, only in Auto mode with no frame cap */
  if(S.preset==='auto'&&!S.fpsCap&&tm>4){ema=ema*.95+dt*1000*.05;
   if(ema>26&&dyn>.6){if(++slow>90){dyn=Math.max(.6,dyn-.15);slow=0;ema=16;setPR();ui.toast('Resolution lowered to keep the game smooth')}}else slow=0}}

 /* ---------- input: clicks, settings controls ---------- */
 const on=(t,e,f,o)=>bag.on(t,e,f,o);
 on(root,'click',e=>{const b=e.target.closest&&e.target.closest('[data-act]');if(!b||b.tagName==='INPUT')return;g.act(b.dataset.act,Object.assign({},b.dataset))});
 const onSet=e=>{const t=e.target;if(!t.dataset||!t.dataset.set)return;
  if(e.type==='input'&&t.type!=='range')return;if(e.type==='change'&&t.type==='range')return;
  let v=t.type==='checkbox'?t.checked:t.type==='range'?+t.value:t.value;
  if(t.tagName==='SELECT'&&!t.dataset.set.startsWith('c.')&&/^-?\d+(\.\d+)?$/.test(v))v=+v;
  g.set(t.dataset.set,v)};
 on(root,'input',onSet);on(root,'change',onSet);
 on(root,'change',e=>{const t=e.target;if(t.matches&&t.matches('input[data-act="cust"]'))g.act('cust',{key:t.dataset.key,val:t.value})});
 on(root,'pointerdown',()=>{if(state==='drive'||state==='countdown')audio.resume()});

 /* ---------- input: keyboard ---------- */
 const is=(a,c)=>S.bind[a].includes(c);
 on(window,'keydown',e=>{
  e.stopImmediatePropagation();
  if(remap){e.preventDefault();if(e.code!=='Escape'){S.bind[remap]=[e.code];persist();ui.toast(N.ACTS[remap]+' → '+N.KL(e.code))}remap=null;ui.show('settings',{tab:'controls'});return}
  if(e.code==='Tab'){trap(e);return}
  const driving=state==='drive'||state==='countdown';
  if(!e.repeat){
   if(e.code==='Escape'){e.preventDefault();back();return}
   if((driving||state==='paused')&&is('pause',e.code)){e.preventDefault();togglePause();return}
   if(driving){
    if(is('cam',e.code))camNext();
    else if(is('reset',e.code))doReset();
    else if(is('lights',e.code)){lights=!lights;model.setLights(lights);ui.toast('Headlights '+(lights?'on':'off'))}
    else if(is('map',e.code))showMap=!showMap;
    else if(is('up',e.code)&&S.trans==='manual')inp.up=true;
    else if(is('down',e.code)&&S.trans==='manual')inp.down=true}}
  if(driving&&(e.code.startsWith('Arrow')||e.code==='Space'||['accel','brake','left','right','hb'].some(a=>is(a,e.code))))e.preventDefault();
  keys.add(e.code)},true);
 on(window,'keyup',e=>{keys.delete(e.code);e.stopImmediatePropagation()},true);
 on(window,'blur',()=>{keys.clear();for(const k in touch)touch[k]=0;if(state==='drive'||state==='countdown')pause()});
 on(document,'visibilitychange',()=>{if(document.hidden&&(state==='drive'||state==='countdown'))pause()});
 on(window,'resize',resize);on(window,'orientationchange',()=>setTimeout(resize,250));
 on(cvs,'webglcontextlost',e=>{e.preventDefault();console.warn('[NeonDrive] graphics context lost');close_()});

 /* ---------- input: touch buttons ---------- */
 root.querySelectorAll('.nd-t').forEach(b=>{const k=b.dataset.k;
  on(b,'pointerdown',e=>{e.preventDefault();try{b.setPointerCapture(e.pointerId)}catch(x){}if(k==='cam'){camNext();return}touch[k]=1;b.classList.add('on')});
  ['pointerup','pointercancel','lostpointercapture'].forEach(ev=>on(b,ev,()=>{if(k!=='cam')touch[k]=0;b.classList.remove('on')}))});

 /* ---------- input: pointer on the 3D view (garage rotate, free-look, pinch zoom) ---------- */
 const ptrs=new Map();let pinch=0;
 on(cvs,'pointerdown',e=>{ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});try{cvs.setPointerCapture(e.pointerId)}catch(x){}if(ptrs.size===2){const a=[...ptrs.values()];pinch=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)}});
 on(cvs,'pointermove',e=>{const p=ptrs.get(e.pointerId);if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
  if(ptrs.size===2){const a=[...ptrs.values()],d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);if(pinch)cams.zoom=U.clamp(cams.zoom*pinch/Math.max(d,1),.4,2.4);pinch=d;return}
  if(cams.mode===6&&(state==='garage'||state==='drive'||state==='paused'))cams.drag(dx,dy,S.sens)});
 const pe=e=>{ptrs.delete(e.pointerId);pinch=0};on(cvs,'pointerup',pe);on(cvs,'pointercancel',pe);
 on(cvs,'wheel',e=>{if(state==='garage'||(state==='drive'&&cams.mode===6)){e.preventDefault();cams.zoom=U.clamp(cams.zoom*(1+e.deltaY*.001),.4,2.4)}},{passive:false});

 /* ---------- shutdown: leaves nothing behind ---------- */
 function destroy(){
  if(closed)return;closed=true;cancelAnimationFrame(raf);raf=0;clearInterval(iv);persist();
  bag.dispose();audio.destroy();
  try{scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)[].concat(o.material).forEach(m=>{for(const k in m){const v=m[k];if(v&&v.isTexture)v.dispose()}m.dispose()})})}catch(e){}
  try{if(model)model.dispose()}catch(e){}
  try{if(world.sun.shadow.map)world.sun.shadow.map.dispose()}catch(e){}
  try{renderer.dispose();renderer.forceContextLoss()}catch(e){}
  root.remove();sib.forEach(e=>{e.inert=!!e._ndI;delete e._ndI});document.documentElement.style.overflow=htmlOv;
  try{prevFocus&&prevFocus.focus&&prevFocus.focus()}catch(e){}}
 function close_(){destroy();onClosed&&onClosed()}

 /* ---------- boot ---------- */
 mountCar();applyGfx();ui.show('menu');
 last=performance.now();raf=requestAnimationFrame(loop);
 if(opts&&(opts.mode==='free'||opts.mode==='trial'))startMode(opts.mode);
 return{destroy};
};
N._game=1;
})();
