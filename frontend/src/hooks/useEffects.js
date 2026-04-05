// ExamVault — useEffects.js v3

// ── 1. CURSOR ─────────────────────────────────────────────────
export function initEffects() {
  if (!window.matchMedia('(pointer: fine)').matches) return () => {};
  let cur = document.getElementById('ev-cursor');
  if (!cur) { cur = document.createElement('div'); cur.id = 'ev-cursor'; document.body.appendChild(cur); }

  let lastX = 0;
  let lastY = 0;
  let hasLast = false;
  let lastDustAt = 0;

  const spawnDust = (x, y) => {
    const now = performance.now();
    if (now - lastDustAt < 26) return;
    lastDustAt = now;

    const dust = document.createElement('span');
    dust.className = 'ev-cursor-dust';
    dust.style.left = `${x}px`;
    dust.style.top = `${y}px`;

    const size = 2.5 + Math.random() * 3.5;
    const dx = (Math.random() - 0.5) * 26;
    const dy = (Math.random() - 0.5) * 26;
    const life = 0.45 + Math.random() * 0.3;

    dust.style.setProperty('--size', `${size.toFixed(2)}px`);
    dust.style.setProperty('--dx', `${dx.toFixed(1)}px`);
    dust.style.setProperty('--dy', `${dy.toFixed(1)}px`);
    dust.style.setProperty('--life', `${life.toFixed(2)}s`);

    document.body.appendChild(dust);
    window.setTimeout(() => dust.remove(), Math.ceil(life * 1000) + 60);
  };

  const onMove = (e) => {
    cur.style.left = e.clientX + 'px';
    cur.style.top = e.clientY + 'px';

    if (!hasLast) {
      lastX = e.clientX;
      lastY = e.clientY;
      hasLast = true;
      return;
    }

    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    const dist = Math.hypot(dx, dy);
    if (dist > 2.4) {
      const count = dist > 14 ? 2 : 1;
      for (let i = 0; i < count; i += 1) {
        const t = count === 1 ? 1 : i / (count - 1);
        spawnDust(lastX + dx * t, lastY + dy * t);
      }
    }

    lastX = e.clientX;
    lastY = e.clientY;
  };

  const onDown = () => cur.classList.add('cursor--click');
  const onUp = () => cur.classList.remove('cursor--click');

  document.addEventListener('mousemove', onMove, { passive: true });
  document.addEventListener('mousedown', onDown);
  document.addEventListener('mouseup', onUp);
  const bindHover = () => {
    document.querySelectorAll('a,button,input,select,textarea,[role="button"],.platform-card,.reg-card,.stat-card,.ev-tilt,.branch-accordion').forEach(el => {
      if (el._curHov) return; el._curHov = true;
      el.addEventListener('mouseenter', () => cur.classList.add('cursor--hover'));
      el.addEventListener('mouseleave', () => cur.classList.remove('cursor--hover'));
    });
  };
  bindHover();
  const obs = new MutationObserver(bindHover);
  obs.observe(document.body, { childList: true, subtree: true });
  return () => {
    obs.disconnect();
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mousedown', onDown);
    document.removeEventListener('mouseup', onUp);
    document.querySelectorAll('.ev-cursor-dust').forEach((node) => node.remove());
    cur?.remove();
  };
}

// ── 2. KINETIC — safe, no innerHTML on React elements ─────────
export function initKinetic() {
  // Whole-element slide-up for any mixed-content element
  ['.dash-hero__title','.dash-hero__sub','.analytics-page__title',
   '.reg-page__title','.feedback-hero__title','.coding-hero__title',
   '.coding-hero__sub'].forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      if (el._evKinetic) return; el._evKinetic = true;
      el.classList.add('ev-slide-in');
    });
  });
  // Word-split only on pure-text nodes
  ['.coding-hero__sub'].forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      if (el._evWordSplit) return;
      if ([...el.childNodes].some(n => n.nodeType === Node.ELEMENT_NODE)) return;
      el._evWordSplit = true;
      const words = el.textContent.trim().split(/\s+/);
      const frag = document.createDocumentFragment();
      words.forEach((w, i) => {
        const outer = document.createElement('span');
        outer.style.cssText = 'display:inline-block;overflow:hidden;vertical-align:bottom';
        const inner = document.createElement('span');
        inner.className = 'ev-kinetic__word';
        inner.style.animationDelay = (i * 0.09) + 's';
        inner.textContent = w;
        outer.appendChild(inner);
        frag.appendChild(outer);
        if (i < words.length - 1) frag.appendChild(document.createTextNode(' '));
      });
      el.textContent = '';
      el.appendChild(frag);
    });
  });
}

