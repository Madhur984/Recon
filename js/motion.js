/* =========================================================
   RECON CORE: motion layer
   Adds on top of the page animations: word reveals, parallax,
   pointer spotlight, staggered rows, numeral counting.
   ========================================================= */
(function (global) {
  'use strict';

  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var REDUCED = global.RECON_REDUCED;

  /* ---------------------------------------------------------
     1: word-mask reveal for headlines
     Splits text nodes only, so <em>, <b> and <br> survive.
     --------------------------------------------------------- */
  function splitWords(node) {
    var kids = Array.prototype.slice.call(node.childNodes);
    kids.forEach(function (child) {
      if (child.nodeType === 3) {
        var parts = child.nodeValue.split(/(\s+)/);
        var frag = document.createDocumentFragment();
        parts.forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
          var w = document.createElement('span');
          w.className = 'w';
          var i = document.createElement('i');
          i.textContent = part;
          w.appendChild(i);
          frag.appendChild(w);
        });
        node.replaceChild(frag, child);
      } else if (child.nodeType === 1 && child.tagName !== 'BR') {
        splitWords(child);
      }
    });
  }

  function prepareHeadline(el) {
    if (el.dataset.split) return;
    el.dataset.split = '1';
    splitWords(el);
    $$('.w > i', el).forEach(function (i, n) {
      i.style.transitionDelay = (n * 0.045) + 's';
    });
    el.classList.add('is-splittable');
  }

  var headlines = $$('.sec-title, .chapter__t, .demo__t, .cta__title');
  if (!REDUCED) {
    headlines.forEach(prepareHeadline);

    var hio = new IntersectionObserver(function (list) {
      list.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-lit');
        hio.unobserve(e.target);
      });
    }, { threshold: 0.25, rootMargin: '0px 0px -5% 0px' });
    headlines.forEach(function (h) { hio.observe(h); });

    // the chapter headline is above the fold: light it with the page intro
    var ch = document.querySelector('.chapter__t');
    if (ch) setTimeout(function () { ch.classList.add('is-lit'); }, 420);
  }

  /* ---------------------------------------------------------
     2: scroll parallax (chapter numeral, hero panel drift)
     --------------------------------------------------------- */
  var floaters = $$('[data-parallax]');
  var numeral = document.querySelector('.chapter__num');
  if (numeral) { numeral.setAttribute('data-parallax', '0.12'); floaters.push(numeral); }

  var ticking = false;
  function parallax() {
    var y = window.scrollY || 0;
    floaters.forEach(function (f) {
      var k = parseFloat(f.getAttribute('data-parallax')) || 0.1;
      f.style.setProperty('--py', (-y * k).toFixed(1) + 'px');
    });
    ticking = false;
  }
  if (floaters.length && !REDUCED) {
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(parallax); }
    }, { passive: true });
    parallax();
  }

  /* ---------------------------------------------------------
     3: pointer spotlight on cards
     --------------------------------------------------------- */
  var SPOT = '.card, .ben, .level, .tcard, .pathcard, .ind, .stat, .stage, .person';
  if (!REDUCED && window.matchMedia('(hover:hover)').matches) {
    $$(SPOT).forEach(function (c) {
      c.classList.add('spot');
      c.addEventListener('pointermove', function (e) {
        var r = c.getBoundingClientRect();
        c.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
        c.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
      });
    });
  }

  /* ---------------------------------------------------------
     4: staggered entrance for repeated rows
     --------------------------------------------------------- */
  var GROUPS = ['.paths', '.cards', '.inds', '.bens', '.levels', '.transp',
                '.stat-strip', '.ticks', '.steps', '.lanes tbody', '.flowline'];
  var sio = new IntersectionObserver(function (list) {
    list.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-cascade');
      sio.unobserve(e.target);
    });
  }, { threshold: 0.12 });

  GROUPS.forEach(function (sel) {
    $$(sel).forEach(function (g) {
      Array.prototype.forEach.call(g.children, function (child, i) {
        child.style.setProperty('--i', i);
      });
      g.classList.add('cascade');
      if (REDUCED) g.classList.add('is-cascade');
      else sio.observe(g);
    });
  });

  /* ---------------------------------------------------------
     5: chapter numeral counts up to its own number
     --------------------------------------------------------- */
  if (numeral && !REDUCED) {
    var target = parseInt(numeral.textContent, 10);
    if (!isNaN(target)) {
      var t0 = performance.now();
      (function tick(t) {
        var k = Math.min((t - t0) / 900, 1);
        var v = Math.round(target * (1 - Math.pow(1 - k, 3)));
        numeral.textContent = (v < 10 ? '0' : '') + v;
        if (k < 1) requestAnimationFrame(tick);
      })(t0);
    }
  }

  /* ---------------------------------------------------------
     6: magnetic pull on the primary buttons
     --------------------------------------------------------- */
  if (!REDUCED && window.matchMedia('(hover:hover)').matches) {
    $$('.btn--solid, .nextpage__go').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        var dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        b.style.setProperty('--bx', (dx * 7).toFixed(1) + 'px');
        b.style.setProperty('--by', (dy * 5).toFixed(1) + 'px');
      });
      b.addEventListener('pointerleave', function () {
        b.style.setProperty('--bx', '0px');
        b.style.setProperty('--by', '0px');
      });
    });
  }

  /* ---------------------------------------------------------
     7: scroll direction hides / shows the nav
     --------------------------------------------------------- */
  var nav = document.getElementById('nav');
  if (nav && !REDUCED) {
    var lastY = 0;
    window.addEventListener('scroll', function () {
      var y = window.scrollY || 0;
      if (y > 300 && y > lastY + 6) nav.classList.add('is-away');
      else if (y < lastY - 6) nav.classList.remove('is-away');
      lastY = y;
    }, { passive: true });
  }

})(window);
