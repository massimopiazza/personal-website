/**
 * Main JavaScript for Massimo Piazza personal site
 * - Handles navigation, bio toggle, smooth scroll, accordion, and project detail view
 */

document.addEventListener('DOMContentLoaded', () => {
  const expandAllBtn = document.getElementById('expandAll');

  // Image Viewer State
  let viewerImages = [];
  let viewerIndex = 0;
  const imageViewer = document.getElementById('imageViewer');
  const viewerTrack = document.getElementById('viewerTrack');
  const viewerCounter = document.getElementById('viewerCounter');
  const viewerCaption = document.getElementById('viewerCaption');
  const viewerClose = document.getElementById('viewerClose');
  const viewerPrev = document.getElementById('viewerPrev');
  const viewerNext = document.getElementById('viewerNext');
  const viewerContainer = imageViewer ? imageViewer.querySelector('.viewer-image-container') : null;

  // Track state
  const TRACK_GAP_PX = 40; // Gap between images
  let trackItems = []; // Array of div.track-item elements

  // Touch State
  const SWIPE_THRESHOLD = 0.2; // 20% of screen width to trigger
  let isDragging = false;
  let startX = 0;
  let currentX = 0;
  let isAnimating = false;

  function createTrackItem() {
    const div = document.createElement('div');
    div.classList.add('track-item');

    // Wrapper for strict centering of image + attached caption
    const wrapper = document.createElement('div');
    wrapper.classList.add('viewer-content-wrapper');

    const img = document.createElement('img');
    img.classList.add('viewer-image');
    img.img = img; // Self-reference for legacy compatibility if needed, though clean code prefers direct access
    img.draggable = false; // Disable native drag

    const caption = document.createElement('div');
    caption.classList.add('viewer-dynamic-caption');

    wrapper.appendChild(img);
    wrapper.appendChild(caption);
    div.appendChild(wrapper);

    return { div, img, caption };
  }

  function initTrack() {
    if (!viewerTrack) return;
    viewerTrack.innerHTML = '';
    trackItems = [];
    // Create 3 items: prev, curr, next
    for (let i = 0; i < 3; i++) {
      const item = createTrackItem();
      viewerTrack.appendChild(item.div);
      trackItems.push(item);
    }
  }

  initTrack();

  function openImageViewer(index) {
    viewerIndex = index;
    updateViewerContent(false); // Immediate update without animation
    imageViewer.classList.remove('hidden');
    // small delay to allow display:flex to apply before opacity transition
    setTimeout(() => {
      imageViewer.classList.add('visible');
    }, 10);
    document.addEventListener('keydown', handleViewerKeydown);
  }

  function closeImageViewer() {
    imageViewer.classList.remove('visible');
    setTimeout(() => {
      imageViewer.classList.add('hidden');
      // Clear sources to stop memory usage
      trackItems.forEach(item => {
        item.img.src = '';
        item.caption.textContent = '';
      });
      if (viewerCaption) viewerCaption.textContent = '';
      viewerCounter.textContent = '';
    }, 300);
    document.removeEventListener('keydown', handleViewerKeydown);
  }

  function getImgData(idx) {
    if (idx < 0 || idx >= viewerImages.length) return null;
    return viewerImages[idx];
  }

  function updateViewerContent(animate = false) {
    if (viewerImages.length === 0) return;

    // Determine indices
    const prevIdx = viewerIndex - 1;
    const currIdx = viewerIndex;
    const nextIdx = viewerIndex + 1;

    // Update Image Sources & Visibility
    const prevItem = trackItems[0];
    const currItem = trackItems[1];
    const nextItem = trackItems[2];

    const prevData = getImgData(prevIdx);
    const currData = getImgData(currIdx);
    const nextData = getImgData(nextIdx);

    // Helper to set item
    const setItem = (item, data) => {
      if (data) {
        if (item.img.getAttribute('src') !== data.src) {
          item.img.src = data.src;
          item.img.alt = data.alt;
          item.caption.textContent = data.caption;
        }
        item.div.style.display = 'flex';
      } else {
        item.div.style.display = 'none';
      }
    };

    if (!animate) {
      setItem(prevItem, prevData);
      setItem(currItem, currData);
      setItem(nextItem, nextData);

      // Position items
      resetTrackPositions();
    }

    // Update Counter
    if (viewerImages.length > 1) {
      viewerCounter.textContent = `${viewerIndex + 1} of ${viewerImages.length}`;
      viewerCounter.style.display = 'block';
    } else {
      viewerCounter.style.display = 'none';
    }

    // Update Buttons (Logic: Hide if at ends)
    if (viewerIndex === 0) {
      viewerPrev.classList.add('hidden');
    } else {
      viewerPrev.classList.remove('hidden');
    }

    if (viewerIndex === viewerImages.length - 1) {
      viewerNext.classList.add('hidden');
    } else {
      viewerNext.classList.remove('hidden');
    }
  }

  function resetTrackPositions() {
    // Force a read of width to ensure we have current dimensions
    const width = viewerTrack.clientWidth || window.innerWidth;
    const gap = TRACK_GAP_PX;

    if (!trackItems[0] || !trackItems[1] || !trackItems[2]) return;

    // trackItems[0] = prev
    trackItems[0].div.style.transform = `translateX(${-width - gap}px)`;
    // trackItems[1] = curr
    trackItems[1].div.style.transform = `translateX(0px)`;
    // trackItems[2] = next
    trackItems[2].div.style.transform = `translateX(${width + gap}px)`;

    trackItems.forEach(t => t.div.style.transition = 'none');
  }

  // Handle window resize to prevent overlapping images
  window.addEventListener('resize', () => {
    if (imageViewer.classList.contains('visible') || imageViewer.classList.contains('hidden')) {
      // Only reset if viewer exists/initialized
      // Use RequestAnimationFrame to debounce slightly/ensure layout is ready
      requestAnimationFrame(() => {
        resetTrackPositions();
      });
    }
  });

  function nextImage() {
    if (isAnimating) return;
    if (viewerIndex >= viewerImages.length - 1) return;
    animateSlide('next');
  }

  function prevImage() {
    if (isAnimating) return;
    if (viewerIndex <= 0) return;
    animateSlide('prev');
  }

  function animateSlide(dir) {
    isAnimating = true;
    const width = viewerTrack.clientWidth || window.innerWidth;
    const gap = TRACK_GAP_PX;

    // Enable transition
    trackItems.forEach(t => t.div.style.transition = 'transform 0.3s ease-out');

    if (dir === 'next') {
      // Current moves left
      trackItems[1].div.style.transform = `translateX(${-width - gap}px)`;
      // Next moves into center
      trackItems[2].div.style.transform = `translateX(0px)`;
      // Prev moves further left (optional, or just stays)
    } else {
      // Current moves right
      trackItems[1].div.style.transform = `translateX(${width + gap}px)`;
      // Prev moves into center
      trackItems[0].div.style.transform = `translateX(0px)`;
    }

    setTimeout(() => {
      if (dir === 'next') viewerIndex++;
      else viewerIndex--;

      updateViewerContent(false);
      isAnimating = false;
    }, 300);
  }

  function handleViewerKeydown(e) {
    if (!imageViewer.classList.contains('visible')) return;
    if (e.key === 'Escape') closeImageViewer();
    if (e.key === 'ArrowRight') nextImage();
    if (e.key === 'ArrowLeft') prevImage();
  }

  // Event Listeners for Viewer Buttons
  if (viewerClose) viewerClose.addEventListener('click', closeImageViewer);
  if (viewerNext) viewerNext.addEventListener('click', (e) => { e.stopPropagation(); nextImage(); });
  if (viewerPrev) viewerPrev.addEventListener('click', (e) => { e.stopPropagation(); prevImage(); });

  // Mobile Swipe Logic (Continuous Physics)
  // Only enable if multiple images
  const edgeThreshold = 30; // disable swipe if start near edge

  if (viewerTrack) {
    viewerTrack.addEventListener('touchstart', (e) => {
      if (viewerImages.length <= 1) return;
      if (isAnimating) return;

      const touch = e.touches[0];

      // Edge guard for browser back gesture (Swipe right from left edge)
      if (touch.clientX < edgeThreshold) {
        // Let the browser handle it... OR prevent it? 
        // User asked: "On mobile only ... disabled ... As you close it, enabled."
        // We preventDefault here to try to block browser back, but iOS is aggressive.
        // But we can only preventDefault if usage is passive: false.
        // Let's assume passive: false for touchmove. 
        // BUT: if we preventDefault on touchstart, we stop all scrolling/clicks.
        // Since this is the viewer, stopping all scrolling is GOOD.
        // We want the viewer to be the only thing consuming touches.
      } else if (touch.clientX > window.innerWidth - edgeThreshold) {
        // Right edge
      }

      // We capture dragging if not near edge? Or capture ALL?
      // Let's capture ALL for the viewer functionality.

      isDragging = true;
      startX = touch.clientX;
      currentX = touch.clientX;

      // Clear transitions for direct matching
      trackItems.forEach(t => t.div.style.transition = 'none');
    }, { passive: false }); // non-passive to allow preventing default

    viewerTrack.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      const touch = e.touches[0];
      const dx = touch.clientX - startX;
      currentX = touch.clientX;

      // Prevent browser gestures / scrolling
      if (e.cancelable) e.preventDefault();

      // Move items
      const width = viewerTrack.clientWidth;
      const gap = TRACK_GAP_PX;

      // Apply dx
      // prev at -width-gap
      // curr at 0
      // next at width+gap

      if (trackItems[0].div.style.display !== 'none')
        trackItems[0].div.style.transform = `translateX(${-width - gap + dx}px)`;

      trackItems[1].div.style.transform = `translateX(${dx}px)`;

      if (trackItems[2].div.style.display !== 'none')
        trackItems[2].div.style.transform = `translateX(${width + gap + dx}px)`;

    }, { passive: false });

    viewerTrack.addEventListener('touchend', (e) => {
      if (!isDragging) return;
      isDragging = false;

      const dx = currentX - startX;
      const width = viewerTrack.clientWidth;
      const threshold = width * SWIPE_THRESHOLD;

      // Determine snap
      // If dx < -threshold -> Next
      // If dx > threshold -> Prev
      // Else -> Snap back

      let dir = null;
      if (dx < -threshold && viewerIndex < viewerImages.length - 1) {
        dir = 'next';
      } else if (dx > threshold && viewerIndex > 0) {
        dir = 'prev';
      }

      // Animate Result
      trackItems.forEach(t => t.div.style.transition = 'transform 0.2s ease-out');
      const gap = TRACK_GAP_PX;

      if (dir === 'next') {
        trackItems[1].div.style.transform = `translateX(${-width - gap}px)`;
        trackItems[2].div.style.transform = `translateX(0px)`;
        setTimeout(() => {
          viewerIndex++;
          updateViewerContent(false);
        }, 200);
      } else if (dir === 'prev') {
        trackItems[1].div.style.transform = `translateX(${width + gap}px)`;
        trackItems[0].div.style.transform = `translateX(0px)`;
        setTimeout(() => {
          viewerIndex--;
          updateViewerContent(false);
        }, 200);
      } else {
        // Snap back
        trackItems[0].div.style.transform = `translateX(${-width - gap}px)`;
        trackItems[1].div.style.transform = `translateX(0px)`;
        trackItems[2].div.style.transform = `translateX(${width + gap}px)`;
      }
    });
  }

  // Close on click outside (only if not dragged)
  if (imageViewer) imageViewer.addEventListener('click', (e) => {
    // We need to differentiate click from drag release.
    // Ideally, if a drag occurred, we don't close.
    // The boolean `isDragging` is reset on touchend. 
    // We can track `hasMoved` in touch logic.
    // For mouse clicks (desktop): just close if target is container.

    // Check if target is image or container
    if (e.target.classList.contains('viewer-image')) return; // Clicked image: do nothing (or toggle zoom?)
    if (e.target.classList.contains('viewer-track') ||
      e.target.classList.contains('viewer-image-container') ||
      e.target === imageViewer ||
      e.target.classList.contains('track-item')) {
      closeImageViewer();
    }
  });

  function displayMarkdown(md, navInfo = null) {
    spinner.classList.add('hidden');
    detailContent.innerHTML = marked.parse(md);
    initEverboardCarousel(detailContent);
    // Ensure links open in new tab
    detailContent.querySelectorAll('a').forEach(link => link.setAttribute('target', '_blank'));
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

    viewerImages = zoomableImages.map(img => {
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
    zoomableImages.forEach((img, index) => {
      img.classList.add('zoomable');
      img.addEventListener('click', () => {
        openImageViewer(index);
      });
    });

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

    if (dock && dockIcons.length) {
      const maxScale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dock-max-scale')) || 1.5;
      const minScale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dock-min-scale')) || 1;
      const dockDistance = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dock-distance')) || 100;

      // Per-icon animation state for smooth, macOS-like motion
      const iconState = dockIcons.map(() => ({
        currentScale: minScale,
        targetScale: minScale
      }));

      let animationFrameId = null;

      function animateDock() {
        let stillAnimating = false;

        dockIcons.forEach((icon, index) => {
          const state = iconState[index];
          const delta = state.targetScale - state.currentScale;

          // Smoothly ease towards the target scale (spring-like interpolation)
          if (Math.abs(delta) > 0.001) {
            stillAnimating = true;
            state.currentScale += delta * 0.2;
          } else {
            state.currentScale = state.targetScale;
          }

          const scale = state.currentScale;

          // Give the icon a subtle "lift" as it grows, anchored at the bottom
          const iconRect = icon.getBoundingClientRect();
          const liftHeighFraction = 0.05; // height-based lift
          const lift = (scale - 1) * (iconRect.height * liftHeighFraction);
          icon.style.transformOrigin = 'center bottom';
          icon.style.transform = `translateY(${-lift}px) scale(${scale})`;
        });

        if (stillAnimating) {
          animationFrameId = requestAnimationFrame(animateDock);
        } else {
          animationFrameId = null;
        }
      }

      function updateTargets(mouseX) {
        dockIcons.forEach((icon, index) => {
          const rect = icon.getBoundingClientRect();
          const iconCenterX = rect.left + rect.width / 2;

          // Distance from mouse to icon center, with a finite influence window
          const distance = Math.abs(mouseX - iconCenterX);
          const clamped = Math.min(distance, dockDistance);
          const t = clamped / dockDistance; // 0..1

          // Gaussian falloff: central icon at maxScale, neighbors fall off smoothly
          const influence = Math.exp(-t * t * 4); // 4 controls the "sharpness" of the bump
          iconState[index].targetScale = minScale + (maxScale - minScale) * influence;
        });

        if (!animationFrameId) {
          animationFrameId = requestAnimationFrame(animateDock);
        }
      }

      dock.addEventListener('mouseenter', () => {
        // Disable CSS transform transitions while our custom animation runs
        dock.classList.add('hovering');
      });

      dock.addEventListener('mousemove', (e) => {
        updateTargets(e.clientX);
      });

      dock.addEventListener('mouseleave', () => {
        // Restore all icons back to their resting scale smoothly
        dock.classList.remove('hovering');
        iconState.forEach((state) => {
          state.targetScale = minScale;
        });

        if (!animationFrameId) {
          animationFrameId = requestAnimationFrame(animateDock);
        }
      });
    }
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