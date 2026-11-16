/* Audio: synthesised engine (per-car cylinder count and tone), gear-shift cues, tyre squeal, wind and impacts. Original and generated live; no audio files.
   Four buses: master, engine, environment, interface. Context is created on a user gesture and fully closed on exit. */
(function(){'use strict';const N=window.NDM,U=N.U;
N.Audio=class{
 constructor(set){this.set=set;this.c=null}
 init(car){if(this.c)return;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;const c=this.c=new AC(),mk=()=>c.createGain();
  this.m=mk();this.m.connect(c.destination);this.be=mk();this.bv=mk();this.bu=mk();[this.be,this.bv,this.bu].forEach(b=>b.connect(this.m));
  const nb=this.nb=c.createBuffer(1,c.sampleRate*2,c.sampleRate),d=nb.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  this.setCar(car);
  const noise=(type,f)=>{const s=c.createBufferSource();s.buffer=nb;s.loop=true;const fl=c.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=type==='bandpass'?4:.5;const g=mk();g.gain.value=0;s.connect(fl);fl.connect(g);s.start();return{s,fl,g}};
  this.sq=noise('bandpass',1700);this.sq.g.connect(this.bv);this.wd=noise('lowpass',500);this.wd.g.connect(this.bv);this.rd=noise('highpass',3000);this.rd.g.connect(this.bv);
  this.vol()}
 setCar(car){const c=this.c;if(!c)return;if(this.eo)this.eo.forEach(o=>{try{o.stop()}catch(e){}});const sn=car.snd;
  const o1=c.createOscillator(),o2=c.createOscillator(),o3=c.createOscillator(),f=c.createBiquadFilter(),g=c.createGain();o1.type=sn.tone;o2.type='square';o3.type='sine';f.type='lowpass';f.frequency.value=sn.lp;f.Q.value=2;
  o1.connect(f);o2.connect(f);o3.connect(f);f.connect(g);g.gain.value=0;g.connect(this.be);[o1,o2,o3].forEach(o=>o.start());this.eo=[o1,o2,o3];this.ef=f;this.eg=g;this.cyl=sn.cyl;this.lp=sn.lp}
 vol(){if(!this.c)return;const v=this.set.vol,t=this.c.currentTime;this.m.gain.setTargetAtTime(v.master,t,.05);this.be.gain.setTargetAtTime(v.engine,t,.05);this.bv.gain.setTargetAtTime(v.env,t,.05);this.bu.gain.setTargetAtTime(v.ui,t,.05)}
 resume(){if(this.c&&this.c.state==='suspended')this.c.resume()}
 suspend(){if(this.c&&this.c.state==='running')this.c.suspend()}
 update(v,run){if(!this.c)return;const t=this.c.currentTime,fr=v.rpm/60*(this.cyl/2),spd=Math.hypot(v.u,v.v);
  this.eo[0].frequency.setTargetAtTime(fr,t,.03);this.eo[1].frequency.setTargetAtTime(fr*.5,t,.03);this.eo[2].frequency.setTargetAtTime(fr*.25,t,.03);
  const load=.35+.65*v.thrO;this.ef.frequency.setTargetAtTime(this.lp*(.5+v.rpm/9000)*(.7+.5*v.thrO),t,.05);this.eg.gain.setTargetAtTime(run?.05+.07*load:0,t,.08);
  const slip=U.clamp((Math.max(v.slipF,v.slipR)-.12)*3+(v.lockR>.2?.6:0)+(v.abs?0:0)+v.spin*.6,0,1)*U.clamp(spd/6,0,1);
  this.sq.g.gain.setTargetAtTime(run?slip*.22:0,t,.04);this.sq.fl.frequency.setTargetAtTime(1300+spd*18,t,.1);
  this.wd.g.gain.setTargetAtTime(run?Math.min(.3,spd*spd*.00018):0,t,.1);this.wd.fl.frequency.setTargetAtTime(300+spd*14,t,.1);this.rd.g.gain.setTargetAtTime(0,t,.2);
  if(v.shiftEv)this.blip(300,.06,'square',.05)}
 blip(f,d,type,g0,bus){if(!this.c)return;const c=this.c,t=c.currentTime,o=c.createOscillator(),g=c.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f,t);g.gain.setValueAtTime(g0||.2,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g);g.connect(bus||this.bu);o.start(t);o.stop(t+d+.02)}
 ui(k){const f={click:[660,.06],ok:[880,.12],back:[440,.08],go:[1040,.35],tick:[520,.09],best:[1320,.4]}[k]||[600,.06];this.blip(f[0],f[1],'sine',.25)}
 crash(E){if(!this.c)return;const c=this.c,t=c.currentTime,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain(),k=U.clamp(E/60000,.1,1);s.buffer=this.nb;f.type='lowpass';f.frequency.value=700+k*900;g.gain.setValueAtTime(.7*k,t);g.gain.exponentialRampToValueAtTime(.001,t+.4);s.connect(f);f.connect(g);g.connect(this.bv);s.start(t);this.blip(90,.3,'sine',.6*k,this.bv)}
 destroy(){if(!this.c)return;try{this.eo.forEach(o=>o.stop());this.sq.s.stop();this.wd.s.stop();this.rd.s.stop()}catch(e){}try{this.c.close()}catch(e){}this.c=null}
};
N._audio=1;
})();
