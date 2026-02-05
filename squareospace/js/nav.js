/**
 * Navigation, section toggles, smooth scroll, and accordion animation.
 */

(() => {
  function initNav({ navHeight, extraOffset, expandAllBtn }) {
    // Navigation indicator setup
    const indicator = document.getElementById('indicator');
    const links = document.querySelectorAll('nav .nav-link');
    const sections = Array.from(links).map(link => ({
      id: link.getAttribute('href').substring(1),
      link
    }));

    function updateIndicator(elem) {
      const rect = elem.getBoundingClientRect();
      const navRect = document.querySelector('nav').getBoundingClientRect();
      indicator.style.left = (rect.left - navRect.left) + 'px';
      indicator.style.width = rect.width + 'px';
    }

    // Bio toggle
    document.getElementById('toggleBio').addEventListener('click', () => {
      const bio = document.getElementById('bioExtra');
      const isOpen = bio.classList.toggle('open');
      document.getElementById('toggleBio').classList.toggle('open', isOpen);
    });

    // Consulting toggle (sequenced animation: fade summary, then expand; collapse in parallel)
    const consultingToggle = document.getElementById('toggleConsulting');
    if (consultingToggle) {
      const consultingExtra = document.getElementById('consultingExtra');
      const consultingSummary = document.getElementById('consultingSummaryHeading');
      const EXPAND_FADE_DURATION = 200; // ms, keep in sync with CSS .consulting-fast-fade

      consultingToggle.addEventListener('click', () => {
        const isOpen = consultingExtra.classList.contains('open');

        if (!isOpen) {
          // EXPAND: first quickly dissolve the summary, then expand details
          if (consultingSummary) {
            // ensure it's visible before fading out
            consultingSummary.style.display = '';
            consultingSummary.classList.add('consulting-fast-fade', 'consulting-summary-hidden');

            setTimeout(() => {
              // Guard in case user interacted again before this runs
              if (!consultingExtra.classList.contains('open')) {
                // after fade-out, remove fast-fade and hide from layout
                consultingSummary.style.display = 'none';
                consultingSummary.classList.remove('consulting-fast-fade');
                // now expand the details
                consultingExtra.classList.add('open');
                consultingToggle.classList.add('open');
                setTimeout(() => {
                  const consultingSection = document.getElementById('consulting');
                  window.scrollTo({
                    top: consultingSection.offsetTop - navHeight - extraOffset,
                    behavior: 'smooth'
                  });
                }, 200);
              }
            }, EXPAND_FADE_DURATION);
          } else {
            // Fallback: no summary, just open details
            consultingExtra.classList.add('open');
            consultingToggle.classList.add('open');
            setTimeout(() => {
              const consultingSection = document.getElementById('consulting');
              window.scrollTo({
                top: consultingSection.offsetTop - navHeight - extraOffset,
                behavior: 'smooth'
              });
            }, 200);
          }
        } else {
          // COLLAPSE: collapse details and fade summary back in in parallel
          consultingExtra.classList.remove('open');
          consultingToggle.classList.remove('open');

          if (consultingSummary) {
            // make it participate in the transition again
            consultingSummary.style.display = '';
            // start from the hidden state
            consultingSummary.classList.add('consulting-summary-hidden');
            // force reflow so the browser registers the starting state
            void consultingSummary.offsetWidth;
            // then remove the hidden class to fade/slide back in
            consultingSummary.classList.remove('consulting-summary-hidden');
          }
        }
      });
    }

    // Smooth scroll & active link
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

    const initial = document.querySelector('nav .nav-link.active');
    if (initial) updateIndicator(initial);

    // Accordion animation
    document.querySelectorAll('.accordion-header').forEach(header => {
      header.addEventListener('click', () => {
        const content = header.nextElementSibling;
        const isOpen = content.style.maxHeight && content.style.maxHeight !== '0px';
        if (isOpen) {
          content.style.maxHeight = content.scrollHeight + 'px';
          void content.offsetHeight;
          content.style.maxHeight = '0';
          header.style.setProperty('--line-move', '0px');
        } else {
          content.style.maxHeight = content.scrollHeight + 'px';
          header.style.setProperty('--line-move', content.scrollHeight + 'px');
        }
        header.classList.toggle('open', !isOpen);
        if (isOpen && expandAllBtn) {
          expandAllBtn.classList.remove('hidden');
        }
      });
    });
  }

  window.squareospace = window.squareospace || {};
  window.squareospace.initNav = initNav;
})();

