-- =============================================================================
-- Noël en Famille 2026 - Schéma PostgreSQL complet pour Supabase
-- =============================================================================
-- Instructions :
-- 1. Ouvrez votre projet Supabase -> SQL Editor -> New Query
-- 2. Collez l'intégralité de ce script et cliquez sur "Run"
-- =============================================================================

-- Extension pour la génération d'UUID (activée par défaut sur Supabase)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. Table `members` (Membres de la famille)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    avatar TEXT DEFAULT '🎅',
    token TEXT UNIQUE NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.members IS 'Membres de la famille participant à Noël 2026, authentifiés par magic link (token).';
COMMENT ON COLUMN public.members.token IS 'Jeton unique utilisé dans l''URL (?token=...) pour identifier le membre.';

-- -----------------------------------------------------------------------------
-- 2. Table `gifts` (Idées de cadeaux & réservations)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    url TEXT,
    price NUMERIC(10, 2),
    image_url TEXT,
    reserved_by_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
    reserved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT gifts_no_self_reservation CHECK (owner_id IS DISTINCT FROM reserved_by_id)
);

COMMENT ON TABLE public.gifts IS 'Liste des souhaits de cadeaux et état de réservation.';
COMMENT ON CONSTRAINT gifts_no_self_reservation ON public.gifts IS 'Empêche un membre de réserver son propre cadeau.';

-- -----------------------------------------------------------------------------
-- 3. Index de performance
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_members_token ON public.members(token);
CREATE INDEX IF NOT EXISTS idx_gifts_owner_id ON public.gifts(owner_id);
CREATE INDEX IF NOT EXISTS idx_gifts_reserved_by_id ON public.gifts(reserved_by_id);

-- -----------------------------------------------------------------------------
-- 4. Row Level Security (RLS)
-- -----------------------------------------------------------------------------
-- Note d'architecture :
-- Cette application familiale (5-6 utilisateurs de confiance) utilise des "magic links"
-- (?token=...) sans création de compte ni mot de passe. Le client Supabase interroge
-- l'API avec le rôle `anon`. Nous activons RLS pour respecter les bonnes pratiques
-- Supabase et déclarons des politiques permissives pour le rôle `anon`.
-- Le filtrage métier et la protection Anti-Spoiler stricte sont gérés dans l'application,
-- complétés par la contrainte SQL `gifts_no_self_reservation`.

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;

-- Nettoyage des politiques existantes en cas de ré-exécution du script
DROP POLICY IF EXISTS "Allow anon select members" ON public.members;
DROP POLICY IF EXISTS "Allow anon insert members" ON public.members;
DROP POLICY IF EXISTS "Allow anon update members" ON public.members;
DROP POLICY IF EXISTS "Allow anon delete members" ON public.members;

DROP POLICY IF EXISTS "Allow anon select gifts" ON public.gifts;
DROP POLICY IF EXISTS "Allow anon insert gifts" ON public.gifts;
DROP POLICY IF EXISTS "Allow anon update gifts" ON public.gifts;
DROP POLICY IF EXISTS "Allow anon delete gifts" ON public.gifts;

-- Politiques pour `members`
CREATE POLICY "Allow anon select members"
    ON public.members FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert members"
    ON public.members FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update members"
    ON public.members FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon delete members"
    ON public.members FOR DELETE TO anon USING (true);

-- Politiques pour `gifts`
CREATE POLICY "Allow anon select gifts"
    ON public.gifts FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert gifts"
    ON public.gifts FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update gifts"
    ON public.gifts FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon delete gifts"
    ON public.gifts FOR DELETE TO anon USING (true);

-- -----------------------------------------------------------------------------
-- 5. Données initiales (Seed SQL)
-- -----------------------------------------------------------------------------
-- Personnalisez les prénoms, avatars et tokens ci-dessous avant d'exécuter,
-- ou modifiez-les directement depuis l'interface Admin de l'application !

INSERT INTO public.members (name, avatar, token, is_admin)
VALUES
    ('Chris',  '🎄', 'chris-admin-2026', TRUE),
    ('Marie',  '🤶', 'marie-noel-2026',  FALSE),
    ('Thomas', '🦌', 'thomas-noel-2026', FALSE),
    ('Sophie', '⛄', 'sophie-noel-2026', FALSE),
    ('Lucas',  '🎁', 'lucas-noel-2026',  FALSE),
    ('Julie',  '🌟', 'julie-noel-2026',  FALSE)
ON CONFLICT (token) DO NOTHING;
