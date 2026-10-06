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

  function currentLang() {
    return localStorage.getItem('xlt-lang') || 'fr';
  }

  function statusLabel(status, lang) {
    if (status === 'available') return lang === 'en' ? 'Available' : 'Disponible';
    return lang === 'en' ? 'Rented' : 'Loué';
  }

  function priceParts(item, lang) {
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
    if (item.beds != null) parts.push('<span>' + item.beds + ' ch.</span>');
    if (item.baths != null) parts.push('<span>' + item.baths + ' sdb</span>');
    if (item.sqft != null) parts.push('<span>' + formatSqft(item.sqft, 'fr') + '</span>');
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
      '<a href="' + href + '" class="prop-card" data-status="' + item.status + '" data-type="' + item.type + '" data-id="' + item.id + '" data-city="' + (item.city || '') + '" data-price="' + item.price + '" data-price-unit="' + item.priceUnit + '" data-avail="' + ((item.availability && item.availability.fr) || '') + '">' +
        '<div class="prop-media">' +
          '<img src="' + item.image + '" alt="" loading="lazy" />' +
          '<span class="pill ' + pillClass + '" data-fr>' + statusLabel(item.status, 'fr') + '</span>' +
          '<span class="pill ' + pillClass + '" data-en>' + statusLabel(item.status, 'en') + '</span>' +
          '<button type="button" class="prop-heart" aria-label="Favori">' + heartSvg() + '</button>' +
          '<span class="prop-count">1 / ' + (item.photoCount || 1) + '</span>' +
        '</div>' +
        '<div class="prop-body">' +
          '<div class="prop-price">' + p.main + ' <span data-fr>' + priceParts(item, 'fr').unit + '</span><span data-en>' + priceParts(item, 'en').unit + '</span></div>' +
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
    if (item.beds != null) specs.push('<span>' + item.beds + ' ch.</span>', '<span>·</span>');
    if (item.baths != null) specs.push('<span>' + item.baths + ' sdb</span>');
    if (item.beds == null && item.sqft != null) specs.push('<span>' + formatSqft(item.sqft, 'fr') + '</span>');
    var near = '';
    if (item.near) {
      near = '<div style="font-size:11px;color:var(--text-light);margin-top:2px;" data-fr>' + item.near.fr + '</div>' +
             '<div style="font-size:11px;color:var(--text-light);margin-top:2px;" data-en>' + item.near.en + '</div>';
    }
    return (
      '<a href="' + href + '" class="prop-card-h" data-status="' + item.status + '" data-type="' + item.type + '">' +
        '<div class="prop-media">' +
          '<img src="' + item.image.replace('w=800', 'w=400').replace('q=80', 'q=70') + '" alt="" />' +
          '<span class="pill ' + pillClass + '" data-fr>' + statusLabel(item.status, 'fr') + '</span>' +
          '<span class="pill ' + pillClass + '" data-en>' + statusLabel(item.status, 'en') + '</span>' +
        '</div>' +
        '<div class="prop-body">' +
          '<div class="prop-price">' + p.main + ' <span data-fr>' + priceParts(item, 'fr').unit + '</span><span data-en>' + priceParts(item, 'en').unit + '</span></div>' +
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
    if (item.priceUnit === 'sqft') return false;
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

  function getFilterState() {
    var params = new URLSearchParams(location.search);
    return {
      type: normalizeType(params.get('type')),
      loc: params.get('loc') || '',
      price: params.get('price') || '',
      status: normalizeStatus(params.get('status')),
      avail: params.get('avail') || ''
    };
  }

  function listingMatches(item, state) {
    if (state.type && !matchesType(item, state.type)) return false;
    if (state.status && item.status !== state.status) return false;
    if (!matchesLoc(item, state.loc)) return false;
    if (!matchesPrice(item, state.price)) return false;
    if (!matchesAvail(item, state.avail)) return false;
    return true;
  }

  function applyListingFilters(listings, chipFilter) {
    var state = getFilterState();
    var cards = document.querySelectorAll('#listingsGrid .prop-card');
    var visible = 0;
    cards.forEach(function (card) {
      var id = card.getAttribute('data-id');
      var item = listings.find(function (l) { return l.id === id; });
      var show = true;
      if (item) {
        show = listingMatches(item, state);
      } else {
        // fallback to data attrs
        var status = card.getAttribute('data-status');
        var type = card.getAttribute('data-type');
        if (state.status && status !== state.status) show = false;
        if (state.type === 'res' && type !== 'res') show = false;
        if (state.type === 'off' && type !== 'off') show = false;
        if (state.type === 'com' && type !== 'com' && type !== 'off') show = false;
      }
      // Chip overlay (quick filters) — further narrow
      if (show && chipFilter && chipFilter !== 'all') {
        var cStatus = card.getAttribute('data-status');
        var cType = card.getAttribute('data-type');
        if (chipFilter === 'available' || chipFilter === 'rented') {
          show = cStatus === chipFilter;
        } else if (chipFilter === 'res') {
          show = cType === 'res';
        } else if (chipFilter === 'com') {
          show = cType === 'com' || cType === 'off';
        }
      }
      card.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    updateVisibleCount(visible);
    updateCounts(listings);
    return visible;
  }

  function updateVisibleCount(n) {
    var meta = document.querySelector('.results-meta strong[data-fr]');
    var metaEn = document.querySelector('.results-meta strong[data-en]');
    if (meta) meta.textContent = n + ' propriété' + (n === 1 ? '' : 's') + ' trouvée' + (n === 1 ? '' : 's');
    if (metaEn) metaEn.textContent = n + ' propert' + (n === 1 ? 'y' : 'ies') + ' found';
  }

  // Back-compat for chip handlers
  var _listingsCache = [];
  var _activeChip = 'all';

  function filterCards(filter) {
    _activeChip = filter || 'all';
    applyListingFilters(_listingsCache, _activeChip);
  }

  function bindFilters() {
    document.querySelectorAll('.chip[data-filter]').forEach(function (chip) {
      if (chip._xltBound) return;
      chip._xltBound = true;
      chip.addEventListener('click', function () {
        var f = chip.getAttribute('data-filter');
        document.querySelectorAll('.chip[data-filter]').forEach(function (c) { c.classList.remove('active'); });
        document.querySelectorAll('.chip[data-filter="' + f + '"]').forEach(function (c) { c.classList.add('active'); });
        if (['all', 'available', 'rented'].indexOf(f) >= 0) {
          document.querySelectorAll('#statusTabs button').forEach(function (b) {
            b.classList.toggle('active', b.getAttribute('data-filter') === f);
          });
        }
        filterCards(f);
      });
    });
    document.querySelectorAll('#statusTabs button').forEach(function (btn) {
      if (btn._xltBound) return;
      btn._xltBound = true;
      btn.addEventListener('click', function () {
        var f = btn.getAttribute('data-filter');
        document.querySelectorAll('#statusTabs button').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        document.querySelectorAll('.chip[data-filter]').forEach(function (c) {
          c.classList.toggle('active', c.getAttribute('data-filter') === f);
        });
        filterCards(f);
      });
    });
  }

  function syncFilterForm(state) {
    var form = document.querySelector('form.filter-search');
    if (!form) return;
    var locSel = form.querySelector('select[name="loc"]');
    var typeSel = form.querySelector('select[name="type"]');
    var statusSel = form.querySelector('select[name="status"]');
    var availSel = form.querySelector('select[name="avail"]');
    if (locSel && state.loc) {
      Array.prototype.forEach.call(locSel.options, function (o) {
        if (o.value === state.loc || o.textContent === state.loc) o.selected = true;
      });
    }
    if (typeSel && state.type) {
      // Map normalized back to form values (res/com/off)
      typeSel.value = state.type;
    }
    if (statusSel && state.status) {
      statusSel.value = state.status === 'available' ? 'open' : state.status;
    }
    if (availSel && state.avail) {
      Array.prototype.forEach.call(availSel.options, function (o) {
        if (o.value === state.avail || o.textContent === state.avail ||
            (o.getAttribute('data-fr') === state.avail) ||
            (o.getAttribute('data-en') && o.getAttribute('data-en').toLowerCase() === state.avail.toLowerCase())) {
          o.selected = true;
        }
      });
    }
  }

  function highlightChipsFromState(state) {
    if (state.type === 'res') {
      document.querySelectorAll('.chip[data-filter]').forEach(function (c) {
        c.classList.toggle('active', c.getAttribute('data-filter') === 'res');
      });
      _activeChip = 'res';
    } else if (state.type === 'com') {
      document.querySelectorAll('.chip[data-filter]').forEach(function (c) {
        c.classList.toggle('active', c.getAttribute('data-filter') === 'com');
      });
      _activeChip = 'com';
    } else if (state.type === 'off') {
      // no dedicated chip; leave all
      _activeChip = 'all';
    }
    if (state.status === 'available' || state.status === 'rented') {
      document.querySelectorAll('.chip[data-filter]').forEach(function (c) {
        c.classList.toggle('active', c.getAttribute('data-filter') === state.status);
      });
      document.querySelectorAll('#statusTabs button').forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-filter') === state.status);
      });
      _activeChip = state.status;
    }
  }

  function updateCounts(listings) {
    var state = getFilterState();
    // Tab counts ignore status (tabs ARE status) but honor loc/type/price/avail + type chips
    var baseState = {
      type: state.type,
      loc: state.loc,
      price: state.price,
      avail: state.avail,
      status: ''
    };
    var base = listings.filter(function (l) { return listingMatches(l, baseState); });
    var chip = _activeChip;
    if (chip === 'res' || chip === 'com') {
      base = base.filter(function (l) {
        if (chip === 'res') return l.type === 'res';
        return l.type === 'com' || l.type === 'off';
      });
    }
    var all = base.length;
    var avail = base.filter(function (l) { return l.status === 'available'; }).length;
    var rented = base.filter(function (l) { return l.status === 'rented'; }).length;
    var tabs = document.getElementById('statusTabs');
    if (tabs) {
      var btns = tabs.querySelectorAll('button');
      if (btns[0]) btns[0].innerHTML = '<span data-fr>Toutes (' + all + ')</span><span data-en>All (' + all + ')</span>';
      if (btns[1]) btns[1].innerHTML = '<span data-fr>Disponibles (' + avail + ')</span><span data-en>Available (' + avail + ')</span>';
      if (btns[2]) btns[2].innerHTML = '<span data-fr>Louées (' + rented + ')</span><span data-en>Rented (' + rented + ')</span>';
      applyLang(currentLang());
    }
    updateFilterBadge(state);
  }

  function updateFilterBadge(state) {
    state = state || getFilterState();
    var n = 0;
    if (state.loc) n++;
    if (state.type) n++;
    if (state.status) n++;
    if (state.avail) n++;
    if (state.price) n++;
    var badge = document.getElementById('filterCount');
    if (!badge) return;
    if (n > 0) {
      badge.hidden = false;
      badge.textContent = String(n);
    } else {
      badge.hidden = true;
      badge.textContent = '';
    }
  }

  function renderListingsPage(listings) {
    var grid = document.getElementById('listingsGrid');
    if (!grid) return;
    _listingsCache = listings;
    grid.innerHTML = listings.map(cardHtml).join('');
    updateCounts(listings);
    bindHearts(grid);
    bindFilters();
    var state = getFilterState();
    syncFilterForm(state);
    highlightChipsFromState(state);
    // Apply URL filters; chip further narrows only if set to non-all without conflicting URL
    var chip = _activeChip;
    // If URL has type/status, prefer those as primary; chip "all" unless highlighted
    if (state.type || state.status || state.loc || state.price || state.avail) {
      // Don't double-apply type via chip if URL already has type
      if (state.type && (chip === 'res' || chip === 'com')) chip = 'all';
      if (state.status && (chip === 'available' || chip === 'rented')) chip = 'all';
    }
    applyListingFilters(listings, chip);
  }

  function renderFeatured(listings) {
    var grid = document.querySelector('.featured-grid');
    if (!grid) return;
    var featured = listings.filter(function (l) { return l.featured; }).slice(0, 3);
    if (!featured.length) featured = listings.slice(0, 3);
    grid.innerHTML = featured.map(cardHtml).join('');
    bindHearts(grid);
  }

  function renderMapPage(listings) {
    var body = document.querySelector('.map-list-body');
    if (body) {
      body.innerHTML = listings.slice(0, 6).map(mapCardHtml).join('');
    }
    var headPFr = document.querySelector('.map-list-head p[data-fr]');
    var headPEn = document.querySelector('.map-list-head p[data-en]');
    if (headPFr) headPFr.textContent = listings.length + ' locations trouvées';
    if (headPEn) headPEn.textContent = listings.length + ' rentals found';
    // Only render pins on the full map page, not detail mini-maps
    var fakeMap = document.querySelector('.map-page .fake-map, .map-layout .fake-map');
    if (!fakeMap) {
      // map.html structure: look for main map container
      fakeMap = document.querySelector('.map-canvas .fake-map, #mapCanvas .fake-map');
    }
    if (!fakeMap) {
      var allMaps = document.querySelectorAll('.fake-map');
      // Prefer the largest / map-page one; skip detail mini-map (inside .detail-content)
      allMaps.forEach(function (m) {
        if (!m.closest('.detail-content') && !m.closest('.detail-layout')) fakeMap = m;
      });
    }
    if (fakeMap && !fakeMap.closest('.detail-content') && !fakeMap.closest('.detail-layout')) {
      fakeMap.querySelectorAll('.map-pin').forEach(function (p) { p.remove(); });
      listings.forEach(function (item, i) {
        var m = item.map || { top: (30 + i * 5) + '%', left: (35 + i * 4) + '%' };
        var el;
        if (item.status === 'rented' || m.rented) {
          el = document.createElement('span');
          el.className = 'map-pin rented';
          el.setAttribute('data-fr', '');
          el.textContent = 'Loué';
          var el2 = document.createElement('span');
          el2.className = 'map-pin rented';
          el2.setAttribute('data-en', '');
          el2.textContent = 'Rented';
          el2.style.top = m.top;
          el2.style.left = m.left;
          fakeMap.appendChild(el2);
        } else {
          el = document.createElement('a');
          el.href = 'detail.html?id=' + encodeURIComponent(item.id);
          el.className = 'map-pin' + (i === 0 ? ' active' : '');
          var p = priceParts(item, 'fr');
          el.textContent = item.priceUnit === 'sqft' ? (item.price + ' $/pi²') : (p.main);
        }
        el.style.top = m.top;
        el.style.left = m.left;
        fakeMap.appendChild(el);
      });
    }
  }

  function findDetailHeading(frText) {
    return Array.prototype.find.call(document.querySelectorAll('.detail-content h2'), function (h) {
      return h.getAttribute('data-fr') === frText || h.textContent.trim() === frText;
    });
  }

  function renderDetail(listings) {
    if (!document.querySelector('.detail-layout')) return;
    var params = new URLSearchParams(location.search);
    var id = params.get('id') || 'xlt-001';
    var item = listings.find(function (l) { return l.id === id; }) || listings[0];
    if (!item) return;

    var lang = currentLang();
    document.title = (item.title[lang] || item.title.fr) + ' — Gestion XLT';

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
      thumbs.innerHTML = thumbImgs.map(function (src, idx) {
        return '<button type="button" data-src="' + src + '" data-idx="' + (idx + 1) + '"><img src="' + src.replace('w=1400', 'w=300').replace('q=80', 'q=70') + '" alt="" /></button>';
      }).join('') + (more > 0
        ? '<a href="#" class="more-thumbs"><img src="' + (images[Math.min(4, images.length - 1)]).replace('w=1400', 'w=300').replace('q=80', 'q=70') + '" alt="" /><span class="more-overlay">+ ' + more + '</span></a>'
        : '');
      thumbs.querySelectorAll('button[data-src]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          document.getElementById('mainPhoto').src = btn.getAttribute('data-src');
          if (count) count.textContent = '< ' + btn.getAttribute('data-idx') + ' / ' + (item.photoCount || images.length);
        });
      });
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

    // Property details table
    if (item.details || item.sqft != null) {
      var table = document.querySelector('.detail-table');
      if (table) {
        var unitFr = (item.details && item.details.unitType && item.details.unitType.fr) || item.typeLabel.fr;
        var unitEn = (item.details && item.details.unitType && item.details.unitType.en) || item.typeLabel.en;
        var floor = (item.details && item.details.floor != null) ? item.details.floor : '—';
        var availFr = (item.availability && item.availability.fr) || (item.status === 'available' ? 'Immédiate' : '—');
        var availEn = (item.availability && item.availability.en) || (item.status === 'available' ? 'Immediate' : '—');
        var pillClass = item.status === 'available' ? 'pill-available' : 'pill-rented';
        table.innerHTML =
          '<tr><th data-fr>Type</th><th data-en>Type</th><td data-fr>' + unitFr + '</td><td data-en>' + unitEn + '</td></tr>' +
          '<tr><th data-fr>Superficie</th><th data-en>Area</th><td data-fr>' + formatSqft(item.sqft || 0, 'fr') + '</td><td data-en>' + formatSqft(item.sqft || 0, 'en') + '</td></tr>' +
          '<tr><th data-fr>Étage</th><th data-en>Floor</th><td>' + floor + '</td></tr>' +
          '<tr><th data-fr>Disponibilité</th><th data-en>Availability</th><td data-fr>' + availFr + '</td><td data-en>' + availEn + '</td></tr>' +
          '<tr><th data-fr>Statut</th><th data-en>Status</th><td><span class="pill ' + pillClass + '" data-fr>' + statusLabel(item.status, 'fr') + '</span><span class="pill ' + pillClass + '" data-en>' + statusLabel(item.status, 'en') + '</span></td></tr>';
      }
    }

    // Location address — find Emplacement heading (may be hidden in EN; also find EN sibling)
    var locHeadingFr = findDetailHeading('Emplacement');
    var locHeadingEn = Array.prototype.find.call(document.querySelectorAll('.detail-content h2'), function (h) {
      return h.getAttribute('data-en') === 'Location';
    });
    var addrText = item.address + (item.address.indexOf('(QC)') >= 0 ? '' : ' (QC)');
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

    // Detail mini-map: single pin for this listing
    var miniMap = document.querySelector('.detail-content .fake-map');
    if (miniMap) {
      miniMap.querySelectorAll('.map-pin').forEach(function (p) { p.remove(); });
      var pin = document.createElement('div');
      pin.className = 'map-pin active';
      pin.style.top = '48%';
      pin.style.left = '52%';
      var pp = priceParts(item, 'fr');
      pin.textContent = item.priceUnit === 'sqft' ? (item.price + ' $/pi²') : pp.main;
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

    // Sidebar
    var sidebar = document.querySelector('.sidebar-card');
    if (sidebar) {
      var priceEl = sidebar.querySelector('.sidebar-price');
      if (priceEl) {
        var p = priceParts(item, lang);
        var unitFr = item.priceUnit === 'sqft' ? 'par pi²' : 'par mois';
        var unitEn = item.priceUnit === 'sqft' ? 'per sq ft' : 'per month';
        priceEl.innerHTML = p.main + ' <span data-fr>' + unitFr + '</span><span data-en>' + unitEn + '</span>';
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
          }
        }
      }
      if (specs[2] && item.availability) {
        var aFr = specs[2].querySelector('span[data-fr]');
        var aEn = specs[2].querySelector('span[data-en]');
        if (aFr) aFr.textContent = item.availability.fr.toLowerCase();
        if (aEn) aEn.textContent = item.availability.en.toLowerCase();
      }
      var mailVisit = sidebar.querySelector('a.btn-primary');
      var mailApp = sidebar.querySelector('a.btn-outline');
      var subj = encodeURIComponent(item.address);
      if (mailVisit) mailVisit.href = 'mailto:gestionxlt@gmail.com?subject=Visite%20-%20' + subj;
      if (mailApp) mailApp.href = 'mailto:gestionxlt@gmail.com?subject=Dossier%20-%20' + subj;
    }

    // Availability note
    var availNote = document.querySelector('.avail-note');
    if (availNote && item.availability) {
      var nf = availNote.querySelector('span[data-fr]');
      var ne = availNote.querySelector('span[data-en]');
      if (nf) nf.textContent = 'Date de disponibilité : ' + item.availability.fr;
      if (ne) ne.textContent = 'Available: ' + item.availability.en;
    }
  }

  function sortListings(mode) {
    var grid = document.getElementById('listingsGrid');
    if (!grid) return;
    var cards = Array.prototype.slice.call(grid.querySelectorAll('.prop-card'));
    var orderIndex = {};
    (_listingsCache || []).forEach(function (l, i) { orderIndex[l.id] = i; });
    cards.sort(function (a, b) {
      var ida = a.getAttribute('data-id') || '';
      var idb = b.getAttribute('data-id') || '';
      var pa = parseFloat(a.getAttribute('data-price')) || 0;
      var pb = parseFloat(b.getAttribute('data-price')) || 0;
      var ua = a.getAttribute('data-price-unit') || '';
      var ub = b.getAttribute('data-price-unit') || '';
      // Keep sqft and monthly somewhat comparable by sorting within unit groups first for price modes
      if (mode === 'price-asc' || mode === 'price-desc') {
        if (ua !== ub) {
          // monthly first, then sqft
          if (ua === 'month' && ub !== 'month') return -1;
          if (ub === 'month' && ua !== 'month') return 1;
        }
        return mode === 'price-asc' ? (pa - pb) : (pb - pa);
      }
      if (mode === 'newest') {
        return idb.localeCompare(ida, undefined, { numeric: true });
      }
      // relevance: original JSON order
      var ia = orderIndex.hasOwnProperty(ida) ? orderIndex[ida] : 999;
      var ib = orderIndex.hasOwnProperty(idb) ? orderIndex[idb] : 999;
      return ia - ib;
    });
    cards.forEach(function (c) { grid.appendChild(c); });
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

  // Heart buttons on static content
  bindHearts(document);
  bindFilters();
  bindSort();
  bindFilterDrawer();
  updateFilterBadge(getFilterState());

  fetch(DATA_URL)
    .then(function (r) {
      if (!r.ok) throw new Error('listings.json ' + r.status);
      return r.json();
    })
    .then(function (data) {
      var listings = data.listings || [];
      window.XLT = { data: data, listings: listings };
      renderListingsPage(listings);
      renderFeatured(listings);
      renderMapPage(listings);
      renderDetail(listings);
      // Re-apply option translations after any dynamic HTML
      applyLang(currentLang());
    })
    .catch(function (err) {
      console.warn('Gestion XLT: could not load listings.json', err);
    });
})();
