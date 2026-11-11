# 📋 Suivi de Projet — Monétisation & Transformation SaaS (« Noël en Famille »)

> **Objectif du document** : Feuille de route opérationnelle, ordonnancement des tâches avec leurs prérequis stricts (diagramme de Gantt & chemin critique), stratégie de monétisation validée et suivi d'avancement pour transformer le MVP familial en un produit SaaS distribuable et rentable.

---

## 1. Orientation Stratégique & Modèle Économique Validés

### 🎯 Positionnement Produit
- **Court terme (Saisonnalité forte Nov–Déc)** : Lancement sous l'identité **Noël en Famille**, ultra-simple, chaleureux et mobile-first.
- **Moyen terme (Revenus lissés sur 12 mois)** : Architecture **Multi-Événements** permettant d'utiliser la même plateforme toute l'année pour les **Anniversaires**, **Listes de naissance**, **Mariages / PACS**, **Crémaillères** et **Départs en retraite**.
- **Canal de distribution** : **100 % WebApp SaaS + PWA (Progressive Web App)**.
  - Accès instantané en 1 clic depuis WhatsApp/SMS (zéro téléchargement requis sur un store pour la famille).
  - Installable sur l'écran d'accueil iOS/Android.
  - **0 % de commission Apple / Google** (contre 15 % à 30 % sur les achats intégrés App Store / Play Store).

### 💰 Stratégie de Monétisation Hybride (« Affiliation First » + Freemium par Crédits / Pass)

> **Principe directeur validé** : Ne **jamais** brider trop bas le nombre de cadeaux dans l'offre gratuite. Chaque souhait ajouté avec un lien marchand est une source de commission d'affiliation (3 % à 8 % du panier total acheté par le proche). Le quota gratuit doit donc encourager l'ajout de liens, tandis que le paiement (Crédits ou Abonnement) monétise la **taille du groupe**, le **multi-événements** et les **fonctionnalités avancées**.

| Offre | Tarif | Quotas & Fonctionnalités incluses | Objectif business |
| :--- | :--- | :--- | :--- |
| **1. Offre Gratuite (« Tribu Découverte »)** | **0 €** | • **1 événement actif** (ex. Noël 2026)<br>• Jusqu'à **7 membres** dans la famille<br>• Jusqu'à **12 cadeaux par membre** (*jusqu'à 84 liens affiliés par famille !*)<br>• **Auto-remplissage magique par URL** inclus (incite à coller des liens marchands)<br>• Protection Anti-Spoiler stricte côté serveur | Acquisition virale maximale via WhatsApp + **Monétisation passive par affiliation e-commerce** sur 100 % des familles. |
| **2. Pass Événement (« Crédit Unitaire »)** | **4,99 € TTC** *(achat unique)*<br>ou **9,99 €** *(Pack 3 Crédits)* | • Débloque **1 événement complet** sans limite de durée<br>• **Membres illimités** (grandes familles, cousins, amis)<br>• **Cadeaux illimités** par membre<br>• 🎲 **Tirage au sort Secret Santa** (avec règles d'exclusion entre conjoints)<br>• 🤝 **Mode Cadeau Commun / Cagnotte indicative** (participer à plusieurs)<br>• 🛡️ **Contrôles avancés par membre** (visibilité croisée `hidden_member_ids`, droit d'ajout `can_add_gifts`) | Monétiser les grandes familles à Noël sans leur imposer un abonnement récurrent qu'elles résilieraient en janvier. |
| **3. Abonnement (« Pass Famille Annuel »)** | **9,99 € / an** *(ou 14,99 € / an)* | • **Événements illimités toute l'année** (Noël, tous les anniversaires, fête des mères/pères)<br>• Toutes les fonctionnalités Pro incluses sur chaque événement<br>• **Thèmes visuels débloqués** (Noël, Anniversaire festif, Naissance pastel, Mariage doré)<br>• Historique des cadeaux offerts d'une année sur l'autre (pour éviter d'offrir 2 fois la même chose) | Fidélisation annuelle (ARR) et réutilisation de la base utilisateurs entre janvier et octobre. |

---

## 2. Diagramme de Gantt & Chemin Critique (Ordonnancement & Prérequis)

Le planning ci-dessous représente environ **20 à 24 jours-homme** répartis en 5 lots (Lot 0 à Lot 4). Les flèches de dépendance reposent sur les identifiants de tâches (`T0_1`, `T1_1`, etc.).

