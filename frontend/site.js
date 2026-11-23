(function () {
  'use strict';
  var theme = document.getElementById('theme-button');
  var music = document.getElementById('audio-button');
  var print = document.getElementById('print-button');
  var root = document.documentElement;
  if (theme) {
    var preference;
    try { preference = localStorage.getItem('portfolio-theme'); } catch (_) {}
    if (preference === 'dark' || preference === 'light') root.setAttribute('data-theme', preference);
    var dark = function () {
      return root.getAttribute('data-theme') === 'dark' ||
        (!root.hasAttribute('data-theme') && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    };
    theme.setAttribute('aria-pressed', String(Boolean(dark())));
    theme.hidden = false;
    theme.addEventListener('click', function () {
      var value = dark() ? 'light' : 'dark';
      root.setAttribute('data-theme', value);
      theme.setAttribute('aria-pressed', String(value === 'dark'));
      try { localStorage.setItem('portfolio-theme', value); } catch (_) {}
    });
  }
  if (music && window.Audio) {
    var audio;
    var off = function () { music.setAttribute('aria-pressed', 'false'); music.setAttribute('aria-label', 'Activar música'); document.body.classList.remove('is-playing'); };
    music.hidden = false;
    music.addEventListener('click', function () {
      if (!audio) {
        audio = new Audio('./assets/0827.MP3');
        audio.loop = true;
        audio.volume = 0.25;
        audio.addEventListener('pause', off);
        audio.addEventListener('error', off);
        audio.addEventListener('playing', function () { music.setAttribute('aria-pressed', 'true'); music.setAttribute('aria-label', 'Desactivar música'); document.body.classList.add('is-playing'); });
      }
      if (!audio.paused) return audio.pause();
      var result = audio.play();
      if (result && result.catch) result.catch(off);
    });
  }
  if (print) {
    print.hidden = false;
    print.addEventListener('click', function () { window.print(); });
  }
  var effects = document.getElementById('effects-button');
  if (effects) {
    effects.addEventListener('click', function () {
      var enabled = !document.body.classList.contains('effects-off');
      document.body.classList.toggle('effects-off', enabled);
      effects.setAttribute('aria-pressed', String(!enabled));
      effects.setAttribute('aria-label', enabled ? 'Activar efectos visuales' : 'Desactivar efectos visuales');
    });
  }
  var fullscreen = document.getElementById('fullscreen-button');
  if (fullscreen) {
    fullscreen.addEventListener('click', function () {
      var action = document.fullscreenElement ? document.exitFullscreen : document.documentElement.requestFullscreen;
      if (action) { var result = action.call(document.fullscreenElement ? document : document.documentElement); if (result && result.catch) result.catch(function () {}); }
    });
  }
  var progress = document.querySelector('.mega-scroll-progress');
  if (progress) {
    var progressQueued = false;
    var updateProgress = function () {
      progressQueued = false;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0) + ')';
    };
    var queueProgress = function () { if (!progressQueued) { progressQueued = true; window.requestAnimationFrame(updateProgress); } };
    window.addEventListener('scroll', queueProgress, { passive: true });
    window.addEventListener('resize', queueProgress, { passive: true });
    queueProgress();
  }
  var cursor = document.querySelector('.custom-cursor');
  var finePointer = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)');
  if (cursor && finePointer && finePointer.matches && !(window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
    document.body.classList.add('cursor-active');
    document.addEventListener('mousemove', function (event) {
      cursor.style.transform = 'translate3d(' + (event.clientX - 8) + 'px,' + (event.clientY - 8) + 'px,0)';
      var target = event.target;
      while (target && target !== document) {
        if (target.matches && target.matches('a,button,.project-card')) { document.body.classList.add('cursor-hover'); return; }
        target = target.parentNode;
      }
      document.body.classList.remove('cursor-hover');
    }, { passive: true });
    document.addEventListener('mouseleave', function () { document.body.classList.remove('cursor-active','cursor-hover'); });
    document.addEventListener('mouseenter', function () { document.body.classList.add('cursor-active'); });
  }
  var counters = document.querySelectorAll('.stat-number[data-value]');
  if ('IntersectionObserver' in window && counters.length && !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
    var counterObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var counter = entry.target;
        var target = Number(counter.getAttribute('data-value')) || 0;
        var start = window.performance && performance.now ? performance.now() : Date.now();
        var tick = function (now) {
          var progress = Math.min(1, ((now || Date.now()) - start) / 720);
          var value = Math.floor(target * (1 - Math.pow(1 - progress, 3)));
          counter.textContent = String(value).padStart(2, '0');
          if (progress < 1) window.requestAnimationFrame(tick);
        };
        window.requestAnimationFrame(tick);
        counterObserver.unobserve(counter);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (counter) { counterObserver.observe(counter); });
  }
  document.addEventListener('click', function (event) {
    var target = event.target && event.target.closest ? event.target.closest('.button,.floating-btn') : null;
    if (!target) return;
    var rect = target.getBoundingClientRect();
    var size = Math.max(rect.width, rect.height);
    var ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (event.clientX - rect.left - size / 2) + 'px';
    ripple.style.top = (event.clientY - rect.top - size / 2) + 'px';
    target.appendChild(ripple);
    window.setTimeout(function () { ripple.remove(); }, 600);
  });
  // Add scroll reveals progressively: content stays visible if the feature is unavailable.
  if ('IntersectionObserver' in window && !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
    try {
      var revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -36px 0px' });
      var reveal = function (node) {
        if (!node || node.classList.contains('reveal')) return;
        node.classList.add('reveal');
        revealObserver.observe(node);
      };
      document.documentElement.classList.add('motion-ready');
      document.querySelectorAll('main .section, main .toolkit').forEach(reveal);
    } catch (_) {
      document.documentElement.classList.remove('motion-ready');
    }
  }
}());
