/**
 * GiftDB - Couche d'abstraction Base de Données pour Noël en Famille 2026
 * Supporte Supabase (PostgreSQL) ET un mode Démo complet via localStorage.
 * Implémente la règle stricte Anti-Spoiler : un membre (même Admin) ne voit
 * jamais si ses propres cadeaux sont réservés ni par qui.
 */
(function (window) {
  'use strict';

  const STORAGE_KEYS = {
    SUPABASE_CONFIG: 'noel_supabase_config',
    DEMO_MEMBERS: 'noel_demo_members',
    DEMO_GIFTS: 'noel_demo_gifts'
  };

  let _mode = 'demo'; // 'supabase' | 'demo'
  let _supabase = null;
  let _supabaseConfig = { url: '', anonKey: '' };

  // ===========================================================================
  // DONNÉES DE DÉMONSTRATION INITIALES
  // ===========================================================================

  function getInitialDemoMembers() {
    const baseTime = new Date('2026-11-01T10:00:00.000Z').getTime();
    return [
      {
        id: 'member-chris',
        name: 'Chris (Admin)',
        avatar: '🎅',
        token: 'chris-admin',
        is_admin: true,
        created_at: new Date(baseTime).toISOString()
      },
      {
        id: 'member-marie',
        name: 'Marie',
        avatar: '🤶',
        token: 'marie-noel',
        is_admin: false,
        created_at: new Date(baseTime + 60000).toISOString()
      },
      {
        id: 'member-thomas',
        name: 'Thomas',
        avatar: '🦌',
        token: 'thomas-lutin',
        is_admin: false,
        created_at: new Date(baseTime + 120000).toISOString()
      },
      {
        id: 'member-lea',
        name: 'Léa',
        avatar: '⛄',
        token: 'lea-etoile',
        is_admin: false,
        created_at: new Date(baseTime + 180000).toISOString()
      },
      {
        id: 'member-parents',
        name: 'Parents',
        avatar: '🎄',
        token: 'parents-sapin',
        is_admin: false,
        created_at: new Date(baseTime + 240000).toISOString()
      }
    ];
  }

  function getInitialDemoGifts() {
    const baseTime = new Date('2026-11-02T14:00:00.000Z').getTime();
    return [
      // Cadeaux de Chris (dont un réservé par Marie pour vérifier l'anti-spoiler !)
      {
        id: 'gift-chris-1',
        owner_id: 'member-chris',
        title: 'Casque audio Bluetooth à réduction de bruit',
        description: 'Modèle circum-auriculaire noir mat, idéal pour travailler au calme et écouter de la musique en voyage.',
        url: 'https://www.fnac.com',
        price: 249.00,
        image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80',
        reserved_by_id: 'member-marie',
        reserved_at: new Date(baseTime + 3600000).toISOString(),
        created_at: new Date(baseTime).toISOString()
      },
      {
        id: 'gift-chris-2',
        owner_id: 'member-chris',
        title: 'Moulin à café manuel en inox',
        description: 'Avec meules coniques en acier pour expresso et méthodes douces (V60 / Chemex).',
        url: 'https://www.maxicoffee.com',
        price: 89.90,
        image_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
        reserved_by_id: null,
        reserved_at: null,
        created_at: new Date(baseTime + 60000).toISOString()
      },
      // Cadeaux de Marie
      {
        id: 'gift-marie-1',
        owner_id: 'member-marie',
        title: 'Coffret infuseur à thé & thés grands crus d’hiver',
        description: 'Assortiment de thés noirs aux épices de Noël, rooibos vanille et thé vert au jasmin.',
        url: 'https://www.palaisdesthes.com',
        price: 45.00,
        image_url: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80',
        reserved_by_id: 'member-chris',
        reserved_at: new Date(baseTime + 7200000).toISOString(),
        created_at: new Date(baseTime + 120000).toISOString()
      },
      {
        id: 'gift-marie-2',
        owner_id: 'member-marie',
        title: 'Plaid en laine mérinos terracotta',
        description: 'Bien grand et tout doux pour les soirées lecture sur le canapé.',
        url: '',
        price: 75.00,
        image_url: 'https://images.unsplash.com/photo-1580301762395-21ce84d00bc6?auto=format&fit=crop&w=600&q=80',
        reserved_by_id: null,
        reserved_at: null,
        created_at: new Date(baseTime + 180000).toISOString()
      },
      // Cadeaux de Thomas
      {
        id: 'gift-thomas-1',
        owner_id: 'member-thomas',
        title: 'Jeu de société Les Aventuriers du Rail : Europe',
        description: 'Version édition 15e anniversaire ou classique pour nos soirées jeux en famille !',
        url: 'https://www.philibertnet.com',
        price: 49.90,
        image_url: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=600&q=80',
        reserved_by_id: 'member-marie',
        reserved_at: new Date(baseTime + 10800000).toISOString(),
        created_at: new Date(baseTime + 240000).toISOString()
      },
      {
        id: 'gift-thomas-2',
        owner_id: 'member-thomas',
        title: 'Sac à dos de randonnée 25L imperméable',
        description: 'Couleur vert forêt ou bleu marine, avec housse de pluie intégrée.',
        url: 'https://www.decathlon.fr',
        price: 65.00,
        image_url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80',
        reserved_by_id: null,
        reserved_at: null,
        created_at: new Date(baseTime + 300000).toISOString()
      },
      // Cadeaux de Léa
      {
        id: 'gift-lea-1',
        owner_id: 'member-lea',
        title: 'Appareil photo instantané Instax Mini + pellicules',
        description: 'Coloris vert sauge ou lilas, avec un pack de 20 films pour immortaliser le réveillon.',
        url: 'https://www.fnac.com',
        price: 89.00,
        image_url: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=600&q=80',
        reserved_by_id: null,
        reserved_at: null,
        created_at: new Date(baseTime + 360000).toISOString()
      },
      {
        id: 'gift-lea-2',
        owner_id: 'member-lea',
        title: 'Carnet d’aquarelle + boîte de 24 godets',
        description: 'Papier 100% coton grain fin 300g/m², format A5 paysage.',
        url: 'https://www.cultura.com',
        price: 38.50,
        image_url: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=600&q=80',
        reserved_by_id: 'member-chris',
        reserved_at: new Date(baseTime + 14400000).toISOString(),
        created_at: new Date(baseTime + 420000).toISOString()
      },
      // Cadeaux des Parents
      {
        id: 'gift-parents-1',
        owner_id: 'member-parents',
        title: 'Cocotte en fonte émaillée 26 cm',
        description: 'Couleur rouge cerise ou crème, compatible induction pour mijoter de bons petits plats.',
        url: '',
        price: 195.00,
        image_url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=600&q=80',
        reserved_by_id: null,
        reserved_at: null,
        created_at: new Date(baseTime + 480000).toISOString()
      },
      {
        id: 'gift-parents-2',
        owner_id: 'member-parents',
        title: 'Coffret dégustation vins & produits du terroir',
        description: 'Deux belles bouteilles accompagnées de terrines artisanales et chocolats noirs.',
        url: '',
        price: 69.00,
        image_url: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=600&q=80',
        reserved_by_id: 'member-thomas',
        reserved_at: new Date(baseTime + 18000000).toISOString(),
        created_at: new Date(baseTime + 540000).toISOString()
      }
    ];
  }

  // ===========================================================================
  // UTILITAIRES INTERNES
  // ===========================================================================

  function generateUuid() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function readDemoMembers() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DEMO_MEMBERS);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch (e) {
      console.warn('Impossible de lire noel_demo_members:', e);
      return null;
    }
  }

  function writeDemoMembers(members) {
    localStorage.setItem(STORAGE_KEYS.DEMO_MEMBERS, JSON.stringify(members));
  }

  function readDemoGifts() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DEMO_GIFTS);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch (e) {
      console.warn('Impossible de lire noel_demo_gifts:', e);
      return null;
    }
  }

  function writeDemoGifts(gifts) {
    localStorage.setItem(STORAGE_KEYS.DEMO_GIFTS, JSON.stringify(gifts));
  }

  function ensureDemoSeeded() {
    let members = readDemoMembers();
    let gifts = readDemoGifts();
    if (!members || members.length === 0) {
      members = getInitialDemoMembers();
      writeDemoMembers(members);
    }
    if (!gifts) {
      gifts = getInitialDemoGifts();
      writeDemoGifts(gifts);
    }
  }

  function sanitizeSupabaseUrl(rawUrl) {
    return String(rawUrl || '')
      .trim()
      .replace(/\/rest\/v1\/?$/i, '')
      .replace(/\/+$/, '');
  }

  function resolveSupabaseCredentials() {
    let url = '';
    let anonKey = '';

    // 1. Vérifier localStorage en priorité (configuration saisie via l'interface Admin)
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SUPABASE_CONFIG);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.url === 'string' && typeof parsed.anonKey === 'string') {
          url = sanitizeSupabaseUrl(parsed.url);
          anonKey = parsed.anonKey.trim();
        }
      }
    } catch (e) {
      console.warn('Erreur lecture noel_supabase_config:', e);
    }

    // 2. Sinon vérifier window.APP_CONFIG
    if ((!url || !anonKey) && window.APP_CONFIG) {
      const cfgUrl = sanitizeSupabaseUrl(window.APP_CONFIG.SUPABASE_URL || '');
      const cfgKey = (window.APP_CONFIG.SUPABASE_ANON_KEY || '').trim();
      if (cfgUrl && cfgKey) {
        url = cfgUrl;
        anonKey = cfgKey;
      }
    }

    return { url, anonKey };
  }

  function normalizePrice(price) {
    if (price === null || price === undefined || price === '') {
      return null;
    }
    const num = typeof price === 'number' ? price : parseFloat(String(price).replace(',', '.'));
    if (Number.isNaN(num) || num < 0) {
      return null;
    }
    return Math.round(num * 100) / 100;
  }

  /**
   * Applique la règle stricte ANTI-SPOILER sur un cadeau enrichi
   */
  function applyAntiSpoiler(gift, currentMemberId, membersMap) {
    const owner = membersMap.get(String(gift.owner_id)) || null;
    const isOwnGift = Boolean(
      currentMemberId && String(gift.owner_id) === String(currentMemberId)
    );

    const ownerName = gift.owner_name || (owner ? owner.name : 'Membre inconnu');
    const ownerAvatar = gift.owner_avatar || (owner ? owner.avatar : '🎁');

    if (isOwnGift) {
      return {
        id: gift.id,
        owner_id: gift.owner_id,
        owner_name: ownerName,
        owner_avatar: ownerAvatar,
        title: gift.title,
        description: gift.description || '',
        url: gift.url || '',
        price: normalizePrice(gift.price),
        image_url: gift.image_url || '',
        created_at: gift.created_at,
        is_own_gift: true,
        reserved_by_id: null,
        reserved_by_name: null,
        reserved_by_avatar: null,
        reserved_at: null
      };
    }

    const reserver = gift.reserved_by_id
      ? membersMap.get(String(gift.reserved_by_id)) || null
      : null;

    const reservedByName = gift.reserved_by_id
      ? gift.reserved_by_name || (reserver ? reserver.name : 'Un lutin')
      : null;
    const reservedByAvatar = gift.reserved_by_id
      ? gift.reserved_by_avatar || (reserver ? reserver.avatar : '🎁')
      : null;

    return {
      id: gift.id,
      owner_id: gift.owner_id,
      owner_name: ownerName,
      owner_avatar: ownerAvatar,
      title: gift.title,
      description: gift.description || '',
      url: gift.url || '',
      price: normalizePrice(gift.price),
      image_url: gift.image_url || '',
      created_at: gift.created_at,
      is_own_gift: false,
      reserved_by_id: gift.reserved_by_id || null,
      reserved_by_name: reservedByName,
      reserved_by_avatar: reservedByAvatar,
      reserved_at: gift.reserved_by_id ? (gift.reserved_at || null) : null
    };
  }

  // ===========================================================================
  // API PUBLIQUE window.GiftDB
  // ===========================================================================

  const GiftDB = {
    /**
     * Initialise la connexion Supabase ou active le mode Démo local.
     */
    async init() {
      _supabaseConfig = resolveSupabaseCredentials();

      if (
        _supabaseConfig.url &&
        _supabaseConfig.anonKey &&
        window.supabase &&
        typeof window.supabase.createClient === 'function'
      ) {
        try {
          _supabase = window.supabase.createClient(
            _supabaseConfig.url,
            _supabaseConfig.anonKey
          );
          _mode = 'supabase';
          return _mode;
        } catch (err) {
          console.error('Erreur initialisation Supabase, bascule en mode Démo :', err);
        }
      }

      _supabase = null;
      _mode = 'demo';
      ensureDemoSeeded();
      return _mode;
    },

    /**
     * Retourne le mode actif : 'supabase' ou 'demo'
     */
    getMode() {
      return _mode;
    },

    /**
     * Retourne la configuration Supabase active { url, anonKey }
     */
    getSupabaseConfig() {
      return {
        url: _supabaseConfig.url || '',
        anonKey: _supabaseConfig.anonKey || ''
      };
    },

    /**
     * Enregistre ou efface la configuration Supabase dans localStorage et réinitialise GiftDB
     */
    async setSupabaseConfig(url, anonKey) {
      let nextUrl = url;
      let nextKey = anonKey;
      if (url && typeof url === 'object') {
        nextUrl = url.url;
        nextKey = url.anonKey;
      }
      const cleanUrl = (nextUrl || '').trim();
      const cleanKey = (nextKey || '').trim();

      if (cleanUrl && cleanKey) {
        localStorage.setItem(
          STORAGE_KEYS.SUPABASE_CONFIG,
          JSON.stringify({ url: cleanUrl, anonKey: cleanKey })
        );
      } else {
        localStorage.removeItem(STORAGE_KEYS.SUPABASE_CONFIG);
      }

      return await this.init();
    },

    /**
     * Réinitialise les données de démonstration dans localStorage
     */
    async resetDemoData() {
      localStorage.removeItem(STORAGE_KEYS.DEMO_MEMBERS);
      localStorage.removeItem(STORAGE_KEYS.DEMO_GIFTS);
      const members = getInitialDemoMembers();
      const gifts = getInitialDemoGifts();
      writeDemoMembers(members);
      writeDemoGifts(gifts);
      return { members, gifts };
    },

    /**
     * Génère un code / token unique lisible à partir d'un prénom (ex: "marie-8f2a")
     */
    generateToken(name) {
      const base = String(name || 'lutin')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 16) || 'lutin';

      const chars = '0123456789abcdef';
      let suffix = '';
      for (let i = 0; i < 4; i++) {
        suffix += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return `${base}-${suffix}`;
    },

    /**
     * Recherche un membre par son token personnel (insensible à la casse et aux espaces)
     */
    async getMemberByToken(token) {
      if (!token || typeof token !== 'string') {
        return null;
      }
      const cleanToken = token.trim().toLowerCase();
      if (!cleanToken) {
        return null;
      }

      if (_mode === 'supabase' && _supabase) {
        const { data, error } = await _supabase
          .from('members')
          .select('id, name, avatar, token, is_admin, created_at')
          .ilike('token', cleanToken)
          .maybeSingle();

        if (error) {
          console.error('Erreur Supabase getMemberByToken:', error);
          throw new Error(error.message || 'Impossible de vérifier le code secret.');
        }
        return data || null;
      }

      ensureDemoSeeded();
      const members = readDemoMembers() || [];
      const found = members.find(
        (m) => String(m.token || '').trim().toLowerCase() === cleanToken
      );
      return found ? { ...found } : null;
    },

    /**
     * Récupère tous les membres de la famille
     */
    async getMembers() {
      if (_mode === 'supabase' && _supabase) {
        const { data, error } = await _supabase
          .from('members')
          .select('id, name, avatar, token, is_admin, created_at')
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Erreur Supabase getMembers:', error);
          throw new Error(error.message || 'Impossible de charger les membres.');
        }
        return data || [];
      }

      ensureDemoSeeded();
      const members = readDemoMembers() || [];
      return members
        .slice()
        .sort((a, b) => {
          const tA = new Date(a.created_at || 0).getTime();
          const tB = new Date(b.created_at || 0).getTime();
          if (tA !== tB) return tA - tB;
          return String(a.name).localeCompare(String(b.name), 'fr');
        })
        .map((m) => ({ ...m }));
    },

    /**
     * Crée un nouveau membre
     */
    async createMember({ name, avatar = '🎁', is_admin = false, customToken = null, token = null } = {}) {
      const cleanName = String(name || '').trim();
      if (!cleanName) {
        throw new Error('Le prénom du membre est obligatoire.');
      }
      const cleanAvatar = String(avatar || '🎁').trim() || '🎁';
      const rawToken = customToken || token;
      const finalToken = rawToken && String(rawToken).trim()
        ? String(rawToken)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9-]+/g, '-')
            .replace(/^-+|-+$/g, '')
        : this.generateToken(cleanName);

      if (_mode === 'supabase' && _supabase) {
        const { data, error } = await _supabase
          .from('members')
          .insert([
            {
              name: cleanName,
              avatar: cleanAvatar,
              token: finalToken,
              is_admin: Boolean(is_admin)
            }
          ])
          .select('id, name, avatar, token, is_admin, created_at')
          .single();

        if (error) {
          console.error('Erreur Supabase createMember:', error);
          if (error.code === '23505') {
            throw new Error('Ce code secret est déjà utilisé par un autre membre.');
          }
          throw new Error(error.message || 'Impossible de créer le membre.');
        }
        return data;
      }

      ensureDemoSeeded();
      const members = readDemoMembers() || [];
      const tokenExists = members.some(
        (m) => String(m.token).toLowerCase() === finalToken.toLowerCase()
      );
      if (tokenExists) {
        throw new Error('Ce code secret est déjà utilisé par un autre membre.');
      }

      const newMember = {
        id: generateUuid(),
        name: cleanName,
        avatar: cleanAvatar,
        token: finalToken,
        is_admin: Boolean(is_admin),
        created_at: new Date().toISOString()
      };
      members.push(newMember);
      writeDemoMembers(members);
      return { ...newMember };
    },

    /**
     * Met à jour un membre existant
     */
    async updateMember(id, { name, avatar, is_admin, regenerateToken = false, customToken = null } = {}) {
      if (!id) {
        throw new Error('Identifiant de membre manquant.');
      }

      if (_mode === 'supabase' && _supabase) {
        const updates = {};
        if (name !== undefined) {
          const cleanName = String(name).trim();
          if (!cleanName) throw new Error('Le prénom ne peut pas être vide.');
          updates.name = cleanName;
        }
        if (avatar !== undefined) {
          updates.avatar = String(avatar).trim() || '🎁';
        }
        if (is_admin !== undefined) {
          updates.is_admin = Boolean(is_admin);
        }
        if (customToken && String(customToken).trim()) {
          updates.token = String(customToken)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9-]+/g, '-')
            .replace(/^-+|-+$/g, '');
        } else if (regenerateToken) {
          updates.token = this.generateToken(updates.name || 'membre');
        }

        const { data, error } = await _supabase
          .from('members')
          .update(updates)
          .eq('id', id)
          .select('id, name, avatar, token, is_admin, created_at')
          .single();

        if (error) {
          console.error('Erreur Supabase updateMember:', error);
          throw new Error(error.message || 'Impossible de mettre à jour le membre.');
        }
        return data;
      }

      ensureDemoSeeded();
      const members = readDemoMembers() || [];
      const idx = members.findIndex((m) => String(m.id) === String(id));
      if (idx === -1) {
        throw new Error('Membre introuvable.');
      }

      const current = { ...members[idx] };
      if (name !== undefined) {
        const cleanName = String(name).trim();
        if (!cleanName) throw new Error('Le prénom ne peut pas être vide.');
        current.name = cleanName;
      }
      if (avatar !== undefined) {
        current.avatar = String(avatar).trim() || '🎁';
      }
      if (is_admin !== undefined) {
        current.is_admin = Boolean(is_admin);
      }
      if (customToken && String(customToken).trim()) {
        const cleanCustom = String(customToken)
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/[^a-z0-9-]+/g, '-')
          .replace(/^-+|-+$/g, '');
        const duplicate = members.some(
          (m, i) => i !== idx && String(m.token).toLowerCase() === cleanCustom
        );
        if (duplicate) {
          throw new Error('Ce code secret est déjà utilisé par un autre membre.');
        }
        current.token = cleanCustom;
      } else if (regenerateToken) {
        current.token = this.generateToken(current.name);
      }

      members[idx] = current;
      writeDemoMembers(members);
      return { ...current };
    },

    /**
     * Supprime un membre et gère la cascade sur ses cadeaux et réservations
     */
    async deleteMember(id) {
      if (!id) {
        throw new Error('Identifiant de membre manquant.');
      }

      if (_mode === 'supabase' && _supabase) {
        const { error } = await _supabase
          .from('members')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('Erreur Supabase deleteMember:', error);
          throw new Error(error.message || 'Impossible de supprimer ce membre.');
        }
        return true;
      }

      ensureDemoSeeded();
      const members = readDemoMembers() || [];
      const filteredMembers = members.filter((m) => String(m.id) !== String(id));
      writeDemoMembers(filteredMembers);

      // ON DELETE CASCADE pour owner_id & ON DELETE SET NULL pour reserved_by_id
      const gifts = readDemoGifts() || [];
      const updatedGifts = gifts
        .filter((g) => String(g.owner_id) !== String(id))
        .map((g) => {
          if (String(g.reserved_by_id) === String(id)) {
            return {
              ...g,
              reserved_by_id: null,
              reserved_at: null
            };
          }
          return g;
        });
      writeDemoGifts(updatedGifts);
      return true;
    },

    /**
     * Récupère tous les cadeaux en appliquant la règle ANTI-SPOILER pour currentMemberId.
     * Même un administrateur ne peut pas voir si ses propres cadeaux sont réservés.
     */
    async getGifts(currentMemberId = null) {
      const members = await this.getMembers();
      const membersMap = new Map(members.map((m) => [String(m.id), m]));

      if (_mode === 'supabase' && _supabase) {
        const { data, error } = await _supabase
          .from('gifts')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Erreur Supabase getGifts:', error);
          throw new Error(error.message || 'Impossible de charger la liste des cadeaux.');
        }

        return (data || []).map((gift) =>
          applyAntiSpoiler(gift, currentMemberId, membersMap)
        );
      }

      ensureDemoSeeded();
      const gifts = readDemoGifts() || [];
      return gifts
        .slice()
        .sort((a, b) => {
          const tA = new Date(a.created_at || 0).getTime();
          const tB = new Date(b.created_at || 0).getTime();
          return tB - tA;
        })
        .map((gift) => applyAntiSpoiler(gift, currentMemberId, membersMap));
    },

    /**
     * Crée un nouveau cadeau
     */
    async createGift({ owner_id, title, description = '', url = '', price = null, image_url = '' } = {}) {
      if (!owner_id) {
        throw new Error('Le destinataire du cadeau est obligatoire.');
      }
      const cleanTitle = String(title || '').trim();
      if (!cleanTitle) {
        throw new Error('Le titre du cadeau est obligatoire.');
      }

      const payload = {
        owner_id,
        title: cleanTitle,
        description: String(description || '').trim(),
        url: String(url || '').trim(),
        price: normalizePrice(price),
        image_url: String(image_url || '').trim()
      };

      if (_mode === 'supabase' && _supabase) {
        const { data, error } = await _supabase
          .from('gifts')
          .insert([payload])
          .select('*')
          .single();

        if (error) {
          console.error('Erreur Supabase createGift:', error);
          throw new Error(error.message || 'Impossible d’ajouter le cadeau.');
        }
        return data;
      }

      ensureDemoSeeded();
      const gifts = readDemoGifts() || [];
      const newGift = {
        id: generateUuid(),
        ...payload,
        reserved_by_id: null,
        reserved_at: null,
        created_at: new Date().toISOString()
      };
      gifts.push(newGift);
      writeDemoGifts(gifts);
      return { ...newGift };
    },

    /**
     * Met à jour les détails d'un cadeau (sans toucher à reserved_by_id ni reserved_at)
     */
    async updateGift(giftId, { title, description, url, price, image_url } = {}) {
      if (!giftId) {
        throw new Error('Identifiant du cadeau manquant.');
      }

      const updates = {};
      if (title !== undefined) {
        const cleanTitle = String(title || '').trim();
        if (!cleanTitle) {
          throw new Error('Le titre du cadeau est obligatoire.');
        }
        updates.title = cleanTitle;
      }
      if (description !== undefined) {
        updates.description = String(description || '').trim();
      }
      if (url !== undefined) {
        updates.url = String(url || '').trim();
      }
      if (price !== undefined) {
        updates.price = normalizePrice(price);
      }
      if (image_url !== undefined) {
        updates.image_url = String(image_url || '').trim();
      }

      if (_mode === 'supabase' && _supabase) {
        const { data, error } = await _supabase
          .from('gifts')
          .update(updates)
          .eq('id', giftId)
          .select('*')
          .single();

        if (error) {
          console.error('Erreur Supabase updateGift:', error);
          throw new Error(error.message || 'Impossible de modifier ce cadeau.');
        }
        return data;
      }

      ensureDemoSeeded();
      const gifts = readDemoGifts() || [];
      const idx = gifts.findIndex((g) => String(g.id) === String(giftId));
      if (idx === -1) {
        throw new Error('Cadeau introuvable.');
      }

      // Préserve explicitement reserved_by_id, reserved_at et owner_id
      const updated = {
        ...gifts[idx],
        ...updates
      };
      gifts[idx] = updated;
      writeDemoGifts(gifts);
      return { ...updated };
    },

    /**
     * Supprime un cadeau
     */
    async deleteGift(giftId) {
      if (!giftId) {
        throw new Error('Identifiant du cadeau manquant.');
      }

      if (_mode === 'supabase' && _supabase) {
        const { error } = await _supabase
          .from('gifts')
          .delete()
          .eq('id', giftId);

        if (error) {
          console.error('Erreur Supabase deleteGift:', error);
          throw new Error(error.message || 'Impossible de supprimer ce cadeau.');
        }
        return true;
      }

      ensureDemoSeeded();
      const gifts = readDemoGifts() || [];
      const filtered = gifts.filter((g) => String(g.id) !== String(giftId));
      writeDemoGifts(filtered);
      return true;
    },

    /**
     * Réserve un cadeau pour memberId.
     * Vérifie que memberId n'est pas le propriétaire et que le cadeau est encore disponible.
     */
    async reserveGift(giftId, memberId) {
      if (!giftId || !memberId) {
        throw new Error('Paramètres de réservation incomplets.');
      }

      const nowIso = new Date().toISOString();

      if (_mode === 'supabase' && _supabase) {
        // 1. Vérifier l'état actuel du cadeau
        const { data: existing, error: fetchError } = await _supabase
          .from('gifts')
          .select('id, owner_id, reserved_by_id')
          .eq('id', giftId)
          .maybeSingle();

        if (fetchError) {
          console.error('Erreur Supabase reserveGift (fetch):', fetchError);
          throw new Error(fetchError.message || 'Impossible de vérifier le cadeau.');
        }
        if (!existing) {
          throw new Error('Ce cadeau n’existe plus.');
        }
        if (String(existing.owner_id) === String(memberId)) {
          throw new Error('Vous ne pouvez pas réserver votre propre cadeau !');
        }
        if (existing.reserved_by_id) {
          throw new Error('Ce cadeau est déjà réservé par un autre membre.');
        }

        // 2. Mise à jour atomique conditionnelle (.is('reserved_by_id', null))
        const { data: updatedRows, error: updateError } = await _supabase
          .from('gifts')
          .update({
            reserved_by_id: memberId,
            reserved_at: nowIso
          })
          .eq('id', giftId)
          .is('reserved_by_id', null)
          .select('*');

        if (updateError) {
          console.error('Erreur Supabase reserveGift (update):', updateError);
          throw new Error(updateError.message || 'Impossible de réserver ce cadeau.');
        }
        if (!updatedRows || updatedRows.length === 0) {
          throw new Error('Ce cadeau vient tout juste d’être réservé par quelqu’un d’autre !');
        }
        return updatedRows[0];
      }

      ensureDemoSeeded();
      const gifts = readDemoGifts() || [];
      const idx = gifts.findIndex((g) => String(g.id) === String(giftId));
      if (idx === -1) {
        throw new Error('Ce cadeau n’existe plus.');
      }

      const target = gifts[idx];
      if (String(target.owner_id) === String(memberId)) {
        throw new Error('Vous ne pouvez pas réserver votre propre cadeau !');
      }
      if (target.reserved_by_id) {
        throw new Error('Ce cadeau est déjà réservé par un autre membre.');
      }

      const updated = {
        ...target,
        reserved_by_id: memberId,
        reserved_at: nowIso
      };
      gifts[idx] = updated;
      writeDemoGifts(gifts);
      return { ...updated };
    },

    /**
     * Annule la réservation d'un cadeau.
     * Autorisé uniquement si requestingMemberId est celui qui a réservé,
     * OU si isAdminForce === true ET que requestingMemberId n'est PAS le propriétaire du cadeau.
     */
    async unreserveGift(giftId, requestingMemberId, isAdminForce = false) {
      if (!giftId || !requestingMemberId) {
        throw new Error('Paramètres d’annulation incomplets.');
      }

      if (_mode === 'supabase' && _supabase) {
        const { data: existing, error: fetchError } = await _supabase
          .from('gifts')
          .select('id, owner_id, reserved_by_id')
          .eq('id', giftId)
          .maybeSingle();

        if (fetchError) {
          console.error('Erreur Supabase unreserveGift (fetch):', fetchError);
          throw new Error(fetchError.message || 'Impossible de vérifier le cadeau.');
        }
        if (!existing) {
          throw new Error('Ce cadeau n’existe plus.');
        }
        if (String(existing.owner_id) === String(requestingMemberId)) {
          throw new Error('Vous ne pouvez pas modifier la réservation de votre propre cadeau.');
        }

        const isReserver =
          existing.reserved_by_id &&
          String(existing.reserved_by_id) === String(requestingMemberId);
        const canForce =
          Boolean(isAdminForce) &&
          String(existing.owner_id) !== String(requestingMemberId);

        if (!isReserver && !canForce) {
          throw new Error('Seul le membre ayant réservé ce cadeau peut libérer la réservation.');
        }

        const { data, error: updateError } = await _supabase
          .from('gifts')
          .update({
            reserved_by_id: null,
            reserved_at: null
          })
          .eq('id', giftId)
          .select('*')
          .single();

        if (updateError) {
          console.error('Erreur Supabase unreserveGift (update):', updateError);
          throw new Error(updateError.message || 'Impossible d’annuler la réservation.');
        }
        return data;
      }

      ensureDemoSeeded();
      const gifts = readDemoGifts() || [];
      const idx = gifts.findIndex((g) => String(g.id) === String(giftId));
      if (idx === -1) {
        throw new Error('Ce cadeau n’existe plus.');
      }

      const target = gifts[idx];
      if (String(target.owner_id) === String(requestingMemberId)) {
        throw new Error('Vous ne pouvez pas modifier la réservation de votre propre cadeau.');
      }

      const isReserver =
        target.reserved_by_id &&
        String(target.reserved_by_id) === String(requestingMemberId);
      const canForce =
        Boolean(isAdminForce) &&
        String(target.owner_id) !== String(requestingMemberId);

      if (!isReserver && !canForce) {
        throw new Error('Seul le membre ayant réservé ce cadeau peut libérer la réservation.');
      }

      const updated = {
        ...target,
        reserved_by_id: null,
        reserved_at: null
      };
      gifts[idx] = updated;
      writeDemoGifts(gifts);
      return { ...updated };
    },

    /**
     * Redimensionne et compresse un fichier image (appareil photo / galerie mobile)
     * en Data URL JPEG léger via FileReader + Image + HTML5 Canvas.
     */
    async compressImageFile(file, maxWidth = 800, quality = 0.78) {
      if (!file) {
        throw new Error('Aucun fichier image sélectionné.');
      }
      if (!file.type || !file.type.startsWith('image/')) {
        throw new Error('Le fichier sélectionné doit être une image.');
      }

      return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onerror = () => {
          reject(new Error('Impossible de lire le fichier image.'));
        };

        reader.onload = (event) => {
          const img = new Image();

          img.onerror = () => {
            reject(new Error('Format d’image non reconnu ou corrompu.'));
          };

          img.onload = () => {
            try {
              let width = img.naturalWidth || img.width;
              let height = img.naturalHeight || img.height;

              if (!width || !height) {
                reject(new Error('Dimensions de l’image invalides.'));
                return;
              }

              if (width > maxWidth || height > maxWidth) {
                if (width >= height) {
                  height = Math.round((height * maxWidth) / width);
                  width = maxWidth;
                } else {
                  width = Math.round((width * maxWidth) / height);
                  height = maxWidth;
                }
              }

              const canvas = document.createElement('canvas');
              canvas.width = width;
              canvas.height = height;

              const ctx = canvas.getContext('2d');
              if (!ctx) {
                reject(new Error('Impossible d’initialiser le contexte graphique.'));
                return;
              }

              // Fond blanc pour éviter les transparences noires lors de l'export JPEG
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, width, height);
              ctx.drawImage(img, 0, 0, width, height);

              const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
              resolve(compressedDataUrl);
            } catch (err) {
              reject(new Error('Erreur lors de la compression de l’image.'));
            }
          };

          img.src = event.target.result;
        };

        reader.readAsDataURL(file);
      });
    }
  };

  window.GiftDB = GiftDB;
})(window);
