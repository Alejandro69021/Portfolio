/**
 * motion.ts — Fase 1 motion logic (vanilla JS, no library)
 * Re-runs on astro:page-load for View Transitions compatibility.
 */

// ── Utility: reduced-motion guard ──────────────────────────────────────────
const prefersReduced = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── M12: Page Loader (first session visit only) ────────────────────────────
function initLoader() {
  const loader = document.getElementById('page-loader');
  if (!loader) return;
  if (sessionStorage.getItem('visited')) {
    loader.classList.add('done');
    return;
  }
  sessionStorage.setItem('visited', '1');
  setTimeout(() => loader.classList.add('done'), 550);
}

// ── M4: Scroll progress bar ────────────────────────────────────────────────
function initScrollProgress() {
  const bar = document.getElementById('scroll-progress');
  if (!bar) return;
  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = max > 0 ? `${(window.scrollY / max) * 100}%` : '0%';
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
}

// ── M4: Navbar shrink on scroll ────────────────────────────────────────────
function initNavbarShrink() {
  const header = document.getElementById('site-header');
  if (!header) return;
  const toggle = () => header.classList.toggle('scrolled', window.scrollY > 40);
  window.addEventListener('scroll', toggle, { passive: true });
  toggle();
}

// ── M4: Scrollspy ──────────────────────────────────────────────────────────
function initScrollspy() {
  const navLinks = document.querySelectorAll<HTMLAnchorElement>('a.nav-link[href^="#"]');
  if (!navLinks.length) return;

  const sectionIds = Array.from(navLinks).map(a => a.getAttribute('href')!.slice(1));
  const sections = sectionIds
    .map(id => document.getElementById(id))
    .filter(Boolean) as HTMLElement[];

  const spy = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          navLinks.forEach(a => a.classList.remove('nav-active'));
          document.querySelectorAll<HTMLAnchorElement>(`a.nav-link[href="#${entry.target.id}"]`)
            .forEach(a => a.classList.add('nav-active'));
        }
      });
    },
    { rootMargin: '-40% 0px -55% 0px' }
  );

  sections.forEach(s => spy.observe(s));
}

// ── Attribute-based Scroll Reveal System (data-reveal, data-stagger, data-delay) ──
function initAttributeScrollReveal() {
  document.documentElement.classList.add('js');

  const reveals = document.querySelectorAll<HTMLElement>('[data-reveal]');
  const skillBars = document.querySelectorAll<HTMLElement>('.skill-bar-fill');
  const staggerContainers = document.querySelectorAll<HTMLElement>('[data-stagger]');

  if (!reveals.length && !skillBars.length && !staggerContainers.length) return;

  // Progressive enhancement & accessibility guard
  if (prefersReduced() || !('IntersectionObserver' in window)) {
    reveals.forEach(el => el.classList.add('is-revealed'));
    skillBars.forEach(el => el.classList.add('is-revealed'));
    return;
  }

  // Safety fallback: ensure nothing stays hidden permanently if observer is delayed/blocked
  setTimeout(() => {
    document.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-revealed), .skill-bar-fill:not(.is-revealed)')
      .forEach(el => el.classList.add('is-revealed'));
  }, 4000);

  // 1. Observe containers with data-stagger
  staggerContainers.forEach(container => {
    const staggerMs = parseInt(container.dataset.stagger || '80', 10);
    const isGallery = container.id === 'gallery-grid' || container.classList.contains('gallery-grid');

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            obs.unobserve(entry.target);

            if (container.hasAttribute('data-reveal')) {
              container.classList.add('is-revealed');
            }

            const targets = container.querySelectorAll<HTMLElement>('[data-reveal], .skill-bar-fill');
            targets.forEach((target, index) => {
              let delay = 0;
              if (target.dataset.delay) {
                delay = parseInt(target.dataset.delay, 10);
              } else if (isGallery) {
                // Maksimal 8 kartu beranimasi stagger sekaligus, sisanya langsung tampil
                delay = index < 8 ? index * staggerMs : 0;
              } else {
                delay = index * staggerMs;
              }

              if (delay > 0) {
                target.style.transitionDelay = `${delay}ms`;
              }
              target.classList.add('is-revealed');
            });
          }
        });
      },
      { threshold: 0.05, rootMargin: '0px 0px -30px 0px' }
    );

    observer.observe(container);
  });

  // 2. Observe standalone [data-reveal] elements not inside a data-stagger container
  reveals.forEach(el => {
    if (el.closest('[data-stagger]')) return;

    if (el.dataset.delay) {
      el.style.transitionDelay = `${el.dataset.delay}ms`;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            obs.unobserve(entry.target);
            el.classList.add('is-revealed');
          }
        });
      },
      { threshold: 0.05, rootMargin: '0px 0px -30px 0px' }
    );

    observer.observe(el);
  });

  // 3. Standalone skill bars not inside data-stagger
  skillBars.forEach((bar, index) => {
    if (bar.closest('[data-stagger]')) return;

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            obs.unobserve(entry.target);
            bar.style.transitionDelay = `${index * 80}ms`;
            bar.classList.add('is-revealed');
          }
        });
      },
      { threshold: 0.05, rootMargin: '0px 0px -30px 0px' }
    );

    observer.observe(bar);
  });
}

