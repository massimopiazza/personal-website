/**
 * Image viewer modal (swipe + pinch/double-tap zoom) used in project detail pages.
 */

(() => {
  function createImageViewer() {
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

    if (!imageViewer || !viewerTrack || !viewerCounter || !viewerClose || !viewerPrev || !viewerNext) {
      return null;
    }

    // Track state
    const TRACK_GAP_PX = 40; // Gap between images
    let trackItems = []; // Array of div.track-item elements

    // Touch State
    const SWIPE_THRESHOLD = 0.2; // 20% of screen width to trigger
    let isDragging = false;
    let startX = 0;
    let currentX = 0;
    let isAnimating = false;

    // Zoom State
    let zoomScale = 1;
    let zoomTranslateX = 0;
    let zoomTranslateY = 0;
    let isZooming = false; // true if scale > 1
    let initialPinchDistance = 0;
    let initialPinchScale = 1;
    let lastTapTime = 0;
    let lastPanX = 0;
    let lastPanY = 0;
    const DOUBLE_TAP_DELAY = 300;

    // Helper to apply transform to current image wrapper
    function updateImageTransform() {
      const currentItem = trackItems[1];
      if (!currentItem) return;

      // Target the wrapper div to zoom image + caption together
      let target = currentItem.img.parentElement || currentItem.img;

      if (zoomScale <= 1) {
        zoomScale = 1;
        zoomTranslateX = 0;
        zoomTranslateY = 0;
        target.style.transform = '';
        isZooming = false;
      } else {
        isZooming = true;
        target.style.transform = `translate(${zoomTranslateX}px, ${zoomTranslateY}px) scale(${zoomScale})`;
      }
    }

    function resetZoomState() {
      zoomScale = 1;
      zoomTranslateX = 0;
      zoomTranslateY = 0;
      isZooming = false;
      isDragging = false;

      // Reset transform on all items to be safe
      trackItems.forEach(item => {
        let target = item.img.parentElement || item.img;
        if (target) {
          target.style.transform = '';
          target.style.transition = 'none';
        }
      });
    }

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

      const updateBorder = () => updateImageBorderRadius(img);
      img.onload = updateBorder;
      // Also observe resize just in case? Or rely on window resize
      return { div, img, caption };
    }

    function updateImageBorderRadius(img) {
      if (!img) return;
      // Mobile check: usually we only care if < 768px, but doing it always is safe
      // if CSS class only affects mobile via media query (which we did).

      // Check if image is practically full width
      const trackWidth = viewerTrack ? viewerTrack.clientWidth : window.innerWidth;
      const isFullWidth = img.offsetWidth >= trackWidth - 2; // small tolerance

      if (isFullWidth) {
        img.classList.add('full-width');
      } else {
        img.classList.remove('full-width');
      }
    }

    function initTrack() {
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

    function open(index) {
      if (!viewerImages || viewerImages.length === 0) return;
      document.body.style.overflow = 'hidden'; // Disable background scroll
      viewerIndex = index;
      updateViewerContent(false); // Immediate update without animation
      imageViewer.classList.remove('hidden');
      // small delay to allow display:flex to apply before opacity transition
      setTimeout(() => {
        imageViewer.classList.add('visible');
      }, 10);
      document.addEventListener('keydown', handleViewerKeydown);
    }

    function close() {
      document.body.style.overflow = ''; // Re-enable background scroll
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

    function setImages(images) {
      viewerImages = images || [];
      viewerIndex = 0;
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
            // Reset full-width class until load/check
            item.img.classList.remove('full-width');

            // Should check immediately if cached
            if (item.img.complete) {
              updateImageBorderRadius(item.img);
            }
          }
          item.div.style.display = 'flex';
          // Force check again for current item as it might be already loaded/displayed
          updateImageBorderRadius(item.img);
        } else {
          item.div.style.display = 'none';
        }
      };

      if (!animate) {
        setItem(prevItem, prevData);
        setItem(currItem, currData);
        setItem(nextItem, nextData);

        resetZoomState(); // Start fresh for new image

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

      trackItems.forEach(t => {
        t.div.style.transition = 'none';
        updateImageBorderRadius(t.img);
      });
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
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
    }

    // Event Listeners for Viewer Buttons
    viewerClose.addEventListener('click', close);
    viewerNext.addEventListener('click', (e) => { e.stopPropagation(); nextImage(); });
    viewerPrev.addEventListener('click', (e) => { e.stopPropagation(); prevImage(); });

    // Mobile Swipe & Zoom Logic
    // Only enable if track exists
    const edgeThreshold = 30; // disable swipe start if near edge

    if (viewerTrack) {
      function getDistance(t1, t2) {
        const dx = t1.clientX - t2.clientX;
        const dy = t1.clientY - t2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
      }

      // Handle Double Tap
      viewerTrack.addEventListener('touchend', (e) => {
        if (isDragging) return;

        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTapTime;

        if (tapLength < DOUBLE_TAP_DELAY && tapLength > 0) {
          // Double Tap Detected!
          e.preventDefault();

          if (zoomScale > 1) {
            // Zoom out
            zoomScale = 1;
            zoomTranslateX = 0;
            zoomTranslateY = 0;
          } else {
            // Zoom in
            zoomScale = 2.5;
            zoomTranslateX = 0;
            zoomTranslateY = 0;
          }
          // Animate it
          const currentItem = trackItems[1];
          let target = currentItem.img.parentElement || currentItem.img;
          target.style.transition = 'transform 0.3s ease-out';
          updateImageTransform();
          // Clear transition after animation
          setTimeout(() => { target.style.transition = ''; }, 300);

          lastTapTime = 0; // Reset
        } else {
          lastTapTime = currentTime;
        }
      });

      viewerTrack.addEventListener('touchstart', (e) => {
        if (isAnimating) return;

        if (e.touches.length === 2) {
          // Start Pinch
          isDragging = true;
          initialPinchDistance = getDistance(e.touches[0], e.touches[1]);
          initialPinchScale = zoomScale;

          // Remove transitions for direct control
          const currentItem = trackItems[1];
          let target = currentItem.img.parentElement || currentItem.img;
          target.style.transition = 'none';

        } else if (e.touches.length === 1) {
          // Start Swipe or Pan
          const touch = e.touches[0];

          // Edge guard? Only if not zoomed.
          if (zoomScale === 1 && (touch.clientX < edgeThreshold)) {
            // Allow browser back gesture?
          }

          isDragging = true;
          startX = touch.clientX;
          currentX = touch.clientX;

          // For panning zoomed image
          lastPanX = touch.clientX;
          lastPanY = touch.clientY;

          // Clear transitions
          trackItems.forEach(t => t.div.style.transition = 'none');
          const currentItem = trackItems[1];
          let target = currentItem.img.parentElement || currentItem.img;
          target.style.transition = 'none';
        }
      }, { passive: false });

      viewerTrack.addEventListener('touchmove', (e) => {
        if (!isDragging) return;

        // Always prevent default to stop scrolling
        if (e.cancelable) e.preventDefault();

        if (e.touches.length === 2) {
          // PINCH
          const dist = getDistance(e.touches[0], e.touches[1]);
          const currentItem = trackItems[1];
          const target = currentItem.img.parentElement || currentItem.img;

          if (target) {
            // New scale
            const scaleChange = dist / initialPinchDistance;
            zoomScale = initialPinchScale * scaleChange;

            // Limit min/max
            if (zoomScale < 0.5) zoomScale = 0.5; // allow minimal rubber band
            if (zoomScale > 4) zoomScale = 4;

            updateImageTransform();
          }
        } else if (e.touches.length === 1) {
          const touch = e.touches[0];

          if (zoomScale > 1) {
            // PAN (Zoomed)
            const dx = touch.clientX - lastPanX;
            const dy = touch.clientY - lastPanY;

            lastPanX = touch.clientX;
            lastPanY = touch.clientY;

            // Simply apply delta
            zoomTranslateX += dx;
            zoomTranslateY += dy;

            updateImageTransform();

          } else {
            // SWIPE (Track)
            const dx = touch.clientX - startX;
            currentX = touch.clientX;

            const width = viewerTrack.clientWidth;
            const gap = TRACK_GAP_PX;

            if (trackItems[0].div.style.display !== 'none')
              trackItems[0].div.style.transform = `translateX(${-width - gap + dx}px)`;

            trackItems[1].div.style.transform = `translateX(${dx}px)`;

            if (trackItems[2].div.style.display !== 'none')
              trackItems[2].div.style.transform = `translateX(${width + gap + dx}px)`;
          }
        }

      }, { passive: false });

      viewerTrack.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        if (e.touches.length > 0) return; // Still fingers on screen (e.g. lifted one of two)

        isDragging = false;

        if (zoomScale > 1) {
          // Check limits and snap back if needed
          if (zoomScale < 1) {
            zoomScale = 1;
            zoomTranslateX = 0;
            zoomTranslateY = 0;
          }
          // Animate Snap
          const currentItem = trackItems[1];
          let target = currentItem.img.parentElement || currentItem.img;
          target.style.transition = 'transform 0.3s ease-out';
          updateImageTransform();
          return;
        }

        // If we were zoomed out (scale <= 1), treat as swipe
        zoomScale = 1;
        updateImageTransform();

        const dx = currentX - startX;
        const width = viewerTrack.clientWidth;
        const threshold = width * SWIPE_THRESHOLD;

        let dir = null;
        if (dx < -threshold && viewerIndex < viewerImages.length - 1) {
          dir = 'next';
        } else if (dx > threshold && viewerIndex > 0) {
          dir = 'prev';
        }

        trackItems.forEach(t => t.div.style.transition = 'transform 0.2s ease-out');
        const gap = TRACK_GAP_PX;

        if (dir === 'next') {
          trackItems[1].div.style.transform = `translateX(${-width - gap}px)`;
          trackItems[2].div.style.transform = `translateX(0px)`;
          setTimeout(() => {
            viewerIndex++;
            updateViewerContent(false);
            resetZoomState();
          }, 200);
        } else if (dir === 'prev') {
          trackItems[1].div.style.transform = `translateX(${width + gap}px)`;
          trackItems[0].div.style.transform = `translateX(0px)`;
          setTimeout(() => {
            viewerIndex--;
            updateViewerContent(false);
            resetZoomState();
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
    imageViewer.addEventListener('click', (e) => {
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
        close();
      }
    });

    // Avoid unused lints (kept for parity with previous code paths)
    void viewerContainer;

    return {
      setImages,
      open,
      close,
    };
  }

  window.squareospace = window.squareospace || {};
  window.squareospace.createImageViewer = createImageViewer;
})();

