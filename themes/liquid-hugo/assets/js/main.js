// Liquid Theme - Main JavaScript

document.addEventListener('DOMContentLoaded', function() {
  // Search Functionality
  const searchToggle = document.querySelector('.search-toggle');
  const searchModal = document.getElementById('searchModal');
  const searchInput = document.getElementById('searchInput');
  const searchClose = document.getElementById('searchClose');
  const searchResults = document.getElementById('searchResults');
  
  let searchData = [];
  let selectedIndex = -1;
  
  // Load search data
  async function loadSearchData() {
    try {
      const response = await fetch('/search.json');
      searchData = await response.json();
    } catch (error) {
      console.error('Failed to load search data:', error);
    }
  }
  
  // Open search modal
  function openSearch() {
    searchModal.classList.add('active');
    searchInput.value = '';
    searchInput.focus();
    searchResults.innerHTML = '';
    selectedIndex = -1;
    document.body.style.overflow = 'hidden';
  }
  
  // Close search modal
  function closeSearch() {
    searchModal.classList.remove('active');
    document.body.style.overflow = '';
  }
  
  // Perform search
  function performSearch(query) {
    if (!query.trim()) {
      searchResults.innerHTML = '';
      return;
    }
    
    const normalizedQuery = query.toLowerCase().trim();
    const results = searchData.filter(item => {
      const titleMatch = item.title && item.title.toLowerCase().includes(normalizedQuery);
      const contentMatch = item.content && item.content.toLowerCase().includes(normalizedQuery);
      return titleMatch || contentMatch;
    }).slice(0, 10);
    
    renderResults(results, normalizedQuery);
  }
  
  // Highlight search term
  function highlightText(text, query) {
    if (!text) return '';
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }
  
  // Render search results
  function renderResults(results, query) {
    if (results.length === 0) {
      searchResults.innerHTML = '<div class="search-no-results">没有找到相关文章</div>';
      return;
    }
    
    const html = results.map((item, index) => {
      const excerpt = item.content ? item.content.substring(0, 150) + '...' : '';
      return `
        <a href="${item.url}" class="search-result-item" data-index="${index}">
          <div class="search-result-title">${highlightText(item.title, query)}</div>
          <div class="search-result-excerpt">${highlightText(excerpt, query)}</div>
          <div class="search-result-meta">
            <span>${item.date || ''}</span>
            ${item.categories ? `<span>${item.categories.join(', ')}</span>` : ''}
          </div>
        </a>
      `;
    }).join('');
    
    searchResults.innerHTML = html;
    selectedIndex = -1;
  }
  
  // Update selected item
  function updateSelection() {
    const items = searchResults.querySelectorAll('.search-result-item');
    items.forEach((item, index) => {
      item.classList.toggle('selected', index === selectedIndex);
    });
    
    if (selectedIndex >= 0 && items[selectedIndex]) {
      items[selectedIndex].scrollIntoView({ block: 'nearest' });
    }
  }
  
  // Event listeners
  if (searchToggle) {
    searchToggle.addEventListener('click', openSearch);
  }
  
  if (searchClose) {
    searchClose.addEventListener('click', closeSearch);
  }
  
  if (searchModal) {
    searchModal.addEventListener('click', function(e) {
      if (e.target === searchModal) {
        closeSearch();
      }
    });
  }
  
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', function() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        performSearch(this.value);
      }, 300);
    });
    
    searchInput.addEventListener('keydown', function(e) {
      const items = searchResults.querySelectorAll('.search-result-item');
      
      switch(e.key) {
        case 'Escape':
          closeSearch();
          break;
        case 'ArrowDown':
          e.preventDefault();
          selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
          updateSelection();
          break;
        case 'ArrowUp':
          e.preventDefault();
          selectedIndex = Math.max(selectedIndex - 1, -1);
          updateSelection();
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && items[selectedIndex]) {
            window.location.href = items[selectedIndex].href;
          } else if (items.length > 0) {
            window.location.href = items[0].href;
          }
          break;
      }
    });
  }
  
  // Keyboard shortcut: Ctrl/Cmd + K to open search
  document.addEventListener('keydown', function(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      if (searchModal.classList.contains('active')) {
        closeSearch();
      } else {
        openSearch();
      }
    }
  });
  
  // Load search data on page load
  loadSearchData();
  
  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
  
  // Hero scroll indicator - smooth scroll to posts
  const heroSubtitle = document.querySelector('.hero-subtitle');
  if (heroSubtitle && document.querySelector('.posts-section')) {
    heroSubtitle.style.cursor = 'pointer';
    heroSubtitle.addEventListener('click', () => {
      document.querySelector('.posts-section').scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    });
    heroSubtitle.title = 'Click to scroll to posts';
  }
  
  // Tabs functionality
  document.querySelectorAll('.tabs').forEach(tabsContainer => {
    const buttons = tabsContainer.querySelectorAll('.nav-tabs .tab');
    const panes = tabsContainer.querySelectorAll('.tab-contents .tab-item-content');
    
    buttons.forEach((button, index) => {
      button.addEventListener('click', function() {
        // Remove active class from all buttons and panes
        buttons.forEach(btn => btn.classList.remove('active'));
        panes.forEach(pane => pane.classList.remove('active'));
        
        // Add active class to current button and corresponding pane
        this.classList.add('active');
        if (panes[index]) {
          // Force reflow to ensure animation restarts properly
          void panes[index].offsetWidth;
          panes[index].classList.add('active');
        }
      });
    });
  });
  