// ── M2: Legacy Scroll reveal (IntersectionObserver, one-shot) ─────────────
function initScrollReveal() {
  const els = document.querySelectorAll('.reveal, .reveal-stagger');
  if (!els.length) return;

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );

  els.forEach(el => observer.observe(el));
}

// ── M3: Hero 3-Column Split Face & Hover Interaction ────────────────────────
function initHero() {
  const heroSection = document.getElementById('hero');
  if (!heroSection) return;

  const colLeft       = heroSection.querySelector<HTMLElement>('.hero-col-left');
  const colRight      = heroSection.querySelector<HTMLElement>('.hero-col-right');
  const imgFace       = document.getElementById('hero-face');
  const faceContainer = document.getElementById('hero-face-container');
  const btnSains      = document.getElementById('hero-btn-sains');
  const btnTekno      = document.getElementById('hero-btn-tekno');
  const btnReset      = document.getElementById('hero-btn-reset');
  const reduced       = prefersReduced();

  // 1. Load animation (State D): halves slide in from edges, then text columns fade up
  // hero-loading carries the transition-delay for initial entry; removed after animation completes
  // so hover return transitions are not delayed
  if (reduced) {
    heroSection.classList.add('hero-joined');
  } else {
    heroSection.classList.add('hero-loading');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        heroSection.classList.add('hero-joined');
        // Remove hero-loading after columns have faded in (~1550ms = 750ms delay + ~600ms transition + buffer)
        setTimeout(() => { heroSection.classList.remove('hero-loading'); }, 1600);
      });
    });
  }

  // 2. Hover/touch helpers — toggle class on #hero so CSS handles all visuals
  let currentSide: 'left' | 'right' | null = null;
  const setHover = (side: 'left' | 'right' | null) => {
    currentSide = side;
    heroSection.classList.remove('hero-hover-left', 'hero-hover-right');
    if (side) heroSection.classList.add(`hero-hover-${side}`);
  };

  // Desktop: mouseenter / mouseleave on each text column
  colLeft?.addEventListener('mouseenter',  () => setHover('left'));
  colLeft?.addEventListener('mouseleave',  () => setHover(null));
  colRight?.addEventListener('mouseenter', () => setHover('right'));
  colRight?.addEventListener('mouseleave', () => setHover(null));

  // Touch / Click toggle helper: toggles side or resets if already selected
  const toggleSide = (side: 'left' | 'right') => {
    if (currentSide === side) {
      setHover(null);
    } else {
      setHover(side);
    }
  };

  colLeft?.addEventListener('click',  () => toggleSide('left'));
  colRight?.addEventListener('click', () => toggleSide('right'));

  // Mobile Switcher Buttons (HP friendly)
  btnSains?.addEventListener('click', (e) => {
    e.preventDefault();
    toggleSide('left');
  });
  btnTekno?.addEventListener('click', (e) => {
    e.preventDefault();
    toggleSide('right');
  });
  btnReset?.addEventListener('click', (e) => {
    e.preventDefault();
    setHover(null);
  });

  // Direct Tap / Click on Face Image (detect left half vs right half)
  const handleFaceClick = (e: MouseEvent) => {
    const target = faceContainer || imgFace;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    if (e.clientX < midX) {
      toggleSide('left');
    } else {
      toggleSide('right');
    }
  };

  faceContainer?.addEventListener('click', handleFaceClick);

  // 3. Light parallax on face image: max 0.12x, desktop-only, non-reduced
  if (!imgFace || reduced) return;

  let ticking = false;
  const updateParallax = () => {
    if (prefersReduced() || window.innerWidth < 768) {
      imgFace.style.transform = 'none';
      ticking = false;
      return;
    }
    const scrollY = window.scrollY;
    const heroHeight = heroSection.offsetHeight || 700;
    if (scrollY <= heroHeight + 150) {
      imgFace.style.transform = `translateY(${scrollY * 0.12}px)`;
    }
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(updateParallax); }
  }, { passive: true });
  window.addEventListener('resize', () => {
    if (window.innerWidth < 768) imgFace.style.transform = 'none';
  }, { passive: true });
}

