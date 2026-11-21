(function(){'use strict';
const N=window.NDM=window.NDM||{};
const U=N.U={clamp:(v,a,b)=>Math.min(Math.max(v,a),b),lerp:(a,b,t)=>a+(b-a)*t,damp:(a,b,l,dt)=>a+(b-a)*(1-Math.exp(-l*dt)),
 sstep:(a,b,x)=>{const t=U.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)},wrap:a=>Math.atan2(Math.sin(a),Math.cos(a)),
 approach:(v,t,s)=>v<t?Math.min(v+s,t):Math.max(v-s,t),
 rng:s=>()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296},
 fmtT:t=>{t=Math.max(0,t);const m=Math.floor(t/60),s=t-m*60;return m+':'+(s<10?'0':'')+s.toFixed(2)}};
N.store={get(k,d){try{const v=localStorage.getItem('nd.'+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem('nd.'+k,JSON.stringify(v));return true}catch(e){return false}}};
N.PRESETS={low:{pr:1,shadow:0,far:360,trees:40,aa:false},medium:{pr:1.25,shadow:1024,far:560,trees:110,aa:false},high:{pr:1.75,shadow:2048,far:820,trees:220,aa:true},ultra:{pr:2.25,shadow:4096,far:1200,trees:360,aa:true}};
N.DEF={units:'kmh',trans:'auto',tc:true,abs:true,esc:true,assist:.4,fov:68,shake:.5,sens:1,preset:'auto',res:1,shadows:true,fpsCap:0,
 vol:{master:.8,engine:.8,env:.6,ui:.7},
 bind:{accel:['KeyW','ArrowUp'],brake:['KeyS','ArrowDown'],left:['KeyA','ArrowLeft'],right:['KeyD','ArrowRight'],hb:['Space'],cam:['KeyC'],reset:['KeyR'],pause:['KeyP','Escape'],up:['KeyE'],down:['KeyQ'],lights:['KeyF'],map:['KeyM'],horn:['KeyH'],indicatorL:['KeyZ'],indicatorR:['KeyX']}};
N.loadSettings=()=>{const s=JSON.parse(JSON.stringify(N.DEF)),o=N.store.get('settings',{});for(const k in o){if(o[k]&&typeof o[k]==='object'&&!Array.isArray(o[k])&&s[k])Object.assign(s[k],o[k]);else s[k]=o[k]}return s};
N.saveSettings=s=>N.store.set('settings',s);
N.autoPreset=()=>{const c=navigator.hardwareConcurrency||4,m=navigator.deviceMemory||4,t=matchMedia('(pointer:coarse)').matches;if(t||c<=4||m<=4)return 'low';return c>=12&&m>=8?'high':'medium'};
/* Resource bag: tracks three.js objects and event listeners so closing the game leaves nothing behind. */
N.Bag=class{constructor(){this.items=[];this.offs=[]}add(o){this.items.push(o);return o}
 on(t,e,f,o){t.addEventListener(e,f,o);this.offs.push(()=>t.removeEventListener(e,f,o));return f}
 dispose(){this.offs.forEach(f=>f());this.offs=[];this.items.forEach(o=>{try{o.dispose()}catch(e){}});this.items=[]}};
N._core=1;
})();
