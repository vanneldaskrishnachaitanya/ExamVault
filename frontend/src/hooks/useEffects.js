// ExamVault — useEffects.js v3

// Custom cursor disabled: keep the system cursor for better platform consistency.
export function initEffects() {
  return () => {};
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
      '.analytics-card:not(.analytics-card--wide)',
      '.branch-accordion',
      '.home-role-card',
      '.dash-widget',
      '.smart-reminder',
      '.file-card',
      '.history-item',
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
      '.exam-item',
    ].join(',');

    document.querySelectorAll(TILT).forEach(card => {
      if (card.classList.contains('file-card') && card.closest('.admin-file-row')) {
        card.classList.remove('ev-tilt');
        card.style.transform = '';
        const shine = card.querySelector('.ev-tilt__shine');
        if (shine) shine.remove();
        return;
      }
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
    '.admin-analytics-btn','.profile-cgpa-btn',
    '[data-magnetic]',
  ].join(',');

  const apply = () => {
    document.querySelectorAll(SEL).forEach(btn => {
      if (btn._evMag) return; btn._evMag = true;
      if (btn.hasAttribute('data-no-magnetic')) return;
      btn.classList.add('ev-magnetic');
      btn.addEventListener('mousemove', (e) => {
        const r = btn.getBoundingClientRect();
        btn.style.transform = `translate(${(e.clientX-(r.left+r.width/2))*.28}px,${(e.clientY-(r.top+r.height/2))*.28}px)`;
      }, { passive: true });
      btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
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

// ── 6. STARFIELD ─────────────────────────────────────────────
export function initStarfield() {
  let sf = document.getElementById('ev-starfield');
  if (sf) return () => {};

  sf = document.createElement('div');
  sf.id = 'ev-starfield';
  sf.setAttribute('aria-hidden', 'true');
  document.body.insertBefore(sf, document.body.firstChild);

  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('xmlns', NS);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');

  // 55 stars — a good medium count
  const STARS = 55;
  const colors = ['#ffffff', '#ffffff', '#ffffff', '#f5a623', '#4f8ef7', '#00d4b8', '#8b5cf6'];

  for (let i = 0; i < STARS; i++) {
    const g = document.createElementNS(NS, 'g');
    const x = (Math.random() * 100).toFixed(2) + '%';
    const y = (Math.random() * 100).toFixed(2) + '%';
    const r = (Math.random() * 1.2 + 0.4).toFixed(2);
    const color = colors[Math.floor(Math.random() * colors.length)];
    const dur = (Math.random() * 4 + 2).toFixed(1) + 's';
    const delay = (Math.random() * 4).toFixed(1) + 's';
    const minOp = (Math.random() * 0.1 + 0.05).toFixed(2);
    const maxOp = (Math.random() * 0.5 + 0.3).toFixed(2);

    const circle = document.createElementNS(NS, 'circle');
    circle.setAttribute('cx', x);
    circle.setAttribute('cy', y);
    circle.setAttribute('r', r);
    circle.setAttribute('fill', color);

    const anim = document.createElementNS(NS, 'animate');
    anim.setAttribute('attributeName', 'opacity');
    anim.setAttribute('values', `${minOp};${maxOp};${minOp}`);
    anim.setAttribute('dur', dur);
    anim.setAttribute('begin', delay);
    anim.setAttribute('repeatCount', 'indefinite');

    circle.appendChild(anim);
    g.appendChild(circle);

    // Occasional larger glow star
    if (Math.random() < 0.15) {
      const glow = document.createElementNS(NS, 'circle');
      glow.setAttribute('cx', x);
      glow.setAttribute('cy', y);
      glow.setAttribute('r', (parseFloat(r) * 2.5).toFixed(2));
      glow.setAttribute('fill', color);
      glow.setAttribute('opacity', '0.08');
      const ganim = document.createElementNS(NS, 'animate');
      ganim.setAttribute('attributeName', 'opacity');
      ganim.setAttribute('values', '0.04;0.14;0.04');
      ganim.setAttribute('dur', dur);
      ganim.setAttribute('begin', delay);
      ganim.setAttribute('repeatCount', 'indefinite');
      glow.appendChild(ganim);
      g.appendChild(glow);
    }

    svg.appendChild(g);
  }

  sf.appendChild(svg);
  return () => sf?.remove();
}
