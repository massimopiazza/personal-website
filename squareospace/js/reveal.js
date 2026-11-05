/**
 * Once-only content entrances, adapted from the Starsmith site.
 * Paused effects preserve layout; plain HTML stays visible without this enhancement.
 */
(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const phone = window.matchMedia('(max-width: 700px)');

  function anchorTarget() {
    try {
      return document.getElementById(decodeURIComponent(location.hash.slice(1)));
    } catch {
      return null;
    }
  }

  function createReveals({ root = null, rootMargin = '0px 0px -10% 0px' } = {}) {
    const records = new Map();
    let seen = new WeakSet();
    const supported = typeof window.IntersectionObserver === 'function' && typeof Element.prototype.animate === 'function';
    const restored = !root && performance.getEntriesByType('navigation')[0]?.type === 'back_forward';
    const firstPaint = performance.getEntriesByName('first-contentful-paint')[0];
    // A slow script must not hide the opening view after the visitor has started reading.
    const lateOpening = !root && firstPaint && performance.now() - firstPaint.startTime > 150;

    function finish(element) {
      observer?.unobserve(element);
      const record = records.get(element);
      records.delete(element);
      record?.animations.forEach(animation => animation.cancel());
    }

    function finishWithin(target) {
      for (const element of records.keys()) {
        if (target.contains(element) || element.contains(target)) finish(element);
      }
    }

    function finishAll() {
      for (const element of records.keys()) finish(element);
    }

    function start(element) {
      const record = records.get(element);
      if (!record || record.started) return;
      if (reduced.matches || element.contains(document.activeElement)) {
        finish(element);
        return;
      }
      record.started = true;
      observer.unobserve(element);
      const fade = element.dataset.reveal === 'fade';
      for (const animation of record.animations) {
        const part = animation.effect.target;
        const distance = phone.matches ? 20 : part.matches('h1, h2, h3') ? 40 : 28;
        animation.effect.setKeyframes([
          { opacity: 0, ...(!fade && { transform: `translateY(${distance}px)` }) },
          { opacity: 1, offset: 0.65 },
          { opacity: 1, ...(!fade && { transform: 'translateY(0)' }) },
        ]);
        animation.play();
      }
      void Promise.all(record.animations.map(animation => animation.finished)).then(() => {
        // A panel may have been reset and populated again while these effects finished.
        if (records.get(element) === record) finish(element);
      }, () => {});
    }

    const observer = supported ? new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) start(entry.target);
    }, { root, rootMargin }) : null;

    function observe(elements) {
      const target = anchorTarget();
      const viewportTop = root ? root.getBoundingClientRect().top : 0;
      for (const element of elements) {
        if (!(element instanceof HTMLElement) || seen.has(element)) continue;
        seen.add(element);
        if (!supported || reduced.matches || restored || element.contains(document.activeElement)) continue;
        if (target && (target.contains(element) || element.contains(target))) continue;
        const box = element.getBoundingClientRect();
        if (box.bottom <= viewportTop || (lateOpening && box.top < innerHeight)) continue;

        const fade = element.dataset.reveal === 'fade';
        const children = Array.from(element.children).filter(child =>
          child instanceof HTMLElement && !child.matches('script, style, form, button, nav, [data-reveal]'));
        const parts = !fade && !element.matches('h1, h2, h3, p, figure, ul, ol, table') && children.length > 1
          ? children : [element];
        const animations = [];
        records.set(element, { animations, started: false });
        try {
          for (const [index, part] of parts.entries()) {
            const delay = Math.min((Number(element.dataset.revealDelay) || 0) + index * 80, 240);
            // Waiting blocks keep their resting geometry so movement cannot delay their own trigger.
            const animation = part.animate([{ opacity: 0 }, { opacity: 0 }], {
              duration: fade ? 600 : 900,
              delay,
              easing: 'cubic-bezier(.16, 1, .3, 1)',
              fill: 'both',
            });
            animations.push(animation);
            void animation.finished.catch(() => {});
            animation.pause();
            animation.currentTime = 0;
          }
          observer.observe(element);
        } catch {
          finish(element);
        }
      }
    }

    document.addEventListener('focusin', event => {
      if (event.target instanceof Element) finishWithin(event.target);
    });
    reduced.addEventListener('change', () => { if (reduced.matches) finishAll(); });
    window.addEventListener('beforeprint', finishAll);
    window.addEventListener('pagehide', finishAll);
    window.addEventListener('pageshow', event => { if (event.persisted) finishAll(); });
    window.addEventListener('hashchange', () => {
      const target = anchorTarget();
      if (target) finishWithin(target);
    });

    return {
      observe,
      finishWithin,
      reset() {
        finishAll();
        observer?.disconnect();
        seen = new WeakSet();
      },
    };
  }

  const api = window.squareospace = window.squareospace || {};
  api.createReveals = createReveals;
  api.pageReveals = createReveals();
  api.pageReveals.observe(document.querySelectorAll('main [data-reveal]'));
})();
