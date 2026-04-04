// ═══════════════════════════════════════════════════════════════
// ExamVault — useEffects.js  (complete rewrite)
// ═══════════════════════════════════════════════════════════════

// ── 1. GLOWING BLUE DOT CURSOR ────────────────────────────────
export function initEffects() {
  if (!window.matchMedia('(pointer: fine)').matches) return () => {};

  let cur = document.getElementById('ev-cursor');
  if (!cur) {
    cur = document.createElement('div');
    cur.id = 'ev-cursor';
    document.body.appendChild(cur);
  }

  const onMove = (e) => {
    cur.style.left = e.clientX + 'px';
    cur.style.top  = e.clientY + 'px';
  };
  document.addEventListener('mousemove', onMove, { passive: true });
  document.addEventListener('mousedown', () => cur.classList.add('cursor--click'));
  document.addEventListener('mouseup',   () => cur.classList.remove('cursor--click'));

  const bindHover = () => {
    document.querySelectorAll('a,button,input,select,textarea,[role="button"],.platform-card,.reg-card,.stat-card,.ev-tilt,.branch-accordion').forEach(el => {
      if (el._curHov) return;
      el._curHov = true;
      el.addEventListener('mouseenter', () => cur.classList.add('cursor--hover'));
      el.addEventListener('mouseleave', () => cur.classList.remove('cursor--hover'));
    });
  };
  bindHover();
  const hObs = new MutationObserver(bindHover);
  hObs.observe(document.body, { childList: true, subtree: true });

  return () => { hObs.disconnect(); cur?.remove(); };
}

// ── 2. KINETIC TYPOGRAPHY (CSS-only, never touches React JSX) ─
// Only wraps elements whose textContent == innerText (pure text, no child elements)
export function initKinetic() {
  const SELECTORS = [
    '.coding-hero__title',
    '.coding-hero__sub',
    '.feedback-hero__title',
  ];

  // For elements with child elements (like dash-hero__title which has <span>s),
  // we just slide the whole container in — never touch innerHTML
  const SLIDE_ONLY = [
    '.dash-hero__title',
    '.dash-hero__sub',
    '.analytics-page__title',
    '.reg-page__title',
    '.coding-hero__title',
    '.feedback-hero__title',
  ];

  SLIDE_ONLY.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      if (el._evKinetic) return;
      el._evKinetic = true;
      el.classList.add('ev-slide-in');
    });
  });

  // Word-split only on guaranteed pure-text elements
  SELECTORS.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      if (el._evWordSplit) return;
      // Only if no child element nodes
      if ([...el.childNodes].some(n => n.nodeType === Node.ELEMENT_NODE)) return;
      el._evWordSplit = true;

      const words = el.textContent.trim().split(/\s+/);
      const frag = document.createDocumentFragment();
      words.forEach((word, i) => {
        const outer = document.createElement('span');
        outer.style.cssText = 'display:inline-block;overflow:hidden;vertical-align:bottom';
        const inner = document.createElement('span');
        inner.className = 'ev-kinetic__word';
        inner.style.animationDelay = (i * 0.1) + 's';
        inner.textContent = word;
        outer.appendChild(inner);
        frag.appendChild(outer);
        if (i < words.length - 1) frag.appendChild(document.createTextNode(' '));
      });
      el.textContent = '';
      el.appendChild(frag);
    });
  });
}

// ── 3. 3D TILT + CURSOR LIGHT ─────────────────────────────────
export function initTilt() {
  const apply = () => {
    const TILT_SEL = [
      '.reg-card',
      '.stat-card',
      '.platform-card',
      '.event-card',
      '.feedback-card',
      '.feedback-item',
      '.quote-banner',
      '.poll-card',
      '.analytics-card:not(.analytics-card--wide)',
      '.branch-accordion',
    ].join(',');

    document.querySelectorAll(TILT_SEL).forEach(card => {
      if (card._evTilt) return;
      card._evTilt = true;
      card.classList.add('ev-tilt');

      if (!card.querySelector('.ev-tilt__shine')) {
        const sh = document.createElement('div');
        sh.className = 'ev-tilt__shine';
        card.appendChild(sh);
      }

      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top)  / r.height;
        card.style.transform = `perspective(900px) rotateX(${(y - 0.5) * -13}deg) rotateY(${(x - 0.5) * 13}deg) scale(1.025)`;
        card.style.setProperty('--mx', x * 100 + '%');
        card.style.setProperty('--my', y * 100 + '%');
        card.style.setProperty('--lx', x * 100 + '%');
        card.style.setProperty('--ly', y * 100 + '%');
      }, { passive: true });

      card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });

    // Light only
    const LIGHT_SEL = [
      '.subject-item',
      '.subject-folder',
      '.file-card',
      '.history-item',
      '.syllabus-item',
      '.suggest-item',
      '.year-card',
      '.sem-card',
      '.branch-mgmt-row',
    ].join(',');

    document.querySelectorAll(LIGHT_SEL).forEach(card => {
      if (card._evLight) return;
      card._evLight = true;
      card.classList.add('ev-light-card');
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--lx', ((e.clientX - r.left) / r.width * 100) + '%');
        card.style.setProperty('--ly', ((e.clientY - r.top)  / r.height * 100) + '%');
      }, { passive: true });
    });
  };

  apply();
  const obs = new MutationObserver(apply);
  obs.observe(document.body, { childList: true, subtree: true });
  return () => obs.disconnect();
}

