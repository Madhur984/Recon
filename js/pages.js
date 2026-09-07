/* =========================================================
   RECON CORE: per-page behaviour
   Each page boots only what it needs, off body[data-page].
   ========================================================= */
(function (global) {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var REDUCED = global.RECON_REDUCED;
  var PAGE = document.body.getAttribute('data-page');
  var wide = window.innerWidth > 1080;

  /* =======================================================
     01: HOME
     ======================================================= */
  function home() {
    var nums = $$('#elimTrack .elim__n');
    var status = $('#elimStatus'), bar = $('#elimBar');

    new ReconNet($('#heroNet'), {
      layers: [7, 11, 11, 8, 3],
      padXL: wide ? 0.44 : 0.05, padXR: wide ? 0.03 : 0.05,
      padY: wide ? 0.14 : 0.2, fan: 3,
      fadeLeft: wide ? 0.5 : 0,
      eliminate: true, spawnEvery: 230,
      onStep: function (stage, value, label, progress) {
        nums.forEach(function (n, i) {
          n.classList.toggle('is-on', i === stage);
          n.classList.toggle('is-done', i < stage);
        });
        status.textContent = label;
        bar.style.width = (progress * 100) + '%';
      }
    }).start();

    // --- intake: three ways to state a requirement
    $$('#intake .intake__tab').forEach(function (t) {
      t.addEventListener('click', function () {
        var mode = t.getAttribute('data-mode');
        $$('#intake .intake__tab').forEach(function (x) { x.classList.toggle('is-on', x === t); });
        $$('#intake .intake__pane').forEach(function (p) {
          p.classList.toggle('is-on', p.getAttribute('data-pane') === mode);
        });
      });
    });

    ['bomFile', 'cadFile'].forEach(function (id) {
      var input = $('#' + id);
      if (!input) return;
      input.addEventListener('change', function () {
        var label = input.previousElementSibling;
        if (input.files && input.files[0]) {
          label.classList.add('is-set');
          label.querySelector('b').textContent = input.files[0].name;
          label.querySelector('span').textContent = 'Ready for RECON ATLAS';
        }
      });
    });

    $('#intakeForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var mode = $('#intake .intake__tab.is-on').getAttribute('data-mode');
      var spec = ($('#intakeSpec').value || '').trim();
      var file = mode === 'bom' ? $('#bomFile').files[0] : mode === 'cad' ? $('#cadFile').files[0] : null;
      var what = mode === 'spec' ? spec : (file ? file.name : '');
      var out = $('#intakeOut');

      if (!what) {
        out.className = 'intake__out is-on is-warn';
        out.innerHTML = mode === 'spec'
          ? 'Add a part number, a category or a short description first.'
          : 'Choose a file, or switch to <b>Specify requirement</b> and type it instead.';
        return;
      }
      out.className = 'intake__out is-on';
      out.innerHTML = 'Queued <b>' + esc(what) + '</b> for RECON ATLAS. ' +
        '<a href="contact.html">Add your contact details</a> and we will return the decision within 72 hours.';
    });

    // --- the four-stage flow marches on a loop
    var stages = $$('#flowline .stage');
    if (stages.length && !REDUCED) {
      var i = 0;
      global.onReveal('#flowline', function () {
        setInterval(function () {
          stages.forEach(function (s, k) { s.classList.toggle('is-on', k === i); });
          i = (i + 1) % stages.length;
        }, 2000);
      });
    }
  }

  /* =======================================================
     02: HOW WE DECIDE
     ======================================================= */
  var SERIES = {
    spec:    { color: '#1f5fd8', name: 'Specification', pts: [22, 48, 41, 66, 58, 79, 72, 88] },
    quality: { color: '#137a5a', name: 'Quality',       pts: [35, 30, 52, 47, 68, 61, 80, 76] },
    cost:    { color: '#a06b12', name: 'Cost',          pts: [70, 62, 66, 51, 55, 44, 48, 39] },
    lead:    { color: '#7a8590', name: 'Lead time',     pts: [18, 34, 29, 45, 40, 57, 63, 69] }
  };
  var PRESETS = {
    standard: { spec: 34, quality: 26, cost: 22, lead: 18 },
    ev:       { spec: 28, quality: 20, cost: 18, lead: 34 },
    rail:     { spec: 30, quality: 38, cost: 12, lead: 20 },
    defence:  { spec: 44, quality: 34, cost: 8,  lead: 14 },
    consumer: { spec: 22, quality: 18, cost: 36, lead: 24 }
  };
  var NSVG = 'http://www.w3.org/2000/svg';
  var CW = 480, CH = 220, PAD = 22;

  function svgEl(n, a) {
    var e = document.createElementNS(NSVG, n);
    for (var k in a) if (a.hasOwnProperty(k)) e.setAttribute(k, a[k]);
    return e;
  }
  function toPath(pts) {
    var step = (CW - PAD * 2) / (pts.length - 1);
    var xy = pts.map(function (v, i) {
      return { x: PAD + i * step, y: CH - PAD - (v / 100) * (CH - PAD * 2) };
    });
    var d = '';
    xy.forEach(function (p, i) {
      if (!i) { d = 'M' + p.x + ' ' + p.y; return; }
      var prev = xy[i - 1], cx = (prev.x + p.x) / 2;
      d += ' C' + cx + ' ' + prev.y + ',' + cx + ' ' + p.y + ',' + p.x + ' ' + p.y;
    });
    return { d: d, xy: xy };
  }
  function drawIn(path, dur, delay) {
    if (REDUCED || !path.getTotalLength) return;
    var L = path.getTotalLength();
    path.style.strokeDasharray = L;
    path.style.strokeDashoffset = L;
    path.style.transition = 'stroke-dashoffset ' + dur + 's cubic-bezier(.16,1,.3,1) ' + delay + 's';
    requestAnimationFrame(function () { path.style.strokeDashoffset = 0; });
  }

  function decide() {
    var CHART = $('#thinkChart'), LEGEND = $('#thinkLegend');

    function active() {
      return $$('#factors .factor.is-on').map(function (b) {
        return { key: b.getAttribute('data-factor'), w: +b.getAttribute('data-weight') };
      });
    }

    function draw() {
      var act = active();
      CHART.innerHTML = '';
      LEGEND.innerHTML = '';

      for (var g = 0; g <= 4; g++) {
        var y = PAD + g * ((CH - PAD * 2) / 4);
        CHART.appendChild(svgEl('line', {
          x1: PAD, x2: CW - PAD, y1: y, y2: y,
          stroke: 'rgba(16,21,27,.08)', 'stroke-width': 1,
          'stroke-dasharray': g === 4 ? '' : '2 5'
        }));
      }

      act.forEach(function (a, i) {
        var s = SERIES[a.key];
        var p = svgEl('path', { d: toPath(s.pts).d, fill: 'none', stroke: s.color, 'stroke-width': 1.4, opacity: .42 });
        CHART.appendChild(p);
        drawIn(p, .8, i * .06);
        var tag = document.createElement('span');
        tag.innerHTML = '<i style="background:' + s.color + '"></i>' + s.name + ' &middot; ' + a.w;
        LEGEND.appendChild(tag);
      });

      if (act.length) {
        var total = act.reduce(function (s, a) { return s + a.w; }, 0);
        var comp = SERIES.spec.pts.map(function (_, i) {
          return act.reduce(function (s, a) { return s + SERIES[a.key].pts[i] * a.w; }, 0) / total;
        });
        var cp = toPath(comp);
        var line = svgEl('path', { d: cp.d, fill: 'none', stroke: '#10151b', 'stroke-width': 2.4, 'stroke-linecap': 'round' });
        CHART.appendChild(line);
        drawIn(line, 1, .12);
        cp.xy.forEach(function (p, i) {
          var last = i === cp.xy.length - 1;
          CHART.appendChild(svgEl('circle', {
            cx: p.x, cy: p.y, r: last ? 4.5 : 2.6, fill: last ? '#137a5a' : '#10151b'
          }));
        });
        var t2 = document.createElement('span');
        t2.innerHTML = '<i style="background:#10151b;height:3px"></i>Weighted decision score';
        LEGEND.appendChild(t2);
      } else {
        var msg = svgEl('text', { x: CW / 2, y: CH / 2, 'text-anchor': 'middle', fill: '#7a8590', 'font-size': 12 });
        msg.textContent = 'No factors active. No decision possible';
        CHART.appendChild(msg);
      }

      var REM = [127, 42, 18, 9, 3], CONF = ['--', '41%', '62%', '84%', '96%'];
      var n = act.length;
      $('#thinkRemaining').textContent = REM[n];
      $('#thinkConf').textContent = CONF[n];
      var v = $('#thinkVerdict');
      v.textContent = n === 4 ? 'RESOLVED' : n >= 2 ? 'NARROWING' : n === 1 ? 'TOO BROAD' : 'BLOCKED';
      v.style.color = n === 4 ? 'var(--green)' : n >= 2 ? 'var(--accent)' : 'var(--amber)';
      $('#factorCount').textContent = n + (n === 1 ? ' factor active' : ' factors active');
    }

    $$('#factors .factor').forEach(function (b) {
      b.addEventListener('click', function () {
        b.classList.toggle('is-on');
        $$('#presets .preset').forEach(function (p) { p.classList.remove('is-on'); });
        draw();
      });
    });

    $$('#presets .preset').forEach(function (p) {
      p.addEventListener('click', function () {
        $$('#presets .preset').forEach(function (x) { x.classList.toggle('is-on', x === p); });
        var w = PRESETS[p.getAttribute('data-preset')];
        $$('#factors .factor').forEach(function (f) {
          f.classList.add('is-on');
          f.setAttribute('data-weight', w[f.getAttribute('data-factor')]);
        });
        draw();
      });
    });

    global.onReveal('.think', draw);

    new ReconOrb($('#coreNet')).start();

    var tree = new DecisionTree($('#treeSvg'));
    global.onReveal('#treewrap', function () {
      tree.play();
      $$('#scorecard li').forEach(function (li) {
        li.style.setProperty('--sw', li.getAttribute('data-score') + '%');
      });
      $('#scorecard').classList.add('is-in');
    });
  }

  /* =======================================================
     03: SUPPLY NETWORK
     ======================================================= */
  function network() {
    var map = new SupplyMap($('#mapSvg'), $('#mapTicker'), {
      panel: $('#hubPanel'),
      table: $('#laneTable tbody')
    });
    global.onReveal('.mapwrap', function () { map.run(); });

    $$('.layer').forEach(function (b) {
      b.addEventListener('click', function () {
        b.classList.toggle('is-on');
        map.setLayer(b.getAttribute('data-layer'), b.classList.contains('is-on'));
      });
    });
  }

  /* =======================================================
     04: EXECUTION
     ======================================================= */
  function execution() {
    global.onReveal('#dash', function () {
      $('#gaugeFg').style.strokeDashoffset = 314 * (1 - 0.98);
      var steps = $$('#pipe .pipe__step');
      if (REDUCED) { steps.forEach(function (s) { s.classList.add('is-done'); }); return; }
      var i = 0;
      setInterval(function () {
        steps.forEach(function (s, k) {
          s.classList.toggle('is-done', k < i);
          s.classList.toggle('is-active', k === i);
        });
        i = (i + 1) % (steps.length + 2);
      }, 850);
    });
  }

  /* =======================================================
     05: SOLUTIONS
     ======================================================= */
  function solutions() {
    $$('#cards .card').forEach(function (c) {
      c.addEventListener('click', function () { c.classList.toggle('is-open'); });
    });
  }

  /* =======================================================
     06: SUPPLIERS
     ======================================================= */
  function suppliers() {
    $('#supplierForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var name = $('#sCompany').value.trim();
      var geo = $('#sGeo').value.trim();
      var out = $('#supplierOut');
      out.className = 'formout is-on';
      out.innerHTML = '<b>' + esc(name) + '</b> registered from <b>' + esc(geo) + '</b>. ' +
        'Sahil will send the qualification pack to your mail ID within 24 hours.';
      e.target.querySelector('.form__go').textContent = 'Submitted';
    });
  }

  /* =======================================================
     07: CONTACT
     ======================================================= */
  var SEQ = [
    { n: 127, t: 'sources identified' },
    { n: 42,  t: 'specification gate' },
    { n: 18,  t: 'quality screen' },
    { n: 9,   t: 'landed cost' },
    { n: 3,   t: 'lead-time risk' },
    { n: 1,   t: 'decision' }
  ];

  function contact() {
    new ReconNet($('#ctaNet'), {
      layers: [5, 9, 9, 5], dark: true, padY: .12, fan: 3, spawnEvery: 320, nodeR: 2.2,
      padXL: wide ? 0.44 : 0.05, padXR: 0.04,
      fadeLeft: wide ? 0.52 : 0        // keep the headline clear of the wires
    }).start();

    $('#procForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var what = $('#pWhat').value.trim();
      var who = $('#pName').value.trim();
      var steps = $('#ctaSteps'), out = $('#ctaResult');
      steps.innerHTML = '';
      out.classList.remove('is-on');

      SEQ.forEach(function (s, i) {
        var sp = document.createElement('span');
        sp.textContent = s.n + '  ' + s.t;
        sp.style.animationDelay = (REDUCED ? 0 : i * .34) + 's';
        if (i === SEQ.length - 1) sp.className = 'win';
        steps.appendChild(sp);
      });

      setTimeout(function () {
        out.innerHTML = 'Elimination queued for <b>' + esc(what) + '</b>. ' +
          'Thanks ' + esc(who.split(' ')[0] || 'there') + ', Gunjan will come back to you with the ' +
          'scored shortlist and the rationale within <b>24 hours</b>.';
        out.classList.add('is-on');
      }, REDUCED ? 0 : SEQ.length * 340 + 200);
    });
  }

  function esc(s) { return String(s).replace(/[<>&]/g, ''); }

  /* ---------- boot ---------- */
  ({ home: home, decide: decide, network: network, execution: execution,
     solutions: solutions, suppliers: suppliers, contact: contact }[PAGE] || function () {})();

})(window);
