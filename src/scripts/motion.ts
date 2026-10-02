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

// ── M2: Scroll reveal (IntersectionObserver, one-shot) ─────────────────────
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

// ── M3: Hero split-text reveal ─────────────────────────────────────────────
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

// ── M6: Drag-to-scroll carousel ────────────────────────────────────────────
function initDragCarousel() {
  const carousels = document.querySelectorAll<HTMLElement>('.drag-carousel');
  carousels.forEach(el => {
    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;
    let velX = 0;
    let lastX = 0;
    let raf = 0;

    el.addEventListener('mousedown', e => {
      isDown = true;
      el.classList.add('dragging');
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
      lastX = e.pageX;
      cancelAnimationFrame(raf);
    });
    el.addEventListener('mouseleave', () => { isDown = false; el.classList.remove('dragging'); });
    el.addEventListener('mouseup', () => {
      isDown = false;
      el.classList.remove('dragging');
      // Inertia
      const inertia = () => {
        if (Math.abs(velX) < 0.5) return;
        el.scrollLeft += velX;
        velX *= 0.92;
        raf = requestAnimationFrame(inertia);
      };
      raf = requestAnimationFrame(inertia);
    });
    el.addEventListener('mousemove', e => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      velX = e.pageX - lastX;
      lastX = e.pageX;
      el.scrollLeft = scrollLeft - (x - startX);
    });

    // Touch
    let touchStartX = 0;
    let touchScrollLeft = 0;
    el.addEventListener('touchstart', e => {
      touchStartX = e.touches[0].pageX;
      touchScrollLeft = el.scrollLeft;
    }, { passive: true });
    el.addEventListener('touchmove', e => {
      const dx = e.touches[0].pageX - touchStartX;
      el.scrollLeft = touchScrollLeft - dx;
    }, { passive: true });
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

// ── M9: Form floating label + validation + submit state ────────────────────
function initContactForm() {
  const form = document.querySelector<HTMLFormElement>('form[name="contact"]');
  if (!form) return;

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

  // Submit state simulation
  form.addEventListener('submit', e => {
    const btn = form.querySelector<HTMLElement>('.btn-submit');
    // Validate required fields
    let valid = true;
    form.querySelectorAll<HTMLInputElement>('[required]').forEach(field => {
      if (!field.value.trim()) {
        field.classList.add('invalid');
        field.addEventListener('input', () => field.classList.remove('invalid'), { once: true });
        valid = false;
      }
    });
    if (!valid) { e.preventDefault(); return; }

    if (btn) {
      btn.classList.add('loading');
      btn.textContent = 'Mengirim...';
      // Netlify handles real submit; this is visual feedback only
      setTimeout(() => {
        btn.classList.remove('loading');
        btn.classList.add('success');
        btn.textContent = 'Pesan Terkirim!';
      }, 2000);
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

// ── M4: Pie chart interaction (preserve existing logic) ────────────────────
function initPieChart() {
  const sliceBtns = document.querySelectorAll<HTMLElement>('.slice-btn');
  const rolePanels = document.querySelectorAll<HTMLElement>('.role-panel');
  if (!sliceBtns.length) return;

  sliceBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target') ?? '';
      rolePanels.forEach(panel => {
        panel.classList.toggle('hidden', panel.id !== targetId);
      });
    });
  });
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
    const open = force ?? btn.getAttribute('aria-expanded') !== 'true';
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Tutup menu navigasi' : 'Buka menu navigasi');
    menu.setAttribute('aria-hidden', String(!open));
    menu.classList.toggle('is-open', open);
  };

  btn.addEventListener('click', () => toggle());

  // Close on mobile nav link click
  menu.querySelectorAll<HTMLAnchorElement>('a.mobile-nav-link').forEach(a => {
    a.addEventListener('click', () => toggle(false));
  });

  // Close on outside click
  document.addEventListener('click', e => {
    const header = document.getElementById('site-header');
    if (header && !header.contains(e.target as Node) && btn.getAttribute('aria-expanded') === 'true') {
      toggle(false);
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
  initScrollReveal();
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

// Run on initial load AND after every Astro View Transition
document.addEventListener('DOMContentLoaded', boot);
document.addEventListener('astro:page-load', boot);
