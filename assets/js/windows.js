/**
 * Window Management for Emacs Blog Theme
 * Handles content scrolling and modeline updates
 */

(function() {
  'use strict';

  // DOM elements
  const bufferContent = document.getElementById('buffer-content');
  const contentBody = document.getElementById('content-body');

  /**
   * Update content buffer modeline scroll position
   */
  function updateContentModeline() {
    const modeline = bufferContent?.querySelector('.modeline');
    
    if (!contentBody || !modeline) return;
    
    const scrollEl = modeline.querySelector('[data-scroll-position]');
    const lineEl = modeline.querySelector('[data-line-number]');
    
    if (scrollEl) {
      const scrollTop = contentBody.scrollTop;
      const scrollHeight = contentBody.scrollHeight - contentBody.clientHeight;
      
      if (scrollHeight <= 0) {
        scrollEl.textContent = 'All';
      } else if (scrollTop <= 0) {
        scrollEl.textContent = 'Top';
      } else if (scrollTop >= scrollHeight - 1) {
        scrollEl.textContent = 'Bot';
      } else {
        const pct = Math.round((scrollTop / scrollHeight) * 100);
        scrollEl.textContent = pct + '%';
      }
    }
    
    // Estimate line number based on scroll position
    if (lineEl) {
      const lineHeight = 24; // Approximate line height
      const line = Math.floor(contentBody.scrollTop / lineHeight) + 1;
      lineEl.textContent = line;
    }
  }

  /**
   * Initialize
   */
  function init() {
    // Content scroll tracking
    contentBody?.addEventListener('scroll', updateContentModeline);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for other modules
  window.emacsBlog = window.emacsBlog || {};
  window.emacsBlog.windows = {
    updateContentModeline
  };
})();
