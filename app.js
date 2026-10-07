/* Gestion XLT — rental portal UI + listings.json renderer */
(function () {
  var DATA_URL = 'data/listings.json';

  // —— Language toggle (FR default) ——
  var stored = localStorage.getItem('xlt-lang') || 'fr';
  function applyLang(lang) {
    document.documentElement.lang = lang;
    document.documentElement.classList.toggle('lang-en', lang === 'en');
    document.querySelectorAll('.lang-toggle button').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-lang') === lang);
    });
    document.querySelectorAll('[data-fr-placeholder],[data-en-placeholder]').forEach(function (el) {
      var key = lang === 'en' ? 'data-en-placeholder' : 'data-fr-placeholder';
      if (el.hasAttribute(key)) el.setAttribute('placeholder', el.getAttribute(key));
    });
    // Translate <option> labels (display:none breaks native selects)
    document.querySelectorAll('option[data-fr][data-en]').forEach(function (opt) {
      opt.textContent = lang === 'en' ? opt.getAttribute('data-en') : opt.getAttribute('data-fr');
    });
    // P6-07: localized mailto links (data-mailto-fr / data-mailto-en)
    document.querySelectorAll('[data-mailto-fr][data-mailto-en]').forEach(function (a) {
      a.setAttribute('href', a.getAttribute(lang === 'en' ? 'data-mailto-en' : 'data-mailto-fr'));
    });
    // P8-08: document title follows the language
    var tEl = document.querySelector('title[data-doc-fr][data-doc-en]');
    if (tEl) document.title = tEl.getAttribute(lang === 'en' ? 'data-doc-en' : 'data-doc-fr');
    // P7-09: screen-reader text follows the language
    ['aria', 'alt', 'title'].forEach(function (k) {
      document.querySelectorAll('[data-' + k + '-fr][data-' + k + '-en]').forEach(function (el) {
        el.setAttribute(k === 'aria' ? 'aria-label' : k, el.getAttribute('data-' + k + '-' + (lang === 'en' ? 'en' : 'fr')));
      });
    });
    localStorage.setItem('xlt-lang', lang);
    document.dispatchEvent(new CustomEvent('xlt-lang', { detail: lang }));
  }
  applyLang(stored);
  document.querySelectorAll('.lang-toggle button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      applyLang(btn.getAttribute('data-lang'));
    });
  });

  // —— Mobile menu ——
  var menuBtn = document.getElementById('menuBtn');
  var mobileNav = document.getElementById('mobileNav');
  if (menuBtn && mobileNav) {
    menuBtn.addEventListener('click', function () {
      mobileNav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', mobileNav.classList.contains('open') ? 'true' : 'false');
    });
  }

  // —— Search tabs (home): set real filter type on submit ——
  document.querySelectorAll('.search-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.search-tab').forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      var form = tab.closest('form');
      if (!form) return;
      var typeSelect = form.querySelector('select[name="type"]');
      // When switching category, clear specific subtype so tab drives the filter
      if (typeSelect) typeSelect.value = '';
    });
  });
  document.querySelectorAll('form.search-card').forEach(function (form) {
    form.addEventListener('submit', function () {
      var typeSelect = form.querySelector('select[name="type"]');
      if (!typeSelect) return;
      if (typeSelect.value) return; // specific type already chosen
      var active = form.querySelector('.search-tab.active');
      if (!active) return;
      var tabType = active.getAttribute('data-tab'); // res | com
      if (!tabType) return;
      // Inject hidden so empty select does not override
      typeSelect.disabled = true;
      var hidden = form.querySelector('input[name="type"][data-xlt-tab]');
      if (!hidden) {
        hidden = document.createElement('input');
        hidden.type = 'hidden';
        hidden.name = 'type';
        hidden.setAttribute('data-xlt-tab', '1');
        form.appendChild(hidden);
      }
      hidden.value = tabType;
    });
  });

  window.addEventListener('pageshow', function () {
    document.querySelectorAll('form.search-card select[name="type"]').forEach(function (s) { s.disabled = false; });
    document.querySelectorAll('form.search-card input[data-xlt-tab]').forEach(function (h) { h.remove(); });
  });

  function currentLang() {
    return localStorage.getItem('xlt-lang') || 'fr';
  }

  function statusLabel(status, lang) {
    if (status === 'available') return lang === 'en' ? 'Available' : 'Disponible';
    return lang === 'en' ? 'Rented' : 'Loué';
  }

  function hasPrice(item) {
    return item.price != null && item.price !== '' && Number(item.price) > 0;
  }

  function askText(item, lang) {
    var d = item.priceDisplay || {};
    if (lang === 'en') return d.en || 'Contact us for pricing';
    return d.fr || 'Contactez-nous pour le prix';
  }

  /** Bilingual price HTML; never shows $0 — falls back to "Contact us for pricing". */
  /** Owner rule: only Disponible units show price info; Loué units show none. */
  function showsPrice(item) { return item.status === 'available'; }

  function priceHtml(item, unitFr, unitEn) {
    if (!showsPrice(item)) return '';
    if (!hasPrice(item)) {
      return '<span class="price-ask" data-fr>' + askText(item, 'fr') + '</span><span class="price-ask" data-en>' + askText(item, 'en') + '</span>';
    }
    return '<span class="price-amt" data-fr>' + fmtPrice(item, 'fr') + '</span><span class="price-amt" data-en>' + fmtPrice(item, 'en') + '</span>';
  }

  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
  function groupDigits(n, sep) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, sep); }
  /** FR "1 000 $ / mois" · EN "$1,000/month" (short: FR "1 000 $" · EN "$1,000") */
  function fmtPrice(item, lang, short) {
    var fr = groupDigits(item.price, '\u00a0') + '\u00a0$';
    var en = '$' + groupDigits(item.price, ',');
    if (short) return lang === 'en' ? en : fr;
    if (item.priceUnit === 'sqft') return lang === 'en' ? en + '/sq ft' : fr + ' / pi²';
    return lang === 'en' ? en + '/month' : fr + ' / mois';
  }

  function priceParts(item, lang) {
    if (!hasPrice(item)) return { main: askText(item, lang), unit: '' };
    if (item.priceUnit === 'sqft') {
      return { main: item.price + ' $', unit: lang === 'en' ? '/sq ft' : '/pi²' };
    }
    var formatted = String(item.price).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return { main: formatted + ' $', unit: lang === 'en' ? '/mo' : '/mois' };
  }

  function formatSqft(n, lang) {
    var num = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return num + (lang === 'en' ? ' sq ft' : ' pi²');
  }

  function heartSvg() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>';
  }

  function specsHtml(item, lang) {
    var parts = [];
    if (item.beds != null) {
      parts.push('<span data-fr>' + item.beds + ' ch.</span><span data-en>' + item.beds + ' bed</span>');
    }
    if (item.baths != null) {
      parts.push('<span data-fr>' + item.baths + ' sdb</span><span data-en>' + item.baths + ' bath</span>');
    }
    if (item.sqft != null) {
      parts.push('<span data-fr>' + formatSqft(item.sqft, 'fr') + '</span><span data-en>' + formatSqft(item.sqft, 'en') + '</span>');
    }
    if (item.specExtra) {
      parts.push('<span data-fr>' + item.specExtra.fr + '</span><span data-en>' + item.specExtra.en + '</span>');
    }
    return parts.join('');
  }

  function cardHtml(item) {
    var lang = currentLang();
    var p = priceParts(item, lang);
    var pillClass = item.status === 'available' ? 'pill-available' : 'pill-rented';
    var dotClass = item.status === 'available' ? 'available' : 'rented';
    var href = 'detail.html?id=' + encodeURIComponent(item.id);
    return (
      '<a href="' + href + '" class="prop-card" data-status="' + item.status + '" data-type="' + item.type + '" data-id="' + item.id + '" data-city="' + (item.city || '') + '" data-price="' + (hasPrice(item) ? item.price : '') + '" data-price-unit="' + (item.priceUnit || '') + '" data-avail="' + ((item.availability && item.availability.fr) || '') + '" data-listed="' + (item.listedOn || '') + '">' +
        '<div class="prop-media">' +
          '<img src="' + item.image + '" alt="' + esc(item.title[currentLang()] || item.title.fr) + '" data-alt-fr="' + esc(item.title.fr) + '" data-alt-en="' + esc(item.title.en || item.title.fr) + '" loading="lazy" />' +
          '<span class="pill ' + pillClass + '" data-fr>' + statusLabel(item.status, 'fr') + '</span>' +
          '<span class="pill ' + pillClass + '" data-en>' + statusLabel(item.status, 'en') + '</span>' +
          '<button type="button" class="prop-heart" aria-label="' + (currentLang() === 'en' ? 'Favourite' : 'Favori') + '" data-aria-fr="Favori" data-aria-en="Favourite">' + heartSvg() + '</button>' +
          '<span class="prop-count">1 / ' + (item.photoCount || 1) + '</span>' +
        '</div>' +
        '<div class="prop-body">' +
          (showsPrice(item) ? '<div class="prop-price">' + priceHtml(item) + '</div>' : '') +
          '<div class="prop-addr">' + item.address + '</div>' +
          '<div class="pill-dot ' + dotClass + '" data-fr>' + statusLabel(item.status, 'fr') + '</div>' +
          '<div class="pill-dot ' + dotClass + '" data-en>' + statusLabel(item.status, 'en') + '</div>' +
          '<div class="prop-specs">' + specsHtml(item, lang) + '</div>' +
          '<div class="prop-foot"><span class="prop-type" data-fr>' + item.typeLabel.fr + '</span><span class="prop-type" data-en>' + item.typeLabel.en + '</span></div>' +
        '</div>' +
      '</a>'
    );
  }

  function mapCardHtml(item) {
    var p = priceParts(item, currentLang());
    var pillClass = item.status === 'available' ? 'pill-available' : 'pill-rented';
    var href = 'detail.html?id=' + encodeURIComponent(item.id);
    var specs = [];
    if (item.beds != null) {
      specs.push('<span data-fr>' + item.beds + ' ch.</span><span data-en>' + item.beds + ' bed</span>');
      specs.push('<span aria-hidden="true">·</span>');
    }
    if (item.baths != null) {
      specs.push('<span data-fr>' + item.baths + ' sdb</span><span data-en>' + item.baths + ' bath</span>');
    }
    if (item.beds == null && item.sqft != null) {
      specs.push('<span data-fr>' + formatSqft(item.sqft, 'fr') + '</span><span data-en>' + formatSqft(item.sqft, 'en') + '</span>');
    }
    if (item.beds == null && item.specExtra) {
      if (specs.length) specs.push('<span aria-hidden="true">·</span>');
      specs.push('<span data-fr>' + item.specExtra.fr + '</span><span data-en>' + item.specExtra.en + '</span>');
    }
    var near = '';
    if (item.near) {
      near = '<div style="font-size:11px;color:var(--text-light);margin-top:2px;" data-fr>' + item.near.fr + '</div>' +
             '<div style="font-size:11px;color:var(--text-light);margin-top:2px;" data-en>' + item.near.en + '</div>';
    }
    return (
      '<a href="' + href + '" class="prop-card-h" data-id="' + item.id + '" data-status="' + item.status + '" data-type="' + item.type + '">' +
        '<div class="prop-media">' +
          '<img src="' + item.image.replace('w=800', 'w=400').replace('q=80', 'q=70') + '" alt="" loading="lazy" />' +
          '<span class="pill ' + pillClass + '" data-fr>' + statusLabel(item.status, 'fr') + '</span>' +
          '<span class="pill ' + pillClass + '" data-en>' + statusLabel(item.status, 'en') + '</span>' +
        '</div>' +
        '<div class="prop-body">' +
          (showsPrice(item) ? '<div class="prop-price">' + priceHtml(item) + '</div>' : '') +
          '<div class="prop-specs">' + specs.join('') + '</div>' +
          '<div class="prop-addr">' + item.address + '</div>' + near +
        '</div>' +
      '</a>'
    );
  }

  function bindHearts(root) {
    (root || document).querySelectorAll('.prop-heart').forEach(function (h) {
      if (h._xltBound) return;
      h._xltBound = true;
      h.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        h.classList.toggle('liked');
        h.style.color = h.classList.contains('liked') ? '#e11d48' : '';
      });
    });
  }

  /** Normalize URL/form type aliases → res | com | off | '' */
  function normalizeType(raw) {
    if (!raw) return '';
    var t = String(raw).toLowerCase().trim();
    if (t === 'residential' || t === 'res' || t === 'apt' || t === 'apartment') return 'res';
    if (t === 'commercial' || t === 'com' || t === 'retail') return 'com';
    if (t === 'office' || t === 'off' || t === 'bureau') return 'off';
    if (t === 'land' || t === 'terrain' || t === 'lot') return 'land';
    return t;
  }

  function normalizeStatus(raw) {
    if (!raw) return '';
    var s = String(raw).toLowerCase().trim();
    if (s === 'open' || s === 'available' || s === 'disponible') return 'available';
    if (s === 'rented' || s === 'loué' || s === 'loue') return 'rented';
    return s;
  }

  function parsePriceLimit(raw) {
    if (!raw) return null;
    var s = String(raw).replace(/\u00a0/g, ' ').trim();
    var plus = /\+/.test(s);
    var digits = s.replace(/[^\d]/g, '');
    if (!digits) return null;
    return { value: parseInt(digits, 10), min: plus };
  }

  function matchesLoc(item, loc) {
    if (!loc) return true;
    var l = loc.trim().toLowerCase();
    if (!l || l === 'grand montréal' || l === 'grand montreal' || l.indexOf('longueuil, montréal') === 0 || l.indexOf('longueuil, montreal') === 0) {
      return true;
    }
    var city = (item.city || '').toLowerCase();
    var addr = (item.address || '').toLowerCase();
    // accent-insensitive-ish: normalize common accents for match
    function fold(x) {
      return x.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }
    var fl = fold(l);
    return fold(city).indexOf(fl) >= 0 || fold(addr).indexOf(fl) >= 0;
  }

  function matchesAvail(item, avail) {
    if (!avail) return true;
    var a = avail.trim().toLowerCase();
    if (!a || a === 'tous les statuts' || a === 'all') return true;
    var fr = ((item.availability && item.availability.fr) || '').toLowerCase();
    var en = ((item.availability && item.availability.en) || '').toLowerCase();
    if (a === 'immédiate' || a === 'immediate') {
      return fr.indexOf('immédiat') >= 0 || en.indexOf('immediate') >= 0;
    }
    if (a.indexOf('30') >= 0 || a.indexOf('sous') >= 0 || a.indexOf('within') >= 0) {
      return fr.indexOf('30') >= 0 || en.indexOf('30') >= 0;
    }
    return fr.indexOf(a) >= 0 || en.indexOf(a) >= 0;
  }

  function matchesPrice(item, priceRaw) {
    var lim = parsePriceLimit(priceRaw);
    if (!lim) return true;
    // Max/min monthly rent filter: only apply to monthly listings
    if (!hasPrice(item) || item.priceUnit === 'sqft') return false;
    if (lim.min) return item.price >= lim.value;
    return item.price <= lim.value;
  }

  function matchesType(item, typeNorm) {
    if (!typeNorm) return true;
    if (typeNorm === 'res') return item.type === 'res';
    if (typeNorm === 'off') return item.type === 'off';
    if (typeNorm === 'com') {
      // "Commerce" chip historically includes retail+office; URL type=commercial from nav = retail only?
      // Home commercial tab / com alias: show com + off (commercial category)
      // Explicit off already handled. For type=com from forms, include both com and off when coming from commercial tab,
      // but listings form has separate Bureau option. Form value "com" = retail only; "commercial" URL = retail+?
      // Spec: Normalize apt→residential, com→commercial, off→office, res→residential.
      // Existing chip "com" shows com|off. Keep chip behaviour; for URL type=com or commercial from home tab,
      // treat commercial category as com+off when source is tab "com", and form "com" as retail only.
      // Simplest consistent rule matching existing chip:
      // - type res → res
      // - type off → off
      // - type com → com OR off (category)
      // Nav links use type=commercial which previously filtered with filterCards('com') = com|off.
      return item.type === 'com' || item.type === 'off';
    }
    return item.type === typeNorm;
  }

  // Data capabilities, set once listings.json is loaded. Filters on data that does not exist
  // (no rents, no availability dates, no office units) are ignored instead of returning 0.
  var PRICE_FILTER_ENABLED = false;
  var _caps = null;
  function computeCaps(listings) {
    var types = {};
    listings.forEach(function (l) { types[l.type] = true; if (l.type === 'off') types.com = true; });
    return {
      // Price filter/sorts are off by owner decision (only one unit has a rent).
      // Set PRICE_FILTER_ENABLED = true to re-enable once rents are published.
      price: PRICE_FILTER_ENABLED && listings.some(hasPrice),
      avail: listings.some(function (l) { return l.availability && (l.availability.fr || l.availability.en); }),
      types: types
    };
  }

  function getFilterState() {
    var params = new URLSearchParams(location.search);
    var st = {
      type: normalizeType(params.get('type')),
      loc: params.get('loc') || '',
      price: params.get('price') || '',
      status: normalizeStatus(params.get('status')),
      avail: params.get('avail') || ''
    };
    if (_caps) {
      if (!_caps.price) st.price = '';
      if (!_caps.avail) st.avail = '';
      if (st.type && !_caps.types[st.type]) st.type = '';
    }
    return st;
  }

  /** Remove URL params that getFilterState ignores, so badges and forms stay honest. */
  function sanitizeUrl() {
    if (!_caps || !window.history || !history.replaceState) return;
    var params = new URLSearchParams(location.search);
    var st = getFilterState();
    var changed = false;
    if (params.has('price') && !st.price) { params.delete('price'); changed = true; }
    if (params.has('avail') && !st.avail) { params.delete('avail'); changed = true; }
    if (params.has('type') && !st.type) { params.delete('type'); changed = true; }
    if (changed) {
      var qs = params.toString();
      history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
    }
  }

  /** Hide select options that would return 0 results given the form's other fields.
   *  keep: 'all' (initial sync from the URL: never drop a selected value) or the <select> the user
   *  just changed (its value wins; other selects that now conflict are reset). */
  function pruneFormOptions(form, listings, extraState, keep) {
    if (!form || !listings.length) return;
    var selects = Array.prototype.filter.call(form.querySelectorAll('select[name]'), function (s) {
      return ['loc', 'type', 'status', 'price', 'avail'].indexOf(s.name) >= 0;
    });
    function isKept(sel) { return keep === 'all' || keep === sel; }
    function stateFrom(override) {
      var st = { type: '', loc: '', price: '', status: '', avail: '' };
      selects.forEach(function (s) {
        if (s.disabled && s.name === 'type') return;
        var v = override && override.name === s.name ? override.value : s.value;
        if (s.name === 'type') st.type = normalizeType(v);
        else if (s.name === 'status') st.status = normalizeStatus(v);
        else st[s.name] = v;
      });
      if (extraState) {
        var ex = extraState();
        Object.keys(ex).forEach(function (k) { if (!st[k] && !(override && override.name === k && override.value)) st[k] = ex[k]; });
      }
      return st;
    }
    function pass() {
      selects.forEach(function (sel) {
        Array.prototype.forEach.call(sel.options, function (o) {
          if (!o.value || (o.selected && isKept(sel))) { o.hidden = false; o.disabled = false; return; }
          var st = stateFrom({ name: sel.name, value: o.value });
          var n = listings.filter(function (l) { return listingMatches(l, st); }).length;
          o.hidden = n === 0;
          o.disabled = n === 0;
        });
      });
    }
    pass();
    var reset = false;
    selects.forEach(function (sel) {
      if (!isKept(sel) && sel.selectedOptions[0] && sel.selectedOptions[0].disabled) { sel.value = ''; reset = true; }
    });
    if (reset) pass();
  }

  function listingMatches(item, state) {
    if (state.type && !matchesType(item, state.type)) return false;
    if (state.status && item.status !== state.status) return false;
    if (!matchesLoc(item, state.loc)) return false;
    if (!matchesPrice(item, state.price)) return false;
    if (!matchesAvail(item, state.avail)) return false;
    return true;
  }

  function applyListingFilters(listings) {
    var state = getFilterState();
    var byId = {};
    listings.forEach(function (l) { byId[l.id] = l; });
    var visible = 0;
    document.querySelectorAll('#listingsGrid .prop-card').forEach(function (card) {
      var item = byId[card.getAttribute('data-id')];
      var show = item ? listingMatches(item, state) : true;
      card.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    updateVisibleCount(visible);
    updateListingsEmpty(visible);
    updateCounts(listings, state);
    syncListingsUi(listings, state);
    return visible;
  }

  function updateListingsEmpty(visible) {
    var grid = document.getElementById('listingsGrid');
    if (!grid) return;
    var el = document.getElementById('listingsEmpty');
    if (!el) {
      el = document.createElement('div');
      el.id = 'listingsEmpty';
      el.className = 'listings-empty';
      el.setAttribute('role', 'status');
      el.innerHTML = '<strong data-fr>Aucun résultat</strong><strong data-en>No results</strong>' +
        '<p data-fr>Aucune propriété ne correspond à ces filtres.</p><p data-en>No property matches these filters.</p>' +
        '<a class="btn btn-outline" href="listings.html"><span data-fr>Réinitialiser les filtres</span><span data-en>Reset filters</span></a>';
      grid.parentNode.insertBefore(el, grid.nextSibling);
    }
    el.hidden = visible > 0 || !_listingsCache.length;
    el.querySelector('a').setAttribute('href', 'listings.html' + (location.hash === '#list' ? '#list' : ''));
  }

  function updateVisibleCount(n) {
    var meta = document.querySelector('.results-meta strong[data-fr]');
    var metaEn = document.querySelector('.results-meta strong[data-en]');
    if (meta) meta.textContent = n + ' propriété' + (n === 1 ? '' : 's') + ' trouvée' + (n === 1 ? '' : 's');
    if (metaEn) metaEn.textContent = n + ' propert' + (n === 1 ? 'y' : 'ies') + ' found';
  }

  var _listingsCache = [];
  var STATUS_CHIPS = ['available', 'rented'];

  function copyState(st) { var o = {}; Object.keys(st).forEach(function (k) { o[k] = st[k]; }); return o; }
  /** State after clicking a chip: Tous clears type+status; a status or type chip sets (or, if active, clears) its dimension. */
  function chipState(state, f) {
    var st = copyState(state);
    if (f === 'all') { st.type = ''; st.status = ''; }
    else if (STATUS_CHIPS.indexOf(f) >= 0) st.status = state.status === f ? '' : f;
    else st.type = state.type === f ? '' : f;
    return st;
  }
  function chipIsActive(state, f) {
    if (f === 'all') return !state.type && !state.status;
    if (STATUS_CHIPS.indexOf(f) >= 0) return state.status === f;
    return state.type === f;
  }
  function setListingsUrl(st) {
    if (!window.history || !history.replaceState) return;
    var params = new URLSearchParams(location.search);
    params.delete('type');
    params.delete('status');
    if (st.type) params.set('type', st.type);
    if (st.status) params.set('status', st.status === 'available' ? 'open' : st.status);
    var qs = params.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
  }

  function bindFilters() {
    if (!document.getElementById('listingsGrid')) return;
    document.querySelectorAll('.chip[data-filter]').forEach(function (chip) {
      if (chip._xltBound) return;
      chip._xltBound = true;
      chip.addEventListener('click', function () {
        if (chip.disabled || !_listingsCache.length) return;
        setListingsUrl(chipState(getFilterState(), chip.getAttribute('data-filter')));
        applyListingFilters(_listingsCache);
      });
    });
    document.querySelectorAll('#statusTabs button').forEach(function (btn) {
      if (btn._xltBound) return;
      btn._xltBound = true;
      btn.addEventListener('click', function () {
        if (btn.disabled || !_listingsCache.length) return;
        var st = getFilterState();
        var f = btn.getAttribute('data-filter');
        st.status = f === 'all' ? '' : f;
        setListingsUrl(st);
        applyListingFilters(_listingsCache);
      });
    });
  }

  /** Chips, status tabs and the filter form all mirror the one filter state (the URL). */
  function syncListingsUi(listings, state) {
    document.querySelectorAll('.chip[data-filter]').forEach(function (c) {
      var f = c.getAttribute('data-filter');
      var active = chipIsActive(state, f);
      c.classList.toggle('active', active);
      c.setAttribute('aria-pressed', active ? 'true' : 'false');
      var empty = !active && !listings.some(function (l) { return listingMatches(l, chipState(state, f)); });
      c.disabled = empty;
      c.classList.toggle('is-empty', empty);
    });
    document.querySelectorAll('#statusTabs button').forEach(function (b) {
      var active = b.getAttribute('data-filter') === (state.status || 'all');
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    syncFilterForm(state);
    pruneFormOptions(document.querySelector('form.filter-search'), listings, null, 'all');
    applyLang(currentLang());
  }

  function syncFilterForm(state) {
    var form = document.querySelector('form.filter-search');
    if (!form) return;
    var locSel = form.querySelector('select[name="loc"]');
    var typeSel = form.querySelector('select[name="type"]');
    var statusSel = form.querySelector('select[name="status"]');
    if (locSel) {
      var lv = '';
      Array.prototype.forEach.call(locSel.options, function (o) {
        if (state.loc && o.value && (o.value === state.loc || o.textContent === state.loc)) lv = o.value;
      });
      locSel.value = lv;
    }
    if (typeSel) typeSel.value = state.type || '';
    if (statusSel) statusSel.value = state.status === 'available' ? 'open' : (state.status || '');
  }

  function updateCounts(listings, state) {
    state = state || getFilterState();
    // Tab counts ignore status (tabs ARE status) but honor everything else
    var baseState = copyState(state);
    baseState.status = '';
    var base = listings.filter(function (l) { return listingMatches(l, baseState); });
    var counts = {
      all: base.length,
      available: base.filter(function (l) { return l.status === 'available'; }).length,
      rented: base.filter(function (l) { return l.status === 'rented'; }).length
    };
    var labels = { all: ['Toutes', 'All'], available: ['Disponibles', 'Available'], rented: ['Louées', 'Rented'] };
    var tabs = document.getElementById('statusTabs');
    if (tabs) {
      tabs.querySelectorAll('button').forEach(function (b) {
        var f = b.getAttribute('data-filter');
        if (!labels[f]) return;
        var n = counts[f];
        b.innerHTML = '<span data-fr>' + labels[f][0] + ' (' + n + ')</span><span data-en>' + labels[f][1] + ' (' + n + ')</span>';
        // A tab that would show 0 results (and isn't the current one) is disabled
        var off = n === 0 && f !== (state.status || 'all');
        b.disabled = off;
        b.classList.toggle('is-empty', off);
      });
    }
    updateFilterBadge(state);
  }

  function countActiveFilters(state) {
    var n = 0;
    if (state.loc) n++;
    if (state.type) n++;
    if (state.status) n++;
    if (state.avail) n++;
    if (state.price) n++;
    return n;
  }

  function updateFilterBadge(state) {
    state = state || getFilterState();
    var n = countActiveFilters(state);
    ['filterCount', 'mapFilterCount'].forEach(function (id) {
      var badge = document.getElementById(id);
      if (!badge) return;
      badge.hidden = n === 0;
      badge.textContent = n > 0 ? String(n) : '';
      badge.setAttribute('aria-label', n > 0 ? (n + (currentLang() === 'en' ? ' active filters' : ' filtres actifs')) : '');
    });
  }

  function renderListingsPage(listings) {
    var grid = document.getElementById('listingsGrid');
    if (!grid) return;
    _listingsCache = listings;
    grid.innerHTML = sortByMode(listings, 'relevance').map(cardHtml).join('');
    bindHearts(grid);
    bindFilters();
    applyListingFilters(listings);
  }

  function renderFeatured(listings) {
    var grid = document.querySelector('.featured-grid');
    if (!grid) return;
    // P6-15: show the Disponible units (featured first); never a Loué unit ahead of an available one.
    var avail = listings.filter(function (l) { return l.status === 'available'; });
    var featured = avail.filter(function (l) { return l.featured; })
      .concat(avail.filter(function (l) { return !l.featured; })).slice(0, 3);
    if (!featured.length) featured = listings.filter(function (l) { return l.featured; }).slice(0, 3);
    grid.classList.toggle('featured-few', featured.length < 3);
    grid.innerHTML = featured.map(cardHtml).join('');
    bindHearts(grid);
  }

  var MAP_PAGE_SIZE = 10;
  var _mapPage = 0;
  var _mapFiltered = [];
  var _mapAll = [];
  var _mapSort = 'relevance';
  var SORT_LABELS = {
    'relevance': { fr: 'Pertinence', en: 'Relevance' },
    'price-asc': { fr: 'Prix ↑', en: 'Price ↑' },
    'price-desc': { fr: 'Prix ↓', en: 'Price ↓' },
    'newest': { fr: 'Plus récent', en: 'Newest' }
  };

  function sortKey(l, idx) {
    return { item: l, id: l.id, price: hasPrice(l) ? l.price : null, unit: l.priceUnit, idx: idx, status: l.status, listed: l.listedOn || '' };
  }
  function sortByMode(items, mode) {
    return items.map(function (l, i) { return sortKey(l, i); })
      .sort(function (a, b) { return compareByMode(a, b, mode); })
      .map(function (k) { return k.item; });
  }
  var FILTER_NAMES = ['loc', 'type', 'status', 'price', 'avail'];

  function sortMapItems(items, mode) {
    var idx = {};
    _mapAll.forEach(function (l, i) { idx[l.id] = i; });
    return items.map(function (l) {
      return sortKey(l, idx.hasOwnProperty(l.id) ? idx[l.id] : 999);
    }).sort(function (a, b) { return compareByMode(a, b, mode); })
      .map(function (k) { return k.item; });
  }

  function setMapSort(mode) {
    if (!SORT_LABELS[mode]) mode = 'relevance';
    _mapSort = mode;
    var fr = document.getElementById('mapSortLabelFr');
    var en = document.getElementById('mapSortLabelEn');
    if (fr) fr.textContent = 'Trier : ' + SORT_LABELS[mode].fr;
    if (en) en.textContent = 'Sort: ' + SORT_LABELS[mode].en;
    document.querySelectorAll('#mapSortMenu [data-sort]').forEach(function (b) {
      b.setAttribute('aria-checked', b.getAttribute('data-sort') === mode ? 'true' : 'false');
    });
    _mapFiltered = sortMapItems(_mapFiltered, mode);
    _mapPage = 0;
    renderMapList();
  }

  function selectOptionMatching(sel, test) {
    if (!sel) return;
    var found = '';
    Array.prototype.forEach.call(sel.options, function (o) { if (!found && o.value && test(o)) found = o.value; });
    sel.value = found;
  }

  function syncMapFilterForm(state) {
    var form = document.getElementById('mapFilterForm');
    if (!form) return;
    var el = form.elements;
    selectOptionMatching(el.type, function (o) { return o.value === state.type; });
    selectOptionMatching(el.status, function (o) {
      return (state.status === 'available' && o.value === 'open') || (state.status === 'rented' && o.value === 'rented');
    });
    selectOptionMatching(el.loc, function (o) { return state.loc && o.value.toLowerCase() === state.loc.toLowerCase(); });
    var lim = parsePriceLimit(state.price);
    selectOptionMatching(el.price, function (o) {
      var ol = parsePriceLimit(o.value);
      return lim && ol && ol.value === lim.value && ol.min === lim.min;
    });
    var a = (state.avail || '').toLowerCase();
    selectOptionMatching(el.avail, function (o) {
      return a && (o.value.toLowerCase() === a || (o.getAttribute('data-en') || '').toLowerCase() === a);
    });
  }

  function mapFormState(form) {
    var el = form.elements;
    return {
      type: normalizeType(el.type.value),
      loc: el.loc.value,
      price: el.price ? el.price.value : '',
      status: normalizeStatus(el.status.value),
      avail: el.avail ? el.avail.value : ''
    };
  }

  function updateMapApplyLabel() {
    var form = document.getElementById('mapFilterForm');
    if (!form || !_mapAll.length) return;
    var st = mapFormState(form);
    var n = _mapAll.filter(function (l) { return listingMatches(l, st); }).length;
    var fr = document.getElementById('mapApplyFr');
    var en = document.getElementById('mapApplyEn');
    if (fr) fr.textContent = n === 1 ? 'Afficher 1 résultat' : 'Afficher ' + n + ' résultats';
    if (en) en.textContent = n === 1 ? 'Show 1 result' : 'Show ' + n + ' results';
  }

  function applyMapFilterParams(params) {
    var qs = params.toString();
    if (window.history && history.replaceState) {
      history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
    }
    renderMapPage(_mapAll);
  }

  function bindMapControls() {
    var fToggle = document.getElementById('mapFiltersToggle');
    var panel = document.getElementById('mapFilterPanel');
    var form = document.getElementById('mapFilterForm');
    var sToggle = document.getElementById('mapSortToggle');
    var menu = document.getElementById('mapSortMenu');
    var sortWrap = document.getElementById('mapSortWrap');
    if (!fToggle || !panel || !form || !sToggle || !menu) return;
    var sheet = panel.querySelector('.map-filter-sheet');
    var mq = window.matchMedia('(max-width: 899px)');

    function positionSheet() {
      if (mq.matches) {
        sheet.style.top = ''; sheet.style.left = ''; sheet.style.width = '';
        return;
      }
      var head = document.querySelector('.map-list-head');
      var hr = head ? head.getBoundingClientRect() : { left: 16, width: 420 };
      var r = fToggle.getBoundingClientRect();
      sheet.style.top = Math.round(r.bottom + 8) + 'px';
      sheet.style.left = Math.round(hr.left + 12) + 'px';
      sheet.style.width = Math.round(Math.max(300, Math.min(420, hr.width - 24))) + 'px';
    }
    function openPanel() {
      closeSort(false);
      syncMapFilterForm(getFilterState());
      updateMapApplyLabel();
      panel.hidden = false;
      fToggle.setAttribute('aria-expanded', 'true');
      positionSheet();
      var first = form.querySelector('select');
      if (first) first.focus();
    }
    function closePanel(restoreFocus) {
      if (panel.hidden) return;
      panel.hidden = true;
      fToggle.setAttribute('aria-expanded', 'false');
      if (restoreFocus) fToggle.focus();
    }
    function sortItems() { return Array.prototype.slice.call(menu.querySelectorAll('[data-sort]')); }
    function openSort() {
      closePanel(false);
      menu.hidden = false;
      sToggle.setAttribute('aria-expanded', 'true');
      var cur = menu.querySelector('[aria-checked="true"]') || sortItems()[0];
      if (cur) cur.focus();
    }
    function closeSort(restoreFocus) {
      if (menu.hidden) return;
      menu.hidden = true;
      sToggle.setAttribute('aria-expanded', 'false');
      if (restoreFocus) sToggle.focus();
    }

    fToggle.addEventListener('click', function () { panel.hidden ? openPanel() : closePanel(true); });
    document.getElementById('mapFilterBackdrop').addEventListener('click', function () { closePanel(true); });
    document.getElementById('mapFilterClose').addEventListener('click', function () { closePanel(true); });
    form.addEventListener('change', updateMapApplyLabel);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var params = new URLSearchParams();
      FILTER_NAMES.forEach(function (n) {
        var el = form.elements[n];
        if (el && el.value) params.set(n, el.value);
      });
      applyMapFilterParams(params);
      closePanel(true);
    });
    document.getElementById('mapFilterReset').addEventListener('click', function () {
      FILTER_NAMES.forEach(function (n) { if (form.elements[n]) form.elements[n].value = ''; });
      var fm = document.querySelector('#mapPanel .fake-map');
      if (fm) resetMapView(fm);
      applyMapFilterParams(new URLSearchParams());
      updateMapApplyLabel();
    });
    // Keep focus inside the open filter dialog
    panel.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = Array.prototype.filter.call(sheet.querySelectorAll('button, select, a[href], input'), function (x) { return !x.disabled && x.offsetParent !== null; });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    });

    sToggle.addEventListener('click', function () { menu.hidden ? openSort() : closeSort(true); });
    sToggle.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); openSort(); }
    });
    sortItems().forEach(function (b) {
      b.addEventListener('click', function () {
        setMapSort(b.getAttribute('data-sort'));
        closeSort(true);
      });
    });
    menu.addEventListener('keydown', function (e) {
      var items = sortItems();
      var i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
      else if (e.key === 'Home') { e.preventDefault(); items[0].focus(); }
      else if (e.key === 'End') { e.preventDefault(); items[items.length - 1].focus(); }
      else if (e.key === 'Tab') { closeSort(false); }
    });

    document.addEventListener('click', function (e) {
      if (!menu.hidden && sortWrap && !sortWrap.contains(e.target)) closeSort(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (!panel.hidden) closePanel(true);
      else if (!menu.hidden) closeSort(true);
    });
    window.addEventListener('resize', function () { if (!panel.hidden) positionSheet(); });
    document.addEventListener('xlt-lang', function () { updateFilterBadge(); });
  }

  function renderMapList() {
    var body = document.querySelector('.map-list-body');
    if (!body) return;
    var total = _mapFiltered.length;
    var pages = Math.max(1, Math.ceil(total / MAP_PAGE_SIZE));
    if (_mapPage > pages - 1) _mapPage = pages - 1;
    if (_mapPage < 0) _mapPage = 0;
    var start = _mapPage * MAP_PAGE_SIZE;
    var slice = _mapFiltered.slice(start, start + MAP_PAGE_SIZE);
    body.innerHTML = total ? slice.map(mapCardHtml).join('') :
      '<div class="map-empty" role="status">' +
        '<p data-fr><strong>Aucun résultat</strong><br>Aucune propriété ne correspond à ces filtres.</p>' +
        '<p data-en><strong>No results</strong><br>No property matches these filters.</p>' +
        '<a href="map.html" class="btn btn-sm btn-outline"><span data-fr>Réinitialiser les filtres</span><span data-en>Reset filters</span></a>' +
      '</div>';
    var from = total ? start + 1 : 0;
    var to = start + slice.length;
    var rFr = document.getElementById('mapRangeFr');
    var rEn = document.getElementById('mapRangeEn');
    if (rFr) rFr.textContent = from + ' à ' + to + ' de ' + total;
    if (rEn) rEn.textContent = from + '–' + to + ' of ' + total;
    var pager = document.getElementById('mapPager');
    var prev = document.getElementById('mapPrev');
    var next = document.getElementById('mapNext');
    if (pager) pager.hidden = pages <= 1;
    if (prev) prev.disabled = _mapPage <= 0;
    if (next) next.disabled = _mapPage >= pages - 1;
    applyLang(currentLang());
  }

  function bindMapPager() {
    var prev = document.getElementById('mapPrev');
    var next = document.getElementById('mapNext');
    if (prev && !prev._xltBound) {
      prev._xltBound = true;
      prev.addEventListener('click', function () { _mapPage--; renderMapList(); });
    }
    if (next && !next._xltBound) {
      next._xltBound = true;
      next.addEventListener('click', function () { _mapPage++; renderMapList(); });
    }
  }

  function renderMapPage(listings) {
    var body = document.querySelector('.map-list-body');
    if (!body) return; // map.html only
    var state = getFilterState();
    _mapAll = listings;
    _mapFiltered = sortMapItems(listings.filter(function (l) { return listingMatches(l, state); }), _mapSort);
    _mapPage = 0;
    updateFilterBadge(state);
    syncMapFilterForm(state);
    bindMapPager();
    renderMapList();
    var n = _mapFiltered.length;
    var headPFr = document.querySelector('.map-list-head p[data-fr]');
    var headPEn = document.querySelector('.map-list-head p[data-en]');
    if (headPFr) headPFr.textContent = n + ' location' + (n === 1 ? '' : 's') + ' trouvée' + (n === 1 ? '' : 's');
    if (headPEn) headPEn.textContent = n + ' rental' + (n === 1 ? '' : 's') + ' found';

    var fakeMap = document.querySelector('#mapPanel .fake-map');
    if (!fakeMap) return;
    bindMapView(fakeMap);
    renderMapPins(fakeMap, _mapFiltered);
    if (!fakeMap._xltObserved && window.ResizeObserver) {
      fakeMap._xltObserved = true;
      var t = null;
      new ResizeObserver(function () {
        clearTimeout(t);
        t = setTimeout(function () { renderMapPins(fakeMap, _mapFiltered); }, 60);
      }).observe(fakeMap);
    }
  }

  // —— P6-09: pins grouped when they would overlap; Disponible drawn on top; count badge + popover ——
  function pinLabel(item, lg) {
    if (item.status === 'available' && hasPrice(item)) {
      return item.priceUnit === 'sqft' ? fmtPrice(item, lg) : fmtPrice(item, lg, true);
    }
    return statusLabel(item.status, lg);
  }
  function bi(fr, en) { return '<span data-fr>' + fr + '</span><span data-en>' + en + '</span>'; }
  function closeMapPop(map) {
    var pop = map.querySelector('.map-pop');
    if (pop) pop.remove();
    map.querySelectorAll('.map-cluster[aria-expanded="true"]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
  }
  function splitAddr(a) {
    var i = (a || '').lastIndexOf(', ');
    return i > 0 ? [a.slice(0, i), a.slice(i + 2)] : [a || '', ''];
  }
  function openMapPop(map, cluster, btn) {
    closeMapPop(map);
    var pop = document.createElement('div');
    pop.className = 'map-pop';
    pop.setAttribute('role', 'dialog');
    var n = cluster.items.length;
    pop.setAttribute('data-aria-fr', n + ' unités dans ce secteur');
    pop.setAttribute('data-aria-en', n + ' units in this area');
    var items = cluster.items.slice().sort(function (a, b) { return (a.status === 'available' ? 0 : 1) - (b.status === 'available' ? 0 : 1); });
    pop.innerHTML = '<div class="map-pop-head">' + bi(n + ' unités dans ce secteur', n + ' units in this area') +
      '<button type="button" class="map-pop-close" aria-label="Fermer" data-aria-fr="Fermer" data-aria-en="Close">×</button></div>' +
      '<ul>' + items.map(function (it) {
        var pc = it.status === 'available' ? 'pill-available' : 'pill-rented';
        var parts = splitAddr(it.address);
        return '<li><a href="detail.html?id=' + encodeURIComponent(it.id) + '" title="' + esc(it.address) + '">' +
          '<span class="pill ' + pc + '">' + bi(statusLabel(it.status, 'fr'), statusLabel(it.status, 'en')) + '</span>' +
          '<span class="map-pop-text"><span class="map-pop-addr">' + parts[0] + '</span>' +
          (parts[1] ? '<span class="map-pop-city">' + parts[1] + '</span>' : '') +
          (showsPrice(it) ? '<span class="map-pop-price">' + priceHtml(it) + '</span>' : '') +
          '</span></a></li>';
      }).join('') + '</ul>';
    map.appendChild(pop);
    var W = map.clientWidth, H = map.clientHeight;
    var pw = Math.min(310, W - 16);
    pop.style.width = pw + 'px';
    var left = Math.max(8, Math.min(W - pw - 8, cluster.x - pw / 2));
    var ph = pop.offsetHeight;
    var top = cluster.y + 8;
    if (top + ph > H - 8) top = Math.max(8, cluster.y - 40 - ph);
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
    btn.setAttribute('aria-expanded', 'true');
    pop.querySelector('.map-pop-close').addEventListener('click', function () { closeMapPop(map); btn.focus(); });
    applyLang(currentLang());
  }

  // —— P7-04 / P8: static map zoom (+/−), pan (drag, arrow keys), fullscreen ——
  // The view is stored as a zoom level + the centre point as a FRACTION of the map, so it survives
  // any resize (fullscreen, rotation). Pins are drawn at their true projected position (no edge clamp).
  var MAP_ZOOMS = [1, 1.5, 2, 2.5];
  var MAP_FRAME = { l: 52, r: 52, t: 72, b: 28 }; // data % positions are projected inside this frame at z0
  function mapView(map) { return map._view || (map._view = { z: 0, cx: 0.5, cy: 0.5 }); }
  function clampMapView(map) {
    var v = mapView(map), h = 0.5 / MAP_ZOOMS[v.z];
    v.cx = Math.max(h, Math.min(1 - h, v.cx));
    v.cy = Math.max(h, Math.min(1 - h, v.cy));
  }
  function mapOffsets(map) {
    var v = mapView(map), s = MAP_ZOOMS[v.z], W = map.clientWidth, H = map.clientHeight;
    return { s: s, W: W, H: H, ox: v.cx * W * s - W / 2, oy: v.cy * H * s - H / 2 };
  }
  function resetMapView(map) { var v = mapView(map); v.z = 0; v.cx = 0.5; v.cy = 0.5; }
  function setCtlDisabled(btn, off) {
    if (!btn) return;
    btn.setAttribute('aria-disabled', off ? 'true' : 'false');
    btn.classList.toggle('is-disabled', off);
  }
  function applyMapBg(map) {
    clampMapView(map);
    var v = mapView(map), o = mapOffsets(map);
    var bg = map.querySelector('.map-bg');
    if (bg) bg.style.transform = 'translate(' + (-o.ox) + 'px,' + (-o.oy) + 'px) scale(' + o.s + ')';
    map.classList.toggle('is-zoomed', v.z > 0);
    setCtlDisabled(document.getElementById('mapZoomIn'), v.z >= MAP_ZOOMS.length - 1);
    setCtlDisabled(document.getElementById('mapZoomOut'), v.z <= 0);
  }
  function zoomMap(map, dir) {
    var v = mapView(map);
    var nz = Math.max(0, Math.min(MAP_ZOOMS.length - 1, v.z + dir));
    if (nz === v.z) return false;
    v.z = nz; // zooms about the current centre (cx/cy unchanged)
    renderMapPins(map, _mapFiltered);
    return true;
  }
  function panMap(map, dx, dy) {
    var v = mapView(map), o = mapOffsets(map);
    if (!v.z) return;
    v.cx += dx / (o.W * o.s);
    v.cy += dy / (o.H * o.s);
    applyMapBg(map);
    if (!map._raf) map._raf = requestAnimationFrame(function () { map._raf = 0; renderMapPins(map, _mapFiltered); });
  }
  function mapStatusEl(map) {
    var el = map.querySelector('.map-status');
    if (!el) {
      el = document.createElement('div');
      el.className = 'map-status';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      map.appendChild(el);
      el.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-act="recenter"]');
        if (!b) return;
        e.stopPropagation();
        resetMapView(map);
        renderMapPins(map, _mapFiltered);
        map.focus({ preventScroll: true });
      });
    }
    return el;
  }
  function setMapStatus(map, key) {
    var el = mapStatusEl(map);
    if (map._statusKey === key) return;
    map._statusKey = key;
    if (key === 'none') {
      el.innerHTML = '<strong>' + bi('Aucun résultat', 'No results') + '</strong> ' +
        bi('Aucune propriété ne correspond à ces filtres.', 'No property matches these filters.') +
        ' <a href="map.html">' + bi('Réinitialiser les filtres', 'Reset filters') + '</a>';
    } else if (key === 'view') {
      el.innerHTML = bi('Aucune propriété dans cette vue.', 'No properties in this view.') +
        ' <button type="button" data-act="recenter">' + bi('Recentrer', 'Recenter') + '</button>';
    } else {
      el.innerHTML = '';
    }
    el.classList.toggle('has-msg', !!key);
    el.classList.toggle('is-none', key === 'none');
  }
  function bindMapView(map) {
    if (map._xltViewBound) return;
    map._xltViewBound = true;
    mapStatusEl(map);
    var zi = document.getElementById('mapZoomIn'), zo = document.getElementById('mapZoomOut');
    [[zi, 1], [zo, -1]].forEach(function (pair) {
      var btn = pair[0];
      if (!btn) return;
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (btn.getAttribute('aria-disabled') === 'true') return; // focus stays on the button
        zoomMap(map, pair[1]);
      });
    });
    // Drag to pan (mouse, touch, pen). No native drag/selection may hijack the gesture.
    var drag = null, suppressClick = false;
    map.addEventListener('dragstart', function (e) { e.preventDefault(); });
    map.addEventListener('pointerdown', function (e) {
      if (!mapView(map).z) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (e.target.closest('.map-tools, .map-zoom, .map-pop, .map-status')) return;
      if (e.pointerType === 'mouse') e.preventDefault();
      var sel = window.getSelection && window.getSelection();
      if (sel && sel.removeAllRanges) sel.removeAllRanges();
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, moved: false };
    });
    map.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      if (!drag.moved) {
        if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) < 5) return;
        drag.moved = true;
        try { map.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        map.classList.add('is-dragging');
        closeMapPop(map);
      }
      panMap(map, -(e.clientX - drag.lx), -(e.clientY - drag.ly));
      drag.lx = e.clientX;
      drag.ly = e.clientY;
    });
    var end = function (e) {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      if (drag.moved) { suppressClick = true; setTimeout(function () { suppressClick = false; }, 0); }
      drag = null;
      map.classList.remove('is-dragging');
    };
    map.addEventListener('pointerup', end);
    map.addEventListener('pointercancel', end);
    map.addEventListener('lostpointercapture', end);
    // A drag that ends over a pin must not open it
    map.addEventListener('click', function (e) {
      if (suppressClick) { e.preventDefault(); e.stopPropagation(); suppressClick = false; }
    }, true);
    // Keyboard: arrows pan when zoomed, +/- zoom (map surface must have focus)
    map.addEventListener('keydown', function (e) {
      if (e.target !== map || e.altKey || e.ctrlKey || e.metaKey) return;
      var o = mapOffsets(map), z = mapView(map).z, handled = true;
      var stepX = o.W * 0.15, stepY = o.H * 0.15;
      if (e.key === 'ArrowLeft' && z) panMap(map, -stepX, 0);
      else if (e.key === 'ArrowRight' && z) panMap(map, stepX, 0);
      else if (e.key === 'ArrowUp' && z) panMap(map, 0, -stepY);
      else if (e.key === 'ArrowDown' && z) panMap(map, 0, stepY);
      else if (e.key === '+' || e.key === '=') zoomMap(map, 1);
      else if (e.key === '-' || e.key === '_') zoomMap(map, -1);
      else handled = false;
      if (handled) e.preventDefault();
    });
    applyMapBg(map);

    // Fullscreen (native API; full-viewport overlay where it isn't available, e.g. iPhone Safari)
    var panel = document.getElementById('mapPanel');
    var fsBtn = document.getElementById('mapFsBtn');
    if (!panel || !fsBtn) return;
    var setFs = function (on) {
      panel.classList.toggle('is-fs', on);
      document.body.classList.toggle('map-fs-lock', on);
    };
    var native = !!(panel.requestFullscreen && document.fullscreenEnabled);
    fsBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (panel.classList.contains('is-fs')) {
        if (document.fullscreenElement) document.exitFullscreen().catch(function () { setFs(false); });
        else setFs(false);
        return;
      }
      if (native) panel.requestFullscreen().then(function () { setFs(true); }).catch(function () { setFs(true); });
      else setFs(true);
    });
    document.addEventListener('fullscreenchange', function () {
      if (document.fullscreenElement === panel) setFs(true);
      else if (!document.fullscreenElement && panel.classList.contains('is-fs')) setFs(false);
      renderMapPins(map, _mapFiltered); // view centre is fractional, so it is kept
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('is-fs') && !document.fullscreenElement && !map.querySelector('.map-pop')) setFs(false);
    });
  }

  function rectsOverlap(a, b, pad) {
    return a.left < b.right + pad && b.left < a.right + pad && a.top < b.bottom + pad && b.top < a.bottom + pad;
  }

  function renderMapPins(map, items) {
    map.querySelectorAll('.map-pin').forEach(function (pin) { pin.remove(); });
    closeMapPop(map);
    var W = map.clientWidth, H = map.clientHeight;
    if (!W || !H) return; // hidden (mobile list mode); ResizeObserver re-renders when shown
    var PW = 92, PH = 34;
    applyMapBg(map);
    var o = mapOffsets(map), z = mapView(map).z;
    var fw = W - MAP_FRAME.l - MAP_FRAME.r, fh = H - MAP_FRAME.t - MAP_FRAME.b;
    var pts = [];
    items.forEach(function (item, i) {
      var m = item.map || { top: (30 + i * 5) + '%', left: (35 + i * 4) + '%' };
      var x = (MAP_FRAME.l + parseFloat(m.left) / 100 * fw) * o.s - o.ox;
      var y = (MAP_FRAME.t + parseFloat(m.top) / 100 * fh) * o.s - o.oy;
      if (x < 0 || x > W || y < 0 || y > H) return; // location outside the view: not drawn
      pts.push({ items: [item], x: x, y: y });
    });
    // Greedy agglomerative grouping until no two pins overlap
    var merged = true;
    while (merged) {
      merged = false;
      for (var i = 0; i < pts.length && !merged; i++) {
        for (var j = i + 1; j < pts.length; j++) {
          if (Math.abs(pts[i].x - pts[j].x) < PW && Math.abs(pts[i].y - pts[j].y) < PH) {
            var a = pts[i], b = pts[j], na = a.items.length, nb = b.items.length;
            a.x = (a.x * na + b.x * nb) / (na + nb);
            a.y = (a.y * na + b.y * nb) / (na + nb);
            a.items = a.items.concat(b.items);
            pts.splice(j, 1);
            merged = true;
            break;
          }
        }
      }
    }
    // Control areas (zoom stack, fullscreen): pins never sit under them
    var mr = map.getBoundingClientRect();
    var ctlRects = Array.prototype.map.call(map.querySelectorAll('.map-tools, .map-zoom'), function (c) { return c.getBoundingClientRect(); })
      .filter(function (r) { return r.width && r.height; });
    var drawn = 0;
    pts.forEach(function (c) {
      var nAvail = c.items.filter(function (it) { return it.status === 'available'; }).length;
      var el;
      if (c.items.length === 1) {
        var it = c.items[0];
        el = document.createElement('a');
        el.href = 'detail.html?id=' + encodeURIComponent(it.id);
        el.className = 'map-pin ' + (it.status === 'available' ? 'available' : 'rented');
        el.setAttribute('data-id', it.id);
        el.setAttribute('draggable', 'false');
        el.innerHTML = bi(pinLabel(it, 'fr'), pinLabel(it, 'en'));
        el.setAttribute('title', it.address);
      } else {
        var n = c.items.length;
        el = document.createElement('button');
        el.type = 'button';
        el.className = 'map-pin map-cluster ' + (nAvail ? 'has-avail' : 'rented');
        el.setAttribute('aria-expanded', 'false');
        el.setAttribute('data-count', n);
        el.innerHTML = (nAvail ? bi(n + ' unités', n + ' units') : bi(n + ' loués', n + ' rented')) +
          (nAvail ? '<span class="pin-badge" aria-hidden="true">' + nAvail + '</span>' : '');
        el.setAttribute('data-aria-fr', nAvail ? n + ' unités, dont ' + nAvail + ' disponible' + (nAvail > 1 ? 's' : '') : n + ' unités louées');
        el.setAttribute('data-aria-en', nAvail ? n + ' units, ' + nAvail + ' available' : n + ' rented units');
        el.setAttribute('aria-label', el.getAttribute(currentLang() === 'en' ? 'data-aria-en' : 'data-aria-fr'));
        el.addEventListener('click', function (e) {
          e.stopPropagation();
          if (el.getAttribute('aria-expanded') === 'true') closeMapPop(map); else openMapPop(map, c, el);
        });
      }
      el.style.left = c.x + 'px';
      el.style.top = c.y + 'px';
      el.style.zIndex = nAvail ? 6 : 3;
      map.appendChild(el);
      var r = el.getBoundingClientRect();
      if (ctlRects.some(function (cr) { return rectsOverlap(r, cr, 6); })) { el.remove(); return; }
      drawn++;
    });
    setMapStatus(map, !items.length ? 'none' : (z && !drawn ? 'view' : ''));
    if (!map._xltPopBound) {
      map._xltPopBound = true;
      document.addEventListener('click', function (e) {
        var pop = map.querySelector('.map-pop');
        if (pop && !pop.contains(e.target)) closeMapPop(map);
      });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMapPop(map); });
    }
  }

  function unitFrTable(item) { return item.priceUnit === 'sqft' ? '/pi²' : '/mois'; }
  function unitEnTable(item) { return item.priceUnit === 'sqft' ? '/sq ft' : '/mo'; }

  function findDetailHeading(frText) {
    return Array.prototype.find.call(document.querySelectorAll('.detail-content h2'), function (h) {
      return h.getAttribute('data-fr') === frText || h.textContent.trim() === frText;
    });
  }

  function toggleDetailSection(frHeading, show) {
    var h = findDetailHeading(frHeading);
    if (!h) return;
    var el = h;
    // FR heading, EN heading, then the content block(s) until next heading/section
    var nodes = [];
    while (el) {
      nodes.push(el);
      var next = el.nextElementSibling;
      if (!next || (next.tagName === 'H2' && nodes.length >= 2) || next.tagName === 'SECTION') break;
      el = next;
    }
    var wrap = h.parentElement && h.parentElement.tagName === 'SECTION' ? h.parentElement : null;
    if (wrap) { wrap.style.display = show ? '' : 'none'; return; }
    nodes.forEach(function (n) { n.style.display = show ? '' : 'none'; });
  }

  function renderDetail(listings) {
    if (!document.querySelector('.detail-layout')) return;
    var params = new URLSearchParams(location.search);
    var id = params.get('id') || '';
    var item = listings.find(function (l) { return l.id === id; }) || listings[0];
    if (!item) return;

    var lang = currentLang();
    var setTitle = function (lg) { document.title = (item.title[lg] || item.title.fr) + ' — Gestion XLT'; };
    setTitle(lang);
    if (!document._xltTitleBound) {
      document._xltTitleBound = true;
      document.addEventListener('xlt-lang', function (e) { setTitle(e.detail); });
    }

    var mainPhoto = document.getElementById('mainPhoto');
    var images = item.images && item.images.length ? item.images : [item.image];
    if (mainPhoto) {
      mainPhoto.src = images[0];
      mainPhoto.setAttribute('alt', item.title[lang] || item.title.fr);
    }

    var galleryTitle = document.querySelector('.gallery-title');
    if (galleryTitle) {
      galleryTitle.innerHTML =
        '<h1 data-fr>' + item.title.fr + '</h1><h1 data-en>' + item.title.en + '</h1>' +
        '<p>' + item.address.split(',')[0] + '</p>';
    }
    var count = document.querySelector('.gallery-count');
    if (count) count.textContent = '< 1 / ' + (item.photoCount || images.length);

    var thumbs = document.querySelector('.thumbs');
    if (thumbs) {
      var thumbImgs = images.slice(0, 4);
      var more = Math.max(0, (item.photoCount || images.length) - thumbImgs.length);
      var thumbSrc = function (i) {
        return (item.thumbs && item.thumbs[i]) || images[i].replace('w=1400', 'w=300').replace('q=80', 'q=70');
      };
      thumbs.innerHTML = thumbImgs.map(function (src, idx) {
        return '<button type="button" data-src="' + src + '" data-idx="' + (idx + 1) + '"><img src="' + thumbSrc(idx) + '" alt="" loading="lazy" /></button>';
      }).join('') + (more > 0
        ? '<button type="button" class="more-thumbs" aria-label="Plus de photos / More photos"><img src="' + thumbSrc(Math.min(4, images.length - 1)) + '" alt="" loading="lazy" /><span class="more-overlay">+ ' + more + '</span></button>'
        : '');
      var showPhoto = function (idx) {
        var i = ((idx % images.length) + images.length) % images.length;
        var photo = document.getElementById('mainPhoto');
        if (photo) photo.src = images[i];
        if (count) count.textContent = '< ' + (i + 1) + ' / ' + (item.photoCount || images.length);
        return i;
      };
      var galleryIdx = 0;
      thumbs.querySelectorAll('button[data-src]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          galleryIdx = parseInt(btn.getAttribute('data-idx'), 10) - 1;
          showPhoto(galleryIdx);
        });
      });
      var moreBtn = thumbs.querySelector('.more-thumbs');
      if (moreBtn) {
        moreBtn.addEventListener('click', function (e) {
          e.preventDefault();
          galleryIdx = showPhoto(Math.min(4, images.length - 1));
          var main = document.querySelector('.gallery-main');
          if (main) main.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      }
      var viewBtn = document.getElementById('viewGalleryBtn') || document.querySelector('.gallery-btn');
      if (viewBtn && !viewBtn._xltBound) {
        viewBtn._xltBound = true;
        viewBtn.addEventListener('click', function () {
          var main = document.querySelector('.gallery-main');
          if (main) {
            main.scrollIntoView({ behavior: 'smooth', block: 'center' });
            main.classList.add('gallery-focus');
            setTimeout(function () { main.classList.remove('gallery-focus'); }, 1200);
          }
          var photo = document.getElementById('mainPhoto');
          if (photo) {
            try { photo.focus({ preventScroll: true }); } catch (err) { /* ignore */ }
          }
          // Advance one step so the control clearly "opens" the gallery
          galleryIdx = showPhoto(galleryIdx + 1);
        });
      }
    }

    // Description
    var content = document.querySelector('.detail-content');
    if (content && item.description) {
      var descFr = content.querySelector('p[data-fr]');
      var descEn = content.querySelector('p[data-en]');
      if (descFr) descFr.textContent = item.description.fr;
      if (descEn) descEn.textContent = item.description.en;
    }

    // Amenities
    if (item.amenities) {
      var amenHeading = findDetailHeading('Commodités');
      var amenList = amenHeading ? amenHeading.parentElement.querySelector('.amenity-list') : document.querySelector('.amenity-list');
      // First amenity-list after Commodités heading
      if (amenHeading) {
        var el = amenHeading.nextElementSibling;
        while (el && !el.classList.contains('amenity-list')) el = el.nextElementSibling;
        // skip EN h2
        if (!el) {
          el = amenHeading.nextElementSibling;
          while (el && el.tagName === 'H2') el = el.nextElementSibling;
        }
        if (el && el.classList.contains('amenity-list')) amenList = el;
      }
      if (amenList) {
        var html = '';
        var max = Math.max(item.amenities.fr.length, item.amenities.en.length);
        for (var i = 0; i < max; i++) {
          if (item.amenities.fr[i]) html += '<li data-fr>' + item.amenities.fr[i] + '</li>';
          if (item.amenities.en[i]) html += '<li data-en>' + item.amenities.en[i] + '</li>';
        }
        amenList.innerHTML = html;
      }
    }
    toggleDetailSection('Commodités', !!(item.amenities && (item.amenities.fr.length || item.amenities.en.length)));
    var moreLink = document.querySelector('.detail-content .link-more');
    if (moreLink) moreLink.style.display = (item.amenities && item.amenities.fr.length) ? '' : 'none';

    // Property details table
    if (item.details || item.sqft != null) {
      var table = document.querySelector('.detail-table');
      if (table) {
        var unitFr = (item.details && item.details.unitType && item.details.unitType.fr) || item.typeLabel.fr;
        var unitEn = (item.details && item.details.unitType && item.details.unitType.en) || item.typeLabel.en;
        var floor = (item.details && item.details.floor != null) ? item.details.floor : null;
        var year = (item.details && item.details.yearBuilt != null) ? item.details.yearBuilt : null;
        var availFr = (item.availability && item.availability.fr) || (item.status === 'available' ? 'Contactez-nous' : '—');
        var availEn = (item.availability && item.availability.en) || (item.status === 'available' ? 'Contact us' : '—');
        var pillClass = item.status === 'available' ? 'pill-available' : 'pill-rented';
        table.innerHTML =
          '<tr><th data-fr>Type</th><th data-en>Type</th><td data-fr>' + unitFr + '</td><td data-en>' + unitEn + '</td></tr>' +
          (item.sqft != null ? '<tr><th data-fr>Superficie</th><th data-en>Area</th><td data-fr>' + formatSqft(item.sqft, 'fr') + '</td><td data-en>' + formatSqft(item.sqft, 'en') + '</td></tr>' : '') +
          (floor != null ? '<tr><th data-fr>Étage</th><th data-en>Floor</th><td>' + floor + '</td></tr>' : '') +
          (year != null ? '<tr><th data-fr>Année de construction</th><th data-en>Year built</th><td>' + year + '</td></tr>' : '') +
          (showsPrice(item) ? '<tr><th data-fr>Loyer</th><th data-en>Rent</th><td>' + priceHtml(item, unitFrTable(item), unitEnTable(item)) + '</td></tr>' : '') +
          '<tr><th data-fr>Disponibilité</th><th data-en>Availability</th><td data-fr>' + availFr + '</td><td data-en>' + availEn + '</td></tr>' +
          '<tr><th data-fr>Statut</th><th data-en>Status</th><td><span class="pill ' + pillClass + '" data-fr>' + statusLabel(item.status, 'fr') + '</span><span class="pill ' + pillClass + '" data-en>' + statusLabel(item.status, 'en') + '</span></td></tr>';
      }
    }

    // Location address — find Emplacement heading (may be hidden in EN; also find EN sibling)
    var locHeadingFr = findDetailHeading('Emplacement');
    var locHeadingEn = Array.prototype.find.call(document.querySelectorAll('.detail-content h2'), function (h) {
      return h.getAttribute('data-en') === 'Location';
    });
    var addrText = /\bQC\b/.test(item.address) ? item.address : item.address + ', QC';
    function setAddressAfter(heading) {
      if (!heading) return;
      var sib = heading.nextElementSibling;
      // skip sibling EN/FR heading
      while (sib && sib.tagName === 'H2') sib = sib.nextElementSibling;
      if (sib && sib.tagName === 'P') sib.textContent = addrText;
    }
    setAddressAfter(locHeadingFr);
    // If EN heading comes first in DOM flow for address paragraph shared — usually one <p> after both h2s
    if (locHeadingFr) {
      var after = locHeadingFr.nextElementSibling;
      while (after && after.tagName === 'H2') after = after.nextElementSibling;
      if (after && after.tagName === 'P') after.textContent = addrText;
    } else if (locHeadingEn) {
      setAddressAfter(locHeadingEn);
    }

    // Mobile: price line right above the visit CTA (available units only)
    var mcta = document.getElementById('detailMobileCta');
    if (mcta) {
      var mp = mcta.querySelector('.mobile-price');
      if (mp) mp.remove();
      if (showsPrice(item)) {
        mp = document.createElement('div');
        mp.className = 'mobile-price' + (hasPrice(item) ? '' : ' is-ask');
        mp.innerHTML = priceHtml(item);
        mcta.insertBefore(mp, mcta.firstChild);
      }
    }

    // Detail mini-map: single pin for this listing
    var miniMap = document.querySelector('.detail-content .fake-map');
    if (miniMap) {
      miniMap.querySelectorAll('.map-pin').forEach(function (p) { p.remove(); });
      var pin = document.createElement('div');
      pin.className = 'map-pin active ' + (item.status === 'available' ? 'available' : 'rented');
      pin.style.top = '48%';
      pin.style.left = '52%';
      pin.innerHTML = bi(pinLabel(item, 'fr'), pinLabel(item, 'en'));
      miniMap.appendChild(pin);
    }

    // Nearby
    if (item.nearby) {
      var nearHeading = findDetailHeading('Proximité');
      var nearList = null;
      if (nearHeading) {
        var n = nearHeading.nextElementSibling;
        while (n && n.tagName === 'H2') n = n.nextElementSibling;
        if (n && n.classList.contains('amenity-list')) nearList = n;
      }
      if (!nearList) {
        var lists = document.querySelectorAll('.detail-content .amenity-list');
        if (lists.length >= 2) nearList = lists[lists.length - 1];
      }
      if (nearList) {
        var nh = '';
        var nmax = Math.max(item.nearby.fr.length, item.nearby.en.length);
        for (var j = 0; j < nmax; j++) {
          if (item.nearby.fr[j]) nh += '<li data-fr>' + item.nearby.fr[j] + '</li>';
          if (item.nearby.en[j]) nh += '<li data-en>' + item.nearby.en[j] + '</li>';
        }
        nearList.innerHTML = nh;
      }
    }
    toggleDetailSection('Proximité', !!(item.nearby && (item.nearby.fr.length || item.nearby.en.length)));

    // Sidebar
    var sidebar = document.querySelector('.sidebar-card');
    if (sidebar) {
      var priceEl = sidebar.querySelector('.sidebar-price');
      if (priceEl) {
        var unitFr = item.priceUnit === 'sqft' ? 'par pi²' : 'par mois';
        var unitEn = item.priceUnit === 'sqft' ? 'per sq ft' : 'per month';
        priceEl.innerHTML = priceHtml(item, unitFr, unitEn);
        priceEl.classList.toggle('is-ask', !hasPrice(item));
        priceEl.style.display = showsPrice(item) ? '' : 'none';
      }
      var pill = sidebar.querySelector('.pill');
      if (pill) {
        pill.className = 'pill ' + (item.status === 'available' ? 'pill-available' : 'pill-rented');
        pill.style.alignSelf = 'flex-start';
        pill.innerHTML = '<span data-fr>' + statusLabel(item.status, 'fr') + '</span><span data-en>' + statusLabel(item.status, 'en') + '</span>';
      }
      var specs = sidebar.querySelectorAll('.sidebar-specs > div');
      if (specs[0]) {
        var bedStrong = specs[0].querySelector('strong');
        if (bedStrong) {
          if (item.beds != null) {
            bedStrong.textContent = item.beds;
            specs[0].style.display = '';
          } else if (item.sqft != null) {
            bedStrong.textContent = formatSqft(item.sqft, 'fr').replace(' pi²', '');
            var bedLabelFr = specs[0].querySelector('span[data-fr]');
            var bedLabelEn = specs[0].querySelector('span[data-en]');
            if (bedLabelFr) bedLabelFr.textContent = 'pi²';
            if (bedLabelEn) bedLabelEn.textContent = 'sq ft';
            specs[0].style.display = '';
          } else {
            specs[0].style.display = 'none';
          }
        }
      }
      if (specs[1]) {
        if (item.baths != null) {
          specs[1].querySelector('strong').textContent = item.baths;
          specs[1].style.display = '';
        } else {
          // For commercial/office hide baths or show type
          var bathStrong = specs[1].querySelector('strong');
          if (bathStrong && item.specExtra) {
            bathStrong.textContent = '';
            var bFr = specs[1].querySelector('span[data-fr]');
            var bEn = specs[1].querySelector('span[data-en]');
            if (bFr) bFr.textContent = item.specExtra.fr;
            if (bEn) bEn.textContent = item.specExtra.en;
            specs[1].style.display = '';
          } else {
            specs[1].style.display = 'none';
          }
        }
      }
      if (specs[2]) {
        var aFr = specs[2].querySelector('span[data-fr]');
        var aEn = specs[2].querySelector('span[data-en]');
        var sFr = specs[2].querySelector('strong[data-fr]');
        var sEn = specs[2].querySelector('strong[data-en]');
        if (sFr) sFr.textContent = 'Disponibilité';
        if (sEn) sEn.textContent = 'Availability';
        if (item.availability) {
          if (aFr) aFr.textContent = item.availability.fr.toLowerCase();
          if (aEn) aEn.textContent = item.availability.en.toLowerCase();
        } else if (item.status === 'available') {
          if (aFr) aFr.textContent = 'contactez-nous';
          if (aEn) aEn.textContent = 'contact us';
        } else {
          if (aFr) aFr.textContent = 'loué';
          if (aEn) aEn.textContent = 'rented';
        }
      }
      var pageUrl = location.href.split('#')[0];
      var mk = function (subject, body) {
        return 'mailto:gestionxlt@gmail.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      };
      var visitFr = mk('Visite - ' + item.address, 'Bonjour,\n\nJ’aimerais planifier une visite pour : ' + item.address + '\n' + pageUrl + '\n\nMerci,');
      var visitEn = mk('Visit - ' + item.address, 'Hello,\n\nI would like to book a visit for: ' + item.address + '\n' + pageUrl + '\n\nThank you,');
      var appFr = mk('Dossier - ' + item.address, 'Bonjour,\n\nJ’aimerais recevoir le dossier de location pour : ' + item.address + '\n' + pageUrl + '\n\nMerci,');
      var appEn = mk('Application - ' + item.address, 'Hello,\n\nI would like to receive the rental application for: ' + item.address + '\n' + pageUrl + '\n\nThank you,');
      document.querySelectorAll('a.js-visit-mailto').forEach(function (a) {
        a.setAttribute('data-mailto-fr', visitFr); a.setAttribute('data-mailto-en', visitEn);
      });
      document.querySelectorAll('a.js-app-mailto').forEach(function (a) {
        a.setAttribute('data-mailto-fr', appFr); a.setAttribute('data-mailto-en', appEn);
      });
      applyLang(currentLang());
    }

    // Availability note
    var availNote = document.querySelector('.avail-note');
    if (availNote) {
      var nf = availNote.querySelector('span[data-fr]');
      var ne = availNote.querySelector('span[data-en]');
      if (item.availability) {
        if (nf) nf.textContent = 'Date de disponibilité : ' + item.availability.fr;
        if (ne) ne.textContent = 'Available: ' + item.availability.en;
      } else if (item.status === 'available') {
        if (nf) nf.textContent = 'Date de disponibilité : contactez-nous au 514-963-1918';
        if (ne) ne.textContent = 'Availability date: contact us at 514-963-1918';
      } else {
        if (nf) nf.textContent = 'Ce bien est actuellement loué.';
        if (ne) ne.textContent = 'This property is currently rented.';
      }
    }
  }

  /** Shared sort for listings grid + map list. a/b: {id, price, unit, idx} */
  function compareByMode(a, b, mode) {
    if (mode === 'price-asc' || mode === 'price-desc') {
      var ap = a.price != null && a.price !== '' && !isNaN(a.price) && Number(a.price) > 0;
      var bp = b.price != null && b.price !== '' && !isNaN(b.price) && Number(b.price) > 0;
      if (ap !== bp) return ap ? -1 : 1;
      if (!ap && !bp) return a.idx - b.idx;
      // Monthly rents first, then $/sq ft (units are not comparable)
      if (a.unit !== b.unit) {
        if (a.unit === 'month') return -1;
        if (b.unit === 'month') return 1;
      }
      return mode === 'price-asc' ? (a.price - b.price) : (b.price - a.price);
    }
    if (mode === 'newest') {
      // Most recently published on gestionxlt.com first (listedOn), then relevance
      if (a.listed !== b.listed) return a.listed < b.listed ? 1 : -1;
    }
    // relevance: Disponible first, then data order
    var sa = a.status === 'available' ? 0 : 1, sb = b.status === 'available' ? 0 : 1;
    if (sa !== sb) return sa - sb;
    return a.idx - b.idx;
  }

  function sortListings(mode) {
    var grid = document.getElementById('listingsGrid');
    if (!grid) return;
    var orderIndex = {};
    (_listingsCache || []).forEach(function (l, i) { orderIndex[l.id] = i; });
    var keyed = Array.prototype.map.call(grid.querySelectorAll('.prop-card'), function (c) {
      var id = c.getAttribute('data-id') || '';
      return {
        el: c,
        id: id,
        price: c.getAttribute('data-price') === '' ? null : parseFloat(c.getAttribute('data-price')),
        status: c.getAttribute('data-status') || '',
        listed: c.getAttribute('data-listed') || '',
        unit: c.getAttribute('data-price-unit') || '',
        idx: orderIndex.hasOwnProperty(id) ? orderIndex[id] : 999
      };
    });
    keyed.sort(function (a, b) { return compareByMode(a, b, mode); });
    keyed.forEach(function (k) { grid.appendChild(k.el); });
  }

  function bindSort() {
    var sel = document.querySelector('.sort-select');
    if (!sel || sel._xltBound) return;
    sel._xltBound = true;
    sel.addEventListener('change', function () {
      sortListings(sel.value);
    });
  }

  function bindFilterDrawer() {
    var toggle = document.getElementById('filtersToggle');
    var drawer = document.getElementById('filterDrawer');
    var closeBtn = document.getElementById('filtersClose');
    var backdrop = document.getElementById('filterDrawerBackdrop');
    if (!toggle || !drawer) return;
    function setOpen(open) {
      drawer.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.classList.toggle('filter-drawer-open', open);
      if (backdrop) backdrop.hidden = !open;
    }
    if (!toggle._xltBound) {
      toggle._xltBound = true;
      toggle.addEventListener('click', function () {
        setOpen(!drawer.classList.contains('open'));
      });
    }
    if (closeBtn && !closeBtn._xltBound) {
      closeBtn._xltBound = true;
      closeBtn.addEventListener('click', function () { setOpen(false); });
    }
    if (backdrop && !backdrop._xltBound) {
      backdrop._xltBound = true;
      backdrop.addEventListener('click', function () { setOpen(false); });
    }
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('open')) setOpen(false);
    });
  }

  function setListingsView(view, push) {
    var grid = document.getElementById('listingsGrid');
    if (!grid) return;
    var isList = view === 'list';
    grid.classList.toggle('is-summary', isList);
    var g = document.getElementById('viewGallery');
    var l = document.getElementById('viewList');
    if (g) { g.classList.toggle('active', !isList); g.setAttribute('aria-pressed', !isList ? 'true' : 'false'); }
    if (l) { l.classList.toggle('active', isList); l.setAttribute('aria-pressed', isList ? 'true' : 'false'); }
    if (push && window.history && history.replaceState) {
      history.replaceState(null, '', location.pathname + location.search + (isList ? '#list' : ''));
    }
  }

  function bindViewToggle() {
    var g = document.getElementById('viewGallery');
    var l = document.getElementById('viewList');
    if (!document.getElementById('listingsGrid') || !g || !l) return;
    g.addEventListener('click', function (e) { e.preventDefault(); setListingsView('gallery', true); });
    l.addEventListener('click', function (e) { e.preventDefault(); setListingsView('list', true); });
    window.addEventListener('hashchange', function () {
      setListingsView(location.hash === '#list' ? 'list' : 'gallery', false);
    });
    setListingsView(location.hash === '#list' ? 'list' : 'gallery', false);
    // NEW-06: keep Summary (#list) across filter submits
    var form = document.querySelector('form.filter-search');
    if (form && !form._xltViewBound) {
      form._xltViewBound = true;
      form.addEventListener('submit', function (e) {
        var inList = location.hash === '#list' ||
          (document.getElementById('listingsGrid') && document.getElementById('listingsGrid').classList.contains('is-summary'));
        if (!inList) {
          form.setAttribute('action', 'listings.html');
          return;
        }
        e.preventDefault();
        var params = new URLSearchParams();
        Array.prototype.forEach.call(form.elements, function (el) {
          if (!el.name || el.disabled) return;
          if ((el.type === 'checkbox' || el.type === 'radio') && !el.checked) return;
          if (el.tagName === 'BUTTON') return;
          if (el.value) params.set(el.name, el.value);
        });
        var qs = params.toString();
        location.href = 'listings.html' + (qs ? '?' + qs : '') + '#list';
      });
    }
  }

  /** Keep every visible filter option meaningful for the data (never an option that yields 0). */
  function bindOptionPruning(listings) {
    var home = document.querySelector('form.search-card');
    if (home) {
      var homeTab = function () {
        var t = home.querySelector('select[name="type"]');
        if (t && t.value) return {};
        var a = home.querySelector('.search-tab.active');
        return a ? { type: normalizeType(a.getAttribute('data-tab')) } : {};
      };
      var runHome = function () { pruneFormOptions(home, listings, homeTab); };
      home.addEventListener('change', runHome);
      home.querySelectorAll('.search-tab').forEach(function (t) { t.addEventListener('click', runHome); });
      runHome();
    }
    var lf = document.querySelector('form.filter-search');
    if (lf) {
      lf.addEventListener('change', function (e) { pruneFormOptions(lf, listings, null, e.target); });
      pruneFormOptions(lf, listings, null, 'all');
    }
    var mf = document.getElementById('mapFilterForm');
    if (mf) {
      var runM = function () { pruneFormOptions(mf, listings, null, 'all'); };
      mf.addEventListener('change', function (e) { pruneFormOptions(mf, listings, null, e.target); });
      var tog = document.getElementById('mapFiltersToggle');
      if (tog) tog.addEventListener('click', function () { setTimeout(function () { runM(); updateMapApplyLabel(); }, 0); });
      runM();
    }
  }

  // Heart buttons on static content
  bindHearts(document);
  bindFilters();
  bindSort();
  bindFilterDrawer();
  bindViewToggle();
  bindMapControls();
  updateFilterBadge(getFilterState());

  fetch(DATA_URL)
    .then(function (r) {
      if (!r.ok) throw new Error('listings.json ' + r.status);
      return r.json();
    })
    .then(function (data) {
      var listings = data.listings || [];
      window.XLT = { data: data, listings: listings };
      _caps = computeCaps(listings);
      sanitizeUrl();
      updateFilterBadge(getFilterState());
      renderListingsPage(listings);
      renderFeatured(listings);
      renderMapPage(listings);
      renderDetail(listings);
      bindOptionPruning(listings);
      // Re-apply option translations after any dynamic HTML
      applyLang(currentLang());
    })
    .catch(function (err) {
      console.warn('Gestion XLT: could not load listings.json', err);
    });
})();
