const i18n = {
  en: {
    brand: 'XLT Property Management',
    tag: 'Lease your ideal space',
    sub: 'Commercial, retail, residential & land across Greater Montreal.',
    all: 'All statuses', available: 'Available', not_available: 'Not available',
    allTypes: 'All types', allCities: 'All cities', search: 'Search address…',
    contact: 'Contact', pricing: 'Contact for pricing', details: 'Details',
    close: 'Close', area: 'Area insights', listings: 'Listings',
    demo: 'Demo data — availability seeded for UX testing.',
    phone: 'Phone', email: 'Email', address: 'Office', hours: 'Hours',
    size: 'Size', year: 'Year built', transit: 'Transit', features: 'Features', unit: 'Unit',
    none: 'No listings match your filters.'
  },
  fr: {
    brand: 'Gestion immobilière XLT',
    tag: 'Louez l’espace idéal',
    sub: 'Commercial, détail, résidentiel et terrains dans le Grand Montréal.',
    all: 'Tous les statuts', available: 'Disponible', not_available: 'Non disponible',
    allTypes: 'Tous les types', allCities: 'Toutes les villes', search: 'Rechercher une adresse…',
    contact: 'Contact', pricing: 'Contacter pour le prix', details: 'Détails',
    close: 'Fermer', area: 'Aperçu du secteur', listings: 'Annonces',
    demo: 'Données démo — disponibilités pour tester les filtres.',
    phone: 'Téléphone', email: 'Courriel', address: 'Bureau', hours: 'Heures',
    size: 'Superficie', year: 'Année', transit: 'Transport', features: 'Caractéristiques', unit: 'Local',
    none: 'Aucune annonce ne correspond à vos filtres.'
  }
};

let data = {listings:[], contact:{}};
let lang = localStorage.getItem('xlt-lang') || 'fr';

const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => [...el.querySelectorAll(s)];

function t(k){ return i18n[lang][k] || k; }
function statusLabel(s){ return s === 'available' ? t('available') : t('not_available'); }

function applyI18n(){
  $$('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  $$('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
  $('#langBtn').textContent = lang === 'fr' ? 'EN' : 'FR';
  document.documentElement.lang = lang;
}

function filtered(){
  const st = $('#fStatus').value;
  const ty = $('#fType').value;
  const city = $('#fCity').value;
  const q = ($('#fSearch').value || '').toLowerCase().trim();
  return data.listings.filter(l => {
    if (st !== 'all' && l.status !== st) return false;
    if (ty !== 'all' && l.type !== ty) return false;
    if (city !== 'all' && l.city !== city) return false;
    if (q && !(l.address + ' ' + (l.unit||'') + ' ' + l.city).toLowerCase().includes(q)) return false;
    return true;
  });
}

function render(){
  const list = filtered();
  const grid = $('#grid');
  if (!list.length){ grid.innerHTML = `<p class="meta">${t('none')}</p>`; return; }
  grid.innerHTML = list.map(l => `
    <article class="card">
      <div><span class="badge ${l.status==='available'?'ok':'no'}">${statusLabel(l.status)}</span></div>
      <h3>${l.address}${l.unit?` · #${l.unit}`:''}</h3>
      <div class="meta">${l.city} · ${l.type}${l.size_sqft?` · ${l.size_sqft} sqft`:''}</div>
      <div class="meta">${t('pricing')}</div>
      <div class="actions"><button data-id="${l.id}">${t('details')}</button></div>
    </article>`).join('');
  $$('button[data-id]').forEach(btn => btn.onclick = () => openDetail(btn.dataset.id));
}

function openDetail(id){
  const l = data.listings.find(x => x.id === id);
  if (!l) return;
  const d = $('#detail');
  $('#detailBody').innerHTML = `
    <h2>${l.address}${l.unit?` · #${l.unit}`:''}</h2>
    <p><span class="badge ${l.status==='available'?'ok':'no'}">${statusLabel(l.status)}</span></p>
    <div class="row"><b>${t('address')}:</b> ${l.city}</div>
    ${l.unit?`<div class="row"><b>${t('unit')}:</b> ${l.unit}</div>`:''}
    <div class="row"><b>Type:</b> ${l.type}</div>
    ${l.size_sqft?`<div class="row"><b>${t('size')}:</b> ${l.size_sqft} sqft</div>`:''}
    ${l.year_built?`<div class="row"><b>${t('year')}:</b> ${l.year_built}</div>`:''}
    <div class="row"><b>${t('transit')}:</b> ${l.transit||'—'}</div>
    <div class="row"><b>${t('features')}:</b> ${(l.features||[]).join(', ')||'—'}</div>
    <div class="row"><b>${t('pricing')}</b></div>
    <p class="row">${data.contact.phone} · ${data.contact.email}</p>
    <button id="closeDlg">${t('close')}</button>`;
  d.showModal();
  $('#closeDlg').onclick = () => d.close();
}

function fillCities(){
  const cities = [...new Set(data.listings.map(l => l.city))].sort();
  $('#fCity').innerHTML = `<option value="all">${t('allCities')}</option>` + cities.map(c=>`<option value="${c}">${c}</option>`).join('');
}

async function init(){
  data = await fetch('data/listings.json').then(r => r.json());
  applyI18n();
  fillCities();
  ['fStatus','fType','fCity','fSearch'].forEach(id => $('#'+id).addEventListener('input', render));
  $('#langBtn').onclick = () => { lang = lang==='fr'?'en':'fr'; localStorage.setItem('xlt-lang', lang); applyI18n(); fillCities(); render(); };
  const c = data.contact;
  $('#contactBox').innerHTML = `<div><b data-i18n="phone"></b>: <a href="tel:${c.phone}">${c.phone}</a></div>
    <div><b data-i18n="email"></b>: <a href="mailto:${c.email}">${c.email}</a></div>
    <div><b data-i18n="address"></b>: ${c.address}</div>
    <div><b data-i18n="hours"></b>: ${c.hours}</div>`;
  applyI18n();
  render();
}
document.addEventListener('DOMContentLoaded', init);