// ── 3. 3D TILT + LIGHT ───────────────────────────────────────
export function initTilt() {
  const apply = () => {
    // Full 3D tilt
    const TILT = [
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
      '.home-role-card',
      '.dash-widget',
      '.smart-reminder',
      '.digest-card',
      '.file-card',
      '.history-item',
      '.syllabus-item',
      '.suggest-item',
      '.year-card',
      '.sem-card',
      '.report-card',
      '.ann-item',
      '.profile-card',
      '.search-hit-card',
      '.hub-saved-card',
      '.hub-feed-item',
      '.hub-reminder-item',
      '.qs-section-row',
      '.qs-quote-item',
      '.qs-control-row',
      '.exam-item',
      '.subject-item',
      '.subject-folder',
    ].join(',');

    document.querySelectorAll(TILT).forEach(card => {
      if (card._evTilt) return;
      card._evTilt = true;
      card.classList.add('ev-tilt');
      const isRegCard = card.classList.contains('reg-card');
      if (!isRegCard && !card.querySelector('.ev-tilt__shine')) {
        const sh = document.createElement('div');
        sh.className = 'ev-tilt__shine';
        card.appendChild(sh);
      }
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top)  / r.height;
        const maxTilt = isRegCard ? 20 : 13;
        const rotateX = (y - 0.5) * -maxTilt;
        const rotateY = (x - 0.5) * maxTilt;
        if (isRegCard) {
          card.style.setProperty('--rx', `${rotateX}deg`);
          card.style.setProperty('--ry', `${rotateY}deg`);
        } else {
          card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.022)`;
        }
        card.style.setProperty('--mx', x*100+'%');
        card.style.setProperty('--my', y*100+'%');
        card.style.setProperty('--lx', x*100+'%');
        card.style.setProperty('--ly', y*100+'%');
      }, { passive: true });
      card.addEventListener('pointerleave', () => {
        if (isRegCard) {
          card.style.setProperty('--rx', '0deg');
          card.style.setProperty('--ry', '0deg');
        } else {
          card.style.transform = '';
        }
      });
    });

    // Light-only (no tilt)
    ['.branch-mgmt-row','.coding-manage-row'].join(',')
    .split(',').forEach(sel => {
      document.querySelectorAll(sel.trim()).forEach(card => {
        if (card._evLight) return; card._evLight = true;
        card.classList.add('ev-light-card');
        card.addEventListener('mousemove', (e) => {
          const r = card.getBoundingClientRect();
          card.style.setProperty('--lx', ((e.clientX-r.left)/r.width*100)+'%');
          card.style.setProperty('--ly', ((e.clientY-r.top)/r.height*100)+'%');
        }, { passive: true });
      });
    });

    // Platform card cursor light via CSS var
    document.querySelectorAll('.platform-card').forEach(c => {
      if (c._evPL) return; c._evPL = true;
      c.addEventListener('mousemove', (e) => {
        const r = c.getBoundingClientRect();
        c.style.setProperty('--lx', ((e.clientX-r.left)/r.width*100)+'%');
        c.style.setProperty('--ly', ((e.clientY-r.top)/r.height*100)+'%');
      }, { passive: true });
    });
  };

  apply();
  const obs = new MutationObserver(apply);
  obs.observe(document.body, { childList: true, subtree: true });
  return () => obs.disconnect();
}

// ── 4. MAGNETIC ──────────────────────────────────────────────
export function initMagnetic() {
  const SEL = [
    '.navbar__link','.navbar__icon-btn','.navbar__upload-btn',
    '.navbar__avatar-btn','.nav-drawer__item',
    '.fc-btn--share','.fc-btn--download','.fc-btn--preview',
    '.fc-btn--delete','.fc-btn--rate','.fc-btn--flag',
    '.btn--primary','.btn--ghost','.btn--success','.btn--danger','.btn--warning',
    '.modal__submit','.feedback-upvote','.feedback-card__upvote',
    '.coding-tab','.admin-analytics-btn','.profile-cgpa-btn',
    '[data-magnetic]',
  ].join(',');

  const apply = () => {
    document.querySelectorAll(SEL).forEach(btn => {
      if (btn._evMag) return; btn._evMag = true;
      btn.classList.add('ev-magnetic');
      btn.addEventListener('mousemove', (e) => {
        const r = btn.getBoundingClientRect();
        btn.style.transform = `translate(${(e.clientX-(r.left+r.width/2))*.28}px,${(e.clientY-(r.top+r.height/2))*.28}px)`;
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

// ── 5. LIVE COUNTERS ─────────────────────────────────────────
export function animateCounter(el, target, dur = 1800) {
  if (el._evCounting) return; el._evCounting = true;
  const t0 = performance.now();
  const step = (now) => {
    const p = Math.min((now-t0)/dur, 1);
    const ease = 1 - Math.pow(1-p, 3);
    el.textContent = Math.round(ease * target).toLocaleString();
    if (p < 1) requestAnimationFrame(step); else el._evCounting = false;
  };
  requestAnimationFrame(step);
}

export function initCounters() {
  const COLORS = ['amber','blue','teal','orange','green','red','purple'];
  const onVisible = (entries, observer) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target; observer.unobserve(el);
      const num = parseFloat(el.textContent.replace(/[^0-9.]/g, ''));
      if (!isNaN(num) && num > 0) animateCounter(el, num);
      const cell = el.closest('.stat-card,.dash-hero__stat,.dash-stat,.coding-stat');
      if (cell && !cell._evBar) {
        cell._evBar = true;
        cell.style.position = 'relative'; cell.style.overflow = 'hidden';
        const bar = document.createElement('div');
        const idx = [...(cell.parentElement?.children||[])].indexOf(cell);
        bar.className = `ev-stat-bar ev-stat-bar--${COLORS[idx % COLORS.length]}`;
        cell.appendChild(bar);
        requestAnimationFrame(() => requestAnimationFrame(() => bar.classList.add('ev-bar-go')));
      }
    });
  };
  const io = new IntersectionObserver(onVisible, { threshold: 0.3 });
  const watch = () => {
    document.querySelectorAll('.stat-card__value,.dash-stat__value,.dash-hero__stat>div>div:first-child,[data-ev-count]').forEach(el => {
      if (el._evW) return; el._evW = true; io.observe(el);
    });
    document.querySelectorAll('.coding-stat>span').forEach(el => {
      if (el._evW) return; el._evW = true; io.observe(el);
    });
  };
  watch();
  const obs = new MutationObserver(watch);
  obs.observe(document.body, { childList: true, subtree: true });
  return () => { io.disconnect(); obs.disconnect(); };
}

