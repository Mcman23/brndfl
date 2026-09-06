
(() => {
  /* ==========================================================================
     BRANDFULL CMS 2.0 CONTROL ENGINE
     ========================================================================== */

  const isLocal = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1');
  const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port !== '5000' ? 'http://localhost:5000/api' : (window.location.protocol === 'file:' ? 'http://localhost:5000/api' : '/api');

  // Intercept fetch to automatically include credentials for local server session persistence
  const nativeFetch = window.fetch;
  window.fetch = (url, options = {}) => {
    if (url.toString().startsWith(API_BASE)) {
      options.credentials = 'include';
    }
    return nativeFetch(url, options);
  };

  
  const api = {
    async request(endpoint, method = 'GET', body = null) {
      const options = {
        method,
        headers: {
          'Accept': 'application/json'
        },
      };
      if (body) {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
      }
      if (AdminApp && AdminApp.token) {
        options.headers['Authorization'] = `Bearer ${AdminApp.token}`;
      }
      try {
        const res = await fetch(`${API_BASE}${endpoint}`, options);
        let data = null;
        try {
          data = await res.json();
        } catch(e) {}
        
        if (!res.ok) {
          if (res.status === 401) {
            AdminApp.handleLogout(true);
            throw new Error('Sessiya mГјddЙ™ti bitib. YenidЙ™n daxil olun.');
          }
          if (res.status === 403) {
            throw new Error('Bu Й™mЙ™liyyat ГјГ§Гјn icazЙ™niz yoxdur.');
          }
          throw new Error((data && data.error) ? data.error : 'Sistem xЙ™tasД± baЕџ verdi.');
        }
        return data;
      } catch (err) {
        AdminApp.showToast(err.message || 'ЕћЙ™bЙ™kЙ™ xЙ™tasД±.', true);
        throw err;
      }
    },
    get(endpoint) { return this.request(endpoint, 'GET'); },
    post(endpoint, body) { return this.request(endpoint, 'POST', body); },
    put(endpoint, body) { return this.request(endpoint, 'PUT', body); },
    patch(endpoint, body) { return this.request(endpoint, 'PATCH', body); },
    delete(endpoint) { return this.request(endpoint, 'DELETE'); }
  };

  const AdminApp = {

    /* --- AI ASSISTANT --- */
    aiEntity: null,
    aiResultData: null,

    openAIAssistant(entity, defaultAction = 'generate') {
      document.getElementById('aiActionSelect').value = defaultAction;
      const selectGroup = document.getElementById('aiActionSelect').parentElement;
      if (defaultAction === 'generate') {
          selectGroup.style.display = 'none';
          document.getElementById('aiInstructionLabel').textContent = 'MЙ™sЙ™lЙ™n: LayihЙ™nin nЙ™ olduДџunu, hansД± mГјЕџtЙ™ri ГјГ§Гјn hazД±rlandД±ДџД±nД±, Й™sas problemi vЙ™ gГ¶rГјlЙ™n iЕџi qД±sa ЕџЙ™kildЙ™ yazД±n.';
      } else {
          selectGroup.style.display = 'block';
          document.getElementById('aiInstructionLabel').textContent = 'XГјsusi TЙ™limat (Opsional)';
      }

      this.aiEntity = entity;
      this.aiResultData = null;
      document.getElementById('aiActionSelect').value = 'improve';
      document.getElementById('aiInstructionInput').value = '';
      document.getElementById('aiConfigSection').style.display = 'block';
      document.getElementById('aiLoadingSection').style.display = 'none';
      document.getElementById('aiResultSection').style.display = 'none';
      document.getElementById('aiResultFields').innerHTML = '';
      this.openModal('aiAssistantModal');
    },

    async runAIGeneration() {
      const action = document.getElementById('aiActionSelect').value;
      const instruction = document.getElementById('aiInstructionInput').value;
      
      let context = {};
      if (this.aiEntity === 'project') {
        context = {
          title: document.getElementById('projTitle').value,
          category: document.getElementById('projCategory').value,
          tag: document.getElementById('projTag').value,
          year: document.getElementById('projYear').value,
          headline: document.getElementById('projHeadline').value,
          overview: document.getElementById('projOverview').value,
          challenge: document.getElementById('projChallenge').value,
          solution: document.getElementById('projSolution').value,
          metaTitle: document.getElementById('projMetaTitle').value,
          metaDesc: document.getElementById('projMetaDesc').value,
          slug: document.getElementById('projSlug').value
        };
      } else if (this.aiEntity === 'solution') {
        context = {
          title: document.getElementById('solTitle').value,
          tagline: document.getElementById('solTagline').value,
          desc: document.getElementById('solDesc').value,
          cta: document.getElementById('solCta').value,
          metaTitle: document.getElementById('solMetaTitle').value,
          metaDesc: document.getElementById('solMetaDesc').value,
          slug: document.getElementById('solSlug').value
        };
      } else if (this.aiEntity === 'article') {
        context = {
          title: document.getElementById('artTitle').value,
          tag: document.getElementById('artTag').value,
          author: document.getElementById('artAuthor').value,
          excerpt: document.getElementById('artExcerpt').value,
          content: document.getElementById('artContent').value,
          metaTitle: document.getElementById('artMetaTitle').value,
          metaDesc: document.getElementById('artMetaDesc').value,
          slug: document.getElementById('artSlug').value
        };
      } else if (this.aiEntity === 'job') {
        context = {
          title: document.getElementById('jobTitle').value,
          type: document.getElementById('jobType').value,
          location: document.getElementById('jobLocation').value,
          department: document.getElementById('jobDepartment').value,
          description: document.getElementById('jobDescription').value
        };
      }

      document.getElementById('aiConfigSection').style.display = 'none';
      document.getElementById('aiLoadingSection').style.display = 'block';
      document.getElementById('aiResultSection').style.display = 'none';

      try {
        const res = await fetch(`${API_BASE}/admin/ai/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entity: this.aiEntity, action, context, instruction })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error?.message || 'AI xЙ™tasД±');

        this.aiResultData = data.data;
        this.renderAIResult();
      } catch (err) {
        this.showToast(err.message, 'error');
        document.getElementById('aiConfigSection').style.display = 'block';
      } finally {
        document.getElementById('aiLoadingSection').style.display = 'none';
      }
    },

    
    renderAIResult() {
      const container = document.getElementById('aiResultFields');
      container.innerHTML = '';
      if (!this.aiResultData) return;

      for (const [key, value] of Object.entries(this.aiResultData)) {
        if (value) {
          const div = document.createElement('div');
          const labels = {
            title: 'BaЕџlД±q',
            category: 'Kateqoriya',
            tag: 'Etiket',
            year: 'Д°l',
            headline: 'QД±sa BaЕџlД±q (Headline)',
            overview: 'Гњmumi BaxД±Еџ (Overview)',
            challenge: 'Problemin TЙ™sviri (Challenge)',
            solution: 'HЙ™ll Yolu (Solution)',
            metaTitle: 'SEO BaЕџlД±ДџД±',
            metaDesc: 'SEO AГ§Д±qlamasД±',
            slug: 'URL AГ§arД± (Slug)',
            tagline: 'Sloqan',
            desc: 'AГ§Д±qlama',
            cta: 'HЙ™rЙ™kЙ™tЙ™ Г‡aДџД±rД±Еџ (CTA)',
            author: 'MГјЙ™llif',
            excerpt: 'QД±sa MЙ™zmun',
            content: 'ЖЏsas MЙ™zmun',
            type: 'Д°Еџ NГ¶vГј',
            location: 'Lokasiya',
            department: 'Departament',
            description: 'Vakansiya TЙ™sviri'
          };
          const displayLabel = labels[key] || key;

          div.style.display = 'flex';
          div.style.gap = '0.5rem';
          div.style.alignItems = 'flex-start';
          
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.checked = true;
          checkbox.value = key;
          checkbox.className = 'ai-apply-checkbox';
          checkbox.style.marginTop = '0.25rem';
          checkbox.style.cursor = 'pointer';

          const contentDiv = document.createElement('div');
          contentDiv.style.flex = '1';
          contentDiv.innerHTML = `
            <div style="font-size:0.85rem; font-weight:600; text-transform:uppercase; color:var(--adm-text-muted); margin-bottom:0.25rem; cursor:pointer;" onclick="this.parentElement.previousSibling.click()">${displayLabel}</div>
            <div style="padding:0.75rem; background:var(--adm-bg); border:1px solid var(--adm-border); border-radius:6px; font-size:0.95rem;">${value}</div>
          `;
          
          div.appendChild(checkbox);
          div.appendChild(contentDiv);
          container.appendChild(div);
        }
      }
      document.getElementById('aiResultSection').style.display = 'block';
    },

    applyAIResult() {
      if (!this.aiResultData) return;
      
      const checkboxes = document.querySelectorAll('.ai-apply-checkbox:checked');
      const selectedKeys = Array.from(checkboxes).map(cb => cb.value);
      
      const applyField = (aiKey, inputId) => {
        if (selectedKeys.includes(aiKey) && this.aiResultData[aiKey] !== undefined) {
          document.getElementById(inputId).value = this.aiResultData[aiKey];
        }
      };

      if (this.aiEntity === 'project') {
        applyField('title', 'projTitle');
        applyField('category', 'projCategory');
        applyField('tag', 'projTag');
        applyField('year', 'projYear');
        applyField('headline', 'projHeadline');
        applyField('overview', 'projOverview');
        applyField('challenge', 'projChallenge');
        applyField('solution', 'projSolution');
        applyField('metaTitle', 'projMetaTitle');
        applyField('metaDesc', 'projMetaDesc');
        applyField('slug', 'projSlug');
      } else if (this.aiEntity === 'solution') {
        applyField('title', 'solTitle');
        applyField('tagline', 'solTagline');
        applyField('desc', 'solDesc');
        applyField('cta', 'solCta');
        applyField('metaTitle', 'solMetaTitle');
        applyField('metaDesc', 'solMetaDesc');
        applyField('slug', 'solSlug');
      } else if (this.aiEntity === 'article') {
        applyField('title', 'artTitle');
        applyField('tag', 'artTag');
        applyField('author', 'artAuthor');
        applyField('excerpt', 'artExcerpt');
        applyField('content', 'artContent');
        applyField('metaTitle', 'artMetaTitle');
        applyField('metaDesc', 'artMetaDesc');
        applyField('slug', 'artSlug');
      } else if (this.aiEntity === 'job') {
        applyField('title', 'jobTitle');
        applyField('type', 'jobType');
        applyField('location', 'jobLocation');
        applyField('department', 'jobDepartment');
        applyField('description', 'jobDescription');
      }

      this.showToast('SeГ§ilmiЕџ AI mЙ™zmun formaya tЙ™tbiq edildi.', 'success');
      this.closeModal('aiAssistantModal');
    },


    currentTab: 'jobs',
    user: null,
    cache: {
      projects: [],
      clients: [],
      media: [],
      solutions: [],
      articles: [],
      jobs: [],
      inquiries: [],
      subscribers: [],
      users: [],
      auditLogs: [],
      applications: []
    },

    // Temporary states
    tempGallery: [],
    mediaPickerTargetField: null, // Keeps track of which input field gets the chosen media URL
    deleteCallback: null,

    async init() {
        

      this.bindEvents();

      // Listen for visual editor messages
      window.addEventListener('message', (e) => {
        if (e.data && e.data.type === 'SAVE_I18N') {
           this.handleVisualEditSave(e.data.key, e.data.text);
        }
      });

      await this.checkAuth();
    },

    // 1. Authentication
    async checkAuth() {
      const loginWrap = document.getElementById('adminLoginWrap');
      const adminLayout = document.getElementById('adminLayout');

      try {
        const res = await fetch(`${API_BASE}/auth/me`, { headers: { 'Accept': 'application/json' } });
        const json = await res.json();

        if (json.success && json.data) {
          this.user = json.data;
          if (loginWrap) loginWrap.style.display = 'none';
          if (adminLayout) adminLayout.style.display = 'flex';
          
          const usersTab = document.getElementById('sidebarUsersTab');
          if (usersTab) {
            usersTab.style.display = this.user.role === 'SUPER_ADMIN' ? 'block' : 'none';
          }

          this.switchTab(this.currentTab);
        } else {
          throw new Error('Unauthenticated');
        }
      } catch (err) {
        this.user = null;
        if (loginWrap) loginWrap.style.display = 'flex';
        if (adminLayout) adminLayout.style.display = 'none';
      }
    },

    async handleLogin(email, password) {
      try {
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const json = await res.json();

        if (json.success && json.data) {
          this.showToast('UДџurla daxil oldunuz! рџљЂ');
          await this.checkAuth();
        } else {
          alert(json.error?.message || 'E-poГ§t vЙ™ ya ЕџifrЙ™ yanlД±ЕџdД±r.');
        }
      } catch (err) {
        console.error(err);
        alert('Sistem xЙ™tasД± baЕџ verdi.');
      }
    },

    // --- PHASE 5: SETTINGS & JSON BUILDER --- //
    settingsOffices: [],
    settingsFooterLinks: [],

    switchSettingsTab(tabName) {
      document.querySelectorAll('.adm-settings-nav-btn').forEach(btn => btn.classList.remove('active'));
      document.querySelector(`[data-settings-tab="${tabName}"]`)?.classList.add('active');
      document.querySelectorAll('.adm-settings-pane').forEach(pane => pane.classList.remove('active'));
      document.getElementById(`settings-pane-${tabName}`)?.classList.add('active');
    },

    // Offices
    addOfficeItem() {
      this.settingsOffices.push({ name: '', address: '', phone: '', mapUrl: '' });
      this.renderOfficesList();
    },
    removeOfficeItem(idx) {
      this.settingsOffices.splice(idx, 1);
      this.renderOfficesList();
    },
    updateOfficeItem(idx, field, value) {
      if(this.settingsOffices[idx]) {
        this.settingsOffices[idx][field] = value;
      }
    },
    renderOfficesList() {
      const container = document.getElementById('officesList');
      if(!container) return;
      container.innerHTML = '';
      if(this.settingsOffices.length === 0) {
        container.innerHTML = '<div style="color:var(--adm-text-muted); font-size:0.9rem;">HeГ§ bir ofis Й™lavЙ™ edilmЙ™yib.</div>';
        return;
      }
      this.settingsOffices.forEach((office, i) => {
        const item = document.createElement('div');
        item.className = 'adm-json-item';
        item.innerHTML = `
          <div class="adm-json-item-header">
            <span>Ofis #${i+1}</span>
            <button type="button" class="adm-json-remove-btn" onclick="AdminApp.removeOfficeItem(${i})">Sil</button>
          </div>
          <div class="adm-form-group" style="margin-bottom:0.5rem;">
            <label style="font-size:0.75rem;">Ad (mЙ™s: BaЕџ Ofis, BakД±)</label>
            <input type="text" class="adm-input" value="${this.escapeHTML(office.name || '')}" onchange="AdminApp.updateOfficeItem(${i}, 'name', this.value)">
          </div>
          <div class="adm-form-group" style="margin-bottom:0.5rem;">
            <label style="font-size:0.75rem;">Гњnvan</label>
            <input type="text" class="adm-input" value="${this.escapeHTML(office.address || '')}" onchange="AdminApp.updateOfficeItem(${i}, 'address', this.value)">
          </div>
          <div style="display:flex; gap:1rem;">
            <div class="adm-form-group" style="flex:1; margin-bottom:0;">
              <label style="font-size:0.75rem;">Telefon</label>
              <input type="text" class="adm-input" value="${this.escapeHTML(office.phone || '')}" onchange="AdminApp.updateOfficeItem(${i}, 'phone', this.value)">
            </div>
            <div class="adm-form-group" style="flex:1; margin-bottom:0;">
              <label style="font-size:0.75rem;">Google Maps URL (Д°stЙ™yЙ™ baДџlД±)</label>
              <input type="text" class="adm-input" value="${this.escapeHTML(office.mapUrl || '')}" onchange="AdminApp.updateOfficeItem(${i}, 'mapUrl', this.value)">
            </div>
          </div>
        `;
        container.appendChild(item);
      });
    },

    // Footer Links
    addFooterLinkItem() {
      this.settingsFooterLinks.push({ label: '', url: '' });
      this.renderFooterLinksList();
    },
    removeFooterLinkItem(idx) {
      this.settingsFooterLinks.splice(idx, 1);
      this.renderFooterLinksList();
    },
    updateFooterLinkItem(idx, field, value) {
      if(this.settingsFooterLinks[idx]) {
        this.settingsFooterLinks[idx][field] = value;
      }
    },
    renderFooterLinksList() {
      const container = document.getElementById('footerLinksList');
      if(!container) return;
      container.innerHTML = '';
      if(this.settingsFooterLinks.length === 0) {
        container.innerHTML = '<div style="color:var(--adm-text-muted); font-size:0.9rem;">HeГ§ bir link Й™lavЙ™ edilmЙ™yib.</div>';
        return;
      }
      this.settingsFooterLinks.forEach((link, i) => {
        const item = document.createElement('div');
        item.className = 'adm-json-item';
        item.innerHTML = `
          <div class="adm-json-item-header">
            <span>Link #${i+1}</span>
            <button type="button" class="adm-json-remove-btn" onclick="AdminApp.removeFooterLinkItem(${i})">Sil</button>
          </div>
          <div style="display:flex; gap:1rem;">
            <div class="adm-form-group" style="flex:1; margin-bottom:0;">
              <label style="font-size:0.75rem;">Label (MЙ™tn)</label>
              <input type="text" class="adm-input" value="${this.escapeHTML(link.label || '')}" onchange="AdminApp.updateFooterLinkItem(${i}, 'label', this.value)">
            </div>
            <div class="adm-form-group" style="flex:1; margin-bottom:0;">
              <label style="font-size:0.75rem;">URL</label>
              <input type="text" class="adm-input" value="${this.escapeHTML(link.url || '')}" onchange="AdminApp.updateFooterLinkItem(${i}, 'url', this.value)">
            </div>
          </div>
        `;
        container.appendChild(item);
      });
    },

    
    // --- PHASE 6: CLIENTS CMS --- //
    clients: [],
    clientFilters: { search: '', status: 'all', logo: 'all', sort: 'newest' },
    
    filterClients() {
      this.clientFilters.search = document.getElementById('clientSearch')?.value.toLowerCase() || '';
      this.clientFilters.status = document.getElementById('clientStatusFilter')?.value || 'all';
      this.clientFilters.logo = document.getElementById('clientLogoFilter')?.value || 'all';
      this.clientFilters.sort = document.getElementById('clientSort')?.value || 'newest';
      this.renderClientsGrid();
    },
    
    renderClientsGrid() {
      const grid = document.getElementById('clientsGrid');
      if (!grid) return;
      
      let filtered = this.clients.filter(client => {
        const matchSearch = client.name.toLowerCase().includes(this.clientFilters.search);
        
        let matchStatus = true;
        if (this.clientFilters.status === 'active') matchStatus = client.active === true;
        if (this.clientFilters.status === 'inactive') matchStatus = client.active === false;
        
        let matchLogo = true;
        if (this.clientFilters.logo === 'has_logo') matchLogo = !!client.logoUrl;
        if (this.clientFilters.logo === 'no_logo') matchLogo = !client.logoUrl;
        
        return matchSearch && matchStatus && matchLogo;
      });
      
      filtered.sort((a, b) => {
        if (this.clientFilters.sort === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
        if (this.clientFilters.sort === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
        if (this.clientFilters.sort === 'az') return a.name.localeCompare(b.name);
        if (this.clientFilters.sort === 'za') return b.name.localeCompare(a.name);
        return 0;
      });
      
      if (filtered.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; padding: 3rem; text-align: center; color: var(--adm-text-muted); background: var(--adm-card); border-radius: var(--adm-radius); border: 1px dashed var(--adm-border);">NЙ™ticЙ™ tapД±lmadД±.</div>`;
        return;
      }
      
      grid.innerHTML = filtered.map(client => `
        <div class="adm-client-card">
          <div class="adm-client-logo-wrap">
            ${client.logoUrl ? `<img src="${client.logoUrl}" alt="${this.escapeHTML(client.name)}">` : `<div class="adm-client-logo-placeholder"><span>No Logo</span></div>`}
          </div>
          <div class="adm-client-info">
            <h4 class="adm-client-name">${this.escapeHTML(client.name)}</h4>
            <div class="adm-client-meta">
              <div class="adm-client-meta-row">
                <span>Status:</span>
                <span class="adm-badge" style="background:${client.active ? 'rgba(52,199,89,0.1); color:var(--adm-success);' : 'rgba(142,142,147,0.1); color:var(--adm-text);'}">${client.active ? 'Aktiv' : 'Passiv'}</span>
              </div>
              <div class="adm-client-meta-row">
                <span>LayihЙ™lЙ™r:</span>
                <span>${client._count?.projects || 0}</span>
              </div>
            </div>
          </div>
          <div class="adm-client-actions">
            <button class="adm-client-action-btn" onclick="AdminApp.openClientModal('${client.id}')">RedaktЙ™ Et</button>
            <button class="adm-client-action-btn delete" onclick="AdminApp.confirmDelete('client', '${client.id}')">Sil</button>
          </div>
        </div>
      `).join('');
    },
    
    openClientModal(id = null) {
      document.getElementById('clientForm').reset();
      this.clearClientLogo();
      document.getElementById('clientRelatedProjectsBox').style.display = 'none';
      
      if (id) {
        const client = this.clients.find(c => c.id === id);
        if (client) {
          document.getElementById('clientModalTitle').textContent = 'MГјЕџtЙ™ri RedaktЙ™si';
          document.getElementById('clientId').value = client.id;
          document.getElementById('clientName').value = client.name || '';
          document.getElementById('clientWebsite').value = client.websiteUrl || '';
          document.getElementById('clientDesc').value = client.description || '';
          document.getElementById('clientActive').checked = client.active !== false;
          
          if (client.logoUrl) {
            document.getElementById('clientLogoUrl').value = client.logoUrl;
            document.getElementById('clientLogoPreviewBox').innerHTML = `<img src="${client.logoUrl}" style="max-height:100px; max-width:100%; object-fit:contain;" />`;
            document.getElementById('clientLogoRemoveBtn').style.display = 'inline-block';
          }
          
          document.getElementById('clientRelatedProjectsBox').style.display = 'block';
          document.getElementById('clientProjectsCount').textContent = `${client._count?.projects || 0} layihЙ™`;
        }
      } else {
        document.getElementById('clientModalTitle').textContent = 'Yeni MГјЕџtЙ™ri';
        document.getElementById('clientId').value = '';
        document.getElementById('clientActive').checked = true;
      }
      
      document.getElementById('clientModal').classList.add('is-active');
    },
    
    removeClientLogo() {
      document.getElementById('clientLogoUrl').value = '';
      this.clearClientLogo();
    },
    
    clearClientLogo() {
      document.getElementById('clientLogoPreviewBox').innerHTML = '<span style="color:var(--adm-text-muted); font-size:0.9rem;">Bu mГјЕџtЙ™ri ГјГ§Гјn logo seГ§ilmЙ™yib.</span>';
      document.getElementById('clientLogoRemoveBtn').style.display = 'none';
    },

    
    // --- PHASE 7: INQUIRIES & APPLICATIONS CRM --- //
    
    // INQUIRIES
    inquiries: [],
    inquiryFilters: { search: '', status: 'all', priority: 'all', sort: 'newest' },
    adminUsersList: [],
    
    async loadAdminUsers() {
      try {
        const res = await fetch(`${API_BASE}/admin/users`, { headers: { 'Authorization': `Bearer ${this.token}` } });
        const json = await res.json();
        if (json.success) {
          this.adminUsersList = json.data;
          const select = document.getElementById('inqAssigneeInput');
          if (select) {
            select.innerHTML = '<option value="">-- TЙ™yin edilmЙ™yib --</option>' + this.adminUsersList.map(u => `<option value="${u.id}">${this.escapeHTML(u.name)} (${this.escapeHTML(u.email)})</option>`).join('');
          }
        }
      } catch (err) {
        console.error('Admins load error:', err);
      }
    },
    
    filterInquiries() {
      this.inquiryFilters.search = document.getElementById('inquirySearch')?.value.toLowerCase() || '';
      this.inquiryFilters.status = document.getElementById('inquiryStatusFilter')?.value || 'all';
      this.inquiryFilters.priority = document.getElementById('inquiryPriorityFilter')?.value || 'all';
      this.inquiryFilters.sort = document.getElementById('inquirySort')?.value || 'newest';
      this.renderInquiriesTable();
    },
    
    renderInquiriesTable() {
      const tbody = document.getElementById('inquiriesList');
      if (!tbody) return;
      
      let filtered = this.inquiries.filter(inq => {
        const searchStr = `${inq.name} ${inq.email} ${inq.phone || ''} ${inq.subject || inq.service || ''} ${inq.message || ''}`.toLowerCase();
        const matchSearch = searchStr.includes(this.inquiryFilters.search);
        const matchStatus = this.inquiryFilters.status === 'all' || inq.status === this.inquiryFilters.status;
        const matchPriority = this.inquiryFilters.priority === 'all' || inq.priority === this.inquiryFilters.priority;
        return matchSearch && matchStatus && matchPriority;
      });
      
      filtered.sort((a, b) => {
        if (this.inquiryFilters.sort === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
        return new Date(a.createdAt) - new Date(b.createdAt);
      });
      
      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 2rem;">AxtarД±ЕџД±nД±za uyДџun nЙ™ticЙ™ tapД±lmadД±.</td></tr>`;
        return;
      }
      
      const statusMap = { 'NEW': 'Yeni', 'IN_PROGRESS': 'BaxД±lД±r', 'CONTACTED': 'CavablandД±rД±lД±b', 'CLOSED': 'BaДџlanД±b' };
      const statusColor = { 'NEW': 'var(--adm-primary)', 'IN_PROGRESS': 'var(--adm-warning)', 'CONTACTED': 'var(--adm-cyan)', 'CLOSED': 'var(--adm-text-muted)' };
      const priorityColor = { 'Low': 'gray', 'Normal': 'var(--adm-success)', 'High': 'var(--adm-warning)', 'Urgent': 'var(--adm-danger)' };
      
      tbody.innerHTML = filtered.map(inq => `
        <tr>
          <td>
            <strong>${this.escapeHTML(inq.name)}</strong><br/>
            <small style="color:var(--adm-text-muted)">${this.escapeHTML(inq.company || '-')}</small>
          </td>
          <td>
            <a href="mailto:${this.escapeHTML(inq.email)}">${this.escapeHTML(inq.email)}</a><br/>
            <small>${this.escapeHTML(inq.phone || '-')}</small>
          </td>
          <td>${this.escapeHTML(inq.service || '-')}</td>
          <td><span class="adm-badge" style="background:transparent; border:1px solid ${statusColor[inq.status]}; color:${statusColor[inq.status]}">${statusMap[inq.status] || inq.status}</span></td>
          <td><span class="adm-badge" style="background:transparent; border:1px solid ${priorityColor[inq.priority || 'Normal']}; color:${priorityColor[inq.priority || 'Normal']}">${inq.priority || 'Normal'}</span></td>
          <td>${new Date(inq.createdAt).toLocaleDateString('az-AZ')}</td>
          <td>${this.getAdminName(inq.assignedTo) || '-'}</td>
          <td>
            <button class="adm-btn adm-btn-secondary" style="padding:0.25rem 0.5rem; font-size:0.75rem;" onclick="AdminApp.openInquiryModal('${inq.id}')">Bax</button>
          </td>
        </tr>
      `).join('');
    },
    
    getAdminName(id) {
      if(!id) return '';
      const u = this.adminUsersList.find(x => x.id === id);
      return u ? u.name : id;
    },
    
    openInquiryModal(id) {
      const inq = this.inquiries.find(x => x.id === id);
      if(!inq) return;
      document.getElementById('inqId').value = inq.id;
      document.querySelector('.inqName').textContent = inq.name;
      document.querySelector('.inqEmail').textContent = inq.email;
      document.querySelector('.inqPhone').textContent = inq.phone || '-';
      document.querySelector('.inqCompany').textContent = inq.company || '-';
      document.querySelector('.inqDate').textContent = new Date(inq.createdAt).toLocaleString('az-AZ');
      document.getElementById('inqSubject').textContent = inq.service || '-';
      document.querySelector('.inqMessage').textContent = inq.message || '-';
      
      document.getElementById('inqStatusInput').value = inq.status || 'NEW';
      document.getElementById('inqPriorityInput').value = inq.priority || 'Normal';
      document.getElementById('inqAssigneeInput').value = inq.assignedTo || '';
      document.getElementById('inqNoteInput').value = inq.internalNote || '';
      
      document.getElementById('inquiryModal').classList.add('is-active');
    },
    
    async saveInquiry() {
      const btn = document.getElementById('saveInqBtn');
      if(btn) btn.disabled = true;
      const id = document.getElementById('inqId').value;
      const data = {
        status: document.getElementById('inqStatusInput').value,
        priority: document.getElementById('inqPriorityInput').value,
        assignedTo: document.getElementById('inqAssigneeInput').value || null,
        internalNote: document.getElementById('inqNoteInput').value
      };
      try {
        const res = await fetch(`${API_BASE}/admin/inquiries/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.token}` },
          body: JSON.stringify(data)
        });
        const json = await res.json();
        if(json.success) {
          this.showToast('SorДџu yenilЙ™ndi');
          this.closeModal('inquiryModal');
          this.renderInquiries();
        } else {
          this.showToast(json.error?.message || 'XЙ™ta', true);
        }
      } catch(e) {
        console.error(e);
        this.showToast('Server xЙ™tasД±', true);
      } finally {
        if(btn) btn.disabled = false;
      }
    },
    
    deleteCurrentInquiry() {
      const id = document.getElementById('inqId').value;
      this.closeModal('inquiryModal');
      this.confirmDelete('inquiry', id);
    },
    
    // APPLICATIONS
    applications: [],
    applicationFilters: { search: '', job: 'all', status: 'all', sort: 'newest' },
    
    filterApplications() {
      this.applicationFilters.search = document.getElementById('applicationSearch')?.value.toLowerCase() || '';
      this.applicationFilters.job = document.getElementById('applicationJobFilter')?.value || 'all';
      this.applicationFilters.status = document.getElementById('applicationStatusFilter')?.value || 'all';
      this.applicationFilters.sort = document.getElementById('applicationSort')?.value || 'newest';
      this.renderApplicationsTable();
    },
    
    renderApplicationsTable() {
      const tbody = document.getElementById('applicationsList');
      if (!tbody) return;
      
      let filtered = this.applications.filter(app => {
        const searchStr = `${app.name} ${app.email} ${app.phone || ''} ${app.job?.title || ''}`.toLowerCase();
        const matchSearch = searchStr.includes(this.applicationFilters.search);
        const matchJob = this.applicationFilters.job === 'all' || app.jobId === this.applicationFilters.job;
        const matchStatus = this.applicationFilters.status === 'all' || app.status === this.applicationFilters.status;
        return matchSearch && matchJob && matchStatus;
      });
      
      filtered.sort((a, b) => {
        if (this.applicationFilters.sort === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
        return new Date(a.createdAt) - new Date(b.createdAt);
      });
      
      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 2rem;">AxtarД±ЕџД±nД±za uyДџun nЙ™ticЙ™ tapД±lmadД±.</td></tr>`;
        return;
      }
      
      const statusMap = { 'New': 'Yeni', 'Reviewing': 'BaxД±lД±r', 'Shortlisted': 'SeГ§ilib', 'Rejected': 'RЙ™dd edilib', 'Hired': 'Д°ЕџЙ™ qЙ™bul' };
      const fallbackMap = { 'Yeni': 'Yeni', 'BaxД±lД±r': 'BaxД±lД±r', 'MГјsahibЙ™': 'MГјsahibЙ™', 'RЙ™dd edilib': 'RЙ™dd edilib', 'Д°Еџ tЙ™klifi': 'Д°Еџ tЙ™klifi' };
      const statusColor = { 'New': 'var(--adm-primary)', 'Reviewing': 'var(--adm-warning)', 'Shortlisted': 'var(--adm-cyan)', 'Rejected': 'var(--adm-danger)', 'Hired': 'var(--adm-success)', 'Yeni': 'var(--adm-primary)' };
      
      tbody.innerHTML = filtered.map(app => `
        <tr>
          <td>
            <strong>${this.escapeHTML(app.name)}</strong>
          </td>
          <td>
            <a href="mailto:${this.escapeHTML(app.email)}">${this.escapeHTML(app.email)}</a><br/>
            <small>${this.escapeHTML(app.phone || '-')}</small>
          </td>
          <td>${this.escapeHTML(app.job?.title || '-')}</td>
          <td><span class="adm-badge" style="background:transparent; border:1px solid ${statusColor[app.status] || 'gray'}; color:${statusColor[app.status] || 'white'}">${statusMap[app.status] || fallbackMap[app.status] || app.status}</span></td>
          <td>${new Date(app.createdAt).toLocaleDateString('az-AZ')}</td>
          <td>
            <button class="adm-btn adm-btn-secondary" style="padding:0.25rem 0.5rem; font-size:0.75rem;" onclick="AdminApp.openApplicationModal('${app.id}')">Bax</button>
          </td>
        </tr>
      `).join('');
    },
    
    openApplicationModal(id) {
      const app = this.applications.find(x => x.id === id);
      if(!app) return;
      
      // We will store the current ID globally for the status and delete methods
      this.currentApplicationId = id;
      
      document.getElementById('appName').textContent = app.name;
      document.getElementById('appEmail').textContent = app.email;
      document.getElementById('appPhone').textContent = app.phone || '-';
      document.getElementById('appDate').textContent = new Date(app.createdAt).toLocaleString('az-AZ');
      document.getElementById('appJobTitle').textContent = app.job?.title || '-';
      document.getElementById('appMessage').textContent = app.message || '-';
      
      document.getElementById('appStatusInput').value = app.status || 'New';
      
      if(app.cvUrl) {
        document.getElementById('appDownloadCvBtn').style.display = 'inline-block';
        document.getElementById('appNoCvText').style.display = 'none';
      } else {
        document.getElementById('appDownloadCvBtn').style.display = 'none';
        document.getElementById('appNoCvText').style.display = 'inline-block';
      }
      
      document.getElementById('applicationModal').classList.add('is-active');
    },
    
    async updateApplicationStatus(newStatus) {
      if(!this.currentApplicationId) return;
      try {
        const res = await fetch(`${API_BASE}/admin/applications/${this.currentApplicationId}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.token}` },
          body: JSON.stringify({ status: newStatus })
        });
        const json = await res.json();
        if(json.success) {
          this.showToast('Status yenilЙ™ndi');
          this.renderApplications();
        } else {
          this.showToast(json.error?.message || 'XЙ™ta', true);
        }
      } catch(e) {
        console.error(e);
        this.showToast('Server xЙ™tasД±', true);
      }
    },
    
    downloadCurrentCV() {
      if(!this.currentApplicationId) return;
      const url = `${API_BASE}/admin/applications/${this.currentApplicationId}/cv`;
      
      // Creating a temporary link to download securely via token
      fetch(url, { headers: { 'Authorization': `Bearer ${this.token}` } })
        .then(response => {
          if(!response.ok) throw new Error('CV tapД±lmadД±');
          const disposition = response.headers.get('Content-Disposition');
          let filename = 'cv.pdf';
          if (disposition && disposition.indexOf('attachment') !== -1) {
            const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
            const matches = filenameRegex.exec(disposition);
            if (matches != null && matches[1]) { 
              filename = decodeURIComponent(matches[1].replace(/['"]/g, ''));
            }
          }
          return response.blob().then(blob => ({ blob, filename }));
        })
        .then(({ blob, filename }) => {
          const windowUrl = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = windowUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(windowUrl);
        })
        .catch(err => {
          console.error(err);
          this.showToast('FaylД± yГјklЙ™mЙ™k mГјmkГјn olmadД±', true);
        });
    },
    
    deleteCurrentApplication() {
      const id = this.currentApplicationId;
      this.closeModal('applicationModal');
      this.confirmDelete('application', id);
    },

    async logout() {
      try {
        await fetch(`${API_BASE}/auth/logout`, { method: 'POST' });
        this.showToast('Sessiya sonlandД±rД±ldД±.');
        await this.checkAuth();
      } catch (err) {
        console.error(err);
        this.user = null;
        location.reload();
      }
    },

    // 2. Tab switching & resources loading
    switchTab(tabId) {
      this.currentTab = tabId;
      document.querySelectorAll('.sidebar-btn').forEach(btn => {
        if (btn.getAttribute('data-tab') === tabId) {
          btn.classList.add('is-active');
        } else {
          btn.classList.remove('is-active');
        }
      });

      document.querySelectorAll('.admin-view').forEach(view => {
        view.style.display = 'none';
      });

      const activeView = document.getElementById(`view-${tabId}`);
      if (activeView) activeView.style.display = 'block';

      // Update header titles dynamically based on tab
      const pageTitle = document.getElementById('pageTitle');
      const pageSubtitle = document.getElementById('pageSubtitle');
      
      const tabMeta = {
        dashboard: { t: 'Д°cmal ', s: 'Sistem gГ¶stЙ™ricilЙ™ri vЙ™ son fЙ™aliyyЙ™tlЙ™r.' },
        projects: { t: 'LayihЙ™lЙ™r ', s: 'BГјtГјn iЕџlЙ™ri buradan yaradД±n, redaktЙ™ edin, silin vЙ™ dЙ™rc edin.' },
        clients: { t: 'MГјЕџtЙ™rilЙ™r ', s: 'BrendlЙ™rin siyahД±sД± vЙ™ loqolarД±.' },
        media: { t: 'Media KitabxanasД±', s: 'TЙ™svirlЙ™r vЙ™ vizual materiallarД±n idarЙ™ olunmasД±.' },
        solutions: { t: 'HЙ™llЙ™r & XidmЙ™tlЙ™r', s: 'StrukturlaЕџdД±rД±lmД±Еџ xidmЙ™t modullarД±.' },
        articles: { t: 'FikirlЙ™r & MЙ™qalЙ™lЙ™r', s: 'Bloq yazД±larД± vЙ™ perspektivlЙ™r.' },
        jobs: { t: 'Karyera ', s: 'Aktiv vakansiya siyahД±sД±.' },
        applications: { t: 'Д°Еџ MГјraciЙ™tlЙ™ri', s: 'Vakansiyalara daxil olan mГјraciЙ™tlЙ™r vЙ™ CV-lЙ™r.' },
        inbox: { t: 'GЙ™lЙ™n Mesajlar', s: 'MГјЕџtЙ™rilЙ™rlЙ™ birbaЕџa sorДџularД±n idarЙ™ olunmasД±.' },
        subscribers: { t: 'BГјlleten AbunЙ™Г§ilЙ™ri', s: 'Footer abunЙ™Г§ilЙ™rinin siyahД±sД±.' },
        users: { t: 'Д°nzibatГ§Д±lar', s: 'Rollar vЙ™ tЙ™hlГјkЙ™sizlik idarЙ™etmЙ™si.' },
        auditLogs: { t: 'ЖЏmЙ™liyyat FЙ™aliyyЙ™ti ', s: 'SistemdЙ™ hЙ™yata keГ§irilЙ™n bГјtГјn hЙ™rЙ™kЙ™tlЙ™rin tam arxivi.' },
        settings: { t: 'Hero & MЙ™tn TЙ™nzimlЙ™mЙ™lЙ™ri', s: 'SaytД±n ana sЙ™hifЙ™ mЙ™zmunlarД±.' },
        translations: { t: 'TЙ™rcГјmЙ™lЙ™r', s: 'BГјtГјn statik mЙ™tnlЙ™rin (frontend) idarЙ™ edilmЙ™si.' },
        preview: { t: 'CanlД± Sayt Г–nizlЙ™mЙ™si', s: 'CanlД± sinxronizasiya paneli.' }
      };

      if (tabMeta[tabId]) {
        if (pageTitle) pageTitle.textContent = tabMeta[tabId].t;
        if (pageSubtitle) pageSubtitle.textContent = tabMeta[tabId].s;
      }

      if (tabId === 'preview') {
        this.refreshPreview();
      } else {
        this.renderCurrentTab();
      }
    },

    async renderCurrentTab() {
      if (!this.user) return;
      this.updateBadges();

      try {
        switch (this.currentTab) {
          case 'dashboard':
            await this.renderDashboard();
            break;
          case 'projects':
            await this.renderProjects();
            break;
          case 'clients':
            await this.renderClients();
            break;
          case 'media':
            await this.renderMediaLibrary();
            break;
          case 'solutions':
            await this.renderSolutions();
            break;
          case 'builder':
            await this.renderBuilderBlocks();
            break;
          case 'translations':
            await this.renderTranslations();
            break;
          case 'articles':
            await this.renderArticles();
            break;
          case 'jobs':
            await this.renderJobs();
            break;
          case 'inbox':
            await this.renderInquiries();
            break;
          case 'subscribers':
            await this.renderSubscribers();
            break;
          case 'applications':
            await this.renderApplications();
            break;
          case 'users':
            await this.renderUsers();
            break;
          case 'auditLogs':
            await this.renderAuditLogs();
            break;
          case 'settings':
            await this.loadSettings();
            break;
        }
      } catch (err) {
        console.error('Tab loading error:', err);
        this.showToast('MЙ™lumatlarД±n yГјklЙ™nmЙ™sindЙ™ xЙ™ta baЕџ verdi.', true);
      }
    },

    async updateBadges() {
      try {
        const statsRes = await fetch(`${API_BASE}/admin/dashboard-stats`);
        const statsJson = await statsRes.json();
        if (statsJson.success) {
          const inboxBadge = document.getElementById('inboxBadge');
          if (inboxBadge) {
            inboxBadge.textContent = statsJson.data.inquiries;
            inboxBadge.style.display = statsJson.data.inquiries > 0 ? 'inline-block' : 'none';
          }
          const appBadge = document.getElementById('appBadge');
          if (appBadge) {
            appBadge.textContent = statsJson.data.applications;
            appBadge.style.display = statsJson.data.applications > 0 ? 'inline-block' : 'none';
          }
        }
      } catch (e) {
        console.error(e);
      }
    },


    confirmDelete(type, id) {
      this.itemToDelete = { type, id };
      document.getElementById('deleteConfirmModal').classList.add('is-active');
      document.getElementById('confirmDeleteBtn').onclick = () => this.executeDelete();
    },
    
    closeDeleteConfirmModal() {
      document.getElementById('deleteConfirmModal').classList.remove('is-active');
      this.itemToDelete = null;
    },

    async executeDelete() {
      if (!this.itemToDelete) return;
      const { type, id } = this.itemToDelete;
      document.getElementById('confirmDeleteBtn').textContent = 'Silinir...';
      document.getElementById('confirmDeleteBtn').disabled = true;
      
      try {
          if (type === 'project') await this.deleteProject(id, true);
          if (type === 'solution') await this.deleteSolution(id, true);
          if (type === 'article') await this.deleteArticle(id, true);
          if (type === 'job') await this.deleteJob(id, true);
          this.closeDeleteConfirmModal();
      } catch(e) {
          console.error(e);
      } finally {
          document.getElementById('confirmDeleteBtn').textContent = 'Sil';
          document.getElementById('confirmDeleteBtn').disabled = false;
      }
    },
    
    triggerAiForModal(targetFormId, isImprove) {
      this.aiTargetForm = targetFormId;
      this.openAiAssistant();
      setTimeout(() => {
        const promptText = document.getElementById('aiPromptText');
        if (promptText) {
            promptText.value = isImprove 
                ? "MГ¶vcud mЙ™lumatlarД± SEO vЙ™ oxunaqlД±lД±q baxД±mД±ndan yaxЕџД±laЕџdД±r. JSON olaraq form sahЙ™lЙ™rini qaytar." 
                : "Yeni mЙ™lumatlar yarat vЙ™ JSON formatД±nda qaytar.";
        }
      }, 100);
    },

    // 3. Render Views
    async renderDashboard() {
      try {
        const res = await fetch(`${API_BASE}/admin/dashboard-stats`);
        const json = await res.json();
        if (json.success) {
          const stats = json.data;

          // 1. TOP STATISTICS
          document.getElementById('metricNewInquiries').textContent = stats.newInquiries || 0;
          document.getElementById('metricNewApps').textContent = stats.newApplications || 0;
          document.getElementById('metricDraftProjects').textContent = stats.draftProjects || 0;
          document.getElementById('metricPublishedArticles').textContent = stats.publishedArticles || 0;
          document.getElementById('metricActiveJobs').textContent = stats.activeJobs || 0;

          // 2. NEEDS ATTENTION
          const attentionDiv = document.getElementById('dashboardNeedsAttention');
          const attentionContainer = document.getElementById('dashboardAttentionContainer');
          let attentionHtml = '';
          
          if (stats.newInquiries > 0) {
            attentionHtml += `
              <div style="background:rgba(255,0,144,0.1); border:1px solid rgba(255,0,144,0.3); border-radius:8px; padding:1rem; cursor:pointer;" onclick="AdminApp.switchTab('inbox')">
                <strong style="color:var(--adm-magenta); font-size:1.1rem;">${stats.newInquiries} yeni mГјraciЙ™t gГ¶zlЙ™yir</strong>
                <p style="margin-top:0.25rem; font-size:0.9rem; color:var(--adm-text-muted);">MГјЕџtЙ™ri mГјraciЙ™tlЙ™rini yoxlayД±n</p>
              </div>`;
          }
          if (stats.newApplications > 0) {
            attentionHtml += `
              <div style="background:rgba(52,199,89,0.1); border:1px solid rgba(52,199,89,0.3); border-radius:8px; padding:1rem; cursor:pointer;" onclick="AdminApp.switchTab('applications')">
                <strong style="color:var(--adm-success); font-size:1.1rem;">${stats.newApplications} yeni application daxil olub</strong>
                <p style="margin-top:0.25rem; font-size:0.9rem; color:var(--adm-text-muted);">Yeni namizЙ™dlЙ™rЙ™ baxД±n</p>
              </div>`;
          }
          if (stats.draftProjects > 0) {
            attentionHtml += `
              <div style="background:rgba(255,149,0,0.1); border:1px solid rgba(255,149,0,0.3); border-radius:8px; padding:1rem; cursor:pointer;" onclick="AdminApp.switchTab('projects')">
                <strong style="color:var(--adm-warning); font-size:1.1rem;">${stats.draftProjects} layihЙ™ hЙ™lЙ™ qaralamadД±r</strong>
                <p style="margin-top:0.25rem; font-size:0.9rem; color:var(--adm-text-muted);">YarД±mГ§Д±q layihЙ™lЙ™ri tamamlayД±n</p>
              </div>`;
          }

          if (attentionHtml) {
            attentionContainer.innerHTML = attentionHtml;
            attentionDiv.style.display = 'flex';
          } else {
            attentionDiv.style.display = 'none';
          }

          // Date formatter helper
          const formatDate = (isoString) => {
            const date = new Date(isoString);
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            
            if (date.toDateString() === today.toDateString()) return 'Bu gГјn';
            if (date.toDateString() === yesterday.toDateString()) return 'DГјnЙ™n';
            
            return date.toLocaleDateString('az-AZ', { day: 'numeric', month: 'long', year: 'numeric' });
          };

          // 3. RECENT INQUIRIES
          const inboxBox = document.getElementById('dashboardRecentInbox');
          if (inboxBox) {
            if (!stats.recentInquiries || stats.recentInquiries.length === 0) {
              inboxBox.innerHTML = '<div style="padding:2rem; text-align:center; color:var(--adm-text-muted); background:var(--adm-sidebar); border-radius:8px;">HЙ™lЙ™ mГјraciЙ™t yoxdur.<br><span style="font-size:0.85rem;">Yeni mГјraciЙ™tlЙ™r burada gГ¶rГјnЙ™cЙ™k.</span></div>';
            } else {
              inboxBox.innerHTML = stats.recentInquiries.map(item => {
                let statusColor = 'var(--adm-text-muted)';
                let statusLabel = item.status;
                if(item.status === 'NEW') { statusColor = 'var(--adm-cyan)'; statusLabel = 'Yeni'; }
                if(item.status === 'IN_PROGRESS') { statusColor = 'var(--adm-warning)'; statusLabel = 'Д°ЕџlЙ™nilir'; }
                if(item.status === 'CONTACTED') { statusColor = 'var(--adm-success)'; statusLabel = 'ЖЏlaqЙ™ saxlanД±lД±b'; }
                if(item.status === 'CLOSED') { statusLabel = 'BaДџlanД±b'; }

                return `
                <div style="padding:1rem; background:var(--adm-sidebar); border:1px solid var(--adm-border); border-radius:8px; display:flex; flex-direction:column; gap:0.5rem;">
                  <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div>
                      <strong style="font-size:1rem;">${item.company !== '-' ? item.company : item.name}</strong>
                      <div style="font-size:0.85rem; color:var(--adm-text-muted);">${item.name}</div>
                    </div>
                    <span style="font-size:0.75rem; background:${statusColor}20; color:${statusColor}; padding:0.25rem 0.5rem; border-radius:4px; font-weight:600;">${statusLabel}</span>
                  </div>
                  <p style="color:var(--adm-text); font-size:0.9rem; margin:0.5rem 0;">${item.message.length > 60 ? item.message.substring(0, 60) + '...' : item.message}</p>
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-top:auto;">
                    <span style="font-size:0.8rem; color:var(--adm-text-muted);">${formatDate(item.createdAt)}</span>
                    <button class="adm-btn adm-btn-secondary" style="padding:0.25rem 0.75rem; font-size:0.85rem;" onclick="AdminApp.switchTab('inbox'); setTimeout(() => AdminApp.openInquiryModal('${item.id}'), 300)">AГ§</button>
                  </div>
                </div>
              `}).join('');
            }
          }

          // 4. RECENT APPLICATIONS
          const appsBox = document.getElementById('dashboardRecentApps');
          if (appsBox) {
            if (!stats.recentApplications || stats.recentApplications.length === 0) {
              appsBox.innerHTML = '<div style="padding:2rem; text-align:center; color:var(--adm-text-muted); background:var(--adm-sidebar); border-radius:8px;">HЙ™lЙ™ application yoxdur.<br><span style="font-size:0.85rem;">Yeni application-lar burada gГ¶rГјnЙ™cЙ™k.</span></div>';
            } else {
              appsBox.innerHTML = stats.recentApplications.map(item => `
                <div style="padding:1rem; background:var(--adm-sidebar); border:1px solid var(--adm-border); border-radius:8px; display:flex; flex-direction:column; gap:0.5rem;">
                  <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div>
                      <strong style="font-size:1rem;">${item.name}</strong>
                      <div style="font-size:0.85rem; color:var(--adm-text-muted);">${item.jobTitle}</div>
                    </div>
                    <span style="font-size:0.75rem; background:var(--adm-border); color:var(--adm-text); padding:0.25rem 0.5rem; border-radius:4px; font-weight:600;">${item.status}</span>
                  </div>
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-top:auto; padding-top:0.5rem;">
                    <span style="font-size:0.8rem; color:var(--adm-text-muted);">${formatDate(item.createdAt)}</span>
                    <button class="adm-btn adm-btn-secondary" style="padding:0.25rem 0.75rem; font-size:0.85rem;" onclick="AdminApp.switchTab('applications'); setTimeout(() => AdminApp.viewApplication('${item.id}'), 300)">AГ§</button>
                  </div>
                </div>
              `).join('');
            }
          }

          // 5. RECENT CONTENT CHANGES
          const changesBox = document.getElementById('dashboardRecentChanges');
          if (changesBox) {
            if (!stats.recentContentChanges || stats.recentContentChanges.length === 0) {
              changesBox.innerHTML = '<div style="padding:2rem; text-align:center; color:var(--adm-text-muted); background:var(--adm-sidebar); border-radius:8px;">HЙ™lЙ™ dЙ™yiЕџiklik yoxdur.</div>';
            } else {
              changesBox.innerHTML = stats.recentContentChanges.map(item => `
                <div style="padding:1rem; background:var(--adm-sidebar); border:1px solid var(--adm-border); border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                  <div>
                    <strong style="font-size:0.95rem; display:block; margin-bottom:0.2rem;">${item.title}</strong>
                    <span style="font-size:0.8rem; color:var(--adm-text-muted);">${item.type} ${item.action.toLowerCase()}</span>
                  </div>
                  <div style="font-size:0.8rem; color:var(--adm-text-muted); text-align:right;">
                    ${formatDate(item.updatedAt)}
                  </div>
                </div>
              `).join('');
            }
          }

        } else {
          throw new Error('Stats fetch failed');
        }
      } catch (e) {
        console.error('Dashboard load error:', e);
        const errHtml = '<p style="padding:2rem; text-align:center; color:var(--adm-magenta); font-weight:bold;">MЙ™lumatlarД± yГјklЙ™mЙ™k mГјmkГјn olmadД±.</p>';
        document.getElementById('dashboardRecentInbox').innerHTML = errHtml;
        document.getElementById('dashboardRecentApps').innerHTML = errHtml;
        document.getElementById('dashboardRecentChanges').innerHTML = errHtml;
      }
    },

    // Projects Manager
    tempMetrics: [],

    async renderProjects() {
      const grid = document.getElementById('projectsGrid');
      if (!grid) return;
      grid.innerHTML = '<div class="spinner" style="margin:3rem auto; display:block;"></div>';
      const res = await fetch(`${API_BASE}/admin/projects`);
      const json = await res.json();
      if (json.success) {
        this.cache.projects = json.data;
        
        const query = document.getElementById('projectSearch').value.toLowerCase();
        const statusFilter = document.getElementById('projectStatusFilter').value;
        const clientFilter = document.getElementById('projectClientFilter').value;

        const filtered = json.data.filter(p => {
          const matchQuery = p.title.toLowerCase().includes(query) || (p.client && p.client.toLowerCase().includes(query));
          const matchStatus = statusFilter ? (statusFilter === 'published' ? p.published : (statusFilter === 'draft' ? !p.published : p.featured)) : true;
          const matchClient = clientFilter ? p.clientId === clientFilter : true;
          return matchQuery && matchStatus && matchClient;
        });

        if (filtered.length === 0) {
            grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem;">
                <h3 style="color:var(--adm-text-muted); margin-bottom: 1rem;">HЙ™lЙ™ heГ§ bir layihЙ™ yoxdur.</h3>
                <button class="adm-btn adm-btn-primary" onclick="AdminApp.openProjectModal()">Д°lk layihЙ™ni yarat</button>
            </div>`;
            return;
        }

        grid.innerHTML = filtered.map(p => `
          <div class="adm-item-card">
            <img class="adm-card-thumb" src="${p.image || 'https://placehold.co/600x400?text=No+Cover'}" alt="${p.title}" />
            <div class="adm-card-content">
              <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem; align-items:center;">
                <span class="adm-card-tag">${p.category || 'TЙ™yin edilmЙ™yib'}</span>
                <span style="font-size:0.8rem; color:var(--adm-text-muted); font-weight:700;">${p.year || ''}</span>
              </div>
              <h4 class="adm-card-title">${p.title}</h4>
              <p style="font-size:0.85rem; color:var(--adm-text-muted); margin-top:0.25rem;">${p.client || 'MГјЕџtЙ™ri yoxdur'}</p>
              
              <div style="margin-top:1rem; margin-bottom: 1rem; display:flex; gap:0.5rem;">
                <span class="badge-status ${p.published ? 'new' : 'rejected'}">${p.published ? 'DЙ™rc olunub' : 'Qaralama'}</span>
                ${p.featured ? '<span class="badge-status reviewing">SeГ§ilmiЕџ</span>' : ''}
              </div>
              <div class="adm-card-actions" style="border-top: 1px solid var(--adm-border); padding-top:1rem;">
                <button class="adm-btn adm-btn-secondary" onclick="AdminApp.openProjectModal('${p.id}')">RedaktЙ™ et</button>
                <div style="display:flex; gap:0.5rem;">
                  <button class="adm-btn adm-btn-secondary" onclick="AdminApp.duplicateProject('${p.id}')" title="Kopyala">рџ“„</button>
                  <button class="adm-btn adm-btn-danger" onclick="AdminApp.deleteProjectPrompt('${p.id}')" title="Sil">вњ•</button>
                </div>
              </div>
            </div>
          </div>
        `).join('');
      }
      this.populateProjectClientFilter();
    },

    async populateProjectClientFilter() {
        const filter = document.getElementById('projectClientFilter');
        if (!filter) return;
        if (this.cache.clients.length === 0) {
             const res = await fetch(`${API_BASE}/admin/clients`);
             const json = await res.json();
             if (json.success) this.cache.clients = json.data;
        }
        const currentVal = filter.value;
        filter.innerHTML = '<option value="">BГјtГјn MГјЕџtЙ™rilЙ™r</option>' + this.cache.clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        filter.value = currentVal;
    },

    async loadClientOptions() {
      const select = document.getElementById('projClientId');
      if (!select) return;
      
      if (this.cache.clients.length === 0) {
        const res = await fetch(`${API_BASE}/admin/clients`);
        const json = await res.json();
        if (json.success) {
          this.cache.clients = json.data;
        }
      }
      select.innerHTML = '<option value="">-- MГјЕџtЙ™ri SeГ§in --</option>' + 
        this.cache.clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('') + 
        '<option value="NEW" style="font-weight:bold; color:var(--adm-cyan);">+ Yeni MГјЕџtЙ™ri YaradД±n</option>';
    },

    handleProjectClientSelect(e) {
        if (e.target.value === 'NEW') {
            e.target.value = '';
            // Close project modal temporarily to show client modal? 
            // Better to just overlay it.
            this.openClientModal();
        } else {
            this.updateProjectLivePreview();
        }
    },

    async openProjectModal(id = null) {
      const form = document.getElementById('projectForm');
      form.reset();
      document.getElementById('projEditId').value = '';
      if (id) {
          document.getElementById('projectAiFillBtn').style.display = 'none';
          document.getElementById('projectAiImproveBtn').style.display = 'flex';
      } else {
          document.getElementById('projectAiFillBtn').style.display = 'flex';
          document.getElementById('projectAiImproveBtn').style.display = 'none';
      }
      this.tempGallery = [];
      this.tempMetrics = [];

      // Switch to first tab "General"
      document.querySelectorAll('#projectModal .modal-tab-btn').forEach((btn, idx) => {
        if (idx === 0) btn.classList.add('active');
        else btn.classList.remove('active');
      });
      document.querySelectorAll('#projectModal .modal-tab-content').forEach((tab, idx) => {
        if (idx === 0) tab.classList.add('active');
        else tab.classList.remove('active');
      });

      // Load Client options
      await this.loadClientOptions();

      if (id) {
        const p = this.cache.projects.find(item => item.id === id);
        if (p) {
          document.getElementById('projectModalTitle').textContent = 'LayihЙ™ni RedaktЙ™ Et';
          document.getElementById('projEditId').value = p.id;
          
          document.getElementById('projTitle').value = p.title || '';
          document.getElementById('projSlugField').value = p.id || ''; // In backend id is used as slug currently if they match, but the old form used projIdField. Wait, DB uses 'id' as primary key string (slug).
          document.getElementById('projSlugField').disabled = true;

          AdminApp.selectClientForProject(p.clientId || '');
          document.getElementById('projYear').value = p.year || '';
          document.getElementById('projCategory').value = p.category || '';
          document.getElementById('projTag').value = p.tag || '';
          
          document.getElementById('projHeadline').value = p.headline || '';
          document.getElementById('projOverview').value = p.overview || '';
          document.getElementById('projChallenge').value = p.challenge || '';
          document.getElementById('projSolution').value = p.solution || '';
          
          document.getElementById('projImage').value = p.image || '';
          
          document.getElementById('projPublished').checked = !!p.published;
          document.getElementById('projFeatured').checked = !!p.featured;
          document.getElementById('projOrder').value = p.order || 0;
          document.getElementById('projSpan').value = p.span || 'span-6';

          document.getElementById('projMetaTitle').value = p.metaTitle || '';
          document.getElementById('projMetaDesc').value = p.metaDesc || '';

          if (p.gallery) {
            this.tempGallery = Array.isArray(p.gallery) ? p.gallery : JSON.parse(p.gallery || '[]');
          }
          if (p.metrics) {
              this.tempMetrics = Array.isArray(p.metrics) ? p.metrics : JSON.parse(p.metrics || '[]');
          }
        }
      } else {
        document.getElementById('projectModalTitle').textContent = 'Yeni LayihЙ™';
        document.getElementById('projSlugField').value = '';
        document.getElementById('projSlugField').disabled = false;
        document.getElementById('projOrder').value = 0;
        document.getElementById('projSpan').value = 'span-6';
        document.getElementById('projPublished').checked = false; // default draft
      }

      this.renderProjGalleryList();
      this.renderProjCoverPreview();
      this.renderProjMetricsList();
      this.updateProjectLivePreview();
      
      document.getElementById('projectModal').classList.add('is-active');
    },

    renderProjCoverPreview() {
        const coverInput = document.getElementById('projImage');
        const preview = document.getElementById('projCoverPreview');
        if (coverInput && preview) {
            if (coverInput.value) {
                preview.src = coverInput.value;
                preview.style.display = 'block';
            } else {
                preview.src = '';
                preview.style.display = 'none';
            }
        }
        this.updateProjectLivePreview();
    },

    // --- Gallery Handlers ---
    renderProjGalleryList() {
      const container = document.getElementById('projGalleryPreviewList');
      if (!container) return;
      if (this.tempGallery.length === 0) {
        container.innerHTML = '<p style="color:var(--adm-text-muted); text-align:center; padding:1rem; border: 1px dashed var(--adm-border); border-radius:4px;">Qalereya boЕџdur. ЕћЙ™kil Й™lavЙ™ edin.</p>';
        return;
      }
      container.innerHTML = this.tempGallery.map((url, idx) => `
        <div style="display:flex; align-items:center; justify-content:space-between; background:var(--adm-sidebar); padding:0.75rem; border-radius:4px; border:1px solid var(--adm-border); gap: 1rem;">
          <div style="display:flex; align-items:center; gap: 1rem; flex: 1; overflow:hidden;">
              <span style="color:var(--adm-text-muted); font-weight:bold;">${idx + 1}.</span>
              <img src="${url}" style="width:80px; height:50px; object-fit:cover; border-radius:4px;" />
              <span style="font-size:0.8rem; color:var(--adm-text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${url}</span>
          </div>
          <div style="display:flex; gap:0.25rem;">
            <button type="button" class="adm-btn adm-btn-secondary" style="padding:0.4rem;" onclick="AdminApp.moveGalleryItem(${idx}, -1)" title="YuxarД±">в–І</button>
            <button type="button" class="adm-btn adm-btn-secondary" style="padding:0.4rem;" onclick="AdminApp.moveGalleryItem(${idx}, 1)" title="AЕџaДџД±">в–ј</button>
            <button type="button" class="adm-btn adm-btn-danger" style="padding:0.4rem 0.75rem;" onclick="AdminApp.removeGalleryItem(${idx})">Sil</button>
          </div>
        </div>
      `).join('');
      this.updateProjectLivePreview();
    },

    moveGalleryItem(idx, direction) {
      const targetIdx = idx + direction;
      if (targetIdx < 0 || targetIdx >= this.tempGallery.length) return;
      const temp = this.tempGallery[idx];
      this.tempGallery[idx] = this.tempGallery[targetIdx];
      this.tempGallery[targetIdx] = temp;
      this.renderProjGalleryList();
    },

    removeGalleryItem(idx) {
      this.tempGallery.splice(idx, 1);
      this.renderProjGalleryList();
    },

    addGalleryItem(url) {
        this.tempGallery.push(url);
        this.renderProjGalleryList();
    },

    // --- Metrics Handlers ---
    renderProjMetricsList() {
        const container = document.getElementById('projMetricsContainer');
        if (!container) return;
        if (this.tempMetrics.length === 0) {
            container.innerHTML = '<p style="color:var(--adm-text-muted); text-align:center; padding:1rem;">NЙ™ticЙ™ yoxdur.</p>';
            return;
        }
        container.innerHTML = this.tempMetrics.map((m, idx) => `
            <div style="background:rgba(255,255,255,0.02); border: 1px solid var(--adm-border); border-radius:6px; padding:1rem; margin-bottom:1rem; display:flex; gap:1rem; align-items:flex-start;">
                <div style="flex:1;">
                    <label class="form-label">RЙ™qЙ™m</label>
                    <input type="text" class="form-input" value="${m.value || ''}" onchange="AdminApp.updateMetric(${idx}, 'value', this.value)" placeholder="+35%">
                </div>
                <div style="flex:2;">
                    <label class="form-label">AГ§Д±qlama</label>
                    <input type="text" class="form-input" value="${m.label || ''}" onchange="AdminApp.updateMetric(${idx}, 'label', this.value)" placeholder="satД±Еџ artД±mД±">
                </div>
                <div style="padding-top:1.5rem; display:flex; gap:0.25rem;">
                    <button type="button" class="adm-btn adm-btn-secondary" style="padding:0.4rem;" onclick="AdminApp.moveMetricItem(${idx}, -1)">в–І</button>
                    <button type="button" class="adm-btn adm-btn-secondary" style="padding:0.4rem;" onclick="AdminApp.moveMetricItem(${idx}, 1)">в–ј</button>
                    <button type="button" class="adm-btn adm-btn-danger" style="padding:0.4rem 0.75rem;" onclick="AdminApp.removeMetricItem(${idx})">Sil</button>
                </div>
            </div>
        `).join('');
    },

    addProjectMetricRow() {
        this.tempMetrics.push({ value: '', label: '' });
        this.renderProjMetricsList();
    },
    
    updateMetric(idx, key, val) {
        this.tempMetrics[idx][key] = val;
    },

    moveMetricItem(idx, direction) {
        const targetIdx = idx + direction;
        if (targetIdx < 0 || targetIdx >= this.tempMetrics.length) return;
        const temp = this.tempMetrics[idx];
        this.tempMetrics[idx] = this.tempMetrics[targetIdx];
        this.tempMetrics[targetIdx] = temp;
        this.renderProjMetricsList();
    },

    removeMetricItem(idx) {
        this.tempMetrics.splice(idx, 1);
        this.renderProjMetricsList();
    },

    // --- Live Preview ---
    updateProjectLivePreview() {
        const title = document.getElementById('projTitle')?.value || 'LayihЙ™ AdД±';
        const headline = document.getElementById('projHeadline')?.value || 'QД±sa baЕџlД±q (headline)';
        const cover = document.getElementById('projImage')?.value;
        const year = document.getElementById('projYear')?.value || '202X';
        const challenge = document.getElementById('projChallenge')?.value || '...';
        const solution = document.getElementById('projSolution')?.value || '...';
        
        const clientId = document.getElementById('projClientId')?.value;
        let clientName = 'MГјЕџtЙ™ri AdД±';
        let clientLogo = '';
        if (clientId && this.cache.clients) {
            const c = this.cache.clients.find(x => x.id === clientId);
            if (c) {
                clientName = c.name;
                clientLogo = c.logoUrl;
            }
        }

        const eTitle = document.getElementById('previewTitle');
        const eHeadline = document.getElementById('previewHeadline');
        const eCover = document.getElementById('previewCoverImg');
        const eYear = document.getElementById('previewYear');
        const eChallenge = document.getElementById('previewChallenge');
        const eSolution = document.getElementById('previewSolution');
        const eClientName = document.getElementById('previewClientName');
        const eClientLogo = document.getElementById('previewClientLogoImg');

        if (eTitle) eTitle.textContent = title;
        if (eHeadline) eHeadline.textContent = headline;
        if (eYear) eYear.textContent = year;
        if (eChallenge) eChallenge.textContent = challenge;
        if (eSolution) eSolution.textContent = solution;
        if (eClientName) eClientName.textContent = clientName;

        if (eCover) {
            if (cover) {
                eCover.src = cover;
                eCover.style.display = 'inline-block';
            } else {
                eCover.style.display = 'none';
            }
        }

        if (eClientLogo) {
            if (clientLogo) {
                eClientLogo.style.backgroundImage = `url(${clientLogo})`;
                eClientLogo.style.backgroundSize = 'contain';
                eClientLogo.style.backgroundPosition = 'center';
                eClientLogo.style.backgroundRepeat = 'no-repeat';
            } else {
                eClientLogo.style.backgroundImage = 'none';
            }
        }
    },

    // --- Core Actions ---
    async saveProject(e) {
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
      const editId = document.getElementById('projEditId').value;
      const method = editId ? 'PUT' : 'POST';
      const url = editId ? `${API_BASE}/admin/projects/${editId}` : `${API_BASE}/admin/projects`;

      // Auto-generate slug if not editing and slug is empty
      let finalSlug = document.getElementById('projSlugField').value.trim();
      if (!finalSlug && !editId) {
          finalSlug = (document.getElementById('projTitle').value || 'untitled')
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/(^-|-$)+/g, '');
      }

      const payload = {
        id: finalSlug, // using id as slug in DB
        title: document.getElementById('projTitle').value,
        clientId: document.getElementById('projClientId').value || null,
        year: document.getElementById('projYear').value,
        category: document.getElementById('projCategory').value,
        tag: document.getElementById('projTag').value,
        headline: document.getElementById('projHeadline').value,
        overview: document.getElementById('projOverview').value,
        challenge: document.getElementById('projChallenge').value,
        solution: document.getElementById('projSolution').value,
        image: document.getElementById('projImage').value,
        published: document.getElementById('projPublished').checked,
        featured: document.getElementById('projFeatured').checked,
        order: Number(document.getElementById('projOrder').value) || 0,
        span: document.getElementById('projSpan').value,
        metaTitle: document.getElementById('projMetaTitle').value,
        metaDesc: document.getElementById('projMetaDesc').value,
        gallery: this.tempGallery,
        metrics: this.tempMetrics
      };

      // Button state
      const submitBtn = e.target.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Yadda saxlanД±lД±r...';
      submitBtn.disabled = true;

      try {
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;

        if (json.success) {
          this.showToast('LayihЙ™ yadda saxlanД±ldД±.');
          this.closeModal('projectModal');
          await this.renderProjects();
        } else {
          alert(json.error?.message || 'LayihЙ™ni yadda saxlamaq mГјmkГјn olmadД±.');
        }
      } catch (err) {
        console.error(err);
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        alert('Sistem xЙ™tasД±: LayihЙ™ni yadda saxlamaq mГјmkГјn olmadД±.');
      }
    },

    async duplicateProject(id) {
        if (!confirm('Bu layihЙ™nin kopyasД±nД± yaratmaq istЙ™diyinizdЙ™n Й™minsiniz?')) return;
        try {
            const res = await fetch(`${API_BASE}/admin/projects/${id}/duplicate`, { method: 'POST' });
            const json = await res.json();
            if (json.success) {
                this.showToast('LayihЙ™ kopyalandД±.');
                await this.renderProjects();
                
                // Ask if they want to edit the duplicate
                if (confirm('Yeni yaradД±lmД±Еџ kopyanД± redaktЙ™ etmЙ™k istЙ™yirsiniz?')) {
                    this.openProjectModal(json.data.id);
                }
            } else {
                alert(json.error?.message || 'LayihЙ™ kopyalana bilmЙ™di.');
            }
        } catch (e) {
            console.error(e);
            alert('Sistem xЙ™tasД±.');
        }
    },

    deleteProjectPrompt(id) {
      this.openDeleteConfirm(() => this.deleteProject(id), 'Bu layihЙ™ni silmЙ™k istЙ™yirsiniz? Bu Й™mЙ™liyyat geri qaytarД±la bilmЙ™z.');
    },

    async deleteProject(id) {
      try {
        const res = await fetch(`${API_BASE}/admin/projects/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
          this.showToast('LayihЙ™ silindi.');
          await this.renderProjects();
        } else {
          alert(json.error?.message || 'SilinmЙ™ uДџursuz oldu.');
        }
      } catch (e) {
        console.error(e);
      }
    },

    // 
// Clients Manager
    async renderClients() {
      const grid = document.getElementById('clientsGrid');
      if (!grid) return;
      grid.innerHTML = '<div class="spinner" style="margin:3rem auto; display:block;"></div>';
      const res = await fetch(`${API_BASE}/admin/clients`);
      const json = await res.json();
      if (json.success) {
        this.cache.clients = json.data;
        const query = document.getElementById('clientSearch').value.toLowerCase();
        const filtered = json.data.filter(c => c.name.toLowerCase().includes(query));

        grid.innerHTML = filtered.map(c => `
          <div class="adm-item-card" style="padding:1.5rem; text-align:center;">
            <img src="${c.logoUrl || 'https://placehold.co/100'}" style="height:60px; object-fit:contain; margin-bottom:1rem;" />
            <h4 class="adm-card-title">${c.name}</h4>
            <p style="font-size:0.8rem; color:var(--adm-text-muted); margin-bottom:1rem;">Order: ${c.order} | ${c.active ? 'Aktiv' : 'Deaktiv'}</p>
            <div class="adm-card-actions" style="justify-content:center;">
              <button class="adm-btn adm-btn-secondary" onclick="AdminApp.openClientModal('${c.id}')">Edit</button>
              <button class="adm-btn adm-btn-danger" onclick="AdminApp.deleteClientPrompt('${c.id}')">Sil</button>
            </div>
          </div>
        `).join('');
      }
    },

    openClientModal(id = null) {
      const form = document.getElementById('clientForm');
      form.reset();
      document.getElementById('clientEditId').value = '';

      if (id) {
        const c = this.cache.clients.find(item => item.id === id);
        if (c) {
          document.getElementById('clientModalTitle').textContent = 'MГјЕџtЙ™rini RedaktЙ™ Et';
          document.getElementById('clientEditId').value = c.id;
          document.getElementById('clientName').value = c.name;
          document.getElementById('clientWebsiteUrl').value = c.websiteUrl || '';
          document.getElementById('clientLogoUrl').value = c.logoUrl || '';
          document.getElementById('clientDescription').value = c.description || '';
          document.getElementById('clientOrder').value = c.order || 0;
          document.getElementById('clientActive').checked = !!c.active;
        }
      } else {
        document.getElementById('clientModalTitle').textContent = 'Yeni MГјЕџtЙ™ri';
        document.getElementById('clientOrder').value = 0;
        document.getElementById('clientActive').checked = true;
      }
      document.getElementById('clientModal').classList.add('is-active');
    },

    async saveClient(e) {
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
      const editId = document.getElementById('clientEditId').value;
      const method = editId ? 'PUT' : 'POST';
      const url = editId ? `${API_BASE}/admin/clients/${editId}` : `${API_BASE}/admin/clients`;

      const payload = {
        name: document.getElementById('clientName').value,
        websiteUrl: document.getElementById('clientWebsiteUrl').value,
        logoUrl: document.getElementById('clientLogoUrl').value || null,
        description: document.getElementById('clientDescription').value,
        order: Number(document.getElementById('clientOrder').value) || 0,
        active: document.getElementById('clientActive').checked
      };

      try {
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json.success) {
          this.showToast('MГјЕџtЙ™ri saxlanД±ldД±.');
          this.closeModal('clientModal');
          await this.renderClients();
        } else {
          alert(json.error?.message || 'MГјЕџtЙ™ri saxlama xЙ™tasД±.');
        }
      } catch (err) {
        console.error(err);
      }
    },

    deleteClientPrompt(id) {
      this.openDeleteConfirm(() => this.deleteClient(id), 'MГјЕџtЙ™rini silmЙ™k istЙ™diyinizdЙ™n Й™minsiniz?');
    },

    async deleteClient(id) {
      try {
        const res = await fetch(`${API_BASE}/admin/clients/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
          this.showToast('MГјЕџtЙ™ri silindi.');
          await this.renderClients();
        } else {
          alert(json.error?.message || 'SilinmЙ™ alД±nmadД±.');
        }
      } catch (e) {
        console.error(e);
      }
    },

    // Media Manager

    // Solutions Manager state
    tempSolLists: {
      features: [],
      benefits: [],
      process: [],
      deliverables: []
    },

    async renderSolutions() {
      const grid = document.getElementById('solutionsGrid');
      if (!grid) return;
      grid.innerHTML = '<div class="spinner" style="margin:3rem auto; display:block;"></div>';
      const res = await fetch(`${API_BASE}/admin/solutions`);
      const json = await res.json();
      if (json.success) {
        this.cache.solutions = json.data;

        // Apply filters
        const searchVal = document.getElementById('solutionSearch')?.value.toLowerCase() || '';
        const statusVal = document.getElementById('solutionStatusFilter')?.value || 'ALL';
        const sortVal = document.getElementById('solutionSortOrder')?.value || 'ORDER_ASC';

        let filtered = json.data.filter(s => {
          const matchSearch = s.title.toLowerCase().includes(searchVal) || s.tagline.toLowerCase().includes(searchVal) || s.id.toLowerCase().includes(searchVal);
          let matchStatus = true;
          if (statusVal === 'PUBLISHED') matchStatus = s.published === true;
          if (statusVal === 'DRAFT') matchStatus = s.published === false;
          return matchSearch && matchStatus;
        });

        // Sorting
        filtered.sort((a, b) => {
          if (sortVal === 'ORDER_ASC') return (a.order || 0) - (b.order || 0);
          if (sortVal === 'ORDER_DESC') return (b.order || 0) - (a.order || 0);
          if (sortVal === 'ALPHA_ASC') return a.title.localeCompare(b.title);
          return 0;
        });

        grid.innerHTML = filtered.map(s => `
          <div class="adm-item-card">
            ${s.image ? `<img class="adm-card-thumb" src="${s.image}" />` : `<div class="adm-card-thumb" style="background:#26221f; display:flex; align-items:center; justify-content:center; height:150px; color:var(--adm-text-muted);">Г–rtГјk yoxdur</div>`}
            <div class="adm-card-content">
              <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem; align-items:center;">
                <span class="adm-card-tag">#${s.num}</span>
                <span style="font-size:0.8rem; color:var(--adm-text-muted); font-weight:700;">SД±ra: ${s.order}</span>
              </div>
              <h4 class="adm-card-title">${s.title}</h4>
              <p class="adm-card-desc">${s.tagline}</p>
              
              <div style="margin: 0.75rem 0; display:flex; gap:0.25rem; align-items:center; flex-wrap:wrap;">
                <span class="badge-status ${s.published ? 'new' : 'rejected'}">${s.published ? 'Published' : 'Draft'}</span>
                <button class="adm-btn adm-btn-secondary" style="padding:0.25rem 0.5rem; font-size:0.75rem;" onclick="AdminApp.togglePublishSolution('${s.id}', ${!s.published})">
                  ${s.published ? 'Qaralama et' : 'DЙ™rc et'}
                </button>
              </div>

              <div class="adm-card-actions">
                <button class="adm-btn adm-btn-secondary" onclick="AdminApp.openSolutionModal('${s.id}')">вњЏпёЏ Edit</button>
                <button class="adm-btn adm-btn-secondary" onclick="AdminApp.duplicateSolution('${s.id}')">рџ“‹ Kopyala</button>
                <button class="adm-btn adm-btn-danger" onclick="AdminApp.deleteSolutionPrompt('${s.id}')">Sil</button>
              </div>
            </div>
          </div>
        `).join('');
      }
    },

    openSolutionModal(id = null) {
      const form = document.getElementById('solutionForm');
      form.reset();
      document.getElementById('solEditId').value = '';
      document.getElementById('solId').disabled = false;

      // Switch solution modal tabs to first tab "General"
      document.querySelectorAll('#solutionModal .modal-tab-btn').forEach((btn, idx) => {
        if (idx === 0) btn.classList.add('active');
        else btn.classList.remove('active');
      });
      document.querySelectorAll('#solutionModal .modal-tab-content').forEach((tab, idx) => {
        if (idx === 0) tab.classList.add('active');
        else tab.classList.remove('active');
      });

      this.tempSolLists = {
        features: [],
        benefits: [],
        process: [],
        deliverables: []
      };

      if (id) {
        const s = this.cache.solutions.find(item => item.id === id);
        if (s) {
          document.getElementById('solutionModalTitle').textContent = 'XidmЙ™ti RedaktЙ™ Et';
          document.getElementById('solEditId').value = s.id;
          document.getElementById('solId').value = s.id;
          document.getElementById('solId').disabled = true; // Immutable slug key

          document.getElementById('solNum').value = s.num || '01';
          document.getElementById('solTitle').value = s.title;
          document.getElementById('solTagline').value = s.tagline;
          document.getElementById('solDesc').value = s.desc || '';
          document.getElementById('solCta').value = s.cta || '';
          document.getElementById('solImage').value = s.image || '';
          document.getElementById('solPublished').checked = !!s.published;
          document.getElementById('solOrder').value = s.order || 0;

          document.getElementById('solMetaTitle').value = s.metaTitle || '';
          document.getElementById('solMetaDesc').value = s.metaDesc || '';

          this.tempSolLists.features = Array.isArray(s.features) ? [...s.features] : [];
          this.tempSolLists.benefits = Array.isArray(s.benefits) ? [...s.benefits] : [];
          this.tempSolLists.process = Array.isArray(s.process) ? [...s.process] : [];
          this.tempSolLists.deliverables = Array.isArray(s.deliverables) ? [...s.deliverables] : [];
        }
      } else {
        document.getElementById('solutionModalTitle').textContent = 'Yeni XidmЙ™t YaradД±n';
        document.getElementById('solNum').value = '01';
        document.getElementById('solOrder').value = 0;
        document.getElementById('solPublished').checked = false; // default draft
      }

      // Render constructor fields
      this.renderSolListItems('features');
      this.renderSolListItems('benefits');
      this.renderSolListItems('process');
      this.renderSolListItems('deliverables');

      document.getElementById('solutionModal').classList.add('is-active');
    },

    addSolListItem(listName, inputFieldId) {
      const input = document.getElementById(inputFieldId);
      if (!input) return;
      const val = input.value.trim();
      if (!val) return;
      this.tempSolLists[listName].push(val);
      input.value = '';
      this.renderSolListItems(listName);
    },

    removeSolListItem(listName, index) {
      this.tempSolLists[listName].splice(index, 1);
      this.renderSolListItems(listName);
    },

    moveSolListItem(listName, index, direction) {
      const target = index + direction;
      if (target < 0 || target >= this.tempSolLists[listName].length) return;
      const temp = this.tempSolLists[listName][index];
      this.tempSolLists[listName][index] = this.tempSolLists[listName][target];
      this.tempSolLists[listName][target] = temp;
      this.renderSolListItems(listName);
    },

    renderSolListItems(listName) {
      const listContainerId = `sol${listName.charAt(0).toUpperCase() + listName.slice(1)}List`;
      const container = document.getElementById(listContainerId);
      if (!container) return;

      const items = this.tempSolLists[listName];
      if (items.length === 0) {
        container.innerHTML = '<span style="font-size:0.8rem; color:var(--adm-text-muted);">SiyahД± boЕџdur.</span>';
        return;
      }

      container.innerHTML = items.map((item, idx) => `
        <div style="display:flex; align-items:center; justify-content:space-between; gap:0.5rem; background:var(--adm-sidebar); border:1px solid var(--adm-border); border-radius:4px; padding:0.35rem 0.5rem; font-size:0.8rem;">
          <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:200px;">${item}</span>
          <div style="display:flex; gap:0.15rem; flex-shrink:0;">
            <button type="button" class="adm-btn adm-btn-secondary" style="padding:0.15rem 0.35rem; font-size:0.65rem;" onclick="AdminApp.moveSolListItem('${listName}', ${idx}, -1)">в–І</button>
            <button type="button" class="adm-btn adm-btn-secondary" style="padding:0.15rem 0.35rem; font-size:0.65rem;" onclick="AdminApp.moveSolListItem('${listName}', ${idx}, 1)">в–ј</button>
            <button type="button" class="adm-btn adm-btn-danger" style="padding:0.15rem 0.35rem; font-size:0.65rem;" onclick="AdminApp.removeSolListItem('${listName}', ${idx})">вњ•</button>
          </div>
        </div>
      `).join('');
    },

    async saveSolution(e) {
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
      const editId = document.getElementById('solEditId').value;
      const method = editId ? 'PUT' : 'POST';
      const url = editId ? `${API_BASE}/admin/solutions/${editId}` : `${API_BASE}/admin/solutions`;

      const payload = {
        id: document.getElementById('solId').value,
        num: document.getElementById('solNum').value,
        title: document.getElementById('solTitle').value,
        tagline: document.getElementById('solTagline').value,
        desc: document.getElementById('solDesc').value,
        cta: document.getElementById('solCta').value,
        image: document.getElementById('solImage').value,
        published: document.getElementById('solPublished').checked,
        order: Number(document.getElementById('solOrder').value) || 0,
        metaTitle: document.getElementById('solMetaTitle').value,
        metaDesc: document.getElementById('solMetaDesc').value,
        
        // Lists
        features: this.tempSolLists.features,
        benefits: this.tempSolLists.benefits,
        process: this.tempSolLists.process,
        deliverables: this.tempSolLists.deliverables
      };

      try {
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json.success) {
          this.showToast('XidmЙ™t yadda saxlanД±ldД±.');
          this.closeModal('solutionModal');
          await this.renderSolutions();
        } else {
          alert(json.error?.message || 'Qeyd saxlama xЙ™tasД±.');
        }
      } catch (err) {
        console.error(err);
      }
    },

    async togglePublishSolution(id, state) {
      try {
        const res = await fetch(`${API_BASE}/admin/solutions/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ published: !!state })
        });
        const json = await res.json();
        if (json.success) {
          this.showToast(state ? 'XidmЙ™t dЙ™rc olundu.' : 'XidmЙ™t qaralamaya keГ§irildi.');
          await this.renderSolutions();
        }
      } catch (e) {
        console.error(e);
      }
    },

    async duplicateSolution(id) {
      const s = this.cache.solutions.find(item => item.id === id);
      if (!s) return;

      const payload = {
        ...s,
        id: `${s.id}-copy`,
        title: `${s.title} (Kopya)`,
        published: false // Cloned version defaults to draft
      };
      delete payload.createdAt;
      delete payload.updatedAt;

      try {
        const res = await fetch(`${API_BASE}/admin/solutions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json.success) {
          this.showToast('XidmЙ™t kopyalandД±.');
          await this.renderSolutions();
        } else {
          alert(json.error?.message || 'Kopyalama alД±nmadД±.');
        }
      } catch (err) {
        console.error(err);
      }
    },

    deleteSolutionPrompt(id) {
      this.openDeleteConfirm(() => this.deleteSolution(id), 'Bu xidmЙ™ti silmЙ™k istЙ™diyinizdЙ™n Й™minsiniz?');
    },

    async deleteSolution(id) {
      try {
        const res = await fetch(`${API_BASE}/admin/solutions/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
          this.showToast('XidmЙ™t silindi.');
          await this.renderSolutions();
        } else {
          alert(json.error?.message || 'SilinmЙ™ uДџursuz oldu.');
        }
      } catch (e) {
        console.error(e);
      }
    },    // Articles Manager state & controllers
    isArtSlugEdited: false,

    async renderArticles() {
      const grid = document.getElementById('articlesGrid');
      if (!grid) return;
      grid.innerHTML = '<div class="spinner" style="margin:3rem auto; display:block;"></div>';
      const res = await fetch(`${API_BASE}/admin/articles`);
      const json = await res.json();
      if (json.success) {
        this.cache.articles = json.data;

        // Dynamic categories extraction
        const categories = Array.from(new Set(json.data.map(a => a.tag).filter(Boolean)));
        const catSelect = document.getElementById('articleCategoryFilter');
        if (catSelect) {
          const currentVal = catSelect.value;
          catSelect.innerHTML = '<option value="ALL">BГјtГјn Kateqoriyalar</option>' + 
            categories.map(c => `<option value="${c}">${c}</option>`).join('');
          catSelect.value = currentVal;
        }

        // Apply filters
        const searchVal = document.getElementById('articleSearch')?.value.toLowerCase() || '';
        const statusVal = document.getElementById('articleStatusFilter')?.value || 'ALL';
        const featuredVal = document.getElementById('articleFeaturedFilter')?.value || 'ALL';
        const categoryVal = document.getElementById('articleCategoryFilter')?.value || 'ALL';

        let filtered = json.data.filter(a => {
          const matchSearch = a.title.toLowerCase().includes(searchVal) || 
                              a.slug.toLowerCase().includes(searchVal) || 
                              a.tag.toLowerCase().includes(searchVal);
          
          let matchStatus = true;
          if (statusVal === 'PUBLISHED') matchStatus = a.published === true;
          if (statusVal === 'DRAFT') matchStatus = a.published === false;

          let matchFeatured = true;
          if (featuredVal === 'FEATURED') matchFeatured = a.featured === true;
          if (featuredVal === 'NORMAL') matchFeatured = a.featured === false;

          let matchCategory = true;
          if (categoryVal !== 'ALL') matchCategory = a.tag === categoryVal;

          return matchSearch && matchStatus && matchFeatured && matchCategory;
        });

        grid.innerHTML = filtered.map(a => `
          <div class="adm-item-card">
            ${a.image ? `<img class="adm-card-thumb" src="${a.image}" />` : `<div class="adm-card-thumb" style="background:#26221f; display:flex; align-items:center; justify-content:center; height:150px; color:var(--adm-text-muted);">Г–rtГјk yoxdur</div>`}
            <div class="adm-card-content">
              <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem; align-items:center;">
                <span class="adm-card-tag">${a.tag}</span>
                <span style="font-size:0.8rem; color:var(--adm-text-muted);">${a.date || 'Tarix yoxdur'}</span>
              </div>
              <h4 class="adm-card-title">${a.title}</h4>
              
              <div style="margin: 0.75rem 0; display:flex; gap:0.25rem; align-items:center; flex-wrap:wrap;">
                <span class="badge-status ${a.published ? 'new' : 'rejected'}">${a.published ? 'Published' : 'Draft'}</span>
                ${a.featured ? `<span class="badge-status review" style="background:#b380ff; color:#fff;">Featured</span>` : ''}
                <button class="adm-btn adm-btn-secondary" style="padding:0.25rem 0.5rem; font-size:0.75rem;" onclick="AdminApp.togglePublishArticle('${a.id}', ${!a.published})">
                  ${a.published ? 'Qaralama et' : 'DЙ™rc et'}
                </button>
              </div>

              <div class="adm-card-actions">
                <button class="adm-btn adm-btn-secondary" onclick="AdminApp.openArticleModal('${a.id}')">вњЏпёЏ Edit</button>
                <button class="adm-btn adm-btn-secondary" onclick="AdminApp.duplicateArticle('${a.id}')">рџ“‹ Kopyala</button>
                <button class="adm-btn adm-btn-danger" onclick="AdminApp.deleteArticlePrompt('${a.id}')">Sil</button>
              </div>
            </div>
          </div>
        `).join('');
      }
    },

    openArticleModal(id = null) {
      const form = document.getElementById('articleForm');
      form.reset();
      document.getElementById('artEditId').value = '';
      this.isArtSlugEdited = false;
      document.getElementById('artSlug').disabled = false;

      // Switch to first tab "Гњmumi"
      document.querySelectorAll('#articleModal .modal-tab-btn').forEach((btn, idx) => {
        if (idx === 0) btn.classList.add('active');
        else btn.classList.remove('active');
      });
      document.querySelectorAll('#articleModal .modal-tab-content').forEach((tab, idx) => {
        if (idx === 0) tab.classList.add('active');
        else tab.classList.remove('active');
      });

      // Clear cover preview
      document.getElementById('artImagePreviewContainer').style.display = 'none';
      document.getElementById('artImagePreview').src = '';

      if (id) {
        const a = this.cache.articles.find(item => item.id === id);
        if (a) {
          document.getElementById('articleModalTitle').textContent = 'MЙ™qalЙ™ni RedaktЙ™ Et';
          document.getElementById('artEditId').value = a.id;
          document.getElementById('artSlug').value = a.slug;
          document.getElementById('artSlug').disabled = true; // Slug becomes immutable edit key

          document.getElementById('artTitle').value = a.title;
          document.getElementById('artTag').value = a.tag;
          document.getElementById('artReadTime').value = a.readTime;
          document.getElementById('artAuthor').value = a.author;
          document.getElementById('artDate').value = a.date;
          
          document.getElementById('artImage').value = a.image || '';
          if (a.image) {
            document.getElementById('artImagePreview').src = a.image;
            document.getElementById('artImagePreviewContainer').style.display = 'block';
          }

          document.getElementById('artExcerpt').value = a.excerpt || '';
          document.getElementById('artContentText').value = a.content || '';
          document.getElementById('artPublished').checked = !!a.published;
          document.getElementById('artFeatured').checked = !!a.featured;

          document.getElementById('artMetaTitle').value = a.metaTitle || '';
          document.getElementById('artMetaDesc').value = a.metaDesc || '';

          this.updateCharCounter('artMetaTitle', 'artMetaTitleCount', 60);
          this.updateCharCounter('artMetaDesc', 'artMetaDescCount', 160);
        }
      } else {
        document.getElementById('articleModalTitle').textContent = 'Yeni MЙ™qalЙ™ YazД±n';
        document.getElementById('artPublished').checked = false; // default draft
        document.getElementById('artFeatured').checked = false;
        
        document.getElementById('artMetaTitleCount').textContent = '0 / 60 simvol';
        document.getElementById('artMetaDescCount').textContent = '0 / 160 simvol';
      }

      // Add manual slug change listener
      const slugInput = document.getElementById('artSlug');
      slugInput.oninput = () => {
        this.isArtSlugEdited = true;
      };

      document.getElementById('articleModal').classList.add('is-active');
    },

    handleArtTitleInput(e) {
      if (!this.isArtSlugEdited && !document.getElementById('artEditId').value) {
        document.getElementById('artSlug').value = generateSlug(e.target.value);
      }
    },

    updateCharCounter(inputId, countId, recommended) {
      const input = document.getElementById(inputId);
      const counter = document.getElementById(countId);
      if (!input || !counter) return;
      const len = input.value.length;
      counter.textContent = `${len} / ${recommended} simvol`;
      if (len > recommended) {
        counter.style.color = '#ff6b6b';
      } else {
        counter.style.color = 'var(--adm-text-muted)';
      }
    },

    removeArticleImage() {
      document.getElementById('artImage').value = '';
      document.getElementById('artImagePreviewContainer').style.display = 'none';
      document.getElementById('artImagePreview').src = '';
    },

    updateArticlePreview() {
      document.getElementById('artPreviewTitle').textContent = document.getElementById('artTitle').value || 'MЙ™qalЙ™ BaЕџlД±ДџД±';
      document.getElementById('artPreviewHeader').textContent = `${document.getElementById('artTag').value || 'Kateqoriya'} вЂў ${document.getElementById('artDate').value || 'Tarix'} (${document.getElementById('artReadTime').value || 'Oxu vaxtД± yoxdur'})`;
      document.getElementById('artPreviewAuthorBox').textContent = `MГјЙ™llif: ${document.getElementById('artAuthor').value || 'Admin'}`;
      document.getElementById('artPreviewExcerpt').textContent = document.getElementById('artExcerpt').value || 'Excerpt mЙ™qalЙ™ xГјlasЙ™si...';
      
      const imgUrl = document.getElementById('artImage').value;
      const imgBox = document.getElementById('artPreviewCoverImage');
      if (imgUrl) {
        imgBox.innerHTML = `<img src="${imgUrl}" style="max-height:200px; border-radius:4px;" />`;
        imgBox.style.display = 'block';
      } else {
        imgBox.style.display = 'none';
      }

      // Render raw text/html preview safely
      document.getElementById('artPreviewContent').innerHTML = document.getElementById('artContentText').value || '<p>MЙ™qalЙ™ mЙ™tni hЙ™lЙ™ yazД±lmayД±b.</p>';
    },

    async saveArticle(e) {
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
      const editId = document.getElementById('artEditId').value;
      const method = editId ? 'PUT' : 'POST';
      const url = editId ? `${API_BASE}/admin/articles/${editId}` : `${API_BASE}/admin/articles`;

      const payload = {
        id: document.getElementById('artSlug').value, // Use normalized slug as target unique ID
        title: document.getElementById('artTitle').value,
        tag: document.getElementById('artTag').value,
        readTime: document.getElementById('artReadTime').value,
        author: document.getElementById('artAuthor').value,
        date: document.getElementById('artDate').value,
        image: document.getElementById('artImage').value,
        excerpt: document.getElementById('artExcerpt').value,
        content: document.getElementById('artContentText').value,
        published: document.getElementById('artPublished').checked,
        featured: document.getElementById('artFeatured').checked,
        metaTitle: document.getElementById('artMetaTitle').value,
        metaDesc: document.getElementById('artMetaDesc').value
      };

      try {
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json.success) {
          this.showToast('MЙ™qalЙ™ saxlanД±ldД±.');
          this.closeModal('articleModal');
          await this.renderArticles();
        } else {
          alert(json.error?.message || 'Yadda saxlama xЙ™tasД±.');
        }
      } catch (err) {
        console.error(err);
      }
    },

    async togglePublishArticle(id, state) {
      try {
        const res = await fetch(`${API_BASE}/admin/articles/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ published: !!state })
        });
        const json = await res.json();
        if (json.success) {
          this.showToast(state ? 'MЙ™qalЙ™ dЙ™rc olundu.' : 'MЙ™qalЙ™ qaralamaya keГ§irildi.');
          await this.renderArticles();
        }
      } catch (e) {
        console.error(e);
      }
    },

    async duplicateArticle(id) {
      try {
        const res = await fetch(`${API_BASE}/admin/articles/${id}/duplicate`, {
          method: 'POST'
        });
        const json = await res.json();
        if (json.success) {
          this.showToast('MЙ™qalЙ™ kopyalandД±.');
          await this.renderArticles();
        } else {
          alert(json.error?.message || 'Kopyalama alД±nmadД±.');
        }
      } catch (err) {
        console.error(err);
      }
    },

    deleteArticlePrompt(id) {
      this.openDeleteConfirm(() => this.deleteArticle(id), 'MЙ™qalЙ™ni silmЙ™k istЙ™diyinizdЙ™n Й™minsiniz?');
    },

    async deleteArticle(id) {
      try {
        const res = await fetch(`${API_BASE}/admin/articles/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
          this.showToast('MЙ™qalЙ™ silindi.');
          await this.renderArticles();
        } else {
          alert(json.error?.message || 'SilinmЙ™ alД±nmadД±.');
        }
      } catch (e) {
        console.error(e);
      }
    },

    // ==========================================
    // PAGES MANAGER
    // ==========================================
    // SITE BUILDER (BLOCKS)
    // ==========================================
    async renderBuilderBlocks() {
      const grid = document.getElementById('builderBlocksGrid');
      if (!grid) return;
      
      grid.innerHTML = '<p style="padding:2rem; color:var(--adm-text-muted);">YГјklЙ™nir...</p>';

      const pageId = document.getElementById('builderPageSelect')?.value || 'home';
      const res = await fetch(`${API_BASE}/admin/blocks?pageId=${pageId}`);
      const json = await res.json();
      
      if (json.success) {
        this.cache.blocks = json.data;

        if (json.data.length === 0) {
          grid.innerHTML = '<p style="padding:2rem; color:var(--adm-text-muted);">Bu sЙ™hifЙ™dЙ™ heГ§ bir blok yoxdur.</p>';
          return;
        }

        grid.innerHTML = json.data.map((b, index) => `
          <div class="adm-card" style="display:flex; justify-content:space-between; align-items:center; padding: 1rem;">
            <div style="flex:1;">
              <h4 class="adm-card-title" style="margin-bottom:0.25rem;">[${b.order}] ${b.titleAz || b.type} <span style="font-size:0.75rem; color:var(--adm-text-muted); background:var(--adm-border); padding:2px 6px; border-radius:4px; margin-left:10px;">${b.type}</span></h4>
              <p style="font-size:0.8rem; color:var(--adm-text-muted);">${b.subtitleAz || ''}</p>
            </div>
            <div style="display:flex; gap:1rem; align-items:center;">
              <p style="margin-bottom:0; font-size:0.8rem; color:var(--adm-text-muted);">Status: ${b.isActive ? '<span style="color:green; font-weight:bold;">Aktiv</span>' : '<span style="color:orange;">Gizli</span>'}</p>
              <button class="adm-btn adm-btn-secondary" onclick="AdminApp.openBlockModal('${b.id}')">RedaktЙ™ et</button>
              <button class="adm-btn adm-btn-danger" onclick="if(confirm('Bloku silmЙ™k istЙ™diyinizЙ™ Й™minsiniz?')) AdminApp.deleteBlock('${b.id}')">Sil</button>
            </div>
          </div>
        `).join('');
      }
    },

    openBlockModal(id = null) {
      document.getElementById('blockModal').classList.add('is-active');
      const form = document.getElementById('blockForm');
      form.reset();
      document.getElementById('blockEditId').value = '';
      
      const pageId = document.getElementById('builderPageSelect')?.value || 'home';
      document.getElementById('blockPageId').value = pageId;

      if (id) {
        const b = this.cache.blocks?.find(item => item.id === id);
        if (b) {
          document.getElementById('blockModalTitle').textContent = 'Bloku RedaktЙ™ Et';
          document.getElementById('blockEditId').value = b.id;
          document.getElementById('blockType').value = b.type || 'html';
          document.getElementById('blockOrder').value = b.order || 0;
          document.getElementById('blockTitleAz').value = b.titleAz || '';
          document.getElementById('blockTitleEn').value = b.titleEn || '';
          document.getElementById('blockTitleRu').value = b.titleRu || '';
          document.getElementById('blockSubtitleAz').value = b.subtitleAz || '';
          document.getElementById('blockSubtitleEn').value = b.subtitleEn || '';
          document.getElementById('blockSubtitleRu').value = b.subtitleRu || '';
          document.getElementById('blockContentAz').value = b.contentAz || '';
          document.getElementById('blockMediaUrl').value = b.mediaUrl || '';
          document.getElementById('blockActive').checked = b.isActive !== false;
        }
      } else {
        document.getElementById('blockModalTitle').textContent = 'Yeni Blok';
        // Auto-increment order
        const maxOrder = this.cache.blocks?.reduce((max, block) => Math.max(max, block.order || 0), 0) || 0;
        document.getElementById('blockOrder').value = maxOrder + 1;
      }
      this.handleBlockTypeChange();
    },

    handleBlockTypeChange() {
      const type = document.getElementById('blockType').value;
      const contentGroup = document.getElementById('blockContentGroup');
      const mediaGroup = document.getElementById('blockMediaGroup');
      
      // Hide content by default, show based on type
      contentGroup.style.display = 'none';
      mediaGroup.style.display = 'none';

      if (type === 'rich_text') {
        contentGroup.style.display = 'block';
      }
      if (type === 'hero_dark') {
        mediaGroup.style.display = 'block'; // Background image/video
      }
    },

    async saveBlock(e) {
      if (e) e.preventDefault();
      const editId = document.getElementById('blockEditId').value;
      const method = editId ? 'PUT' : 'POST';
      const url = editId ? `${API_BASE}/admin/blocks/${editId}` : `${API_BASE}/admin/blocks`;

      const payload = {
        pageId: document.getElementById('blockPageId').value,
        type: document.getElementById('blockType').value,
        order: parseInt(document.getElementById('blockOrder').value) || 0,
        titleAz: document.getElementById('blockTitleAz').value,
        titleEn: document.getElementById('blockTitleEn').value,
        titleRu: document.getElementById('blockTitleRu').value,
        subtitleAz: document.getElementById('blockSubtitleAz').value,
        subtitleEn: document.getElementById('blockSubtitleEn').value,
        subtitleRu: document.getElementById('blockSubtitleRu').value,
        contentAz: document.getElementById('blockContentAz').value,
        mediaUrl: document.getElementById('blockMediaUrl').value,
        isActive: document.getElementById('blockActive').checked
      };

      const submitBtn = e.target.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Yadda saxlanД±lД±r...';
      submitBtn.disabled = true;

      try {
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        
        if (json.success) {
          this.showToast('Blok uДџurla yadda saxlanД±ldД±!');
          this.closeModal('blockModal');
          await this.renderBuilderBlocks();
        } else {
          alert(json.error?.message || 'XЙ™ta baЕџ verdi.');
        }
      } catch (err) {
        console.error(err);
        alert('ЕћЙ™bЙ™kЙ™ xЙ™tasД±.');
      } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    },

    async deleteBlock(id) {
      try {
        const res = await fetch(`${API_BASE}/admin/blocks/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
          this.showToast('Blok silindi.');
          await this.renderBuilderBlocks();
        } else {
          alert(json.error?.message || 'SilinmЙ™ alД±nmadД±.');
        }
      } catch (e) {
        console.error(e);
      }
    },


    // Jobs Manager state & controllers
    isJobIdEdited: false,

    async renderJobs() {
      const grid = document.getElementById('jobsGrid');
      if (!grid) return;
      grid.innerHTML = '<div class="spinner" style="margin:3rem auto; display:block;"></div>';
      const res = await fetch(`${API_BASE}/admin/jobs`);
      const json = await res.json();
      if (json.success) {
        this.cache.jobs = json.data;

        // Dynamic departments extraction
        const depts = Array.from(new Set(json.data.map(j => j.department).filter(Boolean)));
        const deptSelect = document.getElementById('jobDeptFilter');
        if (deptSelect) {
          const currentVal = deptSelect.value;
          deptSelect.innerHTML = '<option value="ALL">BГјtГјn DepartamentlЙ™r</option>' + 
            depts.map(d => `<option value="${d}">${d}</option>`).join('');
          deptSelect.value = currentVal;
        }

        // Apply filters
        const searchVal = document.getElementById('jobSearch')?.value.toLowerCase() || '';
        const statusVal = document.getElementById('jobStatusFilter')?.value || 'ALL';
        const deptVal = document.getElementById('jobDeptFilter')?.value || 'ALL';
        const typeVal = document.getElementById('jobTypeFilter')?.value || 'ALL';

        let filtered = json.data.filter(j => {
          const matchSearch = j.title.toLowerCase().includes(searchVal) || 
                              j.id.toLowerCase().includes(searchVal) || 
                              j.department.toLowerCase().includes(searchVal) || 
                              j.location.toLowerCase().includes(searchVal);
          
          let matchStatus = true;
          if (statusVal === 'ACTIVE') matchStatus = j.active === true;
          if (statusVal === 'INACTIVE') matchStatus = j.active === false;

          let matchDept = true;
          if (deptVal !== 'ALL') matchDept = j.department === deptVal;

          let matchType = true;
          if (typeVal !== 'ALL') matchType = j.type === typeVal;

          return matchSearch && matchStatus && matchDept && matchType;
        });

        grid.innerHTML = filtered.map(j => `
          <div class="adm-item-card" style="padding:1.5rem;">
            <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem; align-items:center;">
              <span class="adm-card-tag">${j.department}</span>
              <span style="font-size:0.8rem; color:var(--adm-text-muted); font-weight:700;">SД±ra: ${j.order}</span>
            </div>
            <h4 class="adm-card-title">${j.title}</h4>
            <p style="font-size:0.8rem; color:var(--adm-text-muted); margin-bottom:0.75rem;">${j.location} | ${j.type}</p>
            
            <div style="margin: 0.75rem 0; display:flex; gap:0.25rem; align-items:center; flex-wrap:wrap;">
              <span class="badge-status ${j.active ? 'new' : 'rejected'}">${j.active ? 'Aktiv (Active)' : 'Deaktiv (Inactive)'}</span>
              <button class="adm-btn adm-btn-secondary" style="padding:0.25rem 0.5rem; font-size:0.75rem;" onclick="AdminApp.toggleActiveJob('${j.id}', ${!j.active})">
                ${j.active ? 'Deaktiv et' : 'Aktiv et'}
              </button>
            </div>

            <div style="font-size:0.85rem; color:#fff; font-weight:700; margin-bottom:1rem;">
              рџ“© MГјraciЙ™t sayД±: ${j._count?.applications || 0}
            </div>

            <div class="adm-card-actions">
              <button class="adm-btn adm-btn-secondary" onclick="AdminApp.openJobModal('${j.id}')">вњЏпёЏ Edit</button>
              <button class="adm-btn adm-btn-secondary" onclick="AdminApp.duplicateJob('${j.id}')">рџ“‹ Kopyala</button>
              <button class="adm-btn adm-btn-danger" onclick="AdminApp.deleteJobPrompt('${j.id}')">Sil</button>
            </div>
          </div>
        `).join('');
      }
    },

    openJobModal(id = null) {
      const form = document.getElementById('jobForm');
      form.reset();
      document.getElementById('jobEditId').value = '';
      this.isJobIdEdited = false;
      document.getElementById('jobId').disabled = false;

      // Switch to first tab "Гњmumi"
      document.querySelectorAll('#jobModal .modal-tab-btn').forEach((btn, idx) => {
        if (idx === 0) btn.classList.add('active');
        else btn.classList.remove('active');
      });
      document.querySelectorAll('#jobModal .modal-tab-content').forEach((tab, idx) => {
        if (idx === 0) tab.classList.add('active');
        else tab.classList.remove('active');
      });

      if (id) {
        const j = this.cache.jobs.find(item => item.id === id);
        if (j) {
          document.getElementById('jobEditId').value = j.id;
          document.getElementById('jobId').value = j.id;
          document.getElementById('jobId').disabled = true; // Immutable slug key
          document.getElementById('jobTitle').value = j.title;
          document.getElementById('jobDept').value = j.department;
          document.getElementById('jobLoc').value = j.location;
          document.getElementById('jobType').value = j.type;
          document.getElementById('jobActive').checked = !!j.active;
          document.getElementById('jobOrder').value = j.order || 0;
          document.getElementById('jobDesc').value = j.description || '';
          document.getElementById('jobReqs').value = (j.requirements || []).join('\n');
        }
      } else {
        document.getElementById('jobModalTitle').textContent = 'Yeni Vakansiya YaradД±n';
        document.getElementById('jobActive').checked = true;
        document.getElementById('jobOrder').value = 0;
      }

      // Add manual slug change listener
      const idInput = document.getElementById('jobId');
      idInput.oninput = () => {
        this.isJobIdEdited = true;
      };

      document.getElementById('jobModal').classList.add('is-active');
    },

    handleJobTitleInput(e) {
      if (!this.isJobIdEdited && !document.getElementById('jobEditId').value) {
        document.getElementById('jobId').value = generateSlug(e.target.value);
      }
    },

    async saveJob(e) {
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
      const editId = document.getElementById('jobEditId').value;
      const method = editId ? 'PUT' : 'POST';
      const url = editId ? `${API_BASE}/admin/jobs/${editId}` : `${API_BASE}/admin/jobs`;

      const payload = {
        id: document.getElementById('jobId').value,
        title: document.getElementById('jobTitle').value,
        department: document.getElementById('jobDept').value,
        location: document.getElementById('jobLoc').value,
        type: document.getElementById('jobType').value,
        active: document.getElementById('jobActive').checked,
        order: Number(document.getElementById('jobOrder').value) || 0,
        description: document.getElementById('jobDesc').value,
        requirements: document.getElementById('jobReqs').value.split('\n').filter(Boolean)
      };

      try {
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json.success) {
          this.showToast('Vakansiya saxlanД±ldД±.');
          this.closeModal('jobModal');
          await this.renderJobs();
        } else {
          alert(json.error?.message || 'Yadda saxlama xЙ™tasД±.');
        }
      } catch (err) {
        console.error(err);
      }
    },

    async toggleActiveJob(id, state) {
      try {
        const res = await fetch(`${API_BASE}/admin/jobs/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ active: !!state })
        });
        const json = await res.json();
        if (json.success) {
          this.showToast(state ? 'Vakansiya aktivlЙ™Еџdirildi.' : 'Vakansiya deaktiv edildi.');
          await this.renderJobs();
        }
      } catch (e) {
        console.error(e);
      }
    },

    async duplicateJob(id) {
      try {
        const res = await fetch(`${API_BASE}/admin/jobs/${id}/duplicate`, {
          method: 'POST'
        });
        const json = await res.json();
        if (json.success) {
          this.showToast('Vakansiya kopyalandД±.');
          await this.renderJobs();
        } else {
          alert(json.error?.message || 'Kopyalama alД±nmadД±.');
        }
      } catch (err) {
        console.error(err);
      }
    },

    deleteJobPrompt(id) {
      const j = this.cache.jobs.find(item => item.id === id);
      if (j && j._count && j._count.applications > 0) {
        alert('Bu vakansiya ГјzrЙ™ daxil olmuЕџ mГјraciЙ™tlЙ™r var. SilinmЙ™ bloklandД±. VakansiyanД± passivlЙ™ЕџdirmЙ™k ГјГ§Гјn onun statusunu qeyri-aktiv edin.');
        return;
      }
      this.openDeleteConfirm(() => this.deleteJob(id), 'Bu vakansiyanД± silmЙ™k istЙ™diyinizdЙ™n Й™minsiniz?');
    },

    async deleteJob(id) {
      try {
        const res = await fetch(`${API_BASE}/admin/jobs/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
          this.showToast('Vakansiya silindi.');
          await this.renderJobs();
        } else {
          alert(json.error?.message || 'SilinmЙ™ alД±nmadД±.');
        }
      } catch (e) {
        console.error(e);
      }
    },

    // Applications Manager
    async renderApplications() {
      const container = document.getElementById('applicationsList');
      if (!container) return;
      container.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:3rem;"><div class="spinner" style="margin:0 auto; display:block;"></div></td></tr>';
      const res = await fetch(`${API_BASE}/admin/applications`);
      const json = await res.json();
      if (json.success) {
        this.cache.applications = json.data;

        // Dynamic jobs extraction
        const jobTitles = Array.from(new Set(json.data.map(a => a.job?.title || a.jobId).filter(Boolean)));
        const jobSelect = document.getElementById('applicationJobFilter');
        if (jobSelect) {
          const currentVal = jobSelect.value;
          jobSelect.innerHTML = '<option value="ALL">BГјtГјn Vakansiyalar</option>' + 
            jobTitles.map(t => `<option value="${t}">${t}</option>`).join('');
          jobSelect.value = currentVal;
        }

        // Apply filters
        const searchVal = document.getElementById('applicationSearch')?.value.toLowerCase() || '';
        const statusVal = document.getElementById('applicationStatusFilter')?.value || 'ALL';
        const filterJobVal = document.getElementById('applicationJobFilter')?.value || 'ALL';
        const dateVal = document.getElementById('applicationDateFilter')?.value || 'ALL';

        let filtered = json.data.filter(item => {
          const jobTitle = item.job?.title || item.jobId || '';
          const matchSearch = item.name.toLowerCase().includes(searchVal) || 
                              item.email.toLowerCase().includes(searchVal) || 
                              item.phone.toLowerCase().includes(searchVal) || 
                              jobTitle.toLowerCase().includes(searchVal);
          
          let matchStatus = true;
          if (statusVal !== 'ALL') matchStatus = item.status === statusVal;

          let matchJob = true;
          if (filterJobVal !== 'ALL') matchJob = jobTitle === filterJobVal;

          let matchDate = true;
          if (dateVal !== 'ALL') {
            const createdTime = new Date(item.createdAt).getTime();
            const now = Date.now();
            if (dateVal === 'TODAY') {
              const todayStart = new Date().setHours(0,0,0,0);
              matchDate = createdTime >= todayStart;
            } else if (dateVal === 'WEEK') {
              matchDate = now - createdTime <= 7 * 24 * 60 * 60 * 1000;
            } else if (dateVal === 'MONTH') {
              matchDate = now - createdTime <= 30 * 24 * 60 * 60 * 1000;
            }
          }

          return matchSearch && matchStatus && matchJob && matchDate;
        });

        if (filtered.length === 0) {
          container.innerHTML = '<p style="text-align:center; color:var(--adm-text-muted); padding:2rem;">HeГ§ bir mГјraciЙ™t tapД±lmadД±.</p>';
          return;
        }

        container.innerHTML = `
          <table class="inbox-table">
            <thead>
              <tr>
                <th>Ad Soyad</th>
                <th>Vakansiya</th>
                <th>Tarix</th>
                <th>Status</th>
                <th>CV MГ¶vcudluДџu</th>
                <th>ЖЏmЙ™liyyatlar</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(item => `
                <tr>
                  <td><strong>${item.name}</strong><br><small>${item.email} / ${item.phone || '-'}</small></td>
                  <td>${item.job?.title || item.jobId}</td>
                  <td>${new Date(item.createdAt).toLocaleDateString('az-AZ')}</td>
                  <td><span class="badge-status ${item.status.toLowerCase()}">${item.status}</span></td>
                  <td>${item.cvUrl ? '<span style="color:#10b981; font-weight:700;">CV mГ¶vcuddur вњ…</span>' : '<span style="color:var(--adm-text-muted);">Yoxdur</span>'}</td>
                  <td>
                    <button class="adm-btn adm-btn-secondary" style="padding:0.4rem 0.8rem; font-size:0.8rem;" onclick="AdminApp.viewApplication('${item.id}')">Bax</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }
    },

    async updateApplicationStatus(id, status) {
      try {
        const res = await fetch(`${API_BASE}/admin/applications/${id}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        });
        const json = await res.json();
        if (json.success) {
          this.showToast('Status yenilЙ™ndi.');
          this.closeModal('applicationDetailModal');
          await this.renderApplications();
        } else {
          alert(json.error?.message || 'Status yenilЙ™nmЙ™ xЙ™tasД±.');
        }
      } catch (e) {
        console.error(e);
      }
    },


    // Inquiries (Inbox) Manager
    async renderInquiries() {
      const container = document.getElementById('inboxList');
      if (!container) return;
      container.innerHTML = '<div class="spinner" style="margin:2rem auto; display:block;"></div>';

      const search = document.getElementById('inqSearchInput')?.value || '';
      const status = document.getElementById('inqStatusFilter')?.value || 'all';

      let url = `${API_BASE}/admin/inquiries?`;
      if (status !== 'all') url += `status=${status}&`;
      if (search) url += `search=${encodeURIComponent(search)}`;

      try {
        const res = await fetch(url);
        const json = await res.json();
        if (json.success) {
          this.cache.inquiries = json.data;
          if (json.data.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:var(--adm-text-muted); padding:2rem;">GЙ™lЙ™n mГјraciЙ™t tapД±lmadД±.</p>';
            return;
          }
          container.innerHTML = json.data.map(item => {
            let statusColor = '#666';
            if(item.status === 'NEW') statusColor = 'var(--adm-cyan)';
            if(item.status === 'IN_PROGRESS') statusColor = 'var(--adm-warning)';
            if(item.status === 'CONTACTED') statusColor = 'var(--adm-success)';
            return `
            <div style="background:var(--adm-sidebar); padding:1.25rem; border-radius:8px; border:1px solid var(--adm-border); display:flex; flex-direction:column; gap:1rem;">
              <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                  <h4 style="font-size:1.1rem; font-weight:800; margin-bottom:0.25rem;">${item.name}</h4>
                  <div style="font-size:0.85rem; color:var(--adm-text-muted);">${item.company} | ${item.email} | ${item.phone || '-'}</div>
                </div>
                <div style="text-align:right;">
                  <span style="display:inline-block; font-size:0.7rem; font-weight:800; padding:0.25rem 0.5rem; border-radius:4px; background:rgba(255,255,255,0.1); color:${statusColor};">${item.status}</span>
                  <div style="font-size:0.75rem; color:var(--adm-text-muted); margin-top:0.35rem;">${new Date(item.createdAt).toLocaleDateString('az-AZ')}</div>
                </div>
              </div>
              <p style="font-size:0.95rem; color:#ccc; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${item.message}</p>
              <div style="display:flex; gap:0.5rem; justify-content:flex-end; border-top:1px solid var(--adm-border); padding-top:1rem;">
                <button class="adm-btn adm-btn-secondary" style="padding:0.4rem 0.75rem; font-size:0.8rem;" onclick="AdminApp.deleteInquiry('${item.id}')">Sil</button>
                <button class="adm-btn adm-btn-primary" style="padding:0.4rem 0.75rem; font-size:0.8rem;" onclick="AdminApp.openInquiryModal('${item.id}')">AГ§ / RedaktЙ™ Et</button>
              </div>
            </div>
          `}).join('');
        }
      } catch (err) {
        console.error(err);
      }
    },

    openInquiryModal(id) {
      const item = this.cache.inquiries.find(i => i.id === id);
      if (!item) return;

      document.getElementById('inqEditId').value = item.id;
      document.querySelector('.inqName').innerText = item.name || '-';
      document.querySelector('.inqEmail').innerText = item.email || '-';
      document.querySelector('.inqPhone').innerText = item.phone || '-';
      document.querySelector('.inqCompany').innerText = item.company || '-';
      document.getElementById('inqService').innerText = item.service || '-';
      document.querySelector('.inqMessage').innerText = item.message || '-';
      document.querySelector('.inqDate').innerText = new Date(item.createdAt).toLocaleDateString('az-AZ');
      
      const statusSelect = document.getElementById('inqStatus');
      if (statusSelect) {
        // Map old values if needed
        let statusVal = item.status;
        if (statusVal === 'Yeni') statusVal = 'NEW';
        if (statusVal === 'BaxД±lД±b') statusVal = 'IN_PROGRESS';
        if (statusVal === 'Arxiv') statusVal = 'CLOSED';
        statusSelect.value = statusVal || 'NEW';
      }

      document.getElementById('inqAssignedTo').value = item.assignedTo || '';
      document.getElementById('inqInternalNote').value = item.internalNote || '';

      document.getElementById('inquiryDetailModal').classList.add('is-active');
    },

    async saveInquiry(e) {
      if (e) e.preventDefault();
      const id = document.getElementById('inqEditId').value;
      if (!id) return;

      const payload = {
        status: document.getElementById('inqStatus').value,
        assignedTo: document.getElementById('inqAssignedTo').value,
        internalNote: document.getElementById('inqInternalNote').value
      };

      try {
        const res = await fetch(`${API_BASE}/admin/inquiries/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json.success) {
          this.showToast('MГјraciЙ™t yadda saxlanД±ldД±.');
          this.closeModal('inquiryDetailModal');
          this.renderInquiries();
        } else {
          this.showToast(json.error?.message || 'XЙ™ta baЕџ verdi.', true);
        }
      } catch (err) {
        console.error(err);
      }
    },

    async deleteInquiry(id) {
      if (!confirm('Bu mГјraciЙ™ti hЙ™miЕџЙ™lik silmЙ™k istЙ™diyinizЙ™ Й™minsiniz?')) return;
      try {
        const res = await fetch(`${API_BASE}/admin/inquiries/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
          this.showToast('MГјraciЙ™t silindi.');
          this.renderInquiries();
        } else {
          this.showToast('XЙ™ta baЕџ verdi.', true);
        }
      } catch (err) {
        console.error(err);
      }
    },

    // Newsletter Subscribers
    async renderSubscribers() {
      const container = document.getElementById('subscribersList');
      if (!container) return;
      container.innerHTML = '<div class="spinner" style="margin:3rem auto; display:block;"></div>';
      const res = await fetch(`${API_BASE}/admin/subscribers`);
      const json = await res.json();
      if (json.success) {
        this.cache.subscribers = json.data;
        if (json.data.length === 0) {
          container.innerHTML = '<p style="text-align:center; color:var(--adm-text-muted); padding:2rem;">AbunЙ™Г§i tapД±lmadД±.</p>';
          return;
        }
        container.innerHTML = `
          <table class="inbox-table">
            <thead>
              <tr>
                <th>E-poГ§t ГњnvanД±</th>
                <th>Qeydiyyat Tarixi</th>
              </tr>
            </thead>
            <tbody>
              ${json.data.map(item => `
                <tr>
                  <td><strong>${item.email}</strong></td>
                  <td>${new Date(item.createdAt).toLocaleString('az-AZ')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }
    },

    copyAllSubscribers() {
      if (!this.cache.subscribers || this.cache.subscribers.length === 0) return;
      const emails = this.cache.subscribers.map(s => s.email).join(', ');
      navigator.clipboard.writeText(emails);
      this.showToast('BГјtГјn e-poГ§tlar kopyalandД±.');
    },

    // Audit Logs
    async renderAuditLogs() {
      const container = document.getElementById('auditLogsList');
      if (!container) return;
      container.innerHTML = '<div class="spinner" style="margin:3rem auto; display:block;"></div>';
      const res = await fetch(`${API_BASE}/admin/audit-logs`);
      const json = await res.json();
      if (json.success) {
        container.innerHTML = `
          <table class="audit-table">
            <thead>
              <tr>
                <th>Д°stifadЙ™Г§i</th>
                <th>ЖЏmЙ™liyyat</th>
                <th>Model</th>
                <th>ID</th>
                <th>Tarix</th>
              </tr>
            </thead>
            <tbody>
              ${json.data.map(log => `
                <tr>
                  <td><strong>${log.adminUser?.name || 'Sistem'}</strong><br><small>${log.adminUser?.email || ''}</small></td>
                  <td><span class="badge-status reviewing">${log.action}</span></td>
                  <td>${log.entity}</td>
                  <td><code>${log.entityId || '-'}</code></td>
                  <td>${new Date(log.timestamp).toLocaleString('az-AZ')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }
    },

    // ==========================================
    // TRANSLATIONS / STATIC TEXTS MANAGER
    // ==========================================
    async renderTranslations() {
      const tbody = document.getElementById('translationsGrid');
      if (!tbody) return;

      try {
        const res = await fetch(`${API_BASE}/admin/translations`);
        const json = await res.json();

        if (json.success && json.data) {
          const translations = json.data;
          
          if (translations.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:2rem; color:var(--adm-text-muted);">TЙ™rcГјmЙ™ tapД±lmadД±.</td></tr>';
            return;
          }

          tbody.innerHTML = translations.map(t => `
            <tr data-key="${t.key}">
              <td><strong style="font-size:0.85rem;">${t.key}</strong></td>
              <td><textarea class="form-input tr-az" style="min-height:60px; font-size:0.85rem; margin-bottom:0;">${t.az || ''}</textarea></td>
              <td><textarea class="form-input tr-en" style="min-height:60px; font-size:0.85rem; margin-bottom:0;">${t.en || ''}</textarea></td>
              <td><textarea class="form-input tr-ru" style="min-height:60px; font-size:0.85rem; margin-bottom:0;">${t.ru || ''}</textarea></td>
            </tr>
          `).join('');
        }
      } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:2rem; color:red;">XЙ™ta baЕџ verdi</td></tr>';
      }
    },

    async saveTranslations(e) {
      if (e) e.preventDefault();
      const btn = e.target;
      const originalText = btn.textContent;
      btn.textContent = 'SaxlanД±lД±r...';
      btn.disabled = true;

      const rows = document.querySelectorAll('#translationsGrid tr[data-key]');
      const translations = [];

      rows.forEach(row => {
        const key = row.getAttribute('data-key');
        const az = row.querySelector('.tr-az').value;
        const en = row.querySelector('.tr-en').value;
        const ru = row.querySelector('.tr-ru').value;

        translations.push({ key, az, en, ru });
      });

      try {
        const res = await fetch(`${API_BASE}/admin/translations`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ translations })
        });
        const json = await res.json();

        if (json.success) {
          this.showToast('BГјtГјn tЙ™rcГјmЙ™lЙ™r yadda saxlanД±ldД±!');
          await this.renderTranslations();
        } else {
          alert(json.error?.message || 'XЙ™ta baЕџ verdi.');
        }
      } catch (err) {
        console.error(err);
        alert('ЕћЙ™bЙ™kЙ™ xЙ™tasД±.');
      } finally {
        btn.textContent = originalText;
        btn.disabled = false;
      }
    },

    // Settings (Hero texts and Footer)
    async loadSettings() {
      try {
        const res = await fetch(`${API_BASE}/admin/settings`, { headers: { 'Authorization': `Bearer ${this.token}` } });
        const json = await res.json();
        if (json.success) {
          const s = json.data;
          document.getElementById('setHeroTag').value = s.heroTag || '';
          document.getElementById('setHeroHeadline').value = s.heroHeadline || '';
          document.getElementById('setHeroSubtitle').value = s.heroSubtitle || '';
          document.getElementById('setTrailLogos').value = s.trailLogos || '';
          
          document.getElementById('setShowreelVideoUrl').value = s.showreelVideoUrl || '';
          this.renderMediaPreview(s.showreelVideoUrl, 'showreelVideoSelection', 'Vimeo / Video SeГ§');
          document.getElementById('setShowreelPosterUrl').value = s.showreelPosterUrl || '';
          this.renderMediaPreview(s.showreelPosterUrl, 'showreelPosterSelection', 'Poster SeГ§');
          
          document.getElementById('setContactEmail').value = s.contactEmail || '';
          document.getElementById('setContactPhone').value = s.contactPhone || '';
          document.getElementById('setContactAddress').value = s.contactAddress || '';
          document.getElementById('setWorkingHours').value = s.workingHours || '';
          
          document.getElementById('setSocialInstagram').value = s.socialInstagram || '';
          document.getElementById('setSocialFacebook').value = s.socialFacebook || '';
          document.getElementById('setSocialLinkedIn').value = s.socialLinkedIn || '';
          document.getElementById('setSocialYouTube').value = s.socialYouTube || '';
          document.getElementById('setSocialTikTok').value = s.socialTikTok || '';
          document.getElementById('setSocialVimeo').value = s.socialVimeo || '';
          
          document.getElementById('setCopyrightText').value = s.copyrightText || '';
    document.getElementById('setKineticText').value = s.kineticText || '';
    document.getElementById('setKineticWords').value = s.kineticWords || '';
    document.getElementById('setSplitText').value = s.splitText || '';
          
          // JSON Arrays
          this.settingsOffices = Array.isArray(s.offices) ? s.offices : [];
          if(typeof s.offices === 'string') { try { this.settingsOffices = JSON.parse(s.offices) || []; } catch(e){} }
          this.renderOfficesList();
          
          this.settingsFooterLinks = Array.isArray(s.footerLinks) ? s.footerLinks : [];
          if(typeof s.footerLinks === 'string') { try { this.settingsFooterLinks = JSON.parse(s.footerLinks) || []; } catch(e){} }
          this.renderFooterLinksList();
        }
      } catch (err) {
        console.error(err);
      }
    },

    async saveSettings(e) {
      // FIX 1: HTML-de `AdminApp.saveSettings()` argumentsiz cagirilirdi ->
      //        `e.preventDefault()` TypeError atirdi ve YADDA SAXLAMA HEC VAXT ISLEMIRDI.
      if (e && typeof e.preventDefault === 'function') e.preventDefault();

      // FIX 2: `setSiteTitle` HTML-de movcud deyil -> getElementById(null).value
      //        TypeError atirdi. Indi tehlukesiz oxuyucu istifade olunur.
      const v = function (id) {
        const el = document.getElementById(id);
        return el ? el.value : '';
      };

      const payload = {
        siteTitle: v('setSiteTitle'),
        heroTag: v('setHeroTag'),
        heroHeadline: v('setHeroHeadline'),
        heroSubtitle: v('setHeroSubtitle'),
        trailLogos: v('setTrailLogos'),

        showreelVideoUrl: v('setShowreelVideoUrl'),
        showreelPosterUrl: v('setShowreelPosterUrl'),

        contactEmail: v('setContactEmail'),
        contactPhone: v('setContactPhone'),
        contactAddress: v('setContactAddress'),
        workingHours: v('setWorkingHours'),

        socialInstagram: v('setSocialInstagram'),
        socialFacebook: v('setSocialFacebook'),
        socialLinkedIn: v('setSocialLinkedIn'),
        socialYouTube: v('setSocialYouTube'),
        socialTikTok: v('setSocialTikTok'),
        socialVimeo: v('setSocialVimeo'),

        copyrightText: v('setCopyrightText')
      };

      try {
        const res = await fetch(`${API_BASE}/admin/settings`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json.success) {
          this.showToast('Sayt tЙ™nzimlЙ™mЙ™lЙ™ri yadda saxlanД±ldД±.');
          if (window.SectionSaveBar) {
            const sv = document.getElementById('view-settings');
            window.SectionSaveBar.snapshot(sv);
            window.SectionSaveBar.toggle(sv);
          }
        } else {
          alert('XЙ™ta: ' + (json.error ? json.error.message : 'NamЙ™lum xЙ™ta'));
        }
      } catch (err) {
        console.error(err);
      }
    },

    // Admin Users Manager
    async renderUsers() {
      const container = document.getElementById('usersList');
      if (!container) return;
      container.innerHTML = '<div class="spinner" style="margin:3rem auto; display:block;"></div>';
      const res = await fetch(`${API_BASE}/admin/users`);
      const json = await res.json();
      if (json.success) {
        this.cache.users = json.data;
        container.innerHTML = `
          <table class="inbox-table">
            <thead>
              <tr>
                <th>Ad Soyad</th>
                <th>E-poГ§t</th>
                <th>Rol</th>
                <th>Status</th>
                <th>ЖЏmЙ™liyyatlar</th>
              </tr>
            </thead>
            <tbody>
              ${json.data.map(u => `
                <tr>
                  <td><strong>${u.name}</strong></td>
                  <td>${u.email}</td>
                  <td><span class="badge-status hired">${u.role}</span></td>
                  <td><span class="badge-status ${u.active ? 'new' : 'rejected'}">${u.active ? 'Aktiv' : 'Deaktiv'}</span></td>
                  <td>
                    <button class="adm-btn adm-btn-secondary" style="padding:0.4rem 0.8rem; font-size:0.8rem;" onclick="AdminApp.openUserModal('${u.id}')">Edit</button>
                    ${this.user.id !== u.id ? `<button class="adm-btn adm-btn-danger" style="padding:0.4rem 0.8rem; font-size:0.8rem;" onclick="AdminApp.deleteUserPrompt('${u.id}')">Sil</button>` : ''}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }
    },

    openUserModal(id = null) {
      const form = document.getElementById('userForm');
      form.reset();
      document.getElementById('userEditId').value = '';

      if (id) {
        const u = this.cache.users.find(item => item.id === id);
        if (u) {
          document.getElementById('userModalTitle').textContent = 'Д°nzibatГ§Д±nД± RedaktЙ™ Et';
          document.getElementById('userEditId').value = u.id;
          document.getElementById('userName').value = u.name;
          document.getElementById('userEmail').value = u.email;
          document.getElementById('userRole').value = u.role;
          document.getElementById('userActive').checked = !!u.active;
        }
      } else {
        document.getElementById('userModalTitle').textContent = 'Yeni Д°nzibatГ§Д± YaradД±n';
      }
      document.getElementById('userModal').classList.add('is-active');
    },

    async saveUser(e) {
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
      const editId = document.getElementById('userEditId').value;
      const method = editId ? 'PUT' : 'POST';
      const url = editId ? `${API_BASE}/admin/users/${editId}` : `${API_BASE}/admin/users`;

      const payload = {
        name: document.getElementById('userName').value,
        email: document.getElementById('userEmail').value,
        role: document.getElementById('userRole').value,
        active: document.getElementById('userActive').checked
      };

      const pass = document.getElementById('userPassword').value;
      if (pass) payload.password = pass;

      try {
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json.success) {
          this.showToast('Д°nzibatГ§Д± yadda saxlanД±ldД±.');
          this.closeModal('userModal');
          await this.renderUsers();
        } else {
          alert(json.error?.message || 'Yadda saxlama xЙ™tasД±.');
        }
      } catch (err) {
        console.error(err);
      }
    },

    deleteUserPrompt(id) {
      this.openDeleteConfirm(() => this.deleteUser(id), 'Д°nzibatГ§Д±nД± silmЙ™k istЙ™diyinizdЙ™n Й™minsiniz?');
    },

    async deleteUser(id) {
      try {
        const res = await fetch(`${API_BASE}/admin/users/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
          this.showToast('Д°nzibatГ§Д± silindi.');
          await this.renderUsers();
        }
      } catch (e) {
        console.error(e);
      }
    },

    // 4. Modal and Tab Actions
    switchModalTab(event, contentId) {
      event.preventDefault();
      const content = document.getElementById(contentId);
      if (!content) return;

      const parent = content.closest('.adm-modal-content');
      parent.querySelectorAll('.modal-tab-btn').forEach(btn => {
        if (btn === event.currentTarget) btn.classList.add('active');
        else btn.classList.remove('active');
      });

      parent.querySelectorAll('.modal-tab-content').forEach(c => {
        if (c === content) c.classList.add('active');
        else c.classList.remove('active');
      });
    },

    closeModal(id) {
      document.getElementById(id)?.classList.remove('is-active');
      if (!document.querySelector('.adm-modal-backdrop.is-active')) {
        document.body.style.overflow = '';
      }
    },

    openModal(id) {
      var m = document.getElementById(id);
      if (!m) { console.warn('[Brandfull] Modal tapilmadi:', id); return; }
      m.classList.add('is-active');
      document.body.style.overflow = 'hidden';
    },

    // FIX: bu metod cagirilirdi (loadSettings), lakin tanimli deyildi ->
    // "this.renderMediaPreview is not a function" xetasi Ayarlar bolmesini sindirirdi.
    renderMediaPreview(url, containerId, emptyLabel) {
      var box = document.getElementById(containerId);
      if (!box) return;
      if (!url) {
        box.innerHTML = '<span class="adm-text-muted" style="font-size:0.8rem;">' +
          (emptyLabel || 'Secilmeyib') + '</span>';
        return;
      }
      var isVideo = /\.(mp4|webm|mov)$/i.test(url) || /vimeo|youtube/i.test(url);
      box.innerHTML =
        '<div class="adm-asset-selection" style="display:flex;align-items:center;gap:0.6rem;margin-top:0.5rem;">' +
          (isVideo
            ? '<span style="font-size:1.2rem;">&#127916;</span>'
            : '<img src="' + url + '" alt="" style="width:44px;height:44px;object-fit:cover;border-radius:6px;border:1px solid var(--adm-border);" />') +
          '<span style="font-size:0.78rem;color:var(--adm-text-muted);word-break:break-all;flex:1;">' + url + '</span>' +
        '</div>';
    },

    // Confirm Modal Warning
    openDeleteConfirm(callback, message = 'Bu faylД± vЙ™ ya qeydi hЙ™qiqЙ™tЙ™n silmЙ™k istЙ™yirsiniz?') {
      this.deleteCallback = callback;
      const msg = document.getElementById('deleteConfirmMessage');
      if (msg) msg.textContent = message;
      document.getElementById('deleteConfirmModal').classList.add('is-active');
    },

    // Clipboard Copy Helper
    copyToClipboard(text) {
      navigator.clipboard.writeText(text);
      this.showToast('ЕћЙ™kil URL-i kopyalandД±! рџ“‹');
    },

    showToast(message, isError = false) {
      const container = document.getElementById('toastContainer');
      if (!container) return;

      const toast = document.createElement('div');
      toast.className = 'toast';
      if (isError) toast.style.borderColor = '#ef4444';
      toast.textContent = message;

      container.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    },


    toggleVisualEdit(isActive) {
      const iframe = document.getElementById('livePreviewIframe');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'TOGGLE_VISUAL_EDIT', active: isActive }, '*');
      }
    },

    async handleVisualEditSave(key, text) {
      try {
        const res = await fetch(`${API_BASE}/admin/translations/${key}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ az: text })
        });
        const json = await res.json();
        if (json.success) {
          this.showToast('MЙ™tn yenilЙ™ndi: ' + key);
        } else {
          alert('XЙ™ta: ' + json.message);
        }
      } catch (e) {
        console.error(e);
      }
    },

    refreshPreview() {

      const iframe = document.getElementById('livePreviewIframe');
      if (iframe) iframe.src = iframe.src;
    },

    async resetAllData() {
      if (confirm('BГјtГјn verilЙ™nlЙ™r bazasД±nД± ilkin (seed) vЙ™ziyyЙ™tinЙ™ qaytarmaq istЙ™yirsiniz? Bu, bГјtГјn mГјraciЙ™tlЙ™ri vЙ™ yeni mЙ™lumatlarД± silЙ™cЙ™k.')) {
        try {
          const res = await fetch(`${API_BASE}/admin/reset-db`, { method: 'POST' });
          const json = await res.json();
          if (json.success) {
            this.showToast('MЙ™lumatlar ilkin vЙ™ziyyЙ™tinЙ™ qaytarД±ldД±. рџљЂ');
            location.reload();
          }
        } catch (e) {
          console.error(e);
        }
      }
    },
    // Clients CMS Controllers
    isClientSlugEdited: false,

    async renderClients() {
      const grid = document.getElementById('clientsGrid');
      if (!grid) return;
      grid.innerHTML = '<div class="spinner" style="margin:3rem auto; display:block;"></div>';
      const res = await fetch(`${API_BASE}/admin/clients`);
      const json = await res.json();
      if (json.success) {
        this.cache.clients = json.data;

        // Apply filters
        const searchVal = document.getElementById('clientSearch')?.value.toLowerCase() || '';
        const statusVal = document.getElementById('clientStatusFilter')?.value || 'ALL';
        const sortVal = document.getElementById('clientSortOrder')?.value || 'ORDER_ASC';

        let filtered = json.data.filter(c => {
          const matchSearch = c.name.toLowerCase().includes(searchVal) || 
                              c.description.toLowerCase().includes(searchVal);
          
          let matchStatus = true;
          if (statusVal === 'ACTIVE') matchStatus = c.active === true;
          if (statusVal === 'INACTIVE') matchStatus = c.active === false;

          return matchSearch && matchStatus;
        });

        // Sort
        filtered.sort((a, b) => {
          if (sortVal === 'ORDER_ASC') return a.order - b.order;
          if (sortVal === 'ORDER_DESC') return b.order - a.order;
          if (sortVal === 'ALPHA_ASC') return a.name.localeCompare(b.name, 'az');
          return 0;
        });

        grid.innerHTML = filtered.map(c => `
          <div class="adm-item-card" style="padding:1.5rem; display:flex; flex-direction:column; justify-content:space-between; min-height: 250px;">
            <div>
              <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:1rem;">
                <div style="background:rgba(255,255,255,0.05); padding:0.5rem; border-radius:4px; width:70px; height:70px; display:flex; align-items:center; justify-content:center; border:1px solid var(--adm-border);">
                  ${c.logoUrl ? `<img src="${c.logoUrl}" style="max-height:100%; max-width:100%; object-fit:contain;" />` : '<span style="font-size:0.65rem; color:var(--adm-text-muted);">Loqo yoxdur</span>'}
                </div>
                <span class="badge-status ${c.active ? 'new' : 'rejected'}">${c.active ? 'Aktiv' : 'Passiv'}</span>
              </div>
              <h4 class="adm-card-title" style="margin-bottom:0.25rem;">${c.name}</h4>
              <p style="font-size:0.8rem; color:var(--adm-text-muted); margin-bottom:0.75rem;">SД±ralama: ${c.order}</p>
              ${c.websiteUrl ? `<a href="${c.websiteUrl}" target="_blank" style="font-size:0.8rem; color:var(--adm-cyan); text-decoration:none; display:inline-block; margin-bottom:0.75rem; word-break:break-all;">рџЊђ ${c.websiteUrl.replace(/^https?:\/\//, '')}</a>` : ''}
              
              <div style="font-size:0.85rem; color:#fff; font-weight:700; margin: 0.5rem 0;">
                рџ“Ѓ LayihЙ™ sayД±: ${c._count?.projects || 0}
              </div>
            </div>

            <div class="adm-card-actions" style="margin-top:1rem;">
              <button class="adm-btn adm-btn-secondary" onclick="AdminApp.openClientModal('${c.id}')">вњЏпёЏ Edit</button>
              <button class="adm-btn adm-btn-danger" onclick="AdminApp.deleteClientPrompt('${c.id}')">Sil</button>
            </div>
          </div>
        `).join('');
      }
    },

    openClientModal(id = null) {
      const form = document.getElementById('clientForm');
      form.reset();
      document.getElementById('clientEditId').value = '';
      this.isClientSlugEdited = false;
      document.getElementById('clientSlug').disabled = false;
      this.removeClientLogo();

      // Switch to first tab "Гњmumi"
      document.querySelectorAll('#clientModal .modal-tab-btn').forEach((btn, idx) => {
        if (idx === 0) btn.classList.add('active');
        else btn.classList.remove('active');
      });
      document.querySelectorAll('#clientModal .modal-tab-content').forEach((tab, idx) => {
        if (idx === 0) tab.classList.add('active');
        else tab.classList.remove('active');
      });

      if (id) {
        const c = this.cache.clients.find(item => item.id === id);
        if (c) {
          document.getElementById('clientEditId').value = c.id;
          document.getElementById('clientSlug').value = c.slug;
          document.getElementById('clientSlug').disabled = true; // Slug immutable on edit
          document.getElementById('clientName').value = c.name;
          document.getElementById('clientDesc').value = c.description || '';
          document.getElementById('clientWebsiteUrl').value = c.websiteUrl || '';
          document.getElementById('clientActive').checked = !!c.active;
          document.getElementById('clientOrder').value = c.order || 0;
          
          if (c.logoUrl) {
            document.getElementById('clientLogoUrl').value = c.logoUrl;
            document.getElementById('clientLogoPreview').src = c.logoUrl;
            document.getElementById('clientLogoPreviewContainer').style.display = 'block';
          }
        }
      } else {
        document.getElementById('clientModalTitle').textContent = 'Yeni MГјЕџtЙ™ri YaradД±n';
        document.getElementById('clientActive').checked = true;
        document.getElementById('clientOrder').value = 0;
      }

      // Add manual slug change listener
      const slugInput = document.getElementById('clientSlug');
      slugInput.oninput = () => {
        this.isClientSlugEdited = true;
      };

      document.getElementById('clientModal').classList.add('is-active');
    },

    handleClientNameInput(e) {
      if (!this.isClientSlugEdited && !document.getElementById('clientEditId').value) {
        document.getElementById('clientSlug').value = generateSlug(e.target.value);
      }
    },

    removeClientLogo() {
      document.getElementById('clientLogoUrl').value = '';
      document.getElementById('clientLogoPreviewContainer').style.display = 'none';
      document.getElementById('clientLogoPreview').src = '';
    },

    async saveClient(e) {
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
      const editId = document.getElementById('clientEditId').value;
      const method = editId ? 'PUT' : 'POST';
      const url = editId ? `${API_BASE}/admin/clients/${editId}` : `${API_BASE}/admin/clients`;

      const payload = {
        name: document.getElementById('clientName').value,
        logoUrl: document.getElementById('clientLogoUrl').value || null,
        description: document.getElementById('clientDesc').value,
        websiteUrl: document.getElementById('clientWebsiteUrl').value,
        active: document.getElementById('clientActive').checked,
        order: Number(document.getElementById('clientOrder').value) || 0
      };

      try {
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json.success) {
          this.showToast('MГјЕџtЙ™ri qeydi saxlanД±ldД±.');
          this.closeModal('clientModal');
          await this.renderClients();
        } else {
          alert(json.error?.message || 'Yadda saxlama xЙ™tasД±.');
        }
      } catch (err) {
        console.error(err);
      }
    },

    deleteClientPrompt(id) {
      const c = this.cache.clients.find(item => item.id === id);
      if (c && c._count && c._count.projects > 0) {
        alert(`Bu mГјЕџtЙ™ri hЙ™lЙ™ dЙ™ ${c._count.projects} layihЙ™yЙ™ baДџlД±dД±r. SilmЙ™k ГјГ§Гјn Й™vvЙ™lcЙ™ Й™laqЙ™li layihЙ™lЙ™ri silin vЙ™ ya digЙ™r mГјЕџtЙ™riyЙ™ keГ§irin.`);
        return;
      }
      this.openDeleteConfirm(() => this.deleteClient(id), 'Bu mГјЕџtЙ™rini silmЙ™k istЙ™diyinizdЙ™n Й™minsiniz?');
    },

    async deleteClient(id) {
      try {
        const res = await fetch(`${API_BASE}/admin/clients/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
          this.showToast('MГјЕџtЙ™ri silindi.');
          await this.renderClients();
        } else {
          alert(json.error?.message || 'SilinmЙ™ alД±nmadД±.');
        }
      } catch (e) {
        console.error(e);
      }
    },

    // Media Library Controllers
    promptVimeoUpload(isPicker = false) {
      this.isVimeoForPicker = isPicker;
      document.getElementById('vimeoUrlInput').value = '';
      document.getElementById('vimeoAddModal').classList.add('is-active');
    },

    async handleAddVimeo() {
      const url = document.getElementById('vimeoUrlInput').value.trim();
      if (!url) return;
      try {
        const res = await fetch(`${API_BASE}/admin/media/vimeo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });
        const json = await res.json();
        if (json.success) {
          this.showToast('Vimeo video Й™lavЙ™ edildi.');
          this.closeModal('vimeoAddModal');
          if (this.isVimeoForPicker) {
            await this.renderMediaPickerGrid();
            this.selectMediaFromPicker(json.data.url);
          } else {
            await this.renderMedia();
          }
        } else {
          alert(json.error?.message || 'Video Й™lavЙ™ edilЙ™ bilmЙ™di.');
        }
      } catch (e) {
        console.error(e);
      }
    },
    async renderMedia() {
      const grid = document.getElementById('mediaLibraryGrid');
      if (!grid) return;
      grid.innerHTML = '<div class="spinner" style="margin:3rem auto; display:block;"></div>';
      const res = await fetch(`${API_BASE}/admin/media`);
      const json = await res.json();
      if (json.success) {
        this.cache.media = json.data;

        // Apply filters
        const searchVal = document.getElementById('mediaSearch')?.value.toLowerCase() || '';
        const mimeVal = document.getElementById('mediaMimeFilter')?.value || 'ALL';
        const sortVal = document.getElementById('mediaSortOrder')?.value || 'NEWEST';

        let filtered = json.data.filter(m => {
          const matchSearch = m.originalName.toLowerCase().includes(searchVal) || 
                              m.filename.toLowerCase().includes(searchVal);
          
          let matchMime = true;
          if (mimeVal === 'IMAGE') matchMime = m.mimeType.startsWith('image/') && m.mimeType !== 'image/svg+xml';
          if (mimeVal === 'SVG') matchMime = m.mimeType === 'image/svg+xml';
          if (mimeVal === 'OTHER') matchMime = !m.mimeType.startsWith('image/') && m.mimeType !== 'video/vimeo';
          if (mimeVal === 'VIDEO') matchMime = m.mimeType === 'video/vimeo';

          return matchSearch && matchMime;
        });

        // Sort
        filtered.sort((a, b) => {
          if (sortVal === 'NEWEST') return new Date(b.createdAt) - new Date(a.createdAt);
          if (sortVal === 'OLDEST') return new Date(a.createdAt) - new Date(b.createdAt);
          if (sortVal === 'NAME_ASC') return a.originalName.localeCompare(b.originalName, 'az');
          return 0;
        });

        if (filtered.length === 0) {
          grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; color:var(--adm-text-muted); padding:3rem; font-size:1.1rem;">Media tapД±lmadД±.</div>';
          return;
        }

        grid.innerHTML = filtered.map(m => {
          const isImage = m.mimeType.startsWith('image/');
          const isVimeo = m.mimeType === 'video/vimeo';
          const previewContent = isVimeo
            ? `<div style="display:flex; align-items:center; justify-content:center; height:100%; font-size:2.5rem; color:var(--adm-text-muted); background:#111;">в–¶</div>`
            : isImage 
            ? `<img src="${m.url}" style="width:100%; height:100%; object-fit:cover;" loading="lazy" />` 
            : `<div style="display:flex; align-items:center; justify-content:center; height:100%; font-size:2rem; color:var(--adm-text-muted);">рџ“„</div>`;
            
          const typeLabel = m.mimeType === 'image/svg+xml' ? 'SVG' : (isVimeo ? 'VIMEO' : (isImage ? 'IMAGE' : 'FILE'));
          
          return `
            <div onclick="AdminApp.viewMediaDetail('${m.id}')" style="cursor:pointer; background:var(--adm-card); border:1px solid var(--adm-border); border-radius:8px; overflow:hidden; display:flex; flex-direction:column; position:relative; transition:transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)';" onmouseout="this.style.transform='none'; this.style.boxShadow='none';">
              <div style="height:140px; background:var(--adm-bg); border-bottom:1px solid var(--adm-border); display:flex; align-items:center; justify-content:center;">
                ${previewContent}
              </div>
              <div style="padding:0.75rem; display:flex; flex-direction:column; gap:0.25rem;">
                <div style="font-size:0.85rem; font-weight:600; text-overflow:ellipsis; overflow:hidden; white-space:nowrap; color:var(--adm-text);" title="${m.originalName}">${m.originalName}</div>
                <div style="font-size:0.7rem; color:var(--adm-text-muted); display:flex; justify-content:space-between;">
                  <span>${typeLabel}</span>
                  <span>${(m.size / 1024).toFixed(0)} KB</span>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
    },

    async renderMediaLibrary() {
      await this.renderMedia();
    },

    async handleMediaLibraryUpload(event) {
      const file = event.target.files[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
        alert('ЕћЙ™kil Г¶lГ§ГјsГј 5MB-dan Г§ox ola bilmЙ™z.');
        return;
      }

      const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
      if (!allowedMimes.includes(file.type)) {
        alert('YalnД±z JPG, JPEG, PNG, WEBP vЙ™ SVG formatlarД± dЙ™stЙ™klЙ™nir.');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch(`${API_BASE}/admin/media/upload`, {
          method: 'POST',
          body: formData
        });
        const json = await res.json();
        if (json.success) {
          this.showToast('ЕћЙ™kil uДџurla yГјklЙ™ndi.');
          await this.renderMedia();
        } else {
          alert(json.error?.message || 'YГјklЙ™mЙ™ xЙ™tasД±.');
        }
      } catch (err) {
        console.error(err);
      }
    },

    viewMediaDetail(id) {
      const m = this.cache.media.find(item => item.id === id);
      if (!m) return;

      if (m.mimeType === 'video/vimeo') {
        document.getElementById('mediaPreviewImage').style.display = 'none';
        const vimeo = document.getElementById('mediaPreviewVimeo');
        vimeo.src = m.url;
        vimeo.style.display = 'block';
      } else {
        document.getElementById('mediaPreviewVimeo').style.display = 'none';
        document.getElementById('mediaPreviewVimeo').src = '';
        const img = document.getElementById('mediaPreviewImage');
        img.src = m.url;
        img.style.display = 'block';
      }
      document.getElementById('mediaPreviewKey').textContent = m.filename;
      document.getElementById('mediaPreviewName').textContent = m.originalName;
      document.getElementById('mediaPreviewMime').textContent = m.mimeType;
      document.getElementById('mediaPreviewSize').textContent = (m.size / 1024).toFixed(1) + ' KB';
      document.getElementById('mediaPreviewUrl').textContent = m.url;

      // Bind copy link action
      const copyBtn = document.getElementById('mediaCopyUrlBtn');
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(m.url).then(() => {
          this.showToast('ЕћЙ™kil keГ§idi kopyalandД±.');
        });
      };

      // Bind delete action with references blocker check
      const deleteBtn = document.getElementById('mediaDeleteBtn');
      deleteBtn.onclick = async () => {
        this.closeModal('mediaPreviewModal');
        this.openDeleteConfirm(async () => {
          try {
            const res = await fetch(`${API_BASE}/admin/media/${m.id}`, { method: 'DELETE' });
            const json = await res.json();
            if (json.success) {
              this.showToast('ЕћЙ™kil silindi.');
              await this.renderMedia();
            } else {
              alert(json.error?.message || 'SilinmЙ™ bloklandД±: Fayl hЙ™lЙ™ dЙ™ istifadЙ™ olunur.');
            }
          } catch(e) {
            console.error(e);
          }
        }, 'Bu media faylД±nД± silmЙ™k istЙ™diyinizdЙ™n Й™minsiniz?');
      };

      document.getElementById('mediaPreviewModal').classList.add('is-active');
    },

    // Media Picker Abstraction Widget
    triggerMediaPicker(targetInputId) {
      this.mediaPickerTargetField = targetInputId;
      const searchBox = document.getElementById('mediaPickerSearch');
      if (searchBox) searchBox.value = '';
      this.renderMediaPickerGrid();
      document.getElementById('mediaPickerDialog').classList.add('is-active');
    },

    async renderMediaPickerGrid() {
      const grid = document.getElementById('mediaPickerGrid');
      if (!grid) return;
      grid.innerHTML = '<div class="spinner" style="margin:3rem auto; display:block;"></div>';
      const res = await fetch(`${API_BASE}/admin/media`);
      const json = await res.json();
      if (json.success) {
        const searchVal = document.getElementById('mediaPickerSearch')?.value.toLowerCase() || '';
        let filtered = json.data.filter(m => m.originalName.toLowerCase().includes(searchVal));

        if (filtered.length === 0) {
          grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:var(--adm-text-muted); font-size:1rem; padding:2rem;">Fayl tapД±lmadД±.</div>';
          return;
        }

        grid.innerHTML = filtered.map(m => {
          const isImage = m.mimeType.startsWith('image/');
          const isVimeo = m.mimeType === 'video/vimeo';
          const previewContent = isVimeo
            ? `<div style="display:flex; align-items:center; justify-content:center; height:100%; font-size:2rem; color:var(--adm-text-muted); background:#111;">в–¶</div>`
            : isImage 
            ? `<img src="${m.url}" style="width:100%; height:100%; object-fit:cover;" loading="lazy" />` 
            : `<div style="display:flex; align-items:center; justify-content:center; height:100%; font-size:1.5rem; color:var(--adm-text-muted);">рџ“„</div>`;
            
          return `
            <div onclick="AdminApp.selectMediaFromPicker('${m.url}')" style="cursor:pointer; background:var(--adm-card); border:1px solid var(--adm-border); border-radius:6px; overflow:hidden; display:flex; flex-direction:column; position:relative; transition:transform 0.1s, border-color 0.1s;" onmouseover="this.style.transform='translateY(-1px)'; this.style.borderColor='var(--adm-primary)';" onmouseout="this.style.transform='none'; this.style.borderColor='var(--adm-border)';">
              <div style="height:100px; background:var(--adm-bg); border-bottom:1px solid var(--adm-border); display:flex; align-items:center; justify-content:center;">
                ${previewContent}
              </div>
              <div style="padding:0.5rem; font-size:0.75rem; font-weight:500; text-overflow:ellipsis; overflow:hidden; white-space:nowrap; color:var(--adm-text);" title="${m.originalName}">${m.originalName}</div>
            </div>
          `;
        }).join('');
      }
    },

    async handleMediaPickerUpload(event) {
      const file = event.target.files[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
        alert('ЕћЙ™kil Г¶lГ§ГјsГј 5MB-dan Г§ox ola bilmЙ™z.');
        return;
      }

      const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
      if (!allowedMimes.includes(file.type)) {
        alert('YalnД±z JPG, JPEG, PNG, WEBP vЙ™ SVG formatlarД± dЙ™stЙ™klЙ™nir.');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch(`${API_BASE}/admin/media/upload`, {
          method: 'POST',
          body: formData
        });
        const json = await res.json();
        if (json.success) {
          this.showToast('ЕћЙ™kil uДџurla yГјklЙ™ndi.');
          await this.renderMediaPickerGrid();
          // Auto select the newly uploaded file URL
          this.selectMediaFromPicker(json.data.url);
        } else {
          alert(json.error?.message || 'YГјklЙ™mЙ™ xЙ™tasД±.');
        }
      } catch (err) {
        console.error(err);
      }
    },

    selectMediaFromPicker(url) {
      if (this.mediaPickerTargetField) {
        const targetInput = document.getElementById(this.mediaPickerTargetField);
        if (targetInput) {
          targetInput.value = url;
          // Trigger change event if listeners exist
          targetInput.dispatchEvent(new Event('input'));
          targetInput.dispatchEvent(new Event('change'));

          // Dynamic preview updates based on which picker triggered it
          if (this.mediaPickerTargetField === 'clientLogoUrl') {
            document.getElementById('clientLogoPreview').src = url;
            document.getElementById('clientLogoPreviewContainer').style.display = 'block';
          } else if (this.mediaPickerTargetField === 'artImage') {
            document.getElementById('artImagePreview').src = url;
            document.getElementById('artImagePreviewContainer').style.display = 'block';
            this.updateArticlePreview();
          } else if (this.mediaPickerTargetField === 'solImage') {
            document.getElementById('solImagePreview').src = url;
            document.getElementById('solImagePreviewContainer').style.display = 'block';
          }
        }
      }
      this.closeModal('mediaPickerDialog');
    },
    bindEvents() {
      // Tab switching buttons
      document.querySelectorAll('.sidebar-nav button').forEach(btn => {
        btn.addEventListener('click', () => {
          const tab = btn.getAttribute('data-tab');
          if (tab) this.switchTab(tab);
        });
      });

      // Login form submit
      document.getElementById('adminLoginForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        await this.handleLogin(email, password);
      });

      // Form hooks
      document.getElementById('projectForm')?.addEventListener('submit', (e) => this.saveProject(e));
      document.getElementById('clientForm')?.addEventListener('submit', (e) => this.saveClient(e));
      document.getElementById('solutionForm')?.addEventListener('submit', (e) => this.saveSolution(e));
      document.getElementById('articleForm')?.addEventListener('submit', (e) => this.saveArticle(e));
      document.getElementById('blockForm')?.addEventListener('submit', (e) => this.saveBlock(e));
      document.getElementById('jobForm')?.addEventListener('submit', (e) => this.saveJob(e));
      document.getElementById('userForm')?.addEventListener('submit', (e) => this.saveUser(e));

      // Warning Delete Confirm Bind
      document.getElementById('deleteConfirmBtn')?.addEventListener('click', () => {
        if (this.deleteCallback) {
          this.deleteCallback();
          this.deleteCallback = null;
        }
        this.closeModal('deleteConfirmModal');
      });
    }
  };

  function generateSlug(text) {
    const mapping = {
      'Й™': 'e', 'Г¶': 'o', 'Гј': 'u', 'Д±': 'i', 'Еџ': 's', 'Г§': 'c', 'Дџ': 'g',
      'ЖЏ': 'e', 'Г–': 'o', 'Гњ': 'u', 'I': 'i', 'Ећ': 's', 'Г‡': 'c', 'Дћ': 'g'
    };
    let str = text.toString();
    for (let char in mapping) {
      str = str.replaceAll(char, mapping[char]);
    }
    return str.toLowerCase().trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-');
  }

  // Self-execute init on load
  // FIX: AdminApp DOM hazir olan kimi qlobal edilir (init() xeta verse bele
  // inline onclick handler-leri islemeye davam etsin).
  window.AdminApp = AdminApp;
  window.addEventListener('DOMContentLoaded', () => {
    window.AdminApp = AdminApp;
    try {
      AdminApp.init();
    } catch (e) {
      console.error('[Brandfull] AdminApp.init xetasi:', e);
    }
  });
})();

