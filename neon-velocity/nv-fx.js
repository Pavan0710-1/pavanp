/* Neon Velocity FX: camera fly-around, dynamic FOV, shake, speed lines, sparks, shield dome, thruster flare,
   turbo launch, drift + mini-turbo, procedural synthwave audio, touch buttons and UI transitions. */
(function(){
  var $=function(id){return document.getElementById(id)};
  var F={shake:0,fov:null,baseFov:null,lastShield:null,dome:0,domeHold:0,parts:[],prevStep:-1,goT:0,launchDone:false,fwdDownT:0,
         driftKey:false,drifting:false,driftStart:0,setL:false,setR:false,lastT:performance.now(),flash:0,muted:localStorage.getItem('nv-mute')=='1'};
  window.NVFx=F;
  var X=function(){return window.NVExtras&&NVExtras.state||{}};
  function G(){var g=window.hexGL;return g&&g.gameplay&&g.components&&g.components.shipControls?g:null}
  function nitroActive(){var s=X();return !!(s.nitroOn&&s.nitro>0)||F.warp>0}

  // ---------- CSS transitions ----------
  var css=document.createElement('style');
  css.textContent=
   '@keyframes nvFade{from{opacity:0}to{opacity:1}}@keyframes nvRise{from{opacity:0;transform:translateY(24px) scale(.97)}to{opacity:1;transform:none}}'+
   '@keyframes nvGlow{0%,100%{filter:drop-shadow(0 0 6px #29f0ff)}50%{filter:drop-shadow(0 0 22px #ff2bd6)}}'+
   '@keyframes nvBanner{0%{opacity:0;transform:translate(-50%,-50%) scale(2.2)}15%{opacity:1;transform:translate(-50%,-50%) scale(1)}80%{opacity:1}100%{opacity:0;transform:translate(-50%,-60%) scale(.9)}}'+
   '#nv-results,#nv-board,#nv-lobby,#nv-paused,#nv-wait{animation:nvFade .35s ease both}'+
   '#nv-results>*,#nv-board>*,#nv-lobby>*{animation:nvRise .5s cubic-bezier(.2,.8,.2,1) both}'+
   '#nv-results>*:nth-child(2),#nv-board>*:nth-child(2),#nv-lobby>*:nth-child(2){animation-delay:.06s}#nv-results>*:nth-child(3),#nv-board>*:nth-child(3),#nv-lobby>*:nth-child(3){animation-delay:.12s}'+
   '#nv-results>*:nth-child(n+4),#nv-board>*:nth-child(n+4),#nv-lobby>*:nth-child(n+4){animation-delay:.18s}'+
   '#step-1>*{animation:nvRise .6s cubic-bezier(.2,.8,.2,1) both}#step-1 #title{animation:nvRise .6s both,nvGlow 3s ease-in-out infinite}'+
   '#step-1 #menu>div{transition:transform .18s,letter-spacing .18s,color .18s,text-shadow .18s}#step-1 #menu>div:hover{transform:translateX(8px) scale(1.04);letter-spacing:.12em;color:#55e6ff;text-shadow:0 0 12px #29f0ff}'+
   '#nv-curtain{position:fixed;inset:0;z-index:40000;background:#03070f;pointer-events:none;transition:opacity .9s ease}'+
   '.nv-banner{position:fixed;left:50%;top:38%;z-index:12000;font:900 clamp(28px,6vw,64px) Consolas,monospace;letter-spacing:.12em;pointer-events:none;animation:nvBanner 1.3s ease-out forwards;white-space:nowrap;text-shadow:0 0 18px currentColor}'+
   '#nv-vignette{position:fixed;inset:0;z-index:9000;pointer-events:none;opacity:0;box-shadow:inset 0 0 160px 40px rgba(255,30,60,.85)}'+
   '#nv-touch{position:fixed;inset:0;z-index:11000;pointer-events:none;display:none;user-select:none;-webkit-user-select:none}'+
   '#nv-touch b{position:absolute;pointer-events:auto;display:flex;align-items:center;justify-content:center;border-radius:50%;border:2px solid rgba(85,230,255,.7);background:rgba(5,10,20,.45);color:#dffcff;font:800 13px Consolas,monospace;touch-action:none}'+
   '#nv-touch b.on{background:rgba(85,230,255,.45)}'+
   '#nv-mute{position:fixed;top:64px;right:16px;z-index:31000;padding:7px 12px;border:1px solid rgba(85,230,255,.6);border-radius:99px;background:rgba(5,10,20,.7);color:#dffcff;font:800 11px Consolas,monospace;letter-spacing:.1em;cursor:pointer}';
  document.head.appendChild(css);

  function banner(text,color){var b=document.createElement('div');b.className='nv-banner';b.style.color=color||'#55e6ff';b.textContent=text;document.body.appendChild(b);setTimeout(function(){b.remove()},1400)}
  F.banner=banner;

  // Curtain fade when a race starts
  var st=$('start');
  if(st)st.addEventListener('click',function(){if($('nv-curtain'))return;var c=document.createElement('div');c.id='nv-curtain';c.style.opacity='0';document.body.appendChild(c);requestAnimationFrame(function(){c.style.opacity='1'})},true);
  function liftCurtain(){var c=$('nv-curtain');if(c&&!c._lifting){c._lifting=true;c.style.opacity='0';setTimeout(function(){c.remove()},1000)}}

  // ---------- overlay canvas: speed lines + sparks ----------
  var cv=document.createElement('canvas');cv.id='nv-fx';cv.style.cssText='position:fixed;inset:0;width:100%!important;height:100%!important;z-index:9500;pointer-events:none';
  var vg=document.createElement('div');vg.id='nv-vignette';
  var ctx=cv.getContext('2d'),lines=[];
  for(var i=0;i<70;i++)lines.push({a:Math.random()*Math.PI*2,r:Math.random(),s:0.6+Math.random()*0.8,c:Math.random()<0.5?'85,230,255':'255,61,242'});
  var projector=null,v3=null;
  function shipScreen(g){
    if(!projector){projector=new THREE.Projector();v3=new THREE.Vector3()}
    var p=g.components.shipControls.dummy.position;v3.set(p.x,p.y+0.5,p.z);projector.projectVector(v3,g.manager.get('game').camera);
    return {x:(v3.x+1)/2*cv.width,y:(1-v3.y)/2*cv.height};
  }
  function burst(x,y,n,dir,kind){
    for(var i=0;i<n;i++){
      var a=(dir==null?Math.random()*Math.PI*2:dir+(Math.random()-.5)*1.2),sp=(kind=='smoke'?1:4)+Math.random()*(kind=='smoke'?2:9);
      F.parts.push({x:x,y:y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-(kind=='smoke'?1.5:2),life:1,kind:kind||'spark',col:kind=='blue'?'120,200,255':kind=='orange'?'255,140,40':'255,'+(170+Math.floor(Math.random()*80))+',60'});
    }
    if(F.parts.length>600)F.parts.splice(0,F.parts.length-600);
  }
  function drawFx(g,dts){
    var W=window.innerWidth,H=window.innerHeight;
    if(cv.width!=W||cv.height!=H){cv.width=W;cv.height=H}
    ctx.clearRect(0,0,W,H);
    if(!g)return;
    var c=g.components.shipControls,ratio=c.getRealSpeed?Math.min(1.5,c.getRealSpeed()/c.maxSpeed):c.speedRatio;
    var inten=Math.max(0,(ratio-0.55)/0.6)+(nitroActive()?0.7:0)+(F.warp>0?0.6:0);
    if(inten>0.02&&g.gameplay.step==4){
      var cx=W/2,cy=H*0.42,R=Math.hypot(W,H)/2;
      ctx.lineCap='round';
      lines.forEach(function(l){
        l.r+=l.s*0.02*dts*(1+inten*2);if(l.r>1){l.r=0.35+Math.random()*0.1;l.a=Math.random()*Math.PI*2}
        var r0=R*(0.45+l.r*0.6),r1=r0+R*0.12*(0.5+inten),ca=Math.cos(l.a),sa=Math.sin(l.a);
        ctx.strokeStyle='rgba('+l.c+','+Math.min(0.75,inten*0.5*l.r)+')';ctx.lineWidth=1.5+inten*1.5;
        ctx.beginPath();ctx.moveTo(cx+ca*r0,cy+sa*r0);ctx.lineTo(cx+ca*r1,cy+sa*r1);ctx.stroke();
      });
    }
    for(var i=F.parts.length-1;i>=0;i--){
      var p=F.parts[i];p.life-=(p.kind=='smoke'?0.012:0.03)*dts;if(p.life<=0){F.parts.splice(i,1);continue}
      p.x+=p.vx*dts;p.y+=p.vy*dts;p.vy+=(p.kind=='smoke'?-0.02:0.35)*dts;p.vx*=0.98;
      if(p.kind=='smoke'){ctx.fillStyle='rgba(120,130,150,'+(p.life*0.35)+')';ctx.beginPath();ctx.arc(p.x,p.y,(1-p.life)*26+4,0,7);ctx.fill()}
      else{ctx.strokeStyle='rgba('+p.col+','+p.life+')';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-p.vx*2,p.y-p.vy*2);ctx.stroke()}
    }
    vg.style.opacity=String(Math.max(0,F.flash));F.flash-=0.04*dts;
  }

  // ---------- camera: fly-around intro, dynamic FOV, shake ----------
  var CC=bkcore.hexgl.CameraChase.prototype,origCam=CC.update;
  function ease(u){return u<.5?4*u*u*u:1-Math.pow(-2*u+2,3)/2}
  CC.update=function(dt,ratio){
    origCam.call(this,dt,ratio);
    var g=G();if(!g||this.mode!=this.modes.CHASE)return;
    var cam=this.camera,gp=g.gameplay,ship=this.targetObject.position;
    if(F.baseFov==null){F.baseFov=cam.fov;F.fov=cam.fov}
    if(gp.step<4&&gp.active!==false){
      var total=4*gp.countDownDelay+gp.startDelay,u=Math.min(1,Math.max(0,gp.timer.time.elapsed/total)),e=ease(u);
      var a=(1-e)*Math.PI*2.4+Math.PI,R=60-e*30,ox=ship.x+Math.sin(a)*R,oz=ship.z+Math.cos(a)*R,oy=ship.y+10+(1-e)*28;
      cam.position.set(ox+(cam.position.x-ox)*e,oy+(cam.position.y-oy)*e,oz+(cam.position.z-oz)*e);
      cam.lookAt(ship);
    }
    var target=F.baseFov+(gp.step==4?(this.targetObject&&g.components.shipControls.speedRatio*8)+(nitroActive()?16:0)+(F.warp>0?10:0):0);
    F.fov+=(target-F.fov)*0.08;
    if(Math.abs(cam.fov-F.fov)>0.01){cam.fov=F.fov;cam.updateProjectionMatrix()}
    if(F.shake>0.02){cam.position.x+=(Math.random()-.5)*F.shake;cam.position.y+=(Math.random()-.5)*F.shake;cam.position.z+=(Math.random()-.5)*F.shake;F.shake*=0.88}
  };

  // ---------- thruster flare during nitro ----------
  var SE=bkcore.hexgl.ShipEffects.prototype,origSE=SE.update;
  SE.update=function(dt){
    origSE.call(this,dt);
    if(!this.booster||this.shipControls.destroyed)return;
    var n=nitroActive(),k=n?1.9+Math.random()*0.5:1;
    if(F.launchFlare>0){k=Math.max(k,2.4);F.launchFlare-=dt}
    this.booster.scale.multiplyScalar(k);
    if(this.booster.material.color)this.booster.material.color.setHex(n?0xff7bff:0xffffff);
    if(n){this.boosterLight.intensity*=2.2;this.boosterSprite.opacity=1}
  };

  // ---------- input: drift + turbo launch ----------
  document.addEventListener('keydown',function(e){
    if(e.target&&/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
    if(e.keyCode==17||e.keyCode==83||e.keyCode==40)F.driftKey=true;
    if((e.keyCode==87||e.keyCode==38)&&!e.repeat)F.fwdDownT=performance.now();
    if(e.keyCode==77)toggleMute();
    Audio.unlock();
  });
  document.addEventListener('keyup',function(e){if(e.keyCode==17||e.keyCode==83||e.keyCode==40)F.driftKey=false});
  document.addEventListener('pointerdown',function(){Audio.unlock()});

  function driftTick(g,now){
    var c=g.components.shipControls,k=c.key,turning=k.left||k.right,racing=g.gameplay.step==4&&c.active;
    var want=racing&&F.driftKey&&turning&&c.speed>c.maxSpeed*0.35;
    if(want){
      if(!F.drifting){F.drifting=true;F.driftStart=now}
      if(k.left&&!k.ltrigger){k.ltrigger=true;F.setL=true}
      if(k.right&&!k.rtrigger){k.rtrigger=true;F.setR=true}
      var held=(now-F.driftStart)*(F.driftMul||1),s=shipScreen(g);
      if(Math.random()<0.6)burst(s.x+(k.left?40:-40),s.y+18,1,Math.PI/2+(k.left?0.6:-0.6),held>1600?'orange':held>600?'blue':'spark');
    }else if(F.drifting){
      F.drifting=false;
      if(F.setL){k.ltrigger=false;F.setL=false}
      if(F.setR){k.rtrigger=false;F.setR=false}
      var t=(now-F.driftStart)*(F.driftMul||1);
      if(racing&&t>600){var sup=t>1600;c.boost=Math.max(c.boost,c.boosterSpeed*(sup?1.6:1.1));F.launchFlare=sup?40:25;F.shake=sup?1.6:0.8;banner(sup?'SUPER TURBO':'MINI TURBO',sup?'#ff9a2b':'#78c8ff');Audio.whoosh()}
    }
  }
  function launchTick(g,now){
    var gp=g.gameplay,c=g.components.shipControls;
    if(F.prevStep!=gp.step){
      if(gp.step>=1&&gp.step<=3)Audio.beep(440,0.18);
      if(gp.step==4){F.goT=now;F.launchDone=false;Audio.beep(880,0.35);liftCurtain()}
      if(gp.step==0){F.launchDone=false;F.lastShield=null;F.parts.length=0}
      F.prevStep=gp.step;
    }
    if(gp.step==4&&!F.launchDone&&now-F.goT<400&&c.active){
      if(c.key.forward&&F.fwdDownT>F.goT-350){F.launchDone=true;c.speed=c.maxSpeed;c.boost=c.boosterSpeed*1.7;F.launchFlare=60;F.shake=2;banner('TURBO LAUNCH!','#ffd000');Audio.whoosh()}
    }else if(gp.step==4&&now-F.goT>=400)F.launchDone=true;
  }
  function damageTick(g){
    var c=g.components.shipControls;
    if(F.lastShield==null)F.lastShield=c.shield;
    var d=F.lastShield-c.shield;
    if(d>0.0005&&g.gameplay.step==4){
      F.shake=Math.min(7,1.2+d*60);F.dome=1;F.flash=Math.min(0.8,0.25+d*8);
      var s=shipScreen(g);burst(s.x,s.y,10+Math.floor(d*200),null,'spark');burst(s.x,s.y,3,null,'smoke');Audio.crash(Math.min(1,0.3+d*10));
    }
    if(c.collision&&(c.collision.left||c.collision.right)&&g.gameplay.step==4){var s2=shipScreen(g);burst(s2.x+(c.collision.left?-35:35),s2.y+10,3,c.collision.left?Math.PI:0,'spark')}
    if(c.destroyed&&!F.boomed){F.boomed=true;F.shake=9;F.flash=1;var s3=shipScreen(g);burst(s3.x,s3.y,80,null,'spark');burst(s3.x,s3.y,14,null,'smoke');Audio.crash(1)}
    if(!c.destroyed)F.boomed=false;
    F.lastShield=c.shield;
  }

  // ---------- respawn instead of falling off the track ----------
  function safeTick(g,now){
    var c=g.components.shipControls,m=c.collisionMap;
    if(!c.active||c.falling||!m||!m.loaded||g.gameplay.step!=4||now-(F.safeT||0)<250)return;
    if(window.NVHaz&&NVHaz.unsafe())return;
    if(c.collision.left||c.collision.right||c.collision.front)return;
    var x=Math.round(m.pixels.width/2+c.dummy.position.x*c.collisionPixelRatio),z=Math.round(m.pixels.height/2+c.dummy.position.z*c.collisionPixelRatio);
    if(m.getPixel(x,z).r<255)return;
    F.safeT=now;F.hist=F.hist||[];F.hist.push({p:c.dummy.position.clone(),q:c.dummy.quaternion.clone()});if(F.hist.length>8)F.hist.shift();F.safe=F.hist[0];
  }
  var SC=bkcore.hexgl.ShipControls.prototype,origFall=SC.fall,origReset=SC.reset;
  SC.reset=function(){F.safe=null;F.hist=[];return origReset.apply(this,arguments)};
  SC.fall=function(){
    var g=G();
    if(!F.safe||!g||g.gameplay.step!=4||this.destroyed)return origFall.apply(this,arguments);
    this.dummy.position.copy(F.safe.p);this.dummy.position.y+=2;this.dummy.quaternion.copy(F.safe.q);
    this.speed=0;this.boost=0;this.movement.set(0,0,0);this.repulsionForce.set(0,0,0);this.falling=false;this.active=true;
    this.collisionPreviousPosition.copy(this.dummy.position);
    F.hist=[F.safe];F.safeT=performance.now()+1500;
    this.shield=Math.max(0.01,this.shield-0.08);F.lastShield=this.shield;
    F.flash=0.6;F.shake=2;F.dome=1;banner('RESPAWN','#ff5a7a');Audio.crash(0.6);
  };

  // ---------- hexagonal shield dome ----------
  function domeTick(g,dts){
    var c=g.components.shipControls;
    if(!F.domeMesh){
      F.domeMesh=new THREE.Mesh(new THREE.IcosahedronGeometry(7,1),new THREE.MeshBasicMaterial({color:0x55e6ff,wireframe:true,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));
      g.manager.get('game').scene.add(F.domeMesh);
    }
    var hold=F.domeHold>0;
    var vis=Math.max(F.dome,hold?0.55+Math.sin(performance.now()/90)*0.15:0);
    F.domeMesh.visible=vis>0.01;
    F.domeMesh.position.copy(c.dummy.position);F.domeMesh.position.y+=0.6;
    var sc=1+(1-F.dome)*0.25;F.domeMesh.scale.set(sc*0.75,sc*0.45,sc*0.95);
    F.domeMesh.rotation.y+=0.03*dts;
    F.domeMesh.material.opacity=vis*0.8;F.domeMesh.material.color.setHex(hold?0xb46bff:0x55e6ff);
    F.dome=Math.max(0,F.dome-0.035*dts);
  }

  // ---------- main loop ----------
  var tuned=null;
  function frame(){
    requestAnimationFrame(frame);
    var now=performance.now(),dts=Math.min(3,(now-F.lastT)/16.67);F.lastT=now;
    var g=G();
    if(g&&!cv.parentNode){document.body.appendChild(cv);document.body.appendChild(vg)}
    if(g&&g.gameplay.timer.time.elapsed>200)liftCurtain();
    if(g&&g.active!==false){
      var c=g.components.shipControls;
      if(tuned!==c){tuned=c;c.rollAngle=Math.max(c.rollAngle||0.6,0.9);c.rollLerp=0.12;showTouch()}
      if(F.warp>0)F.warp-=dts;
      if(F.domeHold>0)F.domeHold-=dts;
      try{launchTick(g,now);driftTick(g,now);safeTick(g,now);damageTick(g);domeTick(g,dts)}catch(e){console.warn('fx',e)}
      Audio.engine(g.gameplay.step==4&&c.active?c.speedRatio:0,nitroActive());
    }else Audio.engine(0,false);
    drawFx(g,dts);
  }
  requestAnimationFrame(frame);

  // ---------- procedural audio ----------
  var Audio=(function(){
    var A={ctx:null,master:null,music:null,sfx:null,eng:null,step:0,nextT:0};
    A.unlock=function(){
      if(A.ctx){if(A.ctx.state=='suspended')A.ctx.resume();return}
      var AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
      A.ctx=new AC();A.master=A.ctx.createGain();A.master.gain.value=F.muted?0:0.8;A.master.connect(A.ctx.destination);
      A.music=A.ctx.createGain();A.music.gain.value=0.22;A.music.connect(A.master);
      A.sfx=A.ctx.createGain();A.sfx.gain.value=0.6;A.sfx.connect(A.master);
      var o=A.ctx.createOscillator(),o2=A.ctx.createOscillator(),f=A.ctx.createBiquadFilter(),gn=A.ctx.createGain();
      o.type='sawtooth';o2.type='square';o.frequency.value=55;o2.frequency.value=55.5;f.type='lowpass';f.frequency.value=400;gn.gain.value=0;
      o.connect(f);o2.connect(f);f.connect(gn);gn.connect(A.sfx);o.start();o2.start();A.eng={o:o,o2:o2,f:f,g:gn};
      A.noiseBuf=A.ctx.createBuffer(1,A.ctx.sampleRate,A.ctx.sampleRate);var d=A.noiseBuf.getChannelData(0);for(var i=0;i<d.length;i++)d[i]=Math.random()*2-1;
      A.nextT=A.ctx.currentTime+0.1;setInterval(sched,50);
    };
    function env(node,t,a,peak,dec){node.gain.setValueAtTime(0.0001,t);node.gain.exponentialRampToValueAtTime(peak,t+a);node.gain.exponentialRampToValueAtTime(0.0001,t+a+dec)}
    function tone(freq,t,dur,type,vol,dest,cut){var o=A.ctx.createOscillator(),g=A.ctx.createGain(),f=A.ctx.createBiquadFilter();o.type=type;o.frequency.value=freq;f.type='lowpass';f.frequency.value=cut||3000;o.connect(f);f.connect(g);g.connect(dest);env(g,t,0.01,vol,dur);o.start(t);o.stop(t+dur+0.05);return o}
    function noise(t,dur,vol,dest,type,freq){var s=A.ctx.createBufferSource(),f=A.ctx.createBiquadFilter(),g=A.ctx.createGain();s.buffer=A.noiseBuf;f.type=type||'highpass';f.frequency.value=freq||6000;s.connect(f);f.connect(g);g.connect(dest);env(g,t,0.005,vol,dur);s.start(t);s.stop(t+dur+0.05);return f}
    // A minor synthwave loop: Am F C G
    var ROOTS=[45,41,48,43],ARP=[0,7,12,15,12,7,3,7];
    function mtof(m){return 440*Math.pow(2,(m-69)/12)}
    function sched(){
      if(!A.ctx)return;var spb=60/112/4;
      while(A.nextT<A.ctx.currentTime+0.2){
        var t=A.nextT,s=A.step%16,bar=Math.floor(A.step/16)%4,root=ROOTS[bar];
        if(s%4==0){var k=A.ctx.createOscillator(),kg=A.ctx.createGain();k.frequency.setValueAtTime(150,t);k.frequency.exponentialRampToValueAtTime(40,t+0.12);k.connect(kg);kg.connect(A.music);env(kg,t,0.002,0.9,0.18);k.start(t);k.stop(t+0.25)}
        if(s%4==2)noise(t,0.05,0.25,A.music);
        if(s==4||s==12)noise(t,0.14,0.35,A.music,'bandpass',1800);
        if(s%2==0)tone(mtof(root-12),t,spb*1.6,'sawtooth',0.35,A.music,500);
        tone(mtof(root+12+ARP[s%8]),t,spb*0.9,'square',0.09,A.music,2400);
        if(s==0)[0,3,7].forEach(function(iv){tone(mtof(root+12+iv),t,spb*15,'sawtooth',0.05,A.music,1200)});
        A.nextT+=spb;A.step++;
      }
    }
    A.engine=function(r,n){if(!A.eng)return;var t=A.ctx.currentTime;A.eng.o.frequency.setTargetAtTime(45+r*120+(n?40:0),t,0.08);A.eng.o2.frequency.setTargetAtTime(45.7+r*121+(n?40:0),t,0.08);A.eng.f.frequency.setTargetAtTime(300+r*1400+(n?1500:0),t,0.1);A.eng.g.gain.setTargetAtTime(r>0?0.08+r*0.12:0,t,0.15)};
    A.beep=function(f,d){if(!A.ctx)return;tone(f,A.ctx.currentTime,d,'square',0.3,A.sfx,4000)};
    A.whoosh=function(){if(!A.ctx)return;var t=A.ctx.currentTime,f=noise(t,0.6,0.5,A.sfx,'bandpass',400);f.frequency.exponentialRampToValueAtTime(5000,t+0.5)};
    A.zap=function(){if(!A.ctx)return;var t=A.ctx.currentTime,o=tone(1800,t,0.25,'sawtooth',0.25,A.sfx,6000);o.frequency.exponentialRampToValueAtTime(120,t+0.25)};
    A.crash=function(v){if(!A.ctx)return;var t=A.ctx.currentTime;noise(t,0.35*v+0.1,0.6*v,A.sfx,'lowpass',900);var o=tone(90,t,0.4,'sine',0.6*v,A.sfx);o.frequency.exponentialRampToValueAtTime(30,t+0.4)};
    A.pickup=function(){if(!A.ctx)return;var t=A.ctx.currentTime;tone(880,t,0.08,'square',0.18,A.sfx);tone(1320,t+0.06,0.12,'square',0.18,A.sfx)};
    return A;
  })();
  F.audio=Audio;
  // The original MP3 music clashes with the synthwave loop; mute keeps game sounds silent too.
  var origPlay=bkcore.Audio.play;
  bkcore.Audio.play=function(id){if(id=='bg'||F.muted)return;return origPlay.apply(this,arguments)};
  var mb=document.createElement('div');mb.id='nv-mute';
  function muteLabel(){mb.textContent=F.muted?'SOUND OFF (M)':'SOUND ON (M)'}
  function toggleMute(){F.muted=!F.muted;localStorage.setItem('nv-mute',F.muted?'1':'0');muteLabel();if(Audio.master)Audio.master.gain.value=F.muted?0:0.8;if(F.muted){['wind','boost'].forEach(function(id){try{bkcore.Audio.stop(id)}catch(e){}})}}
  mb.onclick=function(e){e.stopPropagation();Audio.unlock();toggleMute()};muteLabel();document.body.appendChild(mb);

  // ---------- touch buttons ----------
  var isTouch=(bkcore.Utils.isTouchDevice&&bkcore.Utils.isTouchDevice())||/[?&]touch=1/.test(location.search);
  function showTouch(){
    if(!isTouch||$('nv-touch'))return;
    var g=G();if(!g)return;var c=g.components.shipControls;
    c.touchController=null;c.orientationController=null;
    var tc=document.querySelectorAll('canvas#tc, #touchcontroller');for(var i=0;i<tc.length;i++)tc[i].style.display='none';
    var t=document.createElement('div');t.id='nv-touch';t.style.display='block';
    var B=[['L','&#9664;','left:18px;bottom:28px;width:84px;height:84px'],['R','&#9654;','left:116px;bottom:28px;width:84px;height:84px'],
           ['GO','GO','right:20px;bottom:28px;width:96px;height:96px;font-size:18px'],['N','NITRO','right:128px;bottom:24px;width:70px;height:70px'],
           ['D','DRIFT','right:128px;bottom:104px;width:64px;height:64px'],['I','ITEM','right:30px;bottom:136px;width:64px;height:64px']];
    t.innerHTML=B.map(function(b){return '<b data-k="'+b[0]+'" style="'+b[2]+'">'+b[1]+'</b>'}).join('');
    document.body.appendChild(t);
    function set(k,on){
      var cc=G()&&G().components.shipControls;if(!cc)return;
      if(k=='L')cc.key.left=on;if(k=='R')cc.key.right=on;if(k=='GO'){cc.key.forward=on;if(on)F.fwdDownT=performance.now()}
      if(k=='N')X().nitroOn=on;if(k=='D')F.driftKey=on;if(k=='I'&&on&&window.NVItems)NVItems.use();
    }
    Array.prototype.forEach.call(t.querySelectorAll('b'),function(el){
      var k=el.getAttribute('data-k');
      el.addEventListener('touchstart',function(e){e.preventDefault();el.classList.add('on');Audio.unlock();set(k,true)},{passive:false});
      el.addEventListener('touchend',function(e){e.preventDefault();el.classList.remove('on');set(k,false)},{passive:false});
      el.addEventListener('touchcancel',function(){el.classList.remove('on');set(k,false)});
    });
  }
})();
