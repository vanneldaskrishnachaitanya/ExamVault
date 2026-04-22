// src/components/LiquidToggle.jsx
// Self-contained liquid-glass toggle — works in the React/Vite app without
// a separate script file. GSAP is loaded from esm.sh via a dynamic import so
// it doesn't need to be in package.json.

import { useEffect, useRef, useId } from 'react';

let gsapPromise = null;
function loadGSAP() {
  if (!gsapPromise) {
    gsapPromise = Promise.all([
      import(/* @vite-ignore */ 'https://esm.sh/gsap@3.13.0'),
      import(/* @vite-ignore */ 'https://esm.sh/gsap@3.13.0/Draggable'),
    ]).then(([gsapMod, DraggableMod]) => {
      const gsap = gsapMod.default;
      const Draggable = DraggableMod.default;
      gsap.registerPlugin(Draggable);
      return { gsap, Draggable };
    });
  }
  return gsapPromise;
}

// We inject the SVG filters once globally
let filtersInjected = false;
function injectSVGFilters() {
  if (filtersInjected) return;
  filtersInjected = true;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'lt-sr-only');
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.innerHTML = `
    <defs>
      <filter id="lt-goo">
        <feGaussianBlur id="lt-blur" result="lt-blur" in="SourceGraphic" stdDeviation="13"></feGaussianBlur>
        <feColorMatrix id="lt-cm" result="lt-cm" in="lt-blur"
          values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 16 -10" type="matrix"></feColorMatrix>
        <feComposite result="lt-comp" in="lt-cm" operator="atop"></feComposite>
      </filter>
      <filter id="lt-knockout" colorInterpolationFilters="sRGB">
        <feColorMatrix result="knocked" type="matrix"
          values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -1 -1 -1 1 0"/>
        <feComponentTransfer>
          <feFuncR type="linear" slope="3" intercept="-1"/>
          <feFuncG type="linear" slope="3" intercept="-1"/>
          <feFuncB type="linear" slope="3" intercept="-1"/>
        </feComponentTransfer>
        <feComponentTransfer>
          <feFuncR type="table" tableValues="0 0 0 0 0 1 1 1 1 1"/>
          <feFuncG type="table" tableValues="0 0 0 0 0 1 1 1 1 1"/>
          <feFuncB type="table" tableValues="0 0 0 0 0 1 1 1 1 1"/>
        </feComponentTransfer>
      </filter>
      <filter id="lt-remove-black" color-interpolation-filters="sRGB">
        <feColorMatrix type="matrix"
          values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -255 -255 -255 0 1" result="bp"/>
        <feMorphology in="bp" operator="dilate" radius="0.5" result="sm"/>
        <feComposite in="SourceGraphic" in2="sm" operator="out"/>
      </filter>
    </defs>
  `;
  document.body.appendChild(svg);
}