// Code block enhancements
  function createCopyButton(code) {
    const button = document.createElement('button');
    button.className = 'code-copy-btn';
    button.type = 'button';
    button.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
      </svg>
      <span>Copy</span>
    `;

    button.addEventListener('click', async () => {
      const text = code.textContent;
      try {
        await navigator.clipboard.writeText(text);
        button.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span>Copied!</span>
        `;
        button.classList.add('copied');

        setTimeout(() => {
          button.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            <span>Copy</span>
          `;
          button.classList.remove('copied');
        }, 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    });

    return button;
  }

  function buildToolbar(lang, codeElement) {
    const toolbar = document.createElement('div');
    toolbar.className = 'code-toolbar';

    const label = document.createElement('span');
    label.className = 'code-lang-label';
    label.textContent = (lang || 'code').toUpperCase();

    const button = createCopyButton(codeElement);

    toolbar.appendChild(label);
    toolbar.appendChild(button);

    return toolbar;
  }

  // Handle Hexo highlight structure
  document.querySelectorAll('.post-content figure.highlight').forEach(figure => {
    const classList = Array.from(figure.classList);
    const lang = classList.find(cls => cls !== 'highlight');

    const table = figure.querySelector('table');
    const code = figure.querySelector('pre code');
    if (!table || !code) return;

    const toolbar = buildToolbar(lang, code);
    figure.insertBefore(toolbar, table);
    figure.classList.add('has-toolbar');
  });

  // Handle simple <pre><code> blocks
  document.querySelectorAll('.post-content pre:not(figure.highlight pre)').forEach(pre => {
    const code = pre.querySelector('code');
    if (!code) return;

    const langClass = Array.from(code.classList).find(cls => cls.startsWith('language-'));
    const lang = langClass ? langClass.replace('language-', '') : (pre.getAttribute('data-lang') || 'code');

    const wrapper = document.createElement('figure');
    wrapper.className = 'code-block';
    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);

    const toolbar = buildToolbar(lang, code);
    wrapper.insertBefore(toolbar, pre);
  });
  
  // Add loaded class for fade-in animations
  document.body.classList.add('loaded');
  
  // Animate post cards on scroll
  const postCards = document.querySelectorAll('.post-card');
  
  if (postCards.length > 0) {
    // Intersection Observer for card animations
    const cardObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          // Add staggered delay based on card index
          const cardIndex = Array.from(postCards).indexOf(entry.target);
          setTimeout(() => {
            entry.target.classList.add('animate-in');
          }, cardIndex * 100);
          
          // Unobserve after animation
          cardObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });
    
    postCards.forEach(card => {
      cardObserver.observe(card);
    });
  }
  
  // Sidebar Drawer Functionality
  const fabToggle = document.getElementById('fabSidebarToggle');
  const sidebarDrawer = document.getElementById('sidebarDrawer');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  const sidebarClose = document.getElementById('sidebarDrawerClose');
  
  function openSidebar() {
    if (sidebarDrawer) {
      sidebarDrawer.classList.add('active');
    }
    if (sidebarOverlay) {
      sidebarOverlay.classList.add('active');
    }
    if (fabToggle) {
      fabToggle.classList.add('hidden');
    }
    document.body.style.overflow = 'hidden';
  }
  
  function closeSidebar() {
    if (sidebarDrawer) {
      sidebarDrawer.classList.remove('active');
    }
    if (sidebarOverlay) {
      sidebarOverlay.classList.remove('active');
    }
    if (fabToggle) {
      fabToggle.classList.remove('hidden');
    }
    document.body.style.overflow = '';
  }
  
  if (sidebarClose) {
    sidebarClose.addEventListener('click', closeSidebar);
  }
  
  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', closeSidebar);
  }
  
  // Close sidebar on Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && sidebarDrawer && sidebarDrawer.classList.contains('active')) {
      closeSidebar();
    }
  });
  
  // Draggable FAB - Liquid Glass Style
  if (fabToggle) {
    let isDragging = false;
    let hasMoved = false;
    let startX, startY;
    let translateX = 0, translateY = 0;
    let currentTranslateX = 0, currentTranslateY = 0;
    
    // Reset position to default (responsive layout)
    function resetPosition() {
      translateX = 0;
      translateY = 0;
      currentTranslateX = 0;
      currentTranslateY = 0;
      fabToggle.style.transform = 'translate(0, 0)';
      fabToggle.style.right = '';
      fabToggle.style.top = '';
    }
    
    // Reset position on window resize
    let resizeTimer;
    window.addEventListener('resize', function() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resetPosition, 250);
    });
    
    // Drag start
    function dragStart(e) {
      hasMoved = false;
      
      if (e.type === 'touchstart') {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      } else {
        startX = e.clientX;
        startY = e.clientY;
      }
      
      isDragging = true;
      fabToggle.style.transition = 'none';
      
      e.preventDefault();
    }
    
    // Dragging
    function drag(e) {
      if (!isDragging) return;
      
      let clientX, clientY;
      if (e.type === 'touchmove') {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      
      const deltaX = clientX - startX;
      const deltaY = clientY - startY;
      
      // Consider it a drag if moved more than 5px
      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        hasMoved = true;
      }
      
      currentTranslateX = translateX + deltaX;
      currentTranslateY = translateY + deltaY;
      
      // Get current viewport constraints
      const rect = fabToggle.getBoundingClientRect();
      const fabWidth = rect.width;
      const fabHeight = rect.height;
      
      // Calculate default position (based on right positioning)
      const computedStyle = getComputedStyle(fabToggle);
      const defaultRight = parseFloat(computedStyle.right) || 20;
      const defaultTop = parseFloat(computedStyle.top) || (window.innerHeight * 0.35);
      
      // Calculate new translate values (inverted because of right positioning)
      // Dragging right should decrease right value, so translateX is inverted
      const adjustedTranslateX = -currentTranslateX;
      
      // Calculate boundaries
      const newRight = defaultRight + adjustedTranslateX;
      const newTop = defaultTop + currentTranslateY;
      
      // Constrain within viewport
      const maxRight = window.innerWidth - fabWidth - 10;
      const maxY = window.innerHeight - fabHeight - 10;
      const minRight = 10;
      const minY = 10;
      
      let finalTranslateX = currentTranslateX;
      let finalTranslateY = currentTranslateY;
      
      if (newRight < minRight) {
        finalTranslateX = -(minRight - defaultRight);
      } else if (newRight > maxRight) {
        finalTranslateX = -(maxRight - defaultRight);
      }
      
      if (newTop < minY) {
        finalTranslateY = minY - defaultTop;
      } else if (newTop > maxY) {
        finalTranslateY = maxY - defaultTop;
      }
      
      currentTranslateX = finalTranslateX;
      currentTranslateY = finalTranslateY;
      
      fabToggle.style.transform = `translate(${currentTranslateX}px, ${currentTranslateY}px)`;
      
      e.preventDefault();
    }
    
    // Drag end
    function dragEnd(e) {
      if (isDragging) {
        translateX = currentTranslateX;
        translateY = currentTranslateY;
        isDragging = false;
        fabToggle.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.2s, box-shadow 0.3s';
      }
    }
    
    // Handle click events
    function handleClick(e) {
      if (hasMoved) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      openSidebar();
    }
    
    fabToggle.addEventListener('mousedown', dragStart);
    fabToggle.addEventListener('touchstart', dragStart, {passive: false});
    
    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag, {passive: false});
    
    document.addEventListener('mouseup', dragEnd);
    document.addEventListener('touchend', dragEnd);
    
    fabToggle.addEventListener('click', handleClick);
  }
  
  // Hide empty TOC items (items with empty or whitespace-only text)
  document.querySelectorAll('.toc-content .toc-text').forEach(textSpan => {
    if (!textSpan.textContent || textSpan.textContent.trim() === '') {
      const tocItem = textSpan.closest('.toc-item');
      if (tocItem) {
        tocItem.style.display = 'none';
      }
    }
  });
  
  // TOC Scroll Spy & Click Handler
  const tocLinks = document.querySelectorAll('.toc-content a');
  const headings = document.querySelectorAll('.post-content h2, .post-content h3, .post-content h4');
  
  if (tocLinks.length && headings.length) {
    // Smooth scroll on TOC link click
    tocLinks.forEach(link => {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        // Decode URL-encoded ID (e.g., Chinese characters)
        const decodedId = decodeURIComponent(targetId.slice(1));
        // Use getElementById to avoid CSS selector special character issues
        const target = document.getElementById(decodedId);
        if (target) {
          const headerOffset = 100;
          const elementPosition = target.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
          
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
          
          // Update active state
          tocLinks.forEach(l => l.classList.remove('active'));
          this.classList.add('active');
        }
      });
    });
    
    // Update active state on scroll
    function updateActiveToc() {
      const scrollPos = window.scrollY + 120;
      
      let current = null;
      headings.forEach(heading => {
        if (heading.offsetTop <= scrollPos) {
          current = heading;
        }
      });
      
      tocLinks.forEach(link => {
        link.classList.remove('active');
        // Decode href for comparison
        const linkHref = decodeURIComponent(link.getAttribute('href'));
        if (current && linkHref === '#' + current.id) {
          link.classList.add('active');
        }
      });
    }
    
    window.addEventListener('scroll', updateActiveToc);
    updateActiveToc();
  }
  
  // ===== 3D Tilt Effect for Sidebar Cards =====
  (function initSidebarCardTilt() {
    const sidebarCards = document.querySelectorAll('.sidebar-card');
    if (!sidebarCards.length) return;
    
    // Exclude touch devices
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    if (isTouch) return;
    
    const maxRotate = 6; // Sidebar cards have smaller tilt angle for a more refined look
    
    sidebarCards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -maxRotate;
        const rotateY = ((x - centerX) / centerX) * maxRotate;
        
        card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(8px) scale(1.02)`;
        card.classList.add('tilt-active');
      });
      
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(800px) rotateX(0) rotateY(0) translateZ(0) scale(1)';
        card.classList.remove('tilt-active');
      });
    });
  })();
  
  // ===== Hero Particles Animation =====
  (function initHeroParticles() {
    const canvas = document.getElementById('particleCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const heroSection = canvas.closest('.hero');
    
    let particles = [];
    let animationId = null;
    let isVisible = true;
    
    // Check for touch devices - disable on mobile for performance
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    if (isTouch) {
      canvas.style.display = 'none';
      return;
    }
    
    // Resize canvas
    function resizeCanvas() {
      const rect = heroSection.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    }
    
    // Particle class
    class Particle {
      constructor() {
        this.reset();
      }
      
      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.3;
        this.speedY = (Math.random() - 0.5) * 0.3;
        this.opacity = Math.random() * 0.5 + 0.1;
      }
      
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        
        // Wrap around edges
        if (this.x < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        if (this.y > canvas.height) this.y = 0;
      }
      
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139, 92, 246, ${this.opacity})`;
        ctx.fill();
      }
    }
    
    // Initialize particles
    function initParticles() {
      particles = [];
      const particleCount = Math.min(25, Math.floor((canvas.width * canvas.height) / 15000));
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
      }
    }
    
    // Draw connections between nearby particles
    function drawConnections() {
      const maxDistance = 100;
      const maxConnections = 3;
      
      for (let i = 0; i < particles.length; i++) {
        let connections = 0;
        for (let j = i + 1; j < particles.length; j++) {
          if (connections >= maxConnections) break;
          
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < maxDistance) {
            const opacity = (1 - distance / maxDistance) * 0.15;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(139, 92, 246, ${opacity})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
            connections++;
          }
        }
      }
    }
    
    // Animation loop
    let frameCount = 0;
    function animate() {
      if (!isVisible) return;
      
      // Render every 2nd frame for performance (30fps)
      frameCount++;
      if (frameCount % 2 !== 0) {
        animationId = requestAnimationFrame(animate);
        return;
      }
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(particle => {
        particle.update();
        particle.draw();
      });
      
      drawConnections();
      
      animationId = requestAnimationFrame(animate);
    }
    
    // Visibility check
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        isVisible = entry.isIntersecting;
        if (isVisible && !animationId) {
          animate();
        }
      });
    }, { threshold: 0 });
    
    observer.observe(heroSection);
    
    // Initialize
    resizeCanvas();
    initParticles();
    animate();
    
    // Handle resize
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resizeCanvas();
        initParticles();
      }, 250);
    });
    
    // Cleanup on page hide
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        isVisible = false;
        if (animationId) {
          cancelAnimationFrame(animationId);
          animationId = null;
        }
      } else {
        isVisible = true;
        if (!animationId) animate();
      }
    });
  })();
  
  // ===== Glass Music Player =====
  (function initGlassMusicPlayer() {
    const players = document.querySelectorAll('.glass-music-player');
    if (!players.length) return;
    
    // Track which player is currently playing
    let currentPlayingPlayer = null;
    
    players.forEach(function(player) {
      const audio = player.querySelector('.audio-element');
      const playBtn = player.querySelector('.play-btn');
      const progressBar = player.querySelector('.progress-bar');
      const progressFill = player.querySelector('.progress-fill');
      const progressHandle = player.querySelector('.progress-handle');
      const currentTimeEl = player.querySelector('.current-time');
      const durationEl = player.querySelector('.duration');
      const volumeBtn = player.querySelector('.volume-btn');
      const volumeBar = player.querySelector('.volume-bar');
      const volumeFill = player.querySelector('.volume-fill');
      
      if (!audio) return;
      
      // Format time helper
      function formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return mins + ':' + (secs < 10 ? '0' : '') + secs;
      }
      
      // Play/Pause toggle
      playBtn.addEventListener('click', function() {
        if (audio.paused) {
          // Pause other players
          if (currentPlayingPlayer && currentPlayingPlayer !== audio) {
            currentPlayingPlayer.pause();
            const otherPlayer = currentPlayingPlayer.closest('.glass-music-player');
            if (otherPlayer) otherPlayer.classList.remove('is-playing');
          }
          
          audio.play();
          player.classList.add('is-playing');
          currentPlayingPlayer = audio;
        } else {
          audio.pause();
          player.classList.remove('is-playing');
          if (currentPlayingPlayer === audio) currentPlayingPlayer = null;
        }
      });
      
      // Audio events
      // Set duration when metadata is loaded
      function updateDuration() {
        if (audio.duration && !isNaN(audio.duration) && audio.duration !== Infinity) {
          durationEl.textContent = formatTime(audio.duration);
        }
      }
      
      // Try to get duration immediately (might already be cached/loaded)
      if (audio.readyState >= 1) {
        updateDuration();
      }
      
      // Also try after a short delay as fallback
      setTimeout(updateDuration, 100);
      setTimeout(updateDuration, 500);
      
      // Listen for multiple events to ensure we get the duration
      audio.addEventListener('loadedmetadata', updateDuration);
      audio.addEventListener('durationchange', updateDuration);
      audio.addEventListener('canplay', updateDuration);
      audio.addEventListener('loadeddata', updateDuration);
      
      audio.addEventListener('timeupdate', function() {
        const progress = (audio.currentTime / audio.duration) * 100;
        progressFill.style.width = progress + '%';
        progressHandle.style.left = progress + '%';
        currentTimeEl.textContent = formatTime(audio.currentTime);
      });
      
      audio.addEventListener('ended', function() {
        player.classList.remove('is-playing');
        progressFill.style.width = '0%';
        progressHandle.style.left = '0%';
        currentTimeEl.textContent = '0:00';
        if (currentPlayingPlayer === audio) currentPlayingPlayer = null;
      });
      
      audio.addEventListener('waiting', function() {
        player.classList.add('is-loading');
      });
      
      audio.addEventListener('playing', function() {
        player.classList.remove('is-loading');
      });
      
      audio.addEventListener('error', function() {
        player.classList.remove('is-loading');
        player.classList.add('has-error');
        player.classList.remove('is-playing');
        console.error('Audio load error:', audio.src);
      });
      
      // Progress bar interaction
      let isDragging = false;
      
      function updateProgress(e) {
        const rect = progressBar.getBoundingClientRect();
        const x = (e.clientX || e.touches[0].clientX) - rect.left;
        const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
        progressFill.style.width = percentage + '%';
        progressHandle.style.left = percentage + '%';
        if (audio.duration) {
          audio.currentTime = (percentage / 100) * audio.duration;
        }
      }
      
      progressBar.addEventListener('click', updateProgress);
      
      progressBar.addEventListener('mousedown', function(e) {
        isDragging = true;
        updateProgress(e);
      });
      
      progressBar.addEventListener('touchstart', function(e) {
        isDragging = true;
        updateProgress(e);
      }, { passive: true });
      
      document.addEventListener('mousemove', function(e) {
        if (isDragging) updateProgress(e);
      });
      
      document.addEventListener('touchmove', function(e) {
        if (isDragging) updateProgress(e);
      }, { passive: true });
      
      document.addEventListener('mouseup', function() {
        isDragging = false;
      });
      
      document.addEventListener('touchend', function() {
        isDragging = false;
      });
      
      // Volume control
      volumeBtn.addEventListener('click', function() {
        audio.muted = !audio.muted;
        volumeBtn.classList.toggle('is-muted', audio.muted);
      });
      
      function updateVolume(e) {
        const rect = volumeBar.getBoundingClientRect();
        const x = (e.clientX || e.touches[0].clientX) - rect.left;
        const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
        audio.volume = percentage / 100;
        volumeFill.style.width = percentage + '%';
        audio.muted = false;
        volumeBtn.classList.remove('is-muted');
      }
      
      volumeBar.addEventListener('click', updateVolume);
      
      volumeBar.addEventListener('mousedown', function(e) {
        e.stopPropagation();
        const onMove = function(e) { updateVolume(e); };
        const onUp = function() {
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });
      
      volumeBar.addEventListener('touchstart', function(e) {
        e.stopPropagation();
        const onMove = function(e) { updateVolume(e); };
        const onUp = function() {
          document.removeEventListener('touchmove', onMove);
          document.removeEventListener('touchend', onUp);
        };
        document.addEventListener('touchmove', onMove, { passive: true });
        document.addEventListener('touchend', onUp);
      }, { passive: true });
      
      // Set initial volume
      audio.volume = 0.7;
      volumeFill.style.width = '70%';
    });
  })();
});