// ── Legacy Hero split-text reveal fallback ─────────────────────────────────
function initHeroSplit() {
  const h1 = document.querySelector<HTMLElement>('#hero-headline');
  if (!h1 || prefersReduced()) {
    h1?.querySelectorAll('.hero-word').forEach(w => (w as HTMLElement).classList.add('is-visible'));
    return;
  }
  const words = h1.querySelectorAll<HTMLElement>('.hero-word');
  words.forEach((w, i) => {
    setTimeout(() => w.classList.add('is-visible'), 80 + i * 70);
  });
}

// ── M3: Count-up statistics ────────────────────────────────────────────────
function initCountUp() {
  const els = document.querySelectorAll<HTMLElement>('[data-countup]');
  if (!els.length || prefersReduced()) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target as HTMLElement;
      observer.unobserve(el);

      const raw = el.dataset.countup ?? el.textContent ?? '';
      const suffix = raw.replace(/[\d.]/g, '');
      const target = parseFloat(raw) || 0;
      const duration = 1200;
      const start = performance.now();

      const tick = (now: number) => {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        const current = Math.round(eased * target * 10) / 10;
        el.textContent = Number.isInteger(target) ? `${Math.round(current)}${suffix}` : `${current}${suffix}`;
        if (t < 1) requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
    });
  }, { threshold: 0.5 });

  els.forEach(el => observer.observe(el));
}

