// useEffects.js — ExamVault Next-Level CSS Effects
// Import this in MainLayout and call initEffects() on mount

export function initEffects() {
  // ── 1. GLOWING BLUE DOT CURSOR (desktop only) ────────────
  if (window.matchMedia('(pointer: fine)').matches) {
    let cur = document.getElementById('ev-cursor');
    if (!cur) {
      cur = document.createElement('div');
      cur.id = 'ev-cursor';
      document.body.appendChild(cur);
    }

    let mx = 0, my = 0;
    const move = (e) => {
      mx = e.clientX; my = e.clientY;
      cur.style.left = mx + 'px';
      cur.style.top  = my + 'px';
    };
    const down = () => cur.classList.add('cursor--click');
    const up   = () => cur.classList.remove('cursor--click');

    document.addEventListener('mousemove', move, { passive: true });
    document.addEventListener('mousedown', down);
    document.addEventListener('mouseup',   up);

    // Enlarge on interactive elements
    const hoverEls = () => document.querySelectorAll(
      'a, button, [data-magnetic], .platform-card, .reg-card, .stat-card, .ev-tilt, .quote-banner, .poll-card, input, select, textarea, [role="button"]'
    );
    let hoverInterval = setInterval(() => {
      hoverEls().forEach(el => {
        if (!el._evCursorBound) {
          el._evCursorBound = true;
          el.addEventListener('mouseenter', () => cur.classList.add('cursor--hover'));
          el.addEventListener('mouseleave', () => cur.classList.remove('cursor--hover'));
        }
      });
    }, 800);

    return () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mousedown', down);
      document.removeEventListener('mouseup', up);
      clearInterval(hoverInterval);
      cur?.remove();
    };
  }
  return () => {};
}

// ── 3. 3D TILT + MOUSE-REACTIVE LIGHT ────────────────────────
export function initTilt() {
  const apply = () => {
    // Tilt cards — ALL cards that need 3D tilt
    const tiltSelectors = [
      '.reg-card',
      '.stat-card',
      '.platform-card',
      '.event-card',
      '.analytics-card',
      '.feedback-card',
      '.feedback-item',
      '.quote-banner',
      '.poll-card',
      '.dash-hero__stat',
      '.coding-stat',
      '.dash-hero',
      '.branch-accordion',
      '.syllabus-card',
      '.syllabus-item',
      '.file-card',
      '.admin-card',
      '.admin-stat-card',
      '.resource-card',
      '.contest-card'
    ].join(', ');

    document.querySelectorAll(tiltSelectors).forEach(card => {
      if (card._evTilt) return;
      card._evTilt = true;
      card.classList.add('ev-tilt');

      if (!card.querySelector('.ev-tilt__shine')) {
        const shine = document.createElement('div');
        shine.className = 'ev-tilt__shine';
        card.style.position = 'relative';
        card.appendChild(shine);
      }

      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top)  / r.height;
        const rx = (y - 0.5) * -14;
        const ry = (x - 0.5) *  14;
        card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.02)`;
        card.style.setProperty('--mx', x * 100 + '%');
        card.style.setProperty('--my', y * 100 + '%');
        card.style.setProperty('--lx', x * 100 + '%');
        card.style.setProperty('--ly', y * 100 + '%');
      }, { passive: true });

      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });

    // Light only (no tilt) — subject folders, branch accordions, file cards, etc
    const lightOnlySelectors = [
      '.subject-folder',
      '.subject-item',
      '.history-item',
      '.suggest-item',
      '.ann-item',
      '.coding-manage-row',
    ].join(', ');

    document.querySelectorAll(lightOnlySelectors).forEach(card => {
      if (card._evLight) return;
      card._evLight = true;
      card.classList.add('ev-light-card');
      card.style.position = 'relative';
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--lx', ((e.clientX - r.left) / r.width * 100) + '%');
        card.style.setProperty('--ly', ((e.clientY - r.top)  / r.height * 100) + '%');
      }, { passive: true });
    });

    // Platform cards — light tracking via CSS vars
    document.querySelectorAll('.platform-card').forEach(card => {
      if (card._evPlatformLight) return;
      card._evPlatformLight = true;
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--lx', ((e.clientX - r.left) / r.width * 100) + '%');
        card.style.setProperty('--ly', ((e.clientY - r.top)  / r.height * 100) + '%');
      }, { passive: true });
    });
  };

  apply();
  // Re-apply when DOM changes (accordion opens, etc.)
  const obs = new MutationObserver(apply);
  obs.observe(document.body, { childList: true, subtree: true });
  return () => obs.disconnect();
}

// ── 4. MAGNETIC BUTTONS ───────────────────────────────────────
export function initMagnetic() {
  const SELECTORS = [
    // File action buttons
    '.fc-btn--share', '.fc-btn--download', '.fc-btn--preview',
    '.fc-btn--delete', '.fc-btn--rate', '.fc-btn--flag',
    // Nav buttons — ALL navigation links + icon buttons
    '.navbar__link',
    '.navbar__icon-btn',
    '.navbar__upload-btn',
    '.navbar__signout-btn',
    '.navbar__avatar-btn',
    // Generic buttons
    '.btn--primary', '.btn--ghost', '.btn--success', '.btn--danger',
    '.btn--warning',
    // Modal submit
    '.modal__submit',
    // Feedback
    '.feedback-card__upvote', '.feedback-upvote',
    // Suggestions
    '.suggest-form .btn', '.suggest-item__actions .btn',
    // CGPA
    '.cgpa-page .btn',
    // Coding page tab buttons
    '.coding-tab',
    // Bookmark
    '.bookmark-item__remove',
    // Branch new folder
    '.branch-accordion__new-btn',
    // Admin
    '.admin-analytics-btn',
    // Bottom nav
    '.bottom-nav__link',
    '[data-magnetic]'
  ].join(', ');

  const apply = () => {
    document.querySelectorAll(SELECTORS).forEach(btn => {
      if (btn._evMag) return;
      btn._evMag = true;
      btn.classList.add('ev-magnetic');

      btn.addEventListener('mousemove', (e) => {
        const r = btn.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width  / 2);
        const dy = e.clientY - (r.top  + r.height / 2);
        btn.style.transform = `translate(${dx * 0.28}px, ${dy * 0.28}px)`;
      }, { passive: true });

      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'translate(0, 0)';
      });

      btn.addEventListener('click', (e) => {
        const r = btn.getBoundingClientRect();
        const ripple = document.createElement('span');
        const size = Math.max(r.width, r.height);
        ripple.className = 'ev-ripple';
        ripple.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size/2}px;top:${e.clientY - r.top - size/2}px`;
        btn.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
      });
    });
  };

  apply();
  const obs = new MutationObserver(apply);
  obs.observe(document.body, { childList: true, subtree: true });
  return () => obs.disconnect();
}

