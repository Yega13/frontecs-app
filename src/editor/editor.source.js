(function () {
  'use strict';

  // ================================================================
  // STATE
  // ================================================================
  var CONFIG = null;
  var STATE = {
    editMode: false,
    edits: [],
    seo: {},
    secretKey: null,
    siteId: null,
    saveTimer: null,
    activeEl: null,
    activeImg: null,
    activeLink: null,
    toolbar: null,
    saveIndicator: null,
    imgOverlay: null,
    linkPopup: null,
    history: [],       // { selector, type, before, after }
    historyIndex: -1,  // points to the last applied entry
    seoModal: null,
    resizeHandles: null,
    resizeData: null,
  };

  var EDITOR_ROOT_IDS = ['__fe_btn__', '__fe_toolbar__', '__fe_save__', '__fe_save_btn__', '__fe_img_overlay__', '__fe_link_popup__', '__fe_seo_modal__', '__fe_seo_backdrop__', '__fe_resize__'];
  var SKIP_TAGS = ['SCRIPT', 'STYLE', 'HTML', 'HEAD', 'BODY', 'LINK', 'META', 'NOSCRIPT'];

  var HAS_UNSAVED = false;
  var _editsApplied = false;

  // Apply pre-loaded edits immediately — the script runs at end of body so DOM is ready.
  // This eliminates flash: page stays hidden (set by server preload), edits apply, page shows.
  if (window.__FE_EDITS__) {
    STATE.edits = window.__FE_EDITS__.edits || [];
    STATE.seo   = window.__FE_EDITS__.seo   || {};
    applyAllEdits(STATE.edits, STATE.seo);
    document.documentElement.style.visibility = '';
    _editsApplied = true;
  }

  // sessionStorage fallback for private/incognito mode
  var _sessionFallback = null;
  function sessionGet(key) {
    try { return sessionStorage.getItem(key); } catch(e) { return _sessionFallback; }
  }
  function sessionSet(key, val) {
    try { sessionStorage.setItem(key, val); } catch(e) { _sessionFallback = val; }
  }
  function sessionRemove(key) {
    try { sessionStorage.removeItem(key); } catch(e) { _sessionFallback = null; }
  }

  // ================================================================
  // BOOT
  // ================================================================
  function fetchWithRetry(url, attempts, delay, resolve, reject) {
    fetch(url).then(resolve).catch(function () {
      if (attempts <= 1) { reject(); return; }
      setTimeout(function () {
        fetchWithRetry(url, attempts - 1, delay, resolve, reject);
      }, delay);
    });
  }

  function showConfigError() {
    var banner = document.createElement('div');
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#c0392b;color:#fff;padding:10px 16px;z-index:2147483647;font-family:sans-serif;font-size:14px;text-align:center;';
    banner.textContent = 'Frontecs editor failed to load config. Re-open via /__edit__/{key}';
    document.body.appendChild(banner);
  }

  new Promise(function (resolve, reject) {
    fetchWithRetry('/__editor__/config.json', 3, 800, resolve, reject);
  })
    .then(function (r) { return r.json(); })
    .then(function (cfg) {
      CONFIG = cfg;
      STATE.secretKey = cfg.secretKey;
      STATE.siteId = cfg.siteId;
      boot();
    })
    .catch(function () { showConfigError(); });

  function boot() {
    var keyInUrl = extractKeyFromUrl();
    var wantsEdit = false;

    if (keyInUrl) {
      if (keyInUrl !== CONFIG.secretKey) {
        showInvalidKeyError();
      } else {
        sessionSet('__fe_key__', CONFIG.secretKey);
        wantsEdit = true;
      }
    } else if (sessionGet('__fe_key__') === CONFIG.secretKey) {
      wantsEdit = true;
    }

    // Edits were already applied synchronously at script-load time — just enable edit mode.
    if (_editsApplied) {
      if (wantsEdit) enableEditMode();
      return;
    }

    // Fallback: async fetch (for older processed sites without server-side preload).
    fetch('/api/edits')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        STATE.edits = data.edits || [];
        STATE.seo = data.seo || {};
        applyAllEdits(STATE.edits, STATE.seo);
        if (wantsEdit) enableEditMode();
      })
      .catch(function () {
        if (wantsEdit) enableEditMode();
      });
  }

  function showInvalidKeyError() {
    var backdrop = document.createElement('div');
    backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:2147483646;backdrop-filter:blur(4px);';

    var card = document.createElement('div');
    card.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:2147483647;background:#1a0a0a;border:1.5px solid #dc2626;border-radius:16px;padding:40px 48px;text-align:center;font-family:system-ui,-apple-system,sans-serif;box-shadow:0 24px 64px rgba(0,0,0,0.8);max-width:420px;width:90%;';

    card.innerHTML = [
      '<div style="font-size:52px;margin-bottom:16px;">🔑</div>',
      '<div style="font-size:22px;font-weight:800;color:#fca5a5;margin-bottom:10px;">Invalid Edit Key</div>',
      '<div style="font-size:14px;color:#f87171;line-height:1.6;margin-bottom:28px;">The key in the URL does not match this site\'s secret key. Check the key in <code style="background:#2d0a0a;padding:2px 6px;border-radius:4px;">__editor__/config.json</code> and try again.</div>',
      '<button id="__fe_err_dismiss__" style="background:#dc2626;color:#fff;border:none;padding:12px 32px;border-radius:8px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;">Dismiss</button>',
    ].join('');

    function dismiss() { backdrop.remove(); card.remove(); }
    backdrop.addEventListener('click', dismiss);
    card.querySelector('#__fe_err_dismiss__').addEventListener('click', dismiss);

    document.body.appendChild(backdrop);
    document.body.appendChild(card);
  }

  function extractKeyFromUrl() {
    var m = location.pathname.match(/\/__edit__\/([a-f0-9]+)/);
    if (m) return m[1];
    m = location.search.match(/[?&]__edit__=([a-f0-9]+)/);
    if (m) return m[1];
    return null;
  }

  // ================================================================
  // APPLY SAVED EDITS ON PAGE LOAD
  // ================================================================
  function applyAllEdits(edits, seo) {
    edits.forEach(function (edit) {
      try {
        var el = document.querySelector(edit.selector);
        if (!el) return;
        if (edit.type === 'text') el.innerHTML = edit.after;
        else if (edit.type === 'image') el.src = edit.after;
        else if (edit.type === 'link') el.href = edit.after;
        else if (edit.type === 'resize') { el.style.width = edit.after; el.style.height = 'auto'; }
      } catch (e) {}
    });
    if (seo && Object.keys(seo).length) applySeoToPage(seo);
  }

  function applySeoToPage(seo) {
    if (seo.title) document.title = seo.title;
    setMetaContent('name', 'description', seo.description);
    setMetaContent('property', 'og:title', seo.ogTitle);
    setMetaContent('property', 'og:description', seo.ogDescription);
  }

  function setMetaContent(attr, val, content) {
    if (!content) return;
    var el = document.querySelector('meta[' + attr + '="' + val + '"]');
    if (el) el.setAttribute('content', content);
  }

  // ================================================================
  // ENABLE EDIT MODE
  // ================================================================
  function enableEditMode() {
    STATE.editMode = true;
    document.body.setAttribute('data-frontecs-edit', '1');
    buildFloatingButton();
    buildSaveButton();
    buildSaveIndicator();
    buildToolbar();
    buildImageOverlay();
    buildResizeHandles();
    buildLinkPopup();
    buildSeoModal();
    setupClickDispatch();
    setupKeyboard();
  }

  // ================================================================
  // FLOATING BUTTON
  // ================================================================
  function buildFloatingButton() {
    var btn = document.createElement('div');
    btn.id = '__fe_btn__';
    btn.innerHTML = '<span>&#9998;</span> Editing';
    btn.title = 'Click to exit edit mode';
    btn.addEventListener('click', function () {
      if (confirm('Exit edit mode? Unsaved changes will be lost.')) {
        sessionRemove('__fe_key__');
        location.href = location.pathname;
      }
    });
    document.body.appendChild(btn);
  }

  // ================================================================
  // SAVE BUTTON
  // ================================================================
  function buildSaveButton() {
    var btn = document.createElement('button');
    btn.id = '__fe_save_btn__';
    btn.textContent = 'Save';
    btn.title = 'Save changes (Ctrl+S)';
    btn.addEventListener('click', function () {
      if (STATE.activeEl) commitEdit(STATE.activeEl);
      showSaving();
      clearTimeout(STATE.saveTimer);
      persistEdits();
    });
    document.body.appendChild(btn);
  }

  // ================================================================
  // SAVE INDICATOR
  // ================================================================
  function buildSaveIndicator() {
    var el = document.createElement('div');
    el.id = '__fe_save__';
    document.body.appendChild(el);
    STATE.saveIndicator = el;
  }

  function showSaving() {
    var el = STATE.saveIndicator;
    el.textContent = 'Saving\u2026';
    el.className = 'saving';
    el.style.display = 'block';
  }

  function showSaved() {
    HAS_UNSAVED = false;
    var el = STATE.saveIndicator;
    el.textContent = 'Saved \u2713';
    el.className = 'saved';
    clearTimeout(el.__hideTimer);
    el.__hideTimer = setTimeout(function () { el.style.display = 'none'; }, 2500);
  }

  function showSaveError() {
    var el = STATE.saveIndicator;
    el.textContent = 'Save failed';
    el.className = 'error';
  }

  // ================================================================
  // TOOLBAR (text formatting)
  // ================================================================
  function buildToolbar() {
    var tb = document.createElement('div');
    tb.id = '__fe_toolbar__';
    tb.setAttribute('data-fe-ui', '1');
    tb.style.display = 'none';

    tb.innerHTML = [
      '<button data-cmd="bold"      title="Bold (Ctrl+B)"><b>B</b></button>',
      '<button data-cmd="italic"    title="Italic (Ctrl+I)"><i>I</i></button>',
      '<button data-cmd="underline" title="Underline (Ctrl+U)"><u>U</u></button>',
      '<span class="__fe_sep__"></span>',
      '<label title="Text color"><input type="color" id="__fe_color__" value="#000000"></label>',
      '<select id="__fe_size__" title="Font size">',
        '<option value="">px</option>',
        [10,12,14,16,18,20,24,28,32,36,42,48,60,72].map(function (s) {
          return '<option value="' + s + 'px">' + s + '</option>';
        }).join(''),
      '</select>',
      '<span class="__fe_sep__"></span>',
      '<button id="__fe_seo_btn__" title="Edit SEO (title, description, og tags)">SEO</button>',
    ].join('');

    tb.querySelectorAll('[data-cmd]').forEach(function (btn) {
      btn.addEventListener('mousedown', function (e) {
        e.preventDefault();
        document.execCommand(btn.dataset.cmd, false, null);
        scheduleSave();
      });
    });

    tb.querySelector('#__fe_color__').addEventListener('input', function (e) {
      document.execCommand('foreColor', false, e.target.value);
      scheduleSave();
    });

    tb.querySelector('#__fe_size__').addEventListener('change', function (e) {
      var px = e.target.value;
      if (!px) return;
      document.execCommand('fontSize', false, '7');
      document.querySelectorAll('font[size="7"]').forEach(function (f) {
        f.removeAttribute('size');
        f.style.fontSize = px;
      });
      scheduleSave();
    });

    tb.querySelector('#__fe_seo_btn__').addEventListener('mousedown', function (e) {
      e.preventDefault();
      openSeoModal();
    });

    document.body.appendChild(tb);
    STATE.toolbar = tb;
  }

  function showToolbar(el) {
    STATE.toolbar.style.display = 'flex';
    positionToolbar(el);
  }

  function positionToolbar(el) {
    var tb = STATE.toolbar;
    if (tb.style.display === 'none') return;
    var rect = el.getBoundingClientRect();
    var tbH = tb.offsetHeight || 44;
    var tbW = tb.offsetWidth || 340;
    var top = rect.top + window.scrollY - tbH - 10;
    if (top < window.scrollY + 4) top = rect.bottom + window.scrollY + 10;
    var left = Math.max(8, Math.min(rect.left + window.scrollX, window.innerWidth + window.scrollX - tbW - 8));
    tb.style.top = top + 'px';
    tb.style.left = left + 'px';
  }

  function hideToolbar() {
    if (STATE.toolbar) STATE.toolbar.style.display = 'none';
  }

  // ================================================================
  // IMAGE EDITING
  // ================================================================
  function buildImageOverlay() {
    var ov = document.createElement('div');
    ov.id = '__fe_img_overlay__';
    ov.setAttribute('data-fe-ui', '1');
    ov.style.display = 'none';
    ov.innerHTML = [
      '<button id="__fe_img_replace__">&#128247; Replace Image</button>',
      '<button id="__fe_img_close__">&times;</button>',
      '<input type="file" id="__fe_img_input__" accept="image/*" style="display:none">',
    ].join('');

    ov.querySelector('#__fe_img_replace__').addEventListener('click', function () {
      ov.querySelector('#__fe_img_input__').click();
    });
    ov.querySelector('#__fe_img_close__').addEventListener('click', function () {
      hideImageOverlay();
    });
    ov.querySelector('#__fe_img_input__').addEventListener('change', function (e) {
      var file = e.target.files[0];
      if (!file) return;
      processImage(file, function (dataUrl) {
        var img = STATE.activeImg;
        if (!img) return;
        var before = img.src;
        img.src = dataUrl;
        recordEdit({ type: 'image', selector: getSelector(img), before: before, after: dataUrl });
        scheduleSave();
        hideImageOverlay();
      });
      e.target.value = '';
    });

    document.body.appendChild(ov);
    STATE.imgOverlay = ov;
  }

  function showImageOverlay(img) {
    STATE.activeImg = img;
    var ov = STATE.imgOverlay;
    var rect = img.getBoundingClientRect();
    ov.style.display = 'flex';
    ov.style.top = (rect.top + window.scrollY + rect.height / 2 - 20) + 'px';
    ov.style.left = (rect.left + window.scrollX + rect.width / 2 - 80) + 'px';
    showResizeHandles(img);
  }

  function hideImageOverlay() {
    STATE.imgOverlay.style.display = 'none';
    STATE.activeImg = null;
    hideResizeHandles();
  }

  // ================================================================
  // IMAGE RESIZE HANDLES
  // ================================================================
  function buildResizeHandles() {
    var container = document.createElement('div');
    container.id = '__fe_resize__';
    container.setAttribute('data-fe-ui', '1');
    container.style.display = 'none';

    ['nw', 'ne', 'sw', 'se'].forEach(function (corner) {
      var h = document.createElement('div');
      h.className = '__fe_rh__';
      h.dataset.corner = corner;
      h.addEventListener('mousedown', onResizeStart);
      container.appendChild(h);
    });

    document.body.appendChild(container);
    STATE.resizeHandles = container;
  }

  function showResizeHandles(img) {
    var c = STATE.resizeHandles;
    if (!c) return;
    var r = img.getBoundingClientRect();
    c.style.left   = (r.left + window.scrollX) + 'px';
    c.style.top    = (r.top  + window.scrollY) + 'px';
    c.style.width  = r.width  + 'px';
    c.style.height = r.height + 'px';
    c.style.display = 'block';
    c._img = img;
  }

  function hideResizeHandles() {
    if (STATE.resizeHandles) {
      STATE.resizeHandles.style.display = 'none';
      STATE.resizeHandles._img = null;
    }
  }

  function repositionResizeHandles() {
    var c = STATE.resizeHandles;
    if (!c || c.style.display === 'none' || !c._img) return;
    showResizeHandles(c._img);
  }

  function onResizeStart(e) {
    e.preventDefault();
    e.stopPropagation();
    var img = STATE.resizeHandles._img;
    if (!img) return;
    var r = img.getBoundingClientRect();
    STATE.resizeData = {
      img:       img,
      corner:    e.currentTarget.dataset.corner,
      startX:    e.clientX,
      startY:    e.clientY,
      startW:    r.width,
      startH:    r.height,
      origWidth: img.style.width,
    };
    document.addEventListener('mousemove', onResizeMove);
    document.addEventListener('mouseup',   onResizeEnd);
  }

  function onResizeMove(e) {
    var d = STATE.resizeData;
    if (!d) return;
    var dx = e.clientX - d.startX;
    // right-side corners grow when dragging right; left-side shrink
    var newW = (d.corner === 'se' || d.corner === 'ne')
      ? Math.max(20, d.startW + dx)
      : Math.max(20, d.startW - dx);
    var ratio = d.startH / d.startW;
    d.img.style.width  = newW + 'px';
    d.img.style.height = (newW * ratio) + 'px';
    repositionResizeHandles();
  }

  function onResizeEnd() {
    var d = STATE.resizeData;
    if (!d) return;
    document.removeEventListener('mousemove', onResizeMove);
    document.removeEventListener('mouseup',   onResizeEnd);
    var newW = d.img.style.width;
    if (newW !== d.origWidth) {
      recordEdit({ type: 'resize', selector: getSelector(d.img), before: d.origWidth, after: newW });
      scheduleSave();
    }
    STATE.resizeData = null;
  }

  function processImage(file, cb) {
    var MAX = 1920;
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        var w = img.width;
        var h = img.height;
        if (w > MAX || h > MAX) {
          var ratio = Math.min(MAX / w, MAX / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        var canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        // Use WebP if supported, else jpeg
        var dataUrl = canvas.toDataURL('image/webp', 0.85);
        if (dataUrl.startsWith('data:image/webp')) {
          cb(dataUrl);
        } else {
          cb(canvas.toDataURL('image/jpeg', 0.85));
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // ================================================================
  // LINK EDITING
  // ================================================================
  function buildLinkPopup() {
    var pop = document.createElement('div');
    pop.id = '__fe_link_popup__';
    pop.setAttribute('data-fe-ui', '1');
    pop.style.display = 'none';
    pop.innerHTML = [
      '<span class="__fe_link_label__">&#128279; URL</span>',
      '<input type="url" id="__fe_link_input__" placeholder="https://">',
      '<button id="__fe_link_save__">Save</button>',
      '<button id="__fe_link_close__">&times;</button>',
    ].join('');

    pop.querySelector('#__fe_link_save__').addEventListener('click', function () {
      commitLinkEdit();
    });
    pop.querySelector('#__fe_link_close__').addEventListener('click', function () {
      hideLinkPopup();
    });
    pop.querySelector('#__fe_link_input__').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') commitLinkEdit();
      if (e.key === 'Escape') hideLinkPopup();
    });

    document.body.appendChild(pop);
    STATE.linkPopup = pop;
  }

  function showLinkPopup(anchor) {
    STATE.activeLink = anchor;
    var pop = STATE.linkPopup;
    pop.querySelector('#__fe_link_input__').value = anchor.href || '';
    pop.style.display = 'flex';
    var rect = anchor.getBoundingClientRect();
    var popH = 44;
    var top = rect.bottom + window.scrollY + 8;
    if (top + popH > window.scrollY + window.innerHeight) top = rect.top + window.scrollY - popH - 8;
    pop.style.top = top + 'px';
    pop.style.left = Math.max(8, rect.left + window.scrollX) + 'px';
    pop.querySelector('#__fe_link_input__').focus();
  }

  function commitLinkEdit() {
    var link = STATE.activeLink;
    if (!link) return;
    var newHref = STATE.linkPopup.querySelector('#__fe_link_input__').value.trim();
    var before = link.href;
    link.href = newHref;
    recordEdit({ type: 'link', selector: getSelector(link), before: before, after: newHref });
    scheduleSave();
    hideLinkPopup();
  }

  function hideLinkPopup() {
    STATE.linkPopup.style.display = 'none';
    STATE.activeLink = null;
  }

  // ================================================================
  // SEO MODAL
  // ================================================================
  function buildSeoModal() {
    // Backdrop
    var backdrop = document.createElement('div');
    backdrop.id = '__fe_seo_backdrop__';
    backdrop.setAttribute('data-fe-ui', '1');
    backdrop.style.display = 'none';
    backdrop.addEventListener('click', closeSeoModal);

    // Modal
    var modal = document.createElement('div');
    modal.id = '__fe_seo_modal__';
    modal.setAttribute('data-fe-ui', '1');
    modal.style.display = 'none';
    modal.innerHTML = [
      '<div class="__fe_seo_header__">',
        '<span>&#128270; SEO Settings</span>',
        '<button id="__fe_seo_close__">&times;</button>',
      '</div>',
      '<div class="__fe_seo_body__">',
        '<label class="__fe_seo_label__">Page Title',
          '<input id="__fe_seo_title__" type="text" placeholder="My Awesome Site">',
        '</label>',
        '<label class="__fe_seo_label__">Meta Description',
          '<textarea id="__fe_seo_desc__" rows="2" placeholder="A short description of this page..."></textarea>',
        '</label>',
        '<label class="__fe_seo_label__">OG Title',
          '<input id="__fe_seo_og_title__" type="text" placeholder="Same as page title if left blank">',
        '</label>',
        '<label class="__fe_seo_label__">OG Description',
          '<textarea id="__fe_seo_og_desc__" rows="2" placeholder="Same as meta description if left blank"></textarea>',
        '</label>',
      '</div>',
      '<div class="__fe_seo_footer__">',
        '<button id="__fe_seo_save__">Save SEO</button>',
        '<button id="__fe_seo_cancel__">Cancel</button>',
      '</div>',
    ].join('');

    modal.querySelector('#__fe_seo_close__').addEventListener('click', closeSeoModal);
    modal.querySelector('#__fe_seo_cancel__').addEventListener('click', closeSeoModal);
    modal.querySelector('#__fe_seo_save__').addEventListener('click', commitSeoEdit);

    document.body.appendChild(backdrop);
    document.body.appendChild(modal);
    STATE.seoModal = modal;
  }

  function openSeoModal() {
    var seo = STATE.seo || {};
    var modal = STATE.seoModal;
    modal.querySelector('#__fe_seo_title__').value = seo.title || document.title || '';
    modal.querySelector('#__fe_seo_desc__').value = seo.description || getMetaContent('name', 'description') || '';
    modal.querySelector('#__fe_seo_og_title__').value = seo.ogTitle || getMetaContent('property', 'og:title') || '';
    modal.querySelector('#__fe_seo_og_desc__').value = seo.ogDescription || getMetaContent('property', 'og:description') || '';

    document.getElementById('__fe_seo_backdrop__').style.display = 'block';
    modal.style.display = 'flex';
    modal.querySelector('#__fe_seo_title__').focus();
  }

  function closeSeoModal() {
    document.getElementById('__fe_seo_backdrop__').style.display = 'none';
    STATE.seoModal.style.display = 'none';
  }

  function commitSeoEdit() {
    var modal = STATE.seoModal;
    var newSeo = {
      title:         modal.querySelector('#__fe_seo_title__').value.trim(),
      description:   modal.querySelector('#__fe_seo_desc__').value.trim(),
      ogTitle:       modal.querySelector('#__fe_seo_og_title__').value.trim(),
      ogDescription: modal.querySelector('#__fe_seo_og_desc__').value.trim(),
    };
    STATE.seo = newSeo;
    applySeoToPage(newSeo);
    scheduleSave();
    closeSeoModal();
  }

  function getMetaContent(attr, val) {
    var el = document.querySelector('meta[' + attr + '="' + val + '"]');
    return el ? el.getAttribute('content') : '';
  }

  // ================================================================
  // CLICK DISPATCHER — routes clicks to the right handler
  // ================================================================
  function isEditorEl(el) {
    return EDITOR_ROOT_IDS.some(function (id) {
      return el.closest && el.closest('#' + id);
    });
  }

  function setupClickDispatch() {
    function dispatch(target, preventDefault) {
      if (isEditorEl(target)) return;
      if (STATE.activeEl) commitEdit(STATE.activeEl);
      hideImageOverlay();
      hideLinkPopup();

      var img = target.closest('img');
      if (img) { if (preventDefault) preventDefault(); showImageOverlay(img); return; }

      var anchor = target.closest('a');
      if (anchor) { if (preventDefault) preventDefault(); showLinkPopup(anchor); return; }

      var el = findTextTarget(target);
      if (el) activateTextElement(el);
    }

    // Mouse click
    document.addEventListener('click', function (e) {
      dispatch(e.target, function () { e.preventDefault(); });
    });

    // Touch tap — needed for iOS where images/links block synthetic click
    var touchStartX, touchStartY;
    document.addEventListener('touchstart', function (e) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });
    document.addEventListener('touchend', function (e) {
      var dx = Math.abs(e.changedTouches[0].clientX - touchStartX);
      var dy = Math.abs(e.changedTouches[0].clientY - touchStartY);
      if (dx > 10 || dy > 10) return; // was a swipe, not a tap
      var target = document.elementFromPoint(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
      if (target) dispatch(target, function () { e.preventDefault(); });
    }, { passive: false });

    // Click outside active text element → commit
    document.addEventListener('mousedown', function (e) {
      if (!STATE.activeEl) return;
      if (isEditorEl(e.target)) return;
      if (e.target === STATE.activeEl || STATE.activeEl.contains(e.target)) return;
      commitEdit(STATE.activeEl);
    });

    window.addEventListener('scroll', function () {
      if (STATE.activeEl) positionToolbar(STATE.activeEl);
      repositionResizeHandles();
    }, { passive: true });
    window.addEventListener('resize', function () {
      if (STATE.activeEl) positionToolbar(STATE.activeEl);
      repositionResizeHandles();
    });
  }

  function findTextTarget(el) {
    var cur = el;
    while (cur && cur !== document.body) {
      if (!SKIP_TAGS.includes(cur.tagName) && cur.tagName !== 'IMG' && cur.tagName !== 'A') return cur;
      cur = cur.parentElement;
    }
    return null;
  }

  // ================================================================
  // TEXT EDITING
  // ================================================================
  function activateTextElement(el) {
    STATE.activeEl = el;
    el.contentEditable = 'true';
    el.setAttribute('data-fe-before', el.innerHTML);
    el.setAttribute('data-fe-active', '1');
    el.focus();
    showToolbar(el);
    el.addEventListener('input', onTextInput);
  }

  function onTextInput() {
    positionToolbar(STATE.activeEl);
    scheduleSave();
  }

  function commitEdit(el) {
    var before = el.getAttribute('data-fe-before') || '';
    var after = el.innerHTML;
    el.contentEditable = 'false';
    el.removeAttribute('contenteditable');
    el.removeAttribute('data-fe-before');
    el.removeAttribute('data-fe-active');
    el.removeEventListener('input', onTextInput);
    STATE.activeEl = null;
    hideToolbar();
    if (before !== after) {
      recordEdit({ type: 'text', selector: getSelector(el), before: before, after: after });
      scheduleSave();
    }
  }

  // ================================================================
  // CSS SELECTOR GENERATOR
  // ================================================================
  function getSelector(element) {
    var path = [];
    var el = element;
    while (el && el !== document.body) {
      var seg = el.tagName.toLowerCase();
      if (el.id) {
        seg += '#' + CSS.escape(el.id);
        path.unshift(seg);
        break;
      }
      var siblings = Array.from(el.parentNode.children).filter(function (s) {
        return s.tagName === el.tagName;
      });
      if (siblings.length > 1) {
        seg += ':nth-of-type(' + (siblings.indexOf(el) + 1) + ')';
      }
      path.unshift(seg);
      el = el.parentElement;
    }
    return path.join(' > ');
  }

  // ================================================================
  // RECORD EDITS + HISTORY
  // ================================================================
  var MAX_HISTORY = 50;

  function recordEdit(edit) {
    edit.id = 'edit_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    edit.timestamp = Date.now();
    var idx = STATE.edits.findIndex(function (e) {
      return e.selector === edit.selector && e.type === edit.type;
    });
    if (idx >= 0) {
      edit.before = STATE.edits[idx].before;
      STATE.edits[idx] = edit;
    } else {
      STATE.edits.push(edit);
    }
    pushHistory(edit);
  }

  function pushHistory(entry) {
    // Discard any redo entries above current index
    STATE.history = STATE.history.slice(0, STATE.historyIndex + 1);
    STATE.history.push({ selector: entry.selector, type: entry.type, before: entry.before, after: entry.after });
    if (STATE.history.length > MAX_HISTORY) STATE.history.shift();
    STATE.historyIndex = STATE.history.length - 1;
  }

  function applyHistoryEntry(entry, direction) {
    var value = direction === 'undo' ? entry.before : entry.after;
    try {
      var el = document.querySelector(entry.selector);
      if (!el) return;
      if (entry.type === 'text') el.innerHTML = value;
      else if (entry.type === 'image') el.src = value;
      else if (entry.type === 'link') el.href = value;
      else if (entry.type === 'resize') { el.style.width = value; el.style.height = 'auto'; }
    } catch (e) {}
    // Sync STATE.edits
    var idx = STATE.edits.findIndex(function (e) {
      return e.selector === entry.selector && e.type === entry.type;
    });
    if (idx >= 0) STATE.edits[idx].after = value;
    scheduleSave();
  }

  function undo() {
    if (STATE.historyIndex < 0) return;
    if (STATE.activeEl) commitEdit(STATE.activeEl);
    applyHistoryEntry(STATE.history[STATE.historyIndex], 'undo');
    STATE.historyIndex--;
  }

  function redo() {
    if (STATE.historyIndex >= STATE.history.length - 1) return;
    if (STATE.activeEl) commitEdit(STATE.activeEl);
    STATE.historyIndex++;
    applyHistoryEntry(STATE.history[STATE.historyIndex], 'redo');
  }

  // ================================================================
  // AUTO-SAVE
  // ================================================================
  function scheduleSave() {
    HAS_UNSAVED = true;
    showSaving();
    clearTimeout(STATE.saveTimer);
    STATE.saveTimer = setTimeout(persistEdits, 600);
  }

  function persistEdits() {
    fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secretKey: STATE.secretKey,
        siteId: STATE.siteId,
        edits: STATE.edits,
        seo: STATE.seo,
      }),
    })
      .then(function (r) { return r.json(); })
      .then(function (d) { if (d.ok) showSaved(); else showSaveError(); })
      .catch(showSaveError);
  }

  // ================================================================
  // KEYBOARD SHORTCUTS
  // ================================================================
  function setupKeyboard() {
    document.addEventListener('keydown', function (e) {
      var ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === 's') {
        e.preventDefault();
        if (STATE.activeEl) commitEdit(STATE.activeEl);
        persistEdits();
        return;
      }

      // Undo: Ctrl+Z
      if (ctrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
        return;
      }

      if (e.key === 'Escape') {
        if (STATE.activeEl) {
          STATE.activeEl.innerHTML = STATE.activeEl.getAttribute('data-fe-before') || STATE.activeEl.innerHTML;
          commitEdit(STATE.activeEl);
        }
        hideImageOverlay();
        hideLinkPopup();
      }
    });

    window.addEventListener('beforeunload', function (e) {
      if (HAS_UNSAVED) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Save before leaving.';
      }
    });

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden' && HAS_UNSAVED) {
        if (STATE.activeEl) commitEdit(STATE.activeEl);
        persistEdits();
      }
    });
  }

})();
