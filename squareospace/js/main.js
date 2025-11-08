/**
 * Main JavaScript for Massimo Piazza personal site
 * - Handles navigation, bio toggle, smooth scroll, accordion, and project detail view
 */

document.addEventListener('DOMContentLoaded', () => {
  const expandAllBtn = document.getElementById('expandAll');

  function displayMarkdown(md) {
    spinner.classList.add('hidden');
    detailContent.innerHTML = marked.parse(md);
    initEverboardCarousel(detailContent);
    // Ensure links open in new tab
    detailContent.querySelectorAll('a').forEach(link => link.setAttribute('target', '_blank'));
    adjustTitleFontSize();
  }
  // Navigation indicator setup
  const navHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height'));
  const extraOffset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--extra-offset'));
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
      if (isOpen) {
        expandAllBtn.classList.remove('hidden');
      }
    });
  });

  // Project detail view setup
  const pageContent = document.getElementById('pageContent');
  const detailView = document.getElementById('projectDetail');
  const detailContent = document.getElementById('detailContent');
  const closeBtn = document.getElementById('closeDetail');
  const footerSocials = document.querySelector('footer .socials');
  const detailHeader = document.querySelector('.detail-header');
    const spinner = document.getElementById('loadingSpinner');
  
    // Expand All button handler
    expandAllBtn.addEventListener('click', () => {
      document.querySelectorAll('.accordion-item').forEach(item => {
        const header = item.querySelector('.accordion-header');
        const content = item.querySelector('.accordion-content');
        const isOpen = header.classList.contains('open');
        if (!isOpen) {
          content.style.maxHeight = content.scrollHeight + 'px';
          header.style.setProperty('--line-move', content.scrollHeight + 'px');
          header.classList.add('open');
        }
      });
    expandAllBtn.classList.add('hidden');

    // Delay scroll until after expand animation almost completes (CSS transition duration: 0.3 sec)
    setTimeout(() => {
      const projectsSection = document.getElementById('projects');
      window.scrollTo({
        top: projectsSection.offsetTop - navHeight - extraOffset,
        behavior: 'smooth'
      });
    }, 200);
    });

  // Title font adjustment to fit in one line
  const detailTitle = document.getElementById('detailTitle');
  function adjustTitleFontSize() {
    // Reset to original font size
    detailTitle.style.fontSize = '';
    const containerWidth = detailTitle.clientWidth;
    const scrollWidth = detailTitle.scrollWidth;
    if (scrollWidth <= containerWidth) return;
    const initialSize = parseFloat(getComputedStyle(detailTitle).fontSize);
    const scale = Math.max(containerWidth / scrollWidth, 0.6);
    detailTitle.style.fontSize = initialSize * scale + 'px';
  }

// Adjust font size and re-center footer icons on detail view resize
  window.addEventListener('resize', () => {
    if (detailView.classList.contains('open')) {
      adjustTitleFontSize();
      // Initialize Everboard carousel inside the newly inserted detailContent
      initEverboardCarousel(detailContent);
      shiftFooter();
      // Workaround: trigger click on current Everboard icon to reset carousel on resize
      const carousel = detailContent.querySelector('.header_carrousel');
      if (carousel) {
        const screenWrapper = carousel.querySelector('.screen_wrapper');
        const screens = screenWrapper.children;
        if (screens.length > 0) {
          const screenWidth = screens[0].clientWidth;
          const mlPx = screenWrapper.style.marginLeft || '0px';
          const ml = parseInt(mlPx, 10) || 0;
          const currentIndex = Math.round(-ml / screenWidth);
          const icons = carousel.querySelectorAll('.icon_wrapper .icon');
          if (icons[currentIndex]) {
            icons[currentIndex].dispatchEvent(new Event('click'));
          }
        }
      }
    }
  });


