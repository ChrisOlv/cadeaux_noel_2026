/**
 * Application Principale - Liste de Cadeaux de Noël en Famille 2026
 * Gère l'interface Mobile-First, l'authentification par lien magique (?token=...),
 * les filtres Anti-Spoiler, les souhaits, les réservations et l'espace Admin.
 */
(function () {
  'use strict';

  const AUTH_TOKEN_STORAGE_KEY = 'noel_auth_token';

  const state = {
    mode: 'demo',
    members: [],
    gifts: [],
    currentUser: null,
    activeTab: 'family', // 'family' | 'mylist' | 'mypurchases' | 'admin'
    memberFilter: 'all', // 'all' | member.id
    statusFilter: 'all', // 'all' | 'available' | 'reserved' | 'reserved_by_me'
    searchQuery: '',
    imageInputMode: 'url', // 'url' | 'upload'
    uploadedImageDataUrl: '',
    pendingDeleteGift: null
  };

  // ===========================================================================
  // UTILITAIRES D'INTERFACE & FORMATAGE
  // ===========================================================================

  function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatPrice(price) {
    if (price === null || price === undefined || price === '') return null;
    const num = Number(price);
    if (Number.isNaN(num)) return null;
    return num % 1 === 0
      ? `${num.toFixed(0)} €`
      : `${num.toFixed(2).replace('.', ',')} €`;
  }

  function buildMagicLink(token) {
    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    return `${baseUrl}?token=${encodeURIComponent(token)}`;
  }

  async function copyToClipboard(text, successMessage = 'Lien copié dans le presse-papiers !') {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      showToast(successMessage, 'success');
    } catch (err) {
      console.error('Erreur copie presse-papiers:', err);
      showToast('Impossible de copier automatiquement : ' + text, 'error');
    }
  }

  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const colors = {
      success: 'bg-pine-900 text-white border-gold-400/40',
      error: 'bg-cranberry-600 text-white border-white/20',
      warning: 'bg-amber-600 text-white border-white/20',
      info: 'bg-pine-800 text-white border-white/15'
    };

    const icons = {
      success: '✨',
      error: '⚠️',
      warning: '🔔',
      info: '🎄'
    };

    const toast = document.createElement('div');
    toast.className = `toast-enter pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-2xl border shadow-xl text-xs sm:text-sm font-semibold ${colors[type] || colors.info}`;
    toast.innerHTML = `
      <span class="text-base shrink-0">${icons[type] || '🎄'}</span>
      <span class="flex-1 leading-snug">${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-8px)';
      toast.style.transition = 'all 0.2s ease';
      setTimeout(() => toast.remove(), 220);
    }, 3400);
  }

  // ===========================================================================
  // INITIALISATION & AUTHENTIFICATION PAR LIEN MAGIQUE (?token=...)
  // ===========================================================================

  async function initApp() {
    const loadingEl = document.getElementById('app-loading');
    try {
      state.mode = await window.GiftDB.init();
      await refreshDataAndAuthenticate();
    } catch (err) {
      console.error('Erreur initialisation:', err);
      showToast(err.message || 'Erreur lors du chargement des données.', 'error');
    } finally {
      if (loadingEl) loadingEl.classList.add('hidden');
    }
  }

  async function refreshDataAndAuthenticate() {
    state.mode = window.GiftDB.getMode();
    state.members = await window.GiftDB.getMembers();

    // 1. Lire ?token=... depuis l'URL ou depuis localStorage
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    const savedToken = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    const candidateToken = (urlToken || savedToken || '').trim();

    let resolvedMember = null;
    if (candidateToken) {
      try {
        resolvedMember = await window.GiftDB.getMemberByToken(candidateToken);
      } catch (e) {
        console.warn('Impossible de vérifier le token:', e);
      }
    }

    // En mode Démo, si aucun token n'est fourni à la première visite,
    // sélectionner le premier membre (Chris Admin) pour offrir un aperçu immédiat
    // tout en laissant la bannière de changement rapide en haut !
    if (!resolvedMember && !urlToken && state.mode === 'demo' && state.members.length > 0) {
      resolvedMember = state.members[0];
    }

    if (resolvedMember) {
      await setAuthenticatedUser(resolvedMember, Boolean(urlToken));
    } else {
      state.currentUser = null;
      state.gifts = [];
      renderQuickSwitchBanner();
      renderAuthScreen();
    }
  }

  async function setAuthenticatedUser(member, updateUrl = false) {
    state.currentUser = member;
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, member.token);

    if (updateUrl) {
      const cleanUrl = `${window.location.pathname}?token=${encodeURIComponent(member.token)}`;
      window.history.replaceState({}, '', cleanUrl);
    }

    state.gifts = await window.GiftDB.getGifts(member.id);

    // Si l'utilisateur n'est pas admin et était sur l'onglet admin, revenir sur 'family'
    if (state.activeTab === 'admin' && !member.is_admin) {
      state.activeTab = 'family';
    }

    renderAll();
  }

  async function reloadGiftsAndMembers() {
    state.members = await window.GiftDB.getMembers();
    if (state.currentUser) {
      const updatedMe = state.members.find((m) => String(m.id) === String(state.currentUser.id));
      if (updatedMe) {
        state.currentUser = updatedMe;
        localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, updatedMe.token);
      }
      state.gifts = await window.GiftDB.getGifts(state.currentUser.id);
    }
    renderAll();
  }

  // ===========================================================================
  // RENDU GLOBAL DE L'INTERFACE
  // ===========================================================================

  function renderAll() {
    renderQuickSwitchBanner();

    const authScreen = document.getElementById('auth-screen');
    const appViews = document.getElementById('app-views');
    const headerUserSection = document.getElementById('header-user-section');
    const desktopNav = document.getElementById('desktop-nav');
    const mobileBottomNav = document.getElementById('mobile-bottom-nav');

    if (!state.currentUser) {
      authScreen.classList.remove('hidden');
      appViews.classList.add('hidden');
      headerUserSection.classList.add('hidden');
      desktopNav.classList.add('hidden');
      mobileBottomNav.classList.add('hidden');
      renderAuthScreen();
      return;
    }

    authScreen.classList.add('hidden');
    appViews.classList.remove('hidden');
    headerUserSection.classList.remove('hidden');
    headerUserSection.classList.add('flex');
    desktopNav.classList.remove('hidden');
    mobileBottomNav.classList.remove('hidden');

    renderHeaderAndNav();
    renderActiveTabView();
  }

  function renderQuickSwitchBanner() {
    const banner = document.getElementById('quick-switch-banner');
    const modeBadge = document.getElementById('mode-indicator-badge');
    const membersContainer = document.getElementById('quick-switch-members');
    const switchLabel = document.getElementById('quick-switch-label');

    if (!banner || !membersContainer) return;

    if (state.mode === 'supabase') {
      modeBadge.innerHTML = '🟢 Connecté à Supabase';
      modeBadge.className = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30';
    } else {
      modeBadge.innerHTML = '✨ Mode Démo Interactif';
      modeBadge.className = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gold-500/20 text-gold-400 border border-gold-400/30';
    }

    // Afficher le sélecteur rapide uniquement en mode Démo
    if (state.mode !== 'demo') {
      if (switchLabel) {
        switchLabel.textContent = state.currentUser
          ? 'Session personnelle active (lien magique)'
          : 'Authentification par lien magique requis';
      }
      membersContainer.innerHTML = state.currentUser
        ? `
          <button
            type="button"
            id="btn-switch-account-modal"
            class="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/90 text-[11px] font-medium transition"
          >
            🔑 Utiliser un autre code secret
          </button>
        `
        : '';
      const switchBtn = document.getElementById('btn-switch-account-modal');
      if (switchBtn) {
        switchBtn.addEventListener('click', () => {
          state.currentUser = null;
          renderAll();
        });
      }
      return;
    }

    if (switchLabel) {
      switchLabel.textContent = 'Tester la vue d’un membre en 1 clic :';
    }

    membersContainer.innerHTML = state.members
      .map((m) => {
        const isCurrent = state.currentUser && String(state.currentUser.id) === String(m.id);
        const activeClasses = isCurrent
          ? 'bg-gold-500 text-pine-950 font-bold shadow-sm'
          : 'bg-white/10 hover:bg-white/20 text-white/90 font-medium';
        return `
          <button
            type="button"
            data-quick-token="${escapeHtml(m.token)}"
            class="px-2.5 py-1 rounded-lg text-[11px] transition flex items-center gap-1 shrink-0 ${activeClasses}"
          >
            <span>${escapeHtml(m.avatar || '🎁')}</span>
            <span>${escapeHtml(m.name)}</span>
          </button>
        `;
      })
      .join('');

    membersContainer.querySelectorAll('[data-quick-token]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const token = btn.getAttribute('data-quick-token');
        const member = await window.GiftDB.getMemberByToken(token);
        if (member) {
          await setAuthenticatedUser(member, true);
          showToast(`Connecté en tant que ${member.avatar} ${member.name}`, 'info');
        }
      });
    });
  }

  function renderAuthScreen() {
    const pickerSection = document.getElementById('auth-member-picker-section');
    const memberGrid = document.getElementById('auth-member-grid');
    const firstAdminSetup = document.getElementById('first-admin-setup');

    if (state.members.length === 0) {
      pickerSection.classList.add('hidden');
      firstAdminSetup.classList.remove('hidden');
    } else if (state.mode !== 'demo') {
      // En production (Supabase), ne jamais afficher la liste cliquable des tokens secrets :
      // l'accès se fait uniquement via le lien magique (?token=...) ou saisie du code secret.
      pickerSection.classList.add('hidden');
      firstAdminSetup.classList.add('hidden');
    } else {
      pickerSection.classList.remove('hidden');
      firstAdminSetup.classList.add('hidden');

      memberGrid.innerHTML = state.members
        .map(
          (m) => `
          <button
            type="button"
            data-auth-token="${escapeHtml(m.token)}"
            class="flex items-center gap-3 p-3 rounded-2xl border border-gray-200 hover:border-pine-900 hover:bg-pine-50/60 text-left transition group"
          >
            <span class="w-10 h-10 rounded-xl bg-cream-100 group-hover:bg-white flex items-center justify-center text-xl shrink-0">
              ${escapeHtml(m.avatar || '🎅')}
            </span>
            <div class="min-w-0 flex-1">
              <div class="font-bold text-sm text-pine-900 truncate flex items-center gap-1.5">
                <span>${escapeHtml(m.name)}</span>
                ${
                  m.is_admin
                    ? '<span class="px-1.5 py-0.2 text-[10px] rounded bg-gold-100 text-gold-600 font-bold">Admin</span>'
                    : ''
                }
              </div>
              <div class="text-[11px] text-gray-500 truncate">Accéder à ma liste →</div>
            </div>
          </button>
        `
        )
        .join('');

      memberGrid.querySelectorAll('[data-auth-token]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const token = btn.getAttribute('data-auth-token');
          const member = await window.GiftDB.getMemberByToken(token);
          if (member) {
            await setAuthenticatedUser(member, true);
            showToast(`Bienvenue ${member.avatar} ${member.name} !`, 'success');
          }
        });
      });
    }
  }

  function renderHeaderAndNav() {
    const user = state.currentUser;
    if (!user) return;

    document.getElementById('current-user-avatar').textContent = user.avatar || '🎅';
    document.getElementById('current-user-name').textContent = user.name;

    const adminBadge = document.getElementById('current-user-admin-badge');
    const desktopTabAdmin = document.getElementById('desktop-tab-admin');
    const mobileTabAdmin = document.getElementById('mobile-tab-admin');
    const mobileNavGrid = document.getElementById('mobile-nav-grid');

    if (user.is_admin) {
      adminBadge.classList.remove('hidden');
      desktopTabAdmin.classList.remove('hidden');
      desktopTabAdmin.classList.add('flex');
      mobileTabAdmin.classList.remove('hidden');
      mobileTabAdmin.classList.add('flex');
      mobileNavGrid.classList.remove('grid-cols-3');
      mobileNavGrid.classList.add('grid-cols-4');
    } else {
      adminBadge.classList.add('hidden');
      desktopTabAdmin.classList.add('hidden');
      desktopTabAdmin.classList.remove('flex');
      mobileTabAdmin.classList.add('hidden');
      mobileTabAdmin.classList.remove('flex');
      mobileNavGrid.classList.remove('grid-cols-4');
      mobileNavGrid.classList.add('grid-cols-3');
    }

    // Compteurs pour les badges de navigation
    const totalGiftsCount = state.gifts.length;
    const myWishesCount = state.gifts.filter(
      (g) => String(g.owner_id) === String(user.id)
    ).length;
    const myPurchasesCount = state.gifts.filter(
      (g) => !g.is_own_gift && String(g.reserved_by_id) === String(user.id)
    ).length;

    document.getElementById('nav-badge-family').textContent = String(totalGiftsCount);
    document.getElementById('nav-badge-mylist').textContent = String(myWishesCount);
    document.getElementById('nav-badge-mypurchases').textContent = String(myPurchasesCount);

    const mobileBadgeMylist = document.getElementById('mobile-badge-mylist');
    if (myWishesCount > 0) {
      mobileBadgeMylist.textContent = String(myWishesCount);
      mobileBadgeMylist.classList.remove('hidden');
    } else {
      mobileBadgeMylist.classList.add('hidden');
    }

    const mobileBadgePurchases = document.getElementById('mobile-badge-mypurchases');
    if (myPurchasesCount > 0) {
      mobileBadgePurchases.textContent = String(myPurchasesCount);
      mobileBadgePurchases.classList.remove('hidden');
    } else {
      mobileBadgePurchases.classList.add('hidden');
    }

    // État actif des boutons d'onglets
    document.querySelectorAll('[data-tab]').forEach((btn) => {
      const tab = btn.getAttribute('data-tab');
      if (tab === state.activeTab) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  function renderActiveTabView() {
    const views = {
      family: document.getElementById('view-family'),
      mylist: document.getElementById('view-mylist'),
      mypurchases: document.getElementById('view-mypurchases'),
      admin: document.getElementById('view-admin')
    };

    Object.entries(views).forEach(([key, el]) => {
      if (!el) return;
      if (key === state.activeTab) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    });

    if (state.activeTab === 'family') {
      renderFamilyTab();
    } else if (state.activeTab === 'mylist') {
      renderMyListTab();
    } else if (state.activeTab === 'mypurchases') {
      renderMyPurchasesTab();
    } else if (state.activeTab === 'admin') {
      renderAdminTab();
    }
  }

  // ===========================================================================
  // TAB 1 : "🎄 LA FAMILLE" (FILTRES + GRILLE ANTI-SPOILER)
  // ===========================================================================

  function renderFamilyTab() {
    const user = state.currentUser;
    if (!user) return;

    // 1. Pilules de filtre par membre
    const memberPillsContainer = document.getElementById('family-member-pills');
    const giftCountsByMember = new Map();
    state.gifts.forEach((g) => {
      const key = String(g.owner_id);
      giftCountsByMember.set(key, (giftCountsByMember.get(key) || 0) + 1);
    });

    const allPillActive = state.memberFilter === 'all' ? 'active' : 'bg-cream-50 text-pine-900 border-pine-900/15 hover:bg-cream-100';
    let memberPillsHtml = `
      <button
        type="button"
        data-member-id="all"
        class="member-pill ${allPillActive} px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 shrink-0"
      >
        <span>🎄</span>
        <span>Tous les membres</span>
        <span class="px-1.5 py-0.2 rounded-full text-[11px] ${
          state.memberFilter === 'all' ? 'bg-white/20 text-white' : 'bg-pine-900/10 text-pine-900'
        }">${state.gifts.length}</span>
      </button>
    `;

    memberPillsHtml += state.members
      .map((m) => {
        const isActive = String(state.memberFilter) === String(m.id);
        const count = giftCountsByMember.get(String(m.id)) || 0;
        const isMe = String(m.id) === String(user.id);
        const pillClasses = isActive
          ? 'active'
          : 'bg-cream-50 text-pine-900 border-pine-900/15 hover:bg-cream-100';
        return `
          <button
            type="button"
            data-member-id="${escapeHtml(m.id)}"
            class="member-pill ${pillClasses} px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 shrink-0"
          >
            <span class="text-sm">${escapeHtml(m.avatar || '🎅')}</span>
            <span>${escapeHtml(m.name)}${isMe ? ' (Moi)' : ''}</span>
            <span class="px-1.5 py-0.2 rounded-full text-[11px] ${
              isActive ? 'bg-white/20 text-white' : 'bg-pine-900/10 text-pine-900'
            }">${count}</span>
          </button>
        `;
      })
      .join('');

    memberPillsContainer.innerHTML = memberPillsHtml;
    memberPillsContainer.querySelectorAll('[data-member-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.memberFilter = btn.getAttribute('data-member-id');
        renderFamilyTab();
      });
    });

    // 2. Pilules de filtre par statut
    document.querySelectorAll('#family-status-pills [data-status]').forEach((btn) => {
      const status = btn.getAttribute('data-status');
      if (status === state.statusFilter) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // 3. Bannière Anti-Spoiler lors d'un filtre de statut (Disponibles / Réservés / Réservés par moi)
    const antiSpoilerBanner = document.getElementById('anti-spoiler-filter-banner');
    const isFilteringByStatus = state.statusFilter !== 'all';
    const isFilteringOwnMember = String(state.memberFilter) === String(user.id);

    if (isFilteringByStatus && (state.memberFilter === 'all' || isFilteringOwnMember)) {
      antiSpoilerBanner.classList.remove('hidden');
    } else {
      antiSpoilerBanner.classList.add('hidden');
    }

    // 4. Filtrage strict des cadeaux (avec règle ANTI-SPOILER sur les filtres !)
    const query = state.searchQuery.trim().toLowerCase();
    const filteredGifts = state.gifts.filter((gift) => {
      const isOwn = Boolean(gift.is_own_gift || String(gift.owner_id) === String(user.id));

      // RÈGLE CRITIQUE ANTI-SPOILER :
      // Quand un filtre de statut ('available', 'reserved', 'reserved_by_me') est actif,
      // exclure systématiquement les propres cadeaux de l'utilisateur connecté !
      if (state.statusFilter !== 'all' && isOwn) {
        return false;
      }

      // Filtre par membre
      if (state.memberFilter !== 'all' && String(gift.owner_id) !== String(state.memberFilter)) {
        return false;
      }

      // Filtre par statut (uniquement sur les cadeaux des autres membres)
      if (state.statusFilter === 'available' && gift.reserved_by_id) {
        return false;
      }
      if (state.statusFilter === 'reserved' && !gift.reserved_by_id) {
        return false;
      }
      if (
        state.statusFilter === 'reserved_by_me' &&
        String(gift.reserved_by_id) !== String(user.id)
      ) {
        return false;
      }

      // Filtre par recherche texte
      if (query) {
        const haystack = `${gift.title} ${gift.description || ''} ${gift.owner_name || ''}`.toLowerCase();
        if (!haystack.includes(query)) {
          return false;
        }
      }

      return true;
    });

    // Compteur de résultats
    const resultsCountEl = document.getElementById('family-results-count');
    resultsCountEl.textContent =
      filteredGifts.length <= 1
        ? `${filteredGifts.length} cadeau affiché`
        : `${filteredGifts.length} cadeaux affichés`;

    // 5. Rendu des cartes
    const grid = document.getElementById('family-gifts-grid');
    if (filteredGifts.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full bg-white rounded-3xl border border-pine-900/10 p-10 text-center space-y-3">
          <div class="text-4xl">${isFilteringByStatus && isFilteringOwnMember ? '🤫' : '🎄'}</div>
          <h3 class="font-serif-festive text-lg font-bold text-pine-900">
            ${
              isFilteringByStatus && isFilteringOwnMember
                ? 'Pour garder la surprise de Noël, le filtre réservé/disponible ne s’applique pas à ta propre liste !'
                : 'Aucun souhait ne correspond à ces critères'
            }
          </h3>
          <p class="text-xs sm:text-sm text-gray-500 max-w-md mx-auto">
            ${
              isFilteringByStatus && isFilteringOwnMember
                ? 'Passe le filtre de statut sur « Tous » ou consulte l’onglet « Ma Liste » pour voir et modifier tes souhaits.'
                : 'Essaie de modifier les filtres ci-dessus ou ajoute un nouveau souhait à ta liste.'
            }
          </p>
          <div class="pt-2">
            <button
              type="button"
              id="btn-reset-family-filters"
              class="px-4 py-2 rounded-xl bg-pine-900 text-white text-xs font-semibold hover:bg-pine-800 transition"
            >
              Réinitialiser les filtres
            </button>
          </div>
        </div>
      `;

      const resetBtn = document.getElementById('btn-reset-family-filters');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          state.memberFilter = 'all';
          state.statusFilter = 'all';
          state.searchQuery = '';
          const searchInput = document.getElementById('family-search-input');
          if (searchInput) searchInput.value = '';
          renderFamilyTab();
        });
      }
      return;
    }

    grid.innerHTML = filteredGifts.map((gift) => renderGiftCardHtml(gift, user)).join('');
    bindGiftCardEvents(grid);
  }

  function renderGiftCardHtml(gift, user) {
    const isOwn = Boolean(gift.is_own_gift || String(gift.owner_id) === String(user.id));
    const isReservedByMe = !isOwn && String(gift.reserved_by_id) === String(user.id);
    const isReservedByOther =
      !isOwn && Boolean(gift.reserved_by_id) && String(gift.reserved_by_id) !== String(user.id);
    const priceLabel = formatPrice(gift.price);

    const cardExtraClass = isOwn
      ? 'gift-card-own'
      : isReservedByMe
      ? 'gift-card-reserved-me'
      : '';

    // Image ou placeholder festif
    const imageSectionHtml = gift.image_url
      ? `
        <div class="gift-img-wrapper">
          <img
            src="${escapeHtml(gift.image_url)}"
            alt="${escapeHtml(gift.title)}"
            loading="lazy"
            onerror="this.onerror=null;this.parentElement.innerHTML='<div class=\\'w-full h-full flex flex-col items-center justify-center text-pine-900/40 p-4\\'><span class=\\'text-4xl mb-1\\'>🎁</span><span class=\\'text-xs font-medium\\'>Idée cadeau</span></div>';"
          />
          ${
            priceLabel
              ? `<span class="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-bold bg-pine-950/85 text-gold-400 backdrop-blur-sm shadow">${escapeHtml(priceLabel)}</span>`
              : ''
          }
          <span class="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold bg-white/95 text-pine-900 shadow-sm flex items-center gap-1">
            <span>${escapeHtml(gift.owner_avatar || '🎅')}</span>
            <span>${escapeHtml(gift.owner_name)}</span>
          </span>
        </div>
      `
      : `
        <div class="gift-img-wrapper flex flex-col items-center justify-center p-4 text-pine-900/50">
          <span class="text-4xl mb-1">🎁</span>
          <span class="text-[11px] font-semibold uppercase tracking-wider text-pine-900/40">Souhait de Noël</span>
          ${
            priceLabel
              ? `<span class="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-bold bg-pine-950/85 text-gold-400 backdrop-blur-sm shadow">${escapeHtml(priceLabel)}</span>`
              : ''
          }
          <span class="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold bg-white/95 text-pine-900 shadow-sm flex items-center gap-1">
            <span>${escapeHtml(gift.owner_avatar || '🎅')}</span>
            <span>${escapeHtml(gift.owner_name)}</span>
          </span>
        </div>
      `;

    // Zone de statut & boutons d'action selon l'anti-spoiler
    let statusAndActionsHtml = '';

    if (isOwn) {
      // Cadeau appartenant à l'utilisateur connecté : statut strictement masqué !
      statusAndActionsHtml = `
        <div class="pt-3 border-t border-gray-100 space-y-2.5">
          <div class="px-3 py-2 rounded-xl bg-gold-50 border border-gold-400/40 text-pine-900 text-xs font-semibold flex items-center gap-2">
            <span>🎁</span>
            <span>Ton souhait (statut masqué pour la surprise !)</span>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              data-edit-gift="${escapeHtml(gift.id)}"
              class="flex-1 py-2 px-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold transition"
            >
              ✏️ Modifier
            </button>
            <button
              type="button"
              data-delete-gift="${escapeHtml(gift.id)}"
              class="flex-1 py-2 px-3 rounded-xl border border-cranberry-500/25 bg-cranberry-50 hover:bg-cranberry-100 text-cranberry-700 text-xs font-semibold transition"
            >
              🗑️ Supprimer
            </button>
          </div>
        </div>
      `;
    } else if (!gift.reserved_by_id) {
      // Cadeau d'un autre membre : disponible
      statusAndActionsHtml = `
        <div class="pt-3 border-t border-gray-100 space-y-2">
          <button
            type="button"
            data-reserve-gift="${escapeHtml(gift.id)}"
            class="w-full py-2.5 px-4 rounded-xl bg-pine-900 hover:bg-pine-800 text-white text-xs sm:text-sm font-bold shadow-sm transition flex items-center justify-center gap-2"
          >
            <span>🎁</span>
            <span>Je réserve ce cadeau</span>
          </button>
          ${renderAdminGiftInlineControls(gift, user)}
        </div>
      `;
    } else if (isReservedByMe) {
      // Cadeau réservé par l'utilisateur connecté
      statusAndActionsHtml = `
        <div class="pt-3 border-t border-gray-100 space-y-2">
          <div class="flex items-center justify-between gap-2">
            <span class="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-500/30 text-emerald-800 text-xs font-bold flex items-center gap-1.5 flex-1">
              <span>✅</span>
              <span>Réservé par toi</span>
            </span>
            <button
              type="button"
              data-unreserve-gift="${escapeHtml(gift.id)}"
              class="py-2 px-3.5 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-semibold transition shrink-0"
            >
              Libérer
            </button>
          </div>
          ${renderAdminGiftInlineControls(gift, user)}
        </div>
      `;
    } else if (isReservedByOther) {
      // Cadeau réservé par un autre membre de la famille
      statusAndActionsHtml = `
        <div class="pt-3 border-t border-gray-100 space-y-2">
          <div class="px-3 py-2 rounded-xl bg-amber-50 border border-amber-400/40 text-amber-900 text-xs font-bold flex items-center gap-1.5">
            <span>🔒</span>
            <span>Réservé par ${escapeHtml(gift.reserved_by_avatar || '')} ${escapeHtml(gift.reserved_by_name || 'un membre')}</span>
          </div>
          ${renderAdminGiftInlineControls(gift, user)}
        </div>
      `;
    }

    return `
      <article class="gift-card ${cardExtraClass} flex flex-col overflow-hidden">
        ${imageSectionHtml}
        <div class="p-4 flex-1 flex flex-col justify-between space-y-3">
          <div class="space-y-2">
            <h3 class="font-serif-festive font-bold text-base sm:text-lg text-pine-900 leading-snug">
              ${escapeHtml(gift.title)}
            </h3>
            ${
              gift.description
                ? `<p class="text-xs sm:text-sm text-gray-600 line-clamp-3 leading-relaxed">${escapeHtml(gift.description)}</p>`
                : ''
            }
            ${
              gift.url
                ? `
                  <div class="pt-1">
                    <a
                      href="${escapeHtml(gift.url)}"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-flex items-center gap-1 text-xs font-bold text-cranberry-600 hover:text-cranberry-700 hover:underline"
                    >
                      <span>Voir le lien</span>
                      <span>↗</span>
                    </a>
                  </div>
                `
                : ''
            }
          </div>
          ${statusAndActionsHtml}
        </div>
      </article>
    `;
  }

  function renderAdminGiftInlineControls(gift, user) {
    // Contrôles Admin uniquement si currentUser.is_admin ET que le cadeau appartient à quelqu'un d'autre
    if (!user.is_admin || String(gift.owner_id) === String(user.id)) {
      return '';
    }

    const canForceUnreserve =
      gift.reserved_by_id && String(gift.reserved_by_id) !== String(user.id);

    return `
      <div class="flex flex-wrap items-center justify-end gap-1.5 pt-1 text-[11px] text-gray-500">
        <span class="font-semibold text-gray-400 mr-auto">⚙️ Admin :</span>
        ${
          canForceUnreserve
            ? `
              <button
                type="button"
                data-admin-unreserve="${escapeHtml(gift.id)}"
                class="px-2 py-1 rounded-lg bg-amber-100/80 hover:bg-amber-200 text-amber-900 font-semibold transition"
                title="Débloquer la réservation"
              >
                🔓 Débloquer la réservation
              </button>
            `
            : ''
        }
        <button
          type="button"
          data-edit-gift="${escapeHtml(gift.id)}"
          class="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition"
        >
          ✏️ Modifier
        </button>
        <button
          type="button"
          data-delete-gift="${escapeHtml(gift.id)}"
          class="px-2 py-1 rounded-lg bg-cranberry-50 hover:bg-cranberry-100 text-cranberry-700 font-medium transition"
        >
          🗑️ Supprimer
        </button>
      </div>
    `;
  }

  function bindGiftCardEvents(container) {
    // Réserver un cadeau
    container.querySelectorAll('[data-reserve-gift]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const giftId = btn.getAttribute('data-reserve-gift');
        await handleReserveGift(giftId);
      });
    });

    // Libérer sa réservation
    container.querySelectorAll('[data-unreserve-gift]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const giftId = btn.getAttribute('data-unreserve-gift');
        await handleUnreserveGift(giftId, false);
      });
    });

    // Débloquer une réservation (Admin)
    container.querySelectorAll('[data-admin-unreserve]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const giftId = btn.getAttribute('data-admin-unreserve');
        await handleUnreserveGift(giftId, true);
      });
    });

    // Modifier un souhait
    container.querySelectorAll('[data-edit-gift]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const giftId = btn.getAttribute('data-edit-gift');
        const gift = state.gifts.find((g) => String(g.id) === String(giftId));
        if (gift) openGiftModal(gift);
      });
    });

    // Supprimer un souhait (ouvre la modale d'avertissement obligatoire)
    container.querySelectorAll('[data-delete-gift]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const giftId = btn.getAttribute('data-delete-gift');
        const gift = state.gifts.find((g) => String(g.id) === String(giftId));
        if (gift) openDeleteGiftModal(gift);
      });
    });
  }

  // ===========================================================================
  // TAB 2 : "🎁 MA LISTE" (LISTE PERSONNELLE + AJOUT / MODIFICATION / SUPPRESSION)
  // ===========================================================================

  function renderMyListTab() {
    const user = state.currentUser;
    if (!user) return;

    const myGifts = state.gifts.filter(
      (g) => Boolean(g.is_own_gift || String(g.owner_id) === String(user.id))
    );

    const countBadge = document.getElementById('mylist-header-count');
    countBadge.textContent =
      myGifts.length <= 1 ? `${myGifts.length} souhait` : `${myGifts.length} souhaits`;

    const grid = document.getElementById('mylist-gifts-grid');
    if (myGifts.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full bg-white rounded-3xl border border-pine-900/10 p-10 text-center space-y-3">
          <div class="text-4xl">🎁</div>
          <h3 class="font-serif-festive text-lg font-bold text-pine-900">
            Ta liste de Noël est encore vide
          </h3>
          <p class="text-xs sm:text-sm text-gray-500 max-w-md mx-auto">
            Ajoute tes envies de cadeaux (livres, vêtements, jeux, expériences…) pour inspirer ta famille !
          </p>
          <div class="pt-2">
            <button
              type="button"
              id="btn-empty-mylist-add"
              class="px-5 py-2.5 rounded-xl bg-cranberry-600 hover:bg-cranberry-500 text-white text-xs sm:text-sm font-semibold shadow-sm transition"
            >
              ＋ Ajouter mon premier souhait
            </button>
          </div>
        </div>
      `;
      const addBtn = document.getElementById('btn-empty-mylist-add');
      if (addBtn) addBtn.addEventListener('click', () => openGiftModal(null));
      return;
    }

    grid.innerHTML = myGifts.map((gift) => renderGiftCardHtml(gift, user)).join('');
    bindGiftCardEvents(grid);
  }

  // ===========================================================================
  // TAB 3 : "🛍️ MES ACHATS" (CADEAUX RÉSERVÉS PAR MOI + BUDGET TOTAL)
  // ===========================================================================

  function renderMyPurchasesTab() {
    const user = state.currentUser;
    if (!user) return;

    const myPurchases = state.gifts.filter(
      (g) => !g.is_own_gift && String(g.reserved_by_id) === String(user.id)
    );

    const totalBudget = myPurchases.reduce((sum, g) => {
      const p = Number(g.price);
      return !Number.isNaN(p) && p > 0 ? sum + p : sum;
    }, 0);

    document.getElementById('purchases-kpi-count').textContent = String(myPurchases.length);
    document.getElementById('purchases-kpi-budget').textContent = formatPrice(totalBudget) || '0 €';

    const listEl = document.getElementById('mypurchases-list');
    if (myPurchases.length === 0) {
      listEl.innerHTML = `
        <div class="bg-white rounded-3xl border border-pine-900/10 p-10 text-center space-y-3">
          <div class="text-4xl">🛍️</div>
          <h3 class="font-serif-festive text-lg font-bold text-pine-900">
            Tu n'as encore réservé aucun cadeau
          </h3>
          <p class="text-xs sm:text-sm text-gray-500 max-w-md mx-auto">
            Explore les listes de la famille dans l’onglet « La Famille » et clique sur « Je réserve ce cadeau » pour préparer tes achats en secret.
          </p>
          <div class="pt-2">
            <button
              type="button"
              id="btn-go-family-from-purchases"
              class="px-5 py-2.5 rounded-xl bg-pine-900 hover:bg-pine-800 text-white text-xs sm:text-sm font-semibold transition"
            >
              🎄 Voir les listes de la famille
            </button>
          </div>
        </div>
      `;
      const goBtn = document.getElementById('btn-go-family-from-purchases');
      if (goBtn) {
        goBtn.addEventListener('click', () => {
          state.activeTab = 'family';
          renderAll();
        });
      }
      return;
    }

    listEl.innerHTML = myPurchases
      .map((gift) => {
        const priceLabel = formatPrice(gift.price);
        return `
          <div class="bg-white rounded-2xl border border-pine-900/10 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="flex items-start gap-3.5">
              ${
                gift.image_url
                  ? `<img src="${escapeHtml(gift.image_url)}" alt="${escapeHtml(gift.title)}" class="w-16 h-16 rounded-xl object-cover shrink-0 border border-gray-200" />`
                  : `<div class="w-16 h-16 rounded-xl bg-cream-100 flex items-center justify-center text-2xl shrink-0">🎁</div>`
              }
              <div class="space-y-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-pine-100 text-pine-900">
                    Pour ${escapeHtml(gift.owner_avatar || '🎅')} ${escapeHtml(gift.owner_name)}
                  </span>
                  ${
                    priceLabel
                      ? `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gold-100 text-pine-900">${escapeHtml(priceLabel)}</span>`
                      : ''
                  }
                </div>
                <h3 class="font-serif-festive font-bold text-base text-pine-900">
                  ${escapeHtml(gift.title)}
                </h3>
                ${
                  gift.description
                    ? `<p class="text-xs text-gray-600">${escapeHtml(gift.description)}</p>`
                    : ''
                }
                ${
                  gift.url
                    ? `
                      <a
                        href="${escapeHtml(gift.url)}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="inline-flex items-center gap-1 text-xs font-bold text-cranberry-600 hover:underline pt-0.5"
                      >
                        <span>Voir le lien boutique</span>
                        <span>↗</span>
                      </a>
                    `
                    : ''
                }
              </div>
            </div>

            <div class="flex items-center justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
              <button
                type="button"
                data-unreserve-gift="${escapeHtml(gift.id)}"
                class="px-3.5 py-2 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-semibold transition"
              >
                Libérer ce cadeau
              </button>
            </div>
          </div>
        `;
      })
      .join('');

    bindGiftCardEvents(listEl);
  }

  // ===========================================================================
  // TAB 4 : "⚙️ ADMIN" (MEMBRES, LIENS MAGIQUES, RÉSERVATIONS & SUPABASE)
  // ===========================================================================

  function renderAdminTab() {
    const user = state.currentUser;
    if (!user || !user.is_admin) return;

    // 1. Liste des membres & liens magiques
    const membersListEl = document.getElementById('admin-members-list');
    membersListEl.innerHTML = state.members
      .map((member) => {
        const magicLink = buildMagicLink(member.token);
        const whatsappText = `🎄 Voici ton lien magique personnel pour notre liste de cadeaux de Noël en famille (${member.name}) : ${magicLink}`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;
        const isSelf = String(member.id) === String(user.id);

        return `
          <div class="rounded-2xl border border-gray-200 bg-cream-50/50 p-4 flex flex-col justify-between gap-3">
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-3 min-w-0">
                <span class="w-11 h-11 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-2xl shrink-0 shadow-sm">
                  ${escapeHtml(member.avatar || '🎅')}
                </span>
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <strong class="text-sm font-bold text-pine-900 truncate">${escapeHtml(member.name)}</strong>
                    ${
                      member.is_admin
                        ? '<span class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-gold-500 text-pine-950">Admin</span>'
                        : ''
                    }
                    ${
                      isSelf
                        ? '<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-pine-100 text-pine-900">Toi</span>'
                        : ''
                    }
                  </div>
                  <div class="text-[11px] font-mono text-gray-500 truncate mt-0.5" title="${escapeHtml(magicLink)}">
                    ?token=${escapeHtml(member.token)}
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  data-edit-member="${escapeHtml(member.id)}"
                  class="px-2.5 py-1.5 rounded-xl bg-white hover:bg-gray-100 border border-gray-200 text-xs font-semibold text-gray-700 transition"
                  title="Modifier ce membre"
                >
                  ✏️ Modifier
                </button>
                ${
                  !isSelf
                    ? `
                      <button
                        type="button"
                        data-delete-member="${escapeHtml(member.id)}"
                        class="px-2.5 py-1.5 rounded-xl bg-cranberry-50 hover:bg-cranberry-100 border border-cranberry-500/20 text-xs font-semibold text-cranberry-700 transition"
                        title="Supprimer ce membre"
                      >
                        🗑️ Supprimer
                      </button>
                    `
                    : ''
                }
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-200/70">
              <button
                type="button"
                data-copy-member-link="${escapeHtml(member.token)}"
                data-member-name="${escapeHtml(member.name)}"
                class="flex-1 py-2 px-3 rounded-xl bg-pine-900 hover:bg-pine-800 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5"
              >
                <span>📋 Copier le lien</span>
              </button>
              <a
                href="${escapeHtml(whatsappUrl)}"
                target="_blank"
                rel="noopener noreferrer"
                class="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5"
              >
                <span>💬 Partager (WhatsApp)</span>
              </a>
            </div>
          </div>
        `;
      })
      .join('');

    // Événements sur les membres
    membersListEl.querySelectorAll('[data-copy-member-link]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const token = btn.getAttribute('data-copy-member-link');
        const name = btn.getAttribute('data-member-name');
        copyToClipboard(buildMagicLink(token), `Lien magique de ${name} copié !`);
      });
    });

    membersListEl.querySelectorAll('[data-edit-member]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const memberId = btn.getAttribute('data-edit-member');
        const member = state.members.find((m) => String(m.id) === String(memberId));
        if (member) openMemberModal(member);
      });
    });

    membersListEl.querySelectorAll('[data-delete-member]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const memberId = btn.getAttribute('data-delete-member');
        const member = state.members.find((m) => String(m.id) === String(memberId));
        if (!member) return;
        const confirmed = window.confirm(
          `Supprimer le membre "${member.name}" ainsi que ses souhaits ?`
        );
        if (!confirmed) return;
        try {
          await window.GiftDB.deleteMember(member.id);
          await reloadGiftsAndMembers();
          showToast(`Membre ${member.name} supprimé.`, 'info');
        } catch (err) {
          showToast(err.message || 'Impossible de supprimer ce membre.', 'error');
        }
      });
    });

    // 2. Gestion des réservations & cadeaux (Anti-Spoiler préservé pour l'Admin !)
    const adminGiftsEl = document.getElementById('admin-gifts-list');
    const otherMembersGifts = state.gifts.filter(
      (g) => !g.is_own_gift && String(g.owner_id) !== String(user.id)
    );

    if (otherMembersGifts.length === 0) {
      adminGiftsEl.innerHTML = `
        <div class="py-6 text-center text-xs sm:text-sm text-gray-500">
          Aucun cadeau d'un autre membre à administrer pour le moment.
          (Tes propres souhaits sont masqués ici pour préserver ta surprise de Noël !)
        </div>
      `;
    } else {
      adminGiftsEl.innerHTML = otherMembersGifts
        .map((gift) => {
          const isReserved = Boolean(gift.reserved_by_id);
          return `
            <div class="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="space-y-0.5">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-xs font-bold text-pine-900">
                    ${escapeHtml(gift.owner_avatar || '🎅')} ${escapeHtml(gift.owner_name)}
                  </span>
                  <span class="text-gray-300">•</span>
                  <span class="text-sm font-semibold text-gray-900">${escapeHtml(gift.title)}</span>
                  ${
                    isReserved
                      ? `<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900">🔒 Réservé par ${escapeHtml(gift.reserved_by_name || 'un membre')}</span>`
                      : `<span class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700">🟢 Disponible</span>`
                  }
                </div>
              </div>
              <div class="flex flex-wrap items-center gap-2 shrink-0">
                ${
                  isReserved
                    ? `
                      <button
                        type="button"
                        data-admin-unreserve="${escapeHtml(gift.id)}"
                        class="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-semibold transition"
                      >
                        🔓 Débloquer la réservation
                      </button>
                    `
                    : ''
                }
                <button
                  type="button"
                  data-edit-gift="${escapeHtml(gift.id)}"
                  class="px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold transition"
                >
                  ✏️ Modifier
                </button>
                <button
                  type="button"
                  data-delete-gift="${escapeHtml(gift.id)}"
                  class="px-3 py-1.5 rounded-xl bg-cranberry-50 hover:bg-cranberry-100 text-cranberry-700 text-xs font-semibold transition"
                >
                  🗑️ Supprimer
                </button>
              </div>
            </div>
          `;
        })
        .join('');

      bindGiftCardEvents(adminGiftsEl);
    }

    // 3. Configuration Base de données (Supabase / Démo)
    const dbModeBadge = document.getElementById('admin-db-mode-badge');
    const supaCfg = window.GiftDB.getSupabaseConfig();
    const urlInput = document.getElementById('input-supabase-url');
    const keyInput = document.getElementById('input-supabase-key');

    if (urlInput) urlInput.value = supaCfg.url || '';
    if (keyInput) keyInput.value = supaCfg.anonKey || '';

    if (state.mode === 'supabase') {
      dbModeBadge.textContent = '🟢 Connecté à Supabase';
      dbModeBadge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900';
    } else {
      dbModeBadge.textContent = '✨ Mode Démo Local';
      dbModeBadge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-gold-100 text-pine-900';
    }
  }

  // ===========================================================================
  // ACTIONS SUR LES CADEAUX (RÉSERVER, LIBÉRER, AJOUTER, MODIFIER, SUPPRIMER)
  // ===========================================================================

  async function handleReserveGift(giftId) {
    if (!state.currentUser) return;
    try {
      await window.GiftDB.reserveGift(giftId, state.currentUser.id);
      await reloadGiftsAndMembers();
      showToast('🎁 Cadeau réservé ! Il apparaît maintenant dans « Mes Achats ».', 'success');
    } catch (err) {
      showToast(err.message || 'Impossible de réserver ce cadeau.', 'error');
      await reloadGiftsAndMembers();
    }
  }

  async function handleUnreserveGift(giftId, isAdminForce = false) {
    if (!state.currentUser) return;
    try {
      await window.GiftDB.unreserveGift(giftId, state.currentUser.id, isAdminForce);
      await reloadGiftsAndMembers();
      showToast(
        isAdminForce
          ? '🔓 Réservation débloquée par l’administrateur.'
          : 'Le cadeau est de nouveau disponible pour la famille.',
        'info'
      );
    } catch (err) {
      showToast(err.message || 'Impossible de libérer ce cadeau.', 'error');
    }
  }

  // Modale Ajout / Modification de cadeau
  function openGiftModal(gift = null) {
    const modal = document.getElementById('modal-gift');
    const modalTitle = document.getElementById('modal-gift-title');
    const idInput = document.getElementById('gift-id');
    const ownerInput = document.getElementById('gift-owner-id');
    const titleInput = document.getElementById('gift-title-input');
    const priceInput = document.getElementById('gift-price-input');
    const linkInput = document.getElementById('gift-link-input');
    const imageUrlInput = document.getElementById('gift-image-url-input');
    const descInput = document.getElementById('gift-desc-input');
    const fileInput = document.getElementById('gift-image-file-input');

    state.uploadedImageDataUrl = '';
    if (fileInput) fileInput.value = '';

    if (gift) {
      modalTitle.textContent = '✏️ Modifier ce souhait';
      idInput.value = gift.id;
      ownerInput.value = gift.owner_id;
      titleInput.value = gift.title || '';
      priceInput.value = gift.price !== null && gift.price !== undefined ? gift.price : '';
      linkInput.value = gift.url || '';
      descInput.value = gift.description || '';

      if (gift.image_url && gift.image_url.startsWith('data:image/')) {
        state.uploadedImageDataUrl = gift.image_url;
        imageUrlInput.value = '';
        setGiftImageTab('upload');
        updateGiftImagePreview(gift.image_url);
      } else {
        imageUrlInput.value = gift.image_url || '';
        setGiftImageTab('url');
        updateGiftImagePreview(gift.image_url || '');
      }
    } else {
      modalTitle.textContent = '🎁 Ajouter un souhait à ma liste';
      idInput.value = '';
      ownerInput.value = state.currentUser ? state.currentUser.id : '';
      titleInput.value = '';
      priceInput.value = '';
      linkInput.value = '';
      imageUrlInput.value = '';
      descInput.value = '';
      setGiftImageTab('url');
      updateGiftImagePreview('');
    }

    modal.classList.remove('hidden');
    setTimeout(() => titleInput.focus(), 50);
  }

  function setGiftImageTab(mode) {
    state.imageInputMode = mode;
    const tabUrl = document.getElementById('tab-img-url');
    const tabUpload = document.getElementById('tab-img-upload');
    const panelUrl = document.getElementById('panel-img-url');
    const panelUpload = document.getElementById('panel-img-upload');

    if (mode === 'upload') {
      tabUpload.className = 'px-2.5 py-1 rounded-md font-semibold bg-pine-900 text-white transition';
      tabUrl.className = 'px-2.5 py-1 rounded-md font-semibold text-gray-600 hover:text-pine-900 transition';
      panelUpload.classList.remove('hidden');
      panelUrl.classList.add('hidden');
    } else {
      tabUrl.className = 'px-2.5 py-1 rounded-md font-semibold bg-pine-900 text-white transition';
      tabUpload.className = 'px-2.5 py-1 rounded-md font-semibold text-gray-600 hover:text-pine-900 transition';
      panelUrl.classList.remove('hidden');
      panelUpload.classList.add('hidden');
    }
  }

  function updateGiftImagePreview(src) {
    const wrapper = document.getElementById('gift-image-preview-wrapper');
    const img = document.getElementById('gift-image-preview');
    if (src && src.trim()) {
      img.src = src.trim();
      wrapper.classList.remove('hidden');
    } else {
      img.src = '';
      wrapper.classList.add('hidden');
    }
  }

  // Modale Confirmation de Suppression (EXIGENCE CRITIQUE)
  function openDeleteGiftModal(gift) {
    state.pendingDeleteGift = gift;
    const modal = document.getElementById('modal-delete-gift');
    const nameDisplay = document.getElementById('delete-gift-name-display');
    nameDisplay.textContent = `« ${gift.title} »`;
    modal.classList.remove('hidden');
  }

  // ===========================================================================
  // MODALE AJOUT / MODIFICATION DE MEMBRE (ADMIN)
  // ===========================================================================

  function openMemberModal(member = null) {
    const modal = document.getElementById('modal-member');
    const titleEl = document.getElementById('modal-member-title');
    const idInput = document.getElementById('member-id');
    const nameInput = document.getElementById('member-name-input');
    const avatarInput = document.getElementById('member-avatar-input');
    const tokenInput = document.getElementById('member-token-input');
    const adminCheckbox = document.getElementById('member-admin-checkbox');

    if (member) {
      titleEl.textContent = `✏️ Modifier ${member.name}`;
      idInput.value = member.id;
      nameInput.value = member.name || '';
      avatarInput.value = member.avatar || '🎅';
      tokenInput.value = member.token || '';
      adminCheckbox.checked = Boolean(member.is_admin);
    } else {
      titleEl.textContent = '👤 Ajouter un membre de la famille';
      idInput.value = '';
      nameInput.value = '';
      avatarInput.value = '🎅';
      tokenInput.value = '';
      adminCheckbox.checked = false;
    }

    modal.classList.remove('hidden');
    setTimeout(() => nameInput.focus(), 50);
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
  }

  // ===========================================================================
  // ÉCOUTEURS D'ÉVÉNEMENTS DOM
  // ===========================================================================

  function bindGlobalEvents() {
    // Navigation par onglets (Desktop & Mobile)
    document.querySelectorAll('[data-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        if (targetTab === 'admin' && (!state.currentUser || !state.currentUser.is_admin)) {
          return;
        }
        state.activeTab = targetTab;
        renderAll();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });

    // Copier mon lien personnel
    const copyMyLinkBtn = document.getElementById('btn-copy-my-link');
    if (copyMyLinkBtn) {
      copyMyLinkBtn.addEventListener('click', () => {
        if (!state.currentUser) return;
        const link = buildMagicLink(state.currentUser.token);
        copyToClipboard(link, 'Ton lien personnel a été copié !');
      });
    }

    // Boutons "+ Ajouter un souhait"
    const headerAddWishBtn = document.getElementById('btn-header-add-wish');
    if (headerAddWishBtn) {
      headerAddWishBtn.addEventListener('click', () => openGiftModal(null));
    }
    const mylistAddWishBtn = document.getElementById('btn-mylist-add-wish');
    if (mylistAddWishBtn) {
      mylistAddWishBtn.addEventListener('click', () => openGiftModal(null));
    }

    // Filtres de statut (La Famille)
    document.querySelectorAll('#family-status-pills [data-status]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.statusFilter = btn.getAttribute('data-status');
        renderFamilyTab();
      });
    });

    // Recherche par mot-clé
    const searchInput = document.getElementById('family-search-input');
    const clearSearchBtn = document.getElementById('btn-clear-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        if (clearSearchBtn) {
          clearSearchBtn.classList.toggle('hidden', !state.searchQuery);
          clearSearchBtn.classList.toggle('flex', Boolean(state.searchQuery));
        }
        renderFamilyTab();
      });
    }
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        state.searchQuery = '';
        if (searchInput) searchInput.value = '';
        clearSearchBtn.classList.add('hidden');
        renderFamilyTab();
      });
    }

    // Formulaire de saisie manuelle de token
    const manualTokenForm = document.getElementById('form-manual-token');
    if (manualTokenForm) {
      manualTokenForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('input-manual-token');
        const token = (input.value || '').trim();
        if (!token) return;
        try {
          const member = await window.GiftDB.getMemberByToken(token);
          if (!member) {
            showToast('Aucun membre trouvé avec ce code secret.', 'error');
            return;
          }
          input.value = '';
          await setAuthenticatedUser(member, true);
          showToast(`Bienvenue ${member.avatar} ${member.name} !`, 'success');
        } catch (err) {
          showToast(err.message || 'Erreur lors de la vérification du code.', 'error');
        }
      });
    }

    // Formulaire de création du premier Admin (si base Supabase vide)
    const firstAdminForm = document.getElementById('form-first-admin');
    if (firstAdminForm) {
      firstAdminForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('first-admin-name').value.trim();
        const avatar = document.getElementById('first-admin-emoji').value.trim() || '🎄';
        if (!name) return;
        try {
          const created = await window.GiftDB.createMember({
            name,
            avatar,
            is_admin: true
          });
          state.members = await window.GiftDB.getMembers();
          await setAuthenticatedUser(created, true);
          showToast(`Compte Administrateur créé pour ${created.name} !`, 'success');
        } catch (err) {
          showToast(err.message || 'Impossible de créer le premier administrateur.', 'error');
        }
      });
    }

    // Fermeture des modales
    document.querySelectorAll('[data-close-modal]').forEach((btn) => {
      btn.addEventListener('click', () => {
        closeModal(btn.getAttribute('data-close-modal'));
      });
    });

    // Bascule Onglets Image (Lien URL vs Upload Photo) dans la modale Cadeau
    const tabImgUrl = document.getElementById('tab-img-url');
    const tabImgUpload = document.getElementById('tab-img-upload');
    const imageUrlInput = document.getElementById('gift-image-url-input');
    const imageFileInput = document.getElementById('gift-image-file-input');
    const clearImageBtn = document.getElementById('btn-clear-gift-image');

    if (tabImgUrl) {
      tabImgUrl.addEventListener('click', () => setGiftImageTab('url'));
    }
    if (tabImgUpload) {
      tabImgUpload.addEventListener('click', () => setGiftImageTab('upload'));
    }
    if (imageUrlInput) {
      imageUrlInput.addEventListener('input', () => {
        if (state.imageInputMode === 'url') {
          updateGiftImagePreview(imageUrlInput.value);
        }
      });
    }
    if (imageFileInput) {
      imageFileInput.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        try {
          showToast('Compression de la photo en cours…', 'info');
          const compressedDataUrl = await window.GiftDB.compressImageFile(file);
          state.uploadedImageDataUrl = compressedDataUrl;
          updateGiftImagePreview(compressedDataUrl);
          showToast('Photo prête !', 'success');
        } catch (err) {
          showToast(err.message || 'Erreur lors du traitement de l’image.', 'error');
        }
      });
    }
    if (clearImageBtn) {
      clearImageBtn.addEventListener('click', () => {
        state.uploadedImageDataUrl = '';
        if (imageUrlInput) imageUrlInput.value = '';
        if (imageFileInput) imageFileInput.value = '';
        updateGiftImagePreview('');
      });
    }

    // Soumission du formulaire Cadeau (Ajout / Modification)
    const giftForm = document.getElementById('form-gift');
    if (giftForm) {
      giftForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!state.currentUser) return;

        const giftId = document.getElementById('gift-id').value.trim();
        const ownerId = document.getElementById('gift-owner-id').value.trim() || state.currentUser.id;
        const title = document.getElementById('gift-title-input').value.trim();
        const priceRaw = document.getElementById('gift-price-input').value;
        const url = document.getElementById('gift-link-input').value.trim();
        const description = document.getElementById('gift-desc-input').value.trim();

        const finalImageUrl =
          state.imageInputMode === 'upload' && state.uploadedImageDataUrl
            ? state.uploadedImageDataUrl
            : document.getElementById('gift-image-url-input').value.trim();

        try {
          if (giftId) {
            await window.GiftDB.updateGift(giftId, {
              title,
              price: priceRaw,
              url,
              description,
              image_url: finalImageUrl
            });
            showToast('Souhait mis à jour avec succès !', 'success');
          } else {
            await window.GiftDB.createGift({
              owner_id: ownerId,
              title,
              price: priceRaw,
              url,
              description,
              image_url: finalImageUrl
            });
            showToast('🎁 Nouveau souhait ajouté à ta liste !', 'success');
          }
          closeModal('modal-gift');
          await reloadGiftsAndMembers();
        } catch (err) {
          showToast(err.message || 'Impossible d’enregistrer ce souhait.', 'error');
        }
      });
    }

    // Confirmation de suppression de souhait
    const confirmDeleteGiftBtn = document.getElementById('btn-confirm-delete-gift');
    if (confirmDeleteGiftBtn) {
      confirmDeleteGiftBtn.addEventListener('click', async () => {
        if (!state.pendingDeleteGift) return;
        const target = state.pendingDeleteGift;
        state.pendingDeleteGift = null;
        try {
          await window.GiftDB.deleteGift(target.id);
          closeModal('modal-delete-gift');
          await reloadGiftsAndMembers();
          showToast('Souhait supprimé. Pense à prévenir la famille !', 'warning');
        } catch (err) {
          showToast(err.message || 'Impossible de supprimer ce souhait.', 'error');
        }
      });
    }

    // Admin : Ouvrir modale d'ajout de membre
    const adminAddMemberBtn = document.getElementById('btn-admin-add-member');
    if (adminAddMemberBtn) {
      adminAddMemberBtn.addEventListener('click', () => openMemberModal(null));
    }

    //Sélecteur rapide d'emojis dans la modale Membre
    document.querySelectorAll('#emoji-presets [data-emoji]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const emoji = btn.getAttribute('data-emoji');
        const input = document.getElementById('member-avatar-input');
        if (input) input.value = emoji;
      });
    });

    // Régénérer le token dans la modale Membre
    const regenTokenBtn = document.getElementById('btn-regenerate-token');
    if (regenTokenBtn) {
      regenTokenBtn.addEventListener('click', () => {
        const nameInput = document.getElementById('member-name-input');
        const tokenInput = document.getElementById('member-token-input');
        if (tokenInput && window.GiftDB.generateToken) {
          tokenInput.value = window.GiftDB.generateToken(nameInput.value || 'membre');
        }
      });
    }

    // Soumission du formulaire Membre (Ajout / Modification Admin)
    const memberForm = document.getElementById('form-member');
    if (memberForm) {
      memberForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const memberId = document.getElementById('member-id').value.trim();
        const name = document.getElementById('member-name-input').value.trim();
        const avatar = document.getElementById('member-avatar-input').value.trim() || '🎅';
        const customToken = document.getElementById('member-token-input').value.trim();
        const isAdmin = document.getElementById('member-admin-checkbox').checked;

        try {
          if (memberId) {
            await window.GiftDB.updateMember(memberId, {
              name,
              avatar,
              is_admin: isAdmin,
              customToken: customToken || null
            });
            showToast(`Profil de ${name} mis à jour !`, 'success');
          } else {
            await window.GiftDB.createMember({
              name,
              avatar,
              is_admin: isAdmin,
              customToken: customToken || null
            });
            showToast(`Membre ${avatar} ${name} ajouté à la famille !`, 'success');
          }
          closeModal('modal-member');
          await reloadGiftsAndMembers();
        } catch (err) {
          showToast(err.message || 'Erreur lors de l’enregistrement du membre.', 'error');
        }
      });
    }

    // Admin : Configuration Supabase
    const supabaseForm = document.getElementById('form-supabase-config');
    if (supabaseForm) {
      supabaseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const url = document.getElementById('input-supabase-url').value.trim();
        const anonKey = document.getElementById('input-supabase-key').value.trim();
        if (!url || !anonKey) {
          showToast('Renseigne l’URL et la clé Anon Supabase.', 'warning');
          return;
        }
        try {
          await window.GiftDB.setSupabaseConfig(url, anonKey);
          await refreshDataAndAuthenticate();
          showToast('Connexion à Supabase configurée !', 'success');
        } catch (err) {
          showToast(err.message || 'Erreur de connexion à Supabase.', 'error');
        }
      });
    }

    const disconnectSupabaseBtn = document.getElementById('btn-disconnect-supabase');
    if (disconnectSupabaseBtn) {
      disconnectSupabaseBtn.addEventListener('click', async () => {
        await window.GiftDB.setSupabaseConfig('', '');
        localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
        await refreshDataAndAuthenticate();
        showToast('Bascule en mode Démo local effectuée.', 'info');
      });
    }

    const resetDemoBtn = document.getElementById('btn-reset-demo-data');
    if (resetDemoBtn) {
      resetDemoBtn.addEventListener('click', async () => {
        const confirmed = window.confirm(
          'Réinitialiser toutes les données de démonstration (membres, cadeaux et réservations) ?'
        );
        if (!confirmed) return;
        await window.GiftDB.resetDemoData();
        localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
        await refreshDataAndAuthenticate();
        showToast('Données de démonstration réinitialisées !', 'success');
      });
    }
  }

  // Démarrage au chargement du DOM
  document.addEventListener('DOMContentLoaded', () => {
    bindGlobalEvents();
    initApp();
  });
})();
