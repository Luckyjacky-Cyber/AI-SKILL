(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(pointer: fine)');
  const canvas = document.createElement('canvas');
  canvas.className = 'starfield';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');
  const toggle = document.createElement('button');
  toggle.className = 'motion-toggle';
  toggle.type = 'button';
  document.querySelector('header').append(toggle);
  let paused = reduced.matches;
  let frame = 0, previous = 0, elapsed = 0, burst = 0;
  let width = 0, height = 0, stars = [];
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const animations = new Set();
  const running = () => !paused && !reduced.matches && !document.hidden;

  function resize() {
    width = innerWidth; height = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = Array.from({ length: width < 600 ? 42 : 105 }, () => ({
      x: Math.random() * width, y: Math.random() * height,
      z: .25 + Math.random() * .75, phase: Math.random() * Math.PI * 2
    }));
    if (!running() && ctx) ctx.clearRect(0, 0, width, height);
  }

  function draw(now) {
    frame = 0;
    if (!running()) return;
    const dt = previous ? Math.min((now - previous) / 1000, .05) : 0;
    previous = now; elapsed += dt; burst = Math.max(0, burst - dt * 1.25);
    const ease = 1 - Math.exp(-dt * 4);
    pointer.x += (pointer.tx - pointer.x) * ease;
    pointer.y += (pointer.ty - pointer.y) * ease;
    document.body.style.setProperty('--drift-x', `${pointer.x * 13}px`);
    document.body.style.setProperty('--drift-y', `${pointer.y * 9}px`);
    if (ctx) {
      ctx.clearRect(0, 0, width, height);
      for (const star of stars) {
        const speed = (5 + burst * 85) * star.z;
        star.x -= dt * speed; star.y += dt * speed * .2;
        if (star.x < -20) { star.x = width + 20; star.y = Math.random() * height; }
        if (star.y > height + 20) star.y = -20;
        const x = star.x - pointer.x * star.z * 10;
        const y = star.y - pointer.y * star.z * 8;
        const alpha = (.2 + star.z * .4) * (.7 + .3 * Math.sin(elapsed * .7 + star.phase));
        ctx.fillStyle = `rgba(184,231,250,${alpha})`;
        ctx.beginPath(); ctx.arc(x, y, .45 + star.z * .8, 0, Math.PI * 2); ctx.fill();
        if (burst > .1) {
          ctx.strokeStyle = `rgba(166,224,249,${alpha * burst * .45})`;
          ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(x, y);
          ctx.lineTo(x + burst * star.z * 30, y - burst * star.z * 6); ctx.stroke();
        }
      }
    }
    frame = requestAnimationFrame(draw);
  }

  function sync() {
    const off = paused || reduced.matches;
    document.body.classList.toggle('motion-paused', off);
    document.body.classList.toggle('motion-hidden', document.hidden);
    toggle.textContent = off ? '开启动态' : '暂停动态';
    toggle.setAttribute('aria-label', off ? '开启动画特效' : '暂停动画特效');
    toggle.setAttribute('aria-pressed', String(!off));
    toggle.disabled = reduced.matches;
    toggle.title = reduced.matches ? '已遵循系统的减少动态效果设置' : '';
    if (frame) cancelAnimationFrame(frame);
    frame = 0; previous = 0;
    if (off) {
      burst = 0; pointer.x = pointer.y = pointer.tx = pointer.ty = 0;
      document.body.style.setProperty('--drift-x', '0px');
      document.body.style.setProperty('--drift-y', '0px');
      for (const animation of animations) animation.cancel();
      animations.clear();
      if (ctx) ctx.clearRect(0, 0, width, height);
    }
    if (running()) frame = requestAnimationFrame(draw);
  }

  toggle.addEventListener('click', () => { paused = !paused; sync(); });
  reduced.addEventListener('change', () => { paused = reduced.matches; sync(); });
  document.addEventListener('visibilitychange', sync);
  addEventListener('resize', resize, { passive: true });
  addEventListener('pointermove', event => {
    if (!running() || !finePointer.matches || event.pointerType === 'touch') return;
    pointer.tx = Math.max(-1, Math.min(1, event.clientX / width * 2 - 1));
    pointer.ty = Math.max(-1, Math.min(1, event.clientY / height * 2 - 1));
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { pointer.tx = pointer.ty = 0; });
  new MutationObserver(() => {
    if (!running()) return;
    burst = 1;
    for (const animation of animations) animation.cancel();
    animations.clear();
    document.querySelectorAll('#chapter, #headline, #intro, #log-text').forEach((element, index) => {
      const animation = element.animate([
        { opacity: 0, transform: 'translateY(12px)', filter: 'blur(4px)' },
        { opacity: 1, transform: 'translateY(0)', filter: 'blur(0)' }
      ], { duration: 650, delay: index * 45, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
      animations.add(animation);
      animation.onfinish = () => animations.delete(animation);
    });
  }).observe(document.body, { attributes: true, attributeFilter: ['data-chapter'] });
  resize(); sync();
})();
