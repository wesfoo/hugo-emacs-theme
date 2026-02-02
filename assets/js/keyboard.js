/**
 * Keyboard Navigation for Emacs Blog Theme
 * Full-screen buffer switching like Emacs
 */

(function() {
  'use strict';

  // State
  let selectedIndex = 0;
  let currentBuffer = 'list'; // 'list' or 'content'
  let keySequence = '';
  let sequenceTimeout = null;

  // DOM elements
  const articleList = document.getElementById('article-list');
  const bufferList = document.getElementById('buffer-list');
  const bufferContent = document.getElementById('buffer-content');
  const contentBody = document.getElementById('content-body');
  const articleContent = document.getElementById('article-content');
  const postsData = document.getElementById('posts-data');
  const echoMessage = document.getElementById('echo-message');
  const helpOverlay = document.getElementById('help-overlay');

  /**
   * Show message in echo area
   */
  function showMessage(msg, type = 'info') {
    if (echoMessage) {
      echoMessage.textContent = msg;
      echoMessage.className = 'echo-message ' + type;
      
      // Clear after 3 seconds
      setTimeout(() => {
        echoMessage.textContent = currentBuffer === 'list' 
          ? 'n/p to navigate, RET to open, ? for help'
          : 'n/p for next/prev article, q to go back, ? for help';
        echoMessage.className = 'echo-message';
      }, 3000);
    }
  }

  /**
   * Get all article items
   */
  function getArticleItems() {
    return articleList ? Array.from(articleList.querySelectorAll('.article-item')) : [];
  }

  /**
   * Update selection in the article list
   */
  function updateSelection(newIndex) {
    const items = getArticleItems();
    if (items.length === 0) return;

    // Clamp index
    newIndex = Math.max(0, Math.min(newIndex, items.length - 1));
    
    // Remove old selection
    items.forEach((item, i) => {
      item.classList.remove('selected');
      item.setAttribute('aria-selected', 'false');
      const marker = item.querySelector('.article-marker');
      if (marker) marker.textContent = ' ';
    });

    // Add new selection
    selectedIndex = newIndex;
    const selectedItem = items[selectedIndex];
    selectedItem.classList.add('selected');
    selectedItem.setAttribute('aria-selected', 'true');
    const marker = selectedItem.querySelector('.article-marker');
    if (marker) marker.textContent = '>';

    // Scroll into view
    selectedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

    // Update modeline
    updateListModeline();
  }

  /**
   * Update list buffer modeline
   */
  function updateListModeline() {
    const items = getArticleItems();
    const modeline = bufferList?.querySelector('.modeline');
    if (modeline) {
      const scrollEl = modeline.querySelector('[data-scroll-position]');
      const lineEl = modeline.querySelector('[data-line-number]');
      
      if (scrollEl) {
        if (items.length === 0) {
          scrollEl.textContent = 'Empty';
        } else if (selectedIndex === 0) {
          scrollEl.textContent = 'Top';
        } else if (selectedIndex === items.length - 1) {
          scrollEl.textContent = 'Bot';
        } else {
          const pct = Math.round((selectedIndex / (items.length - 1)) * 100);
          scrollEl.textContent = pct + '%';
        }
      }
      
      if (lineEl) {
        lineEl.textContent = selectedIndex + 1;
      }
    }
  }

  /**
   * Switch to a buffer
   */
  function switchBuffer(bufferName) {
    currentBuffer = bufferName;
    
    if (bufferList) {
      bufferList.classList.toggle('active', bufferName === 'list');
    }
    if (bufferContent) {
      bufferContent.classList.toggle('active', bufferName === 'content');
    }
    
    // Update echo area hint
    if (echoMessage) {
      echoMessage.textContent = bufferName === 'list' 
        ? 'n/p to navigate, RET to open, ? for help'
        : 'n/p for next/prev article, q to go back, ? for help';
    }
  }

  /**
   * Open selected article (switch to content buffer)
   */
  function openSelectedArticle() {
    const items = getArticleItems();
    if (items.length === 0) return;

    const selectedItem = items[selectedIndex];
    const title = selectedItem.dataset.title;

    // Check if we have embedded content (homepage)
    if (postsData) {
      const template = postsData.querySelector(`template[data-post-index="${selectedIndex}"]`);
      if (template) {
        loadArticleFromTemplate(template, title);
        return;
      }
    }

    // Otherwise navigate to the URL
    const url = selectedItem.dataset.url;
    if (url) {
      window.location.href = url;
    }
  }

  /**
   * Load article from template
   */
  function loadArticleFromTemplate(template, title) {
    if (!articleContent) return;

    // Clone and insert content
    const content = template.content.cloneNode(true);
    articleContent.innerHTML = '';
    articleContent.appendChild(content);

    // Update content buffer modeline
    const modeline = bufferContent?.querySelector('.modeline');
    if (modeline) {
      const bufferName = modeline.querySelector('.modeline-buffer-name');
      if (bufferName) {
        bufferName.textContent = title.substring(0, 50);
        bufferName.title = title;
      }
    }

    // Switch to content buffer
    switchBuffer('content');
    
    // Scroll content to top
    if (contentBody) {
      contentBody.scrollTop = 0;
    }

    showMessage('Switched to buffer: ' + title);
  }

  /**
   * Navigate to next/previous article while viewing content
   */
  function navigateArticle(direction) {
    const items = getArticleItems();
    if (items.length === 0) return;

    const newIndex = selectedIndex + direction;
    if (newIndex < 0 || newIndex >= items.length) {
      showMessage(direction > 0 ? 'End of buffer' : 'Beginning of buffer');
      return;
    }

    // Update selection
    updateSelection(newIndex);
    
    // Load the new article
    const selectedItem = items[selectedIndex];
    const title = selectedItem.dataset.title;
    
    if (postsData) {
      const template = postsData.querySelector(`template[data-post-index="${selectedIndex}"]`);
      if (template) {
        loadArticleFromTemplate(template, title);
      }
    }
  }

  /**
   * Go back to list buffer
   */
  function goBack() {
    // On single.html pages, navigate back
    if (!postsData) {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = '/';
      }
      return;
    }

    // On homepage, switch to list buffer
    switchBuffer('list');
    showMessage('Switched to buffer: *posts*');
  }

  /**
   * Scroll content
   */
  function scrollContent(direction) {
    if (!contentBody) return;
    
    const scrollAmount = contentBody.clientHeight * 0.8;
    contentBody.scrollBy({
      top: direction === 'down' ? scrollAmount : -scrollAmount,
      behavior: 'smooth'
    });
  }

  /**
   * Toggle help overlay
   */
  function toggleHelp() {
    if (!helpOverlay) return;
    
    const isVisible = helpOverlay.classList.contains('visible');
    helpOverlay.classList.toggle('visible', !isVisible);
    helpOverlay.setAttribute('aria-hidden', isVisible);
    
    if (!isVisible) {
      document.getElementById('help-close')?.focus();
    }
  }

  /**
   * Handle key sequence (C-x prefix)
   */
  function handleKeySequence(key) {
    if (keySequence === 'C-x') {
      switch (key) {
        case 'o':
          // C-x o - switch buffer
          switchBuffer(currentBuffer === 'list' ? 'content' : 'list');
          keySequence = '';
          showMessage('');
          return true;
        case 'b':
          // C-x b - switch to list buffer
          switchBuffer('list');
          keySequence = '';
          showMessage('');
          return true;
        default:
          keySequence = '';
          showMessage('C-x ' + key + ' is undefined');
          return false;
      }
    }
    
    // g prefix sequences
    keySequence += key;
    
    if (sequenceTimeout) {
      clearTimeout(sequenceTimeout);
    }

    const sequences = {
      'gh': () => { window.location.href = '/'; },
      'gp': () => { window.location.href = '/post/'; },
      'gg': () => { 
        if (currentBuffer === 'list') {
          updateSelection(0);
        } else if (contentBody) {
          contentBody.scrollTop = 0;
        }
      }
    };

    if (sequences[keySequence]) {
      sequences[keySequence]();
      keySequence = '';
      return true;
    }

    sequenceTimeout = setTimeout(() => {
      keySequence = '';
    }, 1000);

    showMessage(keySequence + '-');
    return false;
  }

  /**
   * Main keyboard handler
   */
  function handleKeydown(e) {
    // Ignore if typing in input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }

    // Close help on Escape
    if (e.key === 'Escape') {
      if (helpOverlay?.classList.contains('visible')) {
        toggleHelp();
        e.preventDefault();
        return;
      }
    }

    // Help
    if (e.key === '?') {
      toggleHelp();
      e.preventDefault();
      return;
    }

    // If help is open, ignore other keys
    if (helpOverlay?.classList.contains('visible')) {
      return;
    }

    const key = e.key;
    const ctrl = e.ctrlKey;
    const meta = e.metaKey;
    const shift = e.shiftKey;

    // Key sequences (g prefix)
    if (keySequence || key === 'g') {
      if (handleKeySequence(key.toLowerCase())) {
        e.preventDefault();
        return;
      }
      if (keySequence) return;
    }

    // C-x prefix
    if (ctrl && key === 'x') {
      keySequence = 'C-x';
      showMessage('C-x-');
      e.preventDefault();
      return;
    }

    // C-g - keyboard quit
    if (ctrl && key === 'g') {
      if (helpOverlay?.classList.contains('visible')) {
        toggleHelp();
      }
      keySequence = '';
      showMessage('Quit');
      e.preventDefault();
      return;
    }

    // === LIST BUFFER ===
    if (currentBuffer === 'list') {
      switch (key) {
        case 'n':
        case 'ArrowDown':
          updateSelection(selectedIndex + 1);
          e.preventDefault();
          break;
        case 'p':
        case 'ArrowUp':
          updateSelection(selectedIndex - 1);
          e.preventDefault();
          break;
        case 'Enter':
        case 'o':
        case ' ':
          openSelectedArticle();
          e.preventDefault();
          break;
        case '<':
          updateSelection(0);
          e.preventDefault();
          break;
        case '>':
          updateSelection(getArticleItems().length - 1);
          e.preventDefault();
          break;
      }
    }

    // === CONTENT BUFFER ===
    if (currentBuffer === 'content') {
      switch (key) {
        case 'n':
          // n - next article
          if (!ctrl) {
            navigateArticle(1);
            e.preventDefault();
          }
          break;
        case 'p':
          // p - previous article
          if (!ctrl) {
            navigateArticle(-1);
            e.preventDefault();
          }
          break;
        case 'ArrowDown':
          // Arrow down - scroll a bit
          contentBody?.scrollBy({ top: 50, behavior: 'smooth' });
          e.preventDefault();
          break;
        case 'ArrowUp':
          // Arrow up - scroll a bit
          contentBody?.scrollBy({ top: -50, behavior: 'smooth' });
          e.preventDefault();
          break;
        case ' ':
          // Space - page down, Shift+Space - page up
          scrollContent(shift ? 'up' : 'down');
          e.preventDefault();
          break;
        case 'v':
          // C-v page down, M-v page up
          if (ctrl) {
            scrollContent('down');
            e.preventDefault();
          } else if (meta || e.altKey) {
            scrollContent('up');
            e.preventDefault();
          }
          break;
        case '<':
          // Beginning of buffer
          if (contentBody) contentBody.scrollTop = 0;
          e.preventDefault();
          break;
        case '>':
          // End of buffer
          if (contentBody) contentBody.scrollTop = contentBody.scrollHeight;
          e.preventDefault();
          break;
        case 'q':
          // q - go back to list
          goBack();
          e.preventDefault();
          break;
      }
    }

    // === GLOBAL ===
    switch (key) {
      case 't':
        if (!ctrl && !meta) {
          window.toggleTheme?.();
          e.preventDefault();
        }
        break;
      case '+':
      case '=':
        window.adjustFontSize?.(1);
        e.preventDefault();
        break;
      case '-':
        if (!ctrl && !meta) {
          window.adjustFontSize?.(-1);
          e.preventDefault();
        }
        break;
    }
  }

  /**
   * Handle click on article item
   */
  function handleArticleClick(e) {
    const item = e.target.closest('.article-item');
    if (!item) return;

    const index = parseInt(item.dataset.index, 10);
    if (!isNaN(index)) {
      if (index === selectedIndex) {
        // Click on selected - open it
        openSelectedArticle();
      } else {
        // Click on different item - select it
        updateSelection(index);
      }
    }
  }

  /**
   * Handle double click to open
   */
  function handleArticleDoubleClick(e) {
    const item = e.target.closest('.article-item');
    if (!item) return;
    
    const index = parseInt(item.dataset.index, 10);
    if (!isNaN(index)) {
      updateSelection(index);
      openSelectedArticle();
    }
  }

  /**
   * Initialize
   */
  function init() {
    // Keyboard events
    document.addEventListener('keydown', handleKeydown);

    // Click events
    articleList?.addEventListener('click', handleArticleClick);
    articleList?.addEventListener('dblclick', handleArticleDoubleClick);

    // Help close button
    document.getElementById('help-close')?.addEventListener('click', toggleHelp);

    // Initialize selection and modeline
    updateListModeline();

    // Set initial echo area message
    if (echoMessage) {
      echoMessage.textContent = 'n/p to navigate, RET to open, ? for help';
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for other modules
  window.emacsBlog = window.emacsBlog || {};
  window.emacsBlog.keyboard = {
    switchBuffer,
    updateSelection,
    showMessage
  };
})();
