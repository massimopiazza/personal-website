/**
 * Dock magnification effect for footer icons (hover-capable devices only).
 */

(() => {
  function initDock() {
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
  }

  window.squareospace = window.squareospace || {};
  window.squareospace.initDock = initDock;
})();