// ── 4. MAGNETIC BUTTONS ───────────────────────────────────────
export function initMagnetic() {
  const SEL = [
    '.navbar__link',
    '.navbar__icon-btn',
    '.navbar__upload-btn',
    '.navbar__signout-btn',
    '.navbar__avatar-btn',
    '.fc-btn--share','.fc-btn--download','.fc-btn--preview',
    '.fc-btn--delete','.fc-btn--rate','.fc-btn--flag',
    '.btn--primary','.btn--ghost','.btn--success','.btn--danger','.btn--warning',
    '.modal__submit',
    '.feedback-upvote','.feedback-card__upvote',
    '.coding-tab',
    '.admin-analytics-btn',
    '.profile-cgpa-btn',
    '[data-magnetic]',
  ].join(',');

  const apply = () => {
    document.querySelectorAll(SEL).forEach(btn => {
      if (btn._evMag) return;
      btn._evMag = true;
      btn.classList.add('ev-magnetic');

      btn.addEventListener('mousemove', (e) => {
        const r = btn.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width  / 2);
        const dy = e.clientY - (r.top  + r.height / 2);
        btn.style.transform = `translate(${dx * 0.28}px,${dy * 0.28}px)`;
      }, { passive: true });

      btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });

      btn.addEventListener('click', (e) => {
        const r = btn.getBoundingClientRect();
        const rip = document.createElement('span');
        const sz = Math.max(r.width, r.height);
        rip.className = 'ev-ripple';
        rip.style.cssText = `width:${sz}px;height:${sz}px;left:${e.clientX-r.left-sz/2}px;top:${e.clientY-r.top-sz/2}px`;
        btn.appendChild(rip);
        setTimeout(() => rip.remove(), 600);
      });
    });
  };

  apply();
  const obs = new MutationObserver(apply);
  obs.observe(document.body, { childList: true, subtree: true });
  return () => obs.disconnect();
}

// ── 5. LIVE COUNTERS + GRADIENT BARS ──────────────────────────
export function animateCounter(el, target, dur = 1800) {
  if (el._evCounting) return;
  el._evCounting = true;
  const t0 = performance.now();
  const step = (now) => {
    const p = Math.min((now - t0) / dur, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(ease * target).toLocaleString();
    if (p < 1) requestAnimationFrame(step);
    else el._evCounting = false;
  };
  requestAnimationFrame(step);
}

export function initCounters() {
  const COLORS = ['amber','blue','teal','orange','green','red','purple'];

  const onVisible = (entries, observer) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      observer.unobserve(el);

      const num = parseFloat(el.textContent.replace(/[^0-9.]/g, ''));
      if (!isNaN(num) && num > 0) animateCounter(el, num);

      const cell = el.closest('.stat-card,.dash-hero__stat,.dash-stat,.coding-stat');
      if (cell && !cell._evBar) {
        cell._evBar = true;
        cell.style.position = 'relative';
        cell.style.overflow = 'hidden';
        const bar = document.createElement('div');
        const idx = [...(cell.parentElement?.children || [])].indexOf(cell);
        bar.className = `ev-stat-bar ev-stat-bar--${COLORS[idx % COLORS.length]}`;
        cell.appendChild(bar);
        requestAnimationFrame(() => requestAnimationFrame(() => bar.classList.add('ev-bar-go')));
      }
    });
  };

  const io = new IntersectionObserver(onVisible, { threshold: 0.3 });

  const watch = () => {
    document.querySelectorAll([
      '.stat-card__value',
      '.dash-stat__value',
      '.dash-hero__stat > div > div:first-child',
      '[data-ev-count]',
    ].join(',')).forEach(el => {
      if (el._evW) return; el._evW = true; io.observe(el);
    });
    // Coding stats — the number is inside a <span> inside .coding-stat
    document.querySelectorAll('.coding-stat > span').forEach(el => {
      if (el._evW) return; el._evW = true; io.observe(el);
    });
  };

  watch();
  const obs = new MutationObserver(watch);
  obs.observe(document.body, { childList: true, subtree: true });
  return () => { io.disconnect(); obs.disconnect(); };
}
