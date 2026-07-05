/* ============================================================
   ILMAK — interactions
   - Canvas particle vortex (hero background) + loader sphere
   - Loader sequence
   - Scroll blur-in reveals
   - Auto-rotating 3D carousel (smooth, non-snap)
   - EN/AR i18n toggle with RTL + localStorage
   - Glassy gradient SVG feature icons
   ============================================================ */
(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TAU = Math.PI * 2;

  /* ---------------------------------------------------------
     0. Glassy SVG icons (purple/pink, specular highlight + glow)
     --------------------------------------------------------- */
  function glassIcon(paths) {
    const uid = "g" + Math.random().toString(36).slice(2, 8);
    return `
    <svg viewBox="0 0 100 100" role="img" aria-hidden="true">
      <defs>
        <linearGradient id="${uid}f" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#c4b5fd"/>
          <stop offset=".5" stop-color="#a855f7"/>
          <stop offset="1" stop-color="#ec4899"/>
        </linearGradient>
        <linearGradient id="${uid}g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ffffff" stop-opacity=".55"/>
          <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
        </linearGradient>
        <filter id="${uid}b" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.4"/>
        </filter>
      </defs>
      <g fill="none" stroke="url(#${uid}f)" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        ${paths}
      </g>
      <g fill="none" stroke="url(#${uid}g)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity=".9" transform="translate(-1.2,-1.4)">
        ${paths}
      </g>
    </svg>`;
  }

  const ICONS = {
    teacher:   glassIcon('<path d="M50 20 82 34 50 48 18 34 50 20Z"/><path d="M30 40v14c0 6 9 11 20 11s20-5 20-11V40"/><path d="M82 34v16"/>'),
    segment:   glassIcon('<path d="M26 22h34a8 8 0 0 1 8 8v48"/><path d="M26 22v56h34a8 8 0 0 0 8-8"/><path d="M40 40h16M40 52h16M40 64h10"/>'),
    cards:     glassIcon('<rect x="22" y="30" width="42" height="30" rx="4" transform="rotate(-8 43 45)"/><rect x="34" y="40" width="42" height="30" rx="4" transform="rotate(6 55 55)"/><path d="M46 54h16"/>'),
    quiz:      glassIcon('<path d="M50 22a14 14 0 0 1 14 14c0 9-14 11-14 20"/><circle cx="50" cy="74" r="2.4" fill="url(#g)"/><path d="M50 74h.01"/>'),
    keynote:   glassIcon('<path d="M28 24h44M28 40h44M28 56h30M28 72h20"/><path d="M64 62l6 6 12-14"/>'),
    worksheet: glassIcon('<rect x="26" y="20" width="48" height="60" rx="6"/><path d="M38 38h24M38 50h24M38 62h14"/><path d="M60 62l6 6 12-13"/>'),
    laws:      glassIcon('<path d="M22 78h56"/><path d="M30 78V52M46 78V38M62 78V58M78 78V30"/>'),
    focus:     glassIcon('<circle cx="50" cy="50" r="26"/><circle cx="50" cy="50" r="4" fill="url(#g)"/><path d="M50 24V16M50 84v-8M24 50h-8M84 50h-8"/>'),
    library:   glassIcon('<path d="M28 24h12v56H28zM44 24h12v56H44z"/><path d="M60 26l12 3-10 51-12-3"/>')
  };

  document.querySelectorAll("[data-icon]").forEach((el) => {
    const key = el.getAttribute("data-icon");
    if (ICONS[key]) el.innerHTML = ICONS[key];
  });

  /* ---------------------------------------------------------
     1. Particle systems (loader sphere + hero vortex)
     --------------------------------------------------------- */
  const PALETTE = [
    [196, 181, 253], // lavender
    [168, 85, 247],  // violet
    [139, 92, 246],  // purple
    [236, 72, 153],  // pink
    [249, 168, 212]  // soft pink
  ];

  function makeField(canvas, opts) {
    const ctx = canvas.getContext("2d", { alpha: true });
    let W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);
    const count = opts.count;
    const pts = [];

    for (let i = 0; i < count; i++) {
      // distribute on/near a sphere shell for the swirl look
      const theta = Math.acos(2 * Math.random() - 1);
      const phi = Math.random() * TAU;
      const r = opts.radius * (0.72 + Math.random() * 0.5);
      pts.push({
        x: Math.sin(theta) * Math.cos(phi) * r,
        y: Math.cos(theta) * r * opts.flatten,
        z: Math.sin(theta) * Math.sin(phi) * r,
        c: PALETTE[(Math.random() * PALETTE.length) | 0],
        s: 0.5 + Math.random() * 1.4,
        tw: Math.random() * TAU
      });
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      W = rect.width; H = rect.height;
      canvas.width = W * DPR; canvas.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    let rot = 0, mx = 0, my = 0, raf = 0, running = true;
    if (opts.parallax) {
      window.addEventListener("pointermove", (e) => {
        mx = (e.clientX / window.innerWidth - 0.5);
        my = (e.clientY / window.innerHeight - 0.5);
      }, { passive: true });
    }

    function frame() {
      raf = requestAnimationFrame(frame);
      ctx.clearRect(0, 0, W, H);
      rot += reduceMotion ? 0 : opts.speed;

      const cx = W / 2 + (opts.parallax ? mx * 40 : 0);
      const cy = H * opts.cy + (opts.parallax ? my * 30 : 0);
      const cosR = Math.cos(rot), sinR = Math.sin(rot);
      const tiltC = Math.cos(opts.tilt), tiltS = Math.sin(opts.tilt);
      const focal = opts.focal;

      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        // rotate around Y
        let x = p.x * cosR - p.z * sinR;
        let z = p.x * sinR + p.z * cosR;
        // tilt around X
        let y = p.y * tiltC - z * tiltS;
        z = p.y * tiltS + z * tiltC;

        const depth = focal / (focal + z);
        if (depth <= 0) continue;
        const sx = cx + x * depth;
        const sy = cy + y * depth;

        p.tw += 0.03;
        const tw = reduceMotion ? 0.8 : (0.55 + 0.45 * Math.sin(p.tw));
        const alpha = Math.max(0, Math.min(1, (depth - 0.45) * 1.3)) * tw * opts.alpha;
        if (alpha <= 0.01) continue;

        const size = p.s * depth * opts.scale;
        ctx.beginPath();
        ctx.fillStyle = `rgba(${p.c[0]},${p.c[1]},${p.c[2]},${alpha})`;
        ctx.arc(sx, sy, size, 0, TAU);
        ctx.fill();
      }
    }
    frame();

    return {
      stop() { running = false; cancelAnimationFrame(raf); },
      canvas
    };
  }

  // hero vortex (fixed bg)
  const fx = document.getElementById("fx");
  if (fx) {
    makeField(fx, {
      count: window.innerWidth < 640 ? 900 : 1700,
      radius: Math.min(window.innerWidth, 900) * 0.42,
      flatten: 1.0, speed: 0.0016, tilt: 0.5, focal: 620,
      cy: 0.42, alpha: 1, scale: 1, parallax: true
    });
    requestAnimationFrame(() => fx.classList.add("is-on"));
  }

  /* ---------------------------------------------------------
     2. Loader sequence
     --------------------------------------------------------- */
  const loader = document.getElementById("loader");
  const loaderCanvas = document.getElementById("loaderCanvas");
  const loaderBar = document.getElementById("loaderBar");
  let loaderField = null;

  if (loaderCanvas) {
    loaderField = makeField(loaderCanvas, {
      count: 620, radius: 150, flatten: 1, speed: 0.006, tilt: 0.4,
      focal: 500, cy: 0.5, alpha: 1, scale: 1, parallax: false
    });
  }

  function dismissLoader() {
    if (!loader || loader.classList.contains("is-done")) return;
    let pct = 0;
    const tick = setInterval(() => {
      pct += Math.random() * 22;
      if (pct >= 100) { pct = 100; clearInterval(tick); finish(); }
      if (loaderBar) loaderBar.style.width = pct + "%";
    }, 130);

    function finish() {
      setTimeout(() => {
        loader.classList.add("is-done");
        document.body.classList.remove("is-locked");
        if (loaderField) setTimeout(() => loaderField.stop(), 900);
      }, 250);
    }
  }

  document.body.classList.add("is-locked");
  if (reduceMotion) {
    if (loaderBar) loaderBar.style.width = "100%";
    setTimeout(dismissLoader, 300);
  } else {
    // Dismiss as soon as the DOM is ready — do NOT wait on window.load, which
    // blocks on fonts/images and can hang on a weak connection.
    if (document.readyState === "interactive" || document.readyState === "complete") {
      setTimeout(dismissLoader, 500);
    } else {
      document.addEventListener("DOMContentLoaded", () => setTimeout(dismissLoader, 400));
    }
    // hard safety cap: never trap the user behind the loader
    setTimeout(dismissLoader, 1800);
  }

  /* ---------------------------------------------------------
     3. Nav stuck state
     --------------------------------------------------------- */
  const nav = document.getElementById("nav");
  const onScroll = () => nav && nav.classList.toggle("is-stuck", window.scrollY > 40);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------------------------------------------------------
     4. Scroll blur-in reveals
     --------------------------------------------------------- */
  // split .reveal-lines headings into words
  document.querySelectorAll(".reveal-lines").forEach((el) => {
    const text = el.textContent.trim();
    el.textContent = "";
    text.split(/\s+/).forEach((w, i) => {
      const span = document.createElement("span");
      span.className = "rl-word";
      span.textContent = w;
      span.style.transitionDelay = (i * 45) + "ms";
      el.appendChild(span);
    });
  });

  const heroWords = document.querySelectorAll(".hero__title .reveal-word");
  heroWords.forEach((w, i) => {
    w.classList.add("js-reveal");
    w.style.transitionDelay = (120 + i * 110) + "ms";
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("is-revealed"); io.unobserve(e.target); }
    });
  }, { threshold: 0.25 });

  document.querySelectorAll(".reveal-lines").forEach((el) => io.observe(el));
  // reveal hero words shortly after loader
  function revealHero() { heroWords.forEach((w) => w.classList.add("is-revealed")); }
  setTimeout(revealHero, reduceMotion ? 0 : 900);

  /* ---------------------------------------------------------
     5. 3D auto-rotating carousel (smooth, non-snap)
     --------------------------------------------------------- */
  const stage = document.getElementById("carouselStage");
  const cards = stage ? Array.from(stage.querySelectorAll(".card")) : [];
  const nowEl = document.getElementById("carouselNow");
  const N = cards.length;
  const STEP = 360 / N; // 40deg for 9

  if (stage && N) {
    if (reduceMotion) {
      stage.classList.add("no-3d");
    } else {
      let radius = 0;
      function computeRadius() {
        const cardW = cards[0].offsetWidth || 300;
        const vw = window.innerWidth;
        // enough radius so neighbours don't overlap; scale down on mobile
        const base = (cardW / 2) / Math.tan(Math.PI / N);
        radius = Math.max(base * 1.02, vw < 560 ? 300 : 430);
        stage.style.setProperty("--radius", radius + "px");
      }
      computeRadius();
      window.addEventListener("resize", computeRadius);

      let angle = 0;                 // current rotation (deg)
      let velocity = 0;              // deg/frame from drag inertia
      const auto = 0.10;             // steady auto-rotate deg/frame (~6deg/s)
      let dragging = false, paused = false;
      let lastX = 0, lastT = 0;

      function place() {
        for (let i = 0; i < N; i++) {
          const cardAngle = i * STEP + angle;
          cards[i].style.transform =
            `translate(-50%,-50%) rotateY(${cardAngle}deg) translateZ(${radius}px)`;
          // depth cue: normalize angle to [-180,180]
          let a = ((cardAngle % 360) + 540) % 360 - 180;
          const facing = Math.cos(a * Math.PI / 180); // 1 = front, -1 = back
          const opacity = 0.35 + 0.65 * (facing * 0.5 + 0.5);
          cards[i].style.opacity = opacity.toFixed(3);
          cards[i].style.zIndex = String(Math.round(facing * 100));
          cards[i].classList.toggle("is-front", a > -STEP / 2 && a <= STEP / 2);
        }
        // active index = card closest to front (angle 0)
        const idx = ((Math.round(-angle / STEP) % N) + N) % N;
        if (nowEl) nowEl.textContent = String(idx + 1).padStart(2, "0");
      }

      function loop() {
        requestAnimationFrame(loop);
        if (!dragging) {
          if (Math.abs(velocity) > 0.02) {
            angle += velocity;
            velocity *= 0.94; // inertia decay
          } else if (!paused) {
            angle += auto;
          }
        }
        place();
      }
      loop();

      // pause on hover / focus within
      stage.addEventListener("pointerenter", () => { paused = true; });
      stage.addEventListener("pointerleave", () => { if (!dragging) paused = false; });
      const carouselEl = document.getElementById("carousel");
      carouselEl.addEventListener("focusin", () => { paused = true; });
      carouselEl.addEventListener("focusout", () => { paused = false; });

      // drag to spin
      stage.addEventListener("pointerdown", (e) => {
        dragging = true; paused = true; lastX = e.clientX; lastT = performance.now();
        velocity = 0; stage.setPointerCapture(e.pointerId);
        stage.style.cursor = "grabbing";
      });
      stage.addEventListener("pointermove", (e) => {
        if (!dragging) return;
        const dx = e.clientX - lastX;
        const now = performance.now();
        const dt = Math.max(1, now - lastT);
        const dA = dx * 0.35;
        angle += dA;
        velocity = dA * (16 / dt); // carry momentum
        lastX = e.clientX; lastT = now;
      });
      function endDrag(e) {
        if (!dragging) return;
        dragging = false;
        try { stage.releasePointerCapture(e.pointerId); } catch (_) {}
        stage.style.cursor = "grab";
        // resume auto after a beat
        setTimeout(() => { paused = false; }, 200);
      }
      stage.addEventListener("pointerup", endDrag);
      stage.addEventListener("pointercancel", endDrag);
      stage.style.cursor = "grab";

      // arrows nudge exactly one card, smoothly
      function nudge(dir) {
        const target = angle - dir * STEP;
        paused = true;
        const start = angle, t0 = performance.now(), dur = 520;
        (function anim() {
          const t = Math.min(1, (performance.now() - t0) / dur);
          const e = 1 - Math.pow(1 - t, 3); // easeOutCubic
          angle = start + (target - start) * e;
          if (t < 1) requestAnimationFrame(anim);
          else setTimeout(() => { paused = false; }, 400);
        })();
      }
      const prev = document.getElementById("prevBtn");
      const next = document.getElementById("nextBtn");
      if (prev) prev.addEventListener("click", () => nudge(-1));
      if (next) next.addEventListener("click", () => nudge(1));
    }
  }

  /* ---------------------------------------------------------
     6. i18n toggle (EN / AR) with RTL + localStorage
     --------------------------------------------------------- */
  const DICT = window.ILMAK_I18N || { en: {}, ar: {} };
  const html = document.documentElement;

  function applyLang(lang) {
    if (!DICT[lang]) lang = "en";
    const table = DICT[lang];
    html.setAttribute("lang", lang);
    html.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    html.setAttribute("data-lang", lang);

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (table[key] != null) el.textContent = table[key];
    });

    // hero: re-apply reveal (textContent reset removes state)
    document.querySelectorAll(".hero__title .reveal-word").forEach((w) => {
      w.classList.add("js-reveal", "is-revealed");
    });
    // re-inject the hero sparkle into first line
    const firstLine = document.querySelector('.hero__title [data-i18n="hero.l1"]');
    if (firstLine && !firstLine.querySelector(".spark")) {
      firstLine.insertAdjacentHTML("afterbegin",
        '<svg class="spark" viewBox="0 0 24 24" width="34" height="34" aria-hidden="true"><defs><linearGradient id="sparkgL" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#C4B5FD"/><stop offset="1" stop-color="#EC4899"/></linearGradient></defs><path d="M12 2l1.9 6.8L20 12l-6.1 3.2L12 22l-1.9-6.8L4 12l6.1-3.2z" fill="url(#sparkgL)"/></svg>');
    }

    document.querySelectorAll(".lang__btn").forEach((b) => {
      b.classList.toggle("is-active", b.getAttribute("data-set-lang") === lang);
    });

    try { localStorage.setItem("ilmak-lang", lang); } catch (_) {}
  }

  document.querySelectorAll(".lang__btn").forEach((btn) => {
    btn.addEventListener("click", () => applyLang(btn.getAttribute("data-set-lang")));
  });

  let saved = "en";
  try { saved = localStorage.getItem("ilmak-lang") || "en"; } catch (_) {}
  if (saved === "ar") applyLang("ar");
})();
