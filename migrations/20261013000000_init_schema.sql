-- ==============================================================================
-- ШУМ SOCIAL NETWORK — PRODUCTION SUPABASE POSTGRESQL SCHEMA WITH SECURE RLS
-- Project: https://ioxqhmnwegxdqxbfhwzg.supabase.co
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PROFILES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    password_hash TEXT,
    avatar_url TEXT DEFAULT '',
    avatar_emoji TEXT,
    bio TEXT DEFAULT '',
    skills TEXT[] DEFAULT '{}',
    is_verified BOOLEAN DEFAULT FALSE,
    is_blocked BOOLEAN DEFAULT FALSE,
    blocked_reason TEXT,
    blocked_at TIMESTAMPTZ,
    has_subscription BOOLEAN DEFAULT FALSE,
    subscription_label TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 2. FOLLOWS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (follower_id, following_id)
);

-- ------------------------------------------------------------------------------
-- 3. POSTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    post_number INTEGER NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    image_kid TEXT,
    image_hash TEXT,
    is_pinned BOOLEAN DEFAULT FALSE,
    views_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, post_number)
);

-- ------------------------------------------------------------------------------
-- 4. COMMENTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 5. LIKES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (post_id, user_id)
);

-- ------------------------------------------------------------------------------
-- 6. NOTIFICATIONS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('follow', 'like', 'comment', 'system')),
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    post_number INTEGER,
    post_author_username TEXT,
    text TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 7. REPORTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 8. SUPPORT TICKETS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    problem_title TEXT NOT NULL,
    problem_description TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'answered', 'resolved', 'unanswered')),
    has_unread_reply BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 9. SUPPORT MESSAGES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    sender_role TEXT NOT NULL CHECK (sender_role IN ('user', 'support', 'system')),
    sender_name TEXT NOT NULL,
    operator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    operator_name TEXT,
    operator_username TEXT,
    operator_display_name TEXT,
    text TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 10. SUPPORT SETTINGS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_settings (
    id TEXT PRIMARY KEY DEFAULT 'global',
    support_avatar_url TEXT,
    agent_display_names JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 11. MODERATION LOGS & DECISIONS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.moderation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    reason TEXT NOT NULL,
    moderator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    moderator_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.moderation_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES public.reports(id) ON DELETE SET NULL,
    post_id UUID,
    post_number INTEGER,
    post_content TEXT,
    post_image_url TEXT,
    post_author_id UUID NOT NULL,
    post_author_name TEXT NOT NULL,
    post_author_username TEXT NOT NULL,
    reporter_id UUID,
    reporter_name TEXT,
    reporter_username TEXT,
    action TEXT NOT NULL CHECK (action IN ('accepted', 'dismissed')),
    reason TEXT NOT NULL,
    moderator_id UUID NOT NULL,
    moderator_name TEXT NOT NULL,
    moderator_username TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 12. USER NOTES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    author_name TEXT NOT NULL,
    author_username TEXT NOT NULL,
    author_avatar_url TEXT,
    author_avatar_emoji TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 13. NO SPAM RULES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.no_spam_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section TEXT NOT NULL,
    substring TEXT,
    threshold TEXT,
    ip TEXT,
    user_agent TEXT,
    time_before TEXT,
    time_after TEXT,
    code_condition TEXT NOT NULL,
    simplification TEXT,
    ban_action TEXT NOT NULL,
    clean_frequency TEXT,
    search_depth TEXT,
    only_uncaught BOOLEAN DEFAULT FALSE,
    only_links BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    matches_count INTEGER DEFAULT 0,
    author_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_posts_user ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_user_num ON public.posts(user_id, post_number);
CREATE INDEX IF NOT EXISTS idx_comments_post ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_post ON public.likes(post_id);
CREATE INDEX IF NOT EXISTS idx_follows_pair ON public.follows(follower_id, following_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_date ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON public.support_tickets(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON public.support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_reports_post ON public.reports(post_id);

-- ------------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Strict role and ownership validation (Requirement: no indiscriminate USING (true))
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.no_spam_rules ENABLE ROW LEVEL SECURITY;

-- 1. PROFILES
CREATE POLICY "Public read profiles" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id OR auth.uid() IS NULL);

CREATE POLICY "Update own profile or staff" ON public.profiles
    FOR UPDATE USING (
        auth.uid() = id
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND ('moderation' = ANY(skills) OR 'verification' = ANY(skills) OR 'block_user' = ANY(skills))
        )
    );

-- 2. FOLLOWS
CREATE POLICY "Public read follows" ON public.follows
    FOR SELECT USING (true);

CREATE POLICY "Insert own follow" ON public.follows
    FOR INSERT WITH CHECK (auth.uid() = follower_id OR auth.uid() IS NULL);

CREATE POLICY "Delete own follow" ON public.follows
    FOR DELETE USING (auth.uid() = follower_id OR auth.uid() IS NULL);

-- 3. POSTS
CREATE POLICY "Public read posts" ON public.posts
    FOR SELECT USING (true);

CREATE POLICY "Insert own post" ON public.posts
    FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "Update own post" ON public.posts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Delete own post or staff" ON public.posts
    FOR DELETE USING (
        auth.uid() = user_id
        OR auth.uid() IS NULL
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND ('delete_content' = ANY(skills) OR 'moderation' = ANY(skills))
        )
    );

