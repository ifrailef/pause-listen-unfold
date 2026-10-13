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

// Contact form: friendly inline confirmation (Netlify handles the actual submission)
const contactForm = document.querySelector('.contact-form');
const formNote = document.getElementById('formNote');
if (contactForm && formNote) {
  contactForm.addEventListener('submit', () => {
    // Let Netlify's default form handling proceed (native submit/redirect).
    formNote.textContent = 'Sending…';
  });
}

// Booking widget: hidden until "Book your session" is clicked, then shows a
// Mon–Fri day picker (next 2 weeks), then time slots, then confirm with
// name + email. Submits via Netlify Forms, same as the contact form — this
// is a lightweight availability picker, not a live calendar sync, so it
// doesn't check against Irene's real schedule.
const bookingToggle = document.getElementById('bookingToggle');
const bookingPanel = document.getElementById('bookingPanel');
const bookingCalendar = document.getElementById('bookingCalendar');
const bookingSlots = document.getElementById('bookingSlots');
const bookingForm = document.getElementById('bookingForm');
const bookingDateField = document.getElementById('bookingDateField');
const bookingTimeField = document.getElementById('bookingTimeField');
const bookingSelection = document.getElementById('bookingSelection');

if (bookingToggle && bookingPanel && bookingCalendar && bookingSlots && bookingForm) {
  const TIME_SLOTS = ['10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];
  // Fridays: no 15:00, 16:00 or 17:00, with an extra slot at 13:00.
  const FRIDAY_SLOTS = ['10:00', '11:00', '12:00', '13:00', '14:00'];
  // Booking details sent to Irene are always in English for consistency.
  const enFullDate = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const fmt = (opts) => new Intl.DateTimeFormat('en-GB', opts);

  let calendarBuilt = false;
  let selectedDate = null;
  let selectedTime = null;

  const dateLabel = (date) =>
    `<strong>${fmt({ weekday: 'short' }).format(date)}</strong>${fmt({ day: 'numeric', month: 'short' }).format(date)}`;
  const selectionText = () =>
    `${fmt({ weekday: 'long', day: 'numeric', month: 'long' }).format(selectedDate)} at ${selectedTime}`;

  bookingToggle.addEventListener('click', () => {
    const isOpen = !bookingPanel.hidden;
    bookingPanel.hidden = isOpen;
    bookingToggle.setAttribute('aria-expanded', String(!isOpen));
    if (!isOpen && !calendarBuilt) {
      buildCalendar();
      calendarBuilt = true;
    }
  });

  function buildCalendar() {
    // Next 10 available weekdays (Mon–Fri only), starting tomorrow.
    const availableDates = [];
    let cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    cursor.setDate(cursor.getDate() + 1);
    while (availableDates.length < 10) {
      const day = cursor.getDay();
      if (day !== 0 && day !== 6) {
        availableDates.push(new Date(cursor));
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    availableDates.forEach((date) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'booking-date-btn';
      btn.innerHTML = dateLabel(date);
      btn.addEventListener('click', () => {
        selectedDate = date;
        selectedTime = null;
        bookingCalendar.querySelectorAll('.booking-date-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        renderSlots(selectedDate);
      });
      bookingCalendar.appendChild(btn);
    });

    function renderSlots(date) {
      bookingSlots.innerHTML = '';
      bookingSlots.hidden = false;
      bookingForm.hidden = true;
      const slots = date.getDay() === 5 ? FRIDAY_SLOTS : TIME_SLOTS;
      slots.forEach((time) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'booking-slot-btn';
        btn.textContent = time;
        btn.addEventListener('click', () => {
          bookingSlots.querySelectorAll('.booking-slot-btn').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          selectedTime = time;
          bookingDateField.value = enFullDate.format(date);
          bookingTimeField.value = time;
          bookingSelection.textContent = selectionText();
          bookingForm.hidden = false;
        });
        bookingSlots.appendChild(btn);
      });
    }
  }

  function renderPending() {
    bookingForm.innerHTML = '';
    const msg = document.createElement('p');
    msg.className = 'booking-pending';
    msg.setAttribute('role', 'status');
    msg.innerHTML = '<strong>' + 'Pending confirmation' + '</strong>' +
      (selectedDate && selectedTime ? '<br><span>' + selectionText() + '</span>' : '');
    bookingForm.appendChild(msg);
  }

  bookingForm.addEventListener('submit', (e) => {
    e.preventDefault();
    // Send the booking to Netlify in the background (a no-op outside Netlify).
    try {
      const body = new URLSearchParams(new FormData(bookingForm)).toString();
      fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
      }).catch(() => {});
    } catch (err) { /* ignore */ }
    renderPending();
  });
}