// Project link click handler with loading spinner
// Ensure project links have real hrefs for SEO crawlers (and graceful no-JS navigation)
document.querySelectorAll('.accordion-content a[data-project]').forEach(link => {
  const mdPath = link.getAttribute('data-project');
  const id = mdPath.split('/').pop().replace('.md','');
  link.setAttribute('href', mdPath); // real path for crawlers & users without JS
  link.dataset.projectId = id;
});
  document.querySelectorAll('.accordion-content a[data-project]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const title = link.textContent;
      detailTitle.textContent = title;
      const mdPath = link.getAttribute('data-project');
      const projectId = mdPath.split('/').pop().replace('.md', '');
      // Clear old content and show spinner
      detailContent.innerHTML = '';
      spinner.classList.remove('hidden');
      openDetail();
      adjustTitleFontSize();
      // Reflect the opened project in the URL for shareability/deep-linking
      window.location.hash = 'project=' + projectId;
      fetch(mdPath)
        .then(response => {
          if (response.ok) {
            return response.text();
          } else {
            throw new Error('Failed to load');
          }
        })
        .then(md => {
          displayMarkdown(md);
        })
        .catch(err => {
          if (projectsContent && projectsContent[projectId]) {
            displayMarkdown(projectsContent[projectId]);
          } else {
            spinner.classList.add('hidden');
            detailContent.innerHTML = '<p>Error loading project details. Please run the site via an HTTP server (e.g., python3 -m http.server).</p>';
            console.error(err);
          }
        });
    });
  });

  function closeDetail() {
    pageContent.classList.remove('slide');
    detailView.classList.remove('open');
    detailContent.innerHTML = '';
    resetFooter();
    detailHeader.classList.remove('scrolled');
    // clear any inline drag transforms and transitions
    detailView.style.transform = '';
    pageContent.style.transform = '';
    detailView.style.transition = '';
    pageContent.style.transition = '';
  }

  closeBtn.addEventListener('click', closeDetail);

  // Listen to hashchange and open project based on URL hash
  function openProjectFromHash() {
    const hash = window.location.hash;
    if (hash.startsWith('#project=')) {
      const projectId = hash.substring('#project='.length);
      const link = document.querySelector(`.accordion-content a[data-project$="${projectId}.md"]`);
      if (link) {
        link.click();
      }
    }
  }
  window.addEventListener('hashchange', openProjectFromHash);
  // Open project if hash present on initial load
  openProjectFromHash();
  
  // Interactive swipe-to-close: drag detail panel by left edge and close if threshold exceeded
  (function setupInteractiveSwipeToClose() {
    let startX = 0, startY = 0, initialPageLeft = 0;
    let dragging = false;
    let thresholdPx = 0;

    detailView.addEventListener('touchstart', e => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      const panelRect = detailView.getBoundingClientRect();
      const edgeRegion = 20; // px from left edge of detail panel
      // Start drag only if touch begins at the panel's left margin
      if (touch.clientX >= panelRect.left && touch.clientX <= panelRect.left + edgeRegion) {
        dragging = true;
        startX = touch.clientX;
        startY = touch.clientY;
        // record the current pageContent left offset
        initialPageLeft = pageContent.getBoundingClientRect().left;
        thresholdPx = detailView.offsetWidth * 0.3;
        // disable transitions for direct finger-follow movement
        detailView.style.transition = 'none';
        pageContent.style.transition = 'none';
      }
    });

    detailView.addEventListener('touchmove', e => {
      if (!dragging) return;
      const touch = e.touches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      // Ignore mostly vertical drags
      if (Math.abs(dy) > Math.abs(dx)) return;
      if (dx > 0) {
        detailView.style.transform = `translateX(${dx}px)`;
        pageContent.style.transform = `translateX(${initialPageLeft + dx}px)`;
      }
    });

    detailView.addEventListener('touchend', e => {
      if (!dragging) return;
      dragging = false;
      const endX = e.changedTouches[0].clientX;
      const dx = endX - startX;
      // restore CSS transition behavior
      detailView.style.transition = '';
      pageContent.style.transition = '';
      if (dx > thresholdPx) {
        // animate panel off-screen, then finalize close
        detailView.style.transform = `translateX(${detailView.offsetWidth}px)`;
        pageContent.style.transform = `translateX(${initialPageLeft + detailView.offsetWidth}px)`;
        setTimeout(() => {
          closeDetail();
        }, 300);
      } else {
        // snap back to original position
        detailView.style.transform = '';
        pageContent.style.transform = '';
        // Clear URL hash on closing detail view
        window.location.hash = '';
      }
    });
  })();

  function openDetail() {
    pageContent.classList.add('slide');
    detailView.classList.add('open');
    shiftFooter();
  }

  function shiftFooter() {
    // Only on desktop viewports
    if (window.innerWidth >= 768) {
      const detailWidth = detailView.getBoundingClientRect().width;
      const shift = detailWidth / 2;
      footerSocials.style.transform = `translateX(-${shift}px)`;
    }
  }

  function resetFooter() {
    footerSocials.style.transform = '';
  }

  // Dock magnification effect (hover-capable devices only)
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const dock = document.querySelector('.socials');
    const dockIcons = Array.from(dock.querySelectorAll('img'));
    const maxScale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dock-max-scale')) || 1.5;
    const minScale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dock-min-scale')) || 1;
    const dockDistance = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dock-distance')) || 100;

    dock.addEventListener('mousemove', (e) => {
      dockIcons.forEach((icon) => {
        const rect = icon.getBoundingClientRect();
        const iconCenterX = rect.left + rect.width / 2;
        const distance = Math.min(Math.abs(e.clientX - iconCenterX), dockDistance);
        const scale = minScale + (maxScale - minScale) * (1 - distance / dockDistance);
        icon.style.transform = `scale(${scale})`;
      });
    });

    dock.addEventListener('mouseleave', () => {
      dockIcons.forEach((icon) => {
        icon.style.transform = '';
      });
    });
    }
  
  // Everboard carousel initialization
    function initEverboardCarousel(root = document) {
      const carousel = root.querySelector('.header_carrousel');
      if (!carousel) return;
      const screenWrapper = carousel.querySelector('.screen_wrapper');
      const iconWrapper = carousel.querySelector('.icon_wrapper');

      const screens = Array.from(screenWrapper.children);
      const screenWidth = 229;
      const pauseDuration = 4000;
      const animationDuration = 1000;

      // Compute icon dimensions and spacing for centering
      const iconElems = iconWrapper.children;
      const icons = Array.from(iconElems);
      const iconWidth = iconElems[0].offsetWidth;
      const iconSpacing = iconElems[1].offsetLeft - iconElems[0].offsetLeft;
      const containerWidth = iconWrapper.parentElement.clientWidth;

      // Clone for infinite scroll
      screenWrapper.appendChild(screens[0].cloneNode(true));
      const initialIcons = Array.from(iconElems);
      initialIcons.forEach(icon => iconWrapper.appendChild(icon.cloneNode(true)));

      // Center the first icon without animation
      iconWrapper.style.transition = 'none';
      iconWrapper.style.marginLeft = `${(containerWidth / 2) - (iconWidth / 2)}px`;

      // Set wrapper widths
      const totalScreens = screenWrapper.children.length;
      const totalIcons = iconWrapper.children.length;
      screenWrapper.style.width = `${totalScreens * screenWidth}px`;
      // Allow flex container to size automatically for centering
      iconWrapper.style.width = 'auto';

      let currentIndex = 0;
      let slideInterval;

      function goTo(index) {
        // Slide screen
        screenWrapper.style.transition = `margin-left ${animationDuration}ms ease`;
        screenWrapper.style.marginLeft = `-${index * screenWidth}px`;

        // Center the corresponding icon
        iconWrapper.style.transition = `margin-left ${animationDuration}ms ease`;
        const offset = index * iconSpacing;
        const newMarginLeft = (containerWidth / 2) - offset - (iconWidth / 2);
        iconWrapper.style.marginLeft = `${newMarginLeft}px`;

        currentIndex = index;
      }

      function nextSlide() {
        const next = currentIndex + 1;
        goTo(next);
        if (next >= totalScreens - 1) {
          setTimeout(() => {
            screenWrapper.style.transition = 'none';
            screenWrapper.style.marginLeft = '0';
            iconWrapper.style.transition = 'none';
            // Recenter first icon
            iconWrapper.style.marginLeft = `${(containerWidth / 2) - (iconWidth / 2)}px`;
            currentIndex = 0;
          }, animationDuration);
        }
      }

      icons.forEach((icon, idx) => {
        icon.style.cursor = 'pointer';
        icon.addEventListener('click', () => {
          clearInterval(slideInterval);
          goTo(idx);
          slideInterval = setInterval(nextSlide, pauseDuration);
        });
      });

      slideInterval = setInterval(nextSlide, pauseDuration);
    }

    // Initialize on page load (no-op if carousel not in DOM yet)
    initEverboardCarousel();
  });