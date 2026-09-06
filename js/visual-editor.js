// visual-editor.js
// Handles inline visual editing for the Admin Panel Live Preview

(function() {
    let isActive = false;
    let editingElement = null;

    window.addEventListener('message', (event) => {
        // Allow messages from same origin
        if (event.origin !== window.location.origin) return;

        if (event.data && event.data.type === 'TOGGLE_VISUAL_EDIT') {
            isActive = event.data.active;
            document.body.classList.toggle('visual-edit-active', isActive);
            
            if (isActive) {
                enableVisualEdit();
            } else {
                disableVisualEdit();
            }
        }
    });

    function enableVisualEdit() {
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(el => {
            el.classList.add('visual-editable');
            el.addEventListener('click', handleElementClick);
            el.addEventListener('blur', handleElementBlur);
            el.addEventListener('keydown', handleElementKeydown);
        });
        
        // Add styles if not present
        if (!document.getElementById('visual-edit-styles')) {
            const style = document.createElement('style');
            style.id = 'visual-edit-styles';
            style.innerHTML = `
                .visual-edit-active .visual-editable {
                    outline: 2px dashed rgba(106, 90, 205, 0.5) !important;
                    outline-offset: 2px !important;
                    cursor: pointer !important;
                    transition: outline 0.2s ease;
                    position: relative;
                }
                .visual-edit-active .visual-editable:hover {
                    outline: 2px solid rgba(106, 90, 205, 1) !important;
                    background: rgba(106, 90, 205, 0.1) !important;
                }
                .visual-edit-active .visual-editable[contenteditable="true"] {
                    outline: 2px solid #00c853 !important;
                    background: rgba(0, 200, 83, 0.1) !important;
                    cursor: text !important;
                }
            `;
            document.head.appendChild(style);
        }
    }

    function disableVisualEdit() {
        const elements = document.querySelectorAll('.visual-editable');
        elements.forEach(el => {
            el.classList.remove('visual-editable');
            el.removeAttribute('contenteditable');
            el.removeEventListener('click', handleElementClick);
            el.removeEventListener('blur', handleElementBlur);
            el.removeEventListener('keydown', handleElementKeydown);
        });
        if (editingElement) {
            editingElement.removeAttribute('contenteditable');
            editingElement = null;
        }
    }

    function handleElementClick(e) {
        if (!isActive) return;
        e.preventDefault();
        e.stopPropagation();
        
        if (editingElement && editingElement !== e.currentTarget) {
            editingElement.blur();
        }
        
        editingElement = e.currentTarget;
        editingElement.setAttribute('contenteditable', 'true');
        editingElement.focus();
    }

    function handleElementBlur(e) {
        if (!isActive) return;
        const el = e.currentTarget;
        el.removeAttribute('contenteditable');
        
        if (editingElement === el) {
            editingElement = null;
        }

        const newText = el.textContent.trim();
        const key = el.getAttribute('data-i18n');
        
        // Only save if it has a key
        if (key && newText) {
            // Send back to admin panel
            window.parent.postMessage({
                type: 'SAVE_I18N',
                key: key,
                text: newText
            }, window.location.origin);
        }
    }

    function handleElementKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            e.currentTarget.blur();
        }
    }
})();
