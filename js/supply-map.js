/* =========================================================
   RECON CORE: supply network map
   Dot-matrix world, sourcing hubs, and ships running real
   lane geometry (Malacca, Suez, Gibraltar, great-circle Pacific).
   ========================================================= */
(function (global) {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var W = 1000, H = 500;
  var LAT_TOP = 84, LAT_BOT = -58;   // cropped so the frame stays full

  function el(n, a) {
    var e = document.createElementNS(NS, n);
    for (var k in a) if (a.hasOwnProperty(k)) e.setAttribute(k, a[k]);
    return e;
  }
  function px(lon) { return (lon + 180) / 360 * W; }
  function py(lat) { return (LAT_TOP - lat) / (LAT_TOP - LAT_BOT) * H; }
  function P(lat, lon) { return { x: px(lon), y: py(lat) }; }

  /* ---- land mask: [rowIndex, [colStart,colEnd], ...] on a 5° grid ---- */
  var LAND = [
    [1, [16, 31]],
    [2, [14, 32], [55, 58]],
    [3, [12, 32], [36, 70]],
    [4, [4, 32], [33, 70]],
    [5, [3, 30], [34, 71]],
    [6, [3, 10], [12, 30], [34, 71]],
    [7, [14, 30], [34, 71]],
    [8, [13, 30], [34, 68], [70, 70]],
    [9, [13, 29], [34, 70]],
    [10, [14, 29], [34, 68], [70, 71]],
    [11, [15, 29], [33, 68], [69, 70]],
    [12, [17, 28], [33, 67]],
    [13, [18, 28], [33, 66]],
    [14, [19, 28], [33, 48], [51, 64]],
    [15, [20, 30], [32, 48], [51, 64]],
    [16, [20, 24], [33, 48], [52, 52], [58, 65]],
    [17, [20, 27], [36, 45], [55, 61], [63, 66]],
    [18, [20, 28], [36, 45], [55, 61], [63, 66]],
    [19, [21, 29], [35, 45], [56, 60], [63, 66]],
    [20, [21, 30], [34, 45], [60, 64]],
    [21, [22, 31], [33, 44], [45, 46], [58, 66]],
    [22, [23, 31], [33, 42], [45, 46], [58, 67]],
    [23, [24, 31], [34, 41], [58, 67]],
    [24, [25, 31], [34, 39], [59, 66]],
    [25, [25, 30], [59, 64], [69, 70]],
    [26, [26, 29], [64, 65], [69, 71]],
    [27, [26, 28], [70, 71]],
    [28, [27, 29]]
  ];

  /* ---- sourcing hubs ---- */
  var HUBS = [
    { n: 'SHENZHEN',  lat: 22.5, lon: 114.0, big: 1, tier: 1, cat: 'Semiconductors, passives', src: 412, lead: '14d' },
    { n: 'SHANGHAI',  lat: 31.2, lon: 121.5, big: 1, tier: 1, cat: 'Electromechanical, PCBA', src: 318, lead: '16d' },
    { n: 'SEOUL',     lat: 37.5, lon: 127.0, side: 'l', tier: 1, cat: 'Memory, display drivers', src: 96, lead: '15d' },
    { n: 'TOKYO',     lat: 35.7, lon: 139.7, tier: 1, cat: 'Passives, precision parts', src: 121, lead: '17d' },
    { n: 'PENANG',    lat: 5.4,  lon: 100.3, side: 'l', tier: 2, cat: 'Assembly, test', src: 74, lead: '12d' },
    { n: 'SINGAPORE', lat: 1.3,  lon: 103.8, big: 1, tier: 1, cat: 'Distribution, bonded stock', src: 143, lead: '9d' },
    { n: 'CHENNAI',   lat: 13.1, lon: 80.3, tier: 2, cat: 'Harnesses, machined parts', src: 168, lead: '8d' },
    { n: 'MUMBAI',    lat: 19.1, lon: 72.9, tier: 2, cat: 'Industrial, castings', src: 154, lead: '7d' },
    { n: 'DUBAI',     lat: 25.2, lon: 55.3, tier: 3, cat: 'Transit, re-export', src: 38, lead: '5d' },
    { n: 'ROTTERDAM', lat: 51.9, lon: 4.5, big: 1, tier: 1, cat: 'EU entry, compliance', src: 87, lead: '4d' },
    { n: 'DETROIT',   lat: 42.3, lon: -83.0, tier: 2, cat: 'Automotive, drivetrain', src: 112, lead: '6d' },
    { n: 'LOS ANGELES', lat: 33.9, lon: -118.2, big: 1, tier: 1, cat: 'US entry, distribution', src: 129, lead: '5d' },
    { n: 'GUADALAJARA', lat: 20.7, lon: -103.3, tier: 2, cat: 'EMS, near-shore build', src: 91, lead: '6d' }
  ];

  /* ---- lanes: waypoints keep ships in water where it matters ---- */
  var LANES = [
    { id: 'A', from: 'SHENZHEN', to: 'ROTTERDAM', days: 28, ship: 1, hot: 1, mode: 'Sea',
      w: [[22.5,114],[8,108],[3,103],[7,95],[9,80],[11,64],[12.5,50],[13,45],[20,38],[28,33.5],[31.5,32.4],[35,18],[36,2],[36,-6],[43,-10],[49,-6],[51.9,4.5]] },
    { id: 'B', mode: 'Sea', from: 'SHANGHAI', to: 'LOS ANGELES', days: 17, ship: 1, hot: 1,
      w: [[31.2,121.5],[35,145],[41,170],[44,-175],[42,-150],[38,-132],[33.9,-118.2]] },
    { id: 'C', mode: 'Sea', from: 'MUMBAI', to: 'ROTTERDAM', days: 22, ship: 1,
      w: [[19.1,72.9],[14,60],[12.8,50],[16,42],[24,36],[30,33],[31.5,32.4],[35,16],[36,-6],[45,-9],[51.9,4.5]] },
    { id: 'D', mode: 'Sea', from: 'SHENZHEN', to: 'CHENNAI', days: 11, ship: 1,
      w: [[22.5,114],[12,110],[2,105],[1.3,103.8],[6,95],[9,86],[13.1,80.3]] },
    { id: 'E', mode: 'Sea', from: 'SEOUL', to: 'LOS ANGELES', days: 15, ship: 1,
      w: [[37.5,127],[38,148],[44,175],[45,-160],[40,-138],[33.9,-118.2]] },
    { id: 'F', mode: 'Sea', from: 'ROTTERDAM', to: 'DETROIT', days: 13, ship: 1,
      w: [[51.9,4.5],[50,-8],[48,-25],[45,-45],[43,-62],[42.5,-72],[42.3,-83]] },
    { id: 'G', mode: 'Road', from: 'GUADALAJARA', to: 'DETROIT', days: 6,
      w: [[20.7,-103.3],[26,-101],[33,-96],[38,-90],[42.3,-83]] },
    { id: 'H', mode: 'Sea', from: 'PENANG', to: 'DUBAI', days: 12,
      w: [[5.4,100.3],[6,92],[8,78],[11,66],[19,60],[25.2,55.3]] },
    { id: 'I', mode: 'Air', from: 'TOKYO', to: 'SINGAPORE', days: 9,
      w: [[35.7,139.7],[27,132],[18,120],[8,110],[1.3,103.8]] }
  ];

  /* Unwrap longitudes so a Pacific crossing keeps heading east instead of
     snapping back across the whole map. x may leave [0,W]; the wrapped
     copies of the lane put it back on screen. */
  function unwrap(w) {
    var out = [], prev = w[0][1];
    for (var i = 0; i < w.length; i++) {
      var lon = w[i][1];
      while (lon - prev > 180) lon -= 360;
      while (lon - prev < -180) lon += 360;
      prev = lon;
      out.push({ x: px(lon), y: py(w[i][0]) });
    }
    return out;
  }

  /* ---- Catmull-Rom through the waypoints -> smooth cubic path ---- */
  function spline(pts) {
    if (pts.length < 2) return '';
    var d = 'M' + pts[0].x.toFixed(1) + ' ' + pts[0].y.toFixed(1);
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i];
      var p1 = pts[i], p2 = pts[i + 1];
      var p3 = pts[i + 2] || p2;
      var c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
      var c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
      d += ' C' + c1x.toFixed(1) + ' ' + c1y.toFixed(1) + ',' +
                  c2x.toFixed(1) + ' ' + c2y.toFixed(1) + ',' +
                  p2.x.toFixed(1) + ' ' + p2.y.toFixed(1);
    }
    return d;
  }

  function SupplyMap(svg, ticker, opts) {
    this.svg = svg;
    this.ticker = ticker;
    this.o = opts || {};
    this.ships = [];
    this.layers = {};
    this.built = false;
  }

  /* Show or hide a whole layer: levels (tier rings), sourcing (hubs),
     routes (lanes and the ships on them). */
  SupplyMap.prototype.setLayer = function (name, on) {
    var g = this.layers[name];
    if (!g) return;
    g.forEach(function (n) { n.style.display = on ? '' : 'none'; });
  };

  SupplyMap.prototype.build = function () {
    if (this.built) return;
    this.built = true;
    var svg = this.svg;

    var gLand = el('g', { class: 'map__land' });
    var gLevels = el('g', { class: 'map__levels' });
    var gRoutes = el('g', { class: 'map__routes' });
    var gShips = el('g', { class: 'map__ships' });
    var gHubs = el('g', { class: 'map__hubs' });
    svg.appendChild(gLand); svg.appendChild(gLevels); svg.appendChild(gRoutes);
    svg.appendChild(gShips); svg.appendChild(gHubs);
    this.layers = { levels: [gLevels], sourcing: [gHubs], routes: [gRoutes, gShips] };

    // --- land dots
    var cellW = W / 72, cellH = (H / (LAT_TOP - LAT_BOT)) * 5;
    LAND.forEach(function (row) {
      var r = row[0];
      var lat = 87.5 - r * 5;
      var y = py(lat);
      if (y < -cellH || y > H + cellH) return;
      for (var s = 1; s < row.length; s++) {
        for (var c = row[s][0]; c <= row[s][1]; c++) {
          var x = (c + 0.5) * cellW;
          var dot = el('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: 2, class: 'mdot' });
          dot.style.opacity = 0;
          dot.style.animation = 'landIn .6s cubic-bezier(.16,1,.3,1) forwards';
          dot.style.animationDelay = (0.15 + (x / W) * 0.9 + Math.random() * 0.2).toFixed(2) + 's';
          gLand.appendChild(dot);
        }
      }
    });

    // --- lanes
    var self = this;
    LANES.forEach(function (lane, i) {
      var pts = unwrap(lane.w);
      var d = spline(pts);
      var gid = 'lane-' + lane.id;
      var g = el('g', { id: gid });

      var base = el('path', { d: d, class: 'mroute' + (lane.hot ? ' mroute--hot' : '') });
      var len = base.getTotalLength ? base.getTotalLength() : 800;
      base.style.strokeDasharray = '4 6';
      base.style.opacity = 0;
      base.style.transition = 'opacity .8s ease ' + (0.5 + i * 0.12) + 's';
      g.appendChild(base);

      var flow = null;
      if (lane.ship) {
        // glowing comet segment that trails the ship
        flow = el('path', { d: d, class: 'mflow' });
        flow.style.strokeDasharray = '54 ' + Math.max(len - 54, 10);
        flow.style.opacity = 0.75;
        g.appendChild(flow);
      }
      gRoutes.appendChild(g);

      // wrapped copies, so a lane leaving one edge arrives at the other
      var minX = Math.min.apply(null, pts.map(function (p) { return p.x; }));
      var maxX = Math.max.apply(null, pts.map(function (p) { return p.x; }));
      if (maxX > W) gRoutes.appendChild(el('use', { href: '#' + gid, x: -W }));
      if (minX < 0) gRoutes.appendChild(el('use', { href: '#' + gid, x: W }));

      requestAnimationFrame(function () { base.style.opacity = 1; });
      if (!lane.ship) return;

      var hull = el('g', { class: 'mship-g' });
      hull.appendChild(el('circle', { r: 7, class: 'mship-glow' }));
      hull.appendChild(el('path', {
        d: 'M-6 -2.6 L4.4 -2.6 L7.4 0 L4.4 2.6 L-6 2.6 Z',
        class: 'mship'
      }));
      hull.appendChild(el('rect', { x: -2.4, y: -5.4, width: 4.4, height: 3, class: 'mship' }));
      gShips.appendChild(hull);

      self.ships.push({
        lane: lane, path: base, flow: flow, g: hull, len: len,
        t: Math.random(), v: 1 / (lane.days * 900 + 8000)
      });
    });

    // --- levels: a tier ring sized by how close the source sits to us
    HUBS.forEach(function (h, i) {
      var p = P(h.lat, h.lon);
      var r = h.tier === 1 ? 15 : h.tier === 2 ? 11 : 8;
      var ring = el('circle', {
        cx: p.x, cy: p.y, r: r, class: 'mlevel mlevel--t' + h.tier
      });
      ring.style.opacity = 0;
      ring.style.animation = 'landIn .7s cubic-bezier(.16,1,.3,1) forwards';
      ring.style.animationDelay = (1 + i * 0.05).toFixed(2) + 's';
      gLevels.appendChild(ring);
    });

    // --- hubs
    HUBS.forEach(function (h, i) {
      var p = P(h.lat, h.lon);
      var g = el('g', { class: 'mhub mhub--t' + h.tier, tabindex: 0, role: 'button' });
      g.style.opacity = 0;
      g.style.animation = 'landIn .7s cubic-bezier(.16,1,.3,1) forwards';
      g.style.animationDelay = (0.9 + i * 0.07).toFixed(2) + 's';

      var ring = el('circle', { cx: p.x, cy: p.y, r: 4, class: 'ring' });
      ring.style.animation = 'hubRing 3.4s ease-out infinite';
      ring.style.animationDelay = (i * 0.28).toFixed(2) + 's';
      ring.style.transformOrigin = p.x + 'px ' + p.y + 'px';
      g.appendChild(ring);
      g.appendChild(el('circle', { cx: p.x, cy: p.y, r: h.big ? 3.4 : 2.4 }));

      var anchorRight = h.side === 'l' || p.x > W - 120;
      var t = el('text', {
        x: anchorRight ? p.x - 9 : p.x + 9,
        y: p.y + 3.4
      });
      if (anchorRight) t.setAttribute('text-anchor', 'end');
      t.textContent = h.n;
      g.appendChild(t);

      if (self.o.panel) {
        var show = function () {
          Array.prototype.forEach.call(gHubs.children, function (x) { x.classList.remove('is-sel'); });
          g.classList.add('is-sel');
          var lanes = LANES.filter(function (l) { return l.from === h.n || l.to === h.n; });
          self.o.panel.classList.add('is-on');
          self.o.panel.innerHTML =
            '<h4>' + h.n + '</h4>' +
            '<div class="kv"><span>Level</span><b>Tier ' + h.tier + '</b></div>' +
            '<div class="kv"><span>Qualified sources</span><b>' + h.src + '</b></div>' +
            '<div class="kv"><span>Typical lead</span><b>' + h.lead + '</b></div>' +
            '<div class="kv"><span>Active lanes</span><b>' + lanes.length + '</b></div>' +
            '<p class="hubpanel__cat">' + h.cat + '</p>';
        };
        g.addEventListener('click', show);
        g.addEventListener('keydown', function (e) { if (e.key === 'Enter') show(); });
      }
      gHubs.appendChild(g);
    });

    this.startTicker();
    this.fillTable();
  };

  SupplyMap.prototype.run = function () {
    this.build();
    if (global.RECON_REDUCED) { this.frame(0, true); return; }
    var self = this, last = performance.now();
    (function loop(t) {
      requestAnimationFrame(loop);
      var dt = Math.min(t - last, 60); last = t;
      self.frame(dt, false);
    })(last);
  };

  SupplyMap.prototype.frame = function (dt, still) {
    this.ships.forEach(function (s) {
      if (!still) {
        s.t += s.v * dt;
        if (s.t > 1) s.t -= 1;
      }
      var at = s.len * s.t;
      var p = s.path.getPointAtLength(at);
      var q = s.path.getPointAtLength(Math.min(at + 4, s.len));
      var ang = Math.atan2(q.y - p.y, q.x - p.x) * 180 / Math.PI;
      var x = ((p.x % W) + W) % W;   // follow the lane across the antimeridian
      s.g.setAttribute('transform', 'translate(' + x.toFixed(2) + ',' + p.y.toFixed(2) + ') rotate(' + ang.toFixed(1) + ')');
      // trail the comet just behind the hull
      s.flow.style.strokeDashoffset = (s.len - at + 54);
    });
  };

  SupplyMap.prototype.fillTable = function () {
    var tb = this.o.table;
    if (!tb) return;
    var states = [['On schedule', 'ok'], ['In transit', 'ok'], ['Customs cleared', 'ok'],
                  ['Loading', 'warn'], ['ETA confirmed', 'ok']];
    tb.innerHTML = LANES.map(function (l, i) {
      var s = states[i % states.length];
      return '<tr>' +
        '<td class="mono" data-label="LANE">RC-LANE-' + l.id + '</td>' +
        '<td data-label="ORIGIN">' + l.from + '</td>' +
        '<td data-label="DESTINATION">' + l.to + '</td>' +
        '<td class="mono" data-label="MODE">' + (l.mode || 'Sea') + '</td>' +
        '<td class="mono" data-label="TRANSIT">' + l.days + 'd</td>' +
        '<td data-label="STATUS"><em class="chip chip--' + s[1] + '">' + s[0] + '</em></td></tr>';
    }).join('');
  };

  SupplyMap.prototype.startTicker = function () {
    if (!this.ticker) return;
    var rows = LANES.map(function (l) {
      var states = ['on schedule', 'in transit', 'cleared customs', 'loading', 'ETA confirmed'];
      return {
        a: l.from, b: l.to, d: l.days,
        s: states[Math.floor(Math.random() * states.length)]
      };
    });
    var i = 0, box = this.ticker;
    var self = this;
    function push() {
      var r = rows[i % rows.length]; i++;
      var row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = '<span><b>' + r.a + '</b> &rarr; ' + r.b + '</span><span>' + r.d + 'd &middot; ' + r.s + '</span>';
      box.appendChild(row);
      while (box.children.length > 4) box.removeChild(box.firstChild);
    }
    push(); push(); push(); push();
    if (!global.RECON_REDUCED) setInterval(push, 2600);
  };

  global.SupplyMap = SupplyMap;

})(window);
