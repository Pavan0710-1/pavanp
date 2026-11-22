/* Neon Velocity multiplayer: host a room code, friends join, everyone races the same map. Peer-to-peer via PeerJS (host relays). */
(function(){
  var $=function(id){return document.getElementById(id)};
  var COLORS=[0x29f0ff,0xff2bd6,0xffd000,0x5dff8a,0xff5a00,0xa77bff,0xffffff,0xff4d6d];
  var N={active:false,host:false,code:null,peer:null,conns:{},hostConn:null,me:null,players:[],states:{},ready:{},results:{},meshes:{},labels:{},started:false};
  window.NVNet=N;
  function hex(c){return '#'+('00000'+c.toString(16)).slice(-6)}
  function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function myName(){return (localStorage.getItem('nv-name')||'Pilot').slice(0,16)}
  function loadPeer(){return new Promise(function(res,rej){if(window.Peer)return res();var s=document.createElement('script');s.src='https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';s.onload=res;s.onerror=function(){rej(new Error('Could not load the multiplayer library. Check your internet connection.'))};document.head.appendChild(s)})}
  function newCode(){var a='ABCDEFGHJKLMNPQRSTUVWXYZ',s='';for(var i=0;i<4;i++)s+=a[Math.floor(Math.random()*a.length)];return s}
  function send(c,m){try{if(c&&c.open)c.send(m)}catch(e){}}
  function broadcast(m,except){Object.keys(N.conns).forEach(function(id){if(id!==except)send(N.conns[id],m)})}
  function toHost(m){if(N.host)handle(N.me.id,m);else send(N.hostConn,m)}
  function player(id){for(var i=0;i<N.players.length;i++)if(N.players[i].id==id)return N.players[i];return null}
  function lobbyMsg(){return {t:'lobby',players:N.players,map:NVExtras.getMap(),level:NVExtras.getLevel(),started:N.started}}

  // ---------- message handling ----------
  function handle(from,d){
    if(!d||!d.t)return;
    if(N.host){
      if(d.t=='hello'){
        if(N.started){send(N.conns[from],{t:'denied',reason:'Race already in progress.'});return}
        if(N.players.length>=8){send(N.conns[from],{t:'denied',reason:'Room is full (8 players).'});return}
        N.players.push({id:from,name:String(d.name||'Pilot').slice(0,16),color:COLORS[N.players.length%COLORS.length]});
        broadcast(lobbyMsg());renderLobby();return;
      }
      if(d.t=='ready'){N.ready[from]=true;checkGo();return}
      if(d.t=='s'){d.id=from;N.states[from]=d;broadcast(d,from);return}
      if(d.t=='fin'){N.results[from]=d.time;broadcast({t:'fin',id:from,time:d.time});renderStandings();return}
      if(d.t=='fx'){d.from=from;broadcast(d,from);if(from!==N.me.id&&window.NVItems)NVItems.onNet(d);return}
      return;
    }
    if(d.t=='lobby'){N.players=d.players;N.me=player(N.peer.id)||N.me;setParams(d.map,d.level);renderLobby();return}
    if(d.t=='start'){beginRace(d.map,d.level);return}
    if(d.t=='go'){go();return}
    if(d.t=='s'){N.states[d.id]=d;return}
    if(d.t=='fin'){N.results[d.id]=d.time;renderStandings();return}
    if(d.t=='rematch'){doRematch();return}
    if(d.t=='fx'){if(window.NVItems)NVItems.onNet(d);return}
    if(d.t=='denied'){status(d.reason);return}
  }

  // ---------- hosting / joining ----------
  function host(){
    status('Creating room...');
    loadPeer().then(function(){
      var code=newCode(),peer=new Peer('nvrace-'+code.toLowerCase());
      N.peer=peer;N.host=true;N.code=code;
      peer.on('open',function(id){N.me={id:id,name:myName(),color:COLORS[0]};N.players=[N.me];renderLobby()});
      peer.on('connection',function(c){
        c.on('open',function(){N.conns[c.peer]=c});
        c.on('data',function(d){handle(c.peer,d)});
        c.on('close',function(){dropPlayer(c.peer)});
      });
      peer.on('error',function(e){if(e.type=='unavailable-id'){peer.destroy();host()}else status('Multiplayer error: '+e.type)});
    }).catch(function(e){status(e.message)});
  }
  function join(code){
    code=String(code||'').trim().toUpperCase();
    if(!/^[A-Z]{4}$/.test(code)){status('Enter the 4-letter room code.');return}
    status('Joining '+code+'...');
    loadPeer().then(function(){
      var peer=new Peer();N.peer=peer;N.host=false;N.code=code;
      peer.on('open',function(id){
        N.me={id:id,name:myName(),color:0xffffff};
        var c=peer.connect('nvrace-'+code.toLowerCase(),{reliable:true});N.hostConn=c;
        c.on('open',function(){send(c,{t:'hello',name:myName()})});
        c.on('data',function(d){handle('host',d)});
        c.on('close',function(){status('The host left the race.');N.active=false});
      });
      peer.on('error',function(e){status(e.type=='peer-unavailable'?'Room '+code+' not found.':'Multiplayer error: '+e.type)});
    }).catch(function(e){status(e.message)});
  }
  function dropPlayer(id){
    delete N.conns[id];delete N.states[id];delete N.ready[id];
    N.players=N.players.filter(function(p){return p.id!=id});
    if(N.meshes[id]){N.meshes[id].parent&&N.meshes[id].parent.remove(N.meshes[id]);delete N.meshes[id]}
    if(N.labels[id]){N.labels[id].remove();delete N.labels[id]}
    broadcast(lobbyMsg());renderLobby();checkGo();renderStandings();
  }
  function setParams(map,level){if(window.NVSetParam){NVSetParam('map',map);NVSetParam('level',level)}var m=$('s-map'),l=$('s-level');if(m)m.innerHTML='Map: '+NVExtras.mapLabel(map);if(l)l.innerHTML='Level: '+level+' · '+NVExtras.LEVELS[level-1].name}

  // ---------- race flow ----------
  function startRace(){
    if(!N.host)return;
    N.started=true;var map=$('nv-mp-map').value,level=parseInt($('nv-mp-level').value,10);
    broadcast({t:'start',map:map,level:level});beginRace(map,level);
  }
  function beginRace(map,level){
    setParams(map,level);N.active=true;N.started=true;N.results={};N.ready={};
    var o=$('nv-lobby');if(o)o.remove();
    var st=$('start');st.removeAttribute('aria-busy');st.onclick&&st.onclick();
  }
  N.onLoaded=function(cb){
    N.goCb=cb;
    var w=document.createElement('div');w.id='nv-wait';w.style.cssText='position:absolute;inset:0;z-index:20000;display:flex;align-items:center;justify-content:center;background:rgba(3,7,15,.85);color:#dffcff;font:800 22px Consolas,monospace;letter-spacing:.15em';w.textContent='WAITING FOR OTHER PILOTS...';document.body.appendChild(w);
    toHost({t:'ready'});
    if(N.host)N.goTimer=setTimeout(function(){forceGo()},30000);
  };
  function checkGo(){if(!N.host||!N.started||!N.goCb)return;for(var i=0;i<N.players.length;i++)if(!N.ready[N.players[i].id])return;forceGo()}
  function forceGo(){if(N.went)return;clearTimeout(N.goTimer);broadcast({t:'go'});go()}
  function go(){if(N.went)return;N.went=true;var w=$('nv-wait');if(w)w.remove();N.goCb&&N.goCb()}
  N.onFinish=function(time){var t=time==null?-1:time;N.results[N.me.id]=t;toHost({t:'fin',time:t});renderStandings()};
  N.rematch=function(){if(!N.host)return;broadcast({t:'rematch'});doRematch()};
  function doRematch(){N.results={};N.paid=false;N.allowReset=true;NVExtras.restart();N.allowReset=false}
  N.leave=function(){try{N.peer&&N.peer.destroy()}catch(e){}location.href=location.pathname};
  var origReset=bkcore.hexgl.HexGL.prototype.reset;
  bkcore.hexgl.HexGL.prototype.reset=function(){if(N.active&&!N.allowReset)return;return origReset.apply(this,arguments)};

  // ---------- live state sync ----------
  setInterval(function(){
    var g=window.hexGL;if(!N.active||!N.me||!g||!g.gameplay)return;
    var c=g.components.shipControls,p=c.dummy.position,q=c.dummy.quaternion;
    var m={t:'s',id:N.me.id,p:[p.x,p.y,p.z],q:[q.x,q.y,q.z,q.w],prog:NVExtras.progress(),lap:g.gameplay.lap};
    N.states[N.me.id]=m;
    if(N.host)broadcast(m);else send(N.hostConn,m);
  },66);
  function standings(){
    return N.players.map(function(p){var s=N.states[p.id]||{},r=N.results[p.id];return {p:p,prog:s.prog||0,lap:s.lap||1,res:r}}).sort(function(a,b){
      var fa=a.res!=null&&a.res>=0,fb=b.res!=null&&b.res>=0;
      if(fa&&fb)return a.res-b.res;if(fa)return -1;if(fb)return 1;
      if(a.res==-1&&b.res!=-1)return 1;if(b.res==-1&&a.res!=-1)return -1;
      return b.prog-a.prog;
    });
  }
  N.renderStandings=renderStandings;
  N.standings=standings;
  N.sendFx=function(m){m.t='fx';m.from=N.me.id;toHost(m)};
  N.targetAhead=function(){var st=standings(),me=-1;st.forEach(function(s,i){if(s.p.id==N.me.id)me=i});if(me>0)return st[me-1].p.id;var o=st.filter(function(s){return s.p.id!=N.me.id&&s.res==null})[0];return o?o.p.id:null};
  function ord(n){return n+(n%100>=11&&n%100<=13?'th':['th','st','nd','rd'][n%10]||'th')}
  N.ord=ord;
  function renderStandings(){
    var el=$('nv-mp-standings');if(!el)return;
    var stl=standings(),done=stl.filter(function(x){return x.res!=null&&x.res>=0});
    if(!N.paid&&N.me&&N.results[N.me.id]!=null){var mi=-1;done.forEach(function(x,i){if(x.p.id==N.me.id)mi=i});if(mi>=0&&mi<3&&stl.every(function(x){return x.res!=null})){N.paid=true;window.NVItems&&NVItems.addCredits([100,60,30][mi])}}
    var podium='';
    if(done.length){var order=[1,0,2],hts=[110,80,60],cols=['#ffd34d','#cfe3ff','#e0965a'];podium='<div style="display:flex;justify-content:center;align-items:flex-end;gap:10px;margin:6px 0 14px">'+order.map(function(i){var x=done[i];if(!x)return '<div style="width:110px"></div>';return '<div style="width:110px;text-align:center"><div style="font-weight:800;color:'+hex(x.p.color)+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(x.p.name)+'</div><div style="height:'+hts[i]+'px;margin-top:4px;border-radius:10px 10px 0 0;background:linear-gradient(180deg,'+cols[i]+',rgba(0,0,0,.2));display:flex;align-items:flex-start;justify-content:center;padding-top:6px;color:#06131a;font:900 26px Consolas,monospace;animation:nvRise .6s '+(i*0.15)+'s both">'+(i+1)+'</div></div>'}).join('')+'</div>'}
    el.innerHTML=podium+'<div style="color:#55e6ff;letter-spacing:.2em;margin-bottom:6px">RACE STANDINGS</div>'+stl.map(function(s,i){
      return '<div style="display:flex;justify-content:space-between;padding:8px 12px;border-bottom:1px solid rgba(85,230,255,.18)"><b><span style="color:'+hex(s.p.color)+'">●</span> '+(i+1)+'. '+esc(s.p.name)+(N.me&&s.p.id==N.me.id?' (you)':'')+'</b><span>'+(s.res==null?'Racing · lap '+s.lap:s.res<0?'DNF':(s.res/1000).toFixed(2)+' s')+'</span></div>'}).join('');
  }
  N.eachRemote=function(fn){Object.keys(N.meshes).forEach(function(id){var p=player(id);if(p&&N.meshes[id].visible)fn(N.meshes[id].position,p.color)})};

  var projector=null,v3=null;
  function frame(){
    requestAnimationFrame(frame);
    var g=window.hexGL;if(!N.active||!g||!g.gameplay||!N.me)return;
    if(!projector){projector=new THREE.Projector();v3=new THREE.Vector3()}
    var cam=g.manager.get('game').camera;
    N.players.forEach(function(p){
      if(p.id==N.me.id)return;var s=N.states[p.id];if(!s||!s.p)return;
      var m=N.meshes[p.id];
      if(!m){m=N.meshes[p.id]=NVExtras.makeShip(p.color,1,true);m.position.set(s.p[0],s.p[1],s.p[2])}
      m.position.x+=(s.p[0]-m.position.x)*0.35;m.position.y+=(s.p[1]-m.position.y)*0.35;m.position.z+=(s.p[2]-m.position.z)*0.35;
      m.quaternion.set(s.q[0],s.q[1],s.q[2],s.q[3]);
      var lb=N.labels[p.id];
      if(!lb){lb=N.labels[p.id]=document.createElement('div');lb.style.cssText='position:absolute;z-index:10002;transform:translate(-50%,-100%);font:800 12px Consolas,monospace;padding:3px 8px;border-radius:99px;background:rgba(5,10,20,.75);pointer-events:none;white-space:nowrap';lb.style.color=hex(p.color);lb.style.border='1px solid '+hex(p.color);lb.textContent=p.name;document.body.appendChild(lb)}
      v3.set(m.position.x,m.position.y+6,m.position.z);projector.projectVector(v3,cam);
      var dx=m.position.x-cam.position.x,dz=m.position.z-cam.position.z,vis=v3.z<1&&v3.z>-1&&dx*dx+dz*dz<1500*1500;
      if(document.getElementById('nv-results'))vis=false;
      lb.style.display=vis?'block':'none';
      if(vis){lb.style.left=((v3.x+1)/2*window.innerWidth)+'px';lb.style.top=((1-v3.y)/2*window.innerHeight)+'px'}
    });
    var pos=$('nv-mp-pos');
    if(!pos&&$('nv-extra-hud')){pos=document.createElement('span');pos.id='nv-mp-pos';pos.style.cssText='padding:8px 12px;border:1px solid rgba(255,43,214,.6);border-radius:99px;background:rgba(5,10,20,.72);color:#ff9cf0';$('nv-extra-hud').appendChild(pos)}
    if(pos){var st=standings(),me=0;st.forEach(function(s,i){if(s.p.id==N.me.id)me=i+1});pos.textContent=ord(me)+' / '+st.length}
  }
  requestAnimationFrame(frame);

  // ---------- lobby UI ----------
  var BTN='padding:12px 20px;border:1px solid #55e6ff;border-radius:99px;background:rgba(85,230,255,.12);color:#dffcff;font:800 13px Consolas,monospace;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;margin:6px';
  var INPUT='padding:11px 14px;border-radius:99px;border:1px solid #55e6ff;background:#06131a;color:#dffcff;font:700 15px Consolas,monospace;text-align:center;margin:6px';
  function overlay(){
    var o=$('nv-lobby');if(o)return o;
    o=document.createElement('div');o.id='nv-lobby';
    o.style.cssText='position:absolute;inset:0;z-index:30000;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;background:rgba(3,7,15,.95);color:#dffcff;text-align:center;font-family:Consolas,monospace';
    o.onclick=function(e){e.stopPropagation()};document.body.appendChild(o);return o;
  }
  function status(msg){var s=$('nv-mp-status');if(s)s.textContent=msg;else{openMenu();$('nv-mp-status').textContent=msg}}
  function openMenu(){
    var o=overlay();
    o.innerHTML='<h2 style="font-size:clamp(32px,6vw,60px);margin:0 0 6px">Multiplayer</h2><p style="color:#aeb8c8;margin:0 0 18px">Host a room and share the code, or join a friend.</p>'+
      '<div>Your name<br><input id="nv-mp-name" maxlength="16" value="'+esc(myName())+'" style="'+INPUT+'"></div>'+
      '<div style="margin-top:14px"><button id="nv-mp-host" style="'+BTN+';background:#55e6ff;color:#06131a">Host race</button></div>'+
      '<div style="margin-top:10px"><input id="nv-mp-code" maxlength="4" placeholder="CODE" style="'+INPUT+';width:110px;text-transform:uppercase;letter-spacing:.3em"><button id="nv-mp-join" style="'+BTN+'">Join</button></div>'+
      '<div id="nv-mp-status" style="min-height:22px;margin-top:12px;color:#ffd166"></div><button id="nv-mp-close" style="'+BTN+'">Close</button>';
    function saveName(){var n=($('nv-mp-name').value||'Pilot').trim().slice(0,16)||'Pilot';localStorage.setItem('nv-name',n)}
    $('nv-mp-host').onclick=function(){saveName();host()};
    $('nv-mp-join').onclick=function(){saveName();join($('nv-mp-code').value)};
    $('nv-mp-code').onkeydown=function(e){if(e.keyCode==13){saveName();join(this.value)}};
    $('nv-mp-close').onclick=function(){N.leaveLobby()};
  }
  N.leaveLobby=function(){try{N.peer&&N.peer.destroy()}catch(e){}N.peer=null;N.players=[];N.conns={};N.host=false;var o=$('nv-lobby');if(o)o.remove()};
  function renderLobby(){
    if(N.started&&!$('nv-lobby'))return;
    var o=overlay(),map=NVExtras.getMap(),level=NVExtras.getLevel();
    var list=N.players.map(function(p){return '<div style="display:flex;gap:10px;align-items:center;padding:8px 14px;border-bottom:1px solid rgba(85,230,255,.18)"><span style="width:12px;height:12px;border-radius:50%;background:'+hex(p.color)+'"></span><b>'+esc(p.name)+'</b>'+(N.players[0]==p?'<span style="color:#aeb8c8">host</span>':'')+(N.me&&p.id==N.me.id?'<span style="color:#55e6ff">you</span>':'')+'</div>'}).join('');
    var mapOpts=bkcore.hexgl.trackList.map(function(t){return '<option value="'+t.id+'"'+(t.id==map?' selected':'')+'>'+t.label+'</option>'}).join('');
    var lvOpts=NVExtras.LEVELS.map(function(L,i){return '<option value="'+(i+1)+'"'+(i+1==level?' selected':'')+'>'+(i+1)+' · '+L.name+'</option>'}).join('');
    o.innerHTML='<div style="color:#55e6ff;letter-spacing:.3em">ROOM CODE</div><div style="font-size:clamp(48px,10vw,96px);font-weight:800;letter-spacing:.2em;margin:4px 0 10px">'+esc(N.code||'----')+'</div>'+
      '<p style="color:#aeb8c8;margin:0 0 14px">Friends open Neon Velocity, click Multiplayer and enter this code.</p>'+
      '<div style="width:min(420px,90vw);text-align:left;margin-bottom:14px">'+list+'</div>'+
      (N.host?'<div><select id="nv-mp-map" style="'+INPUT+'">'+mapOpts+'</select><select id="nv-mp-level" style="'+INPUT+'">'+lvOpts+'</select></div><button id="nv-mp-start" style="'+BTN+';background:#55e6ff;color:#06131a">Start race ('+N.players.length+' pilot'+(N.players.length>1?'s':'')+')</button>'
        :'<div style="color:#aeb8c8">Map: <b style="color:#dffcff">'+esc(NVExtras.mapLabel(map))+'</b> · Level: <b style="color:#dffcff">'+level+' · '+NVExtras.LEVELS[level-1].name+'</b></div><p style="color:#ffd166">Waiting for the host to start...</p>')+
      '<div id="nv-mp-status" style="min-height:22px;margin-top:8px;color:#ffd166"></div><button id="nv-mp-close" style="'+BTN+'">Leave</button>';
    if(N.host){
      $('nv-mp-start').onclick=startRace;
      $('nv-mp-map').onchange=$('nv-mp-level').onchange=function(){setParams($('nv-mp-map').value,parseInt($('nv-mp-level').value,10));broadcast(lobbyMsg())};
    }
    $('nv-mp-close').onclick=function(){N.leaveLobby()};
  }
  var mp=$('nv-mp');if(mp)mp.onclick=openMenu;
})();
