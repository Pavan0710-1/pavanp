/* Six original fictional vehicles. Each has its own mass, power, gearing, drivetrain and tyre balance, so they genuinely drive differently.
   Models are procedural (extruded profile + parts) and structured so a GLB model can later replace buildCar() for any entry in CARS. */
(function(){'use strict';const N=window.NDM,U=N.U;
const C=[
 {id:'metro',name:'Metro',cls:'Compact city car',drive:'fwd',m:1050,a:1.05,b:1.45,h:.5,tq:165,pk:4200,idle:900,red:6600,gears:[3.58,2.04,1.32,1.0,.8,.65],fd:4.1,rw:.30,cda:.62,cl:.04,brake:9500,steer:.58,mu:1.0,bf:9,br:11,kus:.0011,wid:1.72,wheel:'multi',snd:{cyl:4,tone:'sawtooth',lp:1900},
  body:[[-1,.34],[1,.34],[1,.62],[.78,.74],[.45,.8],[.12,1.38],[-.62,1.4],[-1,.95]],cab:[[.36,.84],[.1,1.33],[-.6,1.35],[-.93,.9]]},
 {id:'falcon',name:'Falcon',cls:'Sports coupe',drive:'rwd',m:1280,a:1.25,b:1.4,h:.46,tq:330,pk:5000,idle:900,red:7200,gears:[3.6,2.19,1.54,1.19,.97,.8],fd:3.55,rw:.33,cda:.66,cl:.15,brake:14000,steer:.5,mu:1.05,bf:11,br:10,kus:.0007,wid:1.82,wheel:'five',snd:{cyl:6,tone:'sawtooth',lp:2400},
  body:[[-1,.36],[1,.36],[1,.58],[.7,.72],[.32,.8],[.02,1.22],[-.5,1.26],[-.9,.92],[-1,.86]],cab:[[.3,.82],[0,1.18],[-.48,1.22],[-.86,.92]]},
 {id:'specter',name:'Specter',cls:'Supercar',drive:'awd',m:1450,a:1.5,b:1.2,h:.4,tq:520,pk:6500,idle:1000,red:8500,gears:[3.2,2.2,1.6,1.25,1.0,.82,.68],fd:3.4,rw:.34,cda:.75,cl:.7,brake:19000,steer:.45,mu:1.15,bf:12,br:12,kus:.0005,wid:2.0,wheel:'five',wing:true,snd:{cyl:10,tone:'sawtooth',lp:3400},
  body:[[-1,.3],[1,.3],[1.02,.46],[.6,.6],[.2,.74],[-.05,1.05],[-.55,1.08],[-.9,.8],[-1,.78]],cab:[[.25,.76],[-.02,1.0],[-.5,1.03],[-.82,.8]]},
 {id:'regent',name:'Regent',cls:'Luxury sedan',drive:'rwd',m:1850,a:1.45,b:1.55,h:.52,tq:440,pk:4800,idle:800,red:6200,gears:[4.0,2.4,1.55,1.14,.87,.69],fd:3.15,rw:.35,cda:.68,cl:.05,brake:13500,steer:.5,mu:1.0,bf:10,br:10,kus:.0013,wid:1.9,wheel:'disc',snd:{cyl:8,tone:'triangle',lp:1500},
  body:[[-1,.38],[1,.38],[1,.7],[.7,.82],[.35,.88],[.08,1.38],[-.45,1.4],[-.78,.95],[-1,.92]],cab:[[.3,.9],[.06,1.33],[-.44,1.35],[-.74,.95]]},
 {id:'ridge',name:'Ridge',cls:'Performance SUV',drive:'awd',m:2250,a:1.4,b:1.5,h:.72,tq:480,pk:5200,idle:850,red:6200,gears:[3.9,2.3,1.5,1.1,.85,.68],fd:3.5,rw:.38,cda:1.05,cl:.05,brake:15500,steer:.5,mu:.95,bf:9.5,br:9.5,kus:.0016,wid:2.0,wheel:'multi',snd:{cyl:8,tone:'sawtooth',lp:1700},
  body:[[-1,.5],[1,.5],[1,.95],[.7,1.05],[.35,1.1],[.1,1.72],[-.85,1.74],[-1,1.2]],cab:[[.3,1.1],[.08,1.66],[-.85,1.68],[-.96,1.2]]},
 {id:'vintage',name:'Vintage',cls:'Classic sports car',drive:'rwd',m:1150,a:1.2,b:1.35,h:.5,tq:240,pk:3800,idle:850,red:5600,gears:[3.2,1.95,1.3,1.0],fd:3.7,rw:.33,cda:.75,cl:.02,brake:9000,steer:.55,mu:.9,bf:8.5,br:9.5,kus:.0009,wid:1.74,wheel:'disc',snd:{cyl:6,tone:'square',lp:1300},
  body:[[-1,.4],[1,.4],[1,.66],[.8,.76],[.5,.8],[.22,1.28],[-.38,1.32],[-.7,.9],[-1,.85]],cab:[[.4,.82],[.2,1.24],[-.36,1.28],[-.66,.9]]}];
C.forEach(c=>{c.hl=(c.a+c.b)/2+.85;c.cr=c.wid/2*.95;c.circles=[c.a+.4,0,-(c.b+.4)]});
N.CARS=C;
N.FINISH={gloss:{metalness:.05,roughness:.28,clearcoat:1,clearcoatRoughness:.05},matte:{metalness:0,roughness:.92,clearcoat:0,clearcoatRoughness:1},metallic:{metalness:.85,roughness:.32,clearcoat:.8,clearcoatRoughness:.08},pearl:{metalness:.4,roughness:.25,clearcoat:1,clearcoatRoughness:.03}};
N.WHEELCOL={silver:'#c9ccd6',black:'#15161b',gunmetal:'#4a4e5a',gold:'#c9a24a',white:'#e8e8ee'};
N.CALIPER={red:'#e03030',yellow:'#f2c230',blue:'#2f7bff',silver:'#bfc2cc'};
N.PAINTS=['#e8283c','#2a6bff','#19d3a2','#ffb020','#9b5cff','#e9e6f0','#15161b','#ff6a1f'];
N.defCust=i=>({col:N.PAINTS[i%N.PAINTS.length],finish:'gloss',wheel:C[i].wheel,wcol:'silver',tint:1,caliper:'red'});
/* Sky-style environment cube so paint and glass have something to reflect. */
N.makeEnv=(T,bag)=>{const faces=[];for(let f=0;f<6;f++){const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createLinearGradient(0,0,0,64);
  if(f===2){g.addColorStop(0,'#9fb4d8');g.addColorStop(1,'#9fb4d8')}else if(f===3){g.addColorStop(0,'#3b3f38');g.addColorStop(1,'#3b3f38')}else{g.addColorStop(0,'#5d84c4');g.addColorStop(.55,'#b9cde6');g.addColorStop(.56,'#6a6f62');g.addColorStop(1,'#3b3f38')}
  x.fillStyle=g;x.fillRect(0,0,64,64);if(f!==2&&f!==3){x.fillStyle='rgba(255,255,255,.7)';x.fillRect(8,10,20,6)}faces.push(c)}
  const t=bag.add(new T.CubeTexture(faces));t.needsUpdate=true;return t};
function wheelMesh(T,M,s,cu,side){
 const piv=new T.Group(),spin=new T.Group(),rw=s.rw,wd=.26;
 const tyre=new T.Mesh(M(new T.CylinderGeometry(rw,rw,wd,24)),M(new T.MeshStandardMaterial({color:0x0d0d10,roughness:.9})));tyre.rotation.z=Math.PI/2;tyre.castShadow=true;spin.add(tyre);
 const rimM=M(new T.MeshStandardMaterial({color:N.WHEELCOL[cu.wcol]||'#c9ccd6',metalness:.85,roughness:.28})),rr=rw*.72;
 const face=new T.Mesh(M(new T.CylinderGeometry(rr,rr,.05,24)),M(new T.MeshStandardMaterial({color:0x08080a,roughness:.7})));face.rotation.z=Math.PI/2;face.position.x=side*(wd/2-.01);spin.add(face);
 const style=cu.wheel;
 if(style==='disc'){const d=new T.Mesh(M(new T.CylinderGeometry(rr,rr,.06,24)),rimM);d.rotation.z=Math.PI/2;d.position.x=side*(wd/2);spin.add(d)}
 else{const n=style==='five'?5:10,sw=style==='five'?.12:.05;for(let i=0;i<n;i++){const sp=new T.Mesh(M(new T.BoxGeometry(.05,rr*1.9,sw)),rimM);sp.position.x=side*(wd/2);sp.rotation.x=i*Math.PI/n;spin.add(sp)}
  const ring=new T.Mesh(M(new T.TorusGeometry(rr,.025,6,24)),rimM);ring.rotation.y=Math.PI/2;ring.position.x=side*(wd/2);spin.add(ring)}
 const hub=new T.Mesh(M(new T.CylinderGeometry(.06,.06,.08,10)),rimM);hub.rotation.z=Math.PI/2;hub.position.x=side*(wd/2+.01);spin.add(hub);
 const cal=new T.Mesh(M(new T.BoxGeometry(.06,rr*.5,.2)),M(new T.MeshStandardMaterial({color:N.CALIPER[cu.caliper]||'#e03030',roughness:.5})));cal.position.set(side*(wd/2-.04),rr*.55,0);piv.add(cal);
 piv.add(spin);return{piv,spin}}
N.buildCar=(T,i,cu,env)=>{
 const s=C[i],bag=new N.Bag(),M=o=>bag.add(o),g=new T.Group(),rig=new T.Group();g.add(rig);
 const fin=N.FINISH[cu.finish]||N.FINISH.gloss,col=new T.Color(cu.col);
 const paint=M(new T.MeshPhysicalMaterial(Object.assign({color:col,envMap:env,envMapIntensity:1,emissive:cu.finish==='pearl'?col.clone().multiplyScalar(.05):0x000000},fin)));
 const glass=M(new T.MeshStandardMaterial({color:0x07090f,metalness:.9,roughness:.08,envMap:env,envMapIntensity:1.2,transparent:true,opacity:[.35,.62,.82,.95][cu.tint]||.62}));
 const hl=s.hl,off=(s.b-s.a)/2,wd=s.wid-.2;
 const sh=new T.Shape();s.body.forEach((p,k)=>k?sh.lineTo(p[0]*hl,p[1]):sh.moveTo(p[0]*hl,p[1]));
 const bg=M(new T.ExtrudeGeometry(sh,{depth:wd,bevelEnabled:true,bevelThickness:.1,bevelSize:.08,bevelSegments:3}));bg.translate(0,0,-wd/2);bg.rotateY(Math.PI/2);
 const body=new T.Mesh(bg,paint);body.castShadow=true;body.position.z=off;rig.add(body);
 const gs=new T.Shape();s.cab.forEach((p,k)=>k?gs.lineTo(p[0]*hl,p[1]):gs.moveTo(p[0]*hl,p[1]));
 const gg=M(new T.ExtrudeGeometry(gs,{depth:s.wid+.02,bevelEnabled:false}));gg.translate(0,0,-(s.wid+.02)/2);gg.rotateY(Math.PI/2);const cab=new T.Mesh(gg,glass);cab.position.z=off;rig.add(cab);
 const dark=M(new T.MeshStandardMaterial({color:0x0a0a0d,roughness:.7}));
 const under=new T.Mesh(M(new T.BoxGeometry(s.wid-.1,.2,hl*2-.2)),dark);under.position.set(0,.3,off);rig.add(under);
 const hlM=M(new T.MeshStandardMaterial({color:0xcccccc,emissive:0x000000,roughness:.2})),tlM=M(new T.MeshStandardMaterial({color:0x440008,emissive:0x330000,roughness:.4}));
 const maxY=Math.max.apply(null,s.cab.map(p=>p[1])),fz=off-hl+.02,rz=off+hl-.02;
 for(const sx of [-1,1]){const h=new T.Mesh(M(new T.BoxGeometry(.38,.12,.08)),hlM);h.position.set(sx*(s.wid/2-.4),s.body[2][1]-.1,fz);rig.add(h);
  const t=new T.Mesh(M(new T.BoxGeometry(.4,.1,.08)),tlM);t.position.set(sx*(s.wid/2-.4),s.body[2][1]-.12,rz);rig.add(t);
  const mi=new T.Mesh(M(new T.BoxGeometry(.14,.1,.2)),paint);mi.position.set(sx*(s.wid/2+.05),maxY*.62,off-hl*.28);rig.add(mi)}
 const bump=new T.Mesh(M(new T.BoxGeometry(s.wid-.2,.16,.12)),dark);bump.position.set(0,.4,fz-.02);rig.add(bump);const bump2=bump.clone();bump2.position.z=rz+.02;rig.add(bump2);
 if(s.wing){const w=new T.Mesh(M(new T.BoxGeometry(s.wid-.1,.05,.5)),paint);w.position.set(0,s.body[5][1]+.12,rz-.3);rig.add(w);for(const sx of [-1,1]){const st=new T.Mesh(M(new T.BoxGeometry(.05,.3,.1)),dark);st.position.set(sx*.6,s.body[5][1]-.02,rz-.3);rig.add(st)}}
 const cone=new T.Mesh(M(new T.PlaneGeometry(4.2,22)),M(new T.MeshBasicMaterial({color:0xdfeaff,transparent:true,opacity:.1,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide})));cone.rotation.x=-Math.PI/2;cone.position.set(0,.5,off-hl-10);cone.visible=false;g.add(cone);
 const wheels=[];[[-1,-s.a],[1,-s.a],[-1,s.b],[1,s.b]].forEach((p,k)=>{const w=wheelMesh(T,M,s,cu,p[0]);w.piv.position.set(p[0]*(s.wid/2-.12),s.rw,p[1]);w.front=k<2;rig.add(w.piv);wheels.push(w)});
 /* cockpit parts: only visible in cockpit camera */
 const cp=new T.Group(),eyeY=maxY-.22,eyeZ=off-hl*.04,dashY=eyeY-.38;
 const dash=new T.Mesh(M(new T.BoxGeometry(s.wid-.2,.34,.55)),dark);dash.position.set(0,dashY,eyeZ-.95);cp.add(dash);
 const swheel=new T.Group();swheel.position.set(-.36,dashY+.12,eyeZ-.62);swheel.rotation.x=-.5;const rim=new T.Mesh(M(new T.TorusGeometry(.17,.018,8,20)),dark);swheel.add(rim);const spoke=new T.Mesh(M(new T.BoxGeometry(.32,.02,.02)),dark);swheel.add(spoke);cp.add(swheel);cp.visible=false;rig.add(cp);
 const eye={x:-.36,y:eyeY,z:eyeZ+.05},bumperZ=fz-.1;
 return{group:g,rig,wheels,cone,cp,swheel,eye,bumperZ,hl,off,dispose(){bag.dispose()},
  setLights(on){hlM.emissive.setHex(on?0xffffff:0x000000);hlM.emissiveIntensity=on?2:0;cone.visible=on},
  apply(v){rig.rotation.x=v.pitch;rig.rotation.z=v.roll;
   wheels.forEach(w=>{w.spin.rotation.x=-v.wAng;w.piv.rotation.y=w.front?-v.steerAng:0});swheel.rotation.z=-v.steerAng*3;
   const b=v.brkO>.05||v.hbO>.05;tlM.emissive.setHex(b?0xff1020:0x330000)}}};
N._vehicles=1;
})();
