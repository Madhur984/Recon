/* =========================================================
   RECON CORE: shared shell
   Nav, chapter rail, footer, page transitions, reveals.
   Every page is a step in one decision; the chrome says so.
   ========================================================= */
(function (global) {
  'use strict';

  var PAGES = [
    { id: 'home',      num: '01', file: 'index.html',         nav: 'Overview',
      title: 'Semiconductor procurement is rationally complex.', short: 'Overview' },
    { id: 'decide',    num: '02', file: 'how-we-decide.html',  nav: 'How We Decide',
      title: "We don't hope. We don't guess. We execute.", short: 'How We Decide' },
    { id: 'network',   num: '03', file: 'supply-network.html', nav: 'Supply Network',
      title: 'A live network, not a contact list.', short: 'Supply Network' },
    { id: 'execution', num: '04', file: 'execution.html',      nav: 'Execution',
      title: 'Procurement execution like never before.', short: 'Execution' },
    { id: 'solutions', num: '05', file: 'solutions.html',      nav: 'Solutions',
      title: 'Components where the wrong choice is expensive.', short: 'Solutions' },
    { id: 'suppliers', num: '06', file: 'suppliers.html',      nav: 'For Suppliers',
      title: 'Get on the shortlist that actually converts.', short: 'For Suppliers' },
    { id: 'contact',   num: '07', file: 'contact.html',        nav: 'Contact',
      title: 'What are you trying to source?', short: 'Contact' }
  ];

  var here = document.body.getAttribute('data-page') || 'home';
  var idx = Math.max(0, PAGES.findIndex(function (p) { return p.id === here; }));

  global.RECON_PAGES = PAGES;
  global.RECON_PAGE = PAGES[idx];

  /* ---------- chrome ---------- */
  function build() {
    var mid = PAGES.slice(1, 6).map(function (p) {
      return '<a href="' + p.file + '"' + (p.id === here ? ' class="is-here"' : '') +
             '><i>' + p.num + '</i>' + p.nav + '</a>';
    }).join('');

    // first real block on the page becomes the skip-link target
    var first = document.querySelector('header.chapter, section');
    if (first && !first.id) first.id = 'content';
    var target = first ? first.id : 'content';

    var head = document.createElement('div');
    head.innerHTML =
      '<a class="skip" href="#' + target + '">Skip to content</a>' +
      '<div class="scroll-rail"><div class="scroll-rail__fill" id="scrollFill"></div></div>' +
      '<header class="nav" id="nav">' +
        '<a class="nav__brand" href="index.html">' +
          '<span class="nav__mark"><svg viewBox="0 0 24 24" width="22" height="22">' +
            '<circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" stroke-width="1.2"/>' +
            '<circle cx="12" cy="12" r="3" fill="currentColor"/>' +
            '<path d="M12 2.8V7M12 17v4.2M2.8 12H7M17 12h4.2" stroke="currentColor" stroke-width="1.2"/>' +
          '</svg></span>' +
          '<span class="nav__word">RECON<b>CORE</b></span>' +
        '</a>' +
        '<nav class="nav__links" id="navLinks" aria-label="Main">' + mid + '</nav>' +
        '<a class="btn btn--solid nav__cta" href="contact.html">Start a Procurement</a>' +
        '<button class="nav__burger" id="burger" aria-label="Menu"><span></span><span></span></button>' +
      '</header>' +
      '<div class="pt" id="pt" aria-hidden="true">' +
        '<i></i><i></i><i></i><i></i><i></i><i></i>' +
        '<span class="pt__label" id="ptLabel"></span>' +
      '</div>' +
      '<nav class="rail" aria-label="Chapters">' +
        PAGES.map(function (p, i) {
          return '<a href="' + p.file + '" class="rail__dot' + (i === idx ? ' is-here' : '') +
                 '"><b>' + p.num + '</b><span>' + p.nav + '</span></a>';
        }).join('') +
      '</nav>';
    while (head.firstChild) document.body.insertBefore(head.firstChild, document.body.firstChild);

    var next = PAGES[idx + 1];
    var foot = document.createElement('div');
    foot.innerHTML =
      (next ? '<a class="nextpage" href="' + next.file + '">' +
          '<span class="nextpage__k">Next: ' + next.num + ' &middot; ' + next.short + '</span>' +
          '<span class="nextpage__t">' + next.title + '</span>' +
          '<span class="nextpage__go" aria-hidden="true">&rarr;</span>' +
        '</a>' : '') +
      '<footer class="foot"><div class="wrap foot__in">' +
        '<span class="nav__word">RECON<b>CORE</b></span>' +
        '<nav class="foot__links">' +
          PAGES.slice(1).map(function (p) { return '<a href="' + p.file + '">' + p.nav + '</a>'; }).join('') +
        '</nav>' +
        '<span class="foot__c">&copy; 2026 RECON CORE. Complex supply chains, simplified decisions.</span>' +
      '</div></footer>';
    while (foot.firstChild) document.body.appendChild(foot.firstChild);
  }
  build();

  /* ---------- scroll state ---------- */
  var nav = document.getElementById('nav');
  var fill = document.getElementById('scrollFill');
  function onScroll() {
    var y = window.scrollY || document.documentElement.scrollTop;
    nav.classList.toggle('is-stuck', y > 24);
    var max = document.documentElement.scrollHeight - window.innerHeight;
    fill.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  document.getElementById('burger').addEventListener('click', function () {
    nav.classList.toggle('is-open');
  });

  /* ---------- page transitions ---------- */
  var pt = document.getElementById('pt');
  var ptLabel = document.getElementById('ptLabel');
  ptLabel.innerHTML = '<b>' + PAGES[idx].num + '</b> ' + PAGES[idx].nav;

  pt.classList.add('pt--enter');
  setTimeout(function () { pt.classList.remove('pt--enter'); }, 1100);

  function leaveTo(href) {
    var p = PAGES.find(function (x) { return href.indexOf(x.file) > -1; });
    if (p) ptLabel.innerHTML = '<b>' + p.num + '</b> ' + p.nav;
    pt.classList.add('pt--exit');
    setTimeout(function () { window.location.href = href; }, global.RECON_REDUCED ? 0 : 460);
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (!/\.html$/.test(href) || a.target === '_blank' || e.metaKey || e.ctrlKey) return;
    if (href.indexOf(PAGES[idx].file) > -1) { e.preventDefault(); return; }
    e.preventDefault();
    nav.classList.remove('is-open');
    leaveTo(href);
  });

  /* ---------- reveals + counters (shared) ---------- */
  var hooks = {};
  global.onReveal = function (sel, fn) { hooks[sel] = fn; };

  var io = new IntersectionObserver(function (list) {
    list.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      Object.keys(hooks).forEach(function (sel) {
        if (hooks[sel] && e.target.matches(sel)) { hooks[sel](e.target); hooks[sel] = null; }
      });
      io.unobserve(e.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });

  global.observeReveals = function () {
    Array.prototype.forEach.call(document.querySelectorAll('.reveal:not(.is-watched)'), function (n) {
      n.classList.add('is-watched');
      io.observe(n);
    });
  };
  global.observeReveals();

  function countUp(node) {
    var to = parseFloat(node.getAttribute('data-count'));
    var suffix = node.getAttribute('data-suffix') || '';
    if (global.RECON_REDUCED) { node.textContent = to.toLocaleString() + suffix; return; }
    var t0 = performance.now();
    (function step(t) {
      var k = Math.min((t - t0) / 1400, 1);
      node.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))).toLocaleString() + suffix;
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }
  var cio = new IntersectionObserver(function (list) {
    list.forEach(function (e) {
      if (e.isIntersecting) { countUp(e.target); cio.unobserve(e.target); }
    });
  }, { threshold: 0.6 });
  Array.prototype.forEach.call(document.querySelectorAll('[data-count]'), function (n) { cio.observe(n); });

})(window);
