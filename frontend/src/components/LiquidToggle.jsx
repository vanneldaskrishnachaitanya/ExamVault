// src/components/LiquidToggle.jsx
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
  svg.setAttribute('class', 'sr-only');
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.innerHTML = `
    <defs>
      <filter id="goo">
        <feGaussianBlur id="SvgjsFeGaussianBlur1000" result="SvgjsFeGaussianBlur1000" in="SourceGraphic" stdDeviation="13"></feGaussianBlur>
        <feColorMatrix id="SvgjsFeColorMatrix1001" result="SvgjsFeColorMatrix1001" in="SvgjsFeGaussianBlur1000" values="
                1 0 0 0 0
                0 1 0 0 0
                0 0 1 0 0
                0 0 0 16 -10
            " type="matrix"></feColorMatrix>
        <feComposite id="SvgjsFeComposite1002" result="SvgjsFeComposite1002" in="SvgjsFeColorMatrix1001" operator="atop"></feComposite>
      </filter>
      <filter id="knockout" colorInterpolationFilters="sRGB">
        <feColorMatrix result="knocked" type="matrix" values="1 0 0 0 0
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
      <filter id="remove-black" color-interpolation-filters="sRGB">
        <feColorMatrix type="matrix" values="1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      -255 -255 -255 0 1" result="black-pixels" />
        <feMorphology in="black-pixels" operator="dilate" radius="0.5" result="smoothed" />
        <feComposite in="SourceGraphic" in2="smoothed" operator="out" />
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
  hue      = 144, // always 144 now, based on your instruction "keep every toggle green color only"
}) {
  const btnRef = useRef(null);

  // Sync aria-pressed + CSS vars when props change
  useEffect(() => {
    const btn = btnRef.current;
    if (!btn) return;
    if (!btn.__ltAnimating) {
      btn.style.setProperty('--complete', checked ? '100' : '0');
    }
    btn.setAttribute('aria-pressed', String(checked));
    btn.style.setProperty('--hue', '144'); // Always green per instruction
  }, [checked, hue]);

  // Wire up GSAP once on mount
  useEffect(() => {
    ensureFilters();
    const toggle = btnRef.current;
    if (!toggle) return;

    toggle.style.setProperty('--complete', checked ? '100' : '0');
    toggle.setAttribute('aria-pressed', String(checked));
    toggle.style.setProperty('--hue', '144');

    let mounted = true;
    let cleanup = null;

    getGSAP().then(({ gsap, Draggable }) => {
      if (!mounted || !btnRef.current) return;

      const toggleState = async () => {
        if (disabled || !btnRef.current) return;
        
        toggle.dataset.pressed = true;
        toggle.dataset.active = true; // bubble=true in original config
        
        await Promise.allSettled(
          toggle.getAnimations({ subtree: true }).map((a) => a.finished)
        );
        
        const pressed = toggle.matches('[aria-pressed="true"]');
        toggle.__ltAnimating = true;

        gsap.timeline({
          onComplete: () => {
            gsap.delayedCall(0.05, () => {
              if (!btnRef.current) return;
              toggle.dataset.active = false;
              toggle.dataset.pressed = false;
              toggle.__ltAnimating = false;
              const next = !toggle.matches('[aria-pressed="true"]');
              toggle.setAttribute('aria-pressed', String(next));
              if (onChange) onChange(next);
            });
          },
        }).to(toggle, {
          '--complete': pressed ? 0 : 100,
          duration: 0.12,
          delay: 0.18,
        });
      };

      const proxy = document.createElement('div');
      const [drg] = Draggable.create(proxy, {
        allowContextMenu: true,
        handle: toggle,

        onDragStart: function () {
          if (disabled) return;
          const toggleBounds = toggle.getBoundingClientRect();
          const pressed = toggle.matches('[aria-pressed="true"]');
          const bounds = pressed
            ? toggleBounds.left - this.pointerX
            : toggleBounds.left + toggleBounds.width - this.pointerX;
          this.dragBounds = bounds;
          toggle.dataset.active = true;
        },

        onDrag: function () {
          if (disabled) return;
          const pressed = toggle.matches('[aria-pressed="true"]');
          const dragged = this.x - this.startX;
          const complete = gsap.utils.clamp(
            0,
            100,
            pressed
              ? gsap.utils.mapRange(this.dragBounds, 0, 0, 100, dragged)
              : gsap.utils.mapRange(0, this.dragBounds, 0, 100, dragged)
          );
          this.complete = complete;
          gsap.set(toggle, {
            '--complete': complete,
            '--delta': Math.min(Math.abs(this.deltaX), 12),
          });
        },

        onDragEnd: function () {
          if (disabled) return;
          toggle.__ltAnimating = true;
          gsap.fromTo(
            toggle,
            { '--complete': this.complete },
            {
              '--complete': this.complete >= 50 ? 100 : 0,
              duration: 0.15,
              onComplete: () => {
                gsap.delayedCall(0.05, () => {
                  if (!btnRef.current) return;
                  toggle.dataset.active = false;
                  toggle.__ltAnimating = false;
                  const next = this.complete >= 50;
                  toggle.setAttribute('aria-pressed', String(next));
                  if (onChange) onChange(next);
                });
              },
            }
          );
        },

        onPress: function () {
          this.__pressTime = Date.now();
          if ('ontouchstart' in window && navigator.maxTouchPoints > 0) {
            toggle.dataset.active = true;
          }
        },

        onRelease: function () {
          this.__releaseTime = Date.now();
          gsap.set(toggle, { '--delta': 0 });
          if (
            'ontouchstart' in window &&
            navigator.maxTouchPoints > 0 &&
            ((this.startX !== undefined &&
              this.endX !== undefined &&
              Math.abs(this.endX - this.startX) < 4) ||
              this.endX === undefined)
          ) {
            toggle.dataset.active = false;
          }
          if (this.__releaseTime - this.__pressTime <= 150) {
            toggleState();
          }
        },
      });

      const onKeyDown = (e) => {
        if (e.key === 'Enter') toggleState();
        if (e.key === ' ') e.preventDefault();
      };
      const onKeyUp = (e) => {
        if (e.key === ' ') toggleState();
      };
      
      toggle.addEventListener('keydown', onKeyDown);
      toggle.addEventListener('keyup', onKeyUp);

      cleanup = () => {
        if (drg && drg.kill) drg.kill();
        toggle.removeEventListener('keydown', onKeyDown);
        toggle.removeEventListener('keyup', onKeyUp);
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
      className="liquid-toggle"
      disabled={disabled}
      data-active="false"
      data-pressed="false"
    >
      <div className="knockout">
        <div className="indicator indicator--masked">
          <div className="mask"></div>
        </div>
      </div>
      <div className="indicator__liquid">
        <div className="shadow"></div>
        <div className="wrapper">
          <div className="liquids">
            <div className="liquid__shadow"></div>
            <div className="liquid__track"></div>
          </div>
        </div>
        <div className="cover"></div>
      </div>
    </button>
  );
}