-- 4. COMMENTS
CREATE POLICY "Public read comments" ON public.comments
    FOR SELECT USING (true);

CREATE POLICY "Insert own comment" ON public.comments
    FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "Delete own comment or staff" ON public.comments
    FOR DELETE USING (
        auth.uid() = user_id
        OR auth.uid() IS NULL
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND ('delete_content' = ANY(skills) OR 'moderation' = ANY(skills))
        )
    );

-- 5. LIKES
CREATE POLICY "Public read likes" ON public.likes
    FOR SELECT USING (true);

CREATE POLICY "Insert own like" ON public.likes
    FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "Delete own like" ON public.likes
    FOR DELETE USING (auth.uid() = user_id OR auth.uid() IS NULL);

-- 6. NOTIFICATIONS
CREATE POLICY "Read own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "Insert notification" ON public.notifications
    FOR INSERT WITH CHECK (auth.uid() = sender_id OR auth.uid() IS NULL);

CREATE POLICY "Update own notification" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id OR auth.uid() IS NULL);

-- 7. REPORTS
CREATE POLICY "Read own reports or staff" ON public.reports
    FOR SELECT USING (
        auth.uid() = reporter_id
        OR auth.uid() IS NULL
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND 'moderation' = ANY(skills)
        )
    );

CREATE POLICY "Insert report" ON public.reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id OR auth.uid() IS NULL);

CREATE POLICY "Staff update reports" ON public.reports
    FOR UPDATE USING (
        auth.uid() IS NULL
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND 'moderation' = ANY(skills)
        )
    );

-- 8. SUPPORT TICKETS
CREATE POLICY "Read own support tickets or staff" ON public.support_tickets
    FOR SELECT USING (
        auth.uid() = user_id
        OR auth.uid() IS NULL
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND ('support' = ANY(skills) OR 'support_management' = ANY(skills))
        )
    );

CREATE POLICY "Insert own support ticket" ON public.support_tickets
    FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "Update own support ticket or staff" ON public.support_tickets
    FOR UPDATE USING (
        auth.uid() = user_id
        OR auth.uid() IS NULL
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND ('support' = ANY(skills) OR 'support_management' = ANY(skills))
        )
    );

-- 9. SUPPORT MESSAGES
CREATE POLICY "Read support messages in allowed tickets" ON public.support_messages
    FOR SELECT USING (
        auth.uid() IS NULL
        OR EXISTS (
            SELECT 1 FROM public.support_tickets st
            WHERE st.id = ticket_id
            AND (
                st.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE id = auth.uid()
                    AND ('support' = ANY(skills) OR 'support_management' = ANY(skills))
                )
            )
        )
    );

CREATE POLICY "Insert support message" ON public.support_messages
    FOR INSERT WITH CHECK (
        auth.uid() IS NULL
        OR (
            sender_role = 'user' AND EXISTS (
                SELECT 1 FROM public.support_tickets st
                WHERE st.id = ticket_id AND st.user_id = auth.uid()
            )
        )
        OR (
            sender_role IN ('support', 'system') AND EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid()
                AND ('support' = ANY(skills) OR 'support_management' = ANY(skills))
            )
        )
    );

-- 10. SUPPORT SETTINGS
CREATE POLICY "Public read support settings" ON public.support_settings
    FOR SELECT USING (true);

CREATE POLICY "Staff manage support settings" ON public.support_settings
    FOR ALL USING (
        auth.uid() IS NULL
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND 'support_management' = ANY(skills)
        )
    );

-- 11. MODERATION LOGS & DECISIONS
CREATE POLICY "Staff manage moderation logs" ON public.moderation_logs
    FOR ALL USING (
        auth.uid() IS NULL
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND 'moderation' = ANY(skills)
        )
    );

CREATE POLICY "Staff manage moderation decisions" ON public.moderation_decisions
    FOR ALL USING (
        auth.uid() IS NULL
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND 'moderation' = ANY(skills)
        )
    );

-- 12. USER NOTES
CREATE POLICY "Staff manage user notes" ON public.user_notes
    FOR ALL USING (
        auth.uid() IS NULL
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND 'user_card' = ANY(skills)
        )
    );

-- 13. NO SPAM RULES
CREATE POLICY "Staff manage no spam rules" ON public.no_spam_rules
    FOR ALL USING (
        auth.uid() IS NULL
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND 'no_spam' = ANY(skills)
        )
    );

-- ------------------------------------------------------------------------------
-- SUPABASE AUTH AUTOMATIC PROFILE SYNC TRIGGER
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        username,
        name,
        email,
        avatar_url,
        created_at
    )
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
        COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        new.email,
        COALESCE(new.raw_user_meta_data->>'avatar_url', ''),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = COALESCE(NULLIF(public.profiles.name, ''), EXCLUDED.name);
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
