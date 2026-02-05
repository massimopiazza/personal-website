/**
 * Project detail panel: fetch/render markdown, image loading placeholders, image viewer integration,
 * deep-linking via hash, swipe-to-close, and Everboard carousel.
 */

(() => {
  // Web Components
  class CitationLink extends HTMLElement {
    constructor() {
      super();
    }

    connectedCallback() {
      const n = this.getAttribute('n');
      const href = this.getAttribute('href');

      if (n && href) {
        this.innerHTML = `
        <sup>
          <a href="${href}" target="_blank" rel="noopener noreferrer" style="text-decoration: none;">
            (${n})
          </a>
        </sup>
      `;
      }
    }
  }

  // Check if already defined to avoid errors on hot reload or multiple inclusions
  if (!customElements.get('citation-link')) {
    customElements.define('citation-link', CitationLink);
  }

  const everboardStateByCarousel = new WeakMap();

  function stopEverboardCarousel(root = document) {
    root.querySelectorAll('.header_carrousel').forEach((carousel) => {
      const state = everboardStateByCarousel.get(carousel);
      if (state && state.slideInterval) {
        clearInterval(state.slideInterval);
        state.slideInterval = null;
      }
    });
  }

  function initEverboardCarousel(root = document) {
    const carousel = root.querySelector('.header_carrousel');
    if (!carousel) return;
    if (everboardStateByCarousel.has(carousel)) return;

    const screenWrapper = carousel.querySelector('.screen_wrapper');
    const iconWrapper = carousel.querySelector('.icon_wrapper');
    if (!screenWrapper || !iconWrapper) return;

    const initialScreens = Array.from(screenWrapper.children);
    const initialIcons = Array.from(iconWrapper.children);
    if (initialScreens.length === 0 || initialIcons.length === 0) return;

    const screenWidth = 229;
    const pauseDuration = 4000;
    const animationDuration = 1000;

    // Clone for infinite scroll (once per carousel instance)
    screenWrapper.appendChild(initialScreens[0].cloneNode(true));
    initialIcons.forEach(icon => iconWrapper.appendChild(icon.cloneNode(true)));

    function getMetrics() {
      const iconElems = iconWrapper.children;
      const iconWidth = iconElems[0] ? iconElems[0].offsetWidth : 0;
      const iconSpacing = (iconElems[1] && iconElems[0]) ? (iconElems[1].offsetLeft - iconElems[0].offsetLeft) : 0;
      const containerWidth = iconWrapper.parentElement ? iconWrapper.parentElement.clientWidth : 0;
      return { iconWidth, iconSpacing, containerWidth };
    }

    const state = {
      currentIndex: 0,
      slideInterval: null,
      originalIconCount: initialIcons.length,
      originalScreenCount: initialScreens.length,
      getTotalScreens: () => screenWrapper.children.length,
    };

    function centerFirstIconNoAnimation() {
      const { iconWidth, containerWidth } = getMetrics();
      iconWrapper.style.transition = 'none';
      iconWrapper.style.marginLeft = `${(containerWidth / 2) - (iconWidth / 2)}px`;
    }

    function goTo(index) {
      // Slide screen
      screenWrapper.style.transition = `margin-left ${animationDuration}ms ease`;
      screenWrapper.style.marginLeft = `-${index * screenWidth}px`;

      // Center the corresponding icon
      const { iconWidth, iconSpacing, containerWidth } = getMetrics();
      iconWrapper.style.transition = `margin-left ${animationDuration}ms ease`;
      const offset = index * iconSpacing;
      const newMarginLeft = (containerWidth / 2) - offset - (iconWidth / 2);
      iconWrapper.style.marginLeft = `${newMarginLeft}px`;

      state.currentIndex = index;
    }

    function nextSlide() {
      const totalScreens = state.getTotalScreens();
      const next = state.currentIndex + 1;
      goTo(next);
      if (next >= totalScreens - 1) {
        setTimeout(() => {
          screenWrapper.style.transition = 'none';
          screenWrapper.style.marginLeft = '0';
          iconWrapper.style.transition = 'none';
          // Recenter first icon
          centerFirstIconNoAnimation();
          state.currentIndex = 0;
        }, animationDuration);
      }
    }

    // Set wrapper widths
    const totalScreens = state.getTotalScreens();
    screenWrapper.style.width = `${totalScreens * screenWidth}px`;
    // Allow flex container to size automatically for centering
    iconWrapper.style.width = 'auto';

    // Center the first icon without animation
    centerFirstIconNoAnimation();

    // Click listeners for all icons (original + clones)
    Array.from(iconWrapper.children).forEach((icon, idx) => {
      icon.style.cursor = 'pointer';
      icon.addEventListener('click', () => {
        if (state.slideInterval) clearInterval(state.slideInterval);
        goTo(idx % state.originalIconCount);
        state.slideInterval = setInterval(nextSlide, pauseDuration);
      });
    });

    state.slideInterval = setInterval(nextSlide, pauseDuration);

    everboardStateByCarousel.set(carousel, state);
  }

  function initProjectDetail({ navHeight, extraOffset, expandAllBtn, imageViewer }) {
    // Project detail view setup
    const pageContent = document.getElementById('pageContent');
    const detailView = document.getElementById('projectDetail');
    const detailContent = document.getElementById('detailContent');
    const closeBtn = document.getElementById('closeDetail');
    const footerSocials = document.querySelector('footer .socials');
    const detailHeader = document.querySelector('.detail-header');
    const spinner = document.getElementById('loadingSpinner');

    // Expand All button handler
    if (expandAllBtn) {
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
    }

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

    function closeDetail() {
      stopEverboardCarousel(detailContent);
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

    function ensureNewTabLinks(root) {
      root.querySelectorAll('a').forEach(link => {
        link.setAttribute('target', '_blank');
        const existing = (link.getAttribute('rel') || '').split(/\s+/).filter(Boolean);
        if (!existing.includes('noopener')) existing.push('noopener');
        if (!existing.includes('noreferrer')) existing.push('noreferrer');
        link.setAttribute('rel', existing.join(' '));
      });
    }

    function displayMarkdown(md, navInfo = null) {
      spinner.classList.add('hidden');
      detailContent.innerHTML = marked.parse(md);
      initEverboardCarousel(detailContent);
      // Ensure links open in new tab
      ensureNewTabLinks(detailContent);
      adjustTitleFontSize();

      // Setup Image Placeholder & Loader
      const lazyImages = Array.from(detailContent.querySelectorAll('img'));
      lazyImages.forEach(img => {
        const isIcon = img.closest('.icon_wrapper') ||
          img.hasAttribute('data-no-zoom') ||
          (img.getAttribute('alt') || '').includes('#no-zoom');

        if (isIcon) return;

        // Wrap if not loaded (or always wrap to ensure consistent layout?
        // If we only wrap !complete, cached images have no wrapper.
        // If wrapper has styles that affect layout (like width), this is inconsistent.
        // But we copied style.width to wrapper.
        // Better to check complete to avoid "loading" state, but maybe consistently wrap for safety?
        // No, existing images without wrapper are fine.
        if (img.complete && img.naturalHeight !== 0) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'image-loader-wrapper';
        if (img.style.width) {
          wrapper.style.width = img.style.width;
          img.style.width = '100%';
          img.style.height = 'auto';
        }

        img.parentNode.insertBefore(wrapper, img);
        wrapper.appendChild(img);

        const wAttr = img.getAttribute('width');
        const hAttr = img.getAttribute('height');
        // Default to 100 space if unknown, but script should have populated it
        const viewBox = (wAttr && hAttr) ? `0 0 ${wAttr} ${hAttr}` : '0 0 100 100';
        // Rx estimation: 1.5% of width or fixed? Fixed 20 seems okay for high-res.
        const rx = wAttr ? Math.max(8, wAttr * 0.015) : 8;

        const loader = document.createElement('div');
        loader.className = 'loader-overlay';
        loader.innerHTML = `
        <svg viewBox="${viewBox}" preserveAspectRatio="none">
          <rect x="0" y="0" width="${wAttr || 100}" height="${hAttr || 100}"
                rx="${rx}" ry="${rx}"
                pathLength="100" class="loader-snake" vector-effect="non-scaling-stroke" />
        </svg>
      `;

        wrapper.appendChild(loader);
        wrapper.classList.add('loading');

        img.onload = () => {
          wrapper.classList.remove('loading');
          wrapper.classList.add('loaded');
          setTimeout(() => { if (loader.parentNode) loader.remove(); }, 600);
        };

        // Safety check in case it loaded while executing
        if (img.complete && img.naturalHeight !== 0) {
          img.onload();
        }
      });

      // Setup Image Viewer
      const allImages = Array.from(detailContent.querySelectorAll('img'));

      // Filter images:
      // 1. Exclude carousel icons (inside .icon_wrapper)
      // 2. Exclude images with data-no-zoom attribute
      // 3. Exclude images with #no-zoom in alt text
      const zoomableImages = allImages.filter(img => {
        // Check parent
        if (img.closest('.icon_wrapper')) return false;
        // Check attribute
        if (img.hasAttribute('data-no-zoom')) return false;
        // Check alt text
        const alt = img.getAttribute('alt') || '';
        if (alt.includes('#no-zoom')) return false;

        return true;
      });

      const viewerImages = zoomableImages.map(img => {
        const alt = img.getAttribute('alt') || '';
        let caption = alt;
        const figure = img.closest('figure');
        const figCap = figure ? figure.querySelector('figcaption') : null;
        if (figCap && figCap.textContent.trim()) {
          caption = figCap.textContent;
        }
        return {
          src: img.src,
          alt: alt,
          caption: caption.replace('#no-zoom', '').trim()
        };
      });

      if (imageViewer) {
        imageViewer.setImages(viewerImages);
        zoomableImages.forEach((img, index) => {
          img.classList.add('zoomable');
          img.addEventListener('click', () => {
            imageViewer.open(index);
          });
        });
      }

      // Inject Navigation Buttons (Mobile Only)
      if (navInfo && (navInfo.prev || navInfo.next)) {
        const navContainer = document.createElement('div');
        navContainer.className = 'detail-nav-buttons';

        // Previous Button
        if (navInfo.prev) {
          const prevBtn = document.createElement('button');
          prevBtn.className = 'nav-btn prev';
          prevBtn.innerHTML = `
          <svg viewBox="0 0 24 24" aria-hidden="true" class="nav-icon left">
            <polyline points="6,10 12,16 18,10" />
          </svg>
          <span class="nav-text">${navInfo.prev.name}</span>
        `;
          prevBtn.onclick = (e) => {
            e.stopPropagation();
            const originalLink = document.querySelector(`.accordion-content a[data-project="${navInfo.prev.path}"]`);
            if (originalLink) originalLink.click();
          };
          navContainer.appendChild(prevBtn);
        }

        // Next Button
        if (navInfo.next) {
          const nextBtn = document.createElement('button');
          nextBtn.className = 'nav-btn next';
          nextBtn.innerHTML = `
          <span class="nav-text">${navInfo.next.name}</span>
          <svg viewBox="0 0 24 24" aria-hidden="true" class="nav-icon right">
            <polyline points="6,10 12,16 18,10" />
          </svg>
        `;
          nextBtn.onclick = (e) => {
            e.stopPropagation();
            const originalLink = document.querySelector(`.accordion-content a[data-project="${navInfo.next.path}"]`);
            if (originalLink) originalLink.click();
          };
          // If there is no prev button, push to right
          if (!navInfo.prev) {
            nextBtn.style.marginLeft = 'auto'; // push to right
          }
          navContainer.appendChild(nextBtn);
        }

        detailContent.appendChild(navContainer);
      }
    }

    // Adjust font size and re-center footer icons on detail view resize
    window.addEventListener('resize', () => {
      if (detailView.classList.contains('open')) {
        adjustTitleFontSize();
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
      const id = mdPath.split('/').pop().replace('.md', '');
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

        // Determine navigation context (Previous/Next in same accordion section)
        let navInfo = { prev: null, next: null };
        try {
          const item = link.closest('li');
          if (item) {
            const list = item.parentElement;
            if (list && list.tagName === 'UL') {
              const siblings = Array.from(list.querySelectorAll('a[data-project]'));
              if (siblings.length > 1) {
                const currentIndex = siblings.indexOf(link);
                if (currentIndex > 0) {
                  const prevLink = siblings[currentIndex - 1];
                  navInfo.prev = {
                    name: prevLink.textContent,
                    path: prevLink.getAttribute('data-project')
                  };
                }
                if (currentIndex < siblings.length - 1) {
                  const nextLink = siblings[currentIndex + 1];
                  navInfo.next = {
                    name: nextLink.textContent,
                    path: nextLink.getAttribute('data-project')
                  };
                }
              }
            }
          }
        } catch (err) {
          console.warn('Navigation context could not be determined:', err);
        }

        // Clear old content and show spinner
        stopEverboardCarousel(detailContent);
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
            displayMarkdown(md, navInfo);
          })
          .catch(err => {
            if (typeof projectsContent !== 'undefined' && projectsContent[projectId]) {
              displayMarkdown(projectsContent[projectId], navInfo);
            } else {
              spinner.classList.add('hidden');
              detailContent.innerHTML = '<p>Error loading project details. Please run the site via an HTTP server (e.g., python3 -m http.server).</p>';
              console.error(err);
            }
          });
      });
    });

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
  }

  window.squareospace = window.squareospace || {};
  window.squareospace.initProjectDetail = initProjectDetail;
})();

