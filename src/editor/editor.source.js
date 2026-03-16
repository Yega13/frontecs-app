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
    fonts: [],          // Google Fonts in use — persisted inside seo._fonts
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
    history: [],        // { selector, type, before, after, label, time }
    historyIndex: -1,
    seoModal: null,
    exitModal: null,
    historyPanel: null,
    historyPanelOpen: false,
    resizeHandles: null,
    resizeData: null,
    reorderMode: false,
    reorderParent: null,
  };

  var EDITOR_ROOT_IDS = [
    '__fe_btn__', '__fe_toolbar__', '__fe_save__', '__fe_save_btn__',
    '__fe_img_overlay__', '__fe_link_popup__', '__fe_seo_modal__', '__fe_seo_backdrop__',
    '__fe_resize__', '__fe_exit_modal__', '__fe_exit_backdrop__',
    '__fe_history_btn__', '__fe_history_panel__', '__fe_reorder_btn__',
  ];
  var SKIP_TAGS   = ['SCRIPT','STYLE','HTML','HEAD','BODY','LINK','META','NOSCRIPT'];
  var SECTION_TAGS = ['DIV','SECTION','ARTICLE','HEADER','FOOTER','NAV','ASIDE','MAIN'];

  var HAS_UNSAVED   = false;
  var _editsApplied = false;

  // ================================================================
  // FLASH FIX — runs synchronously before DOM paint
  // ================================================================
  if (window.__FE_EDITS__) {
    STATE.edits = window.__FE_EDITS__.edits || [];
    STATE.seo   = window.__FE_EDITS__.seo   || {};
    applyAllEdits(STATE.edits, STATE.seo);
    var _hideEl = document.getElementById('__fe_hide__');
    if (_hideEl && _hideEl.parentNode) _hideEl.parentNode.removeChild(_hideEl);
    document.documentElement.style.visibility = '';
    _editsApplied = true;
  }

  // ================================================================
  // SESSION STORAGE
  // ================================================================
  var _sessionFallback = null;
  function sessionGet(k)    { try { return sessionStorage.getItem(k); }    catch(e) { return _sessionFallback; } }
  function sessionSet(k,v)  { try { sessionStorage.setItem(k,v); }      catch(e) { _sessionFallback = v; } }
  function sessionRemove(k) { try { sessionStorage.removeItem(k); }      catch(e) { _sessionFallback = null; } }

  // ================================================================
  // BOOT
  // ================================================================
  function fetchWithRetry(url, attempts, delay, resolve, reject) {
    fetch(url).then(resolve).catch(function () {
      if (attempts <= 1) { reject(); return; }
      setTimeout(function () { fetchWithRetry(url, attempts - 1, delay, resolve, reject); }, delay);
    });
  }

  function showConfigError() {
    var b = document.createElement('div');
    b.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#c0392b;color:#fff;padding:10px 16px;z-index:2147483647;font-family:sans-serif;font-size:14px;text-align:center;';
    b.textContent = 'Frontecs editor failed to load config. Re-open via /__edit__/{key}';
    document.body.appendChild(b);
  }

  new Promise(function (resolve, reject) {
    fetchWithRetry('/__editor__/config.json', 3, 800, resolve, reject);
  })
    .then(function (r) { return r.json(); })
    .then(function (cfg) { CONFIG = cfg; STATE.secretKey = cfg.secretKey; STATE.siteId = cfg.siteId; boot(); })
    .catch(showConfigError);

  function boot() {
    var keyInUrl   = extractKeyFromUrl();
    var wantsEdit  = false;
    if (keyInUrl) {
      if (keyInUrl !== CONFIG.secretKey) { showInvalidKeyError(); }
      else { sessionSet('__fe_key__', CONFIG.secretKey); wantsEdit = true; }
    } else if (sessionGet('__fe_key__') === CONFIG.secretKey) {
      wantsEdit = true;
    }
    if (_editsApplied) { if (wantsEdit) enableEditMode(); return; }
    fetch('/api/edits')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        STATE.edits = data.edits || [];
        STATE.seo   = data.seo   || {};
        applyAllEdits(STATE.edits, STATE.seo);
        if (wantsEdit) enableEditMode();
      })
      .catch(function () { if (wantsEdit) enableEditMode(); });
  }

  function extractKeyFromUrl() {
    var m = location.pathname.match(/\/__edit__\/([a-f0-9]+)/);
    if (m) return m[1];
    m = location.search.match(/[?&]__edit__=([a-f0-9]+)/);
    return m ? m[1] : null;
  }

  function showInvalidKeyError() {
    var bd = el('div','',{style:'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:2147483646;backdrop-filter:blur(4px);'});
    var card = el('div','',{style:'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:2147483647;background:#1a0a0a;border:1.5px solid #dc2626;border-radius:16px;padding:40px 48px;text-align:center;font-family:system-ui,sans-serif;max-width:420px;width:90%;'});
    card.innerHTML = '<div style="font-size:48px;margin-bottom:16px;">&#128273;</div><div style="font-size:22px;font-weight:800;color:#fca5a5;margin-bottom:10px;">Invalid Edit Key</div><div style="font-size:14px;color:#f87171;margin-bottom:28px;">The key in the URL does not match this site\'s secret key.</div><button style="background:#dc2626;color:#fff;border:none;padding:12px 32px;border-radius:8px;font-size:15px;font-weight:700;cursor:pointer;">Dismiss</button>';
    function dismiss() { bd.remove(); card.remove(); }
    bd.addEventListener('click', dismiss);
    card.querySelector('button').addEventListener('click', dismiss);
    document.body.appendChild(bd); document.body.appendChild(card);
  }

  // ================================================================
  // APPLY SAVED EDITS
  // ================================================================
  function applyAllEdits(edits, seo) {
    if (seo && seo._fonts) seo._fonts.forEach(loadGoogleFont);
    edits.forEach(function (edit) {
      try {
        if (edit.type === 'reorder') { applyReorderEdit(edit); return; }
        var target = document.querySelector(edit.selector);
        if (!target) return;
        if      (edit.type === 'text')   target.innerHTML     = edit.after;
        else if (edit.type === 'image')  target.src           = edit.after;
        else if (edit.type === 'link')   target.href          = edit.after;
        else if (edit.type === 'resize') { target.style.width = edit.after; target.style.height = 'auto'; }
        else if (edit.type === 'delete') target.style.display = 'none';
        else if (edit.type === 'video')  applyVideoEdit(target, edit.after);
      } catch (e) {}
    });
    if (seo && Object.keys(seo).length) applySeoToPage(seo);
  }

  function applyReorderEdit(edit) {
    try {
      var par = document.querySelector(edit.selector);
      if (!par || !edit.after) return;
      var kids = getReorderableChildren(par);
      edit.after.forEach(function (origIdx) {
        var child = kids[origIdx];
        if (child) { child.setAttribute('data-fe-orig-idx', String(origIdx)); par.appendChild(child); }
      });
    } catch(e) {}
  }

  function applyVideoEdit(imgEl, videoSrc) {
    imgEl.style.display = 'none';
    var next = imgEl.nextElementSibling;
    var vid = (next && next.tagName === 'VIDEO' && next.hasAttribute('data-fe-vid')) ? next : null;
    if (!vid) {
      vid = document.createElement('video');
      vid.setAttribute('data-fe-vid','1');
      vid.setAttribute('autoplay',''); vid.setAttribute('muted','');
      vid.setAttribute('loop',''); vid.setAttribute('playsinline','');
      var w = imgEl.style.width || (imgEl.getAttribute('width') ? imgEl.getAttribute('width')+'px' : '');
      if (w) vid.style.width = w;
      imgEl.parentNode.insertBefore(vid, imgEl.nextSibling);
    }
    vid.src = videoSrc;
  }

  function applySeoToPage(seo) {
    if (seo.title) document.title = seo.title;
    setMeta('name','description', seo.description);
    setMeta('property','og:title', seo.ogTitle);
    setMeta('property','og:description', seo.ogDescription);
  }
  function setMeta(attr, val, content) {
    if (!content) return;
    var m = document.querySelector('meta['+attr+'="'+val+'"]');
    if (m) m.setAttribute('content', content);
  }

  // ================================================================
  // GOOGLE FONTS
  // ================================================================
  var GOOGLE_FONTS = ['Roboto','Open Sans','Lato','Montserrat','Poppins','Playfair Display','Raleway','Oswald','Merriweather','Nunito','Inter','DM Sans','Bebas Neue'];
  var SYSTEM_FONTS = ['Arial','Georgia','Times New Roman','Verdana','Courier New','Trebuchet MS','Impact','Tahoma'];

  function loadGoogleFont(name) {
    var id = '__fe_gf_'+name.replace(/\s+/g,'_');
    if (document.getElementById(id)) return;
    var link = document.createElement('link');
    link.id = id; link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family='+encodeURIComponent(name)+':wght@400;700&display=swap';
    document.head.appendChild(link);
  }

  function useFont(name) {
    var isGoogle = GOOGLE_FONTS.indexOf(name) !== -1;
    if (isGoogle) {
      loadGoogleFont(name);
      if (STATE.fonts.indexOf(name) === -1) STATE.fonts.push(name);
    }
    try {
      document.execCommand('styleWithCSS', false, true);
      document.execCommand('fontName', false, name);
    } catch(e) {}
    scheduleSave();
  }

  // ================================================================
  // ENABLE EDIT MODE
  // ================================================================
  function enableEditMode() {
    STATE.editMode = true;
    STATE.fonts = (STATE.seo && STATE.seo._fonts) ? STATE.seo._fonts.slice() : [];
    document.body.setAttribute('data-frontecs-edit','1');
    buildExitModal();
    buildFloatingButton();
    buildSaveButton();
    buildSaveIndicator();
    buildToolbar();
    buildImageOverlay();
    buildResizeHandles();
    buildLinkPopup();
    buildSeoModal();
    buildHistoryPanel();
    buildHistoryButton();
    buildReorderButton();
    setupClickDispatch();
    setupKeyboard();
  }

  // ================================================================
  // TOAST
  // ================================================================
  function showToast(msg, type) {
    var t = document.createElement('div');
    t.className = '__fe_toast__';
    t.setAttribute('data-fe-ui','1');
    if (type) t.setAttribute('data-type', type);
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () {
      t.style.opacity = '0';
      setTimeout(function () { t.parentNode && t.parentNode.removeChild(t); }, 300);
    }, 2200);
  }

  // ================================================================
  // FLOATING "EDIT MODE" BUTTON (center bottom)
  // ================================================================
  function buildFloatingButton() {
    var btn = document.createElement('div');
    btn.id = '__fe_btn__';
    btn.innerHTML = '<span>&#9998;</span><span>Edit Mode</span>';
    btn.title = 'Click to exit edit mode';
    btn.addEventListener('click', openExitModal);
    document.body.appendChild(btn);
  }

  // ================================================================
  // EXIT MODAL (custom — replaces browser confirm)
  // ================================================================
  function buildExitModal() {
    var bd = document.createElement('div');
    bd.id = '__fe_exit_backdrop__';
    bd.setAttribute('data-fe-ui','1');
    bd.style.display = 'none';

    var modal = document.createElement('div');
    modal.id = '__fe_exit_modal__';
    modal.setAttribute('data-fe-ui','1');
    modal.innerHTML = [
      '<div class="__fe_exit_icon__">&#9998;</div>',
      '<div class="__fe_exit_title__">Exit Edit Mode?</div>',
      '<div class="__fe_exit_sub__">Choose how to leave editing.</div>',
      '<div class="__fe_exit_btns__">',
        '<button id="__fe_exit_save__">&#128190; Save &amp; Exit</button>',
        '<button id="__fe_exit_nosave__">&#128683; Exit Without Saving</button>',
        '<button id="__fe_exit_cancel__">&#8592; Keep Editing</button>',
      '</div>',
    ].join('');

    modal.querySelector('#__fe_exit_save__').addEventListener('click', function () {
      if (STATE.activeEl) commitEdit(STATE.activeEl);
      persistEdits(function () {
        sessionRemove('__fe_key__');
        location.href = location.pathname;
      });
    });
    modal.querySelector('#__fe_exit_nosave__').addEventListener('click', function () {
      sessionRemove('__fe_key__');
      location.href = location.pathname;
    });
    modal.querySelector('#__fe_exit_cancel__').addEventListener('click', closeExitModal);
    bd.addEventListener('click', closeExitModal);

    document.body.appendChild(bd);
    document.body.appendChild(modal);
    STATE.exitModal = modal;
  }

  function openExitModal()  {
    STATE.exitModal.parentNode && (document.getElementById('__fe_exit_backdrop__').style.display = 'block');
    STATE.exitModal.style.display = 'flex';
  }
  function closeExitModal() {
    document.getElementById('__fe_exit_backdrop__').style.display = 'none';
    STATE.exitModal.style.display = 'none';
  }

  // ================================================================
  // SAVE BUTTON (right bottom)
  // ================================================================
  function buildSaveButton() {
    var btn = document.createElement('button');
    btn.id = '__fe_save_btn__';
    btn.textContent = 'Save';
    btn.title = 'Save changes (Ctrl+S)';
    btn.addEventListener('click', function () {
      if (STATE.activeEl) commitEdit(STATE.activeEl);
      showSaving(); clearTimeout(STATE.saveTimer); persistEdits();
    });
    document.body.appendChild(btn);
  }

  function buildSaveIndicator() {
    var e = document.createElement('div'); e.id = '__fe_save__';
    document.body.appendChild(e); STATE.saveIndicator = e;
  }
  function showSaving() {
    var e = STATE.saveIndicator;
    e.textContent = 'Saving\u2026'; e.className = 'saving'; e.style.display = 'block';
  }
  function showSaved() {
    HAS_UNSAVED = false;
    var e = STATE.saveIndicator;
    e.textContent = 'Saved \u2713'; e.className = 'saved';
    clearTimeout(e.__hideTimer);
    e.__hideTimer = setTimeout(function () { e.style.display = 'none'; }, 2500);
  }
  function showSaveError() {
    var e = STATE.saveIndicator; e.textContent = 'Save failed'; e.className = 'error';
  }

  // ================================================================
  // HISTORY BUTTON (bottom left)
  // ================================================================
  function buildHistoryButton() {
    var btn = document.createElement('div');
    btn.id = '__fe_history_btn__';
    btn.innerHTML = '&#128336; History';
    btn.title = 'Undo history';
    btn.addEventListener('click', toggleHistoryPanel);
    document.body.appendChild(btn);
  }

  // ================================================================
  // REORDER BUTTON (bottom left, next to history)
  // ================================================================
  function buildReorderButton() {
    var btn = document.createElement('div');
    btn.id = '__fe_reorder_btn__';
    btn.innerHTML = '&#8597; Reorder';
    btn.title = 'Drag sections to reorder page layout';
    btn.addEventListener('click', function () {
      if (STATE.reorderMode) exitReorderMode();
      else enterReorderMode();
    });
    document.body.appendChild(btn);
  }

  // ================================================================
  // TOOLBAR (text formatting + font family + delete)
  // ================================================================
  function buildToolbar() {
    var tb = document.createElement('div');
    tb.id = '__fe_toolbar__';
    tb.setAttribute('data-fe-ui','1');
    tb.style.display = 'none';

    var fontOpts = '<option value="">Font</option>';
    fontOpts += '<optgroup label="System">';
    SYSTEM_FONTS.forEach(function(f){ fontOpts += '<option value="'+f+'">'+f+'</option>'; });
    fontOpts += '</optgroup><optgroup label="Google Fonts">';
    GOOGLE_FONTS.forEach(function(f){ fontOpts += '<option value="'+f+'">'+f+'</option>'; });
    fontOpts += '</optgroup>';

    tb.innerHTML = [
      '<button data-cmd="bold"      title="Bold (Ctrl+B)"><b>B</b></button>',
      '<button data-cmd="italic"    title="Italic (Ctrl+I)"><i>I</i></button>',
      '<button data-cmd="underline" title="Underline (Ctrl+U)"><u>U</u></button>',
      '<span class="__fe_sep__"></span>',
      '<label title="Text color"><input type="color" id="__fe_color__" value="#000000"></label>',
      '<select id="__fe_size__" title="Font size">',
        '<option value="">px</option>',
        [10,12,14,16,18,20,24,28,32,36,42,48,60,72].map(function(s){
          return '<option value="'+s+'px">'+s+'</option>';
        }).join(''),
      '</select>',
      '<select id="__fe_font__" title="Font family">'+fontOpts+'</select>',
      '<span class="__fe_sep__"></span>',
      '<button id="__fe_seo_btn__" title="SEO settings">SEO</button>',
      '<span class="__fe_sep__"></span>',
      '<button id="__fe_del_btn__" title="Delete element">&#128465;</button>',
    ].join('');

    tb.querySelectorAll('[data-cmd]').forEach(function (btn) {
      btn.addEventListener('mousedown', function (e) {
        e.preventDefault(); document.execCommand(btn.dataset.cmd, false, null); scheduleSave();
      });
    });
    tb.querySelector('#__fe_color__').addEventListener('input', function (e) {
      document.execCommand('foreColor', false, e.target.value); scheduleSave();
    });
    tb.querySelector('#__fe_size__').addEventListener('change', function (e) {
      var px = e.target.value; if (!px) return;
      document.execCommand('fontSize', false, '7');
      document.querySelectorAll('font[size="7"]').forEach(function (f) {
        f.removeAttribute('size'); f.style.fontSize = px;
      });
      scheduleSave();
    });
    tb.querySelector('#__fe_font__').addEventListener('change', function (e) {
      var name = e.target.value; if (!name) return;
      useFont(name);
      e.target.value = ''; // reset so it shows "Font" label again
    });
    tb.querySelector('#__fe_seo_btn__').addEventListener('mousedown', function (e) {
      e.preventDefault(); openSeoModal();
    });
    tb.querySelector('#__fe_del_btn__').addEventListener('mousedown', function (e) {
      e.preventDefault();
      var target = STATE.activeEl; if (!target) return;
      var before = target.style.display || '';
      commitEdit(target);
      target.style.display = 'none';
      recordEdit({ type: 'delete', selector: getSelector(target), before: before, after: 'none' });
      scheduleSave();
    });

    document.body.appendChild(tb);
    STATE.toolbar = tb;
  }

  function showToolbar(target) { STATE.toolbar.style.display = 'flex'; positionToolbar(target); }
  function positionToolbar(target) {
    var tb = STATE.toolbar; if (tb.style.display === 'none') return;
    var r = target.getBoundingClientRect();
    var tbH = tb.offsetHeight || 44, tbW = tb.offsetWidth || 420;
    var top = r.top + window.scrollY - tbH - 10;
    if (top < window.scrollY + 4) top = r.bottom + window.scrollY + 10;
    var left = Math.max(8, Math.min(r.left + window.scrollX, window.innerWidth + window.scrollX - tbW - 8));
    tb.style.top = top+'px'; tb.style.left = left+'px';
  }
  function hideToolbar() { if (STATE.toolbar) STATE.toolbar.style.display = 'none'; }

  // ================================================================
  // IMAGE OVERLAY
  // ================================================================
  function buildImageOverlay() {
    var ov = document.createElement('div');
    ov.id = '__fe_img_overlay__';
    ov.setAttribute('data-fe-ui','1');
    ov.style.display = 'none';
    ov.innerHTML = [
      '<button id="__fe_img_replace__">&#128247; Replace</button>',
      '<button id="__fe_img_video__">&#127909; Video URL</button>',
      '<div id="__fe_img_size_wrap__">',
        '<input type="number" id="__fe_img_w__" min="10" max="9999" placeholder="W px">',
        '<span>px</span>',
        '<button id="__fe_img_w_set__">&#10003;</button>',
      '</div>',
      '<button id="__fe_img_delete__" title="Delete image">&#128465;</button>',
      '<button id="__fe_img_close__">&times;</button>',
      '<input type="file" id="__fe_img_input__" accept="image/*" style="display:none">',
    ].join('');

    ov.querySelector('#__fe_img_replace__').addEventListener('click', function () {
      ov.querySelector('#__fe_img_input__').click();
    });
    ov.querySelector('#__fe_img_video__').addEventListener('click', function () {
      var url = prompt('Enter video URL (mp4, webm, ogg):');
      if (!url || !url.trim()) return;
      var img = STATE.activeImg; if (!img) return;
      applyVideoEdit(img, url.trim());
      recordEdit({ type: 'video', selector: getSelector(img), before: img.src, after: url.trim() });
      scheduleSave(); hideImageOverlay();
    });
    ov.querySelector('#__fe_img_w_set__').addEventListener('click', applyWidthInput);
    ov.querySelector('#__fe_img_w__').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') applyWidthInput();
    });
    ov.querySelector('#__fe_img_delete__').addEventListener('click', function () {
      var img = STATE.activeImg; if (!img) return;
      var before = img.style.display || '';
      img.style.display = 'none';
      recordEdit({ type: 'delete', selector: getSelector(img), before: before, after: 'none' });
      scheduleSave(); hideImageOverlay();
    });
    ov.querySelector('#__fe_img_close__').addEventListener('click', hideImageOverlay);
    ov.querySelector('#__fe_img_input__').addEventListener('change', function (e) {
      var file = e.target.files[0]; if (!file) return;
      processImage(file, function (dataUrl) {
        var img = STATE.activeImg; if (!img) return;
        var before = img.src;
        img.src = dataUrl;
        recordEdit({ type: 'image', selector: getSelector(img), before: before, after: dataUrl });
        scheduleSave(); hideImageOverlay();
      });
      e.target.value = '';
    });

    document.body.appendChild(ov);
    STATE.imgOverlay = ov;
  }

  function applyWidthInput() {
    var img = STATE.activeImg; if (!img) return;
    var val = parseInt(STATE.imgOverlay.querySelector('#__fe_img_w__').value, 10);
    if (!val || val < 10) return;
    var before = img.style.width;
    img.style.width = val+'px'; img.style.height = 'auto';
    repositionResizeHandles();
    recordEdit({ type: 'resize', selector: getSelector(img), before: before, after: val+'px' });
    scheduleSave();
  }

  function showImageOverlay(img) {
    STATE.activeImg = img;
    var ov = STATE.imgOverlay;
    var r = img.getBoundingClientRect();
    ov.style.display = 'flex';
    var wInput = ov.querySelector('#__fe_img_w__');
    if (wInput) wInput.value = Math.round(r.width) || '';
    var ovW = 360;
    var left = r.left + window.scrollX + r.width/2 - ovW/2;
    left = Math.max(8, Math.min(left, window.innerWidth + window.scrollX - ovW - 8));
    var top = r.top + window.scrollY - 56;
    if (top < window.scrollY + 4) top = r.bottom + window.scrollY + 8;
    ov.style.top = top+'px'; ov.style.left = left+'px';
    showResizeHandles(img);
  }

  function hideImageOverlay() {
    STATE.imgOverlay.style.display = 'none';
    STATE.activeImg = null;
    hideResizeHandles();
  }

  // ================================================================
  // RESIZE HANDLES
  // ================================================================
  function buildResizeHandles() {
    var c = document.createElement('div');
    c.id = '__fe_resize__'; c.setAttribute('data-fe-ui','1'); c.style.display = 'none';
    ['nw','ne','sw','se'].forEach(function (corner) {
      var h = document.createElement('div');
      h.className = '__fe_rh__'; h.dataset.corner = corner;
      h.addEventListener('mousedown', onResizeStart);
      c.appendChild(h);
    });
    document.body.appendChild(c);
    STATE.resizeHandles = c;
  }

  function showResizeHandles(img) {
    var c = STATE.resizeHandles; if (!c) return;
    var r = img.getBoundingClientRect();
    c.style.left = (r.left+window.scrollX)+'px'; c.style.top = (r.top+window.scrollY)+'px';
    c.style.width = r.width+'px'; c.style.height = r.height+'px';
    c.style.display = 'block'; c._img = img;
  }
  function hideResizeHandles() {
    if (STATE.resizeHandles) { STATE.resizeHandles.style.display = 'none'; STATE.resizeHandles._img = null; }
  }
  function repositionResizeHandles() {
    var c = STATE.resizeHandles;
    if (!c || c.style.display === 'none' || !c._img) return;
    showResizeHandles(c._img);
  }

  function onResizeStart(e) {
    e.preventDefault(); e.stopPropagation();
    var img = STATE.resizeHandles._img; if (!img) return;
    var r = img.getBoundingClientRect();
    STATE.resizeData = { img, corner: e.currentTarget.dataset.corner, startX: e.clientX, startW: r.width, startH: r.height, origWidth: img.style.width };
    document.addEventListener('mousemove', onResizeMove);
    document.addEventListener('mouseup',   onResizeEnd);
  }
  function onResizeMove(e) {
    var d = STATE.resizeData; if (!d) return;
    var dx = e.clientX - d.startX;
    var newW = (d.corner === 'se' || d.corner === 'ne') ? Math.max(20, d.startW+dx) : Math.max(20, d.startW-dx);
    d.img.style.width = newW+'px'; d.img.style.height = (newW * d.startH/d.startW)+'px';
    var wInput = STATE.imgOverlay && STATE.imgOverlay.querySelector('#__fe_img_w__');
    if (wInput) wInput.value = Math.round(newW);
    repositionResizeHandles();
  }
  function onResizeEnd() {
    var d = STATE.resizeData; if (!d) return;
    document.removeEventListener('mousemove', onResizeMove);
    document.removeEventListener('mouseup',   onResizeEnd);
    if (d.img.style.width !== d.origWidth) {
      recordEdit({ type: 'resize', selector: getSelector(d.img), before: d.origWidth, after: d.img.style.width });
      scheduleSave();
    }
    STATE.resizeData = null;
  }

  function processImage(file, cb) {
    var MAX = 1920, reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        var w = img.width, h = img.height;
        if (w > MAX || h > MAX) { var ratio = Math.min(MAX/w, MAX/h); w = Math.round(w*ratio); h = Math.round(h*ratio); }
        var canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        var d = canvas.toDataURL('image/webp', 0.85);
        cb(d.startsWith('data:image/webp') ? d : canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // ================================================================
  // LINK POPUP
  // ================================================================
  function buildLinkPopup() {
    var pop = document.createElement('div');
    pop.id = '__fe_link_popup__'; pop.setAttribute('data-fe-ui','1'); pop.style.display = 'none';
    pop.innerHTML = '<span class="__fe_link_label__">&#128279; URL</span><input type="url" id="__fe_link_input__" placeholder="https://"><button id="__fe_link_save__">Save</button><button id="__fe_link_close__">&times;</button>';
    pop.querySelector('#__fe_link_save__').addEventListener('click', commitLinkEdit);
    pop.querySelector('#__fe_link_close__').addEventListener('click', hideLinkPopup);
    pop.querySelector('#__fe_link_input__').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') commitLinkEdit(); if (e.key === 'Escape') hideLinkPopup();
    });
    document.body.appendChild(pop); STATE.linkPopup = pop;
  }

  function showLinkPopup(anchor) {
    STATE.activeLink = anchor;
    var pop = STATE.linkPopup;
    pop.querySelector('#__fe_link_input__').value = anchor.href || '';
    pop.style.display = 'flex';
    var r = anchor.getBoundingClientRect();
    var top = r.bottom + window.scrollY + 8;
    if (top + 44 > window.scrollY + window.innerHeight) top = r.top + window.scrollY - 52;
    pop.style.top = top+'px'; pop.style.left = Math.max(8, r.left + window.scrollX)+'px';
    pop.querySelector('#__fe_link_input__').focus();
  }
  function commitLinkEdit() {
    var link = STATE.activeLink; if (!link) return;
    var newHref = STATE.linkPopup.querySelector('#__fe_link_input__').value.trim();
    var before  = link.href; link.href = newHref;
    recordEdit({ type: 'link', selector: getSelector(link), before, after: newHref });
    scheduleSave(); hideLinkPopup();
  }
  function hideLinkPopup() { STATE.linkPopup.style.display = 'none'; STATE.activeLink = null; }

  // ================================================================
  // SEO MODAL
  // ================================================================
  function buildSeoModal() {
    var bd = document.createElement('div');
    bd.id = '__fe_seo_backdrop__'; bd.setAttribute('data-fe-ui','1'); bd.style.display = 'none';
    bd.addEventListener('click', closeSeoModal);

    var modal = document.createElement('div');
    modal.id = '__fe_seo_modal__'; modal.setAttribute('data-fe-ui','1'); modal.style.display = 'none';
    modal.innerHTML = [
      '<div class="__fe_seo_header__"><span>&#128270; SEO Settings</span><button id="__fe_seo_close__">&times;</button></div>',
      '<div class="__fe_seo_body__">',
        '<label class="__fe_seo_label__">Page Title<input id="__fe_seo_title__" type="text" placeholder="My Awesome Site"></label>',
        '<label class="__fe_seo_label__">Meta Description<textarea id="__fe_seo_desc__" rows="2" placeholder="A short description..."></textarea></label>',
        '<label class="__fe_seo_label__">OG Title<input id="__fe_seo_og_title__" type="text" placeholder="Same as page title if blank"></label>',
        '<label class="__fe_seo_label__">OG Description<textarea id="__fe_seo_og_desc__" rows="2" placeholder="Same as meta description if blank"></textarea></label>',
      '</div>',
      '<div class="__fe_seo_footer__"><button id="__fe_seo_save__">Save SEO</button><button id="__fe_seo_cancel__">Cancel</button></div>',
    ].join('');

    modal.querySelector('#__fe_seo_close__').addEventListener('click', closeSeoModal);
    modal.querySelector('#__fe_seo_cancel__').addEventListener('click', closeSeoModal);
    modal.querySelector('#__fe_seo_save__').addEventListener('click', commitSeoEdit);
    document.body.appendChild(bd); document.body.appendChild(modal); STATE.seoModal = modal;
  }

  function openSeoModal() {
    var seo = STATE.seo || {}, modal = STATE.seoModal;
    modal.querySelector('#__fe_seo_title__').value    = seo.title       || document.title || '';
    modal.querySelector('#__fe_seo_desc__').value     = seo.description || getMeta('name','description')        || '';
    modal.querySelector('#__fe_seo_og_title__').value = seo.ogTitle     || getMeta('property','og:title')       || '';
    modal.querySelector('#__fe_seo_og_desc__').value  = seo.ogDescription|| getMeta('property','og:description')|| '';
    document.getElementById('__fe_seo_backdrop__').style.display = 'block';
    modal.style.display = 'flex'; modal.querySelector('#__fe_seo_title__').focus();
  }
  function closeSeoModal() {
    document.getElementById('__fe_seo_backdrop__').style.display = 'none';
    STATE.seoModal.style.display = 'none';
  }
  function commitSeoEdit() {
    var modal = STATE.seoModal;
    STATE.seo = {
      title:         modal.querySelector('#__fe_seo_title__').value.trim(),
      description:   modal.querySelector('#__fe_seo_desc__').value.trim(),
      ogTitle:       modal.querySelector('#__fe_seo_og_title__').value.trim(),
      ogDescription: modal.querySelector('#__fe_seo_og_desc__').value.trim(),
    };
    applySeoToPage(STATE.seo); scheduleSave(); closeSeoModal();
  }
  function getMeta(attr, val) {
    var m = document.querySelector('meta['+attr+'="'+val+'"]');
    return m ? m.getAttribute('content') : '';
  }

  // ================================================================
  // HISTORY PANEL
  // ================================================================
  var TYPE_COLORS = { text:'#6366f1', image:'#a855f7', video:'#7c3aed', link:'#f97316', resize:'#06b6d4', delete:'#ef4444', reorder:'#10b981', seo:'#f59e0b' };
  var TYPE_LABELS = { text:'Text edited', image:'Image replaced', video:'Set video', link:'Link changed', resize:'Image resized', delete:'Deleted', reorder:'Sections reordered', seo:'SEO updated' };

  function buildHistoryPanel() {
    var panel = document.createElement('div');
    panel.id = '__fe_history_panel__';
    panel.setAttribute('data-fe-ui','1');
    panel.style.display = 'none';
    panel.innerHTML = [
      '<div class="__fe_hist_header__">',
        '<span>&#128336; Edit History</span>',
        '<button id="__fe_hist_clear__" title="Clear history">Clear</button>',
      '</div>',
      '<div id="__fe_hist_list__"><div class="__fe_hist_empty__">No edits yet</div></div>',
    ].join('');
    panel.querySelector('#__fe_hist_clear__').addEventListener('click', function () {
      STATE.history = []; STATE.historyIndex = -1;
      updateHistoryPanel();
    });
    document.body.appendChild(panel);
    STATE.historyPanel = panel;
  }

  function toggleHistoryPanel() {
    STATE.historyPanelOpen = !STATE.historyPanelOpen;
    STATE.historyPanel.style.display = STATE.historyPanelOpen ? 'flex' : 'none';
    var btn = document.getElementById('__fe_history_btn__');
    if (btn) btn.classList.toggle('__fe_active__', STATE.historyPanelOpen);
    if (STATE.historyPanelOpen) updateHistoryPanel();
  }

  function updateHistoryPanel() {
    var panel = STATE.historyPanel; if (!panel) return;
    var list = panel.querySelector('#__fe_hist_list__');
    if (!list) return;
    if (STATE.history.length === 0) {
      list.innerHTML = '<div class="__fe_hist_empty__">No edits yet</div>'; return;
    }
    var html = '';
    for (var i = STATE.history.length - 1; i >= 0; i--) {
      var entry = STATE.history[i];
      var isCur  = i === STATE.historyIndex;
      var isFut  = i > STATE.historyIndex;
      var color  = TYPE_COLORS[entry.type] || '#8888aa';
      html += '<div class="__fe_hist_item__'+(isCur?' __fe_hist_cur__':'')+(isFut?' __fe_hist_fut__':'')+'" data-idx="'+i+'">';
      html += '<span class="__fe_hist_dot__" style="background:'+color+'"></span>';
      html += '<span class="__fe_hist_lbl__">'+safeHtml(entry.label||entry.type)+'</span>';
      if (isCur) html += '<span class="__fe_hist_now__">&#9664; now</span>';
      html += '</div>';
    }
    list.innerHTML = html;
    list.querySelectorAll('.__fe_hist_item__').forEach(function (item) {
      item.addEventListener('click', function () { jumpToHistory(parseInt(item.dataset.idx, 10)); });
    });
  }

  function jumpToHistory(target) {
    if (STATE.activeEl) commitEdit(STATE.activeEl);
    while (STATE.historyIndex > target) _doUndo();
    while (STATE.historyIndex < target) _doRedo();
    updateHistoryPanel();
  }

  function makeLabel(entry) {
    var base = TYPE_LABELS[entry.type] || entry.type;
    try {
      var target = document.querySelector(entry.selector);
      if (target) base += ' \u2039'+target.tagName.toLowerCase()+'\u203a';
    } catch(e) {}
    return base;
  }

  // ================================================================
  // SECTION REORDER
  // ================================================================
  var _dragSrc = null;

  function getReorderableChildren(parent) {
    return Array.from(parent.children).filter(function (c) {
      if (c.hasAttribute('data-fe-ui')) return false;
      if (EDITOR_ROOT_IDS.some(function(id){ return c.id === id; })) return false;
      if (!SECTION_TAGS.includes(c.tagName)) return false;
      if (c.getBoundingClientRect().height < 20) return false;
      return true;
    });
  }

  function findSectionParent() {
    var tries = [document.querySelector('main'), document.querySelector('article'), document.body];
    for (var i = 0; i < tries.length; i++) {
      if (tries[i] && getReorderableChildren(tries[i]).length >= 2) return tries[i];
    }
    var bodyKids = Array.from(document.body.children);
    for (var j = 0; j < bodyKids.length; j++) {
      var c = bodyKids[j];
      if (c.hasAttribute('data-fe-ui')) continue;
      if (getReorderableChildren(c).length >= 2) return c;
    }
    return null;
  }

  function enterReorderMode() {
    var parent = findSectionParent();
    if (!parent) { showToast('No reorderable sections found on this page.', 'warn'); return; }
    STATE.reorderMode   = true;
    STATE.reorderParent = parent;
    var kids = getReorderableChildren(parent);
    kids.forEach(function (sec, i) {
      var origIdx = sec.hasAttribute('data-fe-orig-idx') ? parseInt(sec.getAttribute('data-fe-orig-idx')) : i;
      sec.setAttribute('data-fe-orig-idx', String(origIdx));
      sec.setAttribute('draggable','true');
      sec.addEventListener('dragstart', onSecDragStart);
      sec.addEventListener('dragover',  onSecDragOver);
      sec.addEventListener('dragend',   onSecDragEnd);
      sec.addEventListener('drop',      onSecDrop);
      var grip = document.createElement('div');
      grip.className = '__fe_grip__';
      grip.setAttribute('data-fe-ui','1');
      grip.innerHTML = '<span>&#8597;</span> Drag to reorder';
      sec.prepend(grip);
    });
    document.getElementById('__fe_reorder_btn__').classList.add('__fe_active__');
    document.body.setAttribute('data-fe-reorder','1');
    showToast('Drag sections to reorder. Click Reorder again to finish.');
  }

  function exitReorderMode() {
    var parent = STATE.reorderParent;
    if (parent) {
      getReorderableChildren(parent).forEach(function (sec) {
        sec.removeAttribute('draggable');
        sec.removeEventListener('dragstart', onSecDragStart);
        sec.removeEventListener('dragover',  onSecDragOver);
        sec.removeEventListener('dragend',   onSecDragEnd);
        sec.removeEventListener('drop',      onSecDrop);
        var grip = sec.querySelector('.__fe_grip__');
        if (grip) grip.remove();
      });
    }
    STATE.reorderMode   = false;
    STATE.reorderParent = null;
    document.getElementById('__fe_reorder_btn__').classList.remove('__fe_active__');
    document.body.removeAttribute('data-fe-reorder');
  }

  function onSecDragStart(e) {
    _dragSrc = e.currentTarget;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain',''); // Firefox requires this
    e.currentTarget.classList.add('__fe_sec_dragging__');
  }
  function onSecDragOver(e) {
    e.preventDefault(); e.dataTransfer.dropEffect = 'move';
    var target = e.currentTarget;
    var mid = target.getBoundingClientRect().top + target.getBoundingClientRect().height / 2;
    target.classList.remove('__fe_drop_before__','__fe_drop_after__');
    target.classList.add(e.clientY < mid ? '__fe_drop_before__' : '__fe_drop_after__');
  }
  function onSecDragEnd(e) {
    e.currentTarget.classList.remove('__fe_sec_dragging__');
    document.querySelectorAll('.__fe_drop_before__, .__fe_drop_after__').forEach(function(x){
      x.classList.remove('__fe_drop_before__','__fe_drop_after__');
    });
  }
  function onSecDrop(e) {
    e.preventDefault();
    var target = e.currentTarget;
    if (!_dragSrc || target === _dragSrc) return;
    var r = target.getBoundingClientRect();
    var insertBefore = e.clientY < r.top + r.height / 2;
    _dragSrc.parentNode.insertBefore(_dragSrc, insertBefore ? target : target.nextSibling);
    target.classList.remove('__fe_drop_before__','__fe_drop_after__');
    // Record new order as original indices
    var parent = STATE.reorderParent;
    var kids = getReorderableChildren(parent);
    var newOrder = kids.map(function (k) { return parseInt(k.getAttribute('data-fe-orig-idx')||'0'); });
    recordEdit({ type: 'reorder', selector: getSelector(parent), before: newOrder.map(function(_,i){return i;}), after: newOrder });
    scheduleSave();
  }

  // ================================================================
  // CLICK DISPATCHER
  // ================================================================
  function isEditorEl(target) {
    return EDITOR_ROOT_IDS.some(function (id) { return target.closest && target.closest('#'+id); });
  }

  function setupClickDispatch() {
    function dispatch(target, pd) {
      if (isEditorEl(target)) return;
      if (STATE.reorderMode) return;
      if (STATE.activeEl) commitEdit(STATE.activeEl);
      hideImageOverlay(); hideLinkPopup();

      var img = target.closest('img');
      if (img) { if (pd) pd(); showImageOverlay(img); return; }
      var anchor = target.closest('a');
      if (anchor) { if (pd) pd(); showLinkPopup(anchor); return; }
      var found = findTextTarget(target);
      if (found) activateTextElement(found);
    }

    document.addEventListener('click', function (e) { dispatch(e.target, function(){ e.preventDefault(); }); });

    var tsX, tsY;
    document.addEventListener('touchstart', function (e) { tsX = e.touches[0].clientX; tsY = e.touches[0].clientY; }, { passive: true });
    document.addEventListener('touchend', function (e) {
      var dx = Math.abs(e.changedTouches[0].clientX-tsX), dy = Math.abs(e.changedTouches[0].clientY-tsY);
      if (dx > 10 || dy > 10) return;
      var t = document.elementFromPoint(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
      if (t) dispatch(t, function(){ e.preventDefault(); });
    }, { passive: false });

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

  function findTextTarget(target) {
    var cur = target;
    while (cur && cur !== document.body) {
      if (!SKIP_TAGS.includes(cur.tagName) && cur.tagName !== 'IMG' && cur.tagName !== 'A') return cur;
      cur = cur.parentElement;
    }
    return null;
  }

  // ================================================================
  // TEXT EDITING
  // ================================================================
  function activateTextElement(target) {
    STATE.activeEl = target;
    target.contentEditable = 'true';
    target.setAttribute('data-fe-before', target.innerHTML);
    target.setAttribute('data-fe-active','1');
    target.focus();
    showToolbar(target);
    target.addEventListener('input', onTextInput);
  }
  function onTextInput() { positionToolbar(STATE.activeEl); scheduleSave(); }
  function commitEdit(target) {
    var before = target.getAttribute('data-fe-before') || '';
    var after  = target.innerHTML;
    target.contentEditable = 'false';
    target.removeAttribute('contenteditable');
    target.removeAttribute('data-fe-before');
    target.removeAttribute('data-fe-active');
    target.removeEventListener('input', onTextInput);
    STATE.activeEl = null; hideToolbar();
    if (before !== after) {
      recordEdit({ type: 'text', selector: getSelector(target), before, after });
      scheduleSave();
    }
  }

  // ================================================================
  // SELECTOR GENERATOR
  // ================================================================
  function getSelector(element) {
    var path = [], cur = element;
    while (cur && cur !== document.body) {
      var seg = cur.tagName.toLowerCase();
      if (cur.id) { seg += '#'+CSS.escape(cur.id); path.unshift(seg); break; }
      var sibs = Array.from(cur.parentNode.children).filter(function(s){ return s.tagName === cur.tagName; });
      if (sibs.length > 1) seg += ':nth-of-type('+(sibs.indexOf(cur)+1)+')';
      path.unshift(seg); cur = cur.parentElement;
    }
    return path.join(' > ');
  }

  // ================================================================
  // RECORD EDITS + HISTORY
  // ================================================================
  var MAX_HISTORY = 50;

  function recordEdit(edit) {
    edit.id        = 'e_'+Date.now()+'_'+Math.random().toString(36).slice(2,6);
    edit.timestamp = Date.now();
    edit.label     = makeLabel(edit);
    // Overwrite existing edit of same selector+type (dedupe)
    var idx = STATE.edits.findIndex(function(e){ return e.selector === edit.selector && e.type === edit.type; });
    if (idx >= 0) { edit.before = STATE.edits[idx].before; STATE.edits[idx] = edit; }
    else STATE.edits.push(edit);
    pushHistory(edit);
  }

  function pushHistory(entry) {
    STATE.history = STATE.history.slice(0, STATE.historyIndex + 1);
    STATE.history.push({ selector: entry.selector, type: entry.type, before: entry.before, after: entry.after, label: entry.label });
    if (STATE.history.length > MAX_HISTORY) STATE.history.shift();
    STATE.historyIndex = STATE.history.length - 1;
    updateHistoryPanel();
  }

  function applyHistoryEntry(entry, direction) {
    var value = direction === 'undo' ? entry.before : entry.after;
    try {
      if (entry.type === 'reorder') {
        if (direction === 'undo') applyReorderEdit({ selector: entry.selector, after: entry.before });
        else                      applyReorderEdit({ selector: entry.selector, after: entry.after });
        return;
      }
      var target = document.querySelector(entry.selector); if (!target) return;
      if      (entry.type === 'text')   target.innerHTML     = value;
      else if (entry.type === 'image')  target.src           = value;
      else if (entry.type === 'link')   target.href          = value;
      else if (entry.type === 'resize') { target.style.width = value; target.style.height = 'auto'; }
      else if (entry.type === 'delete') target.style.display = direction === 'undo' ? (entry.before||'') : 'none';
      else if (entry.type === 'video')  {
        if (direction === 'undo') {
          target.style.display = '';
          var vid = target.nextElementSibling;
          if (vid && vid.tagName === 'VIDEO' && vid.hasAttribute('data-fe-vid')) vid.parentNode.removeChild(vid);
        } else { applyVideoEdit(target, entry.after); }
      }
      var i = STATE.edits.findIndex(function(e){ return e.selector===entry.selector&&e.type===entry.type; });
      if (i >= 0) STATE.edits[i].after = value;
    } catch(e) {}
    scheduleSave();
  }

  function _doUndo() {
    if (STATE.historyIndex < 0) return;
    applyHistoryEntry(STATE.history[STATE.historyIndex], 'undo');
    STATE.historyIndex--;
  }
  function _doRedo() {
    if (STATE.historyIndex >= STATE.history.length - 1) return;
    STATE.historyIndex++;
    applyHistoryEntry(STATE.history[STATE.historyIndex], 'redo');
  }
  function undo() { if (STATE.activeEl) commitEdit(STATE.activeEl); _doUndo(); updateHistoryPanel(); }
  function redo() { if (STATE.activeEl) commitEdit(STATE.activeEl); _doRedo(); updateHistoryPanel(); }

  // ================================================================
  // AUTO-SAVE
  // ================================================================
  function scheduleSave() {
    HAS_UNSAVED = true; showSaving();
    clearTimeout(STATE.saveTimer);
    STATE.saveTimer = setTimeout(persistEdits, 600);
  }

  function persistEdits(onSuccess) {
    var seoToSave = Object.assign({}, STATE.seo);
    if (STATE.fonts.length) seoToSave._fonts = STATE.fonts;
    fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secretKey: STATE.secretKey, siteId: STATE.siteId, edits: STATE.edits, seo: seoToSave }),
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.ok) { showSaved(); if (onSuccess) onSuccess(); }
        else showSaveError();
      })
      .catch(showSaveError);
  }

  // ================================================================
  // KEYBOARD SHORTCUTS
  // ================================================================
  function setupKeyboard() {
    document.addEventListener('keydown', function (e) {
      var ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === 's') { e.preventDefault(); if (STATE.activeEl) commitEdit(STATE.activeEl); persistEdits(); return; }
      if (ctrl && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); return; }
      if (e.key === 'Escape') {
        if (STATE.exitModal && STATE.exitModal.style.display !== 'none') { closeExitModal(); return; }
        if (STATE.activeEl) { STATE.activeEl.innerHTML = STATE.activeEl.getAttribute('data-fe-before')||STATE.activeEl.innerHTML; commitEdit(STATE.activeEl); }
        if (STATE.reorderMode) exitReorderMode();
        hideImageOverlay(); hideLinkPopup();
        if (STATE.historyPanelOpen) toggleHistoryPanel();
      }
    });

    window.addEventListener('beforeunload', function (e) {
      if (HAS_UNSAVED) { e.preventDefault(); e.returnValue = 'You have unsaved changes.'; }
    });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden' && HAS_UNSAVED) {
        if (STATE.activeEl) commitEdit(STATE.activeEl);
        persistEdits();
      }
    });
  }

  // ================================================================
  // UTILS
  // ================================================================
  function el(tag, html, attrs) {
    var e = document.createElement(tag);
    if (html) e.innerHTML = html;
    if (attrs) Object.keys(attrs).forEach(function(k){ e.setAttribute(k, attrs[k]); });
    return e;
  }
  function safeHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

})();
