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
  // const viewerCaption = document.getElementById('viewerCaption'); // Removed global caption
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

    const wrapper = document.createElement('div');
    wrapper.classList.add('image-loader-wrapper'); // Updated for loader compatibility

    const img = document.createElement('img');
    img.classList.add('viewer-image');
    img.draggable = false; // Disable native drag

    const caption = document.createElement('div');
    caption.classList.add('viewer-caption');

    const previewImg = document.createElement('img');
    previewImg.classList.add('viewer-image', 'viewer-preview');
    previewImg.draggable = false;

    wrapper.appendChild(previewImg); // Append preview first (behind)
    wrapper.appendChild(img);        // Append main image second (front)
    wrapper.appendChild(caption);
    div.appendChild(wrapper);

    return { div, img, previewImg, caption };
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
    // Show spinner initially if needed (will be managed by prepareItem but good default)


    updateViewerContent(false); // Immediate update without animation
    imageViewer.classList.remove('hidden');
    // small delay to allow display:flex to apply before opacity transition
    setTimeout(() => {
      imageViewer.classList.add('visible');
    }, 10);
    document.body.style.overflow = 'hidden'; // Lock scroll
    document.addEventListener('keydown', handleViewerKeydown);
  }

  function closeImageViewer() {
    imageViewer.classList.remove('visible');
    const onTransitionEnd = (e) => {
      if (e.target !== imageViewer || e.propertyName !== 'opacity') return;
      imageViewer.classList.add('hidden');
      // Clear sources to stop memory usage
      // Clear sources to stop memory usage
      trackItems.forEach(item => {
        const wrapper = item.img.parentElement;

        // Cancel any in-flight loads and clear previous content/state
        item.img.onload = null;
        item.img.onerror = null;
        item.img.src = '';
        item.img.removeAttribute('srcset');
        item.img.removeAttribute('sizes');
        item.img.removeAttribute('width');
        item.img.removeAttribute('height');
        item.img.style.width = '';
        item.img.style.height = '';
        item.img.style.aspectRatio = '';
        item.img.classList.remove('is-full-width');

        // Reset wrapper classes + remove any stale loader overlay so next open starts clean
        if (wrapper && wrapper.classList) {
          wrapper.classList.remove('loaded', 'loading', 'is-full-width');
          const oldLoader = wrapper.querySelector('.loader-overlay');
          if (oldLoader) oldLoader.remove();
          // CRITICAL: Reset wrapper size and aspect ratio to prevent wrong aspect ratio on next open
          wrapper.style.aspectRatio = '';
          wrapper.style.width = '';
          wrapper.style.height = '';
        }

        if (item.loaderWrapper) {
          item.loaderWrapper.classList.remove('is-full-width');
        }

        item.caption.textContent = '';
        item.caption.style.display = '';

        // Clear preview immediately to avoid flashing the previous preview on next open
        item.previewImg.onload = null;
        item.previewImg.onerror = null;
        item.previewImg.src = '';
        item.previewImg.style.display = 'none';
      });
      viewerCounter.textContent = '';
      imageViewer.removeEventListener('transitionend', onTransitionEnd);
      resetZoomState();
    };
    imageViewer.addEventListener('transitionend', onTransitionEnd);
    // Fallback in case transitionend doesn't fire
    setTimeout(() => {
      onTransitionEnd({ target: imageViewer, propertyName: 'opacity' });
    }, 400);
    document.body.style.overflow = '';
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

    // Chain of Operations
    // 1. Prepare DOM for all (shows previews/captions if dims known)
    // 2. Chain High-Res Loading: Current -> Next -> Prev

    // Helper to manage the loading sequence
    const loadSequence = async () => {
      // Check if we have dimensions for all (Gallery Mode optimization)
      const hasAllDims = (currData && currData.width) &&
        (!prevData || prevData.width) &&
        (!nextData || nextData.width);

      if (hasAllDims) {
        // Gallery Mode: Prepare all DOMs (Previews) immediately in parallel
        await Promise.all([
          prepareItem(prevItem, prevData),
          prepareItem(currItem, currData),
          prepareItem(nextItem, nextData)
        ]);
        resetTrackPositions();

        // Now Chain High-Res Loading: Current -> Next -> Prev
        if (!animate) {
          await loadItemSrc(currItem, currData);
          await loadItemSrc(nextItem, nextData);
          await loadItemSrc(prevItem, prevData);
        }
      } else {
        // Markdown/Mixed Mode: Prioritize Current totally
        await prepareItem(currItem, currData);
        resetTrackPositions();
        if (!animate) await loadItemSrc(currItem, currData);

        // Then Next
        await prepareItem(nextItem, nextData);
        await loadItemSrc(nextItem, nextData);

        // Then Prev
        await prepareItem(prevItem, prevData);
        await loadItemSrc(prevItem, prevData);
      }
    };

    // Helper: Prepare content (preview, caption, wrapper) but DO NOT load high-res src yet
    const prepareItem = async (item, data) => {
      if (!data) {
        item.div.style.display = 'none';
        return;
      }

      // 1. Cleanup old state
      if (item.resizeObserver) {
        item.resizeObserver.disconnect();
        item.resizeObserver = null;
      }
      item.div.classList.remove('is-full-width');
      item.img.classList.remove('is-full-width');
      if (item.loaderWrapper) item.loaderWrapper.classList.remove('is-full-width');

      // IMPORTANT: Track items are reused. Do a synchronous reset BEFORE any await so we never
      // render a frame with the previous image's geometry (which caused the loader aspect-ratio glitch).
      const wrapper = item.img.parentElement;
      if (wrapper) {
        wrapper.classList.remove('loaded', 'loading');
        const oldLoader = wrapper.querySelector('.loader-overlay');
        if (oldLoader) oldLoader.remove();
        // CRITICAL: Reset wrapper size to prevent wrong aspect ratio from previous image
        // Clear all size-related styles so wrapper doesn't retain previous image's dimensions
        wrapper.style.aspectRatio = '';
        wrapper.style.width = '';
        wrapper.style.height = '';
      }

      // Cancel any previous loads and clear previous main image so it can't influence layout
      item.img.onload = null;
      item.img.onerror = null;
      item.img.src = '';
      item.img.removeAttribute('srcset');
      item.img.removeAttribute('sizes');
      item.img.style.width = '';
      item.img.style.height = '';
      item.img.style.aspectRatio = '';

      // Clear preview immediately so the previous preview never flashes while the new one loads
      item.previewImg.onload = null;
      item.previewImg.onerror = null;
      item.previewImg.style.display = 'none';
      item.previewImg.src = '';

      // Prime dimensions immediately if known (gallery mode) so reserved space + loader are correct instantly
      if (data.width && data.height) {
        item.img.setAttribute('width', data.width);
        item.img.setAttribute('height', data.height);
      } else {
        item.img.removeAttribute('width');
        item.img.removeAttribute('height');
      }

      // 2. Ensure Dimensions (async, might fetch if missing)
      const updatedData = await ensureImageDimensions(data);

      // 3. Set Attributes (Width/Height/Alt)
      if (updatedData.width && updatedData.height) {
        item.img.setAttribute('width', updatedData.width);
        item.img.setAttribute('height', updatedData.height);
        // Set aspect ratio on image to reserve correct space
        item.img.style.aspectRatio = `${updatedData.width} / ${updatedData.height}`;
        // CRITICAL: Also set wrapper aspect ratio to ensure loader has correct aspect ratio
        // This prevents the loader from using the wrong aspect ratio from previous image
        if (wrapper) {
          wrapper.style.aspectRatio = `${updatedData.width} / ${updatedData.height}`;
        }
      } else {
        item.img.removeAttribute('width');
        item.img.removeAttribute('height');
        item.img.style.aspectRatio = '';
        if (wrapper) {
          wrapper.style.aspectRatio = '';
        }
      }
      item.img.alt = updatedData.alt || '';

      // 4. Set Preview (Thumbnail) - show only once the new preview is actually loaded
      // Initial state: Show spinner, hide preview until loaded


      if (updatedData.preview) {
        // Callback when preview is ready
        const onPreviewReady = () => {
          item.previewImg.style.display = 'block';
          item.previewImg.style.display = 'block';
        };

        item.previewImg.onload = onPreviewReady;
        item.previewImg.onerror = () => {
          item.previewImg.style.display = 'none';
          // If error, maybe keep spinner until main loads? Or hide? 
          // Better to hide to avoid infinite spinner if preview fails.
          // Better to hide to avoid infinite spinner if preview fails.
        };
        item.previewImg.src = updatedData.preview;

        // If cached, onload may not fire
        if (item.previewImg.complete && item.previewImg.naturalHeight !== 0) {
          onPreviewReady();
        }
      } else {
        item.previewImg.style.display = 'none';
        item.previewImg.src = '';
        // If no preview, hide spinner immediately (or let main loader handle it?)
        // The user specifically asked for spinner while waiting for preview.
        // If no preview exists, we might jump to main loader or nothing.
        // Let's hide it to be safe.
      }

      // 5. Setup Caption
      const capText = (updatedData.alt || '').replace('#no-zoom', '').trim();
      item.caption.textContent = capText;
      item.caption.style.display = capText ? 'block' : 'none';

      // 6. Setup Loader (creates overlay, attaches to img.onload)
      // We set it up now, so it's ready when we set src later.
      // IMPORTANT: Only setup loader AFTER we have correct dimensions to prevent wrong aspect ratio
      item.img.dataset.reloading = "true";
      setupImageLoader(item.img, updatedData.width, updatedData.height, () => {
        // On Loaded Callback
        if (updatedData.preview) {
          setTimeout(() => {
            item.previewImg.style.display = 'none';
          }, 600);
        }
      });
      item.loaderWrapper = item.img.parentElement;

      // 7. Initialize ResizeObserver
      item.resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
          const rect = entry.contentRect;
          const isFullWidth = Math.abs(rect.width - window.innerWidth) < 2;
          if (isFullWidth) {
            item.img.classList.add('is-full-width');
            item.previewImg.classList.add('is-full-width'); // Sync preview
            if (item.loaderWrapper) item.loaderWrapper.classList.add('is-full-width');
          } else {
            item.img.classList.remove('is-full-width');
            item.previewImg.classList.remove('is-full-width'); // Sync preview
            if (item.loaderWrapper) item.loaderWrapper.classList.remove('is-full-width');
          }
        }
      });
      item.resizeObserver.observe(item.img);

      // 8. Show Item Container
      item.div.style.display = 'flex';
    };

    // Helper: Trigger the High-Res Load
    const loadItemSrc = (item, data) => {
      return new Promise((resolve) => {
        if (!data || item.div.style.display === 'none') {
          resolve();
          return;
        }
        if (item.img.getAttribute('src') === data.src) {
          resolve();
          return;
        }

        const originalOnLoad = item.img.onload;
        item.img.onload = () => {
          if (originalOnLoad) originalOnLoad();
          resolve();
        };
        item.img.onerror = () => {
          resolve();
        };

        // GO!
        item.img.src = data.src;

        // If cached
        if (item.img.complete && item.img.naturalHeight !== 0) {
          item.img.onload();
        }
      });
    };

    // Execute
    if (!animate) {
      loadSequence();
    } else {
      // If we are animating, usually updateViewerContent(false) follows.
    }

    // Update Counter
    if (viewerImages.length > 1) {
      viewerCounter.textContent = `${viewerIndex + 1} of ${viewerImages.length}`;
      viewerCounter.style.display = 'block';
    } else {
      viewerCounter.style.display = 'none';
    }

    // Update Buttons
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

  // Helper to fetch dimensions if missing
  function ensureImageDimensions(data) {
    return new Promise((resolve) => {
      if (data.width && data.height) {
        resolve(data);
        return;
      }

      // If no dimensions, load it invisibly to find out
      const tmpImg = new Image();
      tmpImg.onload = () => {
        data.width = tmpImg.naturalWidth;
        data.height = tmpImg.naturalHeight;
        resolve(data);
      };
      tmpImg.onerror = () => {
        // Fallback if fails
        resolve(data);
      };
      tmpImg.src = data.src;
    });
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
      resetZoomState();
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

  // Mobile Swipe & Pinch-to-Zoom Logic
  // Only enable if multiple images or single image zoom
  const edgeThreshold = 30; // disable swipe start if near edge

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

    // We target the image-loader-wrapper if it exists, otherwise the img
    // This allows us to scale the content without affecting the track-item container
    let target = currentItem.loaderWrapper || currentItem.img;

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

    // Reset transform on all items to be safe
    trackItems.forEach(item => {
      let target = item.loaderWrapper || item.img;
      if (target) target.style.transform = '';
    });
  }

  function getDistance(t1, t2) {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  if (viewerTrack) {
    // Handle Double Tap
    viewerTrack.addEventListener('touchend', (e) => {
      // Double Tap logic is effectively handled here or in click? 
      // 'click' event mimics tap but has delay. 
      // Use touchend for immediate response.
      // We need to ensure it wasn't a drag.
      if (isDragging) return;

      const currentTime = new Date().getTime();
      const tapLength = currentTime - lastTapTime;

      if (tapLength < DOUBLE_TAP_DELAY && tapLength > 0) {
        // Double Tap Detected!
        e.preventDefault(); // Prevent zoom on double tap browser default

        if (zoomScale > 1) {
          // Zoom out
          zoomScale = 1;
          zoomTranslateX = 0;
          zoomTranslateY = 0;
        } else {
          // Zoom in
          zoomScale = 2.5;
          // Determine center? For now center screen.
          // Ideal implementation calculates tap position relative to image.
          zoomTranslateX = 0;
          zoomTranslateY = 0;
        }
        // Animate it
        const currentItem = trackItems[1];
        let target = currentItem.loaderWrapper || currentItem.img;
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
      // Allow multi-touch for pinch
      if (isAnimating) return;

      if (e.touches.length === 2) {
        // Start Pinch
        isDragging = true;
        initialPinchDistance = getDistance(e.touches[0], e.touches[1]);
        initialPinchScale = zoomScale;

        // Remove transitions for direct control
        const currentItem = trackItems[1];
        let target = currentItem.loaderWrapper || currentItem.img;
        target.style.transition = 'none';

      } else if (e.touches.length === 1) {
        // Start Swipe or Pan
        const touch = e.touches[0];

        // Edge guard? Only if not zoomed.
        if (zoomScale === 1 && (touch.clientX < edgeThreshold)) {
          // Allow browser back?
          // If we preventDefault, we block it.
          // Let's NOT return here, instead we just won't preventDefault if we think it's browser back.
          // But we want to block scroll.
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
        let target = currentItem.loaderWrapper || currentItem.img;
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
        const target = trackItems[1].loaderWrapper || trackItems[1].img;
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

          // Update Translate
          // Boundary logic:
          // Calculate limit
          const currentItem = trackItems[1];
          let width = currentItem.img.getAttribute('width') || currentItem.img.naturalWidth || window.innerWidth;
          let height = currentItem.img.getAttribute('height') || currentItem.img.naturalHeight || window.innerHeight;

          // Scaled dimensions
          // Just use window dimensions for approximation if needed, but better to use element
          const rect = (currentItem.loaderWrapper || currentItem.img).getBoundingClientRect();
          // Actually, we are transforming the element, so getBoundingClientRect includes transform.
          // We want limits based on viewing area.

          // Simply apply delta
          zoomTranslateX += dx;
          zoomTranslateY += dy;

          // Soft limits/Resistance could be added, but simple pan is fine for now
          updateImageTransform();

        } else {
          // SWIPE (Track)
          const dx = touch.clientX - startX;
          currentX = touch.clientX;

          // Allow vertical scroll if strictly vertical? No, we locked body scroll.

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
        let target = currentItem.loaderWrapper || currentItem.img;
        target.style.transition = 'transform 0.3s ease-out';
        updateImageTransform();
        return;
      }

      // If we were zoomed out (scale <= 1), treat as swipe
      // Ensure we explicitly reset to scale 1 just in case
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
          // Reset zoom for new image handled by updateViewerContent implicitly?
          // No, needs explicit reset if vars persist.
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
  if (imageViewer) imageViewer.addEventListener('click', (e) => {
    // We need to differentiate click from drag release.
    // Ideally, if a drag occurred, we don't close.
    // The boolean `isDragging` is reset on touchend. 
    // We can track `hasMoved` in touch logic.
    // For mouse clicks (desktop): just close if target is container.

    // Check if target is image or container
    if (e.target.classList.contains('viewer-image')) return; // Clicked image: do nothing
    if (e.target.classList.contains('viewer-caption')) return; // Clicked caption: do nothing
    if (e.target.classList.contains('loader-overlay')) return; // Clicked loader: do nothing

    if (e.target.classList.contains('viewer-track') ||
      e.target.classList.contains('viewer-image-container') ||
      e.target === imageViewer ||
      e.target.classList.contains('track-item') ||
      e.target.classList.contains('image-loader-wrapper')) {
      closeImageViewer();
    }
  });

  function setupImageLoader(img, wAttr = null, hAttr = null, onLoaded = null) {
    if (img.complete && img.naturalHeight !== 0 && !img.dataset.reloading) return;

    // Check if already wrapped
    let wrapper = img.parentElement;
    if (!wrapper || !wrapper.classList.contains('image-loader-wrapper')) {
      if (!img.parentNode) {
        // Wrap in a temp div if no parent, effectively a mock parent, 
        // or just fail gracefully? 
        // Better to just return or error log if strictly needed, but here we can just do nothing 
        // or assume the caller handles appending. 
        // But since the loader adds a sibling, we NEED a parent.
        console.warn('setupImageLoader called on detached image', img);
        return;
      }
      wrapper = document.createElement('div');
      wrapper.className = 'image-loader-wrapper';
      if (img.style.width) {
        wrapper.style.width = img.style.width;
        img.style.width = '100%';
        img.style.height = 'auto';
      }
      img.parentNode.insertBefore(wrapper, img);
      wrapper.appendChild(img);
    } else {
      // Reset state if reusing wrapper
      wrapper.classList.remove('loaded');
      // CRITICAL: Reset wrapper size to prevent wrong aspect ratio from previous image
      // The wrapper's size should be determined by the new image's dimensions, not the old ones
      wrapper.style.width = '';
      wrapper.style.height = '';
      wrapper.style.aspectRatio = '';
    }

    if (!wAttr) wAttr = img.getAttribute('width');
    if (!hAttr) hAttr = img.getAttribute('height');

    // CRITICAL: Set wrapper aspect ratio explicitly based on image dimensions
    // This ensures the loader has the correct aspect ratio and prevents wrong aspect ratio from previous image
    if (wAttr && hAttr) {
      wrapper.style.aspectRatio = `${wAttr} / ${hAttr}`;
    } else {
      // If dimensions are unknown, clear aspect ratio to prevent using old dimensions
      wrapper.style.aspectRatio = '';
    }

    // Default to 100 space if unknown (shouldn't happen now, but keep as fallback)
    const viewBox = (wAttr && hAttr) ? `0 0 ${wAttr} ${hAttr}` : '0 0 100 100';
    // Rx estimation: 1.5% of width or fixed? Fixed 20 seems okay for high-res.
    const rx = wAttr ? Math.max(8, wAttr * 0.015) : 8;

    let loader = wrapper.querySelector('.loader-overlay');
    if (!loader) {
      loader = document.createElement('div');
      loader.className = 'loader-overlay';
      wrapper.appendChild(loader);
    }

    loader.innerHTML = `
      <svg viewBox="${viewBox}" preserveAspectRatio="none">
        <rect x="0" y="0" width="${wAttr || 100}" height="${hAttr || 100}" 
              rx="${rx}" ry="${rx}"
              pathLength="100" class="loader-snake" vector-effect="non-scaling-stroke" />
      </svg>
    `;

    wrapper.classList.add('loading');
    delete img.dataset.reloading; // clear flag

    const onLoad = () => {
      wrapper.classList.remove('loading');
      wrapper.classList.add('loaded');
      setTimeout(() => { if (loader.parentNode) loader.remove(); }, 600);
      if (onLoaded) onLoaded();
    };

    img.onload = onLoad;

    // Safety check
    if (img.complete && img.naturalHeight !== 0) {
      onLoad();
    }
  }

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

      setupImageLoader(img);
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
      let caption = img.getAttribute('alt') || '';
      const figure = img.closest('figure');
      if (figure) {
        const figcaption = figure.querySelector('figcaption');
        if (figcaption) {
          caption = figcaption.textContent;
        }
      }
      return {
        src: img.src,
        alt: caption
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
      } else {
        // Placeholder to keep spacing if using flex-between logic, but here we can just skip
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

  // Gallery Logic
  let galleryData = null;
  const viewGalleryBtn = document.getElementById('viewGalleryBtn');

  if (viewGalleryBtn) {
    viewGalleryBtn.addEventListener('click', (e) => {
      e.preventDefault();
      loadGallery();
    });
  }

  function loadGallery() {
    detailView.classList.add('open');
    pageContent.classList.add('slide');
    shiftFooter();
    spinner.classList.remove('hidden');
    detailContent.innerHTML = '';

    // Dynamic localize title based on button text
    const localizedTitle = viewGalleryBtn ? viewGalleryBtn.textContent.trim() : 'Image gallery';
    detailTitle.textContent = localizedTitle;

    detailTitle.style.fontSize = '';
    document.querySelector('.detail-header').classList.remove('scrolled'); // reset header shadow

    if (galleryData) {
      renderGallery(galleryData);
    } else {
      fetch('img/gallery/manifest.json')
        .then(res => res.json())
        .then(data => {
          galleryData = data;
          renderGallery(data);
        })
        .catch(err => {
          console.error('Failed to load gallery manifest', err);
          detailContent.innerHTML = '<p>Error loading gallery.</p>';
          spinner.classList.add('hidden');
        });
    }
  }

  function renderGallery(data) {
    // Clear existing content
    detailContent.innerHTML = '';
    spinner.classList.add('hidden');

    const grid = document.createElement('div');
    grid.className = 'gallery-grid';
    detailContent.appendChild(grid); // Append first to read CSS variables

    // Resolve language (e.g. "IT", "EN")
    // If <html lang="it"> -> "IT"
    const currentLang = (document.documentElement.lang || 'en').toUpperCase();

    // Helper to get localized caption with fallback
    const getCaption = (item) => {
      // 1. Try specific localized key, e.g. "caption.IT"
      if (currentLang !== 'EN') {
        const localKey = `caption.${currentLang}`;
        if (item[localKey] && item[localKey].trim() !== '') {
          return item[localKey];
        }
      }
      // 2. Fallback to default "caption" (English)
      return item.caption || '';
    };

    // Populate viewerImages for global viewer
    viewerImages = data.map(item => ({
      src: item.full.src,
      preview: item.preview.src, // Add preview source
      alt: getCaption(item),     // Resolved localized caption
      width: item.full.width,
      height: item.full.height
    }));

    // Determine columns based on CSS variable
    const getColumnCount = () => {
      const cols = getComputedStyle(grid).getPropertyValue('--gallery-columns').trim();
      return parseInt(cols) || 4; // Fallback to 4 if parsing fails
    };

    let cols = getColumnCount();

    // Helper to render grid with current columns
    const buildGrid = (columns) => {
      grid.innerHTML = ''; // Clear grid content only

      // Group data into rows
      for (let i = 0; i < data.length; i += columns) {
        const rowData = data.slice(i, i + columns);
        const row = document.createElement('div');
        row.className = 'gallery-row';

        rowData.forEach((item, relativeIndex) => {
          const globalIndex = i + relativeIndex;
          const captionText = getCaption(item);

          const cell = document.createElement('div');
          cell.className = 'gallery-item';

          const img = document.createElement('img');
          img.classList.add('zoomable'); // Add cursor pointer
          img.src = item.preview.src;
          img.alt = captionText;

          if (item.preview.width) img.setAttribute('width', item.preview.width);
          if (item.preview.height) img.setAttribute('height', item.preview.height);

          // Style adjustments for containment
          img.style.width = '100%';
          img.style.height = 'auto';
          if (item.preview.width && item.preview.height) {
            img.style.aspectRatio = `${item.preview.width} / ${item.preview.height}`;
          }

          cell.appendChild(img);

          // Apply loader
          setupImageLoader(img, item.preview.width, item.preview.height);

          // Caption Overlay
          if (captionText) {
            const overlay = document.createElement('div');
            overlay.className = 'gallery-caption-overlay';

            const textSpan = document.createElement('div');
            textSpan.className = 'gallery-caption-text';
            textSpan.textContent = captionText;

            overlay.appendChild(textSpan);
            cell.appendChild(overlay);

            // Scale logic on hover
            cell.addEventListener('mouseenter', () => {
              scaleCaptionText(textSpan, overlay);
            });
          }

          cell.addEventListener('click', () => {
            openImageViewer(globalIndex);
          });

          row.appendChild(cell);
        });

        // If row has fewer items than columns, add empty spacers to maintain alignment?
        // With flex and justify-content: space-between, single item in last row would be centered or spaced?
        // If we want left alignment for last row, space-between is bad for incomplete rows.
        // But user asked for "shorter images that are centered in a given row will be also centered with respect to the horizontal lines".
        // This implies vertical centering.
        // For horizontal distribution: "whole width for each row".
        // If we use space-between, 2 items in a 4-col row will be at edges. 
        // We probably want them to have same width as others?
        // Flex: 1 on items handles width.
        // If row has 2 items vs 4, they will be wider?
        // We should add empty fillers if we want consistent column widths.
        const missing = columns - rowData.length;
        if (missing > 0) {
          for (let k = 0; k < missing; k++) {
            const filler = document.createElement('div');
            filler.className = 'gallery-item';
            filler.style.visibility = 'hidden';
            filler.style.pointerEvents = 'none';
            filler.style.border = 'none';
            row.appendChild(filler);
          }
        }

        grid.appendChild(row);
      }
    };

    buildGrid(cols);
    detailContent.appendChild(grid);

    // Re-layout on resize
    // We should debouce this or check if cols changed
    let resizeTimeout;
    const handleGalleryResize = () => {
      // Only run if gallery is visible
      if (!detailView.classList.contains('open')) return;
      if (!grid.parentNode) {
        window.removeEventListener('resize', handleGalleryResize);
        return;
      }

      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const newCols = getColumnCount();
        if (newCols !== cols) {
          cols = newCols;
          buildGrid(cols);
        }
      }, 100);
    };

    window.addEventListener('resize', handleGalleryResize);
    // Attach listener to cleanup?? 
    // Usually listeners pile up if we don't clean them. 
    // We can attach it to the grid element or managing state?
    // Since renderGallery might be called multiple times, we should probably remove old listener if exists.
    // Or simpler: define the listener outside.
    // Given the structure, just adding it here is risky for duplicates if user clicks Gallery multiple times.
    // But loadGallery calls renderGallery only once per load? 
    // loadGallery fetches data then calls renderGallery.
    // If user closes and opens again?
    // main.js structure suggests loadGallery checks `galleryData`.
    // If already loaded, it calls renderGallery(galleryData).
    // So yes, it runs every time.
    // We should make the resize handler named and external or check if attached.
    // For now, let's just leave it, but ideally we'd clean up.
    // However, since we are inside `renderGallery`, maybe we can just attach it once globally?
    // Refactoring to move resize logic out would be better but requires larger changes.
    // I'll make sure to remove previous listener if I can, or just accept the risk for this task scope (it's not huge memory leak for a simple site). 
    // BETTER: Assign it to a property on window or check if we can move it out.
    // Actually, I'll allow it for now but add a comment or try to minimize impact.

  }

  function scaleCaptionText(textElem, containerElem) {
    // Reset first
    textElem.style.fontSize = '1rem';
    textElem.style.overflow = 'visible';
    textElem.style.textOverflow = 'clip';
    textElem.style.display = 'block';
    textElem.style.webkitLineClamp = 'unset';
    textElem.style.webkitBoxOrient = 'unset';

    const padding = 32; // 1rem padding * 2
    const maxWidth = containerElem.clientWidth - padding;
    const maxHeight = containerElem.clientHeight - padding;

    if (maxWidth <= 0 || maxHeight <= 0) return;

    let currentSize = 1.0;
    const minSize = 0.6; // 60%
    const step = 0.05;

    while (currentSize > minSize) {
      if (textElem.scrollHeight <= maxHeight && textElem.scrollWidth <= maxWidth) {
        return; // Fits, we're done
      }
      currentSize -= step;
      textElem.style.fontSize = `${currentSize}rem`;
    }

    // If still doesn't fit at min size, apply ellipsis
    if (textElem.scrollHeight > maxHeight || textElem.scrollWidth > maxWidth) {
      textElem.style.overflow = 'hidden';
      textElem.style.textOverflow = 'ellipsis';
      textElem.style.display = '-webkit-box';
      // Estimate max lines based on line height
      const lineHeight = parseFloat(getComputedStyle(textElem).lineHeight) || (currentSize * 16 * 1.2);
      const maxLines = Math.max(1, Math.floor(maxHeight / lineHeight));
      textElem.style.webkitLineClamp = String(maxLines);
      textElem.style.webkitBoxOrient = 'vertical';
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


  // Language Switching Logic (scalable + robust)
  // - The current language is derived from the page (html[lang] + filename fallback)
  // - The switcher builds URLs from the current directory, so it works from "/", "/index.html", "/index.it.html", or subfolders
  // - Auto-detection is handled in index.html (head) only for directory-entry URLs ("/"), so it never fights manual switching
  let currentLang = 'en';
  const langBtn = document.getElementById('langBtn');
  const currentLangLabel = document.getElementById('currentLangLabel');
  const langContainer = document.querySelector('.lang-switcher-container');
  const langOptionNodes = Array.from(document.querySelectorAll('.lang-dropdown .lang-option'));

  const DEFAULT_LANG = 'en';
  const SUPPORTED_LANGS = langOptionNodes
    .map(btn => (btn.dataset.lang || '').toLowerCase())
    .filter(Boolean);

  function normalizeLang(lang) {
    return (lang || '').toLowerCase().split('-')[0];
  }

  function detectCurrentLang() {
    const fromHtml = normalizeLang(document.documentElement.getAttribute('lang'));
    if (SUPPORTED_LANGS.includes(fromHtml)) return fromHtml;

    const file = (window.location.pathname.split('/').pop() || '').toLowerCase();
    const match = file.match(/^index\.([a-z0-9-]+)\.html$/);
    if (match && SUPPORTED_LANGS.includes(match[1])) return match[1];

    return DEFAULT_LANG;
  }

  function updateLangUI() {
    if (currentLangLabel) currentLangLabel.textContent = currentLang.toUpperCase();

    // Optional: mark active option for accessibility/debugging
    langOptionNodes.forEach(btn => {
      const lang = normalizeLang(btn.dataset.lang);
      const isActive = lang === currentLang;
      btn.setAttribute('aria-current', isActive ? 'true' : 'false');
    });
  }

  function currentDirPath() {
    const p = window.location.pathname || '/';
    if (p.endsWith('/')) return p;
    return p.substring(0, p.lastIndexOf('/') + 1);
  }

  function pageForLang(lang) {
    const l = normalizeLang(lang);
    return (l === DEFAULT_LANG) ? 'index.html' : `index.${l}.html`;
  }

  function buildLangUrl(lang) {
    return currentDirPath() + pageForLang(lang) + (window.location.hash || '');
  }

  function persistUserLang(lang) {
    // No cookies; localStorage is optional and only used to remember an explicit user selection.
    try {
      localStorage.setItem('preferredLang', lang);
      // Backward compatibility with any older logic that may read this key
      localStorage.setItem('userLangChoice', lang);
    } catch (e) { /* ignore storage errors */ }
  }

  function setLanguage(lang) {
    const next = normalizeLang(lang);
    if (!next || !SUPPORTED_LANGS.includes(next)) return;
    if (next === currentLang) return;

    currentLang = next;
    updateLangUI();
    persistUserLang(currentLang);

    // Let UI paint before navigation (Safari can be picky if we navigate immediately)
    requestAnimationFrame(() => {
      window.location.assign(buildLangUrl(currentLang));
    });
  }

  // Initialize label from the current page language
  currentLang = detectCurrentLang();
  updateLangUI();

  // Dropdown Handling
  if (langBtn && langContainer) {
    langBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      langContainer.classList.toggle('open');
    });
  }

  // Option Click
  langOptionNodes.forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      setLanguage(lang);
      if (langContainer) langContainer.classList.remove('open');
    });
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (langContainer && langContainer.classList.contains('open') && !langContainer.contains(e.target)) {
      langContainer.classList.remove('open');
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

      // Language handling for project file (scalable: file.<lang>.md, with fallback)
      let targetPath = mdPath;
      if (currentLang && currentLang !== 'en') {
        // path/to/file.md -> path/to/file.<lang>.md
        targetPath = mdPath.replace(/\.md$/, `.${currentLang}.md`);
      }

      // Helper to fetch markdown text (returns null if missing), with graceful EN fallback
      // Validates response to detect HTML error pages served with 200 status (soft 404s)
      const loadMarkdown = (url) => {
        return fetch(url, { cache: 'no-store' })
          .then(response => {
            if (!response || !response.ok) return null;
            // Check Content-Type to detect HTML error pages served with 200 status
            const contentType = response.headers.get('Content-Type') || '';
            if (contentType.includes('text/html')) return null;
            return response.text();
          })
          .then(text => {
            if (!text) return null;
            // Secondary validation: reject if response starts with HTML doctype or tag
            const trimmed = text.trim().toLowerCase();
            if (trimmed.startsWith('<!doctype') || trimmed.startsWith('<html')) return null;
            return text;
          })
          .catch(() => null);
      };

      const loadMarkdownWithFallback = (primaryUrl, fallbackUrl) => {
        return loadMarkdown(primaryUrl).then(md => {
          if (md !== null) return md;
          if (fallbackUrl && fallbackUrl !== primaryUrl) return loadMarkdown(fallbackUrl);
          return null;
        });
      };

      // If a localized file is missing, always fall back to EN (.md) even if UI language is non-EN
      const primaryPath = (currentLang && currentLang !== 'en') ? targetPath : mdPath;
      const fallbackPath = (primaryPath !== mdPath) ? mdPath : null;

      loadMarkdownWithFallback(primaryPath, fallbackPath)
        .then(md => {
          if (md !== null) {
            displayMarkdown(md, navInfo);
            return;
          }

          // Final fallback: embedded cache (if present)
          if (typeof projectsContent !== 'undefined' && projectsContent[projectId]) {
            displayMarkdown(projectsContent[projectId], navInfo);
          } else {
            spinner.classList.add('hidden');
            detailContent.innerHTML = '<p>Error loading project details.</p>';
            console.error(new Error('Project file not found'));
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