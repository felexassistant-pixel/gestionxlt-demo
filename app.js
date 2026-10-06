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

  // —— Search tabs (home) ——
  document.querySelectorAll('.search-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.search-tab').forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
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

  function formatSqft(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' pi²';
  }

  function heartSvg() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>';
  }

  function specsHtml(item, lang) {
    var parts = [];
    if (item.beds != null) parts.push('<span>' + item.beds + ' ch.</span>');
    if (item.baths != null) parts.push('<span>' + item.baths + ' sdb</span>');
    if (item.sqft != null) parts.push('<span>' + formatSqft(item.sqft) + '</span>');
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
      '<a href="' + href + '" class="prop-card" data-status="' + item.status + '" data-type="' + item.type + '" data-id="' + item.id + '">' +
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
    if (item.beds == null && item.sqft != null) specs.push('<span>' + formatSqft(item.sqft) + '</span>');
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

  function filterCards(filter) {
    var cards = document.querySelectorAll('#listingsGrid .prop-card');
    cards.forEach(function (card) {
      var status = card.getAttribute('data-status');
      var type = card.getAttribute('data-type');
      var show = filter === 'all' ||
        filter === status ||
        (filter === 'res' && type === 'res') ||
        (filter === 'com' && (type === 'com' || type === 'off'));
      card.style.display = show ? '' : 'none';
    });
  }

  function bindFilters() {
    document.querySelectorAll('.chip[data-filter]').forEach(function (chip) {
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

  function updateCounts(listings) {
    var all = listings.length;
    var avail = listings.filter(function (l) { return l.status === 'available'; }).length;
    var rented = listings.filter(function (l) { return l.status === 'rented'; }).length;
    var tabs = document.getElementById('statusTabs');
    if (tabs) {
      var btns = tabs.querySelectorAll('button');
      if (btns[0]) btns[0].innerHTML = '<span data-fr>Toutes (' + all + ')</span><span data-en>All (' + all + ')</span>';
      if (btns[1]) btns[1].innerHTML = '<span data-fr>Disponibles (' + avail + ')</span><span data-en>Available (' + avail + ')</span>';
      if (btns[2]) btns[2].innerHTML = '<span data-fr>Louées (' + rented + ')</span><span data-en>Rented (' + rented + ')</span>';
    }
    var meta = document.querySelector('.results-meta strong[data-fr]');
    var metaEn = document.querySelector('.results-meta strong[data-en]');
    if (meta) meta.textContent = all + ' propriétés trouvées';
    if (metaEn) metaEn.textContent = all + ' properties found';
  }

  function renderListingsPage(listings) {
    var grid = document.getElementById('listingsGrid');
    if (!grid) return;
    grid.innerHTML = listings.map(cardHtml).join('');
    updateCounts(listings);
    bindHearts(grid);
    bindFilters();
    // URL type filter
    var params = new URLSearchParams(location.search);
    var type = params.get('type');
    if (type === 'residential') filterCards('res');
    else if (type === 'commercial') filterCards('com');
    else if (type === 'office') {
      document.querySelectorAll('#listingsGrid .prop-card').forEach(function (card) {
        card.style.display = card.getAttribute('data-type') === 'off' ? '' : 'none';
      });
    }
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
    var fakeMap = document.querySelector('.fake-map');
    if (fakeMap) {
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
      // re-append zoom/disclaimer if they were after pins — they stay as siblings, OK
    }
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
    var images = item.images || [item.image];
    if (mainPhoto) mainPhoto.src = images[0];
    mainPhoto && mainPhoto.setAttribute('alt', item.title.fr);

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
      var more = Math.max(0, (item.photoCount || images.length) - 4);
      thumbs.innerHTML = thumbImgs.map(function (src) {
        return '<button type="button" data-src="' + src + '"><img src="' + src.replace('w=1400', 'w=300').replace('q=80', 'q=70') + '" alt="" /></button>';
      }).join('') + (more > 0
        ? '<a href="#" class="more-thumbs"><img src="' + (images[4] || images[0]).replace('w=1400', 'w=300').replace('q=80', 'q=70') + '" alt="" /><span class="more-overlay">+ ' + more + '</span></a>'
        : '');
      thumbs.querySelectorAll('button[data-src]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          document.getElementById('mainPhoto').src = btn.getAttribute('data-src');
        });
      });
    }

    var content = document.querySelector('.detail-content');
    if (content && item.description) {
      var descFr = content.querySelector('p[data-fr]');
      var descEn = content.querySelector('p[data-en]');
      if (descFr) descFr.textContent = item.description.fr;
      if (descEn) descEn.textContent = item.description.en;
    }

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
      if (specs[0] && item.beds != null) {
        specs[0].querySelector('strong').textContent = item.beds;
      }
      if (specs[1] && item.baths != null) {
        specs[1].querySelector('strong').textContent = item.baths;
      }
      var mailVisit = sidebar.querySelector('a.btn-primary');
      var mailApp = sidebar.querySelector('a.btn-outline');
      var subj = encodeURIComponent(item.address);
      if (mailVisit) mailVisit.href = 'mailto:gestionxlt@gmail.com?subject=Visite%20-%20' + subj;
      if (mailApp) mailApp.href = 'mailto:gestionxlt@gmail.com?subject=Dossier%20-%20' + subj;
    }

    // Update phone CTA stays as-is
    var locP = document.querySelector('.detail-content h2[data-fr="Emplacement"], .detail-content h2');
    // Address under location
    var locHeading = Array.prototype.find.call(document.querySelectorAll('.detail-content h2[data-fr]'), function (h) {
      return h.getAttribute('data-fr') === 'Emplacement';
    });
    if (locHeading && locHeading.nextElementSibling && locHeading.nextElementSibling.tagName === 'P') {
      locHeading.nextElementSibling.textContent = item.address + (item.address.indexOf('(QC)') >= 0 ? '' : ' (QC)');
    }
  }

  // Heart buttons on static content
  bindHearts(document);
  bindFilters();

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
    })
    .catch(function (err) {
      console.warn('Gestion XLT: could not load listings.json', err);
      // Static HTML cards remain as fallback where present
    });
})();
