/* Neon Velocity hazards: laser gates, sliding barriers, drifting asteroids, jump ramps over void gaps. Scales with level. */
(function(){
  var H={list:[],built:null,air:null,h:0,idx:0};
  window.NVHaz=H;
  function G(){var g=window.hexGL;return g&&g.gameplay&&g.components&&g.components.shipControls&&g.track?g:null}
  function seeded(seed){var x=seed>>>0||1;return function(){x=(x*1664525+1013904223)>>>0;return x/4294967296}}
  function fx(){return window.NVFx||{}}
  H.unsafe=function(){var g=G();if(!g||!g.track.generated)return false;return !!H.air||g.track.inGap(H.idx)||isNearRamp(g)};
  function isNearRamp(g){var gs=g.track.gaps||[];for(var k=0;k<gs.length;k++)if(H.idx>=gs[k].ramp-4&&H.idx<gs[k].end+4)return true;return false}

  function mat(color,op,wire){return new THREE.MeshBasicMaterial({color:color,transparent:op<1,opacity:op,wireframe:!!wire,blending:op<1?THREE.AdditiveBlending:THREE.NormalBlending,depthWrite:op>=1,fog:false})}
  function build(g){
    H.built=g;H.list=[];H.air=null;H.h=0;
    var t=g.track;if(!t.generated||!t.points)return;
    var lv=NVExtras.getLevel(),L=NVExtras.LEVELS[lv-1],pts=t.points,N=pts.length,W=t.def.width,scene=g.manager.get('game').scene;
    var hs=0;(t.name+':'+lv).split('').forEach(function(ch){hs=(hs*31+ch.charCodeAt(0))>>>0});var r=seeded(hs^0x5bd1e995);
    var used=[[0,110],[N-60,N]];
    (t.gaps||[]).forEach(function(gp){used.push([gp.ramp-30,gp.end+20])});
    [0,Math.floor(N/3),Math.floor(2*N/3)].forEach(function(c){used.push([c-25,c+25])});
    function slot(){for(var k=0;k<300;k++){var i=110+Math.floor(r()*(N-180)),ok=true;used.forEach(function(u){if(i>=u[0]-8&&i<=u[1]+8)ok=false});if(ok){used.push([i-16,i+16]);return i}}return -1}
    function add(type,n){for(var k=0;k<n;k++){var i=slot();if(i>=0)H.list.push(make(type,i))}}
    function make(type,i){
      var p=pts[i],o={type:type,i:i,p:p,phase:r()*10,cool:0,W:W};
      if(type=='laser'){
        o.sweep=r()<0.5;
        var posts=new THREE.Geometry();
        [-1,1].forEach(function(s){var m=new THREE.Mesh(new THREE.CubeGeometry(3,16,3));m.position.set(p.x+p.nx*s*(W/2+2),p.h+7,p.z+p.nz*s*(W/2+2));m.rotation.y=p.yaw;m.updateMatrix();THREE.GeometryUtils.merge(posts,m)});
        scene.add(new THREE.Mesh(posts,mat(0x551018,1)));
        o.beam=new THREE.Mesh(new THREE.CubeGeometry(W+4,0.9,0.9),mat(0xff1a3a,0.95));o.beam.rotation.y=p.yaw;scene.add(o.beam);
        o.glow=new THREE.Mesh(new THREE.CubeGeometry(W+4,3,3),mat(0xff1a3a,0.25));o.glow.rotation.y=p.yaw;scene.add(o.glow);
      }else if(type=='barrier'){
        o.bw=W*0.42;o.speed=0.8+r()*0.6;
        o.mesh=new THREE.Mesh(new THREE.CubeGeometry(o.bw,8,5),mat(0x2a0636,1));o.mesh.rotation.y=p.yaw;scene.add(o.mesh);
        o.wire=new THREE.Mesh(new THREE.CubeGeometry(o.bw+0.4,8.4,5.4),mat(0xff2bd6,0.9,true));o.wire.rotation.y=p.yaw;scene.add(o.wire);
      }else{
        o.rad=4+r()*4;o.speed=0.4+r()*0.5;o.along=(r()-0.5)*30;
        o.mesh=new THREE.Mesh(new THREE.IcosahedronGeometry(o.rad,1),mat(0x5a4a44,1));scene.add(o.mesh);
        o.wire=new THREE.Mesh(new THREE.IcosahedronGeometry(o.rad*1.04,1),mat(0xff7a3a,0.6,true));scene.add(o.wire);
      }
      return o;
    }
    add('laser',L.lasers||0);add('barrier',L.barriers||0);add('rock',L.rocks||0);
  }
  function setAt(m,p,lat,y,along){m.position.set(p.x+p.nx*lat+p.tx*(along||0),y,p.z+p.nz*lat+p.tz*(along||0))}
  function hit(g,o,dmg,kind){
    var c=g.components.shipControls,now=performance.now();
    if(now<o.cool)return;o.cool=now+1000;
    if(o.offUntil&&Date.now()<o.offUntil)return;
    dmg*=window.NVItems?NVItems.armor():1;
    if(fx().domeHold>0){fx().dome=1;return}
    c.shield-=dmg;
    var A=fx().audio;
    if(kind=='laser'){c.speed*=0.55;A&&A.zap()}
    else if(kind=='barrier'){c.speed*=0.15;c.repulsionForce.z=-c.repulsionAmount*3}
    else{c.speed*=0.5;c.repulsionForce.x+=(Math.random()<0.5?-1:1)*c.repulsionAmount*3}
  }
  function tick(){
    requestAnimationFrame(tick);
    var g=G();if(!g)return;
    if(H.built!==g){try{build(g)}catch(e){console.warn('hazards',e);H.built=g}}
    var t=g.track;if(!t.generated)return;
    var c=g.components.shipControls,gp=g.gameplay,now=Date.now()/1000,L=NVExtras.LEVELS[NVExtras.getLevel()-1];
    NVExtras.progress();H.idx=NVExtras.state.progIdx||0;
    if(gp.step<4){H.air=null;H.h=0}
    var sp=c.dummy.position,racing=gp.step==4&&c.active&&g.active!==false;
    H.list.forEach(function(o){
      var off=o.offUntil&&Date.now()<o.offUntil;[o.beam,o.glow,o.mesh,o.wire].forEach(function(m){if(m)m.visible=!off||Math.sin(Date.now()/60)>0.6});
      var p=o.p,dx=sp.x-p.x,dz=sp.z-p.z,along=dx*p.tx+dz*p.tz,lat=dx*p.nx+dz*p.nz,near=Math.abs(along)<6&&Math.abs(lat)<o.W/2+4;
      if(o.type=='laser'){
        var y,on;
        if(o.sweep){y=p.h+1.5+(0.5+0.5*Math.sin(now*2.2+o.phase))*11;on=true}
        else{var cyc=(now+o.phase)%2.6;on=cyc<1.3;y=p.h+4.2;var warn=cyc>2.2;o.beam.material.opacity=on?0.95:warn?(Math.sin(now*60)>0?0.5:0.1):0.06;o.glow.material.opacity=on?0.3:0.02}
        setAt(o.beam,p,0,y);setAt(o.glow,p,0,y);
        if(o.sweep){o.beam.material.opacity=0.95;o.glow.material.opacity=0.3}
        if(racing&&near&&on&&Math.abs(y-(sp.y+H.h))<2.6)hit(g,o,0.05+L.dmg,'laser');
      }else if(o.type=='barrier'){
        var bl=Math.sin(now*o.speed+o.phase)*(o.W/2-o.bw/2);
        setAt(o.mesh,p,bl,p.h+4);setAt(o.wire,p,bl,p.h+4);
        if(racing&&Math.abs(along)<5&&Math.abs(lat-bl)<o.bw/2+2&&H.h<6)hit(g,o,0.06+L.dmg*1.5,'barrier');
      }else{
        var rl=Math.sin(now*o.speed+o.phase)*o.W*0.75,ry=p.h+4+Math.sin(now*1.3+o.phase)*3;
        setAt(o.mesh,p,rl,ry,o.along);setAt(o.wire,p,rl,ry,o.along);o.mesh.rotation.x+=0.01;o.mesh.rotation.y+=0.013;o.wire.rotation.copy(o.mesh.rotation);
        var ddx=sp.x-o.mesh.position.x,ddy=sp.y+H.h-ry,ddz=sp.z-o.mesh.position.z;
        if(racing&&ddx*ddx+ddy*ddy+ddz*ddz<(o.rad+3)*(o.rad+3))hit(g,o,0.05+L.dmg,'rock');
      }
    });
    // ramps and void gaps
    var gs=t.gaps||[],orbital=t.def.style=='space';
    if(racing){
      if(!H.air){
        for(var k=0;k<gs.length;k++){var q=gs[k];
          if(H.idx>=q.ramp-3&&H.idx<=q.ramp+4&&(c.speed>c.maxSpeed*0.4||c.boost>0)){H.air=q;c.boost=Math.max(c.boost,c.boosterSpeed);fx().audio&&fx().audio.whoosh();break}
        }
        if(!H.air&&t.inGap(H.idx)){fx().banner&&fx().banner('FELL INTO THE VOID','#ff2244');c.fall()}
      }
      if(H.air){
        var q2=H.air,f=(H.idx-q2.ramp)/(q2.end+4-q2.ramp);
        if(f>=1||f<-0.3){H.air=null;H.h=0;if(f>=1&&window.NVFx)NVFx.shake=1.4}
        else H.h=Math.sin(Math.max(0,f)*Math.PI)*(orbital?34:22);
      }
    }else if(gp.step!=4){H.air=null;H.h=0}
  }
  requestAnimationFrame(tick);
  var RM=bkcore.threejs.RenderManager.prototype,origRender=RM.renderCurrent;
  RM.renderCurrent=function(){
    var g=G(),off=H.h>0&&g?H.h:0,c=off&&g.components.shipControls;
    if(off){c.dummy.position.y+=off;if(c.mesh)c.mesh.updateMatrix&&c.mesh.updateMatrix()}
    try{return origRender.apply(this,arguments)}finally{if(off)c.dummy.position.y-=off}
  };
})();
