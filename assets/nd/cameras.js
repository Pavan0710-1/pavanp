/* Cameras: 0 Chase, 1 Close chase, 2 Hood, 3 Cockpit, 4 Bumper, 5 Cinematic, 6 Free-look.
   Chase cameras lag behind the car's heading, shorten when something solid is behind them, and respect FOV, shake and sensitivity settings. */
(function(){'use strict';const N=window.NDM,U=N.U;
N.CAMS=['Chase','Close chase','Hood','Cockpit','Bumper','Cinematic','Free look'];
N.Cameras=class{
 constructor(T,cam){this.T=T;this.cam=cam;this.mode=0;this.h=0;this.yaw=0;this.pitch=.2;this.zoom=1;this.t=0;this.look=new T.Vector3();this.pos=new T.Vector3();this.fov=cam.fov;this.init=false}
 next(){this.mode=(this.mode+1)%N.CAMS.length;this.init=false}
 drag(dx,dy,sens){this.yaw-=dx*.005*sens;this.pitch=U.clamp(this.pitch+dy*.004*sens,-.2,1.2)}
 /* p: interpolated pose {x,z,psi}; v: vehicle; model: car model; world; set: settings; dt */
 update(p,v,model,world,set,dt,menu){
  const T=this.T,c=this.cam,s=v.s,f1=-Math.sin(p.psi),f2=-Math.cos(p.psi),r1=Math.cos(p.psi),r2=-Math.sin(p.psi),spd=Math.hypot(v.u,v.v),sp=U.clamp(spd/60,0,1);
  this.t+=dt;if(!this.init){this.h=p.psi;this.init=true}
  let m=menu?5:this.mode,tx,ty,tz,lx,ly,lz,fov=set.fov;
  const hv=spd>6?Math.atan2(-(v.u*f1+v.v*r1),-(v.u*f2+v.v*r2)):p.psi;
  this.h=this.h+U.wrap((m===0?p.psi*.7+hv*.3:p.psi)-this.h)*(1-Math.exp(-(m<2?3.5:20)*dt));
  const hf1=-Math.sin(this.h),hf2=-Math.cos(this.h);
  if(m===0||m===1){const d=(m===0?7.2:4.8)*this.zoom+sp*1.2,hh=m===0?2.6:1.7;tx=p.x-hf1*d;tz=p.z-hf2*d;ty=hh;lx=p.x+hf1*8;lz=p.z+hf2*8;ly=1.2}
  else if(m===2){const q=s.hl*.18;tx=p.x+f1*q+r1*-.0;tz=p.z+f2*q;ty=s.body[2][1]+.55;lx=p.x+f1*30;lz=p.z+f2*30;ly=ty-.15;fov+=6}
  else if(m===3){const e=model.eye,cs=Math.cos(p.psi),sn=Math.sin(p.psi),ox=e.x,oz=e.z;tx=p.x+ox*cs+oz*sn;tz=p.z-ox*sn+oz*cs;ty=e.y;lx=tx+f1*30-r1*v.steerAng*3;lz=tz+f2*30-r2*v.steerAng*3;ly=ty-.2}
  else if(m===4){const z=model.bumperZ,cs=Math.cos(p.psi),sn=Math.sin(p.psi);tx=p.x+z*sn;tz=p.z+z*cs;ty=.5;lx=tx+f1*30;lz=tz+f2*30;ly=.5}
  else if(m===5){const a=this.t*.25+(menu?0:p.psi),d=menu?9:8+sp*5;tx=p.x+Math.sin(a)*d;tz=p.z+Math.cos(a)*d;ty=2.4+Math.sin(this.t*.4)*.4+(menu?.5:0);lx=p.x;lz=p.z;ly=.9}
  else{const d=7*this.zoom,cp=Math.cos(this.pitch),a=this.yaw+p.psi;tx=p.x+Math.sin(a)*d*cp;tz=p.z+Math.cos(a)*d*cp;ty=1+Math.sin(this.pitch)*d;lx=p.x;lz=p.z;ly=1}
  if(m!==5&&m!==2&&m!==3&&m!==4&&world){const cx=p.x,cz=p.z;let k=1;for(let i=1;i<=6;i++){const q=i/6,qx=cx+(tx-cx)*q,qz=cz+(tz-cz)*q;if(world.query(qx,qz,.6).length){k=Math.max(.25,(i-1)/6);break}}tx=cx+(tx-cx)*k;tz=cz+(tz-cz)*k}
  ty=Math.max(ty,.4);
  const sh=set.shake*(m===3||m===2?.012:.02)*sp*(1+(v.hit>0?4:0));const n1=Math.sin(this.t*47)*sh,n2=Math.cos(this.t*39)*sh;
  c.position.set(tx+n1,ty+n2,tz);this.look.set(lx,ly,lz);c.lookAt(this.look);if(m===3||m===2)c.rotation.z+=-v.roll*.5;
  fov+=(m===3||m===2?0:sp*9);this.fov=U.damp(this.fov,fov,5,dt);if(Math.abs(c.fov-this.fov)>.05){c.fov=this.fov;c.updateProjectionMatrix()}}
};
N._cameras=1;
})();