// ==========================================================================
// AI CONTENT MANAGER 3.0
// ==========================================================================
const AIContentManager = {
    mode: 'create', // 'create' | 'improve'
    currentEntity: null,
    generatedData: null,
    lastInstruction: '',
    
    openCreateMode(entity) {
        this.mode = 'create';
        this.currentEntity = entity;
        document.getElementById('aiContentType').value = entity;
        document.getElementById('aiContentType').disabled = false;
        document.getElementById('aiInstruction').value = '';
        this.resetPreview();
        openModal('aiContentManagerModal');
    },
    
    openImproveMode(entity) {
        this.mode = 'improve';
        this.currentEntity = entity;
        document.getElementById('aiContentType').value = entity;
        document.getElementById('aiContentType').disabled = true; // Lock in improve mode
        document.getElementById('aiInstruction').value = 'MГ¶vcud mЙ™lumatlarД± daha peЕџЙ™kar vЙ™ dolДџun et.';
        this.resetPreview();
        openModal('aiContentManagerModal');
    },
    
    resetPreview() {
        document.getElementById('aiEmptyState').style.display = 'block';
        document.getElementById('aiPreviewForm').style.display = 'none';
        document.getElementById('aiPreviewForm').innerHTML = '';
        document.getElementById('aiModalFooter').style.display = 'none';
        this.generatedData = null;
    },
    
    showLoading(show) {
        document.getElementById('aiLoadingState').style.display = show ? 'flex' : 'none';
        document.getElementById('btnAIGenerate').disabled = show;
    },
    
    async generateContent() {
        const entity = document.getElementById('aiContentType').value;
        const instruction = document.getElementById('aiInstruction').value.trim();
        const language = document.getElementById('aiLanguage').value;
        const tone = document.getElementById('aiTone').value;
        
        if (!instruction) {
            showToast('ZЙ™hmЙ™t olmasa tЙ™limat daxil edin.', 'error');
            return;
        }
        
        this.lastInstruction = instruction;
        this.currentEntity = entity;
        this.showLoading(true);
        
        // If improving, gather existing data as context
        let context = {};
        if (this.mode === 'improve') {
            if (entity === 'project') {
                context = {
                    title: document.getElementById('projectTitle').value,
                    headline: document.getElementById('projectHeadline').value,
                    overview: document.getElementById('projectOverview').value,
                    challenge: document.getElementById('projectChallenge').value,
                    solution: document.getElementById('projectSolution').value
                };
            } else if (entity === 'solution') {
                context = {
                    title: document.getElementById('solutionTitle').value,
                    tagline: document.getElementById('solutionTagline').value,
                    desc: document.getElementById('solutionDesc').value,
                };
            } else if (entity === 'article') {
                context = {
                    title: document.getElementById('articleTitle').value,
                    excerpt: document.getElementById('articleExcerpt').value,
                    content: document.getElementById('articleContent').value
                };
            } else if (entity === 'job') {
                context = {
                    title: document.getElementById('jobTitle').value,
                    description: document.getElementById('jobDesc').value
                };
            }
        }
        
        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${API_URL}/admin/ai/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    entity,
                    action: this.mode === 'improve' ? 'improve' : 'generate',
                    instruction,
                    context,
                    language,
                    tone
                })
            });
            
            const data = await res.json();
            
            if (data.success) {
                this.generatedData = data.data;
                this.renderPreview();
                showToast('AI mЙ™zmunu hazД±rlandД±.', 'success');
            } else {
                showToast(data.error?.message || 'AI nЙ™ticЙ™si emal edilЙ™ bilmЙ™di.', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('AI xidmЙ™ti hazД±rda Й™lГ§atan deyil.', 'error');
        } finally {
            this.showLoading(false);
        }
    },
    
    renderPreview() {
        if (!this.generatedData) return;
        
        document.getElementById('aiEmptyState').style.display = 'none';
        const previewForm = document.getElementById('aiPreviewForm');
        previewForm.style.display = 'flex';
        previewForm.innerHTML = '';
        
        // Generate inputs for each key
        for (const [key, value] of Object.entries(this.generatedData)) {
            const group = document.createElement('div');
            group.className = 'form-group';
            
            const label = document.createElement('label');
            label.textContent = key.charAt(0).toUpperCase() + key.slice(1);
            group.appendChild(label);
            
            if (Array.isArray(value)) {
                const textarea = document.createElement('textarea');
                textarea.className = 'form-control';
                textarea.style.minHeight = '100px';
                textarea.id = `ai_preview_${key}`;
                textarea.value = value.join('\n');
                group.appendChild(textarea);
            } else if (typeof value === 'string' && value.length > 80) {
                const textarea = document.createElement('textarea');
                textarea.className = 'form-control';
                textarea.style.minHeight = '120px';
                textarea.id = `ai_preview_${key}`;
                textarea.value = value;
                group.appendChild(textarea);
            } else {
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'form-control';
                input.id = `ai_preview_${key}`;
                input.value = value || '';
                group.appendChild(input);
            }
            
            previewForm.appendChild(group);
        }
        
        document.getElementById('aiModalFooter').style.display = 'flex';
    },
    
    regenerate() {
        this.generateContent();
    },
    
    applyToEditor() {
        if (!this.generatedData) return;
        
        // Pull latest values from preview edits
        for (const [key, value] of Object.entries(this.generatedData)) {
            const input = document.getElementById(`ai_preview_${key}`);
            if (input) {
                if (Array.isArray(value)) {
                    this.generatedData[key] = input.value.split('\n').filter(s => s.trim() !== '');
                } else {
                    this.generatedData[key] = input.value;
                }
            }
        }
        
        const data = this.generatedData;
        const e = this.currentEntity;
        
        // Helper to safely set val
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el && val !== undefined && val !== null) {
                el.value = val;
            }
        };
        
        if (e === 'project') {
            setVal('projectTitle', data.title);
            setVal('projectSlug', data.slug);
            setVal('projectCategory', data.category);
            setVal('projectTag', data.tag);
            setVal('projectYear', data.year);
            setVal('projectHeadline', data.headline);
            setVal('projectOverview', data.overview);
            setVal('projectChallenge', data.challenge);
            setVal('projectSolution', data.solution);
            setVal('projectMetaTitle', data.metaTitle);
            setVal('projectMetaDesc', data.metaDesc);
            openModal('projectModal');
        } else if (e === 'solution') {
            setVal('solutionTitle', data.title);
            setVal('solutionSlug', data.slug);
            setVal('solutionTagline', data.tagline);
            setVal('solutionDesc', data.desc);
            setVal('solutionCta', data.cta);
            setVal('solutionMetaTitle', data.metaTitle);
            setVal('solutionMetaDesc', data.metaDesc);
            if (data.features) setVal('solutionFeatures', data.features.join('\n'));
            if (data.benefits) setVal('solutionBenefits', data.benefits.join('\n'));
            if (data.process) setVal('solutionProcess', data.process.join('\n'));
            if (data.deliverables) setVal('solutionDeliverables', data.deliverables.join('\n'));
            openModal('solutionModal');
        } else if (e === 'article') {
            setVal('articleTitle', data.title);
            setVal('articleSlug', data.slug);
            setVal('articleTag', data.tag);
            setVal('articleAuthor', data.author);
            setVal('articleExcerpt', data.excerpt);
            setVal('articleContent', data.content);
            setVal('articleMetaTitle', data.metaTitle);
            setVal('articleMetaDesc', data.metaDesc);
            openModal('articleModal');
        } else if (e === 'job') {
            setVal('jobTitle', data.title);
            setVal('jobSlug', data.slug);
            setVal('jobType', data.type);
            setVal('jobLocation', data.location);
            setVal('jobDepartment', data.department);
            setVal('jobDesc', data.description);
            if (data.requirements) setVal('jobRequirements', data.requirements.join('\n'));
            openModal('jobModal');
        }
        
        closeModal('aiContentManagerModal');
        showToast('MЙ™zmun formaya tЙ™tbiq edildi. Yadda saxlamaДџД± unutmayД±n.', 'success');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Hook up AI Generate Button
    const btn = document.getElementById('btnAIGenerate');
    if (btn) {
        btn.addEventListener('click', () => {
            AIContentManager.generateContent();
        });
    }
});


