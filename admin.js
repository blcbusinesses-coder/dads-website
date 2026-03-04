/* ============================================
   Kevin Lowe — Admin Editing System
   Inline CMS for content management
   ============================================ */

(function () {
    'use strict';

    /* ─── Config ─────────────────────────────── */
    const ADMIN_CODE = 'Klowe7890!';
    const STORAGE_KEY = 'kl_admin_edits';

    /* ─── State ──────────────────────────────── */
    let isAdmin = false;
    let hasUnsavedChanges = false;
    let imageInputEl = null;
    let currentImageTarget = null;
    let sectionCounter = 0;

    /* ─── On DOM ready ──────────────────────── */
    document.addEventListener('DOMContentLoaded', () => {
        applySavedEdits();
        buildLoginModal();
        buildAdminToolbar();
        buildImageInput();
        wireAdminFooterLink();
        wireContextMenu();
    });

    /* ========================================================
       1. FOOTER LINK
       ======================================================== */
    function wireAdminFooterLink() {
        const link = document.getElementById('adminSignInLink');
        if (!link) return;
        link.addEventListener('click', (e) => {
            e.preventDefault();
            showLoginModal();
        });
    }

    /* ========================================================
       2. LOGIN MODAL
       ======================================================== */
    function buildLoginModal() {
        const modal = document.createElement('div');
        modal.id = 'adminLoginModal';
        modal.innerHTML = `
      <div class="adm-modal__backdrop" id="adminModalBackdrop"></div>
      <div class="adm-modal__box" role="dialog" aria-modal="true" aria-label="Admin sign in">
        <button class="adm-modal__close" id="adminModalClose" aria-label="Close">✕</button>
        <div class="adm-modal__logo">
          <span class="adm-modal__logo-name">Kevin Lowe</span>
          <span class="adm-modal__logo-tagline">Site Administration</span>
        </div>
        <h2 class="adm-modal__title">Sign In as Admin</h2>
        <p class="adm-modal__hint">Enter your admin access code to enable editing.</p>
        <div class="adm-modal__field">
          <input type="password" id="adminCodeInput" class="adm-modal__input"
            placeholder="Access code" maxlength="12" autocomplete="off">
        </div>
        <p class="adm-modal__error" id="adminCodeError"></p>
        <button class="adm-modal__btn" id="adminCodeSubmit">Sign In</button>
      </div>
    `;
        document.body.appendChild(modal);

        document.getElementById('adminModalClose').addEventListener('click', hideLoginModal);
        document.getElementById('adminModalBackdrop').addEventListener('click', hideLoginModal);
        document.getElementById('adminCodeSubmit').addEventListener('click', handleLogin);
        document.getElementById('adminCodeInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleLogin();
        });
    }

    function showLoginModal() {
        document.getElementById('adminLoginModal').classList.add('adm-modal--visible');
        document.getElementById('adminCodeInput').value = '';
        document.getElementById('adminCodeError').textContent = '';
        setTimeout(() => document.getElementById('adminCodeInput').focus(), 50);
    }

    function hideLoginModal() {
        document.getElementById('adminLoginModal').classList.remove('adm-modal--visible');
    }

    function handleLogin() {
        const code = document.getElementById('adminCodeInput').value.trim();
        const errorEl = document.getElementById('adminCodeError');
        if (code === ADMIN_CODE) {
            isAdmin = true;
            hideLoginModal();
            activateAdminMode();
        } else {
            errorEl.textContent = 'Incorrect code. Please try again.';
            const input = document.getElementById('adminCodeInput');
            input.classList.add('adm-modal__input--error');
            setTimeout(() => {
                input.classList.remove('adm-modal__input--error');
                errorEl.textContent = '';
            }, 2500);
        }
    }

    /* ========================================================
       3. ADMIN TOOLBAR (floating)
       ======================================================== */
    function buildAdminToolbar() {
        const bar = document.createElement('div');
        bar.id = 'adminToolbar';
        bar.innerHTML = `
      <div class="adm-bar__left">
        <span class="adm-bar__badge">✎ Admin Mode</span>
        <span class="adm-bar__tip">Click any text to edit • Click images to replace • Hover sections for controls</span>
      </div>
      <div class="adm-bar__right">
        <button class="adm-bar__btn adm-bar__btn--export" id="adminExportBtn" title="Download a copy of the HTML file">⬇ Export HTML</button>
        <button class="adm-bar__btn adm-bar__btn--exit" id="adminExitBtn">Exit</button>
        <button class="adm-bar__btn adm-bar__btn--save" id="adminSaveBtn">
          <span id="adminSaveBtnLabel">Save Changes</span>
        </button>
      </div>
    `;
        document.body.appendChild(bar);

        document.getElementById('adminExitBtn').addEventListener('click', deactivateAdminMode);
        document.getElementById('adminSaveBtn').addEventListener('click', saveChanges);
        document.getElementById('adminExportBtn').addEventListener('click', exportHTML);
    }

    /* ========================================================
       4. IMAGE INPUT (hidden)
       ======================================================== */
    function buildImageInput() {
        imageInputEl = document.createElement('input');
        imageInputEl.type = 'file';
        imageInputEl.accept = 'image/*';
        imageInputEl.style.display = 'none';
        imageInputEl.id = 'adminImageUpload';
        document.body.appendChild(imageInputEl);

        imageInputEl.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file || !currentImageTarget) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                currentImageTarget.src = ev.target.result;
                currentImageTarget.setAttribute('data-admin-modified', 'true');
                markChanged();
            };
            reader.readAsDataURL(file);
            imageInputEl.value = '';
        });
    }

    /* ========================================================
       5. ACTIVATE / DEACTIVATE ADMIN MODE
       ======================================================== */
    function activateAdminMode() {
        document.body.classList.add('admin-mode');
        showToolbar();
        enableTextEditing();
        enableImageEditing();
        enableSectionControls();
        showToast('Admin mode active. Click any element to edit.');
    }

    function deactivateAdminMode() {
        if (hasUnsavedChanges) {
            if (!confirm('You have unsaved changes. Exit without saving?')) return;
        }
        document.body.classList.remove('admin-mode');
        hideToolbar();
        disableTextEditing();
        disableImageEditing();
        disableSectionControls();
        isAdmin = false;
        hasUnsavedChanges = false;
    }

    function showToolbar() {
        document.getElementById('adminToolbar').classList.add('adm-bar--visible');
    }

    function hideToolbar() {
        document.getElementById('adminToolbar').classList.remove('adm-bar--visible');
    }

    /* ========================================================
       6. TEXT EDITING (contenteditable)
       ======================================================== */
    const EDITABLE_SELECTORS = [
        'h1', 'h2', 'h3', 'h4',
        'p:not(.adm-ignore)',
        '.label',
        '.hero__subtitle',
        '.trust-band__quote',
        '.trust-band__attribution',
        '.about__stat-number',
        '.about__stat-label',
        '.service-card__label',
        '.service-card__features li',
        '.approach__step-content h4',
        '.approach__step-content p',
        '.approach__step-number',
        '.safety__item h4',
        '.safety__item p',
        '.contact__detail-value',
        '.contact__detail-label',
        '.footer__tagline',
        '.footer__copyright',
        '.nav__logo-name',
        '.nav__logo-tagline',
    ];

    function enableTextEditing() {
        EDITABLE_SELECTORS.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => {
                // Skip elements inside admin UI
                if (el.closest('#adminToolbar, #adminLoginModal, #adminContextMenu')) return;
                el.setAttribute('contenteditable', 'true');
                el.classList.add('adm-editable');
                el.addEventListener('input', markChanged);
                el.addEventListener('focus', onEditableFocus);
                el.addEventListener('blur', onEditableBlur);
            });
        });
    }

    function disableTextEditing() {
        document.querySelectorAll('[contenteditable="true"]').forEach(el => {
            el.removeAttribute('contenteditable');
            el.classList.remove('adm-editable', 'adm-editable--focused');
            el.removeEventListener('input', markChanged);
            el.removeEventListener('focus', onEditableFocus);
            el.removeEventListener('blur', onEditableBlur);
        });
    }

    function onEditableFocus(e) {
        e.target.classList.add('adm-editable--focused');
    }

    function onEditableBlur(e) {
        e.target.classList.remove('adm-editable--focused');
    }

    /* ========================================================
       7. IMAGE EDITING
       ======================================================== */
    function enableImageEditing() {
        document.querySelectorAll('img').forEach(img => {
            if (img.closest('#adminToolbar, #adminLoginModal')) return;
            // Wrap in a relative positioned div for the overlay hint
            const parent = img.parentElement;
            if (parent && !parent.classList.contains('adm-img-wrap')) {
                const wrapper = document.createElement('div');
                wrapper.className = 'adm-img-wrap';
                parent.insertBefore(wrapper, img);
                wrapper.appendChild(img);
                const overlay = document.createElement('div');
                overlay.className = 'adm-img-overlay';
                overlay.textContent = '🖼  Click to Replace Image';
                wrapper.appendChild(overlay);
            }
            img.classList.add('adm-img-editable');
            img.addEventListener('click', onImageClick);
        });
    }

    function disableImageEditing() {
        document.querySelectorAll('.adm-img-editable').forEach(img => {
            img.classList.remove('adm-img-editable');
            img.removeEventListener('click', onImageClick);
            // Unwrap
            const wrapper = img.parentElement;
            if (wrapper && wrapper.classList.contains('adm-img-wrap')) {
                const grandParent = wrapper.parentElement;
                if (grandParent) {
                    grandParent.insertBefore(img, wrapper);
                    wrapper.remove();
                }
            }
        });
    }

    function onImageClick(e) {
        if (!isAdmin) return;
        e.preventDefault();
        e.stopPropagation();
        currentImageTarget = e.currentTarget;
        imageInputEl.click();
    }

    /* ========================================================
       8. SECTION CONTROLS (add / delete)
       ======================================================== */
    function enableSectionControls() {
        const sections = document.querySelectorAll('body > *:not(script):not(#adminToolbar):not(#adminLoginModal):not(#adminContextMenu):not(#adminImageUpload)');
        sections.forEach(el => {
            if (['NAV', 'SCRIPT'].includes(el.tagName)) return;
            addSectionDeleteBtn(el);
        });
        // Also handle each named section
        document.querySelectorAll('section, footer').forEach(el => {
            if (!el.querySelector('.adm-section-delete')) {
                addSectionDeleteBtn(el);
            }
            addSectionAddBtn(el);
        });
    }

    function addSectionDeleteBtn(el) {
        if (el.querySelector('.adm-section-delete')) return;
        const btn = document.createElement('button');
        btn.className = 'adm-section-delete';
        btn.title = 'Delete this section';
        btn.innerHTML = '✕ Delete Section';
        btn.addEventListener('click', () => {
            if (confirm('Delete this section? This cannot be undone until you refresh without saving.')) {
                el.remove();
                markChanged();
            }
        });
        el.style.position = el.style.position || 'relative';
        el.appendChild(btn);
    }

    function addSectionAddBtn(el) {
        if (el.querySelector('.adm-section-add')) return;
        const btn = document.createElement('button');
        btn.className = 'adm-section-add';
        btn.title = 'Add a new section after this one';
        btn.innerHTML = '+ Add Section Below';
        btn.addEventListener('click', () => showAddSectionDialog(el));
        el.appendChild(btn);
    }

    function disableSectionControls() {
        document.querySelectorAll('.adm-section-delete, .adm-section-add').forEach(b => b.remove());
    }

    /* ========================================================
       9. ADD SECTION DIALOG
       ======================================================== */
    function showAddSectionDialog(afterEl) {
        // Remove existing dialog if any
        const existing = document.getElementById('adminAddSectionDialog');
        if (existing) existing.remove();

        const dialog = document.createElement('div');
        dialog.id = 'adminAddSectionDialog';
        sectionCounter++;
        const id = `custom-section-${sectionCounter}`;

        dialog.innerHTML = `
      <div class="adm-addsec__backdrop" id="addSecBackdrop"></div>
      <div class="adm-addsec__box">
        <button class="adm-modal__close" id="addSecClose">✕</button>
        <h3 class="adm-addsec__title">Add New Section</h3>
        <p class="adm-addsec__sub">Choose a section type to insert below the current section.</p>
        <div class="adm-addsec__options">
          <button class="adm-addsec__opt" data-type="text">
            <span class="adm-addsec__icon">¶</span>
            <span>Text Block</span>
          </button>
          <button class="adm-addsec__opt" data-type="image-text">
            <span class="adm-addsec__icon">🖼</span>
            <span>Image + Text</span>
          </button>
          <button class="adm-addsec__opt" data-type="quote">
            <span class="adm-addsec__icon">"</span>
            <span>Quote / Callout</span>
          </button>
          <button class="adm-addsec__opt" data-type="cards">
            <span class="adm-addsec__icon">⊞</span>
            <span>Feature Cards</span>
          </button>
          <button class="adm-addsec__opt" data-type="cta">
            <span class="adm-addsec__icon">→</span>
            <span>Call to Action</span>
          </button>
        </div>
      </div>
    `;
        document.body.appendChild(dialog);

        dialog.querySelector('#addSecBackdrop').addEventListener('click', () => dialog.remove());
        dialog.querySelector('#addSecClose').addEventListener('click', () => dialog.remove());

        dialog.querySelectorAll('.adm-addsec__opt').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                const newSection = createNewSection(type, id);
                afterEl.insertAdjacentElement('afterend', newSection);
                dialog.remove();
                // Enable editing on new section
                EDITABLE_SELECTORS.forEach(sel => {
                    newSection.querySelectorAll(sel).forEach(el => {
                        el.setAttribute('contenteditable', 'true');
                        el.classList.add('adm-editable');
                        el.addEventListener('input', markChanged);
                        el.addEventListener('focus', onEditableFocus);
                        el.addEventListener('blur', onEditableBlur);
                    });
                });
                newSection.querySelectorAll('img').forEach(img => {
                    img.classList.add('adm-img-editable');
                    img.addEventListener('click', onImageClick);
                });
                addSectionDeleteBtn(newSection);
                addSectionAddBtn(newSection);
                markChanged();
                newSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                showToast('New section added. Click elements to edit.');
            });
        });
    }

    function createNewSection(type, id) {
        const sec = document.createElement('section');
        sec.className = 'section adm-new-section';
        sec.id = id;

        const templates = {
            'text': `
        <div class="container">
          <div class="section__header fade-in visible">
            <span class="label" contenteditable="true">New Label</span>
            <h2 contenteditable="true">New Section Heading</h2>
            <p contenteditable="true">Add your content here. Click this text to start editing and describe what you'd like to say.</p>
            <div class="section__divider"></div>
          </div>
          <div class="container--narrow" style="margin:0 auto">
            <p contenteditable="true">You can add additional paragraphs here. This section is fully editable — click any text to modify it.</p>
          </div>
        </div>
      `,
            'image-text': `
        <div class="container">
          <div class="about__grid">
            <div class="about__image">
              <img src="images/about.png" alt="Section image" style="height:400px;object-fit:cover;width:100%">
            </div>
            <div class="about__content">
              <span class="label" contenteditable="true">Section Label</span>
              <h2 contenteditable="true">Section Heading</h2>
              <p contenteditable="true">Describe this section. Click the image to replace it, and click any text to edit it.</p>
              <p contenteditable="true" style="margin-top:16px">Add a second paragraph if needed. This layout includes room for your content on one side and an image on the other.</p>
            </div>
          </div>
        </div>
      `,
            'quote': `
        <div class="trust-band" style="padding:80px 0">
          <div class="container container--narrow">
            <div class="trust-band__quote" contenteditable="true">
              Edit this quote or callout text to share an important message, testimonial, or highlight.
            </div>
            <div class="trust-band__attribution" contenteditable="true">— Attribution / Source</div>
          </div>
        </div>
      `,
            'cards': `
        <div class="container">
          <div class="section__header" style="text-align:center;margin-bottom:60px">
            <span class="label" contenteditable="true">Features</span>
            <h2 contenteditable="true">What We Offer</h2>
          </div>
          <div class="safety__inner" style="grid-template-columns:repeat(3,1fr);gap:32px">
            <div class="safety__item">
              <div class="safety__item-icon" contenteditable="true">⭐</div>
              <h4 contenteditable="true">Feature One</h4>
              <p contenteditable="true">Describe the first feature or benefit here in a few sentences.</p>
            </div>
            <div class="safety__item">
              <div class="safety__item-icon" contenteditable="true">✓</div>
              <h4 contenteditable="true">Feature Two</h4>
              <p contenteditable="true">Describe the second feature or benefit here in a few sentences.</p>
            </div>
            <div class="safety__item">
              <div class="safety__item-icon" contenteditable="true">🏆</div>
              <h4 contenteditable="true">Feature Three</h4>
              <p contenteditable="true">Describe the third feature or benefit here in a few sentences.</p>
            </div>
          </div>
        </div>
      `,
            'cta': `
        <div class="container" style="text-align:center;padding:60px 40px">
          <span class="label" contenteditable="true">Take Action</span>
          <h2 contenteditable="true" style="margin:16px auto 20px;max-width:600px">Ready to Get Started?</h2>
          <p contenteditable="true" style="max-width:500px;margin:0 auto 40px">Edit this call-to-action message to encourage visitors to schedule a consultation or contact you.</p>
          <a href="#contact" class="btn btn--primary">Schedule Consultation <span class="btn__arrow">→</span></a>
        </div>
      `
        };

        sec.innerHTML = templates[type] || templates['text'];
        return sec;
    }

    /* ========================================================
       10. CONTEXT MENU (right-click on section)
       ======================================================== */
    function wireContextMenu() {
        // We don't use a context menu — section controls are inline buttons
    }

    /* ========================================================
       11. SAVE CHANGES — persists to localStorage
       ======================================================== */
    function saveChanges() {
        const btn = document.getElementById('adminSaveBtn');
        const label = document.getElementById('adminSaveBtnLabel');

        btn.disabled = true;
        label.textContent = 'Saving…';

        // Build a clean snapshot of the page content
        const snapshot = buildContentSnapshot();

        // Persist to localStorage so it auto-loads next visit
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
        } catch (e) {
            console.error('Save failed — localStorage error:', e);
            showToast('⚠ Save failed. Your browser may be blocking localStorage.');
            btn.disabled = false;
            label.textContent = 'Save Changes';
            return;
        }

        hasUnsavedChanges = false;

        setTimeout(() => {
            label.textContent = 'Saved ✓';
            btn.style.background = '#2d6a4f';
            showToast('Changes saved! They will appear automatically every time you open this page.');
            setTimeout(() => {
                label.textContent = 'Save Changes';
                btn.style.background = '';
                btn.disabled = false;
            }, 3000);
        }, 400);
    }

    /* Build a JSON snapshot: { sectionId: innerHTML, ... }
       Captures each named section + the footer + nav logo */
    function buildContentSnapshot() {
        const snapshot = {};

        // Capture each section by ID
        ['hero', 'about', 'services', 'approach', 'safety', 'contact'].forEach(id => {
            const el = document.getElementById(id);
            if (el) snapshot[id] = cleanHTML(el.innerHTML);
        });

        // Capture footer inner content
        const footer = document.querySelector('footer');
        if (footer) snapshot['__footer__'] = cleanHTML(footer.innerHTML);

        // Capture nav logo text (in case it was edited)
        const navLogo = document.querySelector('.nav__logo');
        if (navLogo) snapshot['__nav_logo__'] = navLogo.innerHTML;

        // Capture any custom sections added during this session
        document.querySelectorAll('section[id^="custom-section-"]').forEach(sec => {
            snapshot[sec.id] = cleanHTML(sec.innerHTML);
            snapshot['__custom_order__'] = snapshot['__custom_order__'] || [];
            snapshot['__custom_order__'].push({
                id: sec.id,
                afterId: sec.previousElementSibling ? sec.previousElementSibling.id || '' : ''
            });
        });

        // Track which sections were deleted
        const allOriginalIds = ['hero', 'about', 'services', 'approach', 'safety', 'contact'];
        const deletedIds = allOriginalIds.filter(id => !document.getElementById(id));
        if (deletedIds.length) snapshot['__deleted__'] = deletedIds;

        return snapshot;
    }

    /* Strip admin-only classes/attributes from an HTML string */
    function cleanHTML(html) {
        const div = document.createElement('div');
        div.innerHTML = html;
        // Remove admin controls
        div.querySelectorAll('.adm-section-delete, .adm-section-add, .adm-img-overlay, .adm-img-wrap > .adm-img-overlay').forEach(el => el.remove());
        // Unwrap image wrappers
        div.querySelectorAll('.adm-img-wrap').forEach(wrapper => {
            const img = wrapper.querySelector('img');
            if (img) wrapper.parentElement.insertBefore(img, wrapper);
            wrapper.remove();
        });
        // Strip editable markers
        div.querySelectorAll('[contenteditable]').forEach(el => {
            el.removeAttribute('contenteditable');
            el.classList.remove('adm-editable', 'adm-editable--focused');
        });
        div.querySelectorAll('.adm-img-editable').forEach(el => el.classList.remove('adm-img-editable'));
        div.querySelectorAll('.adm-new-section').forEach(el => el.classList.remove('adm-new-section'));
        return div.innerHTML;
    }

    /* Export a full HTML file download (secondary action) */
    function exportHTML() {
        const snapshot = buildContentSnapshot();
        // Temporarily apply clean snapshot to build the body
        const bodyClone = document.body.cloneNode(true);
        ['#adminToolbar', '#adminLoginModal', '#adminImageUpload', '#adminAddSectionDialog', '.adm-toast']
            .forEach(sel => bodyClone.querySelectorAll(sel).forEach(el => el.remove()));
        bodyClone.querySelectorAll('.adm-section-delete,.adm-section-add').forEach(el => el.remove());
        bodyClone.querySelectorAll('.adm-img-wrap').forEach(wrapper => {
            const img = wrapper.querySelector('img');
            if (img) wrapper.parentElement.insertBefore(img, wrapper);
            wrapper.remove();
        });
        bodyClone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
        bodyClone.querySelectorAll('.adm-editable,.adm-editable--focused,.adm-img-editable,.adm-new-section,.admin-mode')
            .forEach(el => el.classList.remove('adm-editable', 'adm-editable--focused', 'adm-img-editable', 'adm-new-section'));
        bodyClone.classList.remove('admin-mode');

        const fullHTML = `<!DOCTYPE html>\n<html lang="en">\n<head>${document.head.innerHTML}\n</head>\n<body>\n${bodyClone.innerHTML}\n  <script src="script.js"><\/script>\n  <script src="admin.js"><\/script>\n</body>\n</html>`;
        const blob = new Blob([fullHTML], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'index.html'; a.style.display = 'none';
        document.body.appendChild(a); a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('HTML exported! Replace your index.html file with the downloaded version.');
    }

    function captureBodySnapshot() {
        // Clone body, strip all admin UI elements from clone
        const clone = document.body.cloneNode(true);
        ['#adminToolbar', '#adminLoginModal', '#adminImageUpload', '#adminAddSectionDialog',
            '#adminContextMenu', '.adm-section-delete', '.adm-section-add', '.adm-toast']
            .forEach(sel => {
                clone.querySelectorAll(sel).forEach(el => el.remove());
            });
        // Unwrap adm-img-wrap divs (move img back, remove wrapper+overlay)
        clone.querySelectorAll('.adm-img-wrap').forEach(wrapper => {
            const img = wrapper.querySelector('img');
            if (img) {
                wrapper.parentElement.insertBefore(img, wrapper);
            }
            wrapper.remove();
        });
        // Remove contenteditable attributes
        clone.querySelectorAll('[contenteditable]').forEach(el => {
            el.removeAttribute('contenteditable');
            el.classList.remove('adm-editable', 'adm-editable--focused');
        });
        // Remove admin-mode class
        clone.classList.remove('admin-mode');
        // Remove admin img classes
        clone.querySelectorAll('.adm-img-editable').forEach(el => {
            el.classList.remove('adm-img-editable');
        });
        // Remove admin-new-section marker
        clone.querySelectorAll('.adm-new-section').forEach(el => {
            el.classList.remove('adm-new-section');
        });
        return clone.innerHTML;
    }

    function generateHTMLDownload(bodySnapshot) {
        // Build a complete HTML document
        const doctype = '<!DOCTYPE html>';
        const headContent = document.head.innerHTML;
        const fullHTML = `${doctype}\n<html lang="en">\n<head>${headContent}\n</head>\n<body>\n${bodySnapshot}\n  <script src="script.js"><\/script>\n  <script src="admin.js"><\/script>\n</body>\n</html>`;

        const blob = new Blob([fullHTML], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'index.html';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /* ========================================================
       12. APPLY SAVED EDITS ON LOAD
       ======================================================== */
    function applySavedEdits() {
        let snapshot;
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            snapshot = JSON.parse(raw);
        } catch (e) {
            return; // Corrupted data — silently skip
        }

        // Remove any sections that were deleted
        const deleted = snapshot['__deleted__'] || [];
        deleted.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.remove();
        });

        // Restore each named section's inner HTML
        ['hero', 'about', 'services', 'approach', 'safety', 'contact'].forEach(id => {
            if (snapshot[id]) {
                const el = document.getElementById(id);
                if (el) el.innerHTML = snapshot[id];
            }
        });

        // Restore footer
        if (snapshot['__footer__']) {
            const footer = document.querySelector('footer');
            if (footer) footer.innerHTML = snapshot['__footer__'];
        }

        // Restore nav logo
        if (snapshot['__nav_logo__']) {
            const navLogo = document.querySelector('.nav__logo');
            if (navLogo) navLogo.innerHTML = snapshot['__nav_logo__'];
        }

        // Re-insert any custom sections that were added
        const customOrder = snapshot['__custom_order__'] || [];
        customOrder.forEach(entry => {
            if (!snapshot[entry.id]) return;
            const sec = document.createElement('section');
            sec.className = 'section';
            sec.id = entry.id;
            sec.innerHTML = snapshot[entry.id];
            // Insert after the reference element
            const afterEl = entry.afterId ? document.getElementById(entry.afterId) : null;
            if (afterEl) {
                afterEl.insertAdjacentElement('afterend', sec);
            } else {
                // Fallback: insert before footer
                const footer = document.querySelector('footer');
                if (footer) footer.insertAdjacentElement('beforebegin', sec);
            }
        });
    }

    /* ========================================================
       13. MARK CHANGED
       ======================================================== */
    function markChanged() {
        hasUnsavedChanges = true;
        const label = document.getElementById('adminSaveBtnLabel');
        if (label && label.textContent === 'Save Changes') {
            label.textContent = 'Save Changes •';
        }
    }

    /* ========================================================
       14. TOAST NOTIFICATION
       ======================================================== */
    function showToast(message) {
        // Remove existing toast
        document.querySelectorAll('.adm-toast').forEach(t => t.remove());
        const toast = document.createElement('div');
        toast.className = 'adm-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('adm-toast--visible'), 10);
        setTimeout(() => {
            toast.classList.remove('adm-toast--visible');
            setTimeout(() => toast.remove(), 400);
        }, 3500);
    }

})();
