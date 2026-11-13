
/* Safe hidden commands + on-demand loader for NEON DRIVE. Loads with defer on every page. */
(function(){
'use strict';
if(window.PPCommands)return;
const CMD={},GAP_BEFORE=700,GAP_BETWEEN=600,CONFIRM=450;
let buf='',last=0,timer=0;
const host=()=>window.PPHost||{};
function editable(el){if(!el)return false;if(el.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))return true;const r=el.getAttribute&&el.getAttribute('role');return /textbox|combobox|searchbox/.test(r||'')}
function modalOpen(){return [...document.querySelectorAll('[aria-modal="true"]')].some(e=>e.getClientRects().length>0)}
function register(words,fn,label){(Array.isArray(words)?words:[words]).forEach((w,i)=>{CMD[w]={fn,label:i===0?label:null}})}
function loadGame(){return new Promise((res,rej)=>{if(window.NeonDrive)return res();const s=document.createElement('script');s.src='/assets/neon-drive.js';s.async=true;s.onload=res;s.onerror=()=>rej(new Error('Could not load the game.'));document.head.appendChild(s)})}
async function openGame(mode){try{await loadGame();await window.NeonDrive.open({mode:mode||'endless'})}catch(e){host().toast&&host().toast(e.message)}}
function help(){const names=Object.keys(CMD).sort().join(', ');host().toast?host().toast('Commands: '+names+'. Or press Ctrl K.'):alert('Commands: '+names)}
register(['car','drive','driving','race','racing','play','game','start'],()=>openGame('endless'),'Open NEON DRIVE');
register('help',help,'List commands');
register('explore',()=>host().navTo&&host().navTo('explore'),'3D world');
register('music',()=>host().sndToggle&&host().sndToggle(),'Toggle sound');
register('neon',()=>host().nextTheme&&host().nextTheme(),'Next colour theme');
['about','work','services','guides','contact','lab'].forEach(p=>register(p,()=>host().navTo&&host().navTo(p),'Go to '+p));
addEventListener('keydown',e=>{
 if(e.defaultPrevented||e.ctrlKey||e.metaKey||e.altKey||e.isComposing||e.repeat)return;
 if(editable(e.target)||editable(document.activeElement)||modalOpen()||(window.NeonDrive&&window.NeonDrive.isOpen()))return;
 if(!/^[a-z]$/i.test(e.key)){buf='';clearTimeout(timer);return}
 const now=performance.now();
 if(!buf){if(now-last<GAP_BEFORE){last=now;return}}else if(now-last>GAP_BETWEEN)buf='';
 last=now;buf+=e.key.toLowerCase();if(buf.length>12)buf='';clearTimeout(timer);
 if(CMD[buf]){const word=buf;timer=setTimeout(()=>{buf='';if(!modalOpen()&&!editable(document.activeElement))CMD[word].fn()},CONFIRM)}
});
window.PPCommands={register,openGame,help,list:()=>Object.keys(CMD).filter(k=>CMD[k].label).map(k=>({word:k,label:CMD[k].label}))};
/* Mobile: a visible button opens the command palette */
if(matchMedia('(pointer:coarse)').matches){const b=document.createElement('button');b.type='button';b.textContent='⌘';b.setAttribute('aria-label','Open command palette');
 b.style.cssText='position:fixed;right:12px;bottom:calc(150px + env(safe-area-inset-bottom));z-index:99;width:44px;height:44px;border-radius:50%;border:1px solid rgba(255,255,255,.3);background:rgba(0,0,0,.6);color:#fff;font:500 18px sans-serif';
 b.onclick=()=>host().openPalette&&host().openPalette();document.addEventListener('DOMContentLoaded',()=>document.body.appendChild(b))}
})();
