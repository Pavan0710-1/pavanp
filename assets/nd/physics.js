/* Vehicle physics: dynamic bicycle model on a fixed timestep.
   Engine: torque curve, RPM, gears, clutch slip, rev limiter. Tyres: slip-angle force curve with a traction circle (drive/brake force reduces cornering force).
   Weight transfer, aero drag and downforce, FWD/RWD/AWD, TC/ABS/stability assists, handbrake, surface friction, circle-vs-box collisions with yaw impulse.
   Coordinates: x/z world plane, forward=(-sin psi,-cos psi), right=(cos psi,-sin psi). u=forward speed, v=lateral speed (right+), r=yaw rate (clockwise+). */
(function(){'use strict';const N=window.NDM,U=N.U;
class Vehicle{
 constructor(s){this.s=s;this.dmg=0;this.reset(0,0,0)}
 reset(x,z,psi){const s=this.s;Object.assign(this,{x,z,psi,u:0,v:0,r:0,gear:1,rpm:s.idle,shiftT:0,shiftEv:false,ax:0,ay:0,spin:0,lockR:0,beta:0,slipF:0,slipR:0,pitch:0,pv:0,roll:0,rv:0,tc:false,abs:false,esc:false,steerAng:0,wAng:0,hit:0,thrO:0,brkO:0,drift:0,fx:0,fz:0,hbO:0,fuel:65,indicator:0,indicatorT:0,horn:false,hornHeld:false})}
 get kmh(){return Math.hypot(this.u,this.v)*3.6}
 step(dt,inp,env,set){
  const fuelUse=Math.abs(inp.thr||0)*(.000018+Math.abs(this.u)*.0000012)*dt;
  this.fuel=Math.max(0,this.fuel-fuelUse);
  if(this.fuel<=0)inp={thr:0,brk:inp.brk,steer:inp.steer,hb:inp.hb,up:inp.up,down:inp.down,indicator:inp.indicator,horn:inp.horn};
  this.indicator=inp.indicator||0;
  this.indicatorT=(this.indicatorT+dt*(this.indicator?1:0))%(1.2);
  this.hornHeld=!!inp.horn;
  this.horn=!!inp.horn;
  const s=this.s,g=9.81,L=s.a+s.b,m=s.m,Iz=m*L*L*.22,sf=env.surf(this.x,this.z),mu=s.mu*sf.mu*env.grip;
  let u=this.u,v=this.v,r=this.r,thr=inp.thr,brk=inp.brk;const hb=inp.hb,n=s.gears.length,auto=set.trans==='auto';
  this.shiftT=Math.max(0,this.shiftT-dt);this.shiftEv=false;
  /* transmission and reverse logic */
  if(auto){
   if(this.gear===-1){if(thr>.1&&u>-.5)this.gear=1;else if(thr>.1){brk=thr;thr=0}else if(brk>.1){thr=brk;brk=0}else thr=0}
   else if(brk>.1&&thr<.1&&u<1){this.gear=-1;thr=brk;brk=0}
  }else{
   if(inp.up){if(this.gear===-1){if(Math.abs(u)<1.5){this.gear=1;this.shiftEv=true}}else if(this.gear<n){this.gear++;this.shiftT=.18;this.shiftEv=true}}
   if(inp.down){if(this.gear===1){if(Math.abs(u)<1.5){this.gear=-1;this.shiftEv=true}}else if(this.gear>1){this.gear--;this.shiftT=.18;this.shiftEv=true}}
  }
  if(this.esc)thr*=.55;
  const gr=this.gear===-1?-3.2:s.gears[this.gear-1],ov=gr*s.fd,wsp=Math.abs(u)/s.rw,rpmW=wsp*Math.abs(ov)*9.549;
  const clutchR=s.idle+(s.pk*.6-s.idle)*U.clamp(thr*1.4,0,1),slipC=rpmW<clutchR;
  const rpm=Math.max(slipC?clutchR:rpmW*(1+.5*this.spin),s.idle),eff=slipC?.78:.93;
  if(auto&&this.gear>0&&this.shiftT===0){
   const lower=this.gear>1?wsp*s.gears[this.gear-2]*s.fd*9.549:0;
   if(rpm>s.red*.93&&thr>.05&&this.gear<n){this.gear++;this.shiftT=.2;this.shiftEv=true}
   else if(this.gear>1&&(rpm<s.red*.34||(thr>.85&&lower<s.red*.88&&rpm<s.pk*1.05))){this.gear--;this.shiftT=.2;this.shiftEv=true}
  }
  const x=U.clamp((rpm-s.idle)/(s.red-s.idle),0,1.1);let tq=s.tq*U.clamp(1-1.9*(x-.55)*(x-.55),.25,1);
  if(rpm>=s.red||this.shiftT>0)tq=0;
  let Fd=tq*thr*ov*eff/s.rw;if(this.gear===-1&&u<-12)Fd=0;
  /* axle loads (weight transfer + downforce) */
  const df=.5*1.2*s.cl*u*u*.5;
  const Fzf=Math.max(m*g*s.b/L-m*this.ax*s.h/L+df,m*g*.08),Fzr=Math.max(m*g*s.a/L+m*this.ax*s.h/L+df,m*g*.08),Fmf=mu*Fzf,Fmr=mu*Fzr;
  /* drive split with traction control or wheelspin */
  const dist=s.drive==='fwd'?[1,0]:s.drive==='rwd'?[0,1]:[.4,.6];let Fdf=Fd*dist[0],Fdr=Fd*dist[1],spinN=0,tcA=false;
  const lim=(F,Fm)=>{if(Math.abs(F)>Fm*.97){if(set.tc){tcA=true;return Math.sign(F)*Fm*.9}spinN=Math.max(spinN,Math.abs(F)/Fm-.97);return Math.sign(F)*Fm*.88}return F};
  Fdf=lim(Fdf,Fmf);Fdr=lim(Fdr,Fmr);this.spin=U.damp(this.spin,Math.min(1,spinN),10,dt);this.tc=tcA;
  /* brakes, ABS, handbrake */
  const sgn=Math.abs(u)>.15?Math.sign(u):0;let Bf=brk*s.brake*.62,Br=brk*s.brake*.38+hb*s.brake*.55,absA=false,lockedR=0;
  if(set.abs){if(Bf>Fmf*.96){Bf=Fmf*.96;absA=true}if(Br>Fmr*.96&&hb<.1){Br=Fmr*.96;absA=true}}
  else{if(Bf>Fmf)Bf=Fmf*.8;if(Br>Fmr){Br=Fmr*.8;lockedR=.7}}
  this.abs=absA;this.lockR=U.damp(this.lockR,U.clamp(hb*.9+lockedR,0,1),12,dt);
  const Fres=(sf.rr*m*g+.5*1.2*s.cda*Math.abs(u)*Math.abs(u))*sgn;
  const Fxf=Fdf-sgn*Bf,Fxr=Fdr-sgn*Br;
  /* steering with speed sensitivity and counter-steer assist */
  const sp=U.clamp(Math.abs(u)/38,0,1),beta=Math.atan2(v,Math.max(Math.abs(u),2));
  let dlt=inp.steer*s.steer*(1-.82*sp*sp);if(u>3)dlt+=set.assist*U.clamp(beta,-.35,.35)*1.2;
  dlt=U.clamp(dlt,-s.steer,s.steer);this.steerAng=U.damp(this.steerAng,dlt,14,dt);dlt=this.steerAng;
  /* tyre lateral forces: slip angle curve scaled by what is left of the traction circle */
  const sg=u<0?-1:1,ub=Math.max(Math.abs(u),1.5),af=Math.atan2(v+s.a*r,ub)-dlt*sg,ar=Math.atan2(v-s.b*r,ub);
  const Dyf=Fmf*Math.sqrt(Math.max(.05,1-(Fxf/Fmf)*(Fxf/Fmf))),Dyr=Fmr*Math.sqrt(Math.max(.05,1-(Fxr/Fmr)*(Fxr/Fmr)))*(1-.55*this.lockR);
  const Fyf=-Dyf*Math.sin(1.5*Math.atan(s.bf*af)),Fyr=-Dyr*Math.sin(1.5*Math.atan(s.br*ar));
  const cd=Math.cos(dlt),sd=Math.sin(dlt);
  const Fbx=Fxf*cd-Fyf*sd+Fxr-Fres,Fby=Fxf*sd+Fyf*cd+Fyr,tau=s.a*(Fxf*sd+Fyf*cd)-s.b*Fyr;
  let du=Fbx/m+v*r,dv=Fby/m-u*r,dr=tau/Iz-r*.15;
  /* stability control: pull yaw rate toward the driver's intended rate when sideslip grows */
  this.esc=false;if(set.esc&&Math.abs(u)>8){const w=U.sstep(.12,.4,Math.abs(beta));if(w>0){const rd=u*Math.tan(dlt)/(L*(1+s.kus*u*u));dr+=U.clamp((rd-r)*5,-6,6)*w;this.esc=w>.2}}
  let nu=u+du*dt;if(sgn!==0&&Math.abs(Fd)<1&&u*nu<0)nu=0;
  let nv=v+dv*dt,nr=r+dr*dt;
  /* low speed: blend to kinematic steering so the car does not wobble when slow */
  const w=1-U.sstep(1,6,Math.abs(nu)),k=Math.min(1,10*dt)*w;nv=U.lerp(nv,0,k);nr=U.lerp(nr,nu*Math.tan(dlt)/L,k);
  this.ax=U.damp(this.ax,du-v*r,8,dt);this.ay=U.damp(this.ay,dv+u*r,8,dt);
  this.u=nu;this.v=nv;this.r=nr;this.beta=Math.atan2(nv,Math.max(Math.abs(nu),2));this.slipF=Math.abs(af);this.slipR=Math.abs(ar);
  this.drift=Math.abs(nu)>5?Math.abs(this.beta):0;this.rpm=U.damp(this.rpm,rpm,25,dt);this.thrO=thr;this.brkO=brk;this.hbO=hb;
  /* pose integration */
  this.psi-=this.r*dt;const f1=-Math.sin(this.psi),f2=-Math.cos(this.psi),r1=Math.cos(this.psi),r2=-Math.sin(this.psi);
  this.fx=f1;this.fz=f2;this.x+=(this.u*f1+this.v*r1)*dt;this.z+=(this.u*f2+this.v*r2)*dt;
  this.wAng+=(this.u/s.rw+this.spin*60*thr)*dt;
  /* body motion for visuals: damped spring on pitch and roll */
  const pt=-this.ax*.012,rt=this.ay*.014;this.pv+=((pt-this.pitch)*90-this.pv*9)*dt;this.pitch+=this.pv*dt;this.rv+=((rt-this.roll)*90-this.rv*9)*dt;this.roll+=this.rv*dt;
  this.collide(env);
 }
 collide(env){
  const s=this.s,m=s.m,Iz=m*(s.a+s.b)*(s.a+s.b)*.22;this.hit=0;
  for(let it=0;it<2;it++){
   const f1=-Math.sin(this.psi),f2=-Math.cos(this.psi),r1=Math.cos(this.psi),r2=-Math.sin(this.psi);
   for(const o of s.circles){
    const cx=this.x+f1*o,cz=this.z+f2*o,cs=env.query(cx,cz,s.cr);
    for(const c of cs){
     this.x+=c.nx*c.pen;this.z+=c.nz*c.pen;
     let vx=this.u*f1+this.v*r1,vz=this.u*f2+this.v*r2;const vn=vx*c.nx+vz*c.nz;
     if(vn<-.05){const e=.14,J=-(1+e)*vn;vx+=J*c.nx;vz+=J*c.nz;
      const dx=f1*o-c.nx*s.cr,dz=f2*o-c.nz*s.cr;this.r=U.clamp(this.r-(dz*J*c.nx-dx*J*c.nz)*m/Iz*.6,-4,4);
      const tx=-c.nz,tz=c.nx,vt=vx*tx+vz*tz;vx-=vt*tx*.04;vz-=vt*tz*.04;
      this.u=vx*f1+vz*f2;this.v=vx*r1+vz*r2;
      const E=.5*m*vn*vn;this.hit=Math.max(this.hit,E);this.dmg=Math.min(100,this.dmg+E/(m*350)*100/ 1);
     }
    }
   }
  }
 }
}
/* Circle vs oriented box / circle colliders on a spatial hash. */
N.makeCollision=cols=>{
 const CELL=40,grid=new Map(),key=(i,j)=>i*100003+j;
 cols.forEach(c=>{const ext=c.t===1?c.r:Math.hypot(c.hw,c.hd);for(let i=Math.floor((c.x-ext)/CELL);i<=Math.floor((c.x+ext)/CELL);i++)for(let j=Math.floor((c.z-ext)/CELL);j<=Math.floor((c.z+ext)/CELL);j++){const k=key(i,j);(grid.get(k)||grid.set(k,[]).get(k)).push(c)}});
 return (x,z,r)=>{const out=[],seen=new Set();const i0=Math.floor((x-r)/CELL),i1=Math.floor((x+r)/CELL),j0=Math.floor((z-r)/CELL),j1=Math.floor((z+r)/CELL);
  for(let i=i0;i<=i1;i++)for(let j=j0;j<=j1;j++){const a=grid.get(key(i,j));if(!a)continue;
   for(const c of a){if(seen.has(c))continue;seen.add(c);
    if(c.t===1){const dx=x-c.x,dz=z-c.z,d=Math.hypot(dx,dz),rr=r+c.r;if(d<rr&&d>1e-6)out.push({nx:dx/d,nz:dz/d,pen:rr-d})}
    else{const cs=Math.cos(c.a),sn=Math.sin(c.a),dx=x-c.x,dz=z-c.z,lx=dx*cs-dz*sn,lz=dx*sn+dz*cs;
     const qx=U.clamp(lx,-c.hw,c.hw),qz=U.clamp(lz,-c.hd,c.hd),ddx=lx-qx,ddz=lz-qz,d=Math.hypot(ddx,ddz);let nlx,nlz,pen;
     if(d>=r)continue;if(d>1e-6){nlx=ddx/d;nlz=ddz/d;pen=r-d}else{const px=c.hw-Math.abs(lx),pz=c.hd-Math.abs(lz);if(px<pz){nlx=Math.sign(lx)||1;nlz=0;pen=px+r}else{nlx=0;nlz=Math.sign(lz)||1;pen=pz+r}}
     out.push({nx:nlx*cs+nlz*sn,nz:-nlx*sn+nlz*cs,pen})}}}
  return out}};
N.Vehicle=Vehicle;N._physics=1;
})();
