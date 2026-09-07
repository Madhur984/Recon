/* =========================================================
   RECON CORE: the decision tree
   Branches out from 127 sources, prunes down to one, then
   runs signals along the surviving path.
   ========================================================= */
(function (global) {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  function el(name, attrs) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) if (attrs.hasOwnProperty(k)) n.setAttribute(k, attrs[k]);
    return n;
  }

  /* ---- layout ------------------------------------------------------- */
  var NODES = [
    { id: 'root', x: 500, y: 38,  w: 250, h: 44, label: '127 POSSIBLE SOURCES', cls: 'tnode--root' },

    { id: 'c0', x: 135, y: 138, w: 158, h: 34, label: 'SPECIFICATION', cls: 'tnode--crit' },
    { id: 'c1', x: 378, y: 138, w: 158, h: 34, label: 'QUALITY',       cls: 'tnode--crit' },
    { id: 'c2', x: 622, y: 138, w: 158, h: 34, label: 'COST',          cls: 'tnode--crit' },
    { id: 'c3', x: 865, y: 138, w: 158, h: 34, label: 'LEAD TIME',     cls: 'tnode--crit' },

    { id: 'f0', x: 68,  y: 232, w: 116, h: 30, label: 'Exact match' },
    { id: 'f1', x: 202, y: 232, w: 116, h: 30, label: 'Equivalent' },
    { id: 'f2', x: 311, y: 232, w: 116, h: 30, label: 'Audited' },
    { id: 'f3', x: 445, y: 232, w: 116, h: 30, label: 'Unverified' },
    { id: 'f4', x: 555, y: 232, w: 116, h: 30, label: 'Landed' },
    { id: 'f5', x: 689, y: 232, w: 116, h: 30, label: 'Ex-works' },
    { id: 'f6', x: 798, y: 232, w: 116, h: 30, label: 'In stock' },
    { id: 'f7', x: 932, y: 232, w: 116, h: 30, label: 'Build-to-order' },

    { id: 'n0', x: 135, y: 330, w: 96, h: 40, label: '127', count: 127, cls: 'tnode--num' },
    { id: 'n1', x: 378, y: 330, w: 96, h: 40, label: '87',  count: 87,  cls: 'tnode--num' },
    { id: 'n2', x: 622, y: 330, w: 96, h: 40, label: '42',  count: 42,  cls: 'tnode--num' },
    { id: 'n3', x: 865, y: 330, w: 96, h: 40, label: '26',  count: 26,  cls: 'tnode--num' },

    { id: 's0', x: 250, y: 432, w: 150, h: 40, label: 'SUPPLIER A' },
    { id: 's1', x: 500, y: 432, w: 150, h: 40, label: 'SUPPLIER B' },
    { id: 's2', x: 750, y: 432, w: 150, h: 40, label: 'SUPPLIER D' },

    { id: 'win', x: 500, y: 540, w: 330, h: 50, label: 'RECOMMENDED  ·  SUPPLIER A', cls: 'tnode--win' }
  ];

  var LINKS = [
    ['root', 'c0', 1], ['root', 'c1', 1], ['root', 'c2', 1], ['root', 'c3', 1],

    ['c0', 'f0', 1], ['c0', 'f1', 0],
    ['c1', 'f2', 1], ['c1', 'f3', 0],
    ['c2', 'f4', 1], ['c2', 'f5', 0],
    ['c3', 'f6', 1], ['c3', 'f7', 0],

    ['f0', 'n0', 1], ['f1', 'n0', 0],
    ['f2', 'n1', 1], ['f3', 'n1', 0],
    ['f4', 'n2', 1], ['f5', 'n2', 0],
    ['f6', 'n3', 1], ['f7', 'n3', 0],

    ['n0', 's0', 1], ['n0', 's1', 0],
    ['n1', 's0', 1], ['n1', 's1', 0],
    ['n2', 's1', 0], ['n2', 's2', 0],
    ['n3', 's0', 1], ['n3', 's2', 0],

    ['s0', 'win', 1], ['s1', 'win', 0], ['s2', 'win', 0]
  ];

  function byId(id) {
    for (var i = 0; i < NODES.length; i++) if (NODES[i].id === id) return NODES[i];
    return null;
  }

  function linkPath(a, b) {
    var x1 = a.x, y1 = a.y + a.h / 2;
    var x2 = b.x, y2 = b.y - b.h / 2;
    var dy = (y2 - y1) * 0.55;
    return 'M' + x1 + ' ' + y1 + ' C' + x1 + ' ' + (y1 + dy) + ' ' + x2 + ' ' + (y2 - dy) + ' ' + x2 + ' ' + y2;
  }

  function DecisionTree(svg) {
    this.svg = svg;
    this.paths = [];
    this.livePaths = [];
    this.nodeEls = {};
    this.played = false;
    this.build();
  }

  DecisionTree.prototype.build = function () {
    var svg = this.svg, self = this;

    var gLinks = el('g', { class: 'tree__links' });
    var gLive = el('g', { class: 'tree__live' });
    var gNodes = el('g', { class: 'tree__nodes' });
    svg.appendChild(gLinks); svg.appendChild(gLive); svg.appendChild(gNodes);
    this.gPulse = el('g', { class: 'tree__pulse' });
    svg.appendChild(this.gPulse);

    LINKS.forEach(function (L) {
      var a = byId(L[0]), b = byId(L[1]);
      var d = linkPath(a, b);

      var ghost = el('path', { d: d, class: 'tlink' });
      ghost.style.opacity = 0;
      ghost.style.transition = 'opacity .55s cubic-bezier(.16,1,.3,1), stroke .6s';
      gLinks.appendChild(ghost);
      self.paths.push({ el: ghost, live: L[2], depth: a.y });

      if (L[2]) {
        var live = el('path', { d: d, class: 'tlink tlink--live' });
        var len = live.getTotalLength ? live.getTotalLength() : 200;
        live.style.strokeDasharray = len;
        live.style.strokeDashoffset = len;
        live.style.transition = 'stroke-dashoffset .8s cubic-bezier(.16,1,.3,1)';
        gLive.appendChild(live);
        self.livePaths.push({ el: live, len: len, depth: a.y });
      }
    });

    NODES.forEach(function (n) {
      var g = el('g', { class: 'tnode ' + (n.cls || '') });
      g.style.opacity = 0;
      g.style.transform = 'translateY(10px)';
      g.style.transformOrigin = n.x + 'px ' + n.y + 'px';
      g.style.transition = 'opacity .5s cubic-bezier(.16,1,.3,1), transform .5s cubic-bezier(.16,1,.3,1)';

      g.appendChild(el('rect', {
        x: n.x - n.w / 2, y: n.y - n.h / 2, width: n.w, height: n.h, rx: 7
      }));

      var txt = el('text', { x: n.x, y: n.y + (n.count ? 6 : 4) });
      if (n.count) txt.setAttribute('class', 'tcount');
      txt.textContent = n.label;
      g.appendChild(txt);

      gNodes.appendChild(g);
      self.nodeEls[n.id] = { g: g, txt: txt, data: n };
    });
  };

  DecisionTree.prototype.play = function () {
    if (this.played) return;
    this.played = true;
    var self = this;
    var reduced = global.RECON_REDUCED;

    // 1: branch out: nodes and dotted links appear top-down
    var order = NODES.slice().sort(function (a, b) { return a.y - b.y; });
    order.forEach(function (n, i) {
      var d = reduced ? 0 : i * 55;
      setTimeout(function () {
        var e = self.nodeEls[n.id];
        e.g.style.opacity = 1;
        e.g.style.transform = 'translateY(0)';
        if (n.count) self.countUp(e.txt, n.count);
      }, d);
    });
    this.paths.forEach(function (p) {
      setTimeout(function () { p.el.style.opacity = 1; },
        reduced ? 0 : 180 + p.depth * 1.5);
    });

    // 2: prune: everything off the surviving path recedes
    setTimeout(function () {
      self.paths.forEach(function (p) {
        if (!p.live) { p.el.classList.add('tlink--dead'); p.el.style.opacity = 0.4; }
      });
      var keep = {};
      LINKS.forEach(function (L) { if (L[2]) { keep[L[0]] = 1; keep[L[1]] = 1; } });
      NODES.forEach(function (n) {
        if (!keep[n.id]) {
          self.nodeEls[n.id].g.classList.add('tnode--dead');
          self.nodeEls[n.id].g.style.opacity = 0.3;   // inline, to beat the reveal opacity
        }
      });
      self.livePaths.forEach(function (p, i) {
        setTimeout(function () { p.el.style.strokeDashoffset = 0; },
          reduced ? 0 : i * 45);
      });
      NODES.forEach(function (n) {
        if (keep[n.id] && !n.cls) self.nodeEls[n.id].g.classList.add('tnode--live');
      });
    }, reduced ? 0 : 1500);

    // 3: run signals down the surviving path, forever
    if (!reduced) setTimeout(function () { self.runPulses(); }, 2600);
  };

  DecisionTree.prototype.countUp = function (txt, to) {
    if (global.RECON_REDUCED) { txt.textContent = to; return; }
    var t0 = performance.now(), dur = 900;
    (function step(t) {
      var k = Math.min((t - t0) / dur, 1);
      txt.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  };

  DecisionTree.prototype.runPulses = function () {
    var self = this;
    var live = this.livePaths;
    var dots = [];

    function spawn() {
      var p = live[Math.floor(Math.random() * live.length)];
      var c = el('circle', { r: 2.6, class: 'tpulse' });
      self.gPulse.appendChild(c);
      dots.push({ c: c, p: p.el, len: p.len, t: 0, v: 0.02 + Math.random() * 0.012 });
      if (dots.length > 26) { var old = dots.shift(); old.c.remove(); }
    }

    setInterval(spawn, 260);

    (function loop() {
      requestAnimationFrame(loop);
      for (var i = dots.length - 1; i >= 0; i--) {
        var d = dots[i];
        d.t += d.v;
        if (d.t >= 1) { d.c.remove(); dots.splice(i, 1); continue; }
        var pt = d.p.getPointAtLength(d.len * d.t);
        d.c.setAttribute('cx', pt.x);
        d.c.setAttribute('cy', pt.y);
        d.c.setAttribute('opacity', Math.sin(d.t * Math.PI));
      }
    })();
  };

  global.DecisionTree = DecisionTree;

})(window);
