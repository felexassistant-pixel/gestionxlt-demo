# Gestion XLT — Aperçu / Preview

Portail de locations (Grand Montréal) — design Centris/Airbnb approuvé.  
**Aperçu public :** https://felexassistant-pixel.github.io/gestionxlt-demo/

> Location uniquement · Contact : **514-963-1918** · **gestionxlt@gmail.com**  
> DNS / Squarespace (`www.gestionxlt.com`) **non touchés** — ce dépôt est un preview GitHub Pages.

## Pages

| Fichier | Rôle |
|---------|------|
| `index.html` | Accueil — recherche + catégories + vedettes |
| `listings.html` | Galerie — filtres Disponible / Loué |
| `detail.html` | Fiche propriété (`?id=xlt-001`) |
| `map.html` | Liste + carte (mobile : Liste \| Carte) |
| `data/listings.json` | **Source unique** des annonces |
| `styles.css` / `app.js` | Design system + i18n FR/EN |

## Modifier les annonces

1. Éditez `data/listings.json` (ajouter / retirer / changer `status`: `available` \| `rented`).
2. Committez et poussez sur `main` — Pages se redéploie automatiquement.
3. Les pages rechargent la grille / vedettes / carte / détail depuis ce JSON.

Champs utiles par item : `id`, `status`, `type` (`res`\|`com`\|`off`), `title`, `address`, `price`, `priceUnit` (`month`\|`sqft`), `beds`, `baths`, `sqft`, `image`, `featured`, `map`.

## Local

```bash
cd /workspace/gestionxlt-site
python3 -m http.server 8765
```

Ouvrir http://localhost:8765/

## FR / EN

Bouton FR\|EN dans l’en-tête (persisté en `localStorage`).

## Déploiement

GitHub Pages via `.github/workflows/pages.yml` sur la branche `main`.  
URL : https://felexassistant-pixel.github.io/gestionxlt-demo/
