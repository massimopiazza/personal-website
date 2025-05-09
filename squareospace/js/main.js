/**
 * Main JavaScript for Massimo Piazza personal site
 * - Handles navigation, bio toggle, smooth scroll, accordion, and project detail view
 */

document.addEventListener('DOMContentLoaded', () => {
  const expandAllBtn = document.getElementById('expandAll');
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

  // Adjust font size on detail view resize
  window.addEventListener('resize', () => {
    if (detailView.classList.contains('open')) {
      adjustTitleFontSize();
    }
  });


  document.querySelectorAll('.accordion-content a[data-project]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const title = link.textContent;
      document.getElementById('detailTitle').textContent = title;
      const mdPath = link.getAttribute('data-project');
      fetch(mdPath)
        .then(response => response.ok ? response.text() : Promise.reject('Failed to load'))
        .then(md => {
          // Parse .md and .mdx uniformly as Markdown
          detailContent.innerHTML = marked.parse(md);
          openDetail();
          adjustTitleFontSize();
        })
        .catch(err => {
          detailContent.innerHTML = '<p>Error loading project details. Please run the site via an HTTP server (e.g., python3 -m http.server).</p>';
          openDetail();
          console.error(err);
        });
    });
  });

  closeBtn.addEventListener('click', () => {
    pageContent.classList.remove('slide');
    detailView.classList.remove('open');
    detailContent.innerHTML = '';
    resetFooter();
    detailHeader.classList.remove('scrolled');
  });

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

  // Dock magnification effect
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
});