/* Neon Velocity items, ships and garage: mystery boxes (EMP, Plasma Missile, Phase Shield, Hyper Warp),
   3 ships with different stats, credits earned from races, unlockable paint jobs and engine trails. */
(function(){
  var $=function(id){return document.getElementById(id)};
  var ITEMS={emp:{name:'EMP Shockwave',color:'#7df9ff'},missile:{name:'Plasma Missile',color:'#ff3355'},phase:{name:'Phase Shield',color:'#b46bff'},warp:{name:'Hyper Warp',color:'#ffd000'}};
  var SHIPS={
    interceptor:{name:'Interceptor',desc:'Top speed',speed:1.08,turn:0.92,armor:1.0,drift:1.0,stats:[5,3,3],skin:0x29f0ff},
    viper:{name:'Viper',desc:'Sharp handling + fast drift charge',speed:0.98,turn:1.2,armor:1.1,drift:1.5,stats:[3,5,2],skin:0x5dff8a},
    titan:{name:'Titan',desc:'Heavy shield, shrugs off hits',speed:0.95,turn:0.95,armor:0.55,drift:0.9,stats:[3,2,5],skin:0xff8a2b}
  };
  var SKINS=[['stock','Stock',0,null],['cyan','Neon Cyan',150,0x29f0ff],['magenta','Hot Magenta',150,0xff2bd6],['lime','Toxic Lime',200,0x8aff2b],['gold','Solar Gold',300,0xffd000],['crimson','Crimson',300,0xff2244],['violet','Quantum Violet',400,0xa04bff],['white','Ghost White',500,0xffffff]];
  var TRAILS=[['blue','Ion Blue',0,0x00a2ff],['pink','Plasma Pink',120,0xff3df2],['green','Venom Green',160,0x3dff6a],['fire','Afterburner',250,0xff6a00],['rainbow','Prism',600,-1]];
  function load(){try{return JSON.parse(localStorage.getItem('nv-garage'))||null}catch(e){return null}}
  var GA=load()||{credits:0,ship:'interceptor',skin:'stock',trail:'blue',owned:['stock','blue']};
  function save(){localStorage.setItem('nv-garage',JSON.stringify(GA))}
  var I={item:null,boxes:[],built:null,rolling:0};
  window.NVItems=I;I.garage=GA;
  function G(){var g=window.hexGL;return g&&g.gameplay&&g.components&&g.components.shipControls&&g.track?g:null}
  function fx(){return window.NVFx||{}}
  function S(){return window.NVExtras&&NVExtras.state||{}}
  function mp(){return window.NVNet&&NVNet.active}

  // ---------- ship stats ----------
  var origTweak=bkcore.hexgl.HexGL.prototype.tweakShipControls;
  bkcore.hexgl.HexGL.prototype.tweakShipControls=function(){
    origTweak.call(this);
    var c=this.components.shipControls,sh=SHIPS[GA.ship]||SHIPS.interceptor;
    c.maxSpeed*=sh.speed;c.boosterSpeed=c.maxSpeed*0.5;c.angularSpeed*=sh.turn;c.airAngularSpeed*=sh.turn;c.shieldDamage*=sh.armor;
    if(window.NVFx)NVFx.driftMul=sh.drift;
  };
  I.armor=function(){return (SHIPS[GA.ship]||SHIPS.interceptor).armor};

  // ---------- HUD slot ----------
  function hud(){
    var h=$('nv-item');if(h)return h;
    h=document.createElement('div');h.id='nv-item';
    h.style.cssText='position:fixed;left:18px;top:120px;z-index:10001;width:96px;height:96px;border-radius:18px;border:2px solid rgba(85,230,255,.6);background:rgba(5,10,20,.7);color:#dffcff;display:flex;flex-direction:column;align-items:center;justify-content:center;font:800 11px Consolas,monospace;text-align:center;pointer-events:none;transition:transform .15s';
    document.body.appendChild(h);return h;
  }
  var ICON={emp:'((•))',missile:'>>-->',phase:'[ ◇ ]',warp:'>>>>'};
  function drawHud(){
    var h=hud();
    if(I.rolling>0){var ks=Object.keys(ITEMS),k=ks[Math.floor(performance.now()/80)%4];h.innerHTML='<b style="font-size:20px;color:'+ITEMS[k].color+'">'+ICON[k]+'</b><span style="opacity:.6">...</span>';return}
    if(!I.item){h.innerHTML='<span style="opacity:.45">NO ITEM</span>';h.style.borderColor='rgba(85,230,255,.35)';return}
    var it=ITEMS[I.item];h.style.borderColor=it.color;
    h.innerHTML='<b style="font-size:20px;color:'+it.color+'">'+ICON[I.item]+'</b><span style="margin-top:6px">'+it.name+'</span><span style="opacity:.6;margin-top:2px">F / ITEM</span>';
  }

  // ---------- item boxes ----------
  function build(g){
    I.built=g;I.boxes=[];I.item=null;
    var scene=g.manager.get('game').scene,t=g.track,spots=[];
    if(t.generated&&t.points){
      var pts=t.points,N=pts.length,W=t.def.width;
      for(var k=1;k<=5;k++){var i=Math.floor(k/6*N),ok=true;(t.gaps||[]).forEach(function(q){if(i>=q.ramp-20&&i<=q.end+10)ok=false});if(!ok)i+=50;var p=pts[i%N];[-0.28,0,0.28].forEach(function(f){spots.push({x:p.x+p.nx*W*f,y:p.h+4,z:p.z+p.nz*W*f})})}
    }else{
      var orbs=(S().orbs||[]).filter(function(o){return o.kind=='orb'});
      for(var j=0;j<orbs.length;j+=3){var m=orbs[j].mesh.position;spots.push({x:m.x+6,y:orbs[j].base+1,z:m.z+6})}
    }
    spots.forEach(function(sp){
      var box=new THREE.Mesh(new THREE.CubeGeometry(4.5,4.5,4.5),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.55,fog:false}));
      var wire=new THREE.Mesh(new THREE.CubeGeometry(4.8,4.8,4.8),new THREE.MeshBasicMaterial({color:0xffffff,wireframe:true,fog:false}));
      box.position.set(sp.x,sp.y,sp.z);wire.position.copy(box.position);scene.add(box);scene.add(wire);
      I.boxes.push({box:box,wire:wire,base:sp.y,alive:true,respawn:0,ph:Math.random()*6});
    });
  }
  var col=new THREE.Color();
  function tick(){
    requestAnimationFrame(tick);
    var g=G();if(!g)return;
    if(I.built!==g&&S().started){try{build(g);skinShip(g)}catch(e){console.warn('items',e);I.built=g}}
    var c=g.components.shipControls,now=performance.now(),racing=g.gameplay.step==4&&c.active;
    if(g.gameplay.step<4&&I.item&&g.gameplay.step==0)I.item=null;
    I.boxes.forEach(function(b){
      if(!b.alive){if(now>b.respawn){b.alive=true;b.box.visible=b.wire.visible=true}return}
      col.setHSV(((now/1500)+b.ph)%1,0.7,1);b.box.material.color.copy(col);b.wire.material.color.setHSV(((now/1500)+b.ph+0.5)%1,0.8,1);
      b.box.rotation.y+=0.03;b.box.rotation.x+=0.02;b.wire.rotation.copy(b.box.rotation);
      b.box.position.y=b.wire.position.y=b.base+Math.sin(now/300+b.ph)*0.8;
      if(!racing)return;
      var p=c.dummy.position,dx=p.x-b.box.position.x,dy=p.y-b.box.position.y,dz=p.z-b.box.position.z;
      if(dx*dx+dy*dy+dz*dz<8*8){b.alive=false;b.box.visible=b.wire.visible=false;b.respawn=now+6000;if(!I.item&&I.rolling<=0)roll()}
    });
    if(I.rolling>0&&now>I.rolling){I.rolling=0;var ks=Object.keys(ITEMS);I.item=ks[Math.floor(Math.random()*ks.length)];fx().audio&&fx().audio.pickup()}
    trailTick(g,now);
    if(g.gameplay.step>=0)drawHud();
    var h=$('nv-item');if(h)h.style.display=(g.active===false&&!$('nv-paused'))||$('nv-results')?'none':'flex';
    missileTick(g,now);
  }
  function roll(){I.rolling=performance.now()+900;fx().audio&&fx().audio.beep(660,0.08)}
  requestAnimationFrame(tick);

  // ---------- using items ----------
  I.use=function(){
    var g=G();if(!g||!I.item||g.gameplay.step!=4||!g.components.shipControls.active)return;
    var it=I.item,c=g.components.shipControls;I.item=null;
    var h=$('nv-item');if(h){h.style.transform='scale(1.25)';setTimeout(function(){h.style.transform=''},150)}
    var F=fx(),A=F.audio;
    if(it=='phase'){F.domeHold=240;F.dome=1;F.banner&&F.banner('PHASE SHIELD','#b46bff');A&&A.pickup()}
    else if(it=='warp'){F.warp=150;c.boost=c.boosterSpeed*2.2;c.speed=c.maxSpeed;F.shake=1.5;F.launchFlare=150;F.banner&&F.banner('HYPER WARP','#ffd000');A&&A.whoosh();I.warpUntil=performance.now()+2500}
    else if(it=='emp'){
      F.banner&&F.banner('EMP SHOCKWAVE','#7df9ff');A&&A.zap();F.shake=1;shockRing(g);
      var until=Date.now()+6000,idx=window.NVHaz?NVHaz.idx:0,N=g.track.points?g.track.points.length:1;
      (window.NVHaz?NVHaz.list:[]).forEach(function(o){var d=(o.i-idx+N)%N;if(d<90||d>N-30)o.offUntil=until});
      (S().orbs||[]).forEach(function(o){if(o.kind=='mine'&&o.alive){var dx=o.mesh.position.x-c.dummy.position.x,dz=o.mesh.position.z-c.dummy.position.z;if(dx*dx+dz*dz<250*250){o.alive=false;o.mesh.visible=false}}});
      if(mp())NVNet.sendFx({k:'emp',pos:[c.dummy.position.x,c.dummy.position.z]});
    }
    else if(it=='missile'){fireMissile(g)}
  };
  document.addEventListener('keydown',function(e){if(e.target&&/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;if(e.keyCode==70||e.keyCode==69&&false)I.use()});
  bkcore.hexgl.ShipControls.prototype.update=(function(orig){return function(dt){
    if(I.warpUntil&&performance.now()<I.warpUntil){this.boost=Math.max(this.boost,this.boosterSpeed*2.2)}
    return orig.apply(this,arguments)}})(bkcore.hexgl.ShipControls.prototype.update);

  function shockRing(g){
    var c=g.components.shipControls,scene=g.manager.get('game').scene;
    var ring=new THREE.Mesh(new THREE.TorusGeometry(10,0.8,6,40),new THREE.MeshBasicMaterial({color:0x7df9ff,transparent:true,opacity:0.9,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}));
    ring.rotation.x=Math.PI/2;ring.position.copy(c.dummy.position);scene.add(ring);
    var t0=performance.now();(function grow(){var u=(performance.now()-t0)/700;if(u>=1){scene.remove(ring);return}ring.scale.set(1+u*22,1+u*22,1);ring.material.opacity=0.9*(1-u);requestAnimationFrame(grow)})();
  }
  var missiles=[];
  function fireMissile(g){
    var c=g.components.shipControls,scene=g.manager.get('game').scene,A=fx().audio;
    var m=new THREE.Mesh(new THREE.CubeGeometry(1.2,1.2,6),new THREE.MeshBasicMaterial({color:0xff3355,fog:false}));
    var glow=new THREE.Mesh(new THREE.SphereGeometry(2.4,8,6),new THREE.MeshBasicMaterial({color:0xff7a3a,transparent:true,opacity:0.6,blending:THREE.AdditiveBlending,fog:false}));
    m.add(glow);m.useQuaternion=true;m.quaternion.copy(c.dummy.quaternion);m.position.copy(c.dummy.position);scene.add(m);
    var dir=new THREE.Vector3(0,0,1);c.dummy.matrix.rotateAxis(dir);
    var target=null;
    if(mp()){target=NVNet.targetAhead();if(target)NVNet.sendFx({k:'missile',target:target})}
    missiles.push({m:m,dir:dir,t0:performance.now(),target:target});
    fx().banner&&fx().banner(target?'MISSILE LOCKED':'PLASMA MISSILE','#ff3355');A&&A.zap();
    // Single player: blast the next hazard or mine ahead
    if(!mp()){
      var best=null,bd=1e9,p=c.dummy.position;
      (window.NVHaz?NVHaz.list:[]).forEach(function(o){var q=o.mesh?o.mesh.position:o.beam.position,dx=q.x-p.x,dz=q.z-p.z,d=dx*dx+dz*dz,ahead=dx*dir.x+dz*dir.z>0;if(ahead&&d<bd&&d<700*700){bd=d;best=o}});
      if(best){best.offUntil=Date.now()+15000;missiles[missiles.length-1].hitHaz=best}
      (S().orbs||[]).forEach(function(o){if(o.kind=='mine'&&o.alive){var dx=o.mesh.position.x-p.x,dz=o.mesh.position.z-p.z;if(dx*dir.x+dz*dir.z>0&&dx*dx+dz*dz<500*500){o.alive=false;o.mesh.visible=false}}});
    }
  }
  function missileTick(g,now){
    for(var i=missiles.length-1;i>=0;i--){
      var ms=missiles[i],u=(now-ms.t0)/700;
      ms.m.position.addSelf(ms.dir.clone().multiplyScalar(18));
      if(u>=1){ms.m.parent&&ms.m.parent.remove(ms.m);missiles.splice(i,1)}
    }
  }
  // Incoming effects from other players
  I.onNet=function(d){
    var g=G();if(!g)return;var c=g.components.shipControls,F=fx();
    if(d.k=='emp'){var dx=c.dummy.position.x-d.pos[0],dz=c.dummy.position.z-d.pos[1];if(dx*dx+dz*dz>260*260)return;if(F.domeHold>0){F.dome=1;return}c.speed*=0.3;F.shake=2.5;F.flash=0.4;F.banner&&F.banner('EMP HIT','#7df9ff');F.audio&&F.audio.zap()}
    if(d.k=='missile'&&NVNet.me&&d.target==NVNet.me.id){setTimeout(function(){if(F.domeHold>0){F.dome=1;F.banner&&F.banner('BLOCKED','#b46bff');return}c.speed=0;c.shield=Math.max(0.01,c.shield-0.15*I.armor());F.shake=6;F.flash=0.8;F.banner&&F.banner('MISSILE HIT!','#ff3355');F.audio&&F.audio.crash(1)},600)}
  };

  // ---------- skins and trails ----------
  function skinShip(g){
    var c=g.components.shipControls,mesh=c.mesh;if(!mesh)return;
    var sk=SKINS.filter(function(s){return s[0]==GA.skin})[0],color=sk&&sk[3]!=null?sk[3]:(SHIPS[GA.ship]||SHIPS.interceptor).skin;
    if(I.overlay)mesh.remove(I.overlay);
    I.overlay=new THREE.Mesh(mesh.geometry,new THREE.MeshBasicMaterial({color:color,transparent:true,opacity:GA.skin=='stock'?0.12:0.4,blending:THREE.AdditiveBlending,depthWrite:false}));
    mesh.add(I.overlay);
    if(GA.ship=='titan'){var arm=new THREE.Mesh(mesh.geometry,new THREE.MeshBasicMaterial({color:color,wireframe:true,transparent:true,opacity:0.5}));arm.scale.set(1.06,1.08,1.03);I.overlay.add(arm)}
  }
  function trailTick(g,now){
    var tr=TRAILS.filter(function(t){return t[0]==GA.trail})[0];if(!tr)return;
    var cs=g.components.shipEffects||null,ef=g.components.shipEffects;
    var hex=tr[3]<0?new THREE.Color().setHSV((now/1200)%1,0.8,1).getHex():tr[3];
    var e=ef||(g.components&&g.components.shipEffects);
    if(e&&e.boosterLight)e.boosterLight.color.setHex(hex);
    if(e&&e.booster&&e.booster.material&&e.booster.material.color&&!(window.NVFx&&(NVFx.warp>0||(S().nitroOn&&S().nitro>0))))e.booster.material.color.setHex(hex);
  }

  // ---------- credits ----------
  var origScore=bkcore.hexgl.HexGL.prototype.displayScore;
  bkcore.hexgl.HexGL.prototype.displayScore=function(f,l){
    var r=origScore.apply(this,arguments);
    try{
      var gp=this.gameplay,fin=gp&&gp.result==gp.results.FINISH,earn=Math.round((S().score||0)/40)+(fin?50:10)+(fin?NVExtras.getLevel()*10:0);
      GA.credits+=earn;save();
      var box=$('nv-results');
      if(box){var d=document.createElement('div');d.style.cssText='color:#ffd000;font-weight:800;margin-top:6px';d.textContent='+'+earn+' credits · '+GA.credits+' total';var btn=box.querySelector('input,button');box.insertBefore(d,btn?btn.parentNode:null)}
    }catch(e){console.warn('credits',e)}
    return r;
  };
  I.addCredits=function(n){GA.credits+=n;save()};

  // ---------- garage UI ----------
  function bar(n){var s='';for(var i=0;i<5;i++)s+='<i style="display:inline-block;width:14px;height:6px;margin-right:3px;border-radius:3px;background:'+(i<n?'#55e6ff':'rgba(255,255,255,.12)')+'"></i>';return s}
  function hexs(c){return '#'+('00000'+c.toString(16)).slice(-6)}
  function openGarage(){
    var o=$('nv-garage');if(o)o.remove();
    o=document.createElement('div');o.id='nv-garage';
    o.style.cssText='position:absolute;inset:0;z-index:30000;overflow:auto;display:flex;flex-direction:column;align-items:center;padding:28px 16px;background:#03070f;color:#dffcff;font-family:Consolas,monospace;text-align:center;animation:nvFade .35s ease both';
    var card='display:inline-block;vertical-align:top;margin:6px;padding:14px;border-radius:16px;border:1px solid rgba(85,230,255,.35);background:rgba(85,230,255,.06);cursor:pointer;text-align:left';
    var ships=Object.keys(SHIPS).map(function(k){var s=SHIPS[k],on=GA.ship==k;return '<div data-ship="'+k+'" style="'+card+';width:190px;'+(on?'border-color:#55e6ff;box-shadow:0 0 18px rgba(85,230,255,.5)':'')+'"><b style="font-size:18px;color:'+hexs(s.skin)+'">'+s.name+'</b>'+(on?' <span style="color:#55e6ff">EQUIPPED</span>':'')+'<div style="color:#aeb8c8;font-size:12px;margin:4px 0 8px">'+s.desc+'</div><div style="font-size:11px">SPEED '+bar(s.stats[0])+'</div><div style="font-size:11px">HANDLING '+bar(s.stats[1])+'</div><div style="font-size:11px">SHIELD '+bar(s.stats[2])+'</div></div>'}).join('');
    function shop(list,kind,cur){return list.map(function(it){var own=GA.owned.indexOf(it[0])>=0,on=cur==it[0],c=it[3]==null?'#8894a8':it[3]<0?'linear-gradient(90deg,#f0f,#0ff,#ff0)':hexs(it[3]);
      return '<div data-'+kind+'="'+it[0]+'" style="'+card+';width:120px;text-align:center;'+(on?'border-color:#55e6ff;box-shadow:0 0 14px rgba(85,230,255,.5)':'')+'"><div style="height:26px;border-radius:8px;background:'+c+';margin-bottom:8px"></div><div style="font-size:12px;font-weight:800">'+it[1]+'</div><div style="font-size:11px;color:'+(own?'#5dff8a':'#ffd000')+'">'+(on?'EQUIPPED':own?'OWNED':it[2]+' CR')+'</div></div>'}).join('')}
    o.innerHTML='<h2 style="font-size:clamp(32px,6vw,60px);margin:0">Garage</h2><div style="color:#ffd000;font-weight:800;margin:6px 0 16px">'+GA.credits+' CREDITS</div>'+
      '<div style="color:#55e6ff;letter-spacing:.2em;margin:6px">SHIPS</div><div>'+ships+'</div>'+
      '<div style="color:#55e6ff;letter-spacing:.2em;margin:16px 6px 6px">NEON PAINT JOBS</div><div style="max-width:980px">'+shop(SKINS,'skin',GA.skin)+'</div>'+
      '<div style="color:#55e6ff;letter-spacing:.2em;margin:16px 6px 6px">ENGINE TRAILS</div><div style="max-width:980px">'+shop(TRAILS,'trail',GA.trail)+'</div>'+
      '<div id="nv-garage-msg" style="min-height:20px;color:#ff5a7a;margin-top:10px"></div><button id="nv-garage-close" style="margin-top:8px;padding:12px 26px;border:1px solid #55e6ff;border-radius:99px;background:#55e6ff;color:#06131a;font:800 13px Consolas,monospace;cursor:pointer">Done</button>';
    document.body.appendChild(o);
    o.onclick=function(e){
      e.stopPropagation();var el=e.target.closest&&e.target.closest('[data-ship],[data-skin],[data-trail]');
      if(e.target.id=='nv-garage-close'){o.remove();label();return}
      if(!el)return;
      var sh=el.getAttribute('data-ship'),sk=el.getAttribute('data-skin'),tr=el.getAttribute('data-trail');
      if(sh){GA.ship=sh;save();openGarage();return}
      var id=sk||tr,list=sk?SKINS:TRAILS,it=list.filter(function(x){return x[0]==id})[0];
      if(GA.owned.indexOf(id)<0){if(GA.credits<it[2]){$('nv-garage-msg').textContent='Need '+(it[2]-GA.credits)+' more credits. Race to earn them!';return}GA.credits-=it[2];GA.owned.push(id)}
      if(sk)GA.skin=id;else GA.trail=id;save();openGarage();
    };
  }
  I.openGarage=openGarage;
  var menu=$('menu'),btn=null;
  function label(){if(btn)btn.innerHTML='Garage: '+SHIPS[GA.ship].name+' <span style="color:#ffd000">'+GA.credits+' CR</span>'}
  if(menu){btn=document.createElement('div');btn.id='nv-garage-btn';var ref=$('nv-mp');menu.insertBefore(btn,ref||null);btn.onclick=openGarage;label()}
})();