// ── M6: Drag-to-scroll carousel + Auto-scroll (Pointer Events, no jump) ─────
function initDragCarousel() {
  const carousels = document.querySelectorAll<HTMLElement>('.drag-carousel');
  carousels.forEach(el => {
    // ── State ───────────────────────────────────────────────────────────────
    let isDragging     = false;
    let dragStartX     = 0;
    let dragScrollLeft = 0;
    let velX           = 0;
    let lastX          = 0;
    let lastT          = 0;
    let inertiaRaf     = 0;

    let autoRaf            = 0;
    let isVisible          = false;
    let userInteracting    = false;
    let resumeTimer: ReturnType<typeof setTimeout> | null = null;

    // ── Auto-scroll (slow drift on desktop; mobile uses native inertia touch) ──
    const isTouch = () => window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    const stopAuto = () => { cancelAnimationFrame(autoRaf); autoRaf = 0; };
    const startAuto = () => {
      if (isTouch() || autoRaf || prefersReduced() || !isVisible || userInteracting) return;
      const SPEED = 0.55; // px per frame
      const tick = () => {
        if (!isVisible || userInteracting || prefersReduced() || isTouch()) { autoRaf = 0; return; }
        const maxScroll = el.scrollWidth - el.clientWidth;
        if (el.scrollLeft >= maxScroll - 1) { autoRaf = 0; return; } // stop at end, no jump
        el.scrollLeft += SPEED;
        autoRaf = requestAnimationFrame(tick);
      };
      autoRaf = requestAnimationFrame(tick);
    };

    // ── Interaction guards ──────────────────────────────────────────────────
    const pauseAuto = () => {
      userInteracting = true;
      if (resumeTimer) clearTimeout(resumeTimer);
      stopAuto();
    };
    const scheduleResume = (delay = 2000) => {
      if (resumeTimer) clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => { userInteracting = false; startAuto(); }, delay);
    };

    // ── Visibility via IntersectionObserver ─────────────────────────────────
    new IntersectionObserver(entries => {
      isVisible = entries[0].isIntersecting;
      isVisible ? startAuto() : stopAuto();
    }, { threshold: 0.15 }).observe(el);

    // ── Pointer Events for mouse/pen drag ───────────────────────────────────
    // (Touch falls through to native scroll — no manual scrollLeft for touch)
    el.addEventListener('pointerdown', e => {
      if (e.pointerType === 'touch') return; // let native handle touch
      pauseAuto();
      cancelAnimationFrame(inertiaRaf);
      isDragging     = true;
      dragStartX     = e.clientX;
      dragScrollLeft = el.scrollLeft;
      velX           = 0;
      lastX          = e.clientX;
      lastT          = e.timeStamp;
      el.setPointerCapture(e.pointerId);
      el.classList.add('dragging');
    });

    el.addEventListener('pointermove', e => {
      if (!isDragging || e.pointerType === 'touch') return;
      e.preventDefault();
      const now = e.timeStamp;
      const dt  = now - lastT || 1;
      velX  = (e.clientX - lastX) / dt * 16; // normalise to ~60fps
      lastX = e.clientX;
      lastT = now;
      el.scrollLeft = dragScrollLeft - (e.clientX - dragStartX);
    });

    const endDrag = (e: PointerEvent) => {
      if (!isDragging || e.pointerType === 'touch') return;
      isDragging = false;
      el.classList.remove('dragging');

      // Inertia decay
      cancelAnimationFrame(inertiaRaf);
      const inertia = () => {
        if (Math.abs(velX) < 0.3) { scheduleResume(2000); return; }
        el.scrollLeft -= velX;
        velX *= 0.90;
        inertiaRaf = requestAnimationFrame(inertia);
      };
      inertiaRaf = requestAnimationFrame(inertia);
    };
    el.addEventListener('pointerup',     endDrag);
    el.addEventListener('pointercancel', endDrag);

    // ── Mouse hover (non-drag) — pause while mouse is over ──────────────────
    el.addEventListener('mouseenter', () => { if (!isDragging) pauseAuto(); });
    el.addEventListener('mouseleave', () => { if (!isDragging) scheduleResume(1500); });

    // ── Wheel / trackpad ────────────────────────────────────────────────────
    // Let native scroll handle it; just pause auto-scroll
    el.addEventListener('wheel', () => { pauseAuto(); scheduleResume(2000); }, { passive: true });

    // ── Touch: just guard auto-scroll, no scrollLeft override ───────────────
    el.addEventListener('touchstart', () => pauseAuto(),        { passive: true });
    el.addEventListener('touchend',   () => scheduleResume(2000), { passive: true });

    // ── Keyboard nav (left/right arrows when focused) ────────────────────────
    el.setAttribute('tabindex', el.getAttribute('tabindex') ?? '0');
    el.addEventListener('keydown', e => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      pauseAuto();
      const cardWidth = (el.querySelector<HTMLElement>(':scope > *')?.offsetWidth ?? 300) + 24;
      el.scrollBy({ left: e.key === 'ArrowRight' ? cardWidth : -cardWidth, behavior: 'smooth' });
      scheduleResume(3000);
    });
  });
}

// ── M7: Gallery FLIP filter ────────────────────────────────────────────────
function initGalleryFilter() {
  const filterBtns = document.querySelectorAll<HTMLElement>('.filter-btn');
  const galleryItems = document.querySelectorAll<HTMLElement>('.gallery-item');
  const grid = document.getElementById('gallery-grid');
  if (!filterBtns.length || !grid) return;

  const applyFilter = (filter: string) => {
    // FLIP: record positions before
    const rects = new Map<HTMLElement, DOMRect>();
    galleryItems.forEach(item => rects.set(item, item.getBoundingClientRect()));

    galleryItems.forEach(item => {
      const cat = item.dataset.category ?? '';
      const show = filter === 'all' || cat === filter || cat === 'Semua Event';
      item.classList.toggle('flip-hidden', !show);
      item.style.display = show ? '' : 'none';
    });

    if (prefersReduced()) return;

    // FLIP: animate from old position
    galleryItems.forEach(item => {
      const oldRect = rects.get(item);
      if (!oldRect || item.classList.contains('flip-hidden')) return;
      const newRect = item.getBoundingClientRect();
      const dy = oldRect.top - newRect.top;
      const dx = oldRect.left - newRect.left;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      item.style.transform = `translate(${dx}px, ${dy}px)`;
      item.style.transition = 'none';
      requestAnimationFrame(() => {
        item.style.transition = '';
        item.style.transform = '';
      });
    });
  };

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => {
        b.classList.remove('bg-[#1C1917]', 'text-white');
        b.classList.add('bg-[#FBFBF9]', 'text-[#1C1917]');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.remove('bg-[#FBFBF9]', 'text-[#1C1917]');
      btn.classList.add('bg-[#1C1917]', 'text-white');
      btn.setAttribute('aria-pressed', 'true');
      applyFilter(btn.dataset.filter ?? 'all');
    });
  });
}

