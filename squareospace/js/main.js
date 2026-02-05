/**
 * Main JavaScript entry point for Massimo Piazza personal site.
 * Modules are loaded via separate script files (no bundler).
 */

document.addEventListener('DOMContentLoaded', () => {
  const navHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height'));
  const extraOffset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--extra-offset'));
  const expandAllBtn = document.getElementById('expandAll');

  const api = window.squareospace || {};
  const imageViewer = (typeof api.createImageViewer === 'function') ? api.createImageViewer() : null;

  if (typeof api.initNav === 'function') {
    api.initNav({
      navHeight,
      extraOffset,
      expandAllBtn,
    });
  }

  if (typeof api.initProjectDetail === 'function') {
    api.initProjectDetail({
      navHeight,
      extraOffset,
      expandAllBtn,
      imageViewer,
    });
  }

  if (typeof api.initDock === 'function') {
    api.initDock();
  }
});
