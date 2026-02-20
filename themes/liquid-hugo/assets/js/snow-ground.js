// Snow Ground Effect - Interactive Canvas Background
// Mouse movement leaves trails that fade away like footprints in snow

(function() {
  'use strict';
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Configuration
  const config = {
    trailSize: 35,
    trailColor: 'rgba(180, 190, 200, 0.5)',
    fadeSpeed: 0.015,
    maxTrails: 150,
    snowColor: '#fafbfc',
    darkSnowColor: '#1a1a1e',
    textureOpacity: 0.03,
    isDarkMode: document.documentElement.classList.contains('dark')
  };
  
  let trails = [];
  let mouseX = 0;
  let mouseY = 0;
  let isMoving = false;
  let moveTimeout = null;
  
  // Initialize canvas
  function init() {
    canvas.id = 'snow-ground';
    canvas.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: -1;
      pointer-events: none;
    `;
    
    document.body.insertBefore(canvas, document.body.firstChild);
    
    resize();
    window.addEventListener('resize', resize);
    
    // Mouse events
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', () => { isMoving = false; });
    
    // Touch events for mobile
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', () => { isMoving = false; });
    
    // Start animation
    animate();
  }
  
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    drawSnowGround();
  }
  
  function handleMouseMove(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    isMoving = true;
    
    addTrail(mouseX, mouseY);
    
    clearTimeout(moveTimeout);
    moveTimeout = setTimeout(() => {
      isMoving = false;
    }, 100);
  }
  
  function handleTouchMove(e) {
    if (e.touches.length > 0) {
      mouseX = e.touches[0].clientX;
      mouseY = e.touches[0].clientY;
      isMoving = true;
      
      addTrail(mouseX, mouseY);
    }
  }
  
  function addTrail(x, y) {
    // Don't add too many trails at once
    if (trails.length > 0) {
      const lastTrail = trails[trails.length - 1];
      const distance = Math.hypot(x - lastTrail.x, y - lastTrail.y);
      if (distance < 10) return; // Too close to last trail
      
      // Interpolate trails for high-speed mouse movement
      // This fixes the discontinuity issue when mouse moves fast
      if (distance > 20) {
        const steps = Math.ceil(distance / 15); // Add a trail every ~15 pixels
        for (let i = 1; i < steps; i++) {
          const t = i / steps;
          const interpX = lastTrail.x + (x - lastTrail.x) * t;
          const interpY = lastTrail.y + (y - lastTrail.y) * t;
          
          trails.push({
            x: interpX,
            y: interpY,
            size: config.trailSize * (0.8 + Math.random() * 0.4), // Slight size variation
            opacity: 0.8 + Math.random() * 0.2,
            age: 0
          });
          
          // Remove old trails if too many
          if (trails.length > config.maxTrails) {
            trails.shift();
          }
        }
      }
    }
    
    trails.push({
      x: x,
      y: y,
      size: config.trailSize,
      opacity: 1,
      age: 0
    });
    
    // Remove old trails if too many
    if (trails.length > config.maxTrails) {
      trails.shift();
    }
  }
  
  function drawSnowGround() {
    // Check dark mode
    config.isDarkMode = document.documentElement.classList.contains('dark');
    
    // Clear canvas with appropriate color
    ctx.fillStyle = config.isDarkMode ? config.darkSnowColor : config.snowColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add subtle texture (noise)
    addNoiseTexture();
    
    // Add gradient overlay for depth
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    if (config.isDarkMode) {
      gradient.addColorStop(0, 'rgba(30, 30, 35, 0)');
      gradient.addColorStop(1, 'rgba(20, 20, 25, 0.5)');
    } else {
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
      gradient.addColorStop(1, 'rgba(240, 242, 245, 0.5)');
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  
  function addNoiseTexture() {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      if (Math.random() < 0.1) {
        const noise = (Math.random() - 0.5) * 10;
        data[i] = Math.min(255, Math.max(0, data[i] + noise));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
  }
  
  function drawTrail(trail) {
    ctx.save();
    
    // Create radial gradient for soft trail edge
    const gradient = ctx.createRadialGradient(
      trail.x, trail.y, 0,
      trail.x, trail.y, trail.size
    );
    
    if (config.isDarkMode) {
      // Dark mode: lighter trails on dark snow
      const alpha = trail.opacity * 0.4;
      gradient.addColorStop(0, `rgba(80, 85, 95, ${alpha})`);
      gradient.addColorStop(0.5, `rgba(60, 65, 75, ${alpha * 0.6})`);
      gradient.addColorStop(1, `rgba(40, 45, 55, 0)`);
    } else {
      // Light mode: darker trails on white snow
      const alpha = trail.opacity * 0.35;
      gradient.addColorStop(0, `rgba(160, 170, 180, ${alpha})`);
      gradient.addColorStop(0.5, `rgba(180, 190, 200, ${alpha * 0.6})`);
      gradient.addColorStop(1, `rgba(200, 210, 220, 0)`);
    }
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(trail.x, trail.y, trail.size, 0, Math.PI * 2);
    ctx.fill();
    
    // Add shadow/glow for depth effect
    if (config.isDarkMode) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 15;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    } else {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
    }
    
    ctx.restore();
  }
  
  function animate() {
    // Redraw snow ground
    drawSnowGround();
    
    // Update and draw trails
    trails = trails.filter(trail => {
      trail.age += 1;
      trail.opacity -= config.fadeSpeed;
      
      if (trail.opacity <= 0) {
        return false;
      }
      
      drawTrail(trail);
      return true;
    });
    
    requestAnimationFrame(animate);
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
