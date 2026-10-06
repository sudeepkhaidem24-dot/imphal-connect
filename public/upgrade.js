/* Imphal Connect — 2026 UX/performance layer */
(() => {
  'use strict';
  const root = document.documentElement;
  const body = document.body;
  root.classList.add('ic-ux-ready');

  const style = document.createElement('style');
  style.textContent = `
    :root{scroll-behavior:smooth;--ic-ease:cubic-bezier(.22,1,.36,1)}
    *{box-sizing:border-box}
    html,body{overscroll-behavior-x:none}
    body{-webkit-tap-highlight-color:transparent}
    button,a,input,select,textarea,[role="button"]{touch-action:manipulation}
    button,a{transition:transform .16s var(--ic-ease),box-shadow .16s var(--ic-ease),opacity .16s ease}
    button:active,a:active{transform:scale(.975)}
    button:disabled{cursor:not-allowed;opacity:.58}
    :focus-visible{outline:3px solid rgba(8,121,209,.3);outline-offset:3px}
    #ic-progress{position:fixed;z-index:2147483646;left:0;top:0;height:3px;width:0;background:linear-gradient(90deg,#0879d1,#00b8a9,#f2b84b);box-shadow:0 0 14px rgba(8,121,209,.55);pointer-events:none;transition:width .12s ease}
    .ic-reveal{opacity:0;transform:translateY(14px);transition:opacity .65s var(--ic-ease),transform .65s var(--ic-ease)}
    .ic-reveal.ic-visible{opacity:1;transform:none}
    .ic-glass-nav{backdrop-filter:blur(18px) saturate(150%);-webkit-backdrop-filter:blur(18px) saturate(150%);box-shadow:0 8px 30px rgba(7,54,93,.08)}
    .ic-ripple{position:fixed;border-radius:999px;pointer-events:none;z-index:2147483645;background:rgba(255,255,255,.48);transform:scale(0);animation:ic-ripple .55s ease-out forwards}
    @keyframes ic-ripple{to{transform:scale(1);opacity:0}}
    #ic-top{position:fixed;right:16px;bottom:86px;width:44px;height:44px;border:0;border-radius:50%;z-index:2000;background:rgba(7,54,93,.92);color:#fff;font-size:18px;box-shadow:0 10px 28px rgba(7,54,93,.22);opacity:0;pointer-events:none;transform:translateY(12px);transition:.25s var(--ic-ease)}
    #ic-top.show{opacity:1;pointer-events:auto;transform:none}
    .ic-skeleton{position:relative;overflow:hidden;background:#edf5f8!important;color:transparent!important}
    .ic-skeleton:after{content:"";position:absolute;inset:0;transform:translateX(-100%);background:linear-gradient(90deg,transparent,rgba(255,255,255,.72),transparent);animation:ic-shimmer 1.2s infinite}
    @keyframes ic-shimmer{100%{transform:translateX(100%)}}
    @media(prefers-reduced-motion:reduce){*,*:before,*:after{scroll-behavior:auto!important;animation-duration:.001ms!important;transition-duration:.001ms!important}}
  `;
  document.head.appendChild(style);

  const progress = document.createElement('div');
  progress.id = 'ic-progress';
  body.appendChild(progress);

  const top = document.createElement('button');
  top.id = 'ic-top';
  top.type = 'button';
  top.setAttribute('aria-label','Back to top');
  top.textContent = '↑';
  top.onclick = () => window.scrollTo({top:0,behavior:'smooth'});
  body.appendChild(top);

  const updateScroll = () => {
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    progress.style.width = Math.min(100, scrollY / max * 100) + '%';
    top.classList.toggle('show', scrollY > 700);
  };
  addEventListener('scroll', updateScroll, {passive:true});
  updateScroll();

  // Fast touch feedback without blocking the app's existing click handlers.
  document.addEventListener('pointerdown', e => {
    const el = e.target.closest('button,a,[role="button"]');
    if (!el || el.disabled) return;
    const r = el.getBoundingClientRect();
    const size = Math.max(r.width, r.height, 34);
    const ripple = document.createElement('i');
    ripple.className = 'ic-ripple';
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - size/2) + 'px';
    ripple.style.top = (e.clientY - size/2) + 'px';
    body.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  }, {passive:true});

  // Smooth reveal for large content sections as they enter the viewport.
  const reveal = () => {
    document.querySelectorAll('section, .section, .card, .feature, .offer, .plan, .story-bubble').forEach(el => {
      if (!el.dataset.icReveal) { el.dataset.icReveal='1'; el.classList.add('ic-reveal'); observer.observe(el); }
    });
  };
  const observer = new IntersectionObserver(entries => entries.forEach(x => {
    if (x.isIntersecting) { x.target.classList.add('ic-visible'); observer.unobserve(x.target); }
  }), {rootMargin:'0px 0px -8% 0px',threshold:.01});

  const refresh = () => {
    reveal();
    const candidates = document.querySelectorAll('header,nav,.topbar,.bottom-nav,.nav,.header');
    candidates.forEach(el => { if (el.getBoundingClientRect().height > 0) el.classList.add('ic-glass-nav'); });
  };
  refresh();
  new MutationObserver(() => requestAnimationFrame(refresh)).observe(body,{childList:true,subtree:true});

  // Make common icon-only controls accessible without changing their existing handlers.
  document.querySelectorAll('button').forEach(btn => {
    if (!btn.getAttribute('aria-label') && !btn.textContent.trim()) btn.setAttribute('aria-label','Open');
  });

  // Escape closes the active sheet/modal when the existing app exposes a close control.
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const close = document.querySelector('#sheet button, .modal button[aria-label*="close" i], [role="dialog"] button');
    if (close) close.click();
  });

  // Prevent accidental double submits on forms while preserving existing handlers.
  document.addEventListener('submit', e => {
    const form = e.target;
    const button = form.querySelector('button[type="submit"]');
    if (!button || form.dataset.icSubmitting) return;
    form.dataset.icSubmitting = '1';
    setTimeout(() => { delete form.dataset.icSubmitting; }, 1800);
  }, true);

  window.addEventListener('load', () => {
    progress.style.opacity='0';
    setTimeout(()=>progress.remove(),350);
  }, {once:true});
})();
