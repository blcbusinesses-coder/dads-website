/* ============================================
   Kevin Lowe Precision Aesthetic Medicine
   JavaScript — Interactions & Animations
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  // --- Navbar Scroll Effect ---
  const navbar = document.getElementById('navbar');
  const heroSection = document.getElementById('hero');

  const handleNavScroll = () => {
    if (window.scrollY > 80) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', handleNavScroll, { passive: true });
  handleNavScroll(); // initial check

  // --- Mobile Navigation ---
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  const navOverlay = document.getElementById('navOverlay');

  const toggleMobileNav = () => {
    navToggle.classList.toggle('active');
    navLinks.classList.toggle('open');
    navOverlay.classList.toggle('visible');
    document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';
  };

  const closeMobileNav = () => {
    navToggle.classList.remove('active');
    navLinks.classList.remove('open');
    navOverlay.classList.remove('visible');
    document.body.style.overflow = '';
  };

  navToggle.addEventListener('click', toggleMobileNav);
  navOverlay.addEventListener('click', closeMobileNav);

  // Close mobile nav on link click
  navLinks.querySelectorAll('.nav__link').forEach(link => {
    link.addEventListener('click', closeMobileNav);
  });

  navLinks.querySelector('.nav__cta')?.addEventListener('click', closeMobileNav);

  // --- Active Nav Link Highlight ---
  const sections = document.querySelectorAll('section[id]');
  const navLinkItems = document.querySelectorAll('.nav__link');

  const highlightActiveLink = () => {
    const scrollPos = window.scrollY + 120;

    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute('id');

      if (scrollPos >= top && scrollPos < top + height) {
        navLinkItems.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active');
          }
        });
      }
    });
  };

  window.addEventListener('scroll', highlightActiveLink, { passive: true });

  // --- Intersection Observer — Fade-in Animations ---
  const fadeElements = document.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right');

  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -60px 0px',
    threshold: 0.15
  };

  const fadeObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        fadeObserver.unobserve(entry.target); // animate only once
      }
    });
  }, observerOptions);

  fadeElements.forEach(el => fadeObserver.observe(el));

  // --- Smooth Scroll for Anchor Links ---
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    // Skip the admin sign-in link — handled by admin.js
    if (anchor.id === 'adminSignInLink') return;

    anchor.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = anchor.getAttribute('href');
      if (!targetId || targetId === '#') return;
      const targetEl = document.querySelector(targetId);

      if (targetEl) {
        const offset = 80; // accounting for fixed nav
        const targetPos = targetEl.getBoundingClientRect().top + window.pageYOffset - offset;

        window.scrollTo({
          top: targetPos,
          behavior: 'smooth'
        });
      }
    });
  });

  // --- Contact Form Handling ---
  const contactForm = document.getElementById('contactForm');
  const submitBtn = document.getElementById('submitBtn');

  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();

      // Basic validation
      const firstName = document.getElementById('firstName').value.trim();
      const lastName = document.getElementById('lastName').value.trim();
      const email = document.getElementById('email').value.trim();

      if (!firstName || !lastName || !email) {
        // Highlight empty required fields
        ['firstName', 'lastName', 'email'].forEach(id => {
          const input = document.getElementById(id);
          if (!input.value.trim()) {
            input.style.borderColor = '#c45c5c';
            setTimeout(() => {
              input.style.borderColor = '';
            }, 3000);
          }
        });
        return;
      }

      // Email format check
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        const emailInput = document.getElementById('email');
        emailInput.style.borderColor = '#c45c5c';
        setTimeout(() => {
          emailInput.style.borderColor = '';
        }, 3000);
        return;
      }

      // Simulate submission
      submitBtn.innerHTML = 'Sending... <span class="btn__arrow">⟳</span>';
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.7';

      setTimeout(() => {
        submitBtn.innerHTML = 'Request Received ✓';
        submitBtn.style.backgroundColor = '#2d6a4f';
        submitBtn.style.opacity = '1';

        // Reset form
        setTimeout(() => {
          contactForm.reset();
          submitBtn.innerHTML = 'Request Consultation <span class="btn__arrow">→</span>';
          submitBtn.disabled = false;
          submitBtn.style.backgroundColor = '';
        }, 3000);
      }, 1500);
    });
  }

  // --- Staggered Fade-in for Service Card Features ---
  const serviceCards = document.querySelectorAll('.service-card');

  serviceCards.forEach(card => {
    const features = card.querySelectorAll('.service-card__features li');
    features.forEach((li, index) => {
      li.style.transitionDelay = `${index * 0.05}s`;
    });
  });

  // --- Counter Animation for Stats ---
  const statNumbers = document.querySelectorAll('.about__stat-number');

  const animateCounter = (el) => {
    const text = el.textContent;
    const match = text.match(/^(\d+)/);
    if (!match) return;

    const target = parseInt(match[1]);
    const suffix = text.replace(match[1], '');
    const duration = 2000;
    const start = performance.now();

    const step = (timestamp) => {
      const progress = Math.min((timestamp - start) / duration, 1);
      // Ease-out curve
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(eased * target);

      el.textContent = current + suffix;

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = target + suffix;
      }
    };

    requestAnimationFrame(step);
  };

  const statObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        statObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  statNumbers.forEach(el => statObserver.observe(el));

});
