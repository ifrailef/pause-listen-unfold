// Year in footer
document.getElementById('year').textContent = new Date().getFullYear();

// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const primaryNav = document.getElementById('primaryNav');
if (navToggle && primaryNav) {
  navToggle.addEventListener('click', () => {
    const open = primaryNav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
  });
  primaryNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      primaryNav.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Keep the stacked scroll panels tucked neatly under the nav bar by feeding
// its live height into a CSS variable, rather than guessing a fixed value.
const siteHeader = document.querySelector('.site-header');
function setHeaderHeight() {
  if (siteHeader) {
    document.documentElement.style.setProperty('--header-h', siteHeader.offsetHeight + 'px');
  }
}
setHeaderHeight();
window.addEventListener('resize', setHeaderHeight);

const canAnimateOnScroll = 'IntersectionObserver' in window && !prefersReducedMotion;
if (canAnimateOnScroll) {
  document.documentElement.classList.add('js-ready');
}

// Make each stacked panel fade away completely as the next one scrolls up
// to cover it, instead of just sitting visibly layered underneath.
const stackPanels = Array.from(document.querySelectorAll('.stack-panel'));
if (stackPanels.length > 1 && canAnimateOnScroll) {
  let ticking = false;
  function updatePanelFades() {
    const headerH = siteHeader ? siteHeader.offsetHeight : 0;
    const viewportH = window.innerHeight;
    for (let i = 0; i < stackPanels.length - 1; i++) {
      const outgoing = stackPanels[i];
      const incoming = stackPanels[i + 1];
      const incomingTop = incoming.getBoundingClientRect().top;
      // Fade distance: the next panel travels from the bottom of the
      // viewport up to the header offset before fully covering this one.
      const start = viewportH;
      const end = headerH;
      let progress = (start - incomingTop) / (start - end);
      progress = Math.max(0, Math.min(1, progress));
      outgoing.style.opacity = String(1 - progress);
    }
    ticking = false;
  }
  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(updatePanelFades);
      ticking = true;
    }
  }
  updatePanelFades();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
}

// Reveal Living Questions one at a time on scroll.
// Only opt into the hidden/reveal styling if IntersectionObserver actually
// works here and motion isn't reduced — otherwise questions stay visible.
const questionItems = document.querySelectorAll('.questions-list li');
if (questionItems.length && canAnimateOnScroll) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('in-view'), i * 200);
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });
  questionItems.forEach(item => io.observe(item));
}

// Fade each stacked panel's content in whenever it scrolls into view, and
// back out again if scrolled away from — repeating every time, to match
// the panel-stacking scroll effect (each section pins and the next covers it).
const revealEls = document.querySelectorAll('.reveal-fade');
if (revealEls.length && canAnimateOnScroll) {
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      entry.target.classList.toggle('in-view', entry.isIntersecting);
    });
  }, { threshold: 0.3 });
  revealEls.forEach(el => revealIO.observe(el));
}

// Contact form: sent in the background to Netlify Forms, with a message on the page.
const contactForm = document.querySelector('.contact-form');
const formNote = document.getElementById('formNote');
const FALLBACK_EMAIL = 'pauselistenunfold@posteo.com';
function sendToNetlify(form) {
  const body = new URLSearchParams(new FormData(form)).toString();
  return fetch('/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  }).then((res) => {
    if (!res.ok) throw new Error('Form was not accepted (' + res.status + ')');
  });
}
if (contactForm && formNote) {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const button = contactForm.querySelector('button[type="submit"]');
    if (button) button.disabled = true;
    formNote.textContent = 'Sending…';
    sendToNetlify(contactForm)
      .then(() => {
        contactForm.reset();
        formNote.textContent = 'Thank you. Your message has been sent and I will be in touch soon.';
      })
      .catch(() => {
        formNote.textContent = 'Sorry, your message could not be sent. Please write to ' + FALLBACK_EMAIL + ' instead.';
      })
      .finally(() => { if (button) button.disabled = false; });
  });
}

// Booking widget: the "Book Free Orientation Call" button reveals a short form
// (name + email). It is sent to Netlify Forms like the contact form; Irene then
// replies by email to arrange a time. The page only shows "Pending confirmation"
// once Netlify has really accepted the submission.
const bookingToggle = document.getElementById('bookingToggle');
const bookingPanel = document.getElementById('bookingPanel');
const bookingForm = document.getElementById('bookingForm');

if (bookingToggle && bookingPanel && bookingForm) {
  bookingToggle.addEventListener('click', () => {
    const isOpen = !bookingPanel.hidden;
    bookingPanel.hidden = isOpen;
    bookingToggle.setAttribute('aria-expanded', String(!isOpen));
  });

  function renderPending() {
    bookingForm.innerHTML = '';
    const msg = document.createElement('p');
    msg.className = 'booking-pending';
    msg.setAttribute('role', 'status');
    msg.innerHTML = '<strong>Pending confirmation</strong><br><span>Thank you. I will be in touch by email to arrange a time.</span>';
    bookingForm.appendChild(msg);
  }

  bookingForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const button = bookingForm.querySelector('button[type="submit"]');
    if (button) button.disabled = true;
    sendToNetlify(bookingForm)
      .then(() => { renderPending(); })
      .catch(() => {
        if (button) button.disabled = false;
        let err = bookingForm.querySelector('.booking-error');
        if (!err) {
          err = document.createElement('p');
          err.className = 'form-note booking-error';
          err.setAttribute('role', 'status');
          bookingForm.appendChild(err);
        }
        err.textContent = 'Sorry, your booking could not be sent. Please write to ' + FALLBACK_EMAIL + ' instead.';
      });
  });
}