export default function LiquidToggle({ checked = false, onChange, disabled = false, label, hue = 144 }) {
  const btnRef   = useRef(null);
  const proxyRef = useRef(null);
  const draggableRef = useRef(null);
  const uid = useId().replace(/:/g, '');

  // Sync CSS custom property whenever `checked` or `hue` changes
  useEffect(() => {
    const btn = btnRef.current;
    if (!btn) return;
    btn.setAttribute('aria-pressed', String(checked));
    btn.style.setProperty('--complete', checked ? '100' : '0');
    btn.style.setProperty('--hue', String(hue));
  }, [checked, hue]);

  useEffect(() => {
    injectSVGFilters();
    const btn = btnRef.current;
    if (!btn) return;

    btn.style.setProperty('--complete', checked ? '100' : '0');
    btn.style.setProperty('--hue', String(hue));

    let mounted = true;
    let cleanupDraggable = null;

    loadGSAP().then(({ gsap, Draggable }) => {
      if (!mounted || !btnRef.current) return;

      const proxy = document.createElement('div');
      proxyRef.current = proxy;

      const toggleState = async () => {
        if (disabled) return;
        btn.dataset.pressed = 'true';
        btn.dataset.active = 'true';

        // small delay for bubble animation
        await new Promise(r => setTimeout(r, 180));

        const isPressed = btn.getAttribute('aria-pressed') === 'true';
        gsap.timeline({
          onComplete: () => {
            setTimeout(() => {
              btn.dataset.active = 'false';
              btn.dataset.pressed = 'false';
              if (onChange) onChange(!isPressed);
            }, 50);
          },
        }).to(btn, {
          '--complete': isPressed ? 0 : 100,
          duration: 0.12,
        });
      };

      const [drg] = Draggable.create(proxy, {
        allowContextMenu: true,
        handle: btn,
        onDragStart: function () {
          if (disabled) return;
          const bounds = btn.getBoundingClientRect();
          const isPressed = btn.getAttribute('aria-pressed') === 'true';
          this.dragBounds = isPressed
            ? bounds.left - this.pointerX
            : bounds.left + bounds.width - this.pointerX;
          btn.dataset.active = 'true';
        },
        onDrag: function () {
          if (disabled) return;
          const isPressed = btn.getAttribute('aria-pressed') === 'true';
          const dragged = this.x - this.startX;
          const complete = gsap.utils.clamp(
            0, 100,
            isPressed
              ? gsap.utils.mapRange(this.dragBounds, 0, 0, 100, dragged)
              : gsap.utils.mapRange(0, this.dragBounds, 0, 100, dragged)
          );
          this.complete = complete;
          gsap.set(btn, { '--complete': complete, '--delta': Math.min(Math.abs(this.deltaX), 12) });
        },
        onDragEnd: function () {
          if (disabled) return;
          const target = this.complete >= 50 ? 100 : 0;
          gsap.fromTo(btn, { '--complete': this.complete }, {
            '--complete': target,
            duration: 0.15,
            onComplete: () => {
              setTimeout(() => {
                btn.dataset.active = 'false';
                const newState = target === 100;
                const wasPressed = btn.getAttribute('aria-pressed') === 'true';
                if (newState !== wasPressed && onChange) onChange(newState);
              }, 50);
            },
          });
        },
        onPress: function () {
          this.__pressTime = Date.now();
          if (!disabled) btn.dataset.active = 'true';
        },
        onRelease: function () {
          this.__releaseTime = Date.now();
          gsap.set(btn, { '--delta': 0 });
          if (this.__releaseTime - this.__pressTime <= 150) {
            toggleState();
          }
        },
      });

      cleanupDraggable = () => {
        if (drg && drg.kill) drg.kill();
      };

      // Keyboard
      const onKeyDown = (e) => {
        if (e.key === 'Enter') toggleState();
        if (e.key === ' ') e.preventDefault();
      };
      const onKeyUp = (e) => {
        if (e.key === ' ') toggleState();
      };
      btn.addEventListener('keydown', onKeyDown);
      btn.addEventListener('keyup', onKeyUp);

      cleanupDraggable = () => {
        if (drg && drg.kill) drg.kill();
        btn.removeEventListener('keydown', onKeyDown);
        btn.removeEventListener('keyup', onKeyUp);
      };
    });

    return () => {
      mounted = false;
      if (cleanupDraggable) cleanupDraggable();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);

  return (
    <div className="lt-wrapper" aria-label={label} title={label}>
      <button
        ref={btnRef}
        aria-label={label || 'toggle'}
        aria-pressed={checked ? 'true' : 'false'}
        className="lt-btn"
        disabled={disabled}
        data-active="false"
        data-pressed="false"
        tabIndex={0}
      >
        {/* Knockout layer */}
        <div className="lt-knockout">
          <div className="lt-indicator lt-indicator--masked">
            <div className="lt-mask"></div>
          </div>
        </div>

        {/* Liquid layer */}
        <div className="lt-indicator__liquid">
          <div className="lt-shadow"></div>
          <div className="lt-liquid-wrapper">
            <div className="lt-liquids">
              <div className="lt-liquid__shadow"></div>
              <div className="lt-liquid__track"></div>
            </div>
          </div>
          <div className="lt-cover"></div>
        </div>
      </button>
    </div>
  );
}
