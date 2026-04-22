// src/components/LiquidToggle.jsx
// ─────────────────────────────────────────────────────────────
// Exact port of the Jhey Tompkins liquid-glass toggle.
// CSS NEVER transitions `translate` — GSAP owns it via --complete.
// Only height / width / margin / scale / opacity / filter are
// CSS-transitioned (matching the original @layer transitions).
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';

// ── GSAP loader (singleton promise) ─────────────────────────
let _gsapCache = null;
function getGSAP() {
  if (!_gsapCache) {
    _gsapCache = Promise.all([
      import(/* @vite-ignore */ 'https://esm.sh/gsap@3.13.0'),
      import(/* @vite-ignore */ 'https://esm.sh/gsap@3.13.0/Draggable'),
    ]).then(([g, d]) => {
      const gsap = g.default;
      const Draggable = d.default;
      gsap.registerPlugin(Draggable);
      return { gsap, Draggable };
    });
  }
  return _gsapCache;
}

// ── SVG filters injected once into <body> ───────────────────
let _filtersReady = false;
function ensureFilters() {
  if (_filtersReady || typeof document === 'undefined') return;
  _filtersReady = true;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;';
  svg.innerHTML = `
    <defs>
      <filter id="lt-goo">
        <feGaussianBlur id="lt-goo-blur" in="SourceGraphic" stdDeviation="13" result="blur" />
        <feColorMatrix id="lt-goo-cm" in="blur"
          values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 13 -10"
          type="matrix" result="cm" />
        <feComposite in="cm" operator="atop" />
      </filter>

      <filter id="lt-knockout" colorInterpolationFilters="sRGB">
        <feColorMatrix result="knocked" type="matrix"
          values="1 0 0 0 0
                  0 1 0 0 0
                  0 0 1 0 0
                  -1 -1 -1 1 0" />
        <feComponentTransfer>
          <feFuncR type="linear" slope="3" intercept="-1" />
          <feFuncG type="linear" slope="3" intercept="-1" />
          <feFuncB type="linear" slope="3" intercept="-1" />
        </feComponentTransfer>
        <feComponentTransfer>
          <feFuncR type="table" tableValues="0 0 0 0 0 1 1 1 1 1" />
          <feFuncG type="table" tableValues="0 0 0 0 0 1 1 1 1 1" />
          <feFuncB type="table" tableValues="0 0 0 0 0 1 1 1 1 1" />
        </feComponentTransfer>
      </filter>

      <filter id="lt-remove-black" color-interpolation-filters="sRGB">
        <feColorMatrix type="matrix"
          values="1 0 0 0 0
                  0 1 0 0 0
                  0 0 1 0 0
                  -255 -255 -255 0 1" result="bp" />
        <feMorphology in="bp" operator="dilate" radius="0.5" result="sm" />
        <feComposite in="SourceGraphic" in2="sm" operator="out" />
      </filter>
    </defs>
  `;
  document.body.appendChild(svg);
}

