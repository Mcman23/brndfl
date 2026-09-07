/**
 * visual-editor.js
 * Live Visual Editor Core Engine for Brandfull CMS Live Preview (WYSIWYG)
 * 
 * Public API: window.VisualEditor & window.VisualEditorEngine
 * Zero external runtime dependencies (vanilla JavaScript)
 * Supports bidirectional postMessage communication with host Admin application.
 */

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    var instance = factory();
    root.VisualEditor = instance;
    root.VisualEditorEngine = instance.constructor;
  }
})(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  var DEFAULT_OPTIONS = {
    debug: false,
    autoInjectStyles: true
  };

  function VisualEditorEngine(win) {
    this.window = win || (typeof window !== 'undefined' ? window : null);
    this.document = this.window && this.window.document ? this.window.document : null;
    this._active = false;
    this.editingElement = null;
    this._originalContent = null;
    this.eventListeners = {};
    this.options = Object.assign({}, DEFAULT_OPTIONS);

    // Bind event handler references
    this.boundClickHandler = this.handleElementClick.bind(this);
    this.boundBlurHandler = this.handleElementBlur.bind(this);
    this.boundKeydownHandler = this.handleElementKeydown.bind(this);
    this.boundImageClickHandler = this.handleImageClick.bind(this);
    this.boundMessageHandler = this.handleMessage.bind(this);

    // Attach message listener to window
    if (this.window && typeof this.window.addEventListener === 'function') {
      this.window.addEventListener('message', this.boundMessageHandler);
    }
  }

  // Active status getter/setter and callable method
  VisualEditorEngine.prototype.isActive = function() {
    return Boolean(this._active);
  };

  VisualEditorEngine.prototype.init = function(options) {
    if (options && typeof options === 'object') {
      this.options = Object.assign(this.options, options);
    }
    if (this.options.autoInjectStyles) {
      this.injectStyles();
    }
    return this;
  };

  VisualEditorEngine.prototype.injectStyles = function() {
    if (!this.document) return;
    if (this.document.getElementById('visual-edit-styles')) return;

    var style = this.document.createElement('style');
    style.id = 'visual-edit-styles';
    style.textContent = [
      '.visual-edit-active .visual-editable {',
      '  outline: 2px dashed rgba(106, 90, 205, 0.6) !important;',
      '  outline-offset: 2px !important;',
      '  cursor: pointer !important;',
      '  position: relative !important;',
      '  transition: outline 0.2s ease, background-color 0.2s ease;',
      '}',
      '.visual-edit-active .visual-editable:hover {',
      '  outline: 2px solid rgba(106, 90, 205, 1) !important;',
      '  background: rgba(106, 90, 205, 0.08) !important;',
      '}',
      '.visual-edit-active .visual-editable[contenteditable="true"] {',
      '  outline: 2px solid #00c853 !important;',
      '  background: rgba(0, 200, 83, 0.08) !important;',
      '  cursor: text !important;',
      '}',
      '.visual-edit-active .visual-editable-image:hover {',
      '  outline: 2px solid #ff007f !important;',
      '}',
      '.visual-edit-badge {',
      '  position: absolute;',
      '  top: -10px;',
      '  left: 0;',
      '  background: #6a5acd;',
      '  color: #ffffff;',
      '  font-size: 10px;',
      '  padding: 1px 5px;',
      '  border-radius: 3px;',
      '  pointer-events: none;',
      '  z-index: 9999;',
      '}'
    ].join('\n');

    if (this.document.head && typeof this.document.head.appendChild === 'function') {
      this.document.head.appendChild(style);
    } else if (this.document.body && typeof this.document.body.appendChild === 'function') {
      this.document.body.appendChild(style);
    }
  };

  VisualEditorEngine.prototype.enable = function() {
    this._active = true;
    if (this.document && this.document.body) {
      if (this.document.body.classList && typeof this.document.body.classList.add === 'function') {
        this.document.body.classList.add('visual-edit-active');
      }
    }

    this.injectStyles();

    // Collect target editable elements
    var elements = this.getEditableElements();
    var self = this;

    elements.forEach(function(el) {
      if (!el || !el.tagName) return;
      var tag = el.tagName.toUpperCase();

      if (tag === 'IMG') {
        if (el.classList) {
          el.classList.add('visual-editable');
          el.classList.add('visual-editable-image');
        }
        if (typeof el.addEventListener === 'function') {
          el.addEventListener('click', self.boundImageClickHandler);
        }
      } else {
        if (el.classList) {
          el.classList.add('visual-editable');
        }
        if (typeof el.addEventListener === 'function') {
          el.addEventListener('click', self.boundClickHandler);
          el.addEventListener('blur', self.boundBlurHandler);
          el.addEventListener('keydown', self.boundKeydownHandler);
        }
      }
    });

    this.emit('mode-changed', { active: true });
    return this;
  };

  VisualEditorEngine.prototype.disable = function() {
    this._active = false;
    if (this.document && this.document.body) {
      if (this.document.body.classList && typeof this.document.body.classList.remove === 'function') {
        this.document.body.classList.remove('visual-edit-active');
      }
    }

    if (this.document && typeof this.document.querySelectorAll === 'function') {
      var editables = this.document.querySelectorAll('.visual-editable');
      var self = this;
      editables.forEach(function(el) {
        if (el.classList) {
          el.classList.remove('visual-editable');
          el.classList.remove('visual-editable-image');
        }
        if (typeof el.removeAttribute === 'function') {
          el.removeAttribute('contenteditable');
        }
        if (typeof el.removeEventListener === 'function') {
          el.removeEventListener('click', self.boundClickHandler);
          el.removeEventListener('blur', self.boundBlurHandler);
          el.removeEventListener('keydown', self.boundKeydownHandler);
          el.removeEventListener('click', self.boundImageClickHandler);
        }
      });
    }

    if (this.editingElement) {
      if (typeof this.editingElement.removeAttribute === 'function') {
        this.editingElement.removeAttribute('contenteditable');
      }
      this.editingElement = null;
    }
    this._originalContent = null;

    this.emit('mode-changed', { active: false });
    return this;
  };

  VisualEditorEngine.prototype.toggle = function() {
    if (this._active) {
      this.disable();
    } else {
      this.enable();
    }
    return this._active;
  };

  VisualEditorEngine.prototype.getEditableElements = function() {
    if (!this.document || typeof this.document.querySelectorAll !== 'function') return [];

    var selectors = [
      '[data-setting]',
      '[data-i18n]',
      '[data-editable]',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'a', 'button',
      'img[data-setting]',
      'img.inflatable-3d-letter',
      '.client-logo-box img'
    ];

    var elementSet = [];
    var seen = new Set();

    selectors.forEach(function(sel) {
      try {
        var list = this.document.querySelectorAll(sel);
        for (var i = 0; i < list.length; i++) {
          var el = list[i];
          if (!el || seen.has(el)) continue;
          var tag = el.tagName ? el.tagName.toUpperCase() : '';
          if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'META', 'HEAD', 'TITLE', 'LINK'].indexOf(tag) !== -1) continue;
          seen.add(el);
          elementSet.push(el);
        }
      } catch (e) {}
    }, this);

    return elementSet;
  };

  VisualEditorEngine.prototype.handleElementClick = function(e) {
    if (!this._active) return;
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();

    var target = e.currentTarget || e.target;
    if (!target) return;

    if (this.editingElement && this.editingElement !== target) {
      if (typeof this.editingElement.blur === 'function') {
        this.editingElement.blur();
      }
    }

    this.editingElement = target;
    this._originalContent = (target.textContent || '').trim();

    if (typeof target.setAttribute === 'function') {
      target.setAttribute('contenteditable', 'true');
    }
    if (typeof target.focus === 'function') {
      target.focus();
    }

    this.emit('element-focused', { element: target });
  };

  VisualEditorEngine.prototype.handleElementBlur = function(e) {
    if (!this._active) return;
    var el = e ? (e.currentTarget || e.target) : this.editingElement;
    if (!el) return;

    if (typeof el.removeAttribute === 'function') {
      el.removeAttribute('contenteditable');
    }

    if (this.editingElement === el) {
      this.editingElement = null;
    }

    var newText = el.textContent ? el.textContent.trim() : '';
    var settingKey = typeof el.getAttribute === 'function' ? el.getAttribute('data-setting') : null;
    var i18nKey = typeof el.getAttribute === 'function' ? el.getAttribute('data-i18n') : null;
    var editableKey = typeof el.getAttribute === 'function' ? el.getAttribute('data-editable') : null;

    // Ignore empty whitespace blur
    if (!newText) {
      return;
    }

    if (settingKey) {
      this.postToParent({
        type: 'SAVE_SETTINGS',
        key: settingKey,
        setting: settingKey,
        value: newText
      });
      this.emit('save', { type: 'setting', key: settingKey, value: newText });
    } else if (i18nKey) {
      this.postToParent({
        type: 'SAVE_I18N',
        key: i18nKey,
        text: newText
      });
      this.emit('save', { type: 'i18n', key: i18nKey, text: newText });
    } else if (editableKey) {
      this.postToParent({
        type: 'SAVE_SETTINGS',
        key: editableKey,
        setting: editableKey,
        value: newText
      });
      this.emit('save', { type: 'setting', key: editableKey, value: newText });
    }
  };

  VisualEditorEngine.prototype.handleElementKeydown = function(e) {
    if (!e) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      var target = e.currentTarget || e.target;
      if (target && typeof target.blur === 'function') {
        target.blur();
      }
    } else if (e.key === 'Escape') {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      var escTarget = e.currentTarget || e.target;
      if (escTarget && this._originalContent !== null) {
        escTarget.textContent = this._originalContent;
      }
      if (escTarget && typeof escTarget.blur === 'function') {
        escTarget.blur();
      }
    }
  };

  VisualEditorEngine.prototype.handleImageClick = function(e) {
    if (!this._active) return;
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();

    var img = e ? (e.currentTarget || e.target) : null;
    if (!img) return;

    var settingKey = (typeof img.getAttribute === 'function' ? img.getAttribute('data-setting') : null) || img.id || 'heroPoster';
    var currentUrl = img.src || (typeof img.getAttribute === 'function' ? img.getAttribute('src') : '') || '';

    this.postToParent({
      type: 'OPEN_MEDIA_PICKER',
      target: settingKey,
      currentUrl: currentUrl
    });
    this.emit('open-media-picker', { target: settingKey, currentUrl: currentUrl });
  };

  VisualEditorEngine.prototype.handleMediaSelected = function(target, url) {
    if (!target || !url || !this.document) return;

    var el = null;
    if (typeof this.document.getElementById === 'function') {
      el = this.document.getElementById(target);
    }
    if (!el && typeof this.document.querySelector === 'function') {
      el = this.document.querySelector('img[data-setting="' + target + '"]');
    }
    if (!el && target === 'heroPoster' && typeof this.document.querySelector === 'function') {
      el = this.document.querySelector('#heroShowreelVisual') || this.document.querySelector('.hero-dark-center-visual img');
    }
    if (!el && typeof this.document.querySelector === 'function') {
      try {
        el = this.document.querySelector(target);
      } catch (e) {}
    }

    if (el) {
      el.src = url;
      if (typeof el.setAttribute === 'function') {
        el.setAttribute('src', url);
      }

      var settingKey = (typeof el.getAttribute === 'function' ? el.getAttribute('data-setting') : null) || target;
      this.postToParent({
        type: 'SAVE_SETTINGS',
        key: settingKey,
        setting: settingKey,
        value: url
      });
      this.emit('media-updated', { target: target, url: url });
    }
  };

  VisualEditorEngine.prototype.handleMessage = function(event) {
    if (!event || !event.data) return;
    var msg = event.data;
    if (typeof msg !== 'object') return;

    if (msg.type === 'TOGGLE_VISUAL_EDIT') {
      if (msg.active) {
        this.enable();
      } else {
        this.disable();
      }
    } else if (msg.type === 'MEDIA_SELECTED' || msg.type === 'UPDATE_IMAGE_SRC') {
      this.handleMediaSelected(msg.target, msg.url);
    }
  };

  VisualEditorEngine.prototype.postToParent = function(message) {
    try {
      if (this.window && this.window.parent && this.window.parent !== this.window) {
        this.window.parent.postMessage(message, '*');
      } else if (this.window && typeof this.window.postMessage === 'function') {
        // Fallback for detached/standalone execution
        this.window.postMessage(message, '*');
      }
    } catch (e) {
      console.warn('postMessage to parent failed:', e);
    }
  };

  VisualEditorEngine.prototype.updateElement = function(selectorOrEl, val, type) {
    if (!this.document) return false;
    var el = typeof selectorOrEl === 'string' && typeof this.document.querySelector === 'function'
      ? this.document.querySelector(selectorOrEl)
      : selectorOrEl;
    if (!el) return false;

    var isImg = type === 'image' || (el.tagName && el.tagName.toUpperCase() === 'IMG');
    if (isImg) {
      el.src = val;
      if (typeof el.setAttribute === 'function') {
        el.setAttribute('src', val);
      }
    } else {
      el.textContent = val;
    }

    var settingKey = typeof el.getAttribute === 'function' ? el.getAttribute('data-setting') : null;
    var i18nKey = typeof el.getAttribute === 'function' ? el.getAttribute('data-i18n') : null;

    if (settingKey) {
      this.postToParent({
        type: 'SAVE_SETTINGS',
        key: settingKey,
        setting: settingKey,
        value: val
      });
      this.emit('save', { type: 'setting', key: settingKey, value: val });
    } else if (i18nKey) {
      this.postToParent({
        type: 'SAVE_I18N',
        key: i18nKey,
        text: val
      });
      this.emit('save', { type: 'i18n', key: i18nKey, text: val });
    }

    return true;
  };

  VisualEditorEngine.prototype.on = function(event, callback) {
    if (typeof callback !== 'function') return;
    this.eventListeners[event] = this.eventListeners[event] || [];
    this.eventListeners[event].push(callback);
  };

  VisualEditorEngine.prototype.off = function(event, callback) {
    if (!this.eventListeners[event]) return;
    if (!callback) {
      delete this.eventListeners[event];
    } else {
      this.eventListeners[event] = this.eventListeners[event].filter(function(fn) {
        return fn !== callback;
      });
    }
  };

  VisualEditorEngine.prototype.emit = function(event, data) {
    var listeners = this.eventListeners[event];
    if (listeners && listeners.length) {
      listeners.forEach(function(fn) {
        try {
          fn(data);
        } catch (err) {
          console.error('[VisualEditor] Event listener error:', err);
        }
      });
    }
  };

  VisualEditorEngine.prototype.destroy = function() {
    this.disable();
    if (this.window && typeof this.window.removeEventListener === 'function') {
      this.window.removeEventListener('message', this.boundMessageHandler);
    }
    if (this.document && typeof this.document.getElementById === 'function') {
      var style = this.document.getElementById('visual-edit-styles');
      if (style && typeof style.remove === 'function') {
        style.remove();
      }
    }
    this.eventListeners = {};
  };

  // Singleton instance for automatic web browser integration
  var defaultInstance = new VisualEditorEngine(typeof window !== 'undefined' ? window : null);

  // Auto-init in browser environment
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading' && typeof document.addEventListener === 'function') {
      document.addEventListener('DOMContentLoaded', function() {
        defaultInstance.init();
      });
    } else {
      defaultInstance.init();
    }
  }

  return defaultInstance;
});