// ── M8: Lightbox with focus-lock + keyboard nav ────────────────────────────
function initLightbox() {
  const modal = document.getElementById('gallery-modal');
  const closeBtn = document.getElementById('close-modal');
  const modalCat = document.getElementById('modal-cat');
  const modalTitle = document.getElementById('modal-title');
  const modalDesc = document.getElementById('modal-desc');
  const modalRoles = document.getElementById('modal-roles');
  const modalGear = document.getElementById('modal-gear');
  if (!modal) return;

  const galleryItems = document.querySelectorAll<HTMLElement>('.gallery-item');
  let currentIdx = 0;
  const visibleItems = () =>
    Array.from(galleryItems).filter(item => !item.classList.contains('flip-hidden') && item.style.display !== 'none');

  let lastFocus: HTMLElement | null = null;

  const openModal = (item: HTMLElement, trigger?: HTMLElement) => {
    lastFocus = trigger ?? null;
    modalCat && (modalCat.textContent = item.dataset.category ?? '');
    modalTitle && (modalTitle.textContent = item.dataset.title ?? '');
    modalDesc && (modalDesc.textContent = item.dataset.desc ?? '');
    modalRoles && (modalRoles.textContent = item.dataset.roles ?? '-');
    modalGear && (modalGear.textContent = item.dataset.gear ?? '-');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    // tiny delay for CSS transition
    requestAnimationFrame(() => modal.classList.add('is-open'));
    currentIdx = visibleItems().indexOf(item);
    closeBtn?.focus();
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    modal.classList.remove('is-open');
    setTimeout(() => {
      modal.classList.remove('flex');
      modal.classList.add('hidden');
      lastFocus?.focus();
    }, 400);
    document.body.style.overflow = '';
  };

  const navigateModal = (dir: number) => {
    const items = visibleItems();
    if (!items.length) return;
    currentIdx = (currentIdx + dir + items.length) % items.length;
    openModal(items[currentIdx]);
  };

  galleryItems.forEach(item => {
    item.setAttribute('tabindex', '0');
    item.setAttribute('role', 'button');
    item.addEventListener('click', () => openModal(item, item as HTMLElement));
    item.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(item, item as HTMLElement); } });
  });

  closeBtn?.addEventListener('click', closeModal);
  document.getElementById('prev-modal')?.addEventListener('click', () => navigateModal(-1));
  document.getElementById('next-modal')?.addEventListener('click', () => navigateModal(1));
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  document.addEventListener('keydown', e => {
    if (!modal.classList.contains('is-open')) return;
    if (e.key === 'Escape') closeModal();
    if (e.key === 'ArrowRight') navigateModal(1);
    if (e.key === 'ArrowLeft')  navigateModal(-1);
  });

  // Focus trap
  modal.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const focusable = modal.querySelectorAll<HTMLElement>('button, [tabindex="0"]');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
      e.preventDefault();
      (e.shiftKey ? last : first).focus();
    }
  });

  // Touch swipe inside modal
  let touchX = 0;
  modal.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
  modal.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) navigateModal(dx < 0 ? 1 : -1);
  });
}