// ==========================================================================
// AI OPERATIONS MANAGER
// ==========================================================================
const AIOperationsManager = {
    async analyze(cmd) {
        const commandInput = document.getElementById('aiOpsCommand');
        const command = cmd || commandInput.value.trim();
        
        if (!command) {
            showToast('ZЙ™hmЙ™t olmasa tЙ™limat daxil edin.', 'error');
            return;
        }
        
        if (!cmd) commandInput.value = command;
        
        document.getElementById('aiOpsLoading').style.display = 'block';
        document.getElementById('aiOpsResults').style.display = 'none';
        
        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${API_URL}/admin/ai/operations/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ command })
            });
            
            const json = await res.json();
            
            if (json.success) {
                this.renderResults(json.data);
            } else {
                showToast(json.error?.message || 'Analiz zamanД± xЙ™ta baЕџ verdi.', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('AI xidmЙ™ti hazД±rda Й™lГ§atan deyil. MЙ™lumatlar dЙ™yiЕџdirilmЙ™yib.', 'error');
        } finally {
            document.getElementById('aiOpsLoading').style.display = 'none';
        }
    },
    
    renderResults(data) {
        if (!data || (!data.issues?.length && !data.recommendations?.length)) {
            // No issues
            showToast('Analiz tamamlandД±. Ciddi problem tapД±lmadД±.', 'success');
            return;
        }
        
        document.getElementById('aiOpsResults').style.display = 'flex';
        document.getElementById('aiOpsSummaryText').textContent = data.summary || 'Analiz tamamlandД±.';
        
        // Render Issues
        const issuesGrid = document.getElementById('aiOpsIssuesGrid');
        issuesGrid.innerHTML = '';
        if (data.issues && data.issues.length > 0) {
            data.issues.forEach(issue => {
                const card = document.createElement('div');
                card.className = 'card';
                card.style.borderLeft = issue.priority === 'high' ? '4px solid var(--danger-color, red)' : 
                                        issue.priority === 'medium' ? '4px solid var(--warning-color, orange)' : 
                                        '4px solid var(--primary)';
                                        
                card.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.5rem;">
                        <span style="font-size:0.8rem; text-transform:uppercase; font-weight:bold; color:var(--text-muted);">${issue.type || 'N/A'}</span>
                        <span class="badge" style="background:var(--bg-light); color:var(--text);">${issue.confidence || 'Medium'} Confidence</span>
                    </div>
                    <h4 style="margin-bottom:0.5rem;">${issue.title}</h4>
                    <p style="font-size:0.9rem; color:var(--text-muted); margin-bottom:1rem;">${issue.reason}</p>
                    <div style="background:var(--bg-light); padding:0.5rem; border-radius:4px; font-size:0.9rem; margin-bottom:1rem;">
                        <strong>TГ¶vsiyЙ™:</strong> ${issue.recommendation}
                    </div>
                    <button class="btn btn-outline btn-sm" onclick="AIOperationsManager.viewEntity('${issue.type}', '${issue.recordId}')">Bax</button>
                `;
                issuesGrid.appendChild(card);
            });
        }
        
        // Render Recommendations
        const recList = document.getElementById('aiOpsRecommendationsList');
        recList.innerHTML = '';
        if (data.recommendations && data.recommendations.length > 0) {
            data.recommendations.forEach((rec, idx) => {
                const item = document.createElement('div');
                item.className = 'card';
                item.style.padding = '1rem';
                item.innerHTML = `
                    <div style="display:flex; align-items:center; gap:1rem;">
                        <div style="font-size:1.5rem; font-weight:bold; color:var(--text-muted);">${idx + 1}</div>
                        <div>
                            <h4 style="margin:0;">${rec.title}</h4>
                            <p style="margin:0.2rem 0 0 0; font-size:0.9rem; color:var(--text-muted);">${rec.description}</p>
                        </div>
                    </div>
                `;
                recList.appendChild(item);
            });
        }
    },
    
    viewEntity(type, id) {
        if (!type || !id) return;
        type = type.toLowerCase();
        if (type === 'inquiry') {
            switchTab('inbox');
            AdminApp.viewInquiry(id);
        } else if (type === 'project') {
            switchTab('projects');
            AdminApp.editProject(id);
        } else if (type === 'solution') {
            switchTab('solutions');
            AdminApp.editSolution(id);
        } else if (type === 'article') {
            switchTab('articles');
            AdminApp.editArticle(id);
        } else if (type === 'client') {
            switchTab('clients');
            AdminApp.editClient(id);
        } else if (type === 'application') {
            switchTab('applications');
            AdminApp.viewApplication(id);
        } else if (type === 'job') {
            switchTab('jobs');
            AdminApp.editJob(id);
        } else {
            showToast(`Bu obyekt ГјГ§Гјn birbaЕџa keГ§id yoxdur: ${type}`, 'info');
        }
    }
};

// Also route global command center to this if intent is operations
// In Phase 8, the command center was mapped. Let's make sure it handles operations commands.


/* ==========================================================================
   GLOBAL COMPATIBILITY SHIM  (2026-09 fix)
   --------------------------------------------------------------------------
   Problem: admin.html-deki inline onclick-ler ve AIContentManager /
   AIOperationsManager kodu asagidaki funksiyalari QLOBAL olaraq cagirir,
   lakin onlar yalniz AdminApp obyektinin metodu kimi movcud idi (openModal
   ise hec movcud deyildi). Neticede her cagirisda ReferenceError atilirdi
   ve butonlar hec bir reaksiya vermirdi.
   Bu blok hemin qlobal korpuleri qurur. Hec bir movcud kod deyisdirilmir.
   ========================================================================== */
(function () {
  'use strict';

  function App() { return window.AdminApp; }

  if (typeof window.openModal !== 'function') {
    window.openModal = function (id) {
      var m = document.getElementById(id);
      if (!m) { console.warn('[Brandfull] Modal tapilmadi:', id); return; }
      m.classList.add('is-active');
      document.body.style.overflow = 'hidden';
    };
  }

  if (typeof window.closeModal !== 'function') {
    window.closeModal = function (id) {
      var m = document.getElementById(id);
      if (m) m.classList.remove('is-active');
      if (!document.querySelector('.adm-modal-backdrop.is-active')) {
        document.body.style.overflow = '';
      }
    };
  }

  if (typeof window.showToast !== 'function') {
    window.showToast = function (msg, type) {
      var a = App();
      var isErr = (type === 'error' || type === true);
      if (a && typeof a.showToast === 'function') { a.showToast(msg, isErr); return; }
      console.log('[Brandfull toast]', msg);
    };
  }

  if (typeof window.switchTab !== 'function') {
    window.switchTab = function (tab) {
      var a = App();
      if (a && typeof a.switchTab === 'function') a.switchTab(tab);
    };
  }

  /* AI modullarini da qlobal edirik */
  try { if (typeof AIContentManager !== 'undefined') window.AIContentManager = AIContentManager; } catch (e) {}
  try { if (typeof AIOperationsManager !== 'undefined') window.AIOperationsManager = AIOperationsManager; } catch (e) {}

  document.addEventListener('DOMContentLoaded', function () {

    /* 1. showToast ucun konteyner yoxdursa yaradilir
          (admin.html-de #toastContainer yox idi -> hec bir bildiris gorunmurdu) */
    if (!document.getElementById('toastContainer')) {
      var c = document.createElement('div');
      c.id = 'toastContainer';
      document.body.appendChild(c);
    }

    /* 2. Modal-i fon kliki ve ESC ile baglamaq */
    document.querySelectorAll('.adm-modal-backdrop').forEach(function (bd) {
      bd.addEventListener('mousedown', function (e) {
        if (e.target === bd) window.closeModal(bd.id);
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var open = document.querySelector('.adm-modal-backdrop.is-active');
        if (open) window.closeModal(open.id);
      }
    });

    /* 3. Gizli tabdaki required saheler submit-i bloklayirdi
          ("An invalid form control is not focusable") -> native validasiya
          sondurulur, evezine oz validasiyamiz sahenin tabini acir. */
    ['projectForm','solutionForm','articleForm','jobForm','userForm','clientForm','settingsForm']
      .forEach(function (id) {
        var f = document.getElementById(id);
        if (f) f.setAttribute('novalidate', 'novalidate');
      });

    document.querySelectorAll('form').forEach(function (f) {
      f.addEventListener('submit', function (e) {
        var bad = null;
        var req = f.querySelectorAll('[required]');
        for (var i = 0; i < req.length; i++) {
          var el = req[i];
          var empty = (el.type === 'checkbox') ? !el.checked : !String(el.value || '').trim();
          if (empty || !el.checkValidity()) { bad = el; break; }
        }
        if (!bad) return;
        e.preventDefault();
        e.stopImmediatePropagation();

        var pane = bad.closest('.modal-tab-content');
        if (pane && !pane.classList.contains('active')) {
          var root = pane.closest('.adm-modal-content') || document;
          root.querySelectorAll('.modal-tab-content').forEach(function (x) { x.classList.remove('active'); });
          root.querySelectorAll('.modal-tab-btn').forEach(function (b) {
            var oc = b.getAttribute('onclick') || '';
            if (oc.indexOf("'" + pane.id + "'") > -1) b.classList.add('active');
            else b.classList.remove('active');
          });
          pane.classList.add('active');
        }
        var grp = bad.closest('.form-group, .adm-form-group');
        var lbl = grp ? grp.querySelector('label') : null;
        var nm = (lbl && lbl.textContent) || bad.placeholder || bad.id || 'Sahe';
        window.showToast('Doldurulmalidir: ' + String(nm).replace('*', '').trim(), 'error');
        try { bad.focus(); bad.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (err) {}
      }, true);
    });

    console.log('%c[Brandfull] Global shim aktivdir', 'color:#ff0090;font-weight:bold');
  });
})();


/* ==========================================================================
   SECTION SAVE BAR  (2026-09)
   --------------------------------------------------------------------------
   "Tetbiq Et" / "Imtina Et" duymeleri artiq sehifenin sag kenarinda deyil,
   HER BOLMENIN ALTINDA yerlesir ve YALNIZ hemin bolmede real deyisiklik
   edildikde gorunur.

     Tetbiq Et  -> bolmedeki formani yadda saxlayir
     Imtina Et  -> butun deyisiklikleri geri qaytarir (son yadda saxlanmis hala)

   Izlenilen saheler: bolme daxilindeki <form> elementlerinin sahelerdir.
   Axtaris / filter / sortlama saheleri form-dan kenardadir, ona gore
   onlara toxunulmur ve panel acilmir.
   ========================================================================== */
(function () {
  'use strict';

  var SectionSaveBar = {
    bars: {},

    /* Bolmede izlenilecek saheler */
    fields: function (view) {
      var out = [];
      view.querySelectorAll('form').forEach(function (f) {
        if (f.closest('.adm-modal-backdrop')) return;      // modal formalari xaric
        f.querySelectorAll('input, select, textarea').forEach(function (el) {
          if (el.type === 'file' || el.type === 'submit' || el.type === 'button') return;
          if (el.disabled) return;
          out.push(el);
        });
      });
      return out;
    },

    read: function (el) {
      return (el.type === 'checkbox' || el.type === 'radio') ? (el.checked ? '1' : '0') : String(el.value == null ? '' : el.value);
    },

    write: function (el, v) {
      if (el.type === 'checkbox' || el.type === 'radio') el.checked = (v === '1');
      else el.value = v;
    },

    snapshot: function (view) {
      var s = {};
      this.fields(view).forEach(function (el, i) { s[el.id || ('_' + i)] = SectionSaveBar.read(el); });
      view.__ssbSnapshot = s;
      return s;
    },

    isDirty: function (view) {
      var s = view.__ssbSnapshot;
      if (!s) return false;
      var list = this.fields(view), dirty = false;
      list.forEach(function (el, i) {
        var k = el.id || ('_' + i);
        if (s[k] !== undefined && s[k] !== SectionSaveBar.read(el)) dirty = true;
      });
      return dirty;
    },

    build: function (view) {
      if (this.bars[view.id]) return this.bars[view.id];

      var bar = document.createElement('div');
      bar.className = 'adm-save-bar';
      bar.setAttribute('role', 'region');
      bar.innerHTML =
        '<div class="adm-save-bar-inner">' +
          '<span class="adm-save-bar-text">' +
            '<span class="adm-save-bar-dot"></span>' +
            'Yadda saxlanilmamis deyisiklikler var' +
          '</span>' +
          '<span class="adm-save-bar-actions">' +
            '<button type="button" class="adm-btn adm-btn-secondary" data-ssb="cancel">Imtina Et</button>' +
            '<button type="button" class="adm-btn adm-btn-primary" data-ssb="apply">Tetbiq Et</button>' +
          '</span>' +
        '</div>';

      bar.querySelector('[data-ssb="cancel"]').addEventListener('click', function () {
        SectionSaveBar.revert(view);
      });
      bar.querySelector('[data-ssb="apply"]').addEventListener('click', function () {
        SectionSaveBar.apply(view);
      });

      view.appendChild(bar);
      this.bars[view.id] = bar;
      return bar;
    },

    toggle: function (view) {
      var bar = this.build(view);
      if (this.isDirty(view)) bar.classList.add('is-visible');
      else bar.classList.remove('is-visible');
    },

    revert: function (view) {
      var s = view.__ssbSnapshot || {};
      this.fields(view).forEach(function (el, i) {
        var k = el.id || ('_' + i);
        if (s[k] !== undefined) SectionSaveBar.write(el, s[k]);
      });
      this.toggle(view);
      if (window.showToast) window.showToast('Deyisiklikler legv edildi.');
    },

    apply: function (view) {
      var form = null;
      view.querySelectorAll('form').forEach(function (f) {
        if (!form && !f.closest('.adm-modal-backdrop')) form = f;
      });
      if (!form) return;

      var btn = this.bars[view.id] && this.bars[view.id].querySelector('[data-ssb="apply"]');
      if (btn) { btn.disabled = true; btn.textContent = 'Saxlanilir...'; }

      // Movcud submit handler-ini isledirik (AdminApp.saveSettings ve s.)
      if (typeof form.requestSubmit === 'function') form.requestSubmit();
      else form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));

      setTimeout(function () {
        if (btn) { btn.disabled = false; btn.textContent = 'Tetbiq Et'; }
        SectionSaveBar.snapshot(view);
        SectionSaveBar.toggle(view);
      }, 600);
    },

    /* Bolme aciР»Р°РЅРґР° cagirilir */
    activate: function (view) {
      if (!view) return;
      if (!this.fields(view).length) return;   // izlenecek sahe yoxdursa panel qurulmur
      this.build(view);
      this.snapshot(view);
      this.toggle(view);
    },

    init: function () {
      var self = this;

      document.querySelectorAll('.admin-view').forEach(function (view) {
        if (!self.fields(view).length) return;
        self.build(view);
        self.snapshot(view);

        ['input', 'change'].forEach(function (evt) {
          view.addEventListener(evt, function (e) {
            var el = e.target;
            if (!el || !el.form) return;                       // form-dan kenar (filter/axtaris) -> nezere alinmir
            if (el.form.closest('.adm-modal-backdrop')) return; // modal daxili -> nezere alinmir
            self.toggle(view);
          });
        });
      });

      /* Tab deyisende ve melumat yuklenenden sonra snapshot yenilenir */
      var A = window.AdminApp;
      if (A && typeof A.switchTab === 'function' && !A.__ssbWrapped) {
        var origSwitch = A.switchTab.bind(A);
        A.switchTab = function (tabId) {
          var r = origSwitch(tabId);
          setTimeout(function () { self.activate(document.getElementById('view-' + tabId)); }, 350);
          return r;
        };
        A.__ssbWrapped = true;
      }
      if (A && typeof A.loadSettings === 'function' && !A.__ssbSettingsWrapped) {
        var origLoad = A.loadSettings.bind(A);
        A.loadSettings = function () {
          var r = origLoad.apply(null, arguments);
          Promise.resolve(r).then(function () {
            setTimeout(function () { self.activate(document.getElementById('view-settings')); }, 250);
          }).catch(function () {});
          return r;
        };
        A.__ssbSettingsWrapped = true;
      }
    }
  };

  window.SectionSaveBar = SectionSaveBar;

  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(function () { SectionSaveBar.init(); }, 800);
  });
})();


/* ==========================================================================
   RESPONSIVE SIDEBAR  (2026-09)
   Mobil/planset rejiminde yan menyunun acilib-baglanmasi + arxa fon.
   ========================================================================== */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var sidebar = document.querySelector('.admin-sidebar');
    if (!sidebar) return;
    if (!sidebar.id) sidebar.id = 'adminSidebar';

    var overlay = document.createElement('div');
    overlay.className = 'adm-sidebar-overlay';
    document.body.appendChild(overlay);

    function open()  { sidebar.classList.add('open');    overlay.classList.add('is-active'); }
    function close() { sidebar.classList.remove('open'); overlay.classList.remove('is-active'); }

    overlay.addEventListener('click', close);

    // Hamburger duymesi
    document.querySelectorAll('.mobile-menu-btn').forEach(function (b) {
      b.addEventListener('click', function (e) { e.stopPropagation(); open(); });
    });

    // Menyudan bir bolme secilende avtomatik baglanir
    sidebar.addEventListener('click', function (e) {
      if (e.target.closest('.sidebar-btn')) close();
    });

    // ESC ile baglanir
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && sidebar.classList.contains('open')) close();
    });

    // Ekran boyuyende vЙ™ziyyЙ™t sifirlanir
    var t;
    window.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(function () { if (window.innerWidth > 980) close(); }, 120);
    });
  });
})();


/* ==========================================================================
   MISSING METHODS PATCH  (2026-09)
   --------------------------------------------------------------------------
   Auditde admin.html-deki inline handler-lerin 22-si xeta verirdi, cunki
   cagirilan metodlar AdminApp-da UMUMIYYETLE TANIMLI DEYILDI:
     openMediaPicker, openMediaPickerFor, escapeHTML, handleProjectTitleInput,
     handleMetaTitleInput, handleMetaDescInput, openInlineClientModal,
     saveInquiry2
   Ustelik openAIAssistant artiq movcud olmayan `aiAssistantModal`-a
   muraciet edirdi. Asagida hamisi tamamlanir ve sistemin uygun bolmesinde
   real emeliyyat icra edecek sekilde baglanir.
   ========================================================================== */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(patch, 400);
  });

  function patch() {
    var A = window.AdminApp;
    if (!A) { setTimeout(patch, 400); return; }
    
    const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port !== '5000' ? 'http://localhost:5000/api' : (window.location.protocol === 'file:' ? 'http://localhost:5000/api' : '/api');

    /* ---------- 1. escapeHTML (addOfficeItem / addFooterLinkItem sinirdi) ---------- */
    if (typeof A.escapeHTML !== 'function') {
      A.escapeHTML = function (s) {
        return String(s == null ? '' : s)
          .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      };
    }

    /* ---------- 2. Media secici korpuleri ----------
       Hamisi movcud triggerMediaPicker/selectMediaFromPicker sistemine baglanir,
       yeni secilen sekil real olaraq hedef sahenin deyerine yazilir. */
    if (typeof A.openMediaPicker !== 'function') {
      A.openMediaPicker = function (targetInputId) {
        A.triggerMediaPicker(targetInputId);
      };
    }
    if (typeof A.openMediaPickerFor !== 'function') {
      A.openMediaPickerFor = function (targetInputId, previewElementId) {
        A._pickerPreviewEl = previewElementId || null;
        A.triggerMediaPicker(targetInputId);
      };
    }

    /* selectMediaFromPicker-i genislendiririk: openMediaPickerFor ile verilen
       ixtiyari onizleme qutusu da yenilensin (showreel, client logo ve s.) */
    if (typeof A.selectMediaFromPicker === 'function' && !A.__pickerWrapped) {
      var origSelect = A.selectMediaFromPicker.bind(A);
      A.selectMediaFromPicker = function (url) {
        origSelect(url);
        var pid = A._pickerPreviewEl;
        if (pid) {
          var box = document.getElementById(pid);
          if (box) {
            var isVideo = /vimeo|youtube|\.(mp4|webm|mov)$/i.test(url);
            box.style.display = 'block';
            box.innerHTML = isVideo
              ? '<div class="adm-asset-selection"><span style="font-size:1.4rem;">&#127916;</span>' +
                '<span style="font-size:0.78rem;color:var(--adm-text-muted);word-break:break-all;">' + A.escapeHTML(url) + '</span></div>'
              : '<div class="adm-asset-selection"><img src="' + A.escapeHTML(url) + '" alt="" ' +
                'style="width:48px;height:48px;object-fit:cover;border-radius:6px;border:1px solid var(--adm-border);" />' +
                '<span style="font-size:0.78rem;color:var(--adm-text-muted);word-break:break-all;">' + A.escapeHTML(url) + '</span></div>';
          }
          A._pickerPreviewEl = null;
        }
        if (typeof A.showToast === 'function') A.showToast('Media secildi.');
      };
      A.__pickerWrapped = true;
    }

    /* ---------- 3. Basliq -> slug avtomatik doldurma ---------- */
    function autoSlug(srcId, slugId, flag) {
      return function (e) {
        var src = (e && e.target) ? e.target : document.getElementById(srcId);
        var slug = document.getElementById(slugId);
        if (!src || !slug) return;
        if (A[flag]) return;                 // istifadeci ozu redakte edibse toxunmuruq
        if (slug.disabled) return;           // redakte rejiminde slug kilidlidir
        slug.value = (typeof generateSlugSafe === 'function') ? generateSlugSafe(src.value) : simpleSlug(src.value);
      };
    }
    function simpleSlug(t) {
      var map = { 'Й™':'e','Г¶':'o','Гј':'u','Д±':'i','Еџ':'s','Г§':'c','Дџ':'g',
                  'ЖЏ':'e','Г–':'o','Гњ':'u','I':'i','Ећ':'s','Г‡':'c','Дћ':'g' };
      var s = String(t || '');
      Object.keys(map).forEach(function (k) { s = s.split(k).join(map[k]); });
      return s.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-');
    }

    if (typeof A.handleProjectTitleInput !== 'function') {
      A.handleProjectTitleInput = function (e) {
        autoSlug('projTitle', 'projSlugField', 'isProjSlugEdited')(e);
        if (typeof A.updateProjectLivePreview === 'function') {
          try { A.updateProjectLivePreview(); } catch (err) {}
        }
      };
      var sf = document.getElementById('projSlugField');
      if (sf) sf.addEventListener('input', function () { A.isProjSlugEdited = true; });
    }

    /* ---------- 4. SEO simvol sayДџaclarД± ---------- */
    if (typeof A.updateCharCounter !== 'function') {
      A.updateCharCounter = function (inputId, counterId, max) {
        var el = document.getElementById(inputId);
        var c = document.getElementById(counterId);
        if (!el || !c) return;
        c.textContent = el.value.length + (max ? ' / ' + max : '');
        c.style.color = (max && el.value.length > max) ? 'var(--adm-danger, #ff3b30)' : 'var(--adm-text-muted)';
      };
    }
    function counterFor(e, max) {
      if (!e || !e.target) return;
      var id = e.target.id;
      ['Counter', 'Count', 'Len'].forEach(function (suf) {
        if (document.getElementById(id + suf)) A.updateCharCounter(id, id + suf, max);
      });
    }
    if (typeof A.handleMetaTitleInput !== 'function') {
      A.handleMetaTitleInput = function (e) { counterFor(e, 60); };
    }
    if (typeof A.handleMetaDescInput !== 'function') {
      A.handleMetaDescInput = function (e) { counterFor(e, 160); };
    }

    /* ---------- 5. Layihe formasindan "+" ile yeni musteri ---------- */
    if (typeof A.openInlineClientModal !== 'function') {
      A.openInlineClientModal = function () {
        A._returnToProjectModal = true;
        A.openClientModal();
      };
      /* Musteri saxlanandan sonra layihe formasindaki secim yenilensin */
      if (typeof A.saveClient === 'function' && !A.__clientWrapped) {
        var origSave = A.saveClient.bind(A);
        A.saveClient = function (e) {
          var r = origSave(e);
          Promise.resolve(r).then(function () {
            if (A._returnToProjectModal) {
              A._returnToProjectModal = false;
              setTimeout(function () {
                if (typeof A.populateClientDropdown === 'function') A.populateClientDropdown();
                else if (typeof A.renderClients === 'function') A.renderClients();
              }, 300);
            }
          }).catch(function () {});
          return r;
        };
        A.__clientWrapped = true;
      }
    }

    /* ---------- 6. saveInquiry2 (status formasi) ---------- */
    if (typeof A.saveInquiry2 !== 'function') {
      A.saveInquiry2 = function (e) {
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        if (typeof A.saveInquiry === 'function') return A.saveInquiry(e);
      };
    }

    /* ---------- 7. openAIAssistant -> movcud AI Content Manager ----------
       Kohne `aiAssistantModal` HTML-den silinmisdi, ona gore funksiya
       `aiActionSelect`-e muraciet edib xeta atirdi. Indi real AI panelini acir. */
    if (document.getElementById('aiContentManagerModal') && !document.getElementById('aiActionSelect')) {
      A.openAIAssistant = function (entity, action) {
        A.aiEntity = entity;
        var M = window.AIContentManager;
        if (M) {
          if (action === 'improve' && typeof M.openImproveMode === 'function') return M.openImproveMode(entity);
          if (typeof M.openCreateMode === 'function') return M.openCreateMode(entity);
        }
        var sel = document.getElementById('aiContentType');
        if (sel) sel.value = entity;
        window.openModal('aiContentManagerModal');
      };
    }

    /* ---------- 8. Translations Module ---------- */
    A.loadTranslations = async function() {
      try {
        const tbody = document.getElementById('translationsTableBody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:3rem;">YГјklЙ™nir...</td></tr>';
        
        const res = await fetch(API_BASE + '/admin/translations', { headers: { 'Authorization': `Bearer ${A.token}` } });
        const json = await res.json();
        
        if (!json.success) {
          throw new Error(json.message || json.error?.message || 'Server xЙ™tasД± (success: false)');
        }

        if (json.data) {
          if (json.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:3rem; color:var(--adm-text-muted);">HeГ§ bir tЙ™rcГјmЙ™ tapД±lmadД±.</td></tr>';
            return;
          }
          
          let html = '';
          json.data.forEach(t => {
            html += `
              <tr data-key="${A.escapeHTML(t.key)}">
                <td style="vertical-align:top; padding-top:1rem;">
                  <code style="background:rgba(255,255,255,0.05); padding:0.25rem 0.5rem; border-radius:4px; font-size:0.8rem; color:var(--adm-cyan);">${A.escapeHTML(t.key)}</code>
                </td>
                <td><textarea class="adm-textarea trans-az" rows="3" style="font-size:0.85rem;">${A.escapeHTML(t.az || '')}</textarea></td>
                <td><textarea class="adm-textarea trans-en" rows="3" style="font-size:0.85rem;">${A.escapeHTML(t.en || '')}</textarea></td>
                <td><textarea class="adm-textarea trans-ru" rows="3" style="font-size:0.85rem;">${A.escapeHTML(t.ru || '')}</textarea></td>
              </tr>
            `;
          });
          tbody.innerHTML = html;
        }
      } catch (err) {
        console.error(err);
        A.showToast('TЙ™rcГјmЙ™lЙ™ri yГјklЙ™mЙ™k mГјmkГјn olmadД±: ' + err.message, 'error');
      }
    };

    A.saveTranslations = async function() {
      try {
        const tbody = document.getElementById('translationsTableBody');
        if (!tbody) return;
        
        const rows = tbody.querySelectorAll('tr[data-key]');
        const translations = [];
        
        rows.forEach(row => {
          const key = row.getAttribute('data-key');
          const az = row.querySelector('.trans-az').value;
          const en = row.querySelector('.trans-en').value;
          const ru = row.querySelector('.trans-ru').value;
          translations.push({ key, az, en, ru });
        });
        
        const res = await fetch(API_BASE + '/admin/translations', {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${A.token}`
          },
          body: JSON.stringify({ translations })
        });
        
        const json = await res.json();
        if (json.success) {
          A.showToast('TЙ™rcГјmЙ™lЙ™r uДџurla yenilЙ™ndi.', 'success');
        } else {
          throw new Error('XЙ™ta baЕџ verdi');
        }
      } catch (err) {
        console.error(err);
        A.showToast('TЙ™rcГјmЙ™lЙ™ri yadda saxlamaq mГјmkГјn olmadД±.', 'error');
      }
    };
    
    // Bind click to the sidebar button to load them
    const transBtn = document.querySelector('.sidebar-btn[data-tab="translations"]');
    if (transBtn) {
      transBtn.addEventListener('click', () => {
        A.loadTranslations();
      });
    }

    console.log('%c[Brandfull] Catismayan metodlar tamamlandi вњ“', 'color:#ff0090;font-weight:bold');
  }
})();


/* ==========================================================================
   DROPDOWN CLOSE  (2026-09)
   admin.html-de bu mentiq inline <script> blokunda idi. CSP `script-src 'self'`
   inline <script>-lari da bloklayir -> profil menyusu bir defe acilandan sonra
   HEC VAXT baglanmirdi. Mentiq xarici fayla (bura) kocurulub.
   ========================================================================== */
(function () {
  'use strict';

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;

    if (!t.closest('.lang-selector')) {
      var lm = document.getElementById('langMenu');
      if (lm) lm.classList.remove('active');
    }
    if (!t.closest('.user-menu')) {
      var um = document.getElementById('userDropdownMenu');
      if (um) um.classList.remove('active');
    }
  }, true);

  /* ESC ile de baglansin */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    ['langMenu', 'userDropdownMenu'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.classList.remove('active');
    });
  });

  /* Menyudaki bir bende klikleyende de baglansin */
  document.addEventListener('DOMContentLoaded', function () {
    var um = document.getElementById('userDropdownMenu');
    if (um) {
      um.addEventListener('click', function (e) {
        if (e.target.closest('.dropdown-item')) um.classList.remove('active');
      });
    }
  });
})();





