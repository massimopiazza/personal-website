/**
 * Navigation, section toggles, smooth scroll, and accordion animation.
 */

(() => {
  function initNav({ navHeight, extraOffset, expandAllBtn, reveals }) {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const scrollBehavior = () => reduced.matches ? 'instant' : 'smooth';
    // Navigation indicator setup
    const navContent = document.getElementById('navContent');
    const indicator = document.getElementById('indicator');
    const links = navContent ? navContent.querySelectorAll('.nav-link') : [];
    const sections = Array.from(links).map(link => ({
      id: link.getAttribute('href').substring(1),
      link
    }));

    function setExpanded(element, expanded) {
      element.classList.toggle('open', expanded);
      element.style.maxHeight = expanded ? `${element.scrollHeight}px` : '';
    }

    function updateIndicator(elem) {
      if (!elem || !indicator || !navContent) return;
      const rect = elem.getBoundingClientRect();
      const navRect = navContent.getBoundingClientRect();
      indicator.style.left = (rect.left - navRect.left) + 'px';
      indicator.style.width = rect.width + 'px';
    }

    // Bio toggle
    document.getElementById('toggleBio').addEventListener('click', () => {
      reveals?.finishWithin(document.getElementById('about'));
      const bio = document.getElementById('bioExtra');
      const isOpen = !bio.classList.contains('open');
      setExpanded(bio, isOpen);
      document.getElementById('toggleBio').classList.toggle('open', isOpen);
    });

    // Consulting toggle (sequenced animation: fade summary, then expand; collapse in parallel)
    const consultingToggle = document.getElementById('toggleConsulting');
    if (consultingToggle) {
      const consultingExtra = document.getElementById('consultingExtra');
      const consultingSummary = document.getElementById('consultingSummaryHeading');
      const EXPAND_FADE_DURATION = 200; // ms, keep in sync with CSS .consulting-fast-fade

      consultingToggle.addEventListener('click', () => {
        reveals?.finishWithin(document.getElementById('consulting'));
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
                setExpanded(consultingExtra, true);
                consultingToggle.classList.add('open');
                setTimeout(() => {
                  const consultingSection = document.getElementById('consulting');
                  window.scrollTo({
                    top: consultingSection.offsetTop - navHeight - extraOffset,
                    behavior: scrollBehavior()
                  });
                }, 200);
              }
            }, EXPAND_FADE_DURATION);
          } else {
            // Fallback: no summary, just open details
            setExpanded(consultingExtra, true);
            consultingToggle.classList.add('open');
            setTimeout(() => {
              const consultingSection = document.getElementById('consulting');
              window.scrollTo({
                top: consultingSection.offsetTop - navHeight - extraOffset,
                behavior: scrollBehavior()
              });
            }, 200);
          }
        } else {
          // COLLAPSE: collapse details and fade summary back in in parallel
          setExpanded(consultingExtra, false);
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
          reveals?.finishWithin(target);
          window.scrollTo({
            top: target.offsetTop - navHeight - extraOffset,
            behavior: scrollBehavior()
          });
        });
      }
      link.addEventListener('click', () => {
        links.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        updateIndicator(link);
      });
    });

    if (sections.length) {
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
    }

    const initial = navContent ? navContent.querySelector('.nav-link.active') : null;
    if (initial) updateIndicator(initial);

    window.addEventListener('resize', () => {
      const active = navContent ? navContent.querySelector('.nav-link.active') : null;
      if (active) updateIndicator(active);
      document.querySelectorAll('.bio-extra.open').forEach(element => setExpanded(element, true));
    });

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
