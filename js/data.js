/* ==========================================================================
   BRANDFULL DATA STORE & API INTEGRATION LAYER
   ========================================================================== */

const BRANDFULL_DEFAULT_DATA = {
  settings: {
    siteTitle: 'Brandfull',
    heroTag: 'Salam.',
    heroHeadline: 'İnsanlar üçün əhəmiyyət kəsb edən işlər yaradırıq.',
    heroSubtitle: 'Hər kəs nəsə yarada bilər. Lakin mədəniyyət və bizneslə rezonans doğuran təcrübələr yaratmaq çətin tərəfdir. Bu, dizayn, texnologiya və insan zəkası tələb edir.',
    showreelVideoUrl: 'https://assets.contentstack.io/v3/assets/blt92018a2de1445ae9/bltbe968b0a9d9b6113/6a8ca6ddbed19d73e0afafee/Huge-Brand-2026-00-OurStory-Sizzle-v10-AT_1-web-720p.mp4',
    showreelPosterUrl: 'https://images.contentstack.io/v3/assets/blt92018a2de1445ae9/blt248c176a03654ddd/6a905376a594511f0962c3ec/Hs_Poster.jpg',
    contactEmail: 'business@brandfull.com',
    pressEmail: 'press@brandfull.com',
    address: 'Nizami küç. 142, Landmark Plaza, Bakı'
  },
  stats: [
    { number: '25+', label: 'İl ərzində əhəmiyyətli işlər' },
    { number: '500+', label: 'Dizayner, mühəndis və strateq' },
    { number: '100+', label: 'Qlobal sənətkarlıq mükafatı' },
    { number: '14', label: 'Qlobal studiya və mərkəz' }
  ],
  values: [
    { title: 'Ən xırda detala belə diqqət yetir.', desc: 'Sənətimizə, tərəfdaşlarımıza və istifadəçilərə dərindən qayğı göstəririk.' },
    { title: 'Maraq hissini inkişaf etdir.', desc: 'Düşündürücü suallar verir, yeni həll yolları tapırıq.' },
    { title: 'Səmimi və aydın danış.', desc: 'Radikal aydınlıq hər zaman qeyri-müəyyənlikdən üstündür.' },
    { title: 'Birlikdə qur.', desc: 'Ən böyük nəticələr vahid komanda kimi işlədikdə yaranır.' }
  ],
  timeline: [
    { year: '1999', title: 'İlk Qığılcım', desc: 'Brandfull, rəqəmsal dizaynın gündəlik həyatı dəyişəcəyinə inamla təsis edildi.' },
    { year: '2005', title: 'İnnovativ Ticarət Həlləri', desc: 'İstifadəçi mərkəzli ilk genişmiqyaslı platforma quruldu.' },
    { year: '2010', title: 'Qlobal Genişlənmə', desc: 'Avropa və beynəlxalq bazarlara çıxış edildi.' },
    { year: '2024+', title: 'İnsan Mərkəzli, AI Əsaslı', desc: 'Bütün əməliyyatlar BrandfullOS və çevik komandalarla gücləndirildi.' }
  ],
  offices: [
    { city: 'Bakı', address: 'Nizami küç. 142, Landmark Plaza, Bakı' },
    { city: 'Nyu-York', address: '53 W 23rd St, New York, NY 10010' },
    { city: 'London', address: '124 City Rd, London EC1V 2NX' },
    { city: 'İstanbul', address: 'Levent, Büyükdere Cad. No: 185' },
    { city: 'Dubay', address: 'DIFC, Gate Precinct 4, Dubai' },
    { city: 'San-Fransisko', address: '100 Montgomery St, San Francisco' }
  ],
  projects: [],
  solutions: [],
  articles: [],
  jobs: [],
  inquiries: [],
  subscribers: [],
  applications: []
};
// API Endpoint Configuration
const API_BASE = '/api';
const BrandfullStore = {
  // Flag to track if API was successfully reached
  apiAvailable: null,

  async checkApiHealth() {
    try {
      const res = await fetch(`${API_BASE}/health`, { method: 'GET' });
      const data = await res.json();
      this.apiAvailable = (res.ok && data.success === true);
      return this.apiAvailable;
    } catch (e) {
      this.apiAvailable = false;
      return false;
    }
  },

  async getProjects() {
    try {
      const res = await fetch(`${API_BASE}/projects`);
      const payload = await res.json();
      if (payload.success) return payload.data;
      throw new Error(payload.error?.message || 'Projects fetch failed');
    } catch (err) {
      console.warn('API getProjects connection failed, using local development fallback.', err);
      // Fallback only if local development fallback is allowable
      if (this.isDevFallbackAllowed()) {
        const local = await import('./seed-data.js').catch(() => null);
        return local ? local.projects : [];
      }
      throw err;
    }
  },

  async getSolutions() {
    try {
      const res = await fetch(`${API_BASE}/solutions`);
      const payload = await res.json();
      if (payload.success) return payload.data;
      throw new Error(payload.error?.message || 'Solutions fetch failed');
    } catch (err) {
      console.warn('API getSolutions connection failed, using local development fallback.', err);
      if (this.isDevFallbackAllowed()) {
        const local = await import('./seed-data.js').catch(() => null);
        return local ? local.solutions : [];
      }
      throw err;
    }
  },

  async getArticles() {
    try {
      const res = await fetch(`${API_BASE}/articles`);
      const payload = await res.json();
      if (payload.success) return payload.data;
      throw new Error(payload.error?.message || 'Articles fetch failed');
    } catch (err) {
      console.warn('API getArticles connection failed, using local development fallback.', err);
      if (this.isDevFallbackAllowed()) {
        const local = await import('./seed-data.js').catch(() => null);
        return local ? local.articles : [];
      }
      throw err;
    }
  },

  async getJobs() {
    try {
      const res = await fetch(`${API_BASE}/jobs`);
      const payload = await res.json();
      if (payload.success) return payload.data;
      throw new Error(payload.error?.message || 'Jobs fetch failed');
    } catch (err) {
      console.warn('API getJobs connection failed, using local development fallback.', err);
      if (this.isDevFallbackAllowed()) {
        const local = await import('./seed-data.js').catch(() => null);
        return local ? local.jobs : [];
      }
      throw err;
    }
  },

  async getSettings() {
    try {
      const res = await fetch(`${API_BASE}/settings`);
      const payload = await res.json();
      if (payload.success && payload.data && Object.keys(payload.data).length > 0) {
        return payload.data;
      }
      return null;
    } catch (err) {
      console.warn('API getSettings connection failed, using defaults.', err);
      return null;
    }
  },

  async createInquiry(inquiry) {
    const res = await fetch(`${API_BASE}/inquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inquiry)
    });
    const payload = await res.json();
    if (!res.ok || !payload.success) {
      throw new Error(payload.error?.message || 'Inquiry submission failed');
    }
    return payload.data;
  },

  async subscribe(email) {
    const res = await fetch(`${API_BASE}/subscribers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const payload = await res.json();
    if (!res.ok || !payload.success) {
      const err = new Error(payload.error?.message || 'Newsletter subscription failed');
      err.code = payload.error?.code || 'ERROR';
      throw err;
    }
    return payload.data;
  },

  async createApplication(formData) {
    const res = await fetch(`${API_BASE}/applications`, {
      method: 'POST',
      body: formData // No headers: let fetch automatically set boundary
    });
    const payload = await res.json();
    if (!res.ok || !payload.success) {
      throw new Error(payload.error?.message || 'Application submission failed');
    }
    return payload.data;
  },
  isDevFallbackAllowed() {
    // Falls back to development mock arrays ONLY if running locally and NOT in production builds
    return (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  }
};

window.BRANDFULL_DATA = BRANDFULL_DEFAULT_DATA;
