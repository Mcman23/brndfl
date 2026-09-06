let I18N = {
  az: {},
  en: {},
  ru: {}
};

const I18nManager = {
  currentLang: localStorage.getItem('brandfull_lang') || 'az',

  async init() {
    try {
      const res = await fetch('/api/translations');
      const json = await res.json();
      if (json.success && json.data) {
        I18N = json.data;
      }
    } catch (e) {
      console.error('Failed to load translations:', e);
    }

    this.updateStaticTexts();
    this.bindButtons();
  },

  setLanguage(lang) {
    if (['az', 'en', 'ru'].includes(lang)) {
      this.currentLang = lang;
      localStorage.setItem('brandfull_lang', lang);
      this.updateStaticTexts();
      this.updateActiveButtons();
      
      if (typeof App !== 'undefined' && App.data) {
        App.renderAll();
      }
    }
  },

  updateActiveButtons() {
    document.querySelectorAll('.lang-btn, .lang-btn-mob').forEach(btn => {
      if (btn.getAttribute('data-lang') === this.currentLang) {
        btn.style.opacity = '1';
        btn.classList.add('is-active');
      } else {
        btn.style.opacity = '0.5';
        btn.classList.remove('is-active');
      }
    });
  },

  bindButtons() {
    document.querySelectorAll('.lang-btn, .lang-btn-mob').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const lang = btn.getAttribute('data-lang');
        this.setLanguage(lang);
      });
    });
    this.updateActiveButtons();
  },

  updateStaticTexts() {
    const dict = I18N[this.currentLang];
    if (!dict) return;
    
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.placeholder = dict[key];
        } else {
          el.innerHTML = dict[key];
        }
      }
    });
  },

  get(field, item) {
    if (this.currentLang === 'az') return item[field] || '';
    const capitalizedField = field.charAt(0).toUpperCase() + field.slice(1);
    const translatedField = field + (this.currentLang === 'en' ? 'En' : 'Ru');
    return item[translatedField] || item[field] || '';
  }
};

document.addEventListener('DOMContentLoaded', () => {
  I18nManager.init();
});
