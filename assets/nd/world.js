/* NEON DRIVE world: a large procedural city with the original proving-ground circuit, a plaza, buildings, trees, streets and lane-marked roads.
   The world exposes surf(), query(), track and gates for the free-drive, traffic and challenge systems. */
(function(){'use strict';const N=window.NDM,U=N.U;
const HX=260,HZ=170,R=80,W=14,PLX=110,PLZ=60;
const sdfRR=(x,z)=>{const qx=Math.abs(x)-(HX-R),qz=Math.abs(z)-(HZ-R);return Math.hypot(Math.max(qx,0),Math.max(qz,0))+Math.min(Math.max(qx,qz),0)-R};
function buildPath(){const P=[],st=6,ax=HX-R,az=HZ-R;
 const seg=(x0,z0,x1,z1)=>{const l=Math.hypot(x1-x0,z1-z0),n=Math.max(1,Math.round(l/st));for(let i=0;i<n;i++)P.push([x0+(x1-x0)*i/n,z0+(z1-z0)*i/n])};
 const arc=(cx,cz,a0,a1)=>{const n=Math.max(4,Math.round(Math.abs(a1-a0)*R/st));for(let i=0;i<n;i++){const a=a0+(a1-a0)*i/n;P.push([cx+R*Math.cos(a),cz+R*Math.sin(a)])}};
 seg(-ax,HZ,ax,HZ);arc(ax,az,Math.PI/2,0);seg(HX,az,HX,-az);arc(ax,-az,0,-Math.PI/2);seg(ax,-HZ,-ax,-HZ);arc(-ax,-az,-Math.PI/2,-Math.PI);seg(-HX,-az,-HX,az);arc(-ax,az,Math.PI,Math.PI/2);return P}
const BLD_V=`varying vec3 vWP,vN,vC;
#include <fog_pars_vertex>
void main(){mat4 im=modelMatrix*instanceMatrix;vec4 wp=im*vec4(position,1.);vWP=wp.xyz;vN=normalize(mat3(im)*normal);
#ifdef USE_INSTANCING_COLOR
vC=instanceColor;
#else
vC=vec3(.5);
#endif
vec4 mvPosition=viewMatrix*wp;gl_Position=projectionMatrix*mvPosition;
#include <fog_vertex>
}`;
const BLD_F=`uniform vec3 uSun;uniform float uNight;varying vec3 vWP,vN,vC;
#include <fog_pars_fragment>
float h21(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){vec3 n=normalize(vN);vec3 col=vC*.55;float win=0.;
 if(abs(n.y)<.5&&vWP.y>2.5){float uu=abs(n.x)>.5?vWP.z:vWP.x;vec2 cell=vec2(floor(uu/3.2),floor(vWP.y/3.6));vec2 f=vec2(fract(uu/3.2),fract(vWP.y/3.6));
  if(f.x>.2&&f.x<.8&&f.y>.22&&f.y<.8){float lit=step(.55,h21(cell+floor(vWP.x*.01)));win=1.;col=mix(vec3(.10,.14,.2)+vec3(.35,.45,.6)*(.4+.6*n.y*0.),vec3(1.,.82,.45)*lit*1.4,uNight*lit+0.);}}
 float d=max(dot(n,normalize(uSun)),0.);vec3 lit=col*(.45+.75*d+.25*max(n.y,0.));if(n.y>.5)lit=vC*.38*(.6+d);
 gl_FragColor=vec4(lit,1.);
#include <tonemapping_fragment>
#include <encodings_fragment>
#include <fog_fragment>
}`;
N.buildWorld=(T,scene,P,bag,rnd)=>{
 const M=o=>bag.add(o),tex=(w,h,fn,rep)=>{const c=document.createElement('canvas');c.width=w;c.height=h;fn(c.getContext('2d'),w,h);const t=M(new T.CanvasTexture(c));t.encoding=T.sRGBEncoding;t.anisotropy=4;if(rep){t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(rep[0],rep[1])}return t};
 const world={HX,HZ,R,W,PLX,PLZ,colliders:[]};
 const sunDir=new T.Vector3(-.5,.8,.35).normalize();
 scene.background=null;scene.fog=new T.Fog(0xb7c8e0,200,P.far);
 const hemi=new T.HemisphereLight(0xaec6ff,0x5a5e48,.8);scene.add(hemi);
 const sun=new T.DirectionalLight(0xfff0dd,1.1);sun.position.copy(sunDir).multiplyScalar(120);scene.add(sun,sun.target);
 sun.castShadow=P.shadow>0;if(P.shadow){sun.shadow.mapSize.set(P.shadow,P.shadow);const sc=sun.shadow.camera;sc.left=-70;sc.right=70;sc.top=70;sc.bottom=-70;sc.near=10;sc.far=300;sun.shadow.bias=-.0004}
 world.sun=sun;world.fogRef=scene.fog;
 /* sky */
 const sky=new T.Mesh(M(new T.SphereGeometry(1400,24,16)),M(new T.ShaderMaterial({side:T.BackSide,depthWrite:false,fog:false,uniforms:{uSun:{value:sunDir}},
  vertexShader:'varying vec3 vD;void main(){vD=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'uniform vec3 uSun;varying vec3 vD;void main(){float y=clamp(vD.y,-.1,1.);vec3 z=vec3(.16,.33,.66),h=vec3(.62,.72,.86);vec3 c=mix(h,z,pow(max(y,0.),.55));float s=max(dot(normalize(vD),normalize(uSun)),0.);c+=vec3(1.,.85,.6)*pow(s,200.)*2.+vec3(1.,.8,.5)*pow(s,8.)*.25;if(vD.y<0.)c=mix(h,vec3(.3,.34,.28),clamp(-vD.y*6.,0.,1.));gl_FragColor=vec4(c,1.);\n#include <tonemapping_fragment>\n#include <encodings_fragment>\n}'})));sky.renderOrder=-10;sky.frustumCulled=false;scene.add(sky);world.sky=sky;
 /* ground, plaza, circuit */
 const gT=tex(256,256,(x,w,h)=>{x.fillStyle='#4f7a3a';x.fillRect(0,0,w,h);const r=rnd;for(let i=0;i<2500;i++){x.fillStyle='rgba('+(60+r()*40|0)+','+(110+r()*50|0)+','+(50+r()*30|0)+',.5)';x.fillRect(r()*w,r()*h,2,2)}},[260,260]);
 const gnd=new T.Mesh(M(new T.PlaneGeometry(3000,3000)),M(new T.MeshLambertMaterial({map:gT})));gnd.rotation.x=-Math.PI/2;gnd.receiveShadow=true;scene.add(gnd);
 const aT=tex(1024,640,(x,w,h)=>{x.fillStyle='#34353d';x.fillRect(0,0,w,h);for(let i=0;i<9000;i++){x.fillStyle='rgba(255,255,255,'+(rnd()*.05)+')';x.fillRect(rnd()*w,rnd()*h,2,2)}
  x.strokeStyle='rgba(235,235,240,.85)';x.lineWidth=4;for(let i=0;i<=12;i++){x.beginPath();x.moveTo(40+i*78,40);x.lineTo(40+i*78,150);x.stroke();x.beginPath();x.moveTo(40+i*78,h-40);x.lineTo(40+i*78,h-150);x.stroke()}
  x.beginPath();x.moveTo(40,150);x.lineTo(w-40,150);x.moveTo(40,h-150);x.lineTo(w-40,h-150);x.stroke()});
 const pl=new T.Mesh(M(new T.PlaneGeometry(PLX*2,PLZ*2)),M(new T.MeshLambertMaterial({map:aT,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1})));pl.rotation.x=-Math.PI/2;pl.position.y=.02;pl.receiveShadow=true;scene.add(pl);
 const path=buildPath(),cum=[0];for(let i=1;i<=path.length;i++){const a=path[i-1],b=path[i%path.length];cum.push(cum[i-1]+Math.hypot(b[0]-a[0],b[1]-a[1]))}
 const LEN=cum[path.length],tang=path.map((p,i)=>{const b=path[(i+1)%path.length],l=Math.hypot(b[0]-p[0],b[1]-p[1])||1;return[(b[0]-p[0])/l,(b[1]-p[1])/l]});
 const pos=new Float32Array((path.length+1)*6),uv=new Float32Array((path.length+1)*4),nrm=new Float32Array((path.length+1)*6),idx=[];
 for(let i=0;i<=path.length;i++){const k=i%path.length,p=path[k],t=tang[k],rx=-t[1],rz=t[0];
  pos.set([p[0]-rx*W/2,.025,p[1]-rz*W/2,p[0]+rx*W/2,.025,p[1]+rz*W/2],i*6);uv.set([0,cum[i]/24,1,cum[i]/24],i*4);nrm.set([0,1,0,0,1,0],i*6);
  if(i<path.length){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2)}}
 const rg=M(new T.BufferGeometry());rg.setAttribute('position',new T.BufferAttribute(pos,3));rg.setAttribute('uv',new T.BufferAttribute(uv,2));rg.setAttribute('normal',new T.BufferAttribute(nrm,3));rg.setIndex(idx);
 const rT=tex(256,256,(x,w,h)=>{x.fillStyle='#2e2f36';x.fillRect(0,0,w,h);for(let i=0;i<3000;i++){x.fillStyle='rgba(255,255,255,'+(rnd()*.06)+')';x.fillRect(rnd()*w,rnd()*h,2,2)}
  x.fillStyle='#e8e8ee';x.fillRect(8,0,5,h);x.fillRect(w-13,0,5,h);x.fillStyle='#f2c230';x.fillRect(w/2-2,0,4,h/2)});
 const road=new T.Mesh(rg,M(new T.MeshLambertMaterial({map:rT,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1})));road.receiveShadow=true;scene.add(road);
 const pose=s=>{s=((s%LEN)+LEN)%LEN;let i=1;while(i<cum.length-1&&cum[i]<=s)i++;i--;const a=path[i],b=path[(i+1)%path.length],f=(s-cum[i])/((cum[i+1]-cum[i])||1);return{x:a[0]+(b[0]-a[0])*f,z:a[1]+(b[1]-a[1])*f,tx:tang[i][0],tz:tang[i][1]}};
 const startS=HX-R,GN=12;world.gates=[];for(let k=0;k<GN;k++){const p=pose(startS+k*LEN/GN);world.gates.push(p)}
 world.length=LEN;world.path=path;world.pose=pose;
 world.startPose=(()=>{const p=pose(startS-14);return{x:p.x,z:p.z,psi:Math.atan2(-p.tx,-p.tz)}})();
 world.plazaPose={x:-60,z:30,psi:-Math.PI/2};
 world.nearestS=(x,z)=>{let b=0,bd=1e18;for(let i=0;i<path.length;i++){const d=(path[i][0]-x)**2+(path[i][1]-z)**2;if(d<bd){bd=d;b=i}}return{i:b,d:Math.sqrt(bd),s:cum[b]}};
 world.surf=(x,z)=>{const oldCircuit=Math.abs(sdfRR(x,z))<W/2+.4||(Math.abs(x)<PLX&&Math.abs(z)<PLZ);const cityRoad=CITY_ROADS.some(a=>Math.abs(x-a)<ROAD_W/2||Math.abs(z-a)<ROAD_W/2);return (oldCircuit||cityRoad)?{mu:1,rr:.015,road:true}:{mu:.62,rr:.06,road:false}};
 /* gates visuals */
 const gm=[M(new T.MeshBasicMaterial({color:0x4a5870})),M(new T.MeshBasicMaterial({color:0x00e5ff}))],gGeo=M(new T.BoxGeometry(.5,6,.5)),bGeo=M(new T.BoxGeometry(W+1,.5,.4));world.gateMeshes=[];
 world.gates.forEach(p=>{const g=new T.Group(),rx=-p.tz,rz=p.tx;for(const sx of [-1,1]){const a=new T.Mesh(gGeo,gm[0]);a.position.set(sx*(W/2+.4),3,0);g.add(a)}const bar=new T.Mesh(bGeo,gm[0]);bar.position.y=6;g.add(bar);g.position.set(p.x,0,p.z);g.rotation.y=Math.atan2(rx,rz);scene.add(g);world.gateMeshes.push(g)});
 world.setNextGate=k=>world.gateMeshes.forEach((g,i)=>g.children.forEach(c=>c.material=gm[i===k?1:0]));
 /* static scenery with colliders */
 const cols=world.colliders,boxCol=(x,z,hw,hd,a)=>cols.push({t:0,x,z,hw,hd,a:a||0}),cirCol=(x,z,r)=>cols.push({t:1,x,z,r});
 const bl=[],bMat=M(new T.ShaderMaterial({fog:true,uniforms:Object.assign(T.UniformsUtils.clone(T.UniformsLib.fog),{uSun:{value:sunDir},uNight:{value:0}}),vertexShader:BLD_V,fragmentShader:BLD_F}));world.bldMat=bMat;
 for(let tries=0;tries<400&&bl.length<42;tries++){const th=rnd()*Math.PI*2,f=1+rnd()*.9,x=Math.cos(th)*(HX+130)*f,z=Math.sin(th)*(HZ+130)*f,w=22+rnd()*38,d=22+rnd()*38,h=18+Math.pow(rnd(),1.6)*90;
  if(sdfRR(x,z)<W/2+30+Math.max(w,d)/2)continue;if(bl.some(b=>Math.abs(b.x-x)<(b.w+w)/2+14&&Math.abs(b.z-z)<(b.d+d)/2+14))continue;bl.push({x,z,w,d,h})}
 const bi=new T.InstancedMesh(M(new T.BoxGeometry(1,1,1)),bMat,bl.length),m4=new T.Matrix4(),pal=[0xb8bcc8,0x9aa3b4,0xc9c0b0,0x8f98a6,0xaeb7c4];
 bl.forEach((b,i)=>{m4.makeScale(b.w,b.h,b.d);m4.setPosition(b.x,b.h/2,b.z);bi.setMatrixAt(i,m4);bi.setColorAt(i,new T.Color(pal[i%pal.length]));boxCol(b.x,b.z,b.w/2,b.d/2,0)});
 bi.castShadow=P.shadow>0;scene.add(bi);
 /* trees */
 const nT=P.trees,trunk=new T.InstancedMesh(M(new T.CylinderGeometry(.25,.35,3,6)),M(new T.MeshLambertMaterial({color:0x5a4030})),360),crown=new T.InstancedMesh(M(new T.ConeGeometry(2.2,6,7)),M(new T.MeshLambertMaterial({color:0x2f6a34})),360);
 world.trees=[];for(let tries=0;tries<2000&&world.trees.length<360;tries++){const x=(rnd()-.5)*1100,z=(rnd()-.5)*800;if(sdfRR(x,z)<W/2+10||Math.abs(x)<PLX+10&&Math.abs(z)<PLZ+10)continue;if(bl.some(b=>Math.abs(b.x-x)<b.w/2+4&&Math.abs(b.z-z)<b.d/2+4))continue;world.trees.push([x,z,.8+rnd()*.7])}
 world.trees.forEach((t,i)=>{m4.makeScale(t[2],t[2],t[2]);m4.setPosition(t[0],1.5*t[2],t[1]);trunk.setMatrixAt(i,m4);m4.setPosition(t[0],(3+3)*t[2],t[1]);crown.setMatrixAt(i,m4);if(i<nT)cirCol(t[0],t[1],.4*t[2])});
 trunk.count=crown.count=Math.min(nT,world.trees.length);trunk.castShadow=crown.castShadow=P.shadow>0;scene.add(trunk,crown);world.treeMeshes=[trunk,crown];
 /* lamps along the long straights */
 const lampN=[];for(let x=-180;x<=180;x+=40){lampN.push([x,HZ+W/2+3],[x,-HZ-W/2-3])}
 const lp=new T.InstancedMesh(M(new T.CylinderGeometry(.12,.15,8,6)),M(new T.MeshLambertMaterial({color:0x40444c})),lampN.length);lampN.forEach((p,i)=>{m4.makeTranslation(p[0],4,p[1]);lp.setMatrixAt(i,m4);cirCol(p[0],p[1],.2)});scene.add(lp);
 /* concrete barriers (chicane in the plaza) and cones (slalom) */
 const bar=new T.InstancedMesh(M(new T.BoxGeometry(4,1,.8)),M(new T.MeshLambertMaterial({color:0xaaaab2})),6);
 [[-20,-18,0],[-8,-26,0],[4,-18,0],[16,-26,0],[28,-18,0],[40,-26,0]].forEach((b,i)=>{const mm=new T.Matrix4().makeRotationY(b[2]);mm.setPosition(b[0],.5,b[1]);bar.setMatrixAt(i,mm);boxCol(b[0],b[1],2,.4,b[2])});bar.castShadow=true;scene.add(bar);
 const cone=new T.InstancedMesh(M(new T.ConeGeometry(.28,.7,10)),M(new T.MeshLambertMaterial({color:0xff6a1f})),14);
 for(let i=0;i<14;i++){const x=-95+i*14,z=i%2?3:-3+36-36;const zz=40+(i%2?6:-6)*0+(i%2?4:-4);m4.makeTranslation(x,.35,zz);cone.setMatrixAt(i,m4);cirCol(x,zz,.3)}cone.castShadow=true;scene.add(cone);
 /* tyre stacks at corner exits */
 const ty=new T.InstancedMesh(M(new T.CylinderGeometry(.55,.55,1.1,12)),M(new T.MeshLambertMaterial({color:0x151518})),8);
 [[HX-R+60,HZ+W/2+6],[-(HX-R)-60,-HZ-W/2-6],[HX+W/2+6,0],[-HX-W/2-6,0],[0,HZ+W/2+6],[0,-HZ-W/2-6],[HX-R+20,-HZ-W/2-6],[-(HX-R)-20,HZ+W/2+6]].forEach((p,i)=>{m4.makeTranslation(p[0],.55,p[1]);ty.setMatrixAt(i,m4);cirCol(p[0],p[1],.6)});scene.add(ty);
 world.query=N.makeCollision(cols);
 world.followSun=(x,z)=>{sun.target.position.set(x,0,z);sun.position.set(x+sunDir.x*120,sunDir.y*120,z+sunDir.z*120)};
 world.applyPreset=Q=>{scene.fog.far=Q.far;const n=Math.min(Q.trees,world.trees.length);world.treeMeshes.forEach(m=>{m.count=n;m.castShadow=Q.shadow>0});sun.castShadow=Q.shadow>0;if(Q.shadow){sun.shadow.mapSize.set(Q.shadow,Q.shadow);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null}}};
 /* Large procedural city roads extend beyond the proving-ground circuit. */
 const CITY=1500,CITY_ROADS=[-720,-540,-360,-180,0,180,360,540,720],ROAD_W=24;
 const roadMat=M(new T.MeshLambertMaterial({color:0x2c3038,roughness:.9}));
 CITY_ROADS.forEach(a=>{
  const v=new T.Mesh(M(new T.BoxGeometry(ROAD_W,.035,CITY*2)),roadMat);v.position.set(a,.018,0);v.receiveShadow=true;scene.add(v);
  const h=new T.Mesh(M(new T.BoxGeometry(CITY*2,.035,ROAD_W)),roadMat);h.position.set(0,.018,a);h.receiveShadow=true;scene.add(h);
 });
 const dashMat=M(new T.MeshBasicMaterial({color:0xe0c85b}));
 for(let i=-CITY;i<=CITY;i+=20){
  CITY_ROADS.forEach(a=>{
   const dv=new T.Mesh(M(new T.BoxGeometry(.18,.012,6)),dashMat);dv.position.set(a,.045,i);scene.add(dv);
   const dh=new T.Mesh(M(new T.BoxGeometry(6,.012,.18)),dashMat);dh.position.set(i,.045,a);scene.add(dh);
  });
 }
 world.cityBounds=CITY;world.cityRoads=CITY_ROADS;world.cityRoadWidth=ROAD_W;
 world.query=N.makeCollision(cols);
 return world};
N._world=1;
})();
