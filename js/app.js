/* ==========================================================================
   BRANDFULL MAIN APPLICATION & FULL INTERACTIVE ROUTER
   ========================================================================== */

const App = {
  currentRoute: 'home',
  data: null,

  async init() {
    this.initRouter();
    await this.loadData();
    this.initMobileMenu();
    this.initProjectDrawer();
    this.initSolutionInteractions();
    this.initArticleReader();
    this.initLegalModal();
    this.initContactDrawer();
    this.initNewsletterForm();
    this.initWorkFilter();
    this.initGlobalClickHandlers();
    this.initJobApplicationModal();
    this.initCookieConsent();
    this.initDynamicGreeting();

    // Re-render when data is updated in Admin panel
    window.addEventListener('brandfull-data-updated', async () => {
      await this.loadData();
    });
  },

  async loadData() {
    try {
      const [projects, solutions, articles, jobs, apiSettings] = await Promise.all([
        BrandfullStore.getProjects(),
        BrandfullStore.getSolutions(),
        BrandfullStore.getArticles(),
        BrandfullStore.getJobs(),
        BrandfullStore.getSettings()
      ]);

      this.data = {
        ...BRANDFULL_DEFAULT_DATA,
        projects,
        solutions,
        articles,
        jobs
      };
      
      // Override default settings with API settings if present
      if (apiSettings) {
        this.data.settings = {
            ...this.data.settings,
            ...apiSettings
        };
      }

      this.renderAll();
    } catch (e) {
      console.error("Məlumatlar yüklənərkən xəta baş verdi:", e);
      let local = null;
      if (typeof BrandfullStore !== 'undefined' && BrandfullStore.isDevFallbackAllowed()) {
        local = await import('./seed-data.js').catch(() => null);
      }
      this.data = {
        ...BRANDFULL_DEFAULT_DATA,
        projects: local?.projects || [],
        solutions: local?.solutions || [],
        articles: local?.articles || [],
        jobs: local?.jobs || []
      };
      this.renderAll();
    }
  },

  async renderPageBlocks(pageId) {
    const container = document.getElementById(`${pageId}-blocks-container`);
    if (!container) return;

    try {
      const res = await fetch(`${API_BASE}/api/blocks/${pageId}`);
      const json = await res.json();
      if (json.success && json.data) {
        container.innerHTML = json.data.map(block => this.generateBlockHTML(block)).join('');
        // Re-translate new content
        if (typeof I18nManager !== 'undefined') {
          I18nManager.translatePage();
        }
      }
    } catch (e) {
      console.error(`Failed to load blocks for ${pageId}`, e);
    }
  },

  generateBlockHTML(block) {
    // Determine which language to use based on I18nManager (fallback to Az if not defined yet)
    const lang = (typeof I18nManager !== 'undefined') ? I18nManager.lang : 'az';
    const title = lang === 'en' && block.titleEn ? block.titleEn : lang === 'ru' && block.titleRu ? block.titleRu : block.titleAz;
    const subtitle = lang === 'en' && block.subtitleEn ? block.subtitleEn : lang === 'ru' && block.subtitleRu ? block.subtitleRu : block.subtitleAz;
    const content = lang === 'en' && block.contentEn ? block.contentEn : lang === 'ru' && block.contentRu ? block.contentRu : block.contentAz;

    switch (block.type) {
      case 'hero_dark':
        return `
          <section class="hero-dark-opening">
            <div class="hero-dark-center-visual">
              <img class="inflatable-3d-letter" id="heroShowreelVisual" src="${block.mediaUrl || ''}" alt="${title || ''}">
            </div>
            <div class="hero-dark-bottom-content">
              <div style="z-index: 10;">
                <h1 class="hero-hello-title">${title || ''}<span class="color-primary">.</span></h1>
                <p class="hero-hello-subtitle">${subtitle || ''}</p>
              </div>
              <div class="scroll-down-badge" onclick="window.scrollBy({top: window.innerHeight, behavior: 'smooth'})">
                <span class="scroll-text-track">Scroll down &nbsp;&nbsp;&nbsp; Scroll down &nbsp;&nbsp;&nbsp; Scroll down &nbsp;&nbsp;&nbsp;</span>
              </div>
            </div>
          </section>
        `;
      case 'kinetic_statement':
        return `
          <section class="kinetic-statement-section">
            <h2 class="kinetic-statement-text">${title || ''}</h2>
          </section>
        `;
      case 'rich_text':
        return `
          <section class="hero-split-wrap">
            <div class="hero-split-grid" style="grid-template-columns: 1fr;">
              <div>
                <h2 class="scroll-reveal-text">${title || ''}</h2>
                <div style="margin-top:2rem; font-size:1.2rem;">${content || ''}</div>
              </div>
            </div>
          </section>
        `;
      case 'html':
      default:
        return content || '';
    }
  },

  renderAll() {
    this.renderSiteSettings();
    this.renderHomeShowcase();
    this.renderClientLogos();
    this.renderWorkGrid();
    this.renderSolutionsSection();
    this.renderCompanyTimeline();
    this.renderIdeasGrid();
    this.renderOfficesGrid();
    this.renderCareersJobs();

    if (typeof MotionEngine !== 'undefined') {
      setTimeout(() => MotionEngine.scanAndObserve(), 60);
    }
  },

  // 1. Dynamic Site Settings
  renderSiteSettings() {
      const s = this.data.settings || {};
      const heroTag = document.getElementById('hero-hello-title');
      const heroSubtitle = document.getElementById('dynamic-greeting-text');
      
      if (heroTag && s.heroTag) heroTag.innerHTML = I18nManager.get('heroTag', s) + '<span class="color-primary">.</span>';
      if (heroSubtitle && s.heroSubtitle) heroSubtitle.textContent = I18nManager.get('heroSubtitle', s);

      // Kinetic Text
      const kineticStatic = document.getElementById('kinetic-static-text');
      if (kineticStatic && s.kineticText) {
         kineticStatic.textContent = I18nManager.get('kineticText', s) + ' ';
      }
      
      const kineticScroller = document.getElementById('kinetic-scrolling-words');
      if (kineticScroller && s.kineticWords) {
          const wordsStr = I18nManager.get('kineticWords', s) || '';
          const words = wordsStr.split(',').map(w => w.trim()).filter(Boolean);
          if (words.length > 0) {
              kineticScroller.innerHTML = words.map(w => '<span class="word">' + w + '</span>').join('');
              // Clone the first word to the end for smooth loop if GSAP expects it
              kineticScroller.innerHTML += '<span class="word">' + words[0] + '</span>';
          }
      }
      
      // Split Text (revealText)
      const splitTextEl = document.getElementById('revealText');
      if (splitTextEl && s.splitText) {
          const text = I18nManager.get('splitText', s) || '';
          const words = text.split(' ').map(w => w.trim()).filter(Boolean);
          if (words.length > 0) {
              splitTextEl.innerHTML = words.map(w => '<span>' + w + '</span>').join(' ');
          }
      }

      // Hero Center Visual Media (Poster / Video) from Admin Dynamic Settings
      const heroCenterVisual = document.querySelector('.hero-dark-center-visual');
      const heroVisual = document.getElementById('heroShowreelVisual') ||
                         document.querySelector('.hero-dark-center-visual img') ||
                         document.querySelector('.hero-dark-opening img.inflatable-3d-letter') ||
                         document.querySelector('img.inflatable-3d-letter');

      const videoUrl = (typeof s.showreelVideoUrl === 'string') ? s.showreelVideoUrl.trim() : '';
      const posterUrl = (typeof s.showreelPosterUrl === 'string') ? s.showreelPosterUrl.trim() : '';

      // Sync poster image src if provided
      if (heroVisual && posterUrl) {
        heroVisual.src = posterUrl;
      }

      // If video URL is provided, inject/update video element in hero visual container
      if (videoUrl && heroCenterVisual) {
        let heroVid = document.getElementById('heroShowreelVideo');
        const handleVideoError = () => {
          if (heroVisual) heroVisual.style.display = '';
          if (heroVid) heroVid.style.display = 'none';
        };

        if (!heroVid) {
          heroVid = document.createElement('video');
          heroVid.id = 'heroShowreelVideo';
          heroVid.className = 'inflatable-3d-letter';
          heroVid.autoplay = true;
          heroVid.loop = true;
          heroVid.muted = true;
          heroVid.defaultMuted = true;
          heroVid.playsInline = true;
          heroVid.setAttribute('autoplay', '');
          heroVid.setAttribute('loop', '');
          heroVid.setAttribute('muted', '');
          heroVid.setAttribute('playsinline', '');
          heroVid.setAttribute('webkit-playsinline', '');
          if (posterUrl) {
            heroVid.poster = posterUrl;
            heroVid.setAttribute('poster', posterUrl);
          }

          // Graceful error fallback: capture error on video and source
          heroVid.addEventListener('error', handleVideoError, true);

          const source = document.createElement('source');
          source.src = videoUrl;
          source.type = 'video/mp4';
          source.addEventListener('error', handleVideoError);
          heroVid.appendChild(source);
          heroVid.src = videoUrl;

          heroCenterVisual.appendChild(heroVid);
          heroVid.play().catch(() => {});
        } else {
          // Update existing video element
          const source = heroVid.querySelector('source');
          const currentSrc = source ? (source.getAttribute('src') || source.src) : (heroVid.getAttribute('src') || heroVid.src);
          if (currentSrc !== videoUrl) {
            if (source) {
              source.src = videoUrl;
              source.setAttribute('src', videoUrl);
            }
            heroVid.src = videoUrl;
            heroVid.style.display = '';
            heroVid.load();
            heroVid.play().catch(() => {});
          }
          if (posterUrl) {
            heroVid.poster = posterUrl;
            heroVid.setAttribute('poster', posterUrl);
          } else {
            heroVid.removeAttribute('poster');
            heroVid.poster = '';
          }
        }
        // Hide fallback image only when video is active and not errored/hidden
        if (heroVisual) {
          heroVisual.style.display = (heroVid && heroVid.style.display === 'none') ? '' : 'none';
        }
        const mp = (typeof MediaPlayer !== 'undefined') ? MediaPlayer : (typeof window !== 'undefined' ? window.MediaPlayer : null);
        if (mp) {
          mp.video = heroVid;
        }
      } else {
        // No video URL provided: clean up any existing hero video and show the image
        const existingHeroVid = document.getElementById('heroShowreelVideo');
        if (existingHeroVid) {
          try { existingHeroVid.pause(); } catch (e) {}
          existingHeroVid.remove();
        }
        if (heroVisual) {
          heroVisual.style.display = '';
        }
        const mp = (typeof MediaPlayer !== 'undefined') ? MediaPlayer : (typeof window !== 'undefined' ? window.MediaPlayer : null);
        if (mp) {
          mp.video = null;
        }
      }

      // Update Lightbox Modal Video and Poster
      const modalVideo = document.getElementById('modalVideo');
      if (modalVideo) {
        if (videoUrl) {
          const src = modalVideo.querySelector('source');
          const currentModalSrc = src ? (src.getAttribute('src') || src.src) : (modalVideo.getAttribute('src') || modalVideo.src);
          if (currentModalSrc !== videoUrl) {
            if (src) {
              src.src = videoUrl;
              src.setAttribute('src', videoUrl);
            }
            modalVideo.src = videoUrl;
            modalVideo.setAttribute('src', videoUrl);
            modalVideo.load();
          }
        } else {
          const src = modalVideo.querySelector('source');
          const currentModalSrc = src ? (src.getAttribute('src') || src.src) : (modalVideo.getAttribute('src') || modalVideo.src);
          if (currentModalSrc && currentModalSrc !== 'Showreel.mp4') {
            if (src) {
              src.src = 'Showreel.mp4';
              src.setAttribute('src', 'Showreel.mp4');
            }
            modalVideo.src = 'Showreel.mp4';
            modalVideo.setAttribute('src', 'Showreel.mp4');
            modalVideo.load();
          }
        }
        if (posterUrl) {
          modalVideo.poster = posterUrl;
          modalVideo.setAttribute('poster', posterUrl);
        } else {
          modalVideo.removeAttribute('poster');
          modalVideo.poster = '';
        }
      }
    },

  // 2. Client-Side SPA Router (Every Link & Button)
  async navigateTo(route, updateHistory = true) {
    const validRoutes = ['home', 'work', 'solutions', 'approach', 'company', 'ideas', 'careers', 'contact'];
    
    // Support custom page routes e.g., page/xeberler
    let isCustomPage = false;
    let targetRoute = 'home';
    let customPageSlug = '';

    if (route && route.startsWith('page/')) {
      isCustomPage = true;
      targetRoute = 'custom-page';
      customPageSlug = route.split('/')[1];
    } else {
      targetRoute = validRoutes.includes(route) ? route : 'home';
    }

    // Hide all page views
    document.querySelectorAll('[data-page-view]').forEach(view => {
      view.style.display = 'none';
      view.classList.remove('is-active');
    });

    // If it's a custom page, fetch and populate
    if (isCustomPage && customPageSlug) {
      try {
        const res = await fetch(`${API_BASE}/api/pages/${customPageSlug}`);
        const json = await res.json();
        if (json.success) {
          const p = json.data;
          const lang = I18nManager.lang;
          
          let title = p.titleAz;
          let content = p.contentAz;
          
          if (lang === 'en' && p.titleEn) { title = p.titleEn; content = p.contentEn; }
          if (lang === 'ru' && p.titleRu) { title = p.titleRu; content = p.contentRu; }

          document.getElementById('customPageTitle').innerHTML = `${title}<span class="color-primary">.</span>`;
          document.getElementById('customPageContent').innerHTML = content;
          document.title = `${title} | Brandfull`;
        } else {
          document.getElementById('customPageTitle').innerHTML = `Xəta<span class="color-primary">.</span>`;
          document.getElementById('customPageContent').innerHTML = `<p>${json.error?.message || 'Səhifə tapılmadı.'}</p>`;
        }
      } catch (err) {
        document.getElementById('customPageTitle').innerHTML = `404<span class="color-primary">.</span>`;
        document.getElementById('customPageContent').innerHTML = '<p>Səhifə tapılmadı və ya şəbəkə xətası.</p>';
      }
    }

    // Show target page view
    const activeView = document.querySelector(`[data-page-view="${targetRoute}"]`);
    if (activeView) {
      activeView.style.display = 'block';
      setTimeout(() => activeView.classList.add('is-active'), 20);
    }

    // Video play/pause management on route transitions
    const heroVid = document.getElementById('heroShowreelVideo');
    if (heroVid) {
      if (targetRoute === 'home') {
        heroVid.play().catch(() => {});
      } else {
        try { heroVid.pause(); } catch (e) {}
      }
    }
    
    // Dynamically load blocks if the container exists
    await this.renderPageBlocks(targetRoute);

    if (typeof MotionEngine !== 'undefined') {
      setTimeout(() => MotionEngine.scanAndObserve(), 80);
    }

    // Update Nav active states
    document.querySelectorAll('.nav-link, .mobile-menu-link, .footer-link-main').forEach(link => {
      const linkRoute = link.getAttribute('data-route') || link.getAttribute('href')?.replace('/', '') || 'home';
      if (linkRoute === targetRoute || (targetRoute === 'home' && linkRoute === '')) {
        link.classList.add('is-active');
      } else {
        link.classList.remove('is-active');
      }
    });

    // Update document title
    const titles = {
      home: 'Brandfull — İnsanlar Üçün Əhəmiyyətli İşlər Yaradırıq',
      work: 'İşlərimiz | Brandfull',
      solutions: 'Həllər və Xidmətlər | Brandfull',
      approach: 'Yanaşma və Model | Brandfull',
      company: 'Haqqımızda | Brandfull',
      ideas: 'Fikirlər və Məqalələr | Brandfull',
      careers: 'Karyera | Brandfull',
      contact: 'Əlaqə | Brandfull'
    };
    document.title = titles[targetRoute] || 'Brandfull';

    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.currentRoute = targetRoute;

    // Hash-based routing — works with file:// and http:// protocols
    if (updateHistory) {
      const newHash = targetRoute === 'home' ? '' : `#${targetRoute}`;
      try {
        history.pushState({ route: targetRoute }, '', newHash || window.location.pathname.split('#')[0]);
      } catch(e) {
        // Fallback: just set the hash directly
        window.location.hash = targetRoute === 'home' ? '' : targetRoute;
      }
    }

    // Close mobile menu if open
    const mobileMenu = document.getElementById('mobileMenu');
    if (mobileMenu) mobileMenu.classList.remove('is-open');
  },

  initRouter() {
    // Intercept clicks across whole document
    document.addEventListener('click', (e) => {
      const targetLink = e.target.closest('a[data-route], button[data-route], a[href^="/"], a[href^="#"], .quick-pill');
      if (!targetLink) return;

      const href = targetLink.getAttribute('href');
      const routeAttr = targetLink.getAttribute('data-route');

      // Ignore external or file links
      if (href && (href.startsWith('http') || href.startsWith('mailto:') || href.includes('.html'))) {
        return;
      }

      e.preventDefault();
      // Support both data-route, href="/work", and href="#work"
      const route = routeAttr
        || (href ? href.replace(/^\//, '').replace(/^#/, '').split('?')[0] : 'home');
      this.navigateTo(route || 'home');
    });

    // Browser Back / Forward buttons
    window.addEventListener('popstate', (e) => {
      const route = e.state?.route
        || window.location.hash.replace('#', '')
        || 'home';
      this.navigateTo(route, false);
    });

    // Hash change (when user types URL directly)
    window.addEventListener('hashchange', () => {
      const route = window.location.hash.replace('#', '') || 'home';
      this.navigateTo(route, false);
    });

    // Read initial route from hash or pathname
    const hashRoute = window.location.hash.replace('#', '');
    const pathRoute = window.location.pathname.replace(/^\//, '').split('?')[0];
    const initialRoute = hashRoute || pathRoute || 'home';
    this.navigateTo(initialRoute, false);
  },

  // 3. Render Work Grid
  
  renderHomeShowcase() {
    const scroller = document.getElementById('home-showcase-scroller');
    if (!scroller) return;
    
    const projects = (this.data.projects || []).filter(p => p.featured);
    if (projects.length === 0) return;
    
    scroller.innerHTML = projects.map((item, index) => `
      <div class="showcase-feature-card" data-project-id="${item.id}" style="flex-shrink: 0; width: 75vw; max-width: 900px; height: 60vh; margin-bottom: 0; ${index === projects.length - 1 ? 'margin-right: var(--page-margin);' : ''}">
        <img class="showcase-card-img" src="${item.image}" alt="${item.client}" style="height: 100%;" loading="lazy" />
        <div class="showcase-card-caption">
          <span class="text-tiny font-bold color-primary uppercase">${item.client}</span>
          <h3 class="showcase-card-title">${I18nManager.get('title', item)}</h3>
        </div>
      </div>
    `).join('');
  },

  renderClientLogos() {
    const grid = document.getElementById('home-client-logos');
    if (!grid) return;
    
    const clients = (this.data.clients || []).filter(c => c.active);
    if (clients.length === 0) return;
    
    grid.innerHTML = clients.map(client => {
       if(client.logoUrl) {
         return `<div class="client-logo-box"><img src="${client.logoUrl}" alt="${client.name}" loading="lazy" /></div>`;
       }
       return '';
    }).join('');
  },

  renderWorkGrid() {
    const homeWorkContainer = document.getElementById('homeWorkGrid');
    const fullWorkContainer = document.getElementById('fullWorkGrid');
    const projects = this.data.projects || [];

    const renderCard = (item) => `
      <div class="work-card ${item.span || 'span-6'}" data-project-id="${item.id}" tabindex="0" role="button" aria-label="${item.client} - ${item.title}">
        <div class="work-card-media">
          <img class="work-card-img" src="${item.image}" alt="${item.client} - ${item.title}" loading="lazy" />
          ${item.clientLogo ? `<img class="work-card-client-logo" src="${item.clientLogo}" alt="${item.client} loqosu" />` : ''}
        </div>
        <div class="work-card-body">
          <div>
            <div class="work-card-meta">
              <span class="work-card-client-name">${item.client}</span>
              <span class="work-card-tag">${item.tag}</span>
            </div>
            <h3 class="work-card-title">${I18nManager.get('title', item)}</h3>
          </div>
          <p class="work-card-desc">${I18nManager.get('overview', item) || ''}</p>
          <span class="i18n" data-i18n="readMore" style="font-size:0.85rem; font-weight:700; color:var(--color-brand-magenta); margin-top:0.75rem; display:inline-block;">Layihəyə bax ↗</span>
        </div>
      </div>
    `;

    const renderHugeCard = (item) => `
      <div class="huge-work-card" data-project-id="${item.id}" tabindex="0" role="button" aria-label="${item.client} - ${item.title}">
        <div class="huge-work-card-bg">
          <img class="huge-work-card-img" src="${item.image}" alt="${item.client}" loading="lazy" />
          <div class="huge-work-card-overlay"></div>
        </div>
        <div class="huge-work-card-content">
          <p class="huge-work-client">${item.client}.</p>
          <p class="huge-work-title">${I18nManager.get('title', item)}</p>
        </div>
      </div>
    `;

    if (homeWorkContainer) {
      homeWorkContainer.innerHTML = projects.map(renderCard).join('');
    }

    if (fullWorkContainer) {
      fullWorkContainer.innerHTML = `<div class="huge-work-grid">${projects.map(renderHugeCard).join('')}</div>`;
    }
  },

  // 4. Solutions Section & Click Interactions
  renderSolutionsSection() {
    const homeContainer = document.getElementById('solutionsList');
    const fullContainer = document.getElementById('solutionsCardsGrid');
    const solutions = this.data.solutions || [];

    if (homeContainer) {
      homeContainer.innerHTML = solutions.map(s => `
        <div class="solution-item" data-solution-id="${s.id}" data-action="open-solution" tabindex="0" role="button" aria-label="${s.title}">
          <span class="solution-number">${s.num}</span>
          <div>
            <h3 class="solution-title">${I18nManager.get('title', s)}</h3>
            <p class="solution-desc">${I18nManager.get('tagline', s)}</p>
          </div>
          <div class="solution-arrow">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </div>
        </div>
      `).join('');
    }

    if (fullContainer) {
      fullContainer.innerHTML = solutions.map(s => `
        <div class="solution-editorial-row" data-solution-id="${s.id}" tabindex="0" role="button" aria-label="${s.title}" style="display:flex; flex-direction:column; gap:1.5rem; padding: 4rem 0; border-top: 2px solid var(--theme-border-strong); cursor:pointer; transition: opacity 0.3s;" onmouseover="this.style.opacity='0.6'" onmouseout="this.style.opacity='1'">
          <span class="text-display-lg color-magenta" style="line-height:1; margin-bottom: 1rem;">${s.num}</span>
          <h3 class="text-display-md font-bold" style="max-width:80%; line-height: 1.1;">${I18nManager.get('title', s)}</h3>
          <p class="text-body-lead" style="max-width:85%; color:var(--theme-text-secondary); margin-bottom: 2rem;">${I18nManager.get('desc', s)}</p>
          <ul class="flex flex-col gap-3" style="list-style:none; padding:0;">
            ${(s.deliverables || ['Strategiya', 'İcraat', 'Miqyaslama']).map(d => `<li style="font-weight:700; font-size:1.25rem; padding-left:2rem; position:relative;"><span style="position:absolute; left:0; color:var(--color-brand-magenta);">—</span>${d}</li>`).join('')}
          </ul>
        </div>
      `).join('');
    }
  },

  initSolutionInteractions() {
    document.addEventListener('click', (e) => {
      const item = e.target.closest('[data-solution-id], .solution-item, .solution-card');
      if (!item) return;

      const solId = item.getAttribute('data-solution-id');
      const sol = (this.data.solutions || []).find(s => s.id === solId);

      // Navigate to solutions page or open details
      if (this.currentRoute !== 'solutions') {
        this.navigateTo('solutions');
      } else if (sol) {
        alert(`XİDMƏT TƏFƏRRÜATI:\n\n${sol.title}\n\n${sol.tagline}\n\n${sol.desc}\n\nİmkanlar:\n- ${(sol.deliverables || []).join('\n- ')}`);
      }
    });
  },

  // 5. Render Ideas & Blog Click Reader
  renderIdeasGrid() {
    const container = document.getElementById('ideasGrid');
    const fullContainer = document.getElementById('fullIdeasGrid');
    const articles = this.data.articles || [];

    const renderCard = (art) => `
      <div class="idea-editorial-row" data-article-id="${art.id}" tabindex="0" role="button" aria-label="${art.title}" style="display:flex; flex-direction:column; gap:1.5rem; padding: 3rem 0; border-top: 1px solid var(--theme-border-strong); cursor:pointer; transition: opacity 0.3s;" onmouseover="this.style.opacity='0.6'" onmouseout="this.style.opacity='1'">
        <div class="flex items-center gap-4">
          <span class="text-tiny font-bold uppercase color-magenta" style="letter-spacing:0.05em;">${art.tag}</span>
          <span class="text-tiny font-semibold" style="color:var(--theme-text-muted);">${art.readTime}</span>
        </div>
        <h4 class="text-display-md font-bold" style="max-width:90%; line-height: 1.1;">${I18nManager.get('title', art)}</h4>
        <p class="text-body-lead" style="color:var(--theme-text-secondary); margin-bottom: 2rem;">${I18nManager.get('excerpt', art)}</p>
        <div class="flex items-center justify-between" style="margin-top: auto; padding-top: 1.5rem;">
          <span class="text-tiny font-bold uppercase" style="letter-spacing:0.05em;">${art.author}</span>
          <span class="text-tiny font-semibold" style="color:var(--theme-text-muted);">${art.date}</span>
        </div>
      </div>
    `;

    if (container) {
      container.innerHTML = articles.map(renderCard).join('');
    }

    if (fullContainer) {
      fullContainer.innerHTML = articles.map(renderCard).join('');
    }
  },

  initArticleReader() {
    document.addEventListener('click', (e) => {
      const card = e.target.closest('[data-article-id], .idea-card');
      if (!card) return;

      const artId = card.getAttribute('data-article-id');
      const art = (this.data.articles || []).find(a => a.id === artId);
      const modal = document.getElementById('articleReaderModal');
      const content = document.getElementById('articleReaderContent');

      if (!art || !modal || !content) return;

      content.innerHTML = `
        <div class="flex flex-col gap-6">
          <div>
            <span class="text-tiny font-bold color-magenta uppercase">${art.tag} • ${art.readTime}</span>
            <h2 class="text-display-lg" style="margin-top: 0.5rem; margin-bottom: 1rem;">${I18nManager.get('title', art)}</h2>
            <div style="font-size:0.9rem; color:var(--theme-text-muted); font-weight:600;">
              Müəllif: <strong>${art.author}</strong> • ${art.date}
            </div>
          </div>
          <div style="padding: 1.5rem 0; border-top: 1px solid var(--theme-border-subtle); border-bottom: 1px solid var(--theme-border-subtle); font-size:1.2rem; line-height:1.6; font-weight:500;">
            ${I18nManager.get('excerpt', art)}
          </div>
          <div class="text-body" style="font-size:1.05rem; line-height:1.7;">
            <p style="margin-bottom:1rem;">Brandfull komandası olaraq biz inanırıq ki, rəqəmsal innovasiyalar yalnız texniki baxımdan deyil, həm də insan təcrübəsi və biznes gəliri baxımından real dəyər yaratmalıdır.</p>
            <p style="margin-bottom:1rem;">Hər bir layihəmizdə qabaqcıl süni intellekt həllərini, intuitiv dizayn sistemlərini və dayanıqlı proqram təminatı arxitekturasını tətbiq edirik.</p>
            <p>Daha ətraflı məlumat və ya komandamızla birgə layihə icrası üçün bizimlə əlaqə saxlayın.</p>
          </div>
        </div>
      `;

      modal.classList.add('is-active');
      document.body.style.overflow = 'hidden';
    });

    const closeBtn = document.getElementById('closeArticleReaderBtn');
    const modal = document.getElementById('articleReaderModal');

    if (closeBtn) closeBtn.addEventListener('click', () => {
      if (modal) modal.classList.remove('is-active');
      document.body.style.overflow = '';
    });

    if (modal) modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('is-active');
        document.body.style.overflow = '';
      }
    });
  },

  // 6. Legal & Privacy Modal
  initLegalModal() {
    const modal = document.getElementById('legalModal');
    const closeBtn = document.getElementById('closeLegalModalBtn');

    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href="/privacy"], a[href="/terms"], a[href="#privacy"], a[href="#terms"]');
      if (!link || !modal) return;

      e.preventDefault();
      modal.classList.add('is-active');
      document.body.style.overflow = 'hidden';
    });

    if (closeBtn && modal) {
      closeBtn.addEventListener('click', () => {
        modal.classList.remove('is-active');
        document.body.style.overflow = '';
      });
    }

    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('is-active');
          document.body.style.overflow = '';
        }
      });
    }
  },

  // 7. Render Timeline & Offices
  renderCompanyTimeline() {
    const timelineContainer = document.getElementById('companyTimeline');
    if (!timelineContainer) return;

    const timeline = this.data.timeline || [];
    timelineContainer.innerHTML = timeline.map(item => `
      <div class="timeline-row flex gap-6" style="padding: 1.75rem 0; border-bottom: 1px solid var(--theme-border-subtle);">
        <span class="timeline-year font-bold color-magenta" style="font-size: 1.5rem; min-width: 100px;">${item.year}</span>
        <div>
          <h4 class="text-h4 font-bold" style="margin-bottom: 0.35rem;">${item.title}</h4>
          <p class="text-body">${item.desc}</p>
        </div>
      </div>
    `).join('');
  },

  renderOfficesGrid() {
    const container = document.getElementById('officesGrid');
    if (!container) return;

    const offices = this.data.offices || [];
    container.innerHTML = offices.map(o => `
      <div style="padding: 2.5rem 0; border-top: 1px solid var(--theme-border-strong);">
        <h4 class="text-display-sm font-bold" style="margin-bottom: 1rem; line-height:1;">${o.city}</h4>
        <p class="text-body-lead" style="color:var(--theme-text-secondary); max-width:250px;">${o.address}</p>
      </div>
    `).join('');
  },

  renderCareersJobs() {
    const container = document.getElementById('jobsGrid');
    if (!container) return;

    const jobs = this.data.jobs || [];
    container.innerHTML = jobs.map(job => `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; padding: 3rem 0; border-top: 1px solid var(--theme-border-strong); cursor:pointer; transition: opacity .3s;" onmouseover="this.style.opacity='0.6'" onmouseout="this.style.opacity='1'">
        <div style="flex:1;">
          <h3 class="text-display-md font-bold" style="margin-bottom:1rem; line-height:1.1;">${I18nManager.get('title', job)}</h3>
          <span class="text-body font-bold" style="color:var(--theme-text-secondary); text-transform:uppercase; letter-spacing:0.05em;">${job.type} / ${job.location}</span>
        </div>
        <span class="btn-pill btn-pill-outline i18n" data-i18n="applyBtn" style="flex-shrink:0; align-self:center;" data-action="apply-job" data-job-id="${job.id}">Müraciət Et</span>
      </div>
    `).join('');
  },

  // 8. Work Filtering
  initWorkFilter() {
    const filterBtns = document.querySelectorAll('[data-work-filter]');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('is-active', 'btn-pill-magenta'));
        btn.classList.add('is-active', 'btn-pill-magenta');

        const category = btn.getAttribute('data-work-filter');
        const container = document.getElementById('fullWorkGrid');
        if (!container) return;

        const projects = this.data.projects || [];
        const filtered = category === 'all'
          ? projects
          : projects.filter(p => p.category.toLowerCase().includes(category.toLowerCase()));

        container.innerHTML = `<div class="huge-work-grid">${filtered.map(item => `
          <div class="huge-work-card" data-project-id="${item.id}" tabindex="0" role="button" aria-label="${item.client} - ${item.title}">
            <div class="huge-work-card-bg">
              <img class="huge-work-card-img" src="${item.image}" alt="${item.client}" loading="lazy" />
              <div class="huge-work-card-overlay"></div>
            </div>
            <div class="huge-work-card-content">
              <p class="huge-work-client">${item.client}.</p>
              <p class="huge-work-title">${I18nManager.get('title', item)}</p>
            </div>
          </div>
        `).join('')}</div>`;
      });
    });
  },

  // 9. Project Detail Drawer
  initProjectDrawer() {
    const backdrop = document.getElementById('projectDrawerBackdrop');
    const drawer = document.getElementById('projectDrawer');
    const closeBtn = document.getElementById('closeProjectDrawerBtn');
    const contentBox = document.getElementById('projectDrawerContent');

    document.addEventListener('click', (e) => {
      const card = e.target.closest('[data-project-id]');
      if (!card) return;

      const id = card.getAttribute('data-project-id');
      const project = (this.data.projects || []).find(p => p.id === id);
      if (!project || !drawer) return;

      contentBox.innerHTML = `
        <div class="flex flex-col gap-6">
          <div>
            <span class="text-tiny font-bold color-magenta" style="letter-spacing:0.05em; text-transform:uppercase;">${project.client} • ${project.year || '2025'}</span>
            <h2 class="text-display-lg" style="margin-top: 0.5rem; margin-bottom: 1rem;">${I18nManager.get('title', project)}</h2>
            <p class="text-body-lead">${I18nManager.get('headline', project) || ''}</p>
          </div>

          <div style="border-radius: var(--radius-md); overflow: hidden; max-height: 420px; background:#000;">
            <img src="${project.image}" alt="${project.client}" style="width: 100%; height: 100%; object-fit: cover;" />
          </div>

          <div class="grid grid-cols-3 gap-4" style="padding: 1.5rem 0; border-top: 1px solid var(--theme-border-subtle); border-bottom: 1px solid var(--theme-border-subtle);">
            ${(project.impact || []).map(imp => `
              <div>
                <p class="text-h2 font-bold color-magenta">${imp.metric}</p>
                <p class="text-tiny font-semibold">${imp.label}</p>
              </div>
            `).join('')}
          </div>

          <div>
            <h4 class="text-h4 font-bold" style="margin-bottom: 0.5rem;">Biznes Çağırışı və Problem</h4>
            <p class="text-body">${I18nManager.get('challenge', project) || 'Qlobal miqyasda istifadəçi təcrübəsinin optimallaşdırılması.'}</p>
          </div>

          <div>
            <h4 class="text-h4 font-bold" style="margin-bottom: 0.5rem;">Təqdim Olunan Həll Yolu</h4>
            <p class="text-body">${I18nManager.get('solution', project) || 'Brandfull-un modul dizayn sistemləri və AI texnologiyaları.'}</p>
          </div>

          <div>
            <h4 class="text-h4 font-bold" style="margin-bottom: 0.5rem;">Ümumi İcmal</h4>
            <p class="text-body">${I18nManager.get('overview', project) || ''}</p>
          </div>
        </div>
      `;

      backdrop.classList.add('is-active');
      drawer.classList.add('is-active');
      document.body.style.overflow = 'hidden';
    });

    const closeDrawer = () => {
      backdrop.classList.remove('is-active');
      drawer.classList.remove('is-active');
      document.body.style.overflow = '';
    };

    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    if (backdrop) backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeDrawer();
    });
  },

  // 10. Contact Drawer & Form
  initContactDrawer() {
    const backdrop = document.getElementById('contactDrawerBackdrop');
    const drawer = document.getElementById('contactDrawer');
    const closeBtn = document.getElementById('closeContactDrawerBtn');
    const openBtns = document.querySelectorAll('[data-open-contact]');
    const form = document.getElementById('contactInquiryForm');
    const drawerForm = document.getElementById('drawerInquiryForm');

    const openContact = () => {
      if (!drawer) return;
      backdrop.classList.add('is-active');
      drawer.classList.add('is-active');
      document.body.style.overflow = 'hidden';
    };

    const closeContact = () => {
      if (!drawer) return;
      backdrop.classList.remove('is-active');
      drawer.classList.remove('is-active');
      document.body.style.overflow = '';
    };

    openBtns.forEach(btn => btn.addEventListener('click', (e) => {
      e.preventDefault();
      openContact();
    }));

    if (closeBtn) closeBtn.addEventListener('click', closeContact);
    if (backdrop) backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeContact();
    });
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const inputs = form.querySelectorAll('input, textarea');
        const name = inputs[0]?.value;
        const email = inputs[1]?.value;
        const company = inputs[2]?.value;
        const message = inputs[3]?.value;

        const btn = form.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span>Göndərilir...</span>';

        try {
          await BrandfullStore.createInquiry({ name, email, company, message });
          const successBox = document.getElementById('contactSuccessMsg');
          if (successBox) {
            form.style.display = 'none';
            successBox.style.display = 'block';
          }
        } catch (err) {
          console.error(err);
          alert('Göndərilmə zamanı xəta baş verdi: ' + err.message);
        } finally {
          btn.disabled = false;
          btn.innerHTML = originalText;
        }
      });
    }

    if (drawerForm) {
      drawerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const inputs = drawerForm.querySelectorAll('input, select, textarea');
        const name = inputs[0]?.value;
        const email = inputs[1]?.value;
        const service = inputs[2]?.value;
        const message = inputs[3]?.value;

        const btn = drawerForm.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span>Göndərilir...</span>';

        try {
          await BrandfullStore.createInquiry({ name, email, company: '-', service, message });
          drawerForm.innerHTML = `
            <div style="padding: 2rem 0; text-align: center;">
              <h3 class="text-h3 font-bold color-magenta" style="margin-bottom: 0.5rem;">Müraciətiniz Qəbul Olundu!</h3>
              <p class="text-body">Brandfull komandası ən qısa zamanda sizinlə əlaqə saxlayacaq.</p>
            </div>
          `;
        } catch (err) {
          console.error(err);
          alert('Göndərilmə zamanı xəta baş verdi: ' + err.message);
        } finally {
          btn.disabled = false;
          btn.innerHTML = originalText;
        }
      });
    }
  },

  // 11. Mobile Menu
  initMobileMenu() {
    const toggleBtn = document.getElementById('mobileNavToggle');
    const closeBtn = document.getElementById('closeMobileMenuBtn');
    const menu = document.getElementById('mobileMenu');

    if (toggleBtn && menu) {
      toggleBtn.addEventListener('click', () => menu.classList.add('is-open'));
    }

    if (closeBtn && menu) {
      closeBtn.addEventListener('click', () => menu.classList.remove('is-open'));
    }
  },  // 12. Newsletter Form
  initNewsletterForm() {
    const forms = document.querySelectorAll('.newsletter-form');
    forms.forEach(form => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = form.querySelector('input[type="email"]');
        if (input && input.value) {
          const email = input.value.trim();
          const originalHTML = form.innerHTML;

          form.innerHTML = `<span style="font-weight:600; color:var(--color-brand-magenta);">Göndərilir...</span>`;

          try {
            await BrandfullStore.subscribe(email);
            form.innerHTML = `<span style="font-weight:600; color:var(--color-brand-magenta);">Siyahıya əlavə olundunuz! Brandfull ailəsinə xoş gəldiniz.</span>`;
            setTimeout(() => {
              form.innerHTML = originalHTML;
              this.initNewsletterForm();
            }, 5000);
          } catch (err) {
            console.error(err);
            if (err.code === 'DUPLICATE_ERROR') {
              form.innerHTML = `<span style="font-weight:600; color:#dc2626;">Bu e-poçt ünvanı artıq qeydiyyatdan keçib.</span>`;
            } else {
              form.innerHTML = `<span style="font-weight:600; color:#dc2626;">Abunəlik xətası baş verdi. Yenidən cəhd edin.</span>`;
            }
            setTimeout(() => {
              form.innerHTML = originalHTML;
              this.initNewsletterForm();
            }, 5000);
          }
        }
      });
    });
  },
  // 13. Global Click Fallback
  initGlobalClickHandlers() {
    document.addEventListener('click', (e) => {
      // Approach card click
      const approachCard = e.target.closest('.approach-card');
      if (approachCard && this.currentRoute !== 'approach') {
        this.navigateTo('approach');
      }

      // Apply Job click — open the application modal
      const applyBtn = e.target.closest('[data-action="apply-job"]');
      if (applyBtn) {
        e.preventDefault();
        const jobId = applyBtn.getAttribute('data-job-id');
        const job = (this.data.jobs || []).find(j => j.id === jobId);
        if (job) {
          this.openJobApplicationModal(job);
        }
      }

      // Newsletter link click in footer
      const newsletterLink = e.target.closest('a[href="/newsletter"], a[href="#newsletter"]');
      if (newsletterLink) {
        e.preventDefault();
        const box = document.querySelector('.newsletter-box');
        if (box) {
          box.scrollIntoView({ behavior: 'smooth' });
          const inp = box.querySelector('input');
          if (inp) inp.focus();
        }
      }
    });
  },

  // 14. Job Application Modal
  openJobApplicationModal(job) {
    const modal = document.getElementById('jobApplicationModal');
    const titleEl = document.getElementById('jobApplicationTitle');
    const metaEl = document.getElementById('jobApplicationMeta');
    const jobIdInput = document.getElementById('jobAppJobId');
    const form = document.getElementById('jobApplicationForm');
    const successBox = document.getElementById('jobAppSuccess');
    const errorBox = document.getElementById('jobAppError');

    if (!modal) return;

    // Populate job info
    if (titleEl) titleEl.textContent = job.title;
    if (metaEl) metaEl.textContent = `${job.type} · ${job.location}`;
    if (jobIdInput) jobIdInput.value = job.id;

    // Reset form state
    if (form) {
      form.reset();
      form.style.display = '';
    }
    if (successBox) successBox.style.display = 'none';
    if (errorBox) errorBox.style.display = 'none';

    // Open modal
    modal.classList.add('is-active');
    document.body.style.overflow = 'hidden';
  },

  initJobApplicationModal() {
    const modal = document.getElementById('jobApplicationModal');
    const closeBtn = document.getElementById('closeJobApplicationBtn');
    const form = document.getElementById('jobApplicationForm');
    const successBox = document.getElementById('jobAppSuccess');
    const errorBox = document.getElementById('jobAppError');

    const closeModal = () => {
      if (modal) {
        modal.classList.remove('is-active');
        document.body.style.overflow = '';
      }
    };

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (modal) modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const jobId = document.getElementById('jobAppJobId')?.value;
        const name = document.getElementById('jobAppName')?.value?.trim();
        const email = document.getElementById('jobAppEmail')?.value?.trim();
        const phone = document.getElementById('jobAppPhone')?.value?.trim();
        const message = document.getElementById('jobAppMessage')?.value?.trim();

        if (errorBox) errorBox.style.display = 'none';

        if (!name || !email) {
          if (errorBox) {
            errorBox.querySelector('p').textContent = 'Ad və e-poçt sahələri mütləq doldurulmalıdır.';
            errorBox.style.display = 'block';
          }
          return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          if (errorBox) {
            errorBox.querySelector('p').textContent = 'Düzgün e-poçt ünvanı daxil edin.';
            errorBox.style.display = 'block';
          }
          return;
        }

        // File validation
        const fileInput = document.getElementById('jobAppCv');
        const cvFile = fileInput?.files?.[0];
        if (!cvFile) {
          if (errorBox) {
            errorBox.querySelector('p').textContent = 'CV faylı mütləq yüklənməlidir.';
            errorBox.style.display = 'block';
          }
          return;
        }

        const allowedExts = ['pdf', 'doc', 'docx'];
        const ext = cvFile.name.split('.').pop().toLowerCase();
        if (!allowedExts.includes(ext)) {
          if (errorBox) {
            errorBox.querySelector('p').textContent = 'Yalnız PDF, DOC və DOCX formatında olan fayllar qəbul edilir.';
            errorBox.style.display = 'block';
          }
          return;
        }

        if (cvFile.size > 10 * 1024 * 1024) {
          if (errorBox) {
            errorBox.querySelector('p').textContent = 'Faylın ölçüsü maksimum 10 MB ola bilər.';
            errorBox.style.display = 'block';
          }
          return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Göndərilir...</span>';

        const formData = new FormData();
        formData.append('jobId', jobId);
        formData.append('name', name);
        formData.append('email', email);
        formData.append('phone', phone || '');
        formData.append('message', message || '');
        formData.append('cv', cvFile);

        try {
          await BrandfullStore.createApplication(formData);
          form.style.display = 'none';
          if (successBox) successBox.style.display = 'block';
        } catch (err) {
          console.error(err);
          if (errorBox) {
            errorBox.querySelector('p').textContent = 'Müraciət göndərilərkən xəta baş verdi: ' + err.message;
            errorBox.style.display = 'block';
          }
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalText;
        }
      });
    }
  },

  // 15. Cookie Consent Floating Banner (Screenshot Replica)
  initCookieConsent() {
    const banner = document.getElementById('cookieConsentBanner');
    const settingsModal = document.getElementById('cookieSettingsModal');
    const btnAccept = document.getElementById('btnCookieAccept');
    const btnReject = document.getElementById('btnCookieReject');
    const btnClose = document.getElementById('btnCookieClose');
    const btnSettings = document.getElementById('btnCookieSettings');
    const btnCloseSettings = document.getElementById('closeCookieSettingsBtn');
    const btnSaveSettings = document.getElementById('btnSaveCookieSettings');
    const btnAcceptAllInModal = document.getElementById('btnAcceptAllInModal');

    if (!banner) return;

    // Show banner after 0.5s delay
    setTimeout(() => {
      banner.classList.add('is-visible');
    }, 600);

    const closeBanner = () => {
      banner.classList.remove('is-visible');
    };

    if (btnAccept) {
      btnAccept.addEventListener('click', () => {
        localStorage.setItem('BRANDFULL_COOKIE_CONSENT', 'all');
        closeBanner();
      });
    }

    if (btnReject) {
      btnReject.addEventListener('click', () => {
        localStorage.setItem('BRANDFULL_COOKIE_CONSENT', 'rejected');
        closeBanner();
      });
    }

    if (btnClose) {
      btnClose.addEventListener('click', () => {
        closeBanner();
      });
    }

    if (btnSettings) {
      btnSettings.addEventListener('click', () => {
        if (settingsModal) {
          settingsModal.classList.add('is-active');
          document.body.style.overflow = 'hidden';
        }
      });
    }

    if (btnCloseSettings) {
      btnCloseSettings.addEventListener('click', () => {
        if (settingsModal) {
          settingsModal.classList.remove('is-active');
          document.body.style.overflow = '';
        }
      });
    }

    if (btnSaveSettings) {
      btnSaveSettings.addEventListener('click', () => {
        localStorage.setItem('BRANDFULL_COOKIE_CONSENT', 'custom');
        if (settingsModal) {
          settingsModal.classList.remove('is-active');
          document.body.style.overflow = '';
        }
        closeBanner();
      });
    }

    if (btnAcceptAllInModal) {
      btnAcceptAllInModal.addEventListener('click', () => {
        localStorage.setItem('BRANDFULL_COOKIE_CONSENT', 'all');
        if (settingsModal) {
          settingsModal.classList.remove('is-active');
          document.body.style.overflow = '';
        }
        closeBanner();
      });
    }
  },
  // 16. Dynamic Greeting based on Day of Week
  initDynamicGreeting() {
    const greetingEl = document.getElementById("dynamic-greeting-text");
    if (!greetingEl) return;

    const bakuDate = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Baku"}));
    const day = bakuDate.getDay();
    let text = "";

    switch (day) {
      case 0: // Sunday
        text = "Sunday scaries? Maraqlı insanlar onlayndır.";
        break;
      case 1: // Monday
        text = "Bazar ertəsi motivasiyası. Biznesinizi gələcəyə daşımağa hazırıq.";
        break;
      case 2: // Tuesday
        text = "Məhsuldar çərşənbə axşamı. Gəlin möhtəşəm bir şeylər yaradaq.";
        break;
      case 3: // Wednesday
        text = "Həftənin ortası. İnnovasiyalar üçün ən yaxşı vaxt.";
        break;
      case 4: // Thursday
        text = "Cümə axşamı ilhamı. Sürəti kəsmədən irəliləyirik.";
        break;
      case 5: // Friday
        text = "Gözəl bir cümə günü. Həftəni uğurla yekunlaşdırmağa hazırıq.";
        break;
      case 6: // Saturday
        text = "Şənbə günü işləyirsiniz? Hörmətlər. Maraqlı insanlar onlayndır.";
        break;
    }

    greetingEl.innerText = text;
  }
};

if (typeof window !== 'undefined') {
  window.App = App;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    App.init();
  });
} else {
  App.init();
}