```mermaid
gantt
    title Roadmap de Transformation SaaS & Monétisation (Jours-Homme)
    dateFormat  YYYY-MM-DD
    axisFormat  %d/%m
    excludes    weekends

    section Lot 0 : Prérequis & Légal
    T0.1 Structure juridique, Domaine & Comptes (Stripe, Cloudflare) :T0_1, 2026-11-12, 2d
    T0.2 CGU/CGV, Mentions Légales & Conformité RGPD/Affiliation     :T0_2, after T0_1, 2d
    T0.3 Candidatures Programmes Affiliation (Amazon, Awin, Effinity):T0_3, after T1_5, 5d

    section Lot 1 : Socle Multi-Tenant & Sécurité (P0)
    T1.1 Schéma SQL Multi-Tenant (events, quotas, profils)           :crit, T1_1, 2026-11-12, 2d
    T1.2 Auth Hybride (Supabase Auth Organisateur + Tokens 128-bit)  :crit, T1_2, after T1_1, 2d
    T1.3 Sécurité Serveur : RPC Anti-Spoiler & Isolation RLS stricte :crit, T1_3, after T1_2, 2d
    T1.4 Migration Photos Base64 vers Supabase Storage (WebP/JPEG)   :T1_4, after T1_1, 1d
    T1.5 Routage SPA (/e/:slug) & Mise en ligne Landing V1           :crit, T1_5, after T1_3, 2d

    section Lot 2 : Moteur Affiliation & Auto-Fill (P0)
    T2.1 Edge Function Scraping URL (OpenGraph / JSON-LD auto-fill)  :crit, T2_1, after T1_3, 2d
    T2.2 Réécriture Affiliée & Redirecteur (/go/:giftId)             :crit, T2_2, after T2_1, 2d
    T2.3 Intégration UI Modale Cadeau ("Coller un lien = Auto-fill") :T2_3, after T2_1, 1d

    section Lot 3 : Freemium, Crédits & Stripe (P1)
    T3.1 Triggers SQL Quotas (7 membres / 12 cadeaux en Free)        :crit, T3_1, after T1_3, 1d
    T3.2 Edge Functions Stripe Checkout & Webhook Crédits/Pass       :crit, T3_2, after T3_1, 2d
    T3.3 UI Paywall doux, Jauge Quotas & Achat Crédits               :T3_3, after T3_2, 2d
    T3.4 Fonctionnalités Pro (Secret Santa & Cadeau Commun)          :T3_4, after T3_1, 3d

    section Lot 4 : PWA, Thèmes Annuels & Viralité (P1/P2)
    T4.1 Système de Thèmes CSS Multi-Saisons (Noël, Anniv, Naissance):T4_1, after T1_5, 2d
    T4.2 Packaging PWA (manifest.json, Service Worker, Icônes)       :T4_2, after T1_5, 1d
    T4.3 Boucle Virale WhatsApp (Web Share API + OpenGraph dynamique):T4_3, after T4_2, 1d
    T4.4 Analytics Privacy-First (Plausible/PostHog) & Monitoring    :T4_4, after T2_2, 1d
```

---

## 3. Matrice Détaillée des Tâches & Prérequis (« Task Breakdown »)

