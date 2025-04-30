/**
 * Main JavaScript for Massimo Piazza personal site
 * - Handles navigation, bio toggle, smooth scroll, and accordion interactions
 */




  // Navigation indicator setup
  const navHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height'));
  const extraOffset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--extra-offset'));
  const indicator = document.getElementById('indicator');
  const links = document.querySelectorAll('nav .nav-link');
  const sections = Array.from(links).map(link => ({
    id: link.getAttribute('href').substring(1),
    link
  }));

  // Update the position and width of the nav indicator
  function updateIndicator(elem) {
    const rect = elem.getBoundingClientRect();
    const navRect = document.querySelector('nav').getBoundingClientRect();
    indicator.style.left = (rect.left - navRect.left) + 'px';
    indicator.style.width = rect.width + 'px';
  }

  // Toggle biography expansion
  document.getElementById('toggleBio').addEventListener('click', () => {
    const bio = document.getElementById('bioExtra');
    const isOpen = bio.classList.toggle('open');
    document.getElementById('toggleBio').classList.toggle('open', isOpen);
  });

  // Smooth scroll and active link handling
  links.forEach(link => {
    const href = link.getAttribute('href');
    if (href.startsWith('#')) {
      link.addEventListener('click', e => {
        e.preventDefault();
        const target = document.getElementById(href.substring(1));
        window.scrollTo({
          top: target.offsetTop - navHeight - extraOffset,
          behavior: 'smooth'
        });
      });
    }
    link.addEventListener('click', () => {
      links.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      updateIndicator(link);
    });
  });

  // Update active link on scroll
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      const viewportCenter = window.innerHeight / 2;
      let current = sections[0];
      sections.forEach(sec => {
        if (document.getElementById(sec.id).getBoundingClientRect().top <= viewportCenter) {
          current = sec;
        }
      });
      links.forEach(l => l.classList.remove('active'));
      current.link.classList.add('active');
      updateIndicator(current.link);
    }, 50);
  });

  // Initialize indicator
  const initial = document.querySelector('nav .nav-link.active');
  if (initial) updateIndicator(initial);

  // Single-phase max-height accordion animation with moving separator
  document.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const content = header.nextElementSibling;
      const isOpen = content.style.maxHeight && content.style.maxHeight !== '0px';

      if (isOpen) {
        // Collapse: from current height to zero
        content.style.maxHeight = content.scrollHeight + 'px';
        void content.offsetHeight; // force reflow
        content.style.maxHeight = '0';
        // Reset moving separator line
        header.style.setProperty('--line-move', '0px');
      } else {
        // Expand: to full content height
        content.style.maxHeight = content.scrollHeight + 'px';
        // Move separator line down with content
        header.style.setProperty('--line-move', content.scrollHeight + 'px');
      }

      header.classList.toggle('open', !isOpen);
    });
  });
});