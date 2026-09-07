/* =========================================================
   RECON CORE: RECON ATLAS field
   A layered decision graph rendered as an instrument:
   depth of field, drifting atmosphere, a scanning sweep,
   live telemetry on the nodes, film grain over the lot.
   Used by: hero background, ATLAS orb, contact background.
   ========================================================= */
(function (global) {
  'use strict';

  // ?still=1 renders every animation at its final frame: used for visual QA
  // and shares the code path with prefers-reduced-motion.
  var STILL = /[?&]still/.test(global.location.search);
  var REDUCED = STILL || (global.matchMedia &&
    global.matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (STILL) document.documentElement.classList.add('is-still');

  function rand(a, b) { return a + Math.random() * (b - a); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* Radial-glow sprite: built once, blitted thousands of times.
     Far cheaper than creating a gradient per node per frame. */
  function makeGlow(rgb) {
    var s = 128, c = document.createElement('canvas');
    c.width = c.height = s;
    var x = c.getContext('2d');
    var g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(' + rgb + ',1)');
    g.addColorStop(0.45, 'rgba(' + rgb + ',0.28)');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    x.fillStyle = g;
    x.fillRect(0, 0, s, s);
    return c;
  }

  /* Monochrome film grain, tiled and jittered each frame. */
  function makeGrain(light) {
    var s = 96, c = document.createElement('canvas');
    c.width = c.height = s;
    var x = c.getContext('2d');
    var img = x.createImageData(s, s), d = img.data;
    for (var i = 0; i < d.length; i += 4) {
      var v = Math.random();
      d[i] = d[i + 1] = d[i + 2] = light ? 20 : 235;
      d[i + 3] = v * v * (light ? 9 : 16);
    }
    x.putImageData(img, 0, 0);
    return c;
  }

  var TELEMETRY = [
    'SPEC MATCH', 'QUAL 94', 'LEAD 14d', 'TIER 1', 'COST -7.4%',
    'FIT 98', 'AEC-Q100', 'LOT TRACED', 'IN STOCK', 'MOQ OK',
    'AUDITED', 'RoHS ✓', 'ETA Q3', 'FIT 91', 'LEAD 22d'
  ];

  /* ---------------------------------------------------------
     ReconNet
     --------------------------------------------------------- */
  function ReconNet(canvas, opts) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.o = Object.assign({
      layers: [7, 11, 11, 7, 3],
      dark: false,
      padXL: 0.06,
      padXR: 0.06,
      fan: 3,
      padY: 0.14,
      nodeR: 2.6,
      fadeLeft: 0,
      spawnEvery: 260,
      eliminate: false,
      onStep: null,
      telemetry: true,      // HUD readouts pinned to nodes
      speed: 1
    }, opts || {});

    this.nodes = [];
    this.edges = [];
    this.pulses = [];
    this.ripples = [];
    this.motes = [];
    this.tags = [];
    this.stage = -1;
    this.lastSpawn = 0;
    this.scan = 0;
    this.raf = null;
    this.running = false;
    this.mx = 0; this.my = 0;

    this.palette = this.o.dark
      ? { edge: '150,175,205', live: '126,175,255', core: '#a9caff',
          win: '#5fd6ac', pulse: '215,232,255', ink: '231,236,242',
          wash: '94,150,255', vignette: '0,0,0' }
      : { edge: '58,84,124', live: '31,95,216', core: '#1f5fd8',
          win: '#137a5a', pulse: '31,95,216', ink: '16,21,27',
          wash: '31,95,216', vignette: '16,21,27' };

    this.glow = {
      live: makeGlow(this.palette.live),
      win: makeGlow('19,122,90'),
      pulse: makeGlow(this.palette.pulse)
    };
    this.grain = makeGrain(!this.o.dark);

    this.keep = [1, 0.62, 0.4, 0.26, 0.14, 0.06];
    this.counts = [127, 42, 18, 9, 3, 1];
    this.labels = [
      'Scanning viable sources',
      'Specification gate applied',
      'Quality history screened',
      'Landed cost modelled',
      'Lead-time risk resolved',
      'DECISION MADE'
    ];

    this.build();
    this.bind();
  }

  ReconNet.prototype.build = function () {
    var o = this.o;
    this.nodes = [];
    this.edges = [];

    var L = o.layers.length;
    for (var i = 0; i < L; i++) {
      var n = o.layers[i];
      for (var j = 0; j < n; j++) {
        var span = 1 - o.padY * 2;
        var stagger = (i % 2) * 0.5 * span / Math.max(n - 1, 1);
        this.nodes.push({
          layer: i,
          idx: j,
          kind: i === 0 ? 'sq' : (i === L - 1 ? 'hex' : 'dot'),
          fx: L === 1 ? 0.5 : o.padXL + (1 - o.padXL - o.padXR) * (i / (L - 1)),
          fy: n === 1 ? 0.5 : o.padY + span * (j / (n - 1)) + stagger,
          jx: rand(-0.016, 0.016),
          jy: rand(-0.022, 0.022),
          depth: rand(0.42, 1),      // back-to-front: size, focus, parallax
          phase: rand(0, Math.PI * 2),
          drift: rand(0.6, 1.5),
          x: 0, y: 0, rx: 0, ry: 0,
          alive: 1, target: 1,
          flash: 0, sweep: 0
        });
      }
    }

    // Branch, don't mesh: each node fans out to its nearest few neighbours,
    // so the graph reads as a decision tree rather than a wire ball.
    var self = this;
    for (var k = 0; k < L - 1; k++) {
      var from = this.nodes.filter(function (nd) { return nd.layer === k; });
      var to = this.nodes.filter(function (nd) { return nd.layer === k + 1; });
      from.forEach(function (a) {
        var near = to.slice().sort(function (p, q) {
          return Math.abs(p.fy - a.fy) - Math.abs(q.fy - a.fy);
        }).slice(0, o.fan);
        if (Math.random() < 0.22) {
          var far = to[Math.floor(Math.random() * to.length)];
          if (near.indexOf(far) === -1) near.push(far);
        }
        near.forEach(function (b) {
          var run = b.fy - a.fy;
          self.edges.push({
            a: a, b: b,
            rank: Math.random(),
            alive: 1, target: 1,
            bow: run * 0.22 + rand(-0.03, 0.03),
            heat: 0, sweep: 0
          });
        });
      });
    }

    // atmosphere: out-of-focus motes drifting behind the graph
    this.motes = [];
    for (var m = 0; m < 22; m++) {
      this.motes.push({
        fx: Math.random(), fy: Math.random(),
        r: rand(9, 34), a: rand(0.02, 0.055),
        vy: rand(-0.006, -0.02), vx: rand(-0.004, 0.006),
        ph: rand(0, 6.28)
      });
    }

    this.pickWinPath();
    this.seedTags();
  };

  /* Telemetry tags ride real nodes and cycle every few seconds, so the
     field reads as an instrument reporting on candidates. */
  ReconNet.prototype.seedTags = function () {
    if (!this.o.telemetry) { this.tags = []; return; }
    this.tags = [];
    for (var i = 0; i < 3; i++) {
      this.tags.push({ n: null, text: '', t: rand(0, 3), up: i % 2 === 0 });
    }
  };

  ReconNet.prototype.retagOne = function (tag) {
    var pool = this.nodes.filter(function (n) {
      return n.layer > 0 && n.target > 0.5 && n.depth > 0.72;
    });
    if (!pool.length) return;
    var taken = this.tags.map(function (t) { return t.n; });
    for (var i = 0; i < 12; i++) {
      var n = pool[Math.floor(Math.random() * pool.length)];
      if (taken.indexOf(n) === -1) { tag.n = n; break; }
    }
    tag.text = TELEMETRY[Math.floor(Math.random() * TELEMETRY.length)];
    tag.t = 0;
  };

  ReconNet.prototype.pickWinPath = function () {
    var L = this.o.layers.length;
    var pool = this.nodes.filter(function (n) { return n.layer === 0; });
    var cur = pool[Math.floor(Math.random() * pool.length)];
    this.winPath = [cur];
    this.winEdges = [];
    for (var i = 0; i < L - 1; i++) {
      var out = this.edges.filter(function (e) { return e.a === cur; });
      if (!out.length) break;
      var e = out[Math.floor(Math.random() * out.length)];
      e.rank = 0;
      this.winEdges.push(e);
      cur = e.b;
      this.winPath.push(cur);
    }
  };

  ReconNet.prototype.bind = function () {
    var self = this;
    this.onResize = function () { self.resize(); };
    global.addEventListener('resize', this.onResize, { passive: true });
    if (!REDUCED) {
      this.onMove = function (e) {
        var r = self.c.getBoundingClientRect();
        self.mx = ((e.clientX - r.left) / r.width - 0.5) * 2;
        self.my = ((e.clientY - r.top) / r.height - 0.5) * 2;
      };
      global.addEventListener('pointermove', this.onMove, { passive: true });
    }
    this.resize();
  };

  /* Static backdrop: a wash behind the graph plus a corner vignette.
     Painted once per resize, blitted per frame. */
  ReconNet.prototype.paintBackdrop = function () {
    var w = this.w, h = this.h, P = this.palette;
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var x = c.getContext('2d');

    var cx = w * (this.o.padXL + (1 - this.o.padXL - this.o.padXR) / 2);
    var wash = x.createRadialGradient(cx, h / 2, 0, cx, h / 2, Math.max(w, h) * 0.5);
    wash.addColorStop(0, 'rgba(' + P.wash + ',' + (this.o.dark ? 0.09 : 0.032) + ')');
    wash.addColorStop(0.6, 'rgba(' + P.wash + ',' + (this.o.dark ? 0.03 : 0.012) + ')');
    wash.addColorStop(1, 'rgba(' + P.wash + ',0)');
    x.fillStyle = wash;
    x.fillRect(0, 0, w, h);

    // a vignette on paper would draw a box around the canvas: dark only
    if (this.o.dark) {
      var vig = x.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.4,
                                       w / 2, h / 2, Math.max(w, h) * 0.8);
      vig.addColorStop(0, 'rgba(' + P.vignette + ',0)');
      vig.addColorStop(1, 'rgba(' + P.vignette + ',0.26)');
      x.fillStyle = vig;
      x.fillRect(0, 0, w, h);
    }

    this.bg = c;
  };

  ReconNet.prototype.resize = function () {
    var r = this.c.getBoundingClientRect();
    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    this.w = Math.max(r.width, 1);
    this.h = Math.max(r.height, 1);
    this.c.width = this.w * dpr;
    this.c.height = this.h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var self = this;
    this.nodes.forEach(function (n) {
      n.x = (n.fx + n.jx) * self.w;
      n.y = (n.fy + n.jy) * self.h;
      n.rx = n.x; n.ry = n.y;
    });
    this.paintBackdrop();
    this.grainPattern = this.ctx.createPattern(this.grain, 'repeat');
    if (!this.running) { this.place(0); this.draw(0); }
  };

  ReconNet.prototype.start = function () {
    if (this.running) return;
    this.running = true;
    if (REDUCED) {
      this.applyStage(2, true);
      this.tags.forEach(function (t) { t.t = 1.4; });
      this.tags.forEach(this.retagOne, this);
      this.scan = 0.42;
      this.place(0); this.draw(0);
      return;
    }
    var self = this, t0 = performance.now();
    this.stageTime = t0;
    (function loop(t) {
      self.raf = requestAnimationFrame(loop);
      self.update(t);
      self.draw(t);
    })(t0);
  };

  ReconNet.prototype.stop = function () {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    this.running = false;
  };

  ReconNet.prototype.applyStage = function (stage, instant) {
    var keep = this.keep[stage];
    var winSet = this.winEdges;
    this.edges.forEach(function (e) {
      var live = e.rank < keep || winSet.indexOf(e) > -1;
      e.target = live ? 1 : 0;
      if (instant) e.alive = e.target;
    });
    var liveNodes = new Set();
    this.edges.forEach(function (e) {
      if (e.target > 0.5) { liveNodes.add(e.a); liveNodes.add(e.b); }
    });
    this.nodes.forEach(function (n) {
      n.target = liveNodes.has(n) ? 1 : 0.1;
      if (instant) n.alive = n.target;
    });
    this.stage = stage;
    if (this.o.onStep) {
      this.o.onStep(stage, this.counts[stage], this.labels[stage],
                    stage / (this.keep.length - 1));
    }
  };

  ReconNet.prototype.place = function (t) {
    var px = this.mx * 18, py = this.my * 11;
    this.nodes.forEach(function (n) {
      var d = n.drift;
      n.rx = n.x + Math.sin(t / 3400 * d + n.phase) * 5 + px * n.depth;
      n.ry = n.y + Math.cos(t / 3900 * d + n.phase * 1.7) * 6 + py * n.depth;
    });
  };

  ReconNet.prototype.update = function (t) {
    var o = this.o, self = this;

    if (o.eliminate) {
      var hold = this.stage >= this.keep.length - 1 ? 3400 : 1700;
      if (this.stage < 0) { this.applyStage(0); this.stageTime = t; }
      else if (t - this.stageTime > hold) {
        var next = this.stage + 1;
        if (next >= this.keep.length) {
          this.edges.forEach(function (e) { e.rank = Math.random(); });
          this.pickWinPath();
          next = 0;
        }
        this.applyStage(next);
        this.stageTime = t;
      }
    }

    this.place(t);

    // scanning sweep travels left to right and wakes what it crosses
    var prev = this.scan;
    this.scan = (t % 9000) / 9000;
    if (this.scan < prev) this.scan = 0;
    var sx = this.scan * this.w;

    this.edges.forEach(function (e) {
      e.alive = lerp(e.alive, e.target, 0.055);
      e.heat *= 0.94;
      e.sweep *= 0.93;
    });
    this.nodes.forEach(function (n) {
      n.alive = lerp(n.alive, n.target, 0.055);
      n.flash *= 0.93;
      n.sweep *= 0.92;
      if (Math.abs(n.rx - sx) < 26 && n.alive > 0.5) n.sweep = 1;
    });

    // atmosphere drift
    this.motes.forEach(function (m) {
      m.fx += m.vx / 100; m.fy += m.vy / 100;
      if (m.fy < -0.1) { m.fy = 1.1; m.fx = Math.random(); }
      if (m.fx < -0.1) m.fx = 1.1;
      if (m.fx > 1.1) m.fx = -0.1;
    });

    if (t - this.lastSpawn > o.spawnEvery) {
      this.lastSpawn = t;
      var live = this.edges.filter(function (e) { return e.target > 0.5 && e.a.layer === 0; });
      if (live.length) {
        var seed = live[Math.floor(Math.random() * live.length)];
        this.pulses.push({ e: seed, t: 0, v: rand(0.005, 0.009) * o.speed });
        seed.a.flash = 1;
      }
    }

    var next2 = [];
    this.pulses.forEach(function (p) {
      p.e.heat = Math.max(p.e.heat, 1);
      p.t += p.v;
      if (p.t < 1) { next2.push(p); return; }
      p.e.b.flash = 1;
      self.ripples.push({ n: p.e.b, t: 0 });
      var onward = self.edges.filter(function (e) {
        return e.a === p.e.b && e.target > 0.5;
      });
      if (onward.length && next2.length < 70) {
        var pick = onward[Math.floor(Math.random() * onward.length)];
        next2.push({ e: pick, t: 0, v: p.v });
      }
    });
    this.pulses = next2;

    this.ripples = this.ripples.filter(function (r) {
      r.t += 0.028;
      return r.t < 1;
    });

    // telemetry: fade in, hold, fade out, move to another candidate
    this.tags.forEach(function (tag) {
      tag.t += 0.006;
      if (!tag.n || tag.t > 1) self.retagOne(tag);
      if (tag.n && tag.n.target < 0.5) self.retagOne(tag);
    });
  };

  ReconNet.prototype.edgePoint = function (e, t) {
    var mx = (e.a.rx + e.b.rx) / 2;
    var my = (e.a.ry + e.b.ry) / 2 + e.bow * (e.b.rx - e.a.rx);
    var it = 1 - t;
    return {
      x: it * it * e.a.rx + 2 * it * t * mx + t * t * e.b.rx,
      y: it * it * e.a.ry + 2 * it * t * my + t * t * e.b.ry
    };
  };

  ReconNet.prototype.blit = function (sprite, x, y, r, alpha) {
    if (alpha <= 0.004) return;
    var ctx = this.ctx;
    ctx.globalAlpha = Math.min(alpha, 1);
    ctx.drawImage(sprite, x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = 1;
  };

  ReconNet.prototype.nodePath = function (n, r) {
    var ctx = this.ctx;
    ctx.beginPath();
    if (n.kind === 'sq') {
      ctx.rect(n.rx - r, n.ry - r, r * 2, r * 2);
    } else if (n.kind === 'hex') {
      for (var i = 0; i < 6; i++) {
        var a = i * Math.PI / 3 + Math.PI / 6;
        var px = n.rx + Math.cos(a) * r * 1.25;
        var py = n.ry + Math.sin(a) * r * 1.25;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath();
    } else {
      ctx.arc(n.rx, n.ry, r, 0, 6.2832);
    }
  };

  ReconNet.prototype.draw = function (t) {
    var ctx = this.ctx, P = this.palette, self = this;
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.lineCap = 'round';

    // ---- backdrop wash + vignette
    if (this.bg) ctx.drawImage(this.bg, 0, 0);

    // ---- atmosphere: defocused motes behind everything
    this.motes.forEach(function (m) {
      var x = m.fx * self.w + self.mx * 8;
      var y = m.fy * self.h + self.my * 6;
      self.blit(self.glow.live, x, y, m.r, m.a);
    });

    // ---- the sweep itself, a soft luminous band
    var sx = this.scan * this.w;
    var band = ctx.createLinearGradient(sx - 90, 0, sx + 40, 0);
    band.addColorStop(0, 'rgba(' + P.wash + ',0)');
    band.addColorStop(0.72, 'rgba(' + P.wash + ',' + (this.o.dark ? 0.07 : 0.03) + ')');
    band.addColorStop(1, 'rgba(' + P.wash + ',0)');
    ctx.fillStyle = band;
    ctx.fillRect(sx - 90, 0, 130, this.h);

    // ---- edges, back to front, trimmed clear of the node cores
    var ordered = this.edges.slice().sort(function (p, q) {
      return (p.a.depth + p.b.depth) - (q.a.depth + q.b.depth);
    });
    ordered.forEach(function (e) {
      var a = e.alive;
      if (a < 0.03) return;
      var depth = (e.a.depth + e.b.depth) / 2;
      var s = self.edgePoint(e, 0.07);
      var m = self.edgePoint(e, 0.5);
      var f = self.edgePoint(e, 0.93);
      var cx = 2 * m.x - (s.x + f.x) / 2;
      var cy = 2 * m.y - (s.y + f.y) / 2;

      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.quadraticCurveTo(cx, cy, f.x, f.y);

      // far links sit softer and thinner: depth of field
      var base = 0.03 + 0.15 * depth * depth;
      ctx.strokeStyle = 'rgba(' + P.edge + ',' + (base * a).toFixed(3) + ')';
      ctx.lineWidth = 0.5 + 0.55 * depth;
      ctx.stroke();

      var wake = Math.max(e.heat, (e.a.sweep + e.b.sweep) / 2 * 0.5);
      var glow = a * (0.07 + wake * 0.42) * depth;
      if (glow > 0.02) {
        ctx.strokeStyle = 'rgba(' + P.live + ',' + glow.toFixed(3) + ')';
        ctx.lineWidth = (0.8 + wake * 0.8) * depth;
        ctx.stroke();
      }
    });

    // ---- travelling signals
    ctx.globalCompositeOperation = this.o.dark ? 'lighter' : 'source-over';
    this.pulses.forEach(function (p) {
      var head = self.edgePoint(p.e, p.t);
      var tail = self.edgePoint(p.e, Math.max(0, p.t - 0.3));
      var mid = self.edgePoint(p.e, Math.max(0, p.t - 0.15));
      var g = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y);
      g.addColorStop(0, 'rgba(' + P.pulse + ',0)');
      g.addColorStop(0.7, 'rgba(' + P.pulse + ',0.3)');
      g.addColorStop(1, 'rgba(' + P.pulse + ',0.85)');
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(tail.x, tail.y);
      ctx.quadraticCurveTo(mid.x, mid.y, head.x, head.y);
      ctx.stroke();
      self.blit(self.glow.pulse, head.x, head.y, 9, 0.5);
    });
    ctx.globalCompositeOperation = 'source-over';

    // ---- arrival ripples
    this.ripples.forEach(function (r) {
      var e = 1 - Math.pow(1 - r.t, 2);
      ctx.beginPath();
      ctx.arc(r.n.rx, r.n.ry, 3 + e * 16, 0, 6.2832);
      ctx.strokeStyle = 'rgba(' + P.live + ',' + (0.3 * (1 - r.t)).toFixed(3) + ')';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // ---- nodes, back to front
    var nodesByDepth = this.nodes.slice().sort(function (p, q) { return p.depth - q.depth; });
    var last = this.o.layers.length - 1;
    nodesByDepth.forEach(function (n) {
      var a = n.alive;
      if (a < 0.04) return;
      var lit = a > 0.55;
      var isWin = self.o.eliminate && self.stage === self.keep.length - 1 &&
                  self.winPath.indexOf(n) > -1;
      var breathe = 1 + Math.sin(t / 1400 + n.phase) * 0.1;
      var excite = n.flash * 0.5 + n.sweep * 0.35;
      var r = self.o.nodeR * n.depth * breathe * (1 + excite);

      if (lit) {
        self.blit(isWin ? self.glow.win : self.glow.live, n.rx, n.ry,
                  r * (5.5 + excite * 5), (0.13 + excite * 0.4) * n.depth);
      }

      self.nodePath(n, r);
      ctx.fillStyle = isWin ? P.win
        : lit ? P.core
              : 'rgba(' + P.edge + ',' + (0.32 * n.depth).toFixed(2) + ')';
      // depth of field: distant nodes lose contrast
      ctx.globalAlpha = Math.min(a, 1) * (0.45 + 0.55 * n.depth);
      ctx.fill();

      // a crisp rim only on the nodes nearest the viewer
      if (lit && n.depth > 0.8) {
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = 'rgba(' + (isWin ? '19,122,90' : P.live) + ',0.75)';
        ctx.lineWidth = 0.8;
        self.nodePath(n, r + 3.2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      if (n.layer === last && lit) {
        ctx.beginPath();
        ctx.arc(n.rx, n.ry, r + 6, 0, 6.2832);
        ctx.strokeStyle = 'rgba(' + (isWin ? '19,122,90' : P.live) + ',0.35)';
        ctx.lineWidth = 0.9;
        ctx.stroke();
      }
    });

    // ---- telemetry tags
    ctx.font = '500 9.5px "JetBrains Mono", ui-monospace, monospace';
    ctx.textBaseline = 'middle';
    this.tags.forEach(function (tag) {
      if (!tag.n) return;
      var fade = Math.min(tag.t * 4, 1) * Math.min((1 - tag.t) * 4, 1);
      if (fade <= 0.02) return;
      var n = tag.n;
      var dy = tag.up ? -22 : 22;
      var x1 = n.rx + 13, y1 = n.ry + dy;
      var wText = ctx.measureText(tag.text).width;

      ctx.globalAlpha = fade * 0.55;
      ctx.strokeStyle = 'rgba(' + P.live + ',0.9)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(n.rx + 4, n.ry + (tag.up ? -4 : 4));
      ctx.lineTo(x1 - 4, y1);
      ctx.lineTo(x1 + wText + 8, y1);
      ctx.stroke();

      ctx.globalAlpha = fade;
      ctx.fillStyle = 'rgba(' + P.ink + ',' + (self.o.dark ? 0.85 : 0.7) + ')';
      ctx.fillText(tag.text, x1, y1 - 6);
      ctx.globalAlpha = 1;
    });

    // ---- film grain over the whole field
    if (this.grainPattern && this.w > 700) {   // skip the full-canvas fill on phones
      ctx.save();
      var jx = (Math.random() * 96) | 0, jy = (Math.random() * 96) | 0;
      ctx.translate(-jx, -jy);
      ctx.fillStyle = this.grainPattern;
      ctx.fillRect(0, 0, this.w + 96, this.h + 96);
      ctx.restore();
    }

    // ---- fade the left edge so headline copy stays readable
    if (this.o.fadeLeft > 0) {
      var grad = ctx.createLinearGradient(0, 0, this.w * this.o.fadeLeft, 0);
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(0.55, 'rgba(0,0,0,.72)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, this.w * this.o.fadeLeft, this.h);
      ctx.globalCompositeOperation = 'source-over';
    }
  };

  /* ---------------------------------------------------------
     ReconOrb: the compact RECON ATLAS cluster
     --------------------------------------------------------- */
  function ReconOrb(canvas) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.pts = [];
    var N = 11;
    for (var i = 0; i < N; i++) {
      var ang = (i / N) * Math.PI * 2;
      this.pts.push({ a: ang, r: i % 2 ? 0.9 : 0.62, ph: rand(0, 6.28) });
    }
    this.pts.push({ a: 0, r: 0, ph: 0 });
    this.glow = makeGlow('31,95,216');
    var self = this;
    this.onResize = function () { self.resize(); };
    global.addEventListener('resize', this.onResize, { passive: true });
    this.resize();
  }

  ReconOrb.prototype.resize = function () {
    var r = this.c.getBoundingClientRect();
    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    this.w = Math.max(r.width, 1);
    this.h = Math.max(r.height, 1);
    this.c.width = this.w * dpr;
    this.c.height = this.h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  ReconOrb.prototype.start = function () {
    var self = this;
    if (REDUCED) { this.frame(0); return; }
    (function loop(t) { self.raf = requestAnimationFrame(loop); self.frame(t); })(0);
  };

  ReconOrb.prototype.frame = function (t) {
    var ctx = this.ctx, cx = this.w / 2, cy = this.h / 2;
    var R = Math.min(this.w, this.h) * 0.40;
    ctx.clearRect(0, 0, this.w, this.h);
    var spin = t / 9000;
    var P = this.pts.map(function (p) {
      var a = p.a + spin;
      var wob = 1 + Math.sin(t / 1100 + p.ph) * 0.06;
      return { x: cx + Math.cos(a) * R * p.r * wob, y: cy + Math.sin(a) * R * p.r * wob * 0.86 };
    });

    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(16,21,27,.15)';
    ctx.lineWidth = 0.8;
    for (var i = 0; i < P.length; i++) {
      for (var j = i + 1; j < P.length; j++) {
        var dx = P[i].x - P[j].x, dy = P[i].y - P[j].y;
        if (dx * dx + dy * dy < R * R * 1.5) {
          ctx.beginPath(); ctx.moveTo(P[i].x, P[i].y); ctx.lineTo(P[j].x, P[j].y); ctx.stroke();
        }
      }
    }

    var hot = Math.floor(t / 520) % P.length;
    var hot2 = (hot + 4) % P.length;
    ctx.strokeStyle = 'rgba(31,95,216,.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(P[hot].x, P[hot].y); ctx.lineTo(P[hot2].x, P[hot2].y); ctx.stroke();

    var self = this;
    P.forEach(function (p, k) {
      var live = (k === hot || k === hot2);
      if (live) {
        ctx.globalAlpha = 0.5;
        ctx.drawImage(self.glow, p.x - 15, p.y - 15, 30, 30);
        ctx.globalAlpha = 1;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, live ? 3.4 : 2.2, 0, 6.2832);
      ctx.fillStyle = live ? '#1f5fd8' : 'rgba(16,21,27,.34)';
      ctx.fill();
    });
  };

  global.ReconNet = ReconNet;
  global.ReconOrb = ReconOrb;
  global.RECON_REDUCED = REDUCED;

})(window);