### Légende des priorités
- 🔴 **P0 (Bloquant Lancement)** : Indispensable pour ouvrir le service au public en sécurité et encaisser les premières commissions d'affiliation.
- 🟠 **P1 (Monétisation Directe & Rétention)** : Nécessaire pour vendre des Crédits/Pass via Stripe et convertir les grandes familles.
- 🟢 **P2 (Expansion Toute l'Année & Croissance)** : Permet de prolonger l'usage après Noël (anniversaires, naissances) et d'optimiser la viralité.

---

### Lot 0 — Prérequis Administratifs, Juridiques & Partenariats
*Effort estimé : 2 à 3 jours-homme (hors délais de validation par les régies d'affiliation).*

| ID | Tâche | Prérequis stricts | Effort | Priorité | Statut | Livrables / Critères de validation |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| **T0.1** | **Ouverture des comptes & Nom de domaine** | Aucun | 0,5 j | 🔴 P0 | `[ ]` | • Statut juridique actif (ex. Micro-entreprise) avec SIRET<br>• Nom de domaine acheté (ex. `.fr` / `.com`) relié à Cloudflare<br>• Compte **Stripe** activé et vérifié (KYC)<br>• Projet **Supabase** de production créé (région EU-West) |
| **T0.2** | **Rédaction Mentions Légales, CGU/CGV & RGPD** | `T0.1` | 1,5 j | 🔴 P0 | `[ ]` | • Page Mentions Légales & Politique de Confidentialité<br>• CGV pour la vente de Crédits / Abonnement (droit de rétractation contenu numérique)<br>• Mention obligatoire dans le footer : *« En tant que Partenaire Amazon, nous réalisons un bénéfice sur les achats remplissant les conditions requises »* |
| **T0.3** | **Inscription aux régies d'affiliation e-commerce** | `T0.2` + `T1.5` *(Site public en ligne obligatoire pour validation)* | 1 j *(+ 3 à 5j d'attente)* | 🔴 P0 | `[ ]` | • **Amazon Partenaires** (FR) : ID `votretag-21`<br>• **Awin** : adhésion aux programmes Fnac, Darty, Cultura, Nature & Découvertes<br>• **Effinity / Kwanko** : Decathlon, Cdiscount, Maison du Monde, Boulanger |

---

### Lot 1 — Architecture Multi-Tenant, Sécurité SQL & Stockage (Cœur SaaS)
*Effort estimé : 7 à 9 jours-homme. C'est le socle technique obligatoire pour accueillir plusieurs familles sans fuite de données.*

| ID | Tâche | Prérequis stricts | Effort | Priorité | Statut | Livrables / Critères de validation |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| **T1.1** | **Refonte du schéma SQL en Multi-Tenant (`events`)** | `T0.1` | 2 j | 🔴 P0 | `[ ]` | • Création des tables `organizer_profiles` et `events` dans [sql/schema.sql](sql/schema.sql)<br>• Ajout de `event_id` sur `public.members` et `public.gifts`<br>• Conservation des colonnes `can_add_gifts` et `hidden_member_ids` par membre |
| **T1.2** | **Authentification Hybride (Organisateur + Invités)** | `T1.1` | 2 j | 🔴 P0 | `[ ]` | • **Organisateur** : Connexion via Supabase Auth (Google OAuth / Magic Link Email) pour gérer ses événements et ses crédits<br>• **Invités** : Maintien du lien magique sans mot de passe (`?token=...`), mais remplacement de `generateToken` dans [js/db.js](js/db.js#L430-L443) par un jeton cryptographique de 128 bits |
| **T1.3** | **Anti-Spoiler Serveur (RPC) & Isolation RLS stricte** | `T1.1`, `T1.2` | 2 j | 🔴 P0 | `[ ]` | • Suppression des politiques `USING (true)` sur `anon` dans [sql/schema.sql](sql/schema.sql#L58-L96)<br>• Création des fonctions RPC PostgreSQL (`SECURITY DEFINER`) qui filtrent par `event_id`, appliquent `hidden_member_ids`, et forcent `reserved_by_id = NULL` côté serveur pour les cadeaux appartenant à l'appelant (aucune fuite dans l'onglet Réseau du navigateur) |
| **T1.4** | **Migration des images Base64 vers Supabase Storage** | `T1.1` | 1 j | 🔴 P0 | `[ ]` | • Création d'un bucket public `gift-images` sur Supabase Storage<br>• Adaptation de `compressImageFile` dans [js/db.js](js/db.js#L1063-L1080) pour envoyer un fichier binaire WebP/JPEG (~80 Ko) et stocker uniquement l'URL CDN dans `gifts.image_url` |
| **T1.5** | **Routage Multi-Événements & Landing Page V1** | `T1.2`, `T1.3` | 2 j | 🔴 P0 | `[ ]` | • Séparation entre la Landing Page publique (`/`) et l'espace d'un événement (`/e/:slug?token=...`) dans [index.html](index.html) et [js/app.js](js/app.js)<br>• Suppression du formulaire technique `form-supabase-config` visible dans l'interface Admin |

---

### Lot 2 — Moteur d'Affiliation & Expérience « Auto-Fill » par URL
*Effort estimé : 4 à 5 jours-homme. Transforme chaque lien collé en revenu potentiel tout en offrant un effet « waouh » à l'utilisateur.*

| ID | Tâche | Prérequis stricts | Effort | Priorité | Statut | Livrables / Critères de validation |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| **T2.1** | **Edge Function d'extraction de métadonnées (`parse-product-url`)** | `T1.3` | 2 j | 🔴 P0 | `[ ]` | • Supabase Edge Function qui récupère en < 1,5 s le titre, l'image (`og:image`), le prix (`product:price:amount` / JSON-LD) et le marchand à partir d'une URL collée<br>• Gestion des timeouts et fallback gracieux si le site marchand bloque le scraping (ex. saisie manuelle conservée) |
| **T2.2** | **Moteur de réécriture affiliée & Redirecteur (`/go/:giftId`)** | `T2.1`, `T0.3` *(peut tourner sans tags en attendant `T0.3`)* | 2 j | 🔴 P0 | `[ ]` | • Fonction serveur qui injecte automatiquement les tags affiliés (`?tag=...` pour Amazon, DeepLink Awin/Effinity pour Fnac, Cultura, Decathlon, etc.)<br>• Endpoint de redirection `/go/:giftId` permettant de comptabiliser les clics sortants et de mettre à jour les identifiants affiliés rétroactivement sur les cadeaux déjà créés |
| **T2.3** | **Refonte de la modale « Ajouter un souhait » (URL-First)** | `T2.1` | 1 j | 🔴 P0 | `[ ]` | • Dans `openGiftModal` ([js/app.js](js/app.js#L1311-L1360)), placer le champ **« Coller le lien du produit » en tout premier** avec un bouton *« ✨ Remplir automatiquement »*<br>• Pré-remplissage instantané du titre, du prix et de l'aperçu photo |

---

### Lot 3 — Monétisation Freemium (Quotas, Crédits, Stripe & Fonctions Pro)
*Effort estimé : 6 à 8 jours-homme.*

| ID | Tâche | Prérequis stricts | Effort | Priorité | Statut | Livrables / Critères de validation |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| **T3.1** | **Application des Quotas en Base de Données (Triggers SQL)** | `T1.3` | 1 j | 🟠 P1 | `[ ]` | • Trigger PostgreSQL `BEFORE INSERT` sur `members` et `gifts` vérifiant les limites du plan de l'événement :<br>  - Plan `free` : max **7 membres** / max **12 cadeaux par membre**<br>  - Plan `pro_event` ou `annual_pass` : illimité |
| **T3.2** | **Intégration Stripe Checkout & Webhooks (`stripe-webhook`)** | `T0.1`, `T3.1` | 2 j | 🟠 P1 | `[ ]` | • Edge Function `create-checkout-session` supportant l'achat à l'acte (1 Crédit Événement = 4,99 €, 3 Crédits = 9,99 €) et l'Abonnement Annuel (9,99 €/an)<br>• Edge Function `stripe-webhook` vérifiant la signature cryptographique Stripe et débloquant instantanément l'événement ou le solde de crédits |
| **T3.3** | **Interface Utilisateur Freemium (Jauges & Modale Pro)** | `T3.2` | 2 j | 🟠 P1 | `[ ]` | • Affichage discret du quota restant dans l'onglet *Ma Liste* (`8 / 12 souhaits gratuits`) et *Admin* (`6 / 7 membres gratuits`)<br>• Modale de mise à niveau claire et festive permettant d'utiliser 1 Crédit ou de payer via Apple Pay / Google Pay / CB (Stripe Checkout) |
| **T3.4** | **Fonctionnalités « Aimants à Conversion » (Secret Santa & Cadeau Commun)** | `T3.1` | 3 j | 🟠 P1 | `[ ]` | • **Tirage Secret Santa** : Algorithme de tirage au sort avec contraintes d'exclusion (ex. conjoints) + affichage secret du destinataire attitré à chaque membre<br>• **Mode Cadeau Commun** : Possibilité pour plusieurs membres de cocher *« Je participe (ex. 30 €) »* sur un cadeau onéreux sans spoiler le propriétaire |

---

### Lot 4 — Distribution PWA, Thèmes Toute l'Année & Boucle Virale
*Effort estimé : 4 à 5 jours-homme.*

| ID | Tâche | Prérequis stricts | Effort | Priorité | Statut | Livrables / Critères de validation |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| **T4.1** | **Système de Thèmes Multi-Événements (Noël + Toute l'année)** | `T1.5` | 2 j | 🟢 P2 | `[ ]` | • Extraction des couleurs de [css/styles.css](css/styles.css) et [index.html](index.html) en variables CSS pilotées par `data-theme`<br>• 4 thèmes prêts : `christmas` (Sapin/Framboise/Or), `birthday` (Indigo/Corail/Ambre), `birth` (Sauge/Terracotta doux), `wedding` (Ivoire/Champagne/Anthracite) |
| **T4.2** | **Packaging PWA (Installation mobile sans App Store)** | `T1.5` | 1 j | 🟠 P1 | `[ ]` | • Fichier `manifest.json`, icônes multi-tailles et Service Worker (`sw.js`)<br>• Bannière d'aide à l'installation sur iOS Safari et Android Chrome (*« Ajouter à l'écran d'accueil »*) |
| **T4.3** | **Partage Viral Natif WhatsApp (`navigator.share`)** | `T4.2` | 1 j | 🟠 P1 | `[ ]` | • Remplacement de la simple copie presse-papiers dans [js/app.js](js/app.js#L53-L72) par le tiroir de partage natif mobile sur smartphone<br>• Message pré-formaté engageant avec lien magique direct |
| **T4.4** | **Analytics Privacy-First & Suivi des Conversions** | `T2.2`, `T3.2` | 1 j | 🟢 P2 | `[ ]` | • Intégration d'un outil sans bannière cookie intrusive (Plausible ou PostHog EU Cloud)<br>• Suivi des métriques clés : *Événements créés*, *Ratio cadeaux avec URL*, *Clics affiliés sortants*, *Conversion Free → Pro* |

---

## 4. Budget Infrastructure & Paliers de Rentabilité

### Coûts Fixes d'Infrastructure (Architecture Serverless)

| Composant | Palier Lancement (0 à 500 familles) | Palier Croissance (500 à 10 000 familles) | Rôle |
| :--- | :---: | :---: | :--- |
| **Nom de domaine** (`.fr` / `.com`) | ~1,00 € / mois *(12 €/an)* | ~1,00 € / mois | Identité de marque & validation affiliation |
| **Cloudflare Pages & CDN** | **0 € / mois** | **0 € / mois** *(bande passante illimitée)* | Hébergement ultra-rapide du front-end statique & PWA |
| **Supabase (PostgreSQL + Auth + Storage + Edge Functions)** | **0 € / mois** *(Plan Free : 500 Mo BDD, 1 Go Storage)* | **25 $ / mois** *(Plan Pro : 8 Go BDD, 100 Go Storage, backups quotidiens)* | Base de données, sécurité RLS/RPC, stockage photos et fonctions serveur |
| **Resend (Emails transactionnels)** | **0 € / mois** *(jusqu'à 3 000 emails/mois)* | **20 $ / mois** *(jusqu'à 50 000 emails/mois)* | Envoi du lien d'administration et factures/confirmations |
| **Stripe** | **0 € fixe** *(1,5 % + 0,25 € par vente)* | **0 € fixe** *(1,5 % + 0,25 € par vente)* | Encaissement des Crédits Événement & Abonnements |
| **TOTAL INFRASTRUCTURE** | **~1 € / mois** | **~45 € / mois** | **Seuil de rentabilité atteint dès ~10 Pass vendus ou ~30 cadeaux affiliés/mois** |

### Simulation du Potentiel de Revenus (Pour 1 000 familles actives à Noël)
- **Hypothèses prudentes** :
  - 1 000 familles × 6 membres = **6 000 utilisateurs actifs**.
  - Chaque membre ajoute en moyenne **6 cadeaux** (grâce au quota gratuit généreux de 12 cadeaux/membre) = **36 000 cadeaux listés**.
  - **60 % des cadeaux** contiennent un lien marchand (grâce à l'auto-remplissage magique par URL) = **21 600 liens affiliés**.
  - **50 % de ces cadeaux** sont effectivement achetés via le lien par les proches, avec un panier moyen de **45 €** et une commission moyenne de **4,5 %** :
    $$\text{Revenu Affiliation} = 10\,800 \text{ achats} \times 45\text{ €} \times 4,5\% \approx 21\,870\text{ €}$$
  - **Conversion Freemium (Crédits / Pass Annuel)** : 5 % des 1 000 familles débloquent un Pass Événement à 4,99 € ou un Pass Annuel à 9,99 € (panier moyen 6,50 €) :
    $$\text{Revenu Freemium Stripe} = 50 \text{ familles} \times 6,50\text{ €} \approx 325\text{ €}$$
- **Conclusion** : C'est bien **l'affiliation e-commerce** (boostée par la gratuité jusqu'à 12 cadeaux/membre et l'auto-remplissage d'URL) qui génère l'essentiel du chiffre d'affaires à Noël, tandis que les **Crédits / Abonnements** couvrent immédiatement 100 % des frais d'infrastructure et monétisent l'usage hors-Noël ou les très grands groupes.