// ── M9: Form floating label + validation + AJAX submit (Netlify Forms) ────
function initContactForm() {
  const form = document.querySelector<HTMLFormElement>('form[name="contact"]');
  if (!form) return;

  const btnSubmit = form.querySelector<HTMLButtonElement>('.btn-submit');
  const btnText = form.querySelector<HTMLElement>('.btn-submit-text');
  const btnLoading = form.querySelector<HTMLElement>('.btn-submit-loading');
  const feedback = document.getElementById('form-feedback');

  // Floating labels
  form.querySelectorAll<HTMLElement>('.form-field input, .form-field textarea').forEach(el => {
    const label = el.closest('.form-field')?.querySelector('label');
    if (!label) return;
    const check = () => {
      const empty = !(el as HTMLInputElement).value;
      label.classList.toggle('floated', !empty);
    };
    el.addEventListener('input', check);
    el.addEventListener('focus', () => label.classList.add('floated'));
    el.addEventListener('blur', check);
    check();
  });

  const showFeedback = (type: 'success' | 'error', message: string) => {
    if (!feedback) return;
    feedback.className = `form-feedback form-feedback-${type}`;
    feedback.textContent = message;
    feedback.classList.remove('hidden');
    if (type === 'success') {
      setTimeout(() => feedback.classList.add('hidden'), 8000);
    }
  };

  const setLoading = (loading: boolean) => {
    if (btnSubmit) btnSubmit.disabled = loading;
    btnText?.classList.toggle('hidden', loading);
    btnLoading?.classList.toggle('hidden', !loading);
    btnSubmit?.classList.toggle('loading', loading);
  };

  // AJAX submit via Fetch (Netlify Forms)
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validate required fields
    let valid = true;
    form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[required]').forEach(field => {
      if (!field.value.trim()) {
        field.classList.add('invalid');
        field.addEventListener('input', () => field.classList.remove('invalid'), { once: true });
        valid = false;
      }
    });

    // Email format check
    const emailField = form.querySelector<HTMLInputElement>('input[type="email"]');
    if (emailField && emailField.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailField.value)) {
      emailField.classList.add('invalid');
      emailField.addEventListener('input', () => emailField.classList.remove('invalid'), { once: true });
      valid = false;
    }

    if (!valid) return;

    setLoading(true);
    feedback?.classList.add('hidden');

    try {
      const formData = new FormData(form);
      const response = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(formData as any).toString(),
      });

      if (response.ok) {
        setLoading(false);
        btnSubmit?.classList.add('success');
        if (btnText) btnText.textContent = '✓ Pesan Terkirim!';
        showFeedback('success', 'Terima kasih! Pesan Anda telah terkirim. Saya akan merespons dalam 1–2 hari kerja.');
        form.reset();
        // Reset floating labels after form reset
        form.querySelectorAll<HTMLElement>('.form-field label').forEach(l => l.classList.remove('floated'));

        // Restore button after 4s
        setTimeout(() => {
          btnSubmit?.classList.remove('success');
          if (btnText) btnText.textContent = 'Kirim Pesan';
        }, 4000);
      } else {
        throw new Error(`Server responded with ${response.status}`);
      }
    } catch {
      setLoading(false);
      showFeedback('error', 'Gagal mengirim pesan. Silakan coba lagi atau hubungi langsung via WhatsApp.');
    }
  });
}

// ── M10: Lazy image skeleton ────────────────────────────────────────────────
function initImageSkeleton() {
  const imgs = document.querySelectorAll<HTMLImageElement>('img[loading="lazy"]');
  imgs.forEach(img => {
    if (img.complete) return;
    img.closest('.card-img-wrap')?.classList.add('img-skeleton');
    img.addEventListener('load', () => {
      img.closest('.card-img-wrap')?.classList.remove('img-skeleton');
      img.classList.add('img-loaded');
    }, { once: true });
  });
}

// ── M4: Pie chart interaction (with active state for mobile & desktop) ───────
function initPieChart() {
  const sliceBtns = document.querySelectorAll<HTMLElement>('.slice-btn');
  const rolePanels = document.querySelectorAll<HTMLElement>('.role-panel');
  if (!sliceBtns.length) return;

  const setActive = (targetId: string) => {
    rolePanels.forEach(panel => {
      panel.classList.toggle('hidden', panel.id !== targetId);
    });
    sliceBtns.forEach(btn => {
      const isTarget = btn.getAttribute('data-target') === targetId;
      if (btn.tagName === 'BUTTON') {
        btn.classList.toggle('font-bold', isTarget);
        btn.classList.toggle('underline', isTarget);
      }
      if (btn.tagName === 'path') {
        (btn as unknown as SVGPathElement).style.opacity = isTarget ? '1' : '0.85';
      }
    });
  };

  sliceBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target') ?? '';
      setActive(targetId);
    });
  });

  // Default active role
  setActive('role-health');
}

