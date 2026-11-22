/* Procedurally generated Neon Velocity maps. Reuses Cityscape assets (ship, audio, HUD) and builds its own track, collision and height maps. */
var bkcore = bkcore || {};
bkcore.hexgl = bkcore.hexgl || {};
bkcore.hexgl.tracks = bkcore.hexgl.tracks || {};

(function(){
	var SIZE = 6000, CMAP = 2048, HMAP = 512, N = 1440;

	var MAPS = {
		CyberGrid:   {label:'Cyber Grid',   seed:7,  R:1800, harm:[[2,0.14],[3,0.08]],               width:92, hills:40,  boosts:12, gaps:2, gapLen:26, style:'city',
			theme:{skyTop:0x02010a, skyBottom:0x2a0a4a, fog:0x1a0833, fogD:0.00026, ground:'#07030f', grid:'#ff2bd6', track:'#120d22', line:'#29f0ff', accent:0x29f0ff, accent2:0xff2bd6, build:0x0d0820}},
		SolarCanyon: {label:'Solar Canyon', seed:21, R:1800, harm:[[3,0.2],[5,0.12],[7,0.05]],        width:66, hills:150, boosts:9,  gaps:3, gapLen:30, style:'mesa',
			theme:{skyTop:0x2a0a00, skyBottom:0xffa030, fog:0xd0601f, fogD:0.00024, ground:'#4a1e08', grid:'#ffb000', track:'#2a140a', line:'#ffd000', accent:0xffb000, accent2:0xff5a00, build:0x8a3a10}},
		OrbitalBelt: {label:'Orbital Asteroid Belt', seed:42, R:1700, harm:[[2,0.2],[4,0.1],[5,0.05]], width:78, hills:260, boosts:10, gaps:4, gapLen:40, style:'space',
			theme:{skyTop:0x000005, skyBottom:0x0a1a3a, fog:0x050a1a, fogD:0.00012, ground:'#000000', grid:'#3a6bff', track:'#0c1222', line:'#7df9ff', accent:0x3a8bff, accent2:0xff3355, build:0x3a3440}},
		QuantumCore: {label:'Quantum Core', seed:99, R:1750, harm:[[2,0.12],[6,0.08],[9,0.035]],      width:66, hills:120, boosts:14, gaps:2, gapLen:26, style:'core',
			theme:{skyTop:0x0a0012, skyBottom:0x4a0030, fog:0x2a0024, fogD:0.0003, ground:'#0a0010', grid:'#b000ff', track:'#140818', line:'#ff2b6a', accent:0xb000ff, accent2:0xff2b6a, build:0x1a0626}}
	};

	function rng(seed){ var s = seed >>> 0 || 1; return function(){ s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

	function canvasTex(w, h, draw, repeat){
		var c = document.createElement('canvas'); c.width = w; c.height = h;
		draw(c.getContext('2d'), w, h);
		var t = new THREE.Texture(c);
		t.wrapS = t.wrapT = THREE.RepeatWrapping;
		if(repeat) t.repeat.set(repeat[0], repeat[1]);
		t.needsUpdate = true;
		return t;
	}

	function generate(def){
		var r = rng(def.seed), ph = def.harm.map(function(){ return r() * Math.PI * 2; });
		var hp1 = r() * 6.28, hp2 = r() * 6.28, pts = [], i, len = 0;
		for(i = 0; i < N; i++){
			var th = i / N * Math.PI * 2, rad = def.R;
			def.harm.forEach(function(h, k){ rad += def.R * h[1] * Math.sin(h[0] * th + ph[k]); });
			var hh = def.hills * (1 + 0.6 * Math.sin(2 * th + hp1) + 0.4 * Math.sin(3 * th + hp2)) / 2;
			pts.push({x: rad * Math.cos(th), z: rad * Math.sin(th), h: hh});
		}
		for(i = 0; i < N; i++){
			var a = pts[(i - 1 + N) % N], b = pts[(i + 1) % N], p = pts[i];
			var tx = b.x - a.x, tz = b.z - a.z, tl = Math.sqrt(tx * tx + tz * tz);
			p.tx = tx / tl; p.tz = tz / tl; p.nx = p.tz; p.nz = -p.tx;
			p.yaw = Math.atan2(p.tx, p.tz);
			p.s = len;
			var n = pts[(i + 1) % N]; len += Math.sqrt((n.x - p.x) * (n.x - p.x) + (n.z - p.z) * (n.z - p.z));
		}
		return {pts: pts, length: len, rand: r};
	}

	function buildCollision(def, g){
		var ratio = CMAP / SIZE, W = def.width, pts = g.pts;
		var c = document.createElement('canvas'); c.width = c.height = CMAP;
		var x = c.getContext('2d');
		x.fillStyle = '#000'; x.fillRect(0, 0, CMAP, CMAP);
		x.strokeStyle = '#fff'; x.lineWidth = W * ratio; x.lineJoin = 'round'; x.beginPath();
		pts.forEach(function(p, i){ var px = CMAP / 2 + p.x * ratio, pz = CMAP / 2 + p.z * ratio; i ? x.lineTo(px, pz) : x.moveTo(px, pz); });
		x.closePath(); x.stroke();
		var img = x.getImageData(0, 0, CMAP, CMAP), d = img.data, i;
		for(i = 0; i < d.length; i += 4){ var v = d[i] >= 128 ? 255 : 0; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
		function paint(p, along0, along1, side0, side1, col){
			for(var a = along0; a <= along1; a += 1.4) for(var s = side0; s <= side1; s += 1.4){
				var wx = p.x + p.tx * a + p.nx * s, wz = p.z + p.tz * a + p.nz * s;
				var px = Math.round(CMAP / 2 + wx * ratio), pz = Math.round(CMAP / 2 + wz * ratio);
				if(px < 0 || pz < 0 || px >= CMAP || pz >= CMAP) continue;
				var o = (pz * CMAP + px) * 4;
				if(d[o] === 255){ d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; }
			}
		}
		var cps = [0, Math.floor(N / 3), Math.floor(2 * N / 3)];
		cps.forEach(function(idx, k){ paint(pts[idx], -60, 60, -W, W, [255, 255, k]); });
		var pads = [], r = g.rand;
		for(var b = 0; b < def.boosts; b++){
			var idx = Math.floor((b + 0.5 + (r() - 0.5) * 0.6) / def.boosts * N) % N, near = false;
			cps.forEach(function(c){ var dd = Math.abs(c - idx); if(Math.min(dd, N - dd) < 40) near = true; });
			if(near || idx < 60) continue;
			var off = (r() - 0.5) * W * 0.4, pw = W * 0.38;
			paint(pts[idx], -25, 25, off - pw / 2, off + pw / 2, [255, 0, 0]);
			pads.push({idx: idx, off: off, w: pw});
		}
		var an = Object.create(bkcore.ImageData.prototype);
		an.pixels = img; an.loaded = true;
		return {analyser: an, pads: pads, checkpoints: cps};
	}

	function buildHeight(def, g){
		var grid = new Float32Array(HMAP * HMAP), dist = new Float32Array(HMAP * HMAP), ratio = HMAP / SIZE, i;
		for(i = 0; i < grid.length; i++){ grid[i] = NaN; dist[i] = 1e9; }
		var rad = Math.ceil(def.width * 1.3 * ratio) + 1;
		g.pts.forEach(function(p){
			var cx = HMAP / 2 + p.x * ratio, cz = HMAP / 2 + p.z * ratio;
			for(var gz = Math.floor(cz - rad); gz <= cz + rad; gz++) for(var gx = Math.floor(cx - rad); gx <= cx + rad; gx++){
				if(gx < 0 || gz < 0 || gx >= HMAP || gz >= HMAP) continue;
				var dd = (gx + 0.5 - cx) * (gx + 0.5 - cx) + (gz + 0.5 - cz) * (gz + 0.5 - cz), o = gz * HMAP + gx;
				if(dd < dist[o] && dd <= rad * rad){ dist[o] = dd; grid[o] = p.h; }
			}
		});
		function at(x, z){ if(x < 0 || z < 0 || x >= HMAP || z >= HMAP) return NaN; return grid[z * HMAP + x]; }
		return {
			loaded: true, pixels: {width: HMAP, height: HMAP},
			getPixel: function(x, z){ var v = at(Math.floor(x), Math.floor(z)); return {r: isNaN(v) ? 255 : 0, g: 0, b: 0, a: 255}; },
			getPixelFBilinear: function(fx, fz){
				fx -= 0.5; fz -= 0.5;
				var x0 = Math.floor(fx), z0 = Math.floor(fz), ax = fx - x0, az = fz - z0;
				var a = at(x0, z0), b = at(x0 + 1, z0), c = at(x0, z0 + 1), e = at(x0 + 1, z0 + 1);
				if(isNaN(a) || isNaN(b) || isNaN(c) || isNaN(e)){
					var v = at(Math.round(fx), Math.round(fz));
					return isNaN(v) ? 1e9 : v;
				}
				return (a * (1 - ax) + b * ax) * (1 - az) + (c * (1 - ax) + e * ax) * az;
			}
		};
	}

	function ribbon(pts, edge, makeQuad){
		var geo = new THREE.Geometry();
		pts.forEach(function(p){ edge(p).forEach(function(v){ geo.vertices.push(v); }); });
		var per = geo.vertices.length / pts.length;
		for(var i = 0; i < pts.length; i++) makeQuad(geo, i * per, ((i + 1) % pts.length) * per, i);
		geo.computeFaceNormals();
		geo.computeCentroids && geo.computeCentroids();
		return geo;
	}

	function makeTrack(id, def){
		var T0;
		return {
			inGap: function(i){ var g = this.gaps || []; for(var k = 0; k < g.length; k++) if(i >= g[k].start && i < g[k].end) return true; return false; },
			name: id, label: def.label, generated: true, def: def,
			lib: null, materials: {},
			checkpoints: {list: [0, 1, 2], start: 0, last: 2},
			spawn: {x: 0, y: 0, z: 0}, spawnRotation: {x: 0, y: 0, z: 0},
			analyser: null, pixelRatio: CMAP / SIZE, length: 0, points: null,

			prepare: function(){
				if(this.points) return;
				var g = generate(def);
				this.points = g.pts; this.length = g.length;
				var col = buildCollision(def, g);
				this.analyser = col.analyser; this.pads = col.pads;
				var gaps = [], avoid = col.checkpoints.concat(col.pads.map(function(pd){ return pd.idx; }));
				for(var gi = 0; gi < (def.gaps || 0); gi++){
					var ramp = Math.floor((gi + 0.6) / def.gaps * N), st = ramp + 8, en = st + def.gapLen, bad = false;
					avoid.forEach(function(c){ for(var q = ramp - 20; q <= en + 20; q++) if(((q % N) + N) % N === c) bad = true; });
					if(ramp < 120 || en > N - 40) bad = true;
					if(bad){ ramp += 60; st = ramp + 8; en = st + def.gapLen; if(en > N - 40) continue; }
					gaps.push({ramp: ramp, start: st, end: en});
				}
				this.gaps = gaps;
				this.heightMap = buildHeight(def, g);
				var sp = g.pts[14];
				this.spawn = {x: sp.x, y: sp.h + 6, z: sp.z};
				var half = Math.max(-1.55, Math.min(1.55, sp.yaw / 2));
				this.spawnRotation = {x: 0, y: Math.tan(half), z: 0};
				this.rand = g.rand;
			},

			load: function(opts, quality){
				var C = bkcore.hexgl.tracks.Cityscape;
				this.prepare();
				C.load(opts, quality);
				this.lib = C.lib;
			},

			buildMaterials: function(quality){
				var C = bkcore.hexgl.tracks.Cityscape;
				C.buildMaterials(quality);
				this.materials = C.materials;
			},

			buildScenes: function(ctx, quality){
				var C = bkcore.hexgl.tracks.Cityscape, T = def.theme, W = def.width, pts = this.points, self = this, r = this.rand;
				C.buildScenes(ctx, quality);
				this.analyser = this.analyser;

				// Strip the Cityscape geometry, keep ship/camera/lights
				var scene = ctx.manager.get('game').scene, ship = ctx.components.shipControls.mesh;
				scene.children.slice().forEach(function(o){ if(o instanceof THREE.Mesh && o !== ship) scene.remove(o); });
				scene.fog = new THREE.FogExp2(T.fog, T.fogD);

				// Sky gradient
				var sky = ctx.manager.get('sky').scene;
				sky.children.slice().forEach(function(o){ if(o instanceof THREE.Mesh) sky.remove(o); });
				var sg = new THREE.SphereGeometry(100, 24, 16), top = new THREE.Color(T.skyTop), bot = new THREE.Color(T.skyBottom);
				function skyCol(v){ var t = Math.max(0, Math.min(1, v.y / 100 * 1.6 + 0.25)); var c = new THREE.Color(); c.r = bot.r + (top.r - bot.r) * t; c.g = bot.g + (top.g - bot.g) * t; c.b = bot.b + (top.b - bot.b) * t; return c; }
				sg.faces.forEach(function(f){ var ks = f instanceof THREE.Face4 ? ['a','b','c','d'] : ['a','b','c']; f.vertexColors = ks.map(function(k){ return skyCol(sg.vertices[f[k]]); }); });
				var skyMesh = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({vertexColors: THREE.VertexColors, depthWrite: false, fog: false}));
				skyMesh.flipSided = true; sky.add(skyMesh);

				// Ship physics maps
				var sc = ctx.components.shipControls;
				sc.collisionMap = this.analyser; sc.collisionPixelRatio = CMAP / SIZE;
				sc.heightMap = this.heightMap; sc.heightPixelRatio = HMAP / SIZE;
				sc.heightScale = 1.0; sc.heightBias = 4.0;
				sc.reset(new THREE.Vector3(this.spawn.x, this.spawn.y, this.spawn.z), new THREE.Vector3(0, this.spawnRotation.y, 0));

				// Track surface
				var trackTex = canvasTex(128, 256, function(x, w, h){
					x.fillStyle = T.track; x.fillRect(0, 0, w, h);
					x.strokeStyle = 'rgba(255,255,255,0.06)'; x.lineWidth = 1;
					for(var i = 0; i < h; i += 16){ x.beginPath(); x.moveTo(0, i); x.lineTo(w, i); x.stroke(); }
					for(var j = 0; j < w; j += 16){ x.beginPath(); x.moveTo(j, 0); x.lineTo(j, h); x.stroke(); }
					x.fillStyle = T.line; x.fillRect(0, 0, 6, h); x.fillRect(w - 6, 0, 6, h);
					x.globalAlpha = 0.7; x.fillRect(w / 2 - 2, 0, 4, h / 2);
				});
				var vLen = 0;
				var trackGeo = ribbon(pts, function(p){
					return [new THREE.Vector3(p.x - p.nx * W / 2, p.h, p.z - p.nz * W / 2), new THREE.Vector3(p.x + p.nx * W / 2, p.h, p.z + p.nz * W / 2)];
				}, function(geo, a, b, i){
					if(self.inGap(i)) return;
					geo.faces.push(new THREE.Face4(a, a + 1, b + 1, b));
					var v0 = pts[i].s / (W * 2), v1 = (i + 1 < N ? pts[i + 1].s : self.length) / (W * 2);
					geo.faceVertexUvs[0].push([new THREE.UV(0, v0), new THREE.UV(1, v0), new THREE.UV(1, v1), new THREE.UV(0, v1)]);
				});
				var trackMesh = new THREE.Mesh(trackGeo, new THREE.MeshBasicMaterial({map: trackTex}));
				trackMesh.doubleSided = true; scene.add(trackMesh);

				// Glowing walls and rails
				[-1, 1].forEach(function(side){
					var wallGeo = ribbon(pts, function(p){
						var ex = p.x + p.nx * side * W / 2, ez = p.z + p.nz * side * W / 2;
						return [new THREE.Vector3(ex, p.h - 1, ez), new THREE.Vector3(ex, p.h + 7, ez)];
					}, function(geo, a, b, i){ if(!self.inGap(i)) geo.faces.push(new THREE.Face4(a, a + 1, b + 1, b)); });
					var wall = new THREE.Mesh(wallGeo, new THREE.MeshBasicMaterial({color: T.accent, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false}));
					wall.doubleSided = true; scene.add(wall);
					var railGeo = ribbon(pts, function(p){
						var ex = p.x + p.nx * side * W / 2, ez = p.z + p.nz * side * W / 2;
						return [new THREE.Vector3(ex, p.h + 6.2, ez), new THREE.Vector3(ex, p.h + 7.4, ez)];
					}, function(geo, a, b, i){ if(!self.inGap(i)) geo.faces.push(new THREE.Face4(a, a + 1, b + 1, b)); });
					var rail = new THREE.Mesh(railGeo, new THREE.MeshBasicMaterial({color: side < 0 ? T.accent : T.accent2, fog: false}));
					rail.doubleSided = true; scene.add(rail);
				});

				// Ground
				var groundY = -60;
				var groundTex = canvasTex(256, 256, function(x, w, h){
					x.fillStyle = T.ground; x.fillRect(0, 0, w, h);
					x.strokeStyle = T.grid; x.globalAlpha = 0.45; x.lineWidth = 3; x.strokeRect(0, 0, w, h);
				}, [90, 90]);
				var ground = new THREE.Mesh(new THREE.PlaneGeometry(24000, 24000, 1, 1), new THREE.MeshBasicMaterial({map: groundTex}));
				ground.position.y = groundY; ground.doubleSided = true;
				if(def.style !== 'space') scene.add(ground);
				else {
					var starTex = canvasTex(1024, 512, function(x, w, h){
						x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
						for(var si = 0; si < 1400; si++){ var b = Math.random(); x.fillStyle = 'rgba(' + (180 + Math.floor(b * 75)) + ',' + (200 + Math.floor(b * 55)) + ',255,' + (0.3 + b * 0.7) + ')'; x.fillRect(Math.random() * w, Math.random() * h, b > 0.92 ? 2 : 1, b > 0.92 ? 2 : 1); }
						var gr = x.createRadialGradient(w * 0.7, h * 0.35, 0, w * 0.7, h * 0.35, 160); gr.addColorStop(0, 'rgba(120,60,255,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
					});
					var stars = new THREE.Mesh(new THREE.SphereGeometry(90, 24, 16), new THREE.MeshBasicMaterial({map: starTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false}));
					stars.flipSided = true; sky.add(stars);
				}

				// Shared geometry: pillars, arches, pads, scenery
				var solid = new THREE.Geometry(), glow = new THREE.Geometry(), padGeo = new THREE.Geometry();
				function addBox(target, w, h, d, x, y, z, yaw){
					var m = new THREE.Mesh(new THREE.CubeGeometry(w, h, d));
					m.position.set(x, y, z); m.rotation.y = yaw || 0; m.updateMatrix();
					THREE.GeometryUtils.merge(target, m);
				}
				for(var i = 0; i < N; i += 36){
					var p = pts[i];
					if(p.h > 8 && def.style !== 'space' && !self.inGap(i)) [-1, 1].forEach(function(s){ addBox(solid, 10, p.h - groundY, 10, p.x + p.nx * s * W * 0.35, (p.h + groundY) / 2 - 1, p.z + p.nz * s * W * 0.35, p.yaw); });
				}
				var arches = [0, Math.floor(N / 3), Math.floor(2 * N / 3)];
				for(var k = 1; k < 8; k++) arches.push(Math.floor(k * N / 8));
				arches.forEach(function(idx, k){
					var p = pts[idx], hgt = idx === 0 ? 46 : 34;
					[-1, 1].forEach(function(s){ addBox(glow, 6, hgt + 4, 6, p.x + p.nx * s * (W / 2 + 6), p.h + hgt / 2 - 2, p.z + p.nz * s * (W / 2 + 6), p.yaw); });
					addBox(glow, W + 22, idx === 0 ? 8 : 4, 6, p.x, p.h + hgt, p.z, p.yaw);
				});
				this.pads.forEach(function(pd){
					var p = pts[pd.idx];
					addBox(padGeo, pd.w, 0.6, 50, p.x + p.nx * pd.off, p.h + 0.4, p.z + p.nz * pd.off, p.yaw);
				});

				if(def.style === 'core') for(var ri = 0; ri < N; ri += 30){
					if(self.inGap(ri)) continue;
					var rp = pts[ri], rr = W / 2 + 8;
					for(var sgi = 0; sgi < 6; sgi++){
						var ang = sgi / 6 * Math.PI * 2, cx = Math.cos(ang) * rr, cy = Math.sin(ang) * rr + rr * 0.55, th = ang + Math.PI / 2, ct = Math.cos(th), st2 = Math.sin(th);
						var sg2 = new THREE.CubeGeometry(rr * 1.08, 2.5, 3);
						sg2.vertices.forEach(function(v){
							var lx = v.x * ct - v.y * st2 + cx, ly = v.x * st2 + v.y * ct + cy, lz = v.z;
							v.set(rp.x + rp.nx * lx + rp.tx * lz, rp.h + ly, rp.z + rp.nz * lx + rp.tz * lz);
						});
						THREE.GeometryUtils.merge(glow, sg2);
					}
				}
				var rampGeo = new THREE.Geometry(), edgeGeo = new THREE.Geometry();
				(self.gaps || []).forEach(function(gp){
					for(var ci = gp.ramp - 6; ci <= gp.start; ci += 2){ var cp = pts[ci]; addBox(rampGeo, W * 0.9, 0.5, 3, cp.x, cp.h + 0.5 + (ci - gp.ramp + 6) * 0.25, cp.z, cp.yaw); }
					[gp.start, gp.end].forEach(function(ei){ var ep = pts[ei % N]; addBox(edgeGeo, W + 6, 1.5, 3, ep.x, ep.h, ep.z, ep.yaw); });
				});
				scene.add(new THREE.Mesh(rampGeo, new THREE.MeshBasicMaterial({color: 0xffe14d, fog: false})));
				scene.add(new THREE.Mesh(edgeGeo, new THREE.MeshBasicMaterial({color: 0xff2244, fog: false})));

				// Scenery
				var count = def.style === 'mesa' ? 90 : def.style === 'space' ? 240 : 170, placed = 0;
				for(var tries = 0; tries < 4000 && placed < count; tries++){
					var base = pts[Math.floor(r() * N)], side = r() < 0.5 ? -1 : 1, off = W / 2 + 90 + r() * 1300;
					var bx = base.x + base.nx * side * off, bz = base.z + base.nz * side * off;
					var w, h, d;
					if(def.style === 'city'){ w = 60 + r() * 120; d = 60 + r() * 120; h = 150 + r() * 650; }
					else if(def.style === 'mesa'){ w = 160 + r() * 380; d = 160 + r() * 380; h = 40 + r() * 220; }
					else if(def.style === 'crystal'){ w = 30 + r() * 70; d = w; h = 120 + r() * 520; }
					else { w = 40 + r() * 80; d = w; h = 200 + r() * 700; }
					if(def.style === 'space'){ w = d = h = 40 + r() * 160; }
					var clear = true, need = W / 2 + Math.max(w, d) * 0.75 + 40;
					for(var j = 0; j < N && clear; j += 6){ var q = pts[j]; if((q.x - bx) * (q.x - bx) + (q.z - bz) * (q.z - bz) < need * need) clear = false; }
					if(!clear || Math.abs(bx) > 5500 || Math.abs(bz) > 5500) continue;
					if(def.style === 'space'){ var rock = new THREE.Mesh(new THREE.IcosahedronGeometry(w / 2, 1)); rock.position.set(bx, -200 + r() * 700, bz); rock.rotation.set(r() * 3, r() * 3, 0); rock.scale.set(1, 0.6 + r() * 0.6, 0.8 + r() * 0.4); rock.updateMatrix(); THREE.GeometryUtils.merge(solid, rock); }
					else addBox(solid, w, h, d, bx, groundY + h / 2, bz, r() * 3.14);
					placed++;
				}
				var solidMesh = new THREE.Mesh(solid, new THREE.MeshBasicMaterial({color: T.build}));
				scene.add(solidMesh);
				var wire = new THREE.Mesh(solid, new THREE.MeshBasicMaterial({color: T.accent, wireframe: true, transparent: true, opacity: 0.35}));
				scene.add(wire);
				scene.add(new THREE.Mesh(glow, new THREE.MeshBasicMaterial({color: T.accent2, fog: false})));
				scene.add(new THREE.Mesh(padGeo, new THREE.MeshBasicMaterial({color: 0x0096ff, fog: false})));
			}
		};
	}

	Object.keys(MAPS).forEach(function(id){ bkcore.hexgl.tracks[id] = makeTrack(id, MAPS[id]); });
	bkcore.hexgl.trackList = [{id: 'Cityscape', label: 'Cityscape'}].concat(Object.keys(MAPS).map(function(id){ return {id: id, label: MAPS[id].label}; }));
})();
