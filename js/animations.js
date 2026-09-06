/* ==========================================================================
   BRANDFULL KINETIC MOTION & SCROLL REVEAL ENGINE
   ========================================================================== */

const MotionEngine = {
  observer: null,

  init() {
    this.initMagneticButtons();
    this.initTextMotionObserver();
    this.initNumberCounters();
    this.initHeaderBlur();
    this.initScrollTextReveal();
    this.initImageTrail();
    this.initLogoRotator();
    this.initHorizontalScroll();

    // Re-run motion observation whenever dynamic content or route changes
    window.addEventListener('brandfull-data-updated', () => {
      setTimeout(() => this.scanAndObserve(), 100);
    });

    window.addEventListener('popstate', () => {
      setTimeout(() => this.scanAndObserve(), 80);
    });
  },

  // 0.1 Horizontal Scroll & Arc Cards
  initHorizontalScroll() {
    const sections = document.querySelectorAll('.horizontal-scroll-section');
    const header = document.querySelector('.site-header');
    
    if (!sections.length) return;

    window.addEventListener('scroll', () => {
      let isDark = false;
      const centerX = window.innerWidth / 2;

      sections.forEach(section => {
        const scroller = section.querySelector('.showcase-scroller');
        if (!scroller) return;

        const rect = section.getBoundingClientRect();
        const scrollableDistance = section.offsetHeight - window.innerHeight;
        
        // Horizontal Scroll translation
        let progress = 0;
        if (rect.top <= 0 && rect.bottom >= window.innerHeight) {
          progress = Math.abs(rect.top) / scrollableDistance;
        } else if (rect.bottom < window.innerHeight) {
          progress = 1;
        }
        
        const maxTranslateX = scroller.scrollWidth - window.innerWidth;
        if (maxTranslateX > 0) {
          scroller.style.transform = `translate3d(-${progress * maxTranslateX}px, 0, 0)`;
        }

        // Dark background logic (trigger fade when section enters 60% of viewport)
        if (rect.top <= window.innerHeight * 0.6 && rect.bottom >= 0) {
          isDark = true;
        }

        // Arc calculation for cards inside this section
        const arcItems = section.querySelectorAll('.arc-item-wrapper');
        arcItems.forEach(item => {
          const itemRect = item.getBoundingClientRect();
          const itemCenterX = itemRect.left + itemRect.width / 2;
          const distanceFromCenter = itemCenterX - centerX;
          
          // Max rotation of 30 degrees at edges, drop down by 250px
          const rotation = (distanceFromCenter / window.innerWidth) * 45; 
          const translateY = Math.abs(distanceFromCenter / window.innerWidth) * 300; 
          
          item.style.transform = `translateY(${translateY}px) rotate(${rotation}deg)`;
        });
      });

      // Also check solutions and footer for dark theme
      const solutions = document.querySelector('.solutions-stack-section');
      if (solutions) {
        const sRect = solutions.getBoundingClientRect();
        if (sRect.top <= window.innerHeight * 0.6 && sRect.bottom >= 0) isDark = true;
      }
      const footer = document.querySelector('.site-footer');
      if (footer) {
        const fRect = footer.getBoundingClientRect();
        if (fRect.top <= window.innerHeight * 0.6) isDark = true;
      }

      // Toggle global dark theme on body
      if (isDark) {
        document.body.classList.add('dark-theme');
      } else {
        document.body.classList.remove('dark-theme');
      }

      if (header) {
        if (isDark) {
          header.classList.add('theme-dark');
        } else {
          header.classList.remove('theme-dark');
        }
      }
    }, { passive: true });
  },

  // 0.2 Logo Rotator
  initLogoRotator() {
    const boxes = document.querySelectorAll('.client-logo-box');
    if (!boxes.length) return;

    const extraLogos = [
      'https://upload.wikimedia.org/wikipedia/commons/2/20/Adidas_Logo.svg',
      'https://upload.wikimedia.org/wikipedia/commons/a/a6/Logo_NIKE.svg',
      'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg',
      'https://upload.wikimedia.org/wikipedia/commons/2/26/Spotify_logo_with_text.svg',
      'https://upload.wikimedia.org/wikipedia/commons/b/b9/Slack_Technologies_Logo.svg',
      'https://upload.wikimedia.org/wikipedia/commons/5/51/IBM_logo.svg',
      'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg',
      'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg'
    ];

    const rotateLogo = () => {
      const randomBoxIndex = Math.floor(Math.random() * boxes.length);
      const box = boxes[randomBoxIndex];
      if (!box) return;

      const currentImg = box.querySelector('img:not(.sliding-out)');
      if (!currentImg) {
        setTimeout(rotateLogo, 2000);
        return;
      }
      
      const randomLogoIndex = Math.floor(Math.random() * extraLogos.length);
      const newLogo = extraLogos[randomLogoIndex];
      
      // Ensure box has relative positioning and overflow hidden
      box.style.position = 'relative';
      box.style.overflow = 'hidden';

      // Create new image and position it above the box
      const newImg = document.createElement('img');
      newImg.src = newLogo;
      newImg.style.position = 'absolute';
      newImg.style.top = '-50%';
      newImg.style.left = '50%';
      newImg.style.width = '50%';
      newImg.style.height = '50%';
      newImg.style.objectFit = 'contain';
      newImg.style.transform = 'translate(-50%, -50%)';
      newImg.style.transition = 'top 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
      
      box.appendChild(newImg);

      // Set styles for current image to prepare for animation
      currentImg.classList.add('sliding-out');
      currentImg.style.position = 'absolute';
      currentImg.style.top = '50%';
      currentImg.style.left = '50%';
      currentImg.style.width = '50%';
      currentImg.style.height = '50%';
      currentImg.style.transform = 'translate(-50%, -50%)';
      currentImg.style.transition = 'top 0.6s cubic-bezier(0.16, 1, 0.3, 1)';

      // Trigger reflow
      void box.offsetWidth;

      // Animate both downwards
      newImg.style.top = '50%';
      currentImg.style.top = '150%';
      
      setTimeout(() => {
        // Swap logos in the pool
        extraLogos[randomLogoIndex] = currentImg.src;
        if (currentImg.parentNode) {
          currentImg.parentNode.removeChild(currentImg);
        }
      }, 600);

      setTimeout(rotateLogo, 2000);
    };

    // Start 2 concurrent rotators
    setTimeout(rotateLogo, 1000);
    setTimeout(rotateLogo, 2500);
  },

  // 0. Scroll Text Reveal
  initScrollTextReveal() {
    const container = document.getElementById('revealText');
    if (!container) return;
    
    window.addEventListener('scroll', () => {
      const spans = container.querySelectorAll('span');
      if (!spans.length) return;
      const rect = container.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      const start = windowHeight * 0.9;
      const end = windowHeight * 0.4;
      
      let progress = 0;
      if (rect.top > start) progress = 0;
      else if (rect.top < end) progress = 1;
      else progress = (start - rect.top) / (start - end);
      
      const totalSpans = spans.length;
      const revealCount = Math.floor(progress * totalSpans);
      
      spans.forEach((span, i) => {
        if (i < revealCount) {
          span.classList.add('revealed');
        } else {
          span.classList.remove('revealed');
        }
      });
    }, { passive: true });
  },

  // 0.5 Image Trail Effect
  initImageTrail() {
    const wrap = document.querySelector('.hero-split-wrap');
    if (!wrap) return;

    const getImages = () => {
      if (window.App && App.data && App.data.settings && App.data.settings.trailLogos) {
        const customLogos = App.data.settings.trailLogos.split(',').map(s => s.trim()).filter(s => s);
        if (customLogos.length > 0) return customLogos;
      }
      return [
        'https://images.contentstack.io/v3/assets/blt92018a2de1445ae9/blt3d44e42f259e0241/6a8ef31f8814aa40d789b067/mcdonalds.svg',
        'https://images.contentstack.io/v3/assets/blt92018a2de1445ae9/blt60dcaa824a8f5b35/6a8ef33c1eb9e500972c605c/google.svg',
        'https://images.contentstack.io/v3/assets/blt92018a2de1445ae9/blt5128afbbed6a5c03/6a7f094cafd7dbe48552b5a9/nbc.svg',
        'https://images.contentstack.io/v3/assets/blt92018a2de1445ae9/blt6b1a6ac451742f15/6a7f1dda1f7b5a8072791015/nike.svg',
        'https://images.contentstack.io/v3/assets/blt92018a2de1445ae9/bltdb2e9e3ad8d787c0/6a8ebd20da6aea230c37b3d2/logo-big-green-egg_1_(1).svg',
        'https://images.contentstack.io/v3/assets/blt92018a2de1445ae9/blt627a1e6b813a9b44/6a8ef348893681f9633dc03b/hublot.svg'
      ];
    };
    
    const colors = ['#fbc02d', '#e53935', '#a5d6a7', '#e1bee7', '#ffffff', '#212121'];

    let lastX = 0;
    let lastY = 0;
    let currentIndex = 0;
    const distanceThreshold = 60; 

    wrap.addEventListener('mousemove', (e) => {
      const distance = Math.hypot(e.clientX - lastX, e.clientY - lastY);
      if (distance > distanceThreshold) {
        lastX = e.clientX;
        lastY = e.clientY;

        const wrapper = document.createElement('div');
        wrapper.className = 'trail-image-wrapper';
        
        const rot = (Math.random() - 0.5) * 30; // Random rotation between -15 and 15
        wrapper.style.left = `${e.pageX}px`;
        wrapper.style.top = `${e.pageY}px`;
        wrapper.style.transform = `translate(-50%, -50%) rotate(${rot}deg)`;
        
        const img = document.createElement('img');
        const images = getImages();
        img.src = images[currentIndex % images.length];
        
        // Random background color
        img.style.backgroundColor = colors[currentIndex % colors.length];
        
        wrapper.appendChild(img);
        document.body.appendChild(wrapper);

        currentIndex++;

        setTimeout(() => {
          if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
        }, 1200);
      }
    });
  },

  // 1. Magnetic Button Physics with Contrast Safety
  initMagneticButtons() {
    const buttons = document.querySelectorAll('.btn-pill, [data-btn-hover]');

    buttons.forEach(btn => {
      // Ensure text is wrapped in a span for z-index layering
      if (btn.childNodes.length > 0) {
        btn.childNodes.forEach(node => {
          if (node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0) {
            const span = document.createElement('span');
            span.textContent = node.textContent;
            span.style.position = 'relative';
            span.style.zIndex = '2';
            span.style.color = 'inherit';
            btn.replaceChild(span, node);
          }
        });
      }

      if (!btn.querySelector('.btn__circle-wrap')) {
        const circleWrap = document.createElement('span');
        circleWrap.className = 'btn__circle-wrap';
        const circle = document.createElement('span');
        circle.className = 'btn__circle';
        circleWrap.appendChild(circle);
        btn.appendChild(circleWrap);
      }

      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const circle = btn.querySelector('.btn__circle');
        if (circle) {
          circle.style.left = `${x}px`;
          circle.style.top = `${y}px`;
        }
      });
    });
  },

  // 2. Kinetic Text & Scroll Reveal Observer
  initTextMotionObserver() {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in-view');
          // If unobserve desired: this.observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -50px 0px'
    });

    this.scanAndObserve();
  },

  scanAndObserve() {
    // Select all headings, paragraphs, cards, and sections
    const elementsToAnimate = document.querySelectorAll(`
      .hero-tag,
      .hero-headline,
      .hero-lead-text,
      .showreel-container,
      .work-section-header,
      .work-card,
      .solution-item,
      .solution-card,
      .approach-card,
      .stat-item,
      .value-card,
      .idea-card,
      .timeline-row,
      .footer-done-title,
      .newsletter-box,
      .text-display-giant,
      .text-display-lg,
      .text-h1,
      .text-h2
    `);

    elementsToAnimate.forEach((el, idx) => {
      if (!el.classList.contains('motion-reveal') && !el.classList.contains('motion-card')) {
        if (el.classList.contains('work-card') || el.classList.contains('idea-card') || el.classList.contains('approach-card') || el.classList.contains('value-card')) {
          el.classList.add('motion-card');
        } else {
          el.classList.add('motion-reveal');
        }

        // Apply staggered animation delays to siblings
        const siblingIndex = idx % 5;
        if (siblingIndex > 0) {
          el.classList.add(`delay-${siblingIndex}`);
        }
      }

      if (this.observer) {
        this.observer.observe(el);
      }
    });
  },

  // 3. Stats Number Counters
  initNumberCounters() {
    const statNumbers = document.querySelectorAll('.stat-number');
    const numberObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.classList.contains('counted')) {
          entry.target.classList.add('counted');
          const targetText = entry.target.getAttribute('data-value') || entry.target.textContent;
          const match = targetText.match(/\d+/);
          if (match) {
            const targetNum = parseInt(match[0], 10);
            const suffix = targetText.replace(/\d+/, '');
            let currentNum = 0;
            const stepTime = Math.max(15, Math.floor(1200 / targetNum));

            const timer = setInterval(() => {
              currentNum += Math.ceil(targetNum / 25);
              if (currentNum >= targetNum) {
                currentNum = targetNum;
                clearInterval(timer);
              }
              entry.target.textContent = `${currentNum}${suffix}`;
            }, stepTime);
          }
        }
      });
    }, { threshold: 0.3 });

    statNumbers.forEach(stat => numberObserver.observe(stat));
  },

  // 4. Header Dynamic Glass Blur on Scroll
  initHeaderBlur() {
    const header = document.querySelector('.site-header');
    if (!header) return;

    window.addEventListener('scroll', () => {
      if (window.scrollY > 30) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }
    }, { passive: true });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  MotionEngine.init();
});