// ── 5. LIVE COUNTER ───────────────────────────────────────────
export function animateCounter(el, target, duration = 1800, suffix = '') {
  if (!el || el._evCounting) return;
  el._evCounting = true;
  let start = null;
  const step = (ts) => {
    if (!start) start = ts;
    const p = Math.min((ts - start) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(ease * target) + suffix;
    if (p < 1) requestAnimationFrame(step);
    else el._evCounting = false;
  };
  requestAnimationFrame(step);
}

export function initCounters() {
  const COLOR_MAP = ['amber','blue','teal','orange','green','red','purple'];

  const tryAnimate = (entries, observer) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      observer.unobserve(el);

      const raw = el.textContent.replace(/[^0-9.]/g, '');
      const num = parseFloat(raw);
      if (!isNaN(num) && num > 0) {
        animateCounter(el, num, 1800);
      }

      // Gradient bar
      const cell = el.closest('.stat-card, .dash-hero__stat, .dash-stat, .coding-stat');
      if (cell && !cell._evBar) {
        cell._evBar = true;
        cell.style.position = 'relative';
        cell.style.overflow = 'hidden';
        const bar = document.createElement('div');
        const colorIdx = Array.from(cell.parentElement?.children || []).indexOf(cell) % COLOR_MAP.length;
        bar.className = `ev-stat-bar ev-stat-bar--${COLOR_MAP[colorIdx]}`;
        cell.appendChild(bar);
        requestAnimationFrame(() => requestAnimationFrame(() => bar.classList.add('ev-bar-go')));
      }
    });
  };

  const io = new IntersectionObserver(tryAnimate, { threshold: 0.3 });

  const watch = () => {
    // All stat value elements across dashboard, analytics, and coding
    const selectors = [
      '.stat-card__value',
      '.stat-card p:first-child',
      '.dash-stat__value',
      '.dash-hero__stat > div > div:first-child',
      '.coding-stat > span',
      '[data-target]',
      '[data-ev-count]'
    ].join(', ');

    document.querySelectorAll(selectors).forEach(el => {
      if (!el._evCountWatched) {
        el._evCountWatched = true;
        io.observe(el);
      }
    });
  };

  watch();
  const obs = new MutationObserver(watch);
  obs.observe(document.body, { childList: true, subtree: true });
  return () => { io.disconnect(); obs.disconnect(); };
}

// ── 2. KINETIC TYPOGRAPHY (safe for React — CSS-only approach) ──
export function initKinetic() {
  // SAFE approach: We use CSS class-based animation. For titles with mixed
  // content (JSX children like <span>), we add a CSS animation class to the
  // container. For pure-text titles we wrap each word.

  const selectors = '.dash-hero__title, .coding-hero__title, .feedback-hero__title, .analytics-page__title';

  document.querySelectorAll(selectors).forEach(el => {
    if (el._evKinetic) return;
    el._evKinetic = true;

    // VERY SAFE MODE: Just apply the container animation so we never conflict with React.
    el.classList.add('ev-kinetic-container');
  });
}
