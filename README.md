# 🎄 Noël en Famille 2026 — Liste de Cadeaux & Réservations

Une WebApp familiale légère, **Mobile-First**, sans mot de passe et **100 % gratuite à héberger**, conçue pour gérer les listes de souhaits de Noël pour 5 à 6 adultes.

Architecture pragmatique type *Static SPA + Serverless Postgres* :
- **Frontend** : HTML5 / CSS3 / Vanilla JS (ES Modules) — zéro étape de build, déployable tel quel sur GitHub Pages.
- **Backend / BDD** : **Supabase** (PostgreSQL managé gratuit) interrogé directement via `@supabase/supabase-js` ou mode **Démo local (`localStorage`)** automatique.

---

## ✨ Fonctionnalités clés

- **📱 Mobile-First & UX festive** : Interface pensée pour être utilisée facilement depuis un smartphone (WhatsApp / SMS) comme sur ordinateur.
- **🔗 Accès par Lien Magique (`?token=...`)** : Pas de compte à créer ni de mot de passe à retenir. Chaque membre reçoit son lien personnel (ex. `https://.../cadeaux_noel_2026/?token=marie-noel-2026`). Un sélecteur d'identité de secours reste disponible si l'on ouvre l'URL racine.
- **🕵️ Règle Anti-Spoiler STRICTE (même pour l'Admin)** :
  - **Sur sa propre liste** : **Personne** (pas même l'administrateur) ne peut voir si ses propres cadeaux sont réservés ni par qui. L'effet de surprise au pied du sapin est garanti à 100 %.
  - **Sur la liste des autres** : Chacun voit en temps réel si un cadeau est **Disponible**, **Réservé par moi** (avec bouton pour annuler) ou **Réservé par `<Prénom>`**.
- **⚠️ Avertissement anti-gaffe à la suppression** : Si un membre souhaite supprimer un cadeau de sa propre liste, une modale d'avertissement explicite lui rappelle qu'un proche l'a peut-être déjà réservé ou acheté (sans révéler s'il est réservé ou non !).
- **🖼️ Photos par Upload ou URL** : Ajout d'image par simple lien web ou par import de photo depuis le téléphone/PC (redimensionnement et compression automatique côté client en JPEG Data URL pour tenir directement en base sans bucket S3 externe).
- **🔍 Filtres & Recherche rapide** : Filtrage des cadeaux d'un proche (*Tous*, *Disponibles*, *Réservés par moi*) et tri par prix ou date.
- **👑 Panneau Admin intégré** : L'administrateur peut ajouter/modifier des membres de la famille et copier en un clic leurs liens magiques prêts à être partagés sur WhatsApp.
- **🧪 Mode Démo intégré** : Si Supabase n'est pas encore configuré, l'application démarre immédiatement avec un jeu de données fictif persisté dans `localStorage`.

---

## 🚀 Étape 1 : Tester en local en 10 secondes (Mode Démo)

Aucun outil ni base de données n'est requis pour tester l'application immédiatement :

```bash
cd /mnt/DATA/6.dev/cadeaux_noel_2026
python3 -m http.server 8000
```

Ouvrez ensuite [http://localhost:8000](http://localhost:8000) dans votre navigateur.

- En l'absence d'identifiants Supabase dans [js/config.js](js/config.js), la bannière **Mode Démo** s'affiche en haut de l'écran.
- Vous pouvez basculer d'un membre à l'autre pour vérifier la règle **Anti-Spoiler**, ajouter des cadeaux, importer une photo, réserver des cadeaux et tester l'interface **Admin**.

---

## 🗄️ Étape 2 : Connecter Supabase gratuitement (5 minutes)

1. **Créer un projet gratuit** sur [https://supabase.com](https://supabase.com) (région conseillée : *West EU - Paris* ou *Central EU - Frankfurt*).
2. **Initialiser le schéma SQL** :
   - Dans le menu latéral Supabase, ouvrez **SQL Editor** → **New query**.
   - Copiez-collez le contenu du fichier [sql/schema.sql](sql/schema.sql) et cliquez sur **Run**.
   - Cela crée les tables `members` et `gifts`, la contrainte empêchant l'auto-réservation, les index, les politiques RLS et insère les membres initiaux.
3. **Récupérer les clés API** :
   - Allez dans **Project Settings** (icône engrenage) → **API**.
   - Copiez l'**URL du projet** (`Project URL`) et la clé publique **`anon` / `public`** (`Project API Keys`).
   - *(Note : la clé `anon` est conçue pour être publique dans un front-end statique avec RLS activé).*
4. **Renseigner la configuration** dans [js/config.js](js/config.js) :
   ```javascript
   export const SUPABASE_CONFIG = {
     url: "https://votre-projet.supabase.co",
     anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   };
   ```
5. Rechargez votre page : l'application est maintenant connectée en temps réel à votre base PostgreSQL Supabase !

---

## 🌐 Étape 3 : Héberger gratuitement sur GitHub Pages

1. Créez un dépôt GitHub (public ou privé avec GitHub Pages activé) et poussez le code :
   ```bash
   git init
   git add .
   git commit -m "feat: initial commit Noël en Famille 2026"
   git branch -M main
   git remote add origin git@github.com:<votre-user>/cadeaux_noel_2026.git
   git push -u origin main
   ```
2. Dans votre dépôt GitHub, allez dans **Settings** → **Pages** :
   - Sous **Build and deployment** → **Source**, sélectionnez **GitHub Actions**.
   - Le workflow [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml) déploiera automatiquement le site à chaque `git push` sur `main`.
3. Une fois déployé, connectez-vous avec votre lien Admin, ouvrez l'onglet **Admin**, personnalisez les membres de votre famille et cliquez sur **Copier le lien** pour envoyer son lien magique à chaque participant !

### 🔄 Optionnel : Activer le Keep-Alive Supabase (Anti-Pause)

Les projets Supabase gratuits se mettent en pause après 7 jours sans activité. Pour garantir que la base reste active pendant toute la période de novembre à janvier même si personne ne consulte le site pendant une semaine :

1. Le workflow [.github/workflows/supabase-keepalive.yml](.github/workflows/supabase-keepalive.yml) est déjà prêt et s'exécute automatiquement tous les 5 jours (`0 8 */5 * *`).
2. Dans votre dépôt GitHub, allez dans **Settings** → **Secrets and variables** → **Actions** → **New repository secret** et ajoutez :
   - `SUPABASE_URL` : l'URL de votre projet Supabase
   - `SUPABASE_ANON_KEY` : votre clé `anon` publique Supabase

---

## 📁 Structure du projet

```text
.
├── index.html                              # Point d'entrée SPA Mobile-First
├── css/
│   └── styles.css                          # Thème de Noël moderne & responsive
├── js/
│   ├── config.js                           # Configuration Supabase (URL + Anon Key)
│   ├── db.js                               # Couche d'accès aux données (Supabase + fallback localStorage)
│   └── app.js                              # Logique UI, Anti-Spoiler, modales et filtres
├── sql/
│   └── schema.sql                          # Schéma PostgreSQL complet + RLS + Seed initial
└── .github/
    └── workflows/
        ├── deploy-pages.yml                # Déploiement continu vers GitHub Pages
        └── supabase-keepalive.yml          # Cron tous les 5 jours pour garder Supabase actif
```
