'use strict';

(function () {

  /* --------------------------------------------------------
     NAVIGATION — menu mobile + fermeture propre
  -------------------------------------------------------- */
  const menuToggle = document.getElementById('menuToggle');
  const navMenu    = document.getElementById('navMenu');

  function openMenu() {
    navMenu.classList.add('active');
    menuToggle.setAttribute('aria-expanded', 'true');
    menuToggle.setAttribute('aria-label', 'Fermer le menu de navigation');
    navMenu.querySelector('a')?.focus();
  }

  function closeMenu() {
    navMenu.classList.remove('active');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Ouvrir le menu de navigation');
  }

  menuToggle?.addEventListener('click', () => {
    navMenu.classList.contains('active') ? closeMenu() : openMenu();
  });

  navMenu?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));

  document.addEventListener('click', e => {
    if (navMenu?.classList.contains('active') &&
        !navMenu.contains(e.target) &&
        !menuToggle.contains(e.target)) {
      closeMenu();
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && navMenu?.classList.contains('active')) {
      closeMenu();
      menuToggle?.focus();
    }
  });

  /* --------------------------------------------------------
     BADGE OUVERT / FERMÉ — calcul basé sur les horaires réels
  -------------------------------------------------------- */
  (function updateStatus() {
    const badge = document.getElementById('statusBadge');
    if (!badge) return;

    const now  = new Date();
    const day  = now.getDay();   // 0 = dim … 6 = sam
    const mins = now.getHours() * 60 + now.getMinutes();

    // Plages horaires par jour [ouverture, fermeture] en minutes depuis minuit
    const schedule = {
      0: [[1140, 1440]],               // Dimanche  19h00 – 00h00
      1: [[690, 870], [1140, 1440]],   // Lundi     11h30-14h30 + 19h00-00h00
      2: [[690, 870], [1140, 1440]],   // Mardi
      3: [[690, 870], [1140, 1440]],   // Mercredi
      4: [[690, 870], [1140, 1440]],   // Jeudi
      5: [[1140, 1440]],               // Vendredi  19h00 – 00h00 (jusqu'à 02h00)
      6: [[690, 870], [1140, 1440]],   // Samedi    11h30-14h30 + 19h00-00h00
    };

    // Vendredi et samedi soir : fermeture à 02h00 le lendemain
    const isAfterMidnight = (day === 6 || day === 0) && mins < 120;

    const isOpen = isAfterMidnight ||
      (schedule[day] || []).some(([open, close]) => mins >= open && mins < close);

    badge.textContent = isOpen ? 'Ouvert maintenant' : 'Fermé';
    badge.className   = `status-badge ${isOpen ? 'open' : 'closed'}`;
    setTimeout(() => badge.classList.add('show'), 300);
  })();

  /* --------------------------------------------------------
     JOUR ACTUEL DANS LE TABLEAU DES HORAIRES
  -------------------------------------------------------- */
  (function highlightToday() {
    const today = new Date().getDay();
    const row   = document.querySelector(`.horaire-row[data-day="${today}"]`);
    if (row) {
      row.classList.add('today');
      row.setAttribute('aria-current', 'true');
    }
  })();

  /* --------------------------------------------------------
     FADE-IN — IntersectionObserver (unobserve après déclenchement)
  -------------------------------------------------------- */
  const fadeObserver = new IntersectionObserver(
    entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        fadeObserver.unobserve(entry.target);
      }
    }),
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  document.querySelectorAll('.fade-in').forEach(el => fadeObserver.observe(el));

  /* --------------------------------------------------------
     LIGHTBOX — galerie plein écran avec focus trap
  -------------------------------------------------------- */
  (function initLightbox() {
    const lightbox  = document.getElementById('lightbox');
    const lbImg     = document.getElementById('lbImg');
    const lbCaption = document.getElementById('lbCaption');
    const lbCounter = document.getElementById('lbCounter');
    const lbClose   = document.getElementById('lbClose');
    const lbPrev    = document.getElementById('lbPrev');
    const lbNext    = document.getElementById('lbNext');

    if (!lightbox) return;

    // Récupère les images (préfère WebP)
    const figures = [...document.querySelectorAll('.gallery-grid figure')];
    const images  = figures.map(fig => ({
      src: fig.querySelector('source[type="image/webp"]')?.srcset
        || fig.querySelector('img')?.src
        || '',
      alt: fig.querySelector('img')?.alt || '',
    }));

    let currentIndex = 0;
    let lastFocused  = null;
    const focusable  = [lbClose, lbPrev, lbNext]; // éléments pour le piège de focus

    function updateSlide(index) {
      currentIndex = (index + images.length) % images.length;
      const { src, alt } = images[currentIndex];
      lbImg.src = src;
      lbImg.alt = alt;
      if (lbCaption) lbCaption.textContent = alt;
      if (lbCounter) lbCounter.textContent = `${currentIndex + 1} / ${images.length}`;
    }

    function open(index) {
      lastFocused = document.activeElement;
      updateSlide(index);
      lightbox.classList.add('active');
      lightbox.removeAttribute('aria-hidden');
      document.body.style.overflow = 'hidden';
      lbClose.focus();
    }

    function close() {
      lightbox.classList.remove('active');
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      lastFocused?.focus();
    }

    // Rendre chaque figure cliquable et accessible au clavier
    figures.forEach((fig, i) => {
      const imgAlt = fig.querySelector('img')?.alt || 'photo';
      fig.setAttribute('tabindex', '0');
      fig.setAttribute('role', 'button');
      fig.setAttribute('aria-label', `Voir en grand : ${imgAlt}`);
      fig.addEventListener('click', () => open(i));
      fig.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i); }
      });
    });

    lbClose.addEventListener('click', close);
    lbPrev.addEventListener('click',  () => updateSlide(currentIndex - 1));
    lbNext.addEventListener('click',  () => updateSlide(currentIndex + 1));

    lightbox.addEventListener('click', e => { if (e.target === lightbox) close(); });

    // Navigation clavier + piège de focus
    document.addEventListener('keydown', e => {
      if (!lightbox.classList.contains('active')) return;
      if (e.key === 'Escape')      { close(); return; }
      if (e.key === 'ArrowLeft')   { updateSlide(currentIndex - 1); return; }
      if (e.key === 'ArrowRight')  { updateSlide(currentIndex + 1); return; }
      if (e.key === 'Tab') {
        e.preventDefault();
        const idx  = focusable.indexOf(document.activeElement);
        const next = e.shiftKey
          ? (idx - 1 + focusable.length) % focusable.length
          : (idx + 1) % focusable.length;
        focusable[next]?.focus();
      }
    });

    // Swipe mobile
    let touchStartX = 0;
    lightbox.addEventListener('touchstart', e => {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });

    lightbox.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 50) updateSlide(currentIndex + (dx < 0 ? 1 : -1));
    }, { passive: true });
  })();

  /* --------------------------------------------------------
     RETOUR EN HAUT — RAF pour éviter les jank
  -------------------------------------------------------- */
  (function initBackToTop() {
    const btn = document.getElementById('backTop');
    if (!btn) return;

    let ticking = false;

    window.addEventListener('scroll', () => {
      if (ticking) return;
      requestAnimationFrame(() => {
        btn.classList.toggle('show', window.scrollY > 400);
        ticking = false;
      });
      ticking = true;
    }, { passive: true });

    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  })();

  /* --------------------------------------------------------
     CODE PROMO — Copier dans le presse-papiers + toast
  -------------------------------------------------------- */
  (function initPromoCode() {
    const btn   = document.getElementById('promoCode');
    const toast = document.getElementById('toast');
    if (!btn || !toast) return;

    let toastTimer;

    function showToast(message) {
      clearTimeout(toastTimer);
      toast.textContent = message;
      toast.classList.add('show');
      toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
    }

    btn.addEventListener('click', async () => {
      const code = btn.querySelector('strong')?.textContent?.trim();
      if (!code) return;

      // Méthode moderne
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(code);
          showToast('✓ Code copié !');
          return;
        } catch {
          // Fallback ci-dessous
        }
      }

      // Fallback pour anciens navigateurs
      const ta = Object.assign(document.createElement('textarea'), {
        value: code,
        style: 'position:fixed;opacity:0;pointer-events:none',
      });
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        showToast('✓ Code copié !');
      } catch {
        showToast(`Code : ${code}`);
      } finally {
        document.body.removeChild(ta);
      }
    });
  })();

})();
