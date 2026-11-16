(function(){'use strict';
if(window.NeonDrive)return;
const BASE=((document.currentScript&&document.currentScript.src)||'/assets/neon-drive.js').replace(/[^/]*$/,'')+'nd/';
const THREE_URL='https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',VER='1';
const FILES=['core','physics','vehicles','world','audio','cameras','ui','game'];
let boot=null,game=null,opening=false;
const load=src=>new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.async=false;s.onload=res;s.onerror=()=>rej(new Error('Could not load '+src.split('/').pop()));document.head.appendChild(s)});
function webgl(){try{const c=document.createElement('canvas');return !!(c.getContext('webgl2')||c.getContext('webgl'))}catch(e){return false}}
function note(t,keep){let d=document.getElementById('nd-note');if(!d){d=document.createElement('div');d.id='nd-note';d.setAttribute('role','status');d.style.cssText='position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2100;background:#fff;color:#000;padding:12px 20px;border-radius:99px;font:500 13px system-ui,sans-serif;max-width:92vw';document.body.appendChild(d)}d.textContent=t;clearTimeout(d._t);if(!keep)d._t=setTimeout(()=>d.remove(),4500)}
function prepare(){if(boot)return boot;boot=(async()=>{if(!window.THREE)await load(THREE_URL);for(const f of FILES)if(!(window.NDM&&window.NDM['_'+f]))await load(BASE+f+'.js?v='+VER)})();boot.catch(()=>{boot=null});return boot}
async function open(o){if(game||opening)return !!game;opening=true;
 try{if(!webgl())throw new Error('NEON DRIVE needs WebGL, which is not available on this device or browser.');note('Loading NEON DRIVE…',true);await prepare();document.getElementById('nd-note')&&document.getElementById('nd-note').remove();
  game=window.NDM.createGame(o||{},()=>{game=null})}
 catch(e){console.error('[NeonDrive]',e);note(e.message||'The game could not start.');game=null;return false}
 finally{opening=false}return true}
function close(){const g=game;game=null;if(g)g.destroy()}
window.NeonDrive={open,close,isOpen:()=>!!game||opening};
})();