// ── Component ────────────────────────────────────────────────
export default function LiquidToggle({
  checked  = false,
  onChange,
  disabled = false,
  label,
  hue      = 144,
}) {
  const btnRef = useRef(null);

  // Sync aria-pressed + CSS vars when props change
  useEffect(() => {
    const btn = btnRef.current;
    if (!btn) return;
    // Only set --complete if GSAP is NOT mid-animation
    // (GSAP sets a __animating flag we check below)
    if (!btn.__ltAnimating) {
      btn.style.setProperty('--complete', checked ? '100' : '0');
    }
    btn.setAttribute('aria-pressed', String(checked));
    btn.style.setProperty('--hue', String(hue));
  }, [checked, hue]);

  // Wire up GSAP once on mount
  useEffect(() => {
    ensureFilters();
    const btn = btnRef.current;
    if (!btn) return;

    // Set initial state
    btn.style.setProperty('--complete', checked ? '100' : '0');
    btn.setAttribute('aria-pressed', String(checked));
    btn.style.setProperty('--hue', String(hue));

    let mounted = true;
    let cleanup = null;

    getGSAP().then(({ gsap, Draggable }) => {
      if (!mounted || !btnRef.current) return;

      // ── toggleState — mirrors the original babel.js exactly ──
      const toggleState = async () => {
        if (disabled || !btnRef.current) return;
        const b = btnRef.current;

        b.dataset.pressed = 'true';
        b.dataset.active  = 'true';

        // Wait for any running CSS animations (bounce)
        await Promise.allSettled(
          b.getAnimations({ subtree: true }).map(a => a.finished)
        );

        const pressed = b.getAttribute('aria-pressed') === 'true';

        b.__ltAnimating = true;
        gsap.timeline({
          onComplete: () => {
            gsap.delayedCall(0.05, () => {
              if (!btnRef.current) return;
              b.dataset.active  = 'false';
              b.dataset.pressed = 'false';
              b.__ltAnimating   = false;
              const next = !pressed;
              b.setAttribute('aria-pressed', String(next));
              if (onChange) onChange(next);
            });
          },
        }).to(b, {
          '--complete': pressed ? 0 : 100,
          duration: 0.12,
          delay: 0.18,          // bubble delay — matches original
        });
      };

      // ── Draggable proxy — mirrors original exactly ──
      const proxy = document.createElement('div');

      const [drg] = Draggable.create(proxy, {
        allowContextMenu: true,
        handle: btn,

        onDragStart: function () {
          if (disabled) return;
          const rect    = btn.getBoundingClientRect();
          const pressed = btn.getAttribute('aria-pressed') === 'true';
          this.dragBounds = pressed
            ? rect.left - this.pointerX
            : rect.left + rect.width - this.pointerX;
          btn.dataset.active = 'true';
        },

        onDrag: function () {
          if (disabled) return;
          const pressed  = btn.getAttribute('aria-pressed') === 'true';
          const dragged  = this.x - this.startX;
          const complete = gsap.utils.clamp(
            0, 100,
            pressed
              ? gsap.utils.mapRange(this.dragBounds, 0, 0, 100, dragged)
              : gsap.utils.mapRange(0, this.dragBounds, 0, 100, dragged)
          );
          this.complete = complete;
          gsap.set(btn, {
            '--complete': complete,
            '--delta': Math.min(Math.abs(this.deltaX), 12),
          });
        },

        onDragEnd: function () {
          if (disabled) return;
          const target = this.complete >= 50 ? 100 : 0;
          btn.__ltAnimating = true;
          gsap.fromTo(
            btn,
            { '--complete': this.complete },
            {
              '--complete': target,
              duration: 0.15,
              onComplete: () => {
                gsap.delayedCall(0.05, () => {
                  if (!btnRef.current) return;
                  btn.dataset.active = 'false';
                  btn.__ltAnimating  = false;
                  const next = target === 100;
                  btn.setAttribute('aria-pressed', String(next));
                  if (onChange) onChange(next);
                });
              },
            }
          );
        },

        onPress: function () {
          this.__pressTime = Date.now();
          if ('ontouchstart' in window && navigator.maxTouchPoints > 0) {
            btn.dataset.active = 'true';
          }
        },

        onRelease: function () {
          this.__releaseTime = Date.now();
          gsap.set(btn, { '--delta': 0 });
          if (
            'ontouchstart' in window &&
            navigator.maxTouchPoints > 0 &&
            ((this.startX !== undefined &&
              this.endX   !== undefined &&
              Math.abs(this.endX - this.startX) < 4) ||
              this.endX === undefined)
          ) {
            btn.dataset.active = 'false';
          }
          if (this.__releaseTime - this.__pressTime <= 150) {
            toggleState();
          }
        },
      });

      // ── Keyboard ──
      const onKeyDown = (e) => {
        if (e.key === 'Enter') toggleState();
        if (e.key === ' ')     e.preventDefault();
      };
      const onKeyUp = (e) => {
        if (e.key === ' ') toggleState();
      };
      btn.addEventListener('keydown', onKeyDown);
      btn.addEventListener('keyup',   onKeyUp);

      cleanup = () => {
        if (drg && drg.kill) drg.kill();
        btn.removeEventListener('keydown', onKeyDown);
        btn.removeEventListener('keyup',   onKeyUp);
      };
    });

    return () => {
      mounted = false;
      if (cleanup) cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);

  return (
    <button
      ref={btnRef}
      aria-label={label || 'toggle'}
      aria-pressed={checked ? 'true' : 'false'}
      className="lt-toggle"
      disabled={disabled}
      data-active="false"
      data-pressed="false"
    >
      {/* Knockout layer — makes a "hole" in the background */}
      <div className="lt-knockout">
        <div className="lt-indicator lt-indicator--masked">
          <div className="lt-mask" />
        </div>
      </div>

      {/* Liquid goo layer */}
      <div className="lt-indicator__liquid">
        <div className="lt-liq-shadow" />
        <div className="lt-wrapper">
          <div className="lt-liquids">
            <div className="lt-liquid__shadow" />
            <div className="lt-liquid__track" />
          </div>
        </div>
        <div className="lt-cover" />
      </div>
    </button>
  );
}
