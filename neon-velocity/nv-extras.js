/* Neon Velocity extras: level tuning, nitro, energy orbs, mines, score/combo, results and per-level leaderboard. */
(function(){
  var $=function(id){return document.getElementById(id)};
  var LEVELS=[
    {name:'Rookie', maxSpeed:8.0, thrust:0.09, dmg:0.04,orbs:28,heals:6,mines:0, medals:[95,115,140]},
    {name:'Street', maxSpeed:9.0, thrust:0.10, dmg:0.06,orbs:30,heals:5,mines:4, medals:[88,105,130]},
    {name:'Pilot',  maxSpeed:10.0,thrust:0.11, dmg:0.08,orbs:32,heals:5,mines:8, medals:[80,96,120]},
    {name:'Elite',  maxSpeed:11.5,thrust:0.125,dmg:0.10,orbs:34,heals:4,mines:12,medals:[72,88,110]},
    {name:'Legend', maxSpeed:13.0,thrust:0.14, dmg:0.13,orbs:36,heals:3,mines:18,medals:[65,80,100]}
  ];
  var MEDALS=['Gold','Silver','Bronze'],MEDAL_COLORS=['#ffd34d','#cfe3ff','#e0965a'];
  function store(k,d){try{var v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}}
  function save(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
  function getMap(){var m=new URLSearchParams(location.search).get('map')||localStorage.getItem('nv-map')||'Cityscape';return bkcore.hexgl.tracks[m]?m:'Cityscape'}
  function mapLabel(m){var t=bkcore.hexgl.tracks[m];return t&&t.label||m}
  function keyFor(m,l){return m=='Cityscape'?String(l):m+':'+l}
  function curKey(){return keyFor(getMap(),getLevel())}
  function medalsFor(l,m){m=m||getMap();var t=bkcore.hexgl.tracks[m];if(!t||!t.generated)return LEVELS[l-1].medals;t.prepare();var base=3*t.length/(LEVELS[l-1].maxSpeed*60*0.85);return [Math.round(base*1.2),Math.round(base*1.45),Math.round(base*1.8)]}
  function seeded(seed){var x=seed>>>0||1;return function(){x=(x*1664525+1013904223)>>>0;return x/4294967296}}
  function getLevel(){var q=parseInt(new URLSearchParams(location.search).get('level'),10);var l=q||parseInt(localStorage.getItem('nv-level')||'1',10)||1;return Math.max(1,Math.min(5,l))}
  function cfg(){return LEVELS[getLevel()-1]}
  function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function fmt(ms){return ms?(ms/1000).toFixed(2)+' s':'--'}
  function medalFor(ms,l){var m=medalsFor(l);for(var i=0;i<3;i++)if(ms<=m[i]*1000)return i;return -1}
  function boards(){return store('nv-board-v2',{})}
  function bestMedal(l,m){var b=(boards()[keyFor(m||getMap(),l)]||[]),m=-1;b.forEach(function(r){if(r.medal>=0&&(m<0||r.medal<m))m=r.medal});return m}

  // Level tuning: snappy acceleration that scales with level.
  var origTweak=bkcore.hexgl.HexGL.prototype.tweakShipControls;
  bkcore.hexgl.HexGL.prototype.tweakShipControls=function(){
    origTweak.call(this);
    var c=this.components.shipControls,L=cfg();
    c.maxSpeed=L.maxSpeed;c.thrust=L.thrust;c.airResist=0.03;c.airBrake=0.06;
    c.boosterSpeed=c.maxSpeed*0.5;c.boosterDecay=0.01;
    c.angularSpeed=0.0125+0.0006*getLevel();c.airAngularSpeed=c.angularSpeed+0.002;
    c.shieldDamage=this.godmode?0:L.dmg;
  };

  // State
  var S={score:0,combo:1,lastPick:0,nitro:1,nitroOn:false,orbs:[],hud:null,started:false,lastT:0,lastBoost:0};
  document.addEventListener('keydown',function(e){if(e.keyCode==16||e.keyCode==32){S.nitroOn=true;if(e.keyCode==32)e.preventDefault()}});
  document.addEventListener('keyup',function(e){if(e.keyCode==16||e.keyCode==32)S.nitroOn=false});

  function trackPoints(c,n,taken){
    var map=c.collisionMap,w=map.pixels.width,h=map.pixels.height,r=c.collisionPixelRatio,pts=[];
    var sp=c.dummy.position;
    for(var tries=0;tries<40000&&pts.length<n;tries++){
      var px=Math.floor(S.rand()*w),pz=Math.floor(S.rand()*h),col=map.getPixel(px,pz);
      if(!(col.r==255&&col.g>200&&col.b>200))continue;
      var x=(px-w/2)/r,z=(pz-h/2)/r,ok=true;
      if(Math.hypot(x-sp.x,z-sp.z)<150)continue;
      for(var i=0;i<taken.length&&ok;i++)if(Math.hypot(taken[i].x-x,taken[i].z-z)<110)ok=false;
      if(!ok)continue;
      var hm=c.heightMap,hx=hm.pixels.width/2+x*c.heightPixelRatio,hz=hm.pixels.height/2+z*c.heightPixelRatio;
      var y=hm.getPixelFBilinear(hx,hz)/c.heightScale+c.heightBias;
      var p={x:x,y:y,z:z};pts.push(p);taken.push(p);
    }
    return pts;
  }
  function spawnOrbs(g){
    var c=g.components.shipControls,scene=g.manager.get('game').scene,L=cfg(),taken=[];
    var hs=0;curKey().split('').forEach(function(ch){hs=(hs*31+ch.charCodeAt(0))>>>0});S.rand=seeded(hs);
    var kinds=[['orb',L.orbs,0x55e6ff,2.2],['heal',L.heals,0x5dff8a,2.6],['mine',L.mines,0xff2d55,3.0]];
    kinds.forEach(function(k){
      trackPoints(c,k[1],taken).forEach(function(p){
        var m=new THREE.Mesh(new THREE.SphereGeometry(k[3],10,8),new THREE.MeshBasicMaterial({color:k[2],transparent:true,opacity:0.95}));
        m.position.set(p.x,p.y+1.5,p.z);scene.add(m);
        S.orbs.push({kind:k[0],mesh:m,base:p.y+1.5,phase:Math.random()*6,alive:true,respawn:0});
      });
    });
  }
  function pop(msg,color){
    var el=document.createElement('div');el.textContent=msg;
    el.style.cssText='position:absolute;left:50%;top:38%;transform:translate(-50%,0);z-index:10002;font:800 26px Consolas,monospace;color:'+color+';text-shadow:0 0 14px '+color+';pointer-events:none;transition:all .9s ease-out;opacity:1';
    document.body.appendChild(el);requestAnimationFrame(function(){el.style.top='30%';el.style.opacity='0'});setTimeout(function(){el.remove()},950);
  }
  function buildHud(){
    var d=document.createElement('div');d.id='nv-extra-hud';
    d.style.cssText='position:absolute;z-index:10001;left:50%;top:124px;transform:translateX(-50%);display:flex;gap:10px;align-items:center;color:#dffcff;font:700 11px Consolas,monospace;letter-spacing:.12em;text-transform:uppercase;pointer-events:none';
    var pill='padding:8px 12px;border:1px solid rgba(85,230,255,.35);border-radius:99px;background:rgba(5,10,20,.72)';
    d.innerHTML='<span id="nv-score" style="'+pill+'">Score 0</span><span id="nv-combo" style="'+pill+'">x1</span><span style="'+pill+';display:flex;gap:8px;align-items:center">Nitro <i style="display:block;width:120px;height:8px;border-radius:9px;background:rgba(255,255,255,.12);overflow:hidden"><b id="nv-nitro" style="display:block;height:100%;width:100%;background:linear-gradient(90deg,#ff3df2,#55e6ff)"></b></i></span><span id="nv-best" style="'+pill+'">Best --</span>';
    ($('step-4')||document.body).appendChild(d);
    var b=(boards()[curKey()]||[])[0];$('nv-best').textContent='Best '+(b?fmt(b.time):'--');
    S.hud=d;
  }
  function tick(t){
    window.NVState=S;
  requestAnimationFrame(tick);
    var g=window.hexGL;if(!g||!g.gameplay||!g.components||!g.components.shipControls)return;
    var c=g.components.shipControls,gp=g.gameplay;
    if(!S.started){S.started=true;S.lastT=t;try{spawnOrbs(g)}catch(e){console.warn('orbs',e)}buildHud();loadGhost();try{buildMinimap()}catch(e){console.warn('minimap',e)}}
    var dt=Math.min(0.1,(t-S.lastT)/1000);S.lastT=t;
    var racing=gp.step==4&&c.active&&!c.destroyed;
    // boost pads refill nitro
    if(c.boost>=c.boosterSpeed-0.001&&S.lastBoost<c.boosterSpeed-0.001&&!S.nitroOn){S.nitro=Math.min(1,S.nitro+0.3);pop('+NITRO','#ff3df2')}
    if(racing&&S.nitroOn&&S.nitro>0){S.nitro=Math.max(0,S.nitro-dt*0.45);c.boost=Math.max(c.boost,c.boosterSpeed*1.2);c.speed=Math.min(c.maxSpeed,c.speed+c.thrust*dt*60)}
    else S.nitro=Math.min(1,S.nitro+dt*0.04);
    S.lastBoost=c.boost;
    if(racing&&t-S.lastPick>4000&&S.combo>1){S.combo=1}
    var pos=c.dummy.position;
    S.orbs.forEach(function(o){
      if(!o.alive){if(t>o.respawn&&o.kind!='mine'){o.alive=true;o.mesh.visible=true}return}
      o.mesh.position.y=o.base+Math.sin(t/300+o.phase)*0.8;
      if(o.kind!='mine')o.mesh.rotation.y+=dt*3;
      if(!racing)return;
      var dx=o.mesh.position.x-pos.x,dz=o.mesh.position.z-pos.z,dy=o.mesh.position.y-pos.y;
      if(dx*dx+dz*dz+dy*dy>9*9)return;
      o.alive=false;o.mesh.visible=false;o.respawn=t+12000;
      if(o.kind=='mine'){c.shield=Math.max(0,c.shield-0.25);c.speed*=0.45;S.combo=1;pop('MINE HIT','#ff2d55');if(c.shield<=0)c.destroy&&c.destroy();return}
      if(t-S.lastPick<4000)S.combo=Math.min(8,S.combo+1);S.lastPick=t;
      var pts=(o.kind=='heal'?150:100)*S.combo;S.score+=pts;
      if(o.kind=='heal'){c.shield=Math.min(c.maxShield,c.shield+0.3);pop('+SHIELD +'+pts,'#5dff8a')}
      else{S.nitro=Math.min(1,S.nitro+0.18);pop('+'+pts+(S.combo>1?'  x'+S.combo:''),'#55e6ff')}
    });
    try{ghostTick();miniTick()}catch(e){}
    if(S.hud){$('nv-score').textContent='Score '+S.score;$('nv-combo').textContent='Combo x'+S.combo;$('nv-nitro').style.width=Math.round(S.nitro*100)+'%'}
  }
  window.NVState=S;
  requestAnimationFrame(tick);

  // Results screen + leaderboard save
  var origScore=bkcore.hexgl.HexGL.prototype.displayScore;
  bkcore.hexgl.HexGL.prototype.displayScore=function(f,l){
    try{origScore.call(this,f,l)}catch(e){console.warn(e)}
    var gp=this.gameplay,finished=gp.result==gp.results.FINISH,lv=getLevel(),L=LEVELS[lv-1];
    if($('step-5'))$('step-5').style.display='none';
    var name=localStorage.getItem('nv-name')||'Pilot',medal=-1,rank=0,rec=null,total=S.score;
    if(finished){
      medal=medalFor(f,lv);
      var md=medalsFor(lv);total=S.score+Math.max(0,Math.round((md[2]*1000-f)/10))+(medal>=0?(3-medal)*500:0);
      var key=curKey(),b=boards();b[key]=b[key]||[];rec={name:name,time:f,score:total,medal:medal,laps:l,date:Date.now(),id:Math.random().toString(36).slice(2)};
      b[key].push(rec);b[key].sort(function(a,c){return a.time-c.time});b[key]=b[key].slice(0,10);save('nv-board-v2',b);
      rank=b[key].indexOf(rec)+1;if(rank==1&&!(window.NVNet&&NVNet.active))saveGhost(f);
      if(lv<5)localStorage.setItem('nv-unlocked',String(Math.max(lv+1,parseInt(localStorage.getItem('nv-unlocked')||'1',10))));
    }
    var btn='padding:12px 20px;border:1px solid #55e6ff;border-radius:99px;background:rgba(85,230,255,.12);color:#dffcff;font:800 13px Consolas,monospace;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;margin:6px';
    var box=document.createElement('div');box.id='nv-results';
    box.style.cssText='position:absolute;inset:0;z-index:20000;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(3,7,15,.9);color:#dffcff;font-family:Consolas,monospace;text-align:center';
    box.innerHTML='<div style="letter-spacing:.3em;color:#55e6ff">'+mapLabel(getMap()).toUpperCase()+' · LEVEL '+lv+' · '+L.name.toUpperCase()+'</div>'+
      '<h1 style="font-size:clamp(36px,7vw,72px);margin:10px 0">'+(finished?'Finished!':'Destroyed')+'</h1>'+
      (finished?'<div style="font-size:28px">'+fmt(f)+'</div><div style="margin:8px 0;font-size:20px;color:'+(medal>=0?MEDAL_COLORS[medal]:'#8894a8')+'">'+(medal>=0?MEDALS[medal]+' medal':'No medal - Bronze is '+medalsFor(lv)[2]+' s')+'</div>'+
        '<div style="color:#aeb8c8">Laps: '+l.map(function(x){return fmt(x)}).join(' / ')+'</div><div style="margin:10px 0;font-size:18px">Score '+total+(rank?' · Rank #'+rank:' · Not in top 10')+'</div>'+
        (rank?'<div style="margin:8px"><input id="nv-name" maxlength="16" value="'+esc(name)+'" style="padding:10px 14px;border-radius:99px;border:1px solid #55e6ff;background:#06131a;color:#dffcff;font:700 14px Consolas,monospace;text-align:center"><button id="nv-save" style="'+btn+'">Save name</button></div>':'')
        :'<div style="color:#aeb8c8">Your shield failed. Dodge red mines and grab green orbs to repair.</div><div style="margin:10px 0">Score '+S.score+'</div>')+
      '<div style="margin-top:14px"><button id="nv-retry2" style="'+btn+'">Retry</button>'+(finished&&lv<5?'<button id="nv-next" style="'+btn+';background:#55e6ff;color:#06131a">Next level</button>':'')+'<button id="nv-lb" style="'+btn+'">Leaderboard</button><button id="nv-menu" style="'+btn+'">Menu</button></div>';
    if(window.NVNet&&NVNet.active){NVNet.onFinish(finished?f:null);var btns=box.querySelector('div[style*="margin-top:14px"]');btns.innerHTML=(NVNet.host?'<button id="nv-rematch" style="'+btn+';background:#55e6ff;color:#06131a">Rematch</button>':'<span style="color:#aeb8c8">Waiting for host to start a rematch...</span><br>')+'<button id="nv-leave" style="'+btn+'">Leave race</button>';var st=document.createElement('div');st.id='nv-mp-standings';st.style.cssText='margin-top:14px;width:min(520px,92vw)';box.insertBefore(st,btns)}
    document.body.appendChild(box);
    box.onclick=function(e){e.stopPropagation()};
    if(window.NVNet&&NVNet.active){if($('nv-rematch'))$('nv-rematch').onclick=function(){NVNet.rematch()};$('nv-leave').onclick=function(){NVNet.leave()};NVNet.renderStandings();return}
    function go(level){var u=new URL(location.href);u.searchParams.set('level',String(level));localStorage.setItem('nv-level',String(level));location.href=u.toString()}
    $('nv-retry2').onclick=function(){restart()};
    $('nv-menu').onclick=function(){go(lv)};
    if($('nv-next'))$('nv-next').onclick=function(){go(lv+1)};
    $('nv-lb').onclick=function(){showBoard(lv,getMap())};
    if($('nv-save'))$('nv-save').onclick=function(){
      var n=($('nv-name').value||'Pilot').trim().slice(0,16)||'Pilot';localStorage.setItem('nv-name',n);
      var b=boards();(b[curKey()]||[]).forEach(function(r){if(r.id==rec.id)r.name=n});save('nv-board-v2',b);$('nv-save').textContent='Saved';
    };
  };

  function showBoard(sel,map){
    map=map||getMap();
    var old=$('nv-board');if(old)old.remove();
    var box=document.createElement('div');box.id='nv-board';
    box.style.cssText='position:absolute;inset:0;z-index:30000;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;background:rgba(3,7,15,.96);color:#dffcff;text-align:center;font-family:Consolas,monospace';
    function tab(attr,val,on,text){return '<button '+attr+'="'+val+'" style="padding:8px 14px;margin:4px;border-radius:99px;border:1px solid #55e6ff;background:'+(on?'#55e6ff':'transparent')+';color:'+(on?'#06131a':'#dffcff')+';font:800 12px Consolas,monospace;cursor:pointer">'+text+'</button>'}
    var mapTabs=bkcore.hexgl.trackList.map(function(t){return tab('data-m',t.id,t.id==map,t.label)}).join('');
    var tabs=LEVELS.map(function(L,i){return tab('data-l',i+1,i+1==sel,(i+1)+' · '+L.name)}).join('');
    var rows=(boards()[keyFor(map,sel)]||[]);
    var cols='display:grid;grid-template-columns:50px 1fr 110px 90px 80px;gap:8px;padding:10px 14px;text-align:left;width:min(620px,92vw)';
    var body=rows.length?rows.map(function(r,i){return '<div style="'+cols+';border-bottom:1px solid rgba(85,230,255,.18)"><b>#'+(i+1)+'</b><span>'+esc(r.name||'Pilot')+'</span><span>'+fmt(r.time)+'</span><span>'+(r.score||0)+'</span><span style="color:'+(r.medal>=0?MEDAL_COLORS[r.medal]:'#8894a8')+'">'+(r.medal>=0?MEDALS[r.medal]:'-')+'</span></div>'}).join(''):'<p style="color:#aeb8c8">No runs here yet.</p>';
    var m=medalsFor(sel,map);
    box.innerHTML='<h2 style="font-size:clamp(32px,6vw,64px);margin:0 0 12px">Leaderboard</h2><div>'+mapTabs+'</div><div>'+tabs+'</div><div style="color:#aeb8c8;margin:10px 0 6px">Medals: Gold '+m[0]+' s · Silver '+m[1]+' s · Bronze '+m[2]+' s</div>'+
      '<div style="'+cols+';padding:6px 14px;color:#55e6ff;font-size:12px"><span>RANK</span><span>PILOT</span><span>TIME</span><span>SCORE</span><span>MEDAL</span></div>'+body+
      '<button id="nv-board-close" style="margin-top:18px;padding:12px 24px;border:1px solid #55e6ff;border-radius:99px;background:#55e6ff;color:#06131a;font-weight:800;cursor:pointer">Close</button>';
    document.body.appendChild(box);
    box.onclick=function(e){e.stopPropagation();var g=e.target.getAttribute&&e.target;if(!g)return;var l=g.getAttribute('data-l'),mm=g.getAttribute('data-m');if(l)showBoard(parseInt(l,10),map);if(mm)showBoard(sel,mm)};
    $('nv-board-close').onclick=function(e){e.stopPropagation();box.remove()};
  }
  window.NVShowBoard=showBoard;

  // Shared helpers for ghost and multiplayer ships
  function makeShip(color,opacity,textured){
    var g=window.hexGL,lib=g.track.lib,mat={color:color,transparent:opacity<1,opacity:opacity};
    if(textured)mat.map=lib.get('textures','ship.feisar.diffuse');
    var m=new THREE.Mesh(lib.get('geometries','ship.feisar'),new THREE.MeshBasicMaterial(mat));
    m.useQuaternion=true;g.manager.get('game').scene.add(m);return m;
  }
  function progress(){
    var g=window.hexGL;if(!g||!g.gameplay)return 0;
    var gp=g.gameplay,t=g.track,c=g.components.shipControls,lap=(gp.lap||1)-1;
    if(t.generated&&t.points){
      var pts=t.points,n=pts.length,best=S.progIdx||0,bd=1e18,p=c.dummy.position;
      for(var k=-40;k<=80;k++){var i=((S.progIdx||0)+k+n)%n,q=pts[i],d=(q.x-p.x)*(q.x-p.x)+(q.z-p.z)*(q.z-p.z);if(d<bd){bd=d;best=i}}
      if(bd>400*400)for(var j=0;j<n;j+=4){var q2=pts[j],d2=(q2.x-p.x)*(q2.x-p.x)+(q2.z-p.z)*(q2.z-p.z);if(d2<bd){bd=d2;best=j}}
      S.progIdx=best;var f=best/n;if(f>0.9&&lap>0&&gp.previousCheckPoint===0)f-=1;return lap+f;
    }
    return lap+[0,1/3,2/3][gp.previousCheckPoint]||lap;
  }

  // Ghost of your best run on this map + level
  S.ghostRec=[];S.ghost=null;S.ghostMesh=null;
  function saveGhost(){try{localStorage.setItem('nv-ghost-'+curKey(),JSON.stringify(S.ghostRec))}catch(e){}}
  function loadGhost(){try{S.ghost=JSON.parse(localStorage.getItem('nv-ghost-'+curKey())||'null')}catch(e){S.ghost=null}}
  function ghostTick(){
    var g=window.hexGL,gp=g.gameplay,c=g.components.shipControls;
    if(window.NVNet&&NVNet.active)return;
    if(gp.step!=4){if(S.ghostMesh)S.ghostMesh.visible=false;return}
    var t=gp.timer.time.elapsed,fi=Math.floor(t/100);
    if(c.active&&S.ghostRec.length/7<=fi){var p=c.dummy.position,q=c.dummy.quaternion;S.ghostRec.push(+p.x.toFixed(1),+p.y.toFixed(1),+p.z.toFixed(1),+q.x.toFixed(3),+q.y.toFixed(3),+q.z.toFixed(3),+q.w.toFixed(3))}
    if(!S.ghost||S.ghost.length<14)return;
    if(!S.ghostMesh)S.ghostMesh=makeShip(0xffffff,0.35,false);
    var n=S.ghost.length/7,a=Math.min(n-1,fi),b=Math.min(n-1,fi+1),u=(t%100)/100,G=S.ghost;
    S.ghostMesh.visible=fi<n;
    S.ghostMesh.position.set(G[a*7]+(G[b*7]-G[a*7])*u,G[a*7+1]+(G[b*7+1]-G[a*7+1])*u,G[a*7+2]+(G[b*7+2]-G[a*7+2])*u);
    S.ghostMesh.quaternion.set(G[a*7+3],G[a*7+4],G[a*7+5],G[a*7+6]);
  }

  // Minimap
  function buildMinimap(){
    var g=window.hexGL,an=g.track.analyser;if(!an||!an.pixels)return;
    var W=an.pixels.width,size=170,bg=document.createElement('canvas');bg.width=bg.height=size;
    var x=bg.getContext('2d'),step=W/size;
    x.fillStyle='rgba(85,230,255,.85)';
    for(var pz=0;pz<size;pz++)for(var px=0;px<size;px++){var c=an.getPixel(Math.floor(px*step),Math.floor(pz*step));if(c.r==255)x.fillRect(px,pz,1.6,1.6)}
    var cv=document.createElement('canvas');cv.id='nv-minimap';cv.width=cv.height=size;
    cv.style.cssText='position:fixed;right:18px;bottom:120px;width:170px!important;height:170px!important;z-index:10001;border:1px solid rgba(85,230,255,.35);border-radius:14px;background:rgba(5,10,20,.6);pointer-events:none';
    document.body.appendChild(cv);
    S.mini={cv:cv,bg:bg,ratio:(g.track.pixelRatio||W/6000),W:W,size:size};
  }
  function dot(ctx,p,color,r){var M=S.mini,k=M.size/M.W;ctx.fillStyle=color;ctx.beginPath();ctx.arc((M.W/2+p.x*M.ratio)*k,(M.W/2+p.z*M.ratio)*k,r,0,7);ctx.fill()}
  function miniTick(){
    if(!S.mini)return;var M=S.mini,ctx=M.cv.getContext('2d'),g=window.hexGL;
    ctx.clearRect(0,0,M.size,M.size);ctx.drawImage(M.bg,0,0);
    S.orbs.forEach(function(o){if(o.alive&&o.kind=='mine')dot(ctx,o.mesh.position,'#ff2d55',1.5)});
    if(S.ghostMesh&&S.ghostMesh.visible)dot(ctx,S.ghostMesh.position,'rgba(255,255,255,.6)',3);
    if(window.NVNet&&NVNet.active)NVNet.eachRemote(function(pos,color){dot(ctx,pos,'#'+('00000'+color.toString(16)).slice(-6),3.5)});
    dot(ctx,g.components.shipControls.dummy.position,'#ffffff',4.5);
  }

  // Pause (P) and restart (R)
  function loop(){var g=window.hexGL;if(g.active)requestAnimationFrame(loop);g.update()}
  function restart(){
    var g=window.hexGL;if(!g||!g.gameplay)return;
    ['nv-results','nv-board','nv-paused'].forEach(function(id){var e=$(id);if(e)e.remove()});
    if($('step-5'))$('step-5').style.display='none';
    if(g.containers&&g.containers.main&&g.containers.main.parentElement)g.containers.main.parentElement.style.display='block';
    S.score=0;S.combo=1;S.nitro=1;S.ghostRec=[];S.progIdx=0;loadGhost();
    S.orbs.forEach(function(o){if(o.kind!='mine'||!o.alive){o.alive=true;o.mesh.visible=true}});
    var wasActive=g.active;g.active=true;g.manager.time=window.perfNow();
    g.restart();if(!wasActive)loop();
  }
  function togglePause(){
    var g=window.hexGL;if(!g||!g.gameplay||(window.NVNet&&NVNet.active)||$('nv-results'))return;
    if(g.active){g.active=false;S.pausedAt=Date.now();
      var d=document.createElement('div');d.id='nv-paused';d.style.cssText='position:absolute;inset:0;z-index:15000;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(3,7,15,.6);color:#dffcff;font:800 54px Consolas,monospace;letter-spacing:.2em';d.innerHTML='PAUSED<div style="font-size:14px;letter-spacing:.15em;margin-top:12px">P resume · R restart</div>';document.body.appendChild(d);
    }else{var dt=Date.now()-S.pausedAt,tm=g.gameplay.timer.time;tm.start+=dt;tm.previous+=dt;g.active=true;g.manager.time=window.perfNow();var e=$('nv-paused');if(e)e.remove();loop()}
  }
  document.addEventListener('keydown',function(e){
    if(e.target&&/INPUT|TEXTAREA/.test(e.target.tagName))return;
    if(e.keyCode==80)togglePause();
    if(e.keyCode==82&&!(window.NVNet&&NVNet.active)&&window.hexGL&&hexGL.gameplay)restart();
  });

  window.NVExtras={state:S,makeShip:makeShip,progress:progress,restart:restart,getMap:getMap,getLevel:getLevel,mapLabel:mapLabel,LEVELS:LEVELS};

  // Menu: map picker, per-map leaderboard, medal on level label
  var lb=$('nv-leaderboard');if(lb)lb.onclick=function(){showBoard(getLevel(),getMap())};
  var levelEl=$('s-level'),mapEl=$('s-map');
  function label(){var l=getLevel(),m=bestMedal(l);levelEl.innerHTML='Level: '+l+' · '+LEVELS[l-1].name+(m>=0?' <span style="color:'+MEDAL_COLORS[m]+'">★ '+MEDALS[m]+'</span>':'')}
  function setParam(k,v){localStorage.setItem('nv-'+k,String(v));var u=new URL(location.href);u.searchParams.set(k,String(v));history.replaceState(null,'',u)}
  if(levelEl){var oc=levelEl.onclick;levelEl.onclick=function(e){oc&&oc.call(this,e);label()};label()}
  if(mapEl){
    var mlabel=function(){mapEl.innerHTML='Map: '+mapLabel(getMap())};mlabel();
    mapEl.onclick=function(){var L=bkcore.hexgl.trackList,i=0;L.forEach(function(t,k){if(t.id==getMap())i=k});setParam('map',L[(i+1)%L.length].id);mlabel();label()};
  }
  window.NVSetParam=setParam;
})();