// ── M4: SISE modal (preserve existing logic) ──────────────────────────────
function initSiseModal() {
  const siseModal = document.getElementById('sise-modal');
  const openBtn   = document.getElementById('open-sise-modal');
  const closeBtn  = document.getElementById('close-sise-modal');
  const simRunBtn = document.getElementById('sim-run-btn');
  const simOutput = document.getElementById('sim-output');
  const simText   = document.getElementById('sim-text-output');
  const simPusk   = document.getElementById('sim-puskesmas') as HTMLSelectElement | null;

  openBtn?.addEventListener('click', () => {
    siseModal?.classList.remove('hidden');
    siseModal?.classList.add('flex');
  });
  closeBtn?.addEventListener('click', () => {
    siseModal?.classList.add('hidden');
    siseModal?.classList.remove('flex');
  });
  simRunBtn?.addEventListener('click', () => {
    const pusk = simPusk?.value ?? 'Pengasih II';
    simOutput?.classList.remove('hidden');
    if (simText) {
      simText.textContent = `BAB I PENDAHULUAN: Berdasarkan data laporan surveilans epidemiologi P2P ${pusk} bulan Agustus 2026, tercatat penurunan tren penyakit menular sebesar 12.4%. Rekomendasi tindakan intervensi promosi kesehatan primer disiapkan untuk bidang P2P Dinas Kesehatan Kabupaten Kulon Progo.`;
    }
  });
}

// ── Hamburger mobile menu ───────────────────────────────────────────────────
function initHamburger() {
  const btn = document.getElementById('nav-hamburger');
  const menu = document.getElementById('mobile-menu');
  if (!btn || !menu) return;

  const toggle = (force?: boolean) => {
    const isCurrentlyOpen = btn.getAttribute('aria-expanded') === 'true';
    const open = force !== undefined ? force : !isCurrentlyOpen;

    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Tutup menu navigasi' : 'Buka menu navigasi');
    menu.setAttribute('aria-hidden', String(!open));

    if (open) {
      menu.classList.remove('hidden');
      menu.classList.add('is-open');
    } else {
      menu.classList.remove('is-open');
      menu.classList.add('hidden');
    }
  };

  // Use .onclick to guarantee no duplicate listener stacking
  btn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggle();
  };

  // Close on mobile nav link click
  menu.querySelectorAll<HTMLAnchorElement>('a.mobile-nav-link').forEach(a => {
    a.onclick = () => toggle(false);
  });

  // Close on outside click
  document.addEventListener('click', e => {
    const header = document.getElementById('site-header');
    if (header && !header.contains(e.target as Node) && btn.getAttribute('aria-expanded') === 'true') {
      toggle(false);
    }
  });

  // Close on Escape key (keyboard accessibility)
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') {
      toggle(false);
      btn.focus();
    }
  });
}

// ── Smooth scroll anchor intercept (update URL hash without reload) ──────────
function initSmoothScroll() {
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const hash = a.getAttribute('href')!;
      if (hash === '#') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: prefersReduced() ? 'instant' : 'smooth' });
        history.pushState(null, '', '#');
        return;
      }
      const target = document.getElementById(hash.slice(1));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: prefersReduced() ? 'instant' : 'smooth', block: 'start' });
      history.pushState(null, '', hash);
    });
  });
}

// ── Bootstrap: run on every page (View Transitions compatible) ─────────────
function boot() {
  initLoader();
  initScrollProgress();
  initNavbarShrink();
  initScrollspy();
  initAttributeScrollReveal();
  initScrollReveal();
  initHero();
  initHeroSplit();
  initCountUp();
  initDragCarousel();
  initGalleryFilter();
  initLightbox();
  initContactForm();
  initImageSkeleton();
  initPieChart();
  initSiseModal();
  initHamburger();
  initSmoothScroll();
}

// In Astro with ClientRouter, 'astro:page-load' fires on first page load AND after every transition.
document.addEventListener('astro:page-load', boot);

// Fallback for non-transition pages only
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // If ClientRouter is not present on page, run boot
    if (!document.querySelector('[data-astro-transition-scope]')) {
      boot();
    }
  }, { once: true });
}
