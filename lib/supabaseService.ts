import { getSupabaseClient } from './supabase';
import {
  DbUser,
  DbPost,
  PostWithMeta,
  DbComment,
  DbLike,
  DbFollow,
  DbNotification,
  DbSupportTicket,
  DbSupportMessage,
  DbSupportSettings,
  DbReport,
  DbModerationLog,
  DbModerationDecision,
  DbUserNote,
  DbNoSpamRule,
  StaffSkill,
} from '../types/database';
import { itdDb, getImageFingerprint, generateUUID } from './storage';

export const supabaseService = {
  /**
   * Checks if Supabase client is configured and available.
   */
  isReady(): boolean {
    return Boolean(getSupabaseClient());
  },

  // ============================================================================
  // AUTH & SESSION
  // ============================================================================

  /**
   * Fetch current authenticated user.
   */
  async getCurrentUser(): Promise<DbUser | null> {
    const client = getSupabaseClient();
    if (!client) {
      return itdDb.getCurrentUser();
    }

    try {
      const { data: { user }, error: authError } = await client.auth.getUser();
      if (authError || !user) {
        return itdDb.getCurrentUser();
      }

      // Fetch profile from profiles table
      const { data: profile, error: profError } = await client
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profError || !profile) {
        return itdDb.getCurrentUser();
      }

      const dbUser: DbUser = {
        id: profile.id,
        name: profile.name || user.user_metadata?.name || 'Пользователь',
        username: profile.username || user.user_metadata?.username || 'user',
        email: profile.email || user.email,
        avatar_url: profile.avatar_url || '',
        avatar_emoji: profile.avatar_emoji || null,
        bio: profile.bio || '',
        skills: profile.skills || [],
        is_verified: Boolean(profile.is_verified),
        is_blocked: Boolean(profile.is_blocked),
        blocked_reason: profile.blocked_reason || undefined,
        blocked_at: profile.blocked_at || undefined,
        created_at: profile.created_at || new Date().toISOString(),
      };

      // Keep local reference in sync
      itdDb.setCurrentUserId(dbUser.id);
      return dbUser;
    } catch (err) {
      console.warn('[Supabase Auth] getCurrentUser failed, using local session:', err);
      return itdDb.getCurrentUser();
    }
  },

  /**
   * Register user with Supabase Auth & public.profiles
   */
  async signUp(data: {
    email: string;
    password: string;
    username: string;
    name: string;
    bio?: string;
    avatar_url?: string;
    avatar_emoji?: string | null;
  }): Promise<{ user: DbUser | null; error: string | null }> {
    const client = getSupabaseClient();
    const cleanNick = data.username.toLowerCase().replace(/^@/, '').trim();

    // Local fallback if Supabase not ready
    if (!client) {
      try {
        const localUser = itdDb.registerUser({
          name: data.name,
          username: cleanNick,
          email: data.email,
          password: data.password,
          bio: data.bio,
          avatar_url: data.avatar_url,
          avatar_emoji: data.avatar_emoji,
        });
        return { user: localUser, error: null };
      } catch (err: any) {
        return { user: null, error: err.message || 'Ошибка локальной регистрации' };
      }
    }

    try {
      // 1. Supabase Auth signUp
      const { data: authData, error: authError } = await client.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            username: cleanNick,
            name: data.name,
            bio: data.bio || '',
            avatar_url: data.avatar_url || '',
            avatar_emoji: data.avatar_emoji || null,
          },
        },
      });

      if (authError) {
        return { user: null, error: authError.message };
      }

      const userId = authData.user?.id || generateUUID();

      // 2. Insert/Upsert into profiles
      const profilePayload = {
        id: userId,
        username: cleanNick,
        name: data.name,
        email: data.email,
        avatar_url: data.avatar_url || '',
        avatar_emoji: data.avatar_emoji || null,
        bio: data.bio || '',
        skills: ['support', 'moderation', 'block_user', 'user_card', 'verification', 'delete_content'], // Give starter admin permissions
        is_verified: true,
        is_blocked: false,
        created_at: new Date().toISOString(),
      };

      const { data: createdProfile, error: profileError } = await client
        .from('profiles')
        .upsert(profilePayload)
        .select('*')
        .single();

      if (profileError) {
        console.warn('[Supabase] Warning creating profile row:', profileError);
      }

      const finalUser: DbUser = (createdProfile as DbUser) || {
        ...profilePayload,
        created_at: new Date().toISOString(),
      };

      itdDb.setCurrentUserId(finalUser.id);
      return { user: finalUser, error: null };
    } catch (err: any) {
      console.error('[Supabase Auth] Registration exception:', err);
      return { user: null, error: err.message || 'Ошибка регистрации в Supabase' };
    }
  },

  /**
   * Sign in with Supabase Auth. Accepts either email or username.
   */
  async signIn(identifier: string, password: string): Promise<{ user: DbUser | null; error: string | null }> {
    const client = getSupabaseClient();
    const cleanId = identifier.trim();

    if (!client) {
      const localMatch = itdDb.getUserByUsernameOrEmail(cleanId);
      if (localMatch && localMatch.password === password) {
        itdDb.setCurrentUserId(localMatch.id);
        return { user: localMatch, error: null };
      }
      return { user: null, error: 'Неверный логин или пароль (Локальный режим)' };
    }

    try {
      let emailToAuth = cleanId;

      // If user passed @username instead of email, lookup email from profiles table
      if (!cleanId.includes('@') || !cleanId.includes('.')) {
        const cleanUser = cleanId.replace(/^@/, '').toLowerCase();
        const { data: foundProfile } = await client
          .from('profiles')
          .select('email')
          .ilike('username', cleanUser)
          .maybeSingle();

        if (foundProfile?.email) {
          emailToAuth = foundProfile.email;
        } else {
          emailToAuth = `${cleanUser}@shum.net`;
        }
      }

      const { data: authData, error: authError } = await client.auth.signInWithPassword({
        email: emailToAuth,
        password: password,
      });

      if (authError) {
        // Check if there is a local demo fallback user with these credentials
        const localMatch = itdDb.getUserByUsernameOrEmail(cleanId);
        if (localMatch && localMatch.password === password) {
          itdDb.setCurrentUserId(localMatch.id);
          return { user: localMatch, error: null };
        }
        return { user: null, error: authError.message };
      }

      if (authData.user) {
        const { data: profile } = await client
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .maybeSingle();

        const userObj: DbUser = profile ? (profile as DbUser) : {
          id: authData.user.id,
          name: authData.user.user_metadata?.name || 'Пользователь',
          username: authData.user.user_metadata?.username || cleanId.replace(/^@/, ''),
          email: authData.user.email,
          avatar_url: authData.user.user_metadata?.avatar_url || '',
          bio: authData.user.user_metadata?.bio || '',
          created_at: new Date().toISOString(),
          skills: [],
        };

        itdDb.setCurrentUserId(userObj.id);
        return { user: userObj, error: null };
      }

      return { user: null, error: 'Пользователь не найден' };
    } catch (err: any) {
      console.error('[Supabase Auth] Login exception:', err);
      return { user: null, error: err.message || 'Ошибка авторизации' };
    }
  },

  /**
   * Sign out current user.
   */
  async signOut(): Promise<void> {
    const client = getSupabaseClient();
    if (client) {
      try {
        await client.auth.signOut();
      } catch (err) {
        console.warn('[Supabase Auth] SignOut error:', err);
      }
    }
    itdDb.setCurrentUserId(null);
  },

  // ============================================================================
  // PROFILES
  // ============================================================================

  async getAllUsers(): Promise<DbUser[]> {
    const client = getSupabaseClient();
    if (!client) return itdDb.getAllUsers();

    try {
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        return itdDb.getAllUsers();
      }
      return data as DbUser[];
    } catch {
      return itdDb.getAllUsers();
    }
  },

  async getUserByUsername(username: string): Promise<DbUser | null> {
    const client = getSupabaseClient();
    const clean = username.replace(/^@/, '').toLowerCase().trim();
    if (!client) return itdDb.getUserByUsername(clean);

    try {
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .ilike('username', clean)
        .maybeSingle();

      if (error || !data) {
        return itdDb.getUserByUsername(clean);
      }
      return data as DbUser;
    } catch {
      return itdDb.getUserByUsername(clean);
    }
  },

  async getUserById(id: string): Promise<DbUser | null> {
    const client = getSupabaseClient();
    if (!client) return itdDb.getUserById(id);

    try {
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error || !data) {
        return itdDb.getUserById(id);
      }
      return data as DbUser;
    } catch {
      return itdDb.getUserById(id);
    }
  },

  async updateProfile(userId: string, patch: Partial<DbUser>): Promise<DbUser | null> {
    const client = getSupabaseClient();
    itdDb.updateUser(userId, patch);

    if (!client) return itdDb.getUserById(userId);

    try {
      const { data, error } = await client
        .from('profiles')
        .update(patch)
        .eq('id', userId)
        .select('*')
        .single();

      if (error) {
        console.warn('[Supabase] updateProfile error:', error);
        return itdDb.getUserById(userId);
      }
      return data as DbUser;
    } catch {
      return itdDb.getUserById(userId);
    }
  },

  async setUserBlocked(userId: string, isBlocked: boolean, reason?: string): Promise<void> {
    const client = getSupabaseClient();
    itdDb.setUserBlocked(userId, isBlocked, reason);

    if (!client) return;

    try {
      await client
        .from('profiles')
        .update({
          is_blocked: isBlocked,
          blocked_reason: isBlocked ? (reason || 'Блокировка администратором') : null,
          blocked_at: isBlocked ? new Date().toISOString() : null,
        })
        .eq('id', userId);
    } catch (err) {
      console.warn('[Supabase] setUserBlocked error:', err);
    }
  },

  async setUserVerified(userId: string, isVerified: boolean): Promise<void> {
    const client = getSupabaseClient();
    itdDb.setUserVerified(userId, isVerified);

    if (!client) return;

    try {
      await client
        .from('profiles')
        .update({ is_verified: isVerified })
        .eq('id', userId);
    } catch (err) {
      console.warn('[Supabase] setUserVerified error:', err);
    }
  },

  async setUserSkills(userId: string, skills: StaffSkill[]): Promise<void> {
    const client = getSupabaseClient();
    itdDb.setUserSkills(userId, skills);

    if (!client) return;

    try {
      await client
        .from('profiles')
        .update({ skills })
        .eq('id', userId);
    } catch (err) {
      console.warn('[Supabase] setUserSkills error:', err);
    }
  },

  // ============================================================================
  // POSTS & FEED
  // ============================================================================

  async getFeedPosts(tab: 'for_you' | 'following' = 'for_you', currentUserId?: string | null): Promise<PostWithMeta[]> {
    const client = getSupabaseClient();
    if (!client) return itdDb.getFeedPosts(tab);

    try {
      const { data, error } = await client
        .from('posts')
        .select(`
          *,
          author:profiles!posts_user_id_fkey(*),
          likes(user_id),
          comments(id)
        `)
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        return itdDb.getFeedPosts(tab);
      }

      const mapped: PostWithMeta[] = data.map((item: any) => {
        const author: DbUser = item.author || {
          id: item.user_id,
          name: 'Пользователь',
          username: 'user',
          avatar_url: '',
          bio: '',
          created_at: item.created_at,
        };

        const likesList: Array<{ user_id: string }> = item.likes || [];
        const isLiked = currentUserId ? likesList.some((l) => l.user_id === currentUserId) : false;

        return {
          id: item.id,
          user_id: item.user_id,
          post_number: item.post_number,
          content: item.content,
          image_url: item.image_url,
          image_kid: item.image_kid,
          image_hash: item.image_hash,
          is_pinned: Boolean(item.is_pinned),
          views_count: item.views_count || 1,
          created_at: item.created_at,
          author,
          likes_count: likesList.length,
          comments_count: item.comments ? item.comments.length : 0,
          is_liked_by_viewer: isLiked,
        };
      });

      if (tab === 'following' && currentUserId) {
        const following = await this.getFollowing(currentUserId);
        const followingIds = following.map((u) => u.id);
        return mapped.filter((p) => followingIds.includes(p.user_id) || p.user_id === currentUserId);
      }

      return mapped;
    } catch (err) {
      console.warn('[Supabase] getFeedPosts network error, using fallback:', err);
      return itdDb.getFeedPosts(tab);
    }
  },

  async getUserPosts(userId: string, currentUserId?: string | null): Promise<PostWithMeta[]> {
    const client = getSupabaseClient();
    if (!client) return itdDb.getUserPosts(userId);

    try {
      const { data, error } = await client
        .from('posts')
        .select(`
          *,
          author:profiles!posts_user_id_fkey(*),
          likes(user_id),
          comments(id)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        return itdDb.getUserPosts(userId);
      }

      return data.map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        post_number: item.post_number,
        content: item.content,
        image_url: item.image_url,
        image_kid: item.image_kid,
        image_hash: item.image_hash,
        is_pinned: Boolean(item.is_pinned),
        views_count: item.views_count || 1,
        created_at: item.created_at,
        author: item.author || { id: item.user_id, name: 'Пользователь', username: 'user', avatar_url: '', bio: '', created_at: item.created_at },
        likes_count: item.likes ? item.likes.length : 0,
        comments_count: item.comments ? item.comments.length : 0,
        is_liked_by_viewer: currentUserId ? (item.likes || []).some((l: any) => l.user_id === currentUserId) : false,
      }));
    } catch {
      return itdDb.getUserPosts(userId);
    }
  },

  async getUserLikedPosts(userId: string, currentUserId?: string | null): Promise<PostWithMeta[]> {
    const client = getSupabaseClient();
    if (!client) return itdDb.getUserLikedPosts(userId);

    try {
      const { data: likesData } = await client
        .from('likes')
        .select('post_id')
        .eq('user_id', userId);

      if (!likesData || likesData.length === 0) {
        return itdDb.getUserLikedPosts(userId);
      }

      const postIds = likesData.map((l) => l.post_id);
      const { data: postsData } = await client
        .from('posts')
        .select(`
          *,
          author:profiles!posts_user_id_fkey(*),
          likes(user_id),
          comments(id)
        `)
        .in('id', postIds)
        .order('created_at', { ascending: false });

      if (!postsData || postsData.length === 0) {
        return itdDb.getUserLikedPosts(userId);
      }

      return postsData.map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        post_number: item.post_number,
        content: item.content,
        image_url: item.image_url,
        image_kid: item.image_kid,
        image_hash: item.image_hash,
        is_pinned: Boolean(item.is_pinned),
        views_count: item.views_count || 1,
        created_at: item.created_at,
        author: item.author || { id: item.user_id, name: 'Пользователь', username: 'user', avatar_url: '', bio: '', created_at: item.created_at },
        likes_count: item.likes ? item.likes.length : 0,
        comments_count: item.comments ? item.comments.length : 0,
        is_liked_by_viewer: currentUserId ? (item.likes || []).some((l: any) => l.user_id === currentUserId) : false,
      }));
    } catch {
      return itdDb.getUserLikedPosts(userId);
    }
  },

  async getPostByUsernameAndNumber(
    username: string,
    postNumber: number,
    currentUserId?: string | null
  ): Promise<PostWithMeta | null> {
    const client = getSupabaseClient();
    const cleanNick = username.replace(/^@/, '').toLowerCase().trim();

    if (!client) return itdDb.getPostByUsernameAndNumber(cleanNick, postNumber);

    try {
      // Find author profile
      const { data: author } = await client
        .from('profiles')
        .select('*')
        .ilike('username', cleanNick)
        .maybeSingle();

      if (!author) {
        return itdDb.getPostByUsernameAndNumber(cleanNick, postNumber);
      }

      const { data: post, error } = await client
        .from('posts')
        .select(`
          *,
          author:profiles!posts_user_id_fkey(*),
          likes(user_id),
          comments(id)
        `)
        .eq('user_id', author.id)
        .eq('post_number', postNumber)
        .maybeSingle();

      if (error || !post) {
        return itdDb.getPostByUsernameAndNumber(cleanNick, postNumber);
      }

      const likesList: Array<{ user_id: string }> = post.likes || [];
      const isLiked = currentUserId ? likesList.some((l) => l.user_id === currentUserId) : false;

      return {
        id: post.id,
        user_id: post.user_id,
        post_number: post.post_number,
        content: post.content,
        image_url: post.image_url,
        image_kid: post.image_kid,
        image_hash: post.image_hash,
        is_pinned: Boolean(post.is_pinned),
        views_count: (post.views_count || 1) + 1,
        created_at: post.created_at,
        author: post.author || author,
        likes_count: likesList.length,
        comments_count: post.comments ? post.comments.length : 0,
        is_liked_by_viewer: isLiked,
      };
    } catch {
      return itdDb.getPostByUsernameAndNumber(cleanNick, postNumber);
    }
  },

  async getPostById(postId: string, currentUserId?: string | null): Promise<PostWithMeta | null> {
    const client = getSupabaseClient();
    if (!client) return itdDb.getPostById(postId);

    try {
      const { data: post, error } = await client
        .from('posts')
        .select(`
          *,
          author:profiles!posts_user_id_fkey(*),
          likes(user_id),
          comments(id)
        `)
        .eq('id', postId)
        .maybeSingle();

      if (error || !post) return itdDb.getPostById(postId);

      const likesList: Array<{ user_id: string }> = post.likes || [];
      const isLiked = currentUserId ? likesList.some((l: { user_id: string }) => l.user_id === currentUserId) : false;

      return {
        id: post.id,
        user_id: post.user_id,
        post_number: post.post_number,
        content: post.content,
        image_url: post.image_url,
        image_kid: post.image_kid,
        image_hash: post.image_hash,
        is_pinned: Boolean(post.is_pinned),
        views_count: post.views_count || 1,
        created_at: post.created_at,
        author: post.author,
        likes_count: likesList.length,
        comments_count: post.comments ? post.comments.length : 0,
        is_liked_by_viewer: isLiked,
      };
    } catch {
      return itdDb.getPostById(postId);
    }
  },

  async createPost(data: {
    userId: string;
    content: string;
    image_url?: string | null;
    is_pinned?: boolean;
  }): Promise<PostWithMeta> {
    const client = getSupabaseClient();
    const fp = getImageFingerprint(data.image_url);

    // Mirror locally
    const rawLocal = itdDb.createPost(data);
    const localPost = itdDb.enrichPostWithMeta(rawLocal);

    if (!client) return localPost;

    try {
      // Find highest post_number
      const { data: highestPost } = await client
        .from('posts')
        .select('post_number')
        .eq('user_id', data.userId)
        .order('post_number', { ascending: false })
        .limit(1);

      const nextNumber = highestPost && highestPost.length > 0 ? highestPost[0].post_number + 1 : 1;

      const { data: remoteCreated, error } = await client
        .from('posts')
        .insert({
          id: rawLocal.id,
          user_id: data.userId,
          post_number: nextNumber,
          content: data.content,
          image_url: data.image_url || null,
          image_kid: fp.kid || null,
          image_hash: fp.hash || null,
          is_pinned: Boolean(data.is_pinned),
          views_count: 1,
        })
        .select('*, author:profiles!posts_user_id_fkey(*)')
        .single();

      if (error) {
        console.warn('[Supabase] Remote post insert error, preserved locally:', error);
        return localPost;
      }

      return {
        ...remoteCreated,
        author: remoteCreated.author || localPost.author,
        likes_count: 0,
        comments_count: 0,
        is_liked_by_viewer: false,
      };
    } catch (err) {
      console.warn('[Supabase] Exception writing post:', err);
      return localPost;
    }
  },

  async deletePost(postId: string, userId?: string): Promise<boolean> {
    const client = getSupabaseClient();
    itdDb.deletePost(postId, userId);

    if (!client) return true;

    try {
      let query = client.from('posts').delete().eq('id', postId);
      if (userId) {
        // RLS will enforce, but query eq is added for clarity
      }
      const { error } = await query;
      return !error;
    } catch {
      return false;
    }
  },

  // ============================================================================
  // LIKES & COMMENTS
  // ============================================================================

  async toggleLike(postId: string, userId: string): Promise<boolean> {
    const client = getSupabaseClient();
    const localResult = itdDb.toggleLike(postId, userId);

    if (!client) return localResult;

    try {
      const { data: existingLike } = await client
        .from('likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existingLike) {
        await client.from('likes').delete().eq('id', existingLike.id);
        return false;
      } else {
        await client.from('likes').insert({
          post_id: postId,
          user_id: userId,
        });
        return true;
      }
    } catch (err) {
      console.warn('[Supabase] toggleLike error:', err);
      return localResult;
    }
  },

  async getCommentsForPost(postId: string): Promise<Array<DbComment & { author: DbUser }>> {
    const client = getSupabaseClient();
    if (!client) return itdDb.getCommentsForPost(postId);

    try {
      const { data, error } = await client
        .from('comments')
        .select('*, author:profiles!comments_user_id_fkey(*)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error || !data) {
        return itdDb.getCommentsForPost(postId);
      }

      return data.map((c: any) => ({
        id: c.id,
        post_id: c.post_id,
        user_id: c.user_id,
        content: c.content,
        created_at: c.created_at,
        author: c.author || { id: c.user_id, name: 'Пользователь', username: 'user', avatar_url: '', bio: '', created_at: c.created_at },
      }));
    } catch {
      return itdDb.getCommentsForPost(postId);
    }
  },

  async addComment(data: { postId: string; userId: string; content: string }): Promise<DbComment> {
    const client = getSupabaseClient();
    const localComment = itdDb.addComment(data);

    if (!client) return localComment;

    try {
      const { data: remoteComment, error } = await client
        .from('comments')
        .insert({
          id: localComment.id,
          post_id: data.postId,
          user_id: data.userId,
          content: data.content,
        })
        .select('*')
        .single();

      if (error) {
        console.warn('[Supabase] addComment error:', error);
        return localComment;
      }
      return remoteComment as DbComment;
    } catch {
      return localComment;
    }
  },

  // ============================================================================
  // FOLLOWS
  // ============================================================================

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return itdDb.isFollowing(followerId, followingId);

    try {
      const { data, error } = await client
        .from('follows')
        .select('id')
        .eq('follower_id', followerId)
        .eq('following_id', followingId)
        .maybeSingle();

      if (error) return itdDb.isFollowing(followerId, followingId);
      return Boolean(data);
    } catch {
      return itdDb.isFollowing(followerId, followingId);
    }
  },

  async toggleFollow(followerId: string, followingId: string): Promise<boolean> {
    const client = getSupabaseClient();
    const localResult = itdDb.toggleFollow(followerId, followingId);

    if (!client) return localResult;

    try {
      const { data: existing } = await client
        .from('follows')
        .select('id')
        .eq('follower_id', followerId)
        .eq('following_id', followingId)
        .maybeSingle();

      if (existing) {
        await client.from('follows').delete().eq('id', existing.id);
        return false;
      } else {
        await client.from('follows').insert({
          follower_id: followerId,
          following_id: followingId,
        });

        // Trigger notification
        await this.createNotification({
          userId: followingId,
          senderId: followerId,
          type: 'follow',
          text: 'подписался(-ась) на ваши обновления',
        });

        return true;
      }
    } catch (err) {
      console.warn('[Supabase] toggleFollow error:', err);
      return localResult;
    }
  },

  async getFollowers(userId: string): Promise<DbUser[]> {
    const client = getSupabaseClient();
    if (!client) return itdDb.getFollowers(userId);

    try {
      const { data, error } = await client
        .from('follows')
        .select('follower:profiles!follows_follower_id_fkey(*)')
        .eq('following_id', userId);

      if (error || !data) return itdDb.getFollowers(userId);
      return data.map((d: any) => d.follower).filter(Boolean);
    } catch {
      return itdDb.getFollowers(userId);
    }
  },

  async getFollowing(userId: string): Promise<DbUser[]> {
    const client = getSupabaseClient();
    if (!client) return itdDb.getFollowing(userId);

    try {
      const { data, error } = await client
        .from('follows')
        .select('following:profiles!follows_following_id_fkey(*)')
        .eq('follower_id', userId);

      if (error || !data) return itdDb.getFollowing(userId);
      return data.map((d: any) => d.following).filter(Boolean);
    } catch {
      return itdDb.getFollowing(userId);
    }
  },

  // ============================================================================
  // NOTIFICATIONS
  // ============================================================================

  async getNotifications(userId: string): Promise<Array<DbNotification & { sender?: DbUser }>> {
    const client = getSupabaseClient();
    if (!client) return itdDb.getNotifications(userId);

    try {
      const { data, error } = await client
        .from('notifications')
        .select('*, sender:profiles!notifications_sender_id_fkey(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error || !data) return itdDb.getNotifications(userId);
      return data.map((n: any) => ({
        id: n.id,
        user_id: n.user_id,
        sender_id: n.sender_id,
        type: n.type,
        post_id: n.post_id,
        post_number: n.post_number,
        post_author_username: n.post_author_username,
        text: n.text,
        is_read: Boolean(n.is_read),
        created_at: n.created_at,
        sender: n.sender,
      }));
    } catch {
      return itdDb.getNotifications(userId);
    }
  },

  async createNotification(data: {
    userId: string;
    senderId: string;
    type: 'follow' | 'like' | 'comment' | 'system';
    postId?: string;
    postNumber?: number;
    postAuthorUsername?: string;
    text: string;
  }): Promise<void> {
    itdDb.createNotification({
      user_id: data.userId,
      sender_id: data.senderId,
      type: data.type,
      post_id: data.postId || null,
      post_number: data.postNumber || null,
      post_author_username: data.postAuthorUsername || null,
      text: data.text,
    });
    const client = getSupabaseClient();
    if (!client) return;

    try {
      await client.from('notifications').insert({
        user_id: data.userId,
        sender_id: data.senderId,
        type: data.type,
        post_id: data.postId || null,
        post_number: data.postNumber || null,
        post_author_username: data.postAuthorUsername || null,
        text: data.text,
        is_read: false,
      });
    } catch (err) {
      console.warn('[Supabase] createNotification error:', err);
    }
  },

  // ============================================================================
  // SUPPORT TICKETS & MESSAGES
  // ============================================================================

  async getSupportTickets(userId?: string): Promise<DbSupportTicket[]> {
    const client = getSupabaseClient();
    if (!client) return itdDb.getSupportTickets(userId);

    try {
      let query = client
        .from('support_tickets')
        .select('*, messages:support_messages(*)')
        .order('updated_at', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;
      if (error || !data) return itdDb.getSupportTickets(userId);

      return data.map((t: any) => ({
        ...t,
        messages: (t.messages || []).sort(
          (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        ),
      }));
    } catch {
      return itdDb.getSupportTickets(userId);
    }
  },

  async createSupportTicket(data: {
    userId: string;
    problemTitle: string;
    problemDescription: string;
    attachments?: any[];
  }): Promise<DbSupportTicket> {
    const client = getSupabaseClient();
    const localTicket = itdDb.createSupportTicket({
      userId: data.userId,
      problemTitle: data.problemTitle,
      problemDescription: data.problemDescription,
      attachments: data.attachments || [],
    });

    if (!client) return localTicket;

    try {
      const { data: remoteTicket, error } = await client
        .from('support_tickets')
        .insert({
          id: localTicket.id,
          user_id: data.userId,
          problem_title: data.problemTitle,
          problem_description: data.problemDescription,
          attachments: data.attachments || [],
          status: 'open',
          has_unread_reply: false,
        })
        .select('*')
        .single();

      if (error) {
        console.warn('[Supabase] createSupportTicket error:', error);
        return localTicket;
      }

      // Add initial message
      await client.from('support_messages').insert({
        ticket_id: localTicket.id,
        sender_role: 'user',
        sender_name: 'Пользователь',
        text: data.problemDescription,
        attachments: data.attachments || [],
      });

      return {
        ...remoteTicket,
        messages: localTicket.messages,
      };
    } catch {
      return localTicket;
    }
  },

  async addSupportMessage(
    ticketId: string,
    message: {
      senderRole: 'user' | 'support' | 'system';
      senderName: string;
      text: string;
      operatorId?: string;
      operatorName?: string;
      operatorUsername?: string;
      operatorDisplayName?: string;
      attachments?: any[];
    }
  ): Promise<DbSupportMessage> {
    const client = getSupabaseClient();
    const localMsg = itdDb.addSupportMessage(ticketId, {
      sender_role: message.senderRole,
      sender_name: message.senderName,
      operator_id: message.operatorId,
      operator_name: message.operatorName,
      operator_username: message.operatorUsername,
      operator_display_name: message.operatorDisplayName,
      text: message.text,
      attachments: message.attachments || [],
    });

    if (!client) return localMsg;

    try {
      await client.from('support_messages').insert({
        id: localMsg.id,
        ticket_id: ticketId,
        sender_role: message.senderRole,
        sender_name: message.senderName,
        operator_id: message.operatorId || null,
        operator_name: message.operatorName || null,
        operator_username: message.operatorUsername || null,
        operator_display_name: message.operatorDisplayName || null,
        text: message.text,
        attachments: message.attachments || [],
      });

      // Update ticket status
      await client
        .from('support_tickets')
        .update({
          status: message.senderRole === 'support' ? 'answered' : 'in_progress',
          has_unread_reply: message.senderRole === 'support',
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId);

      return localMsg;
    } catch (err) {
      console.warn('[Supabase] addSupportMessage error:', err);
      return localMsg;
    }
  },

  async markTicketAsRead(ticketId: string): Promise<void> {
    itdDb.markTicketAsRead(ticketId);
    const client = getSupabaseClient();
    if (!client) return;

    try {
      await client
        .from('support_tickets')
        .update({ has_unread_reply: false })
        .eq('id', ticketId);
    } catch (err) {
      console.warn('[Supabase] markTicketAsRead error:', err);
    }
  },

  async getSupportSettings(): Promise<DbSupportSettings> {
    const client = getSupabaseClient();
    if (!client) return itdDb.getSupportSettings();

    try {
      const { data, error } = await client
        .from('support_settings')
        .select('*')
        .eq('id', 'global')
        .maybeSingle();

      if (error || !data) return itdDb.getSupportSettings();
      return data as DbSupportSettings;
    } catch {
      return itdDb.getSupportSettings();
    }
  },

  async updateSupportSettings(patch: Partial<DbSupportSettings>): Promise<DbSupportSettings> {
    const client = getSupabaseClient();
    const local = itdDb.updateSupportSettings(patch);

    if (!client) return local;

    try {
      const { data, error } = await client
        .from('support_settings')
        .upsert({ id: 'global', ...patch, updated_at: new Date().toISOString() })
        .select('*')
        .single();

      if (error || !data) return local;
      return data as DbSupportSettings;
    } catch {
      return local;
    }
  },

  // ============================================================================
  // MODERATION & REPORTS
  // ============================================================================

  async getAllReports(): Promise<Array<DbReport & { post: PostWithMeta | null; reporter: DbUser | null }>> {
    const client = getSupabaseClient();
    if (!client) return itdDb.getAllReports();

    try {
      const { data, error } = await client
        .from('reports')
        .select('*')
        .neq('status', 'rejected')
        .order('created_at', { ascending: false });

      if (error || !data) return itdDb.getAllReports();

      const enriched = await Promise.all(
        (data as DbReport[]).map(async (r) => {
          let post: PostWithMeta | null = null;
          try {
            post = await this.getPostById(r.post_id);
          } catch {
            post = itdDb.getPostById(r.post_id);
          }

          let reporter: DbUser | null = null;
          try {
            reporter = await this.getUserById(r.reporter_id);
          } catch {
            reporter = itdDb.getUserById(r.reporter_id);
          }

          return {
            ...r,
            post,
            reporter,
          };
        })
      );

      return enriched.filter((r) => r.post !== null);
    } catch {
      return itdDb.getAllReports();
    }
  },

  async createReport(data: { postId: string; reporterId: string; reason: string }): Promise<DbReport> {
    const client = getSupabaseClient();
    const local = itdDb.createReport(data);

    if (!client) return local;

    try {
      const { data: remoteReport, error } = await client
        .from('reports')
        .insert({
          id: local.id,
          post_id: data.postId,
          reporter_id: data.reporterId,
          reason: data.reason,
          status: 'pending',
        })
        .select('*')
        .single();

      if (error || !remoteReport) return local;
      return remoteReport as DbReport;
    } catch {
      return local;
    }
  },

  async getModerationDecisions(): Promise<DbModerationDecision[]> {
    const client = getSupabaseClient();
    if (!client) return itdDb.getModerationDecisions();

    try {
      const { data, error } = await client
        .from('moderation_decisions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data) return itdDb.getModerationDecisions();
      return data as DbModerationDecision[];
    } catch {
      return itdDb.getModerationDecisions();
    }
  },

  async acceptReport(
    reportId: string,
    moderatorReason: string,
    moderator?: { id?: string; name?: string; username?: string }
  ): Promise<void> {
    itdDb.acceptReport(reportId, moderatorReason, moderator);
    const client = getSupabaseClient();
    if (!client) return;

    try {
      // 1. Fetch report details
      const { data: report } = await client.from('reports').select('*').eq('id', reportId).maybeSingle();
      if (report) {
        // Fetch post to get author
        const { data: post } = await client.from('posts').select('*').eq('id', report.post_id).maybeSingle();
        if (post) {
          // Log decision
          await client.from('moderation_decisions').insert({
            report_id: reportId,
            post_id: post.id,
            post_number: post.post_number,
            post_content: post.content,
            post_image_url: post.image_url,
            post_author_id: post.user_id,
            post_author_name: 'Пользователь',
            post_author_username: 'user',
            reporter_id: report.reporter_id,
            action: 'accepted',
            reason: moderatorReason,
            moderator_id: moderator?.id || 'admin',
            moderator_name: moderator?.name || 'Модератор',
            moderator_username: moderator?.username || 'moderator',
          });

          // Delete post
          await client.from('posts').delete().eq('id', post.id);

          // Block user
          await client.from('profiles').update({
            is_blocked: true,
            blocked_reason: `Модерация: ${moderatorReason}`,
            blocked_at: new Date().toISOString(),
          }).eq('id', post.user_id);
        }

        // Delete report
        await client.from('reports').delete().eq('id', reportId);
      }
    } catch (err) {
      console.warn('[Supabase] acceptReport error:', err);
    }
  },

  async dismissReport(
    reportId: string,
    moderator?: { id?: string; name?: string; username?: string }
  ): Promise<void> {
    itdDb.dismissReport(reportId, moderator);
    const client = getSupabaseClient();
    if (!client) return;

    try {
      const { data: report } = await client.from('reports').select('*').eq('id', reportId).maybeSingle();
      if (report) {
        await client.from('moderation_decisions').insert({
          report_id: reportId,
          post_id: report.post_id,
          post_author_id: 'unknown',
          post_author_name: 'Пользователь',
          post_author_username: 'user',
          reporter_id: report.reporter_id,
          action: 'dismissed',
          reason: 'Нарушений не выявлено',
          moderator_id: moderator?.id || 'admin',
          moderator_name: moderator?.name || 'Модератор',
          moderator_username: moderator?.username || 'moderator',
        });
        await client.from('reports').delete().eq('id', reportId);
      }
    } catch (err) {
      console.warn('[Supabase] dismissReport error:', err);
    }
  },

  // ============================================================================
  // USER NOTES & NOSPAM
  // ============================================================================

  async getUserNotes(userId: string): Promise<DbUserNote[]> {
    const client = getSupabaseClient();
    if (!client) return itdDb.getUserNotes(userId);

    try {
      const { data, error } = await client
        .from('user_notes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error || !data) return itdDb.getUserNotes(userId);
      return data as DbUserNote[];
    } catch {
      return itdDb.getUserNotes(userId);
    }
  },

  async addUserNote(data: {
    userId: string;
    authorId: string;
    authorName: string;
    authorUsername: string;
    authorAvatarUrl?: string;
    authorAvatarEmoji?: string | null;
    content: string;
  }): Promise<DbUserNote> {
    const client = getSupabaseClient();
    const local = itdDb.addUserNote(data);

    if (!client) return local;

    try {
      const { data: remoteNote, error } = await client
        .from('user_notes')
        .insert({
          id: local.id,
          user_id: data.userId,
          author_id: data.authorId,
          author_name: data.authorName,
          author_username: data.authorUsername,
          author_avatar_url: data.authorAvatarUrl || null,
          author_avatar_emoji: data.authorAvatarEmoji || null,
          content: data.content,
        })
        .select('*')
        .single();

      if (error || !remoteNote) return local;
      return remoteNote as DbUserNote;
    } catch {
      return local;
    }
  },

  async getNoSpamRules(): Promise<DbNoSpamRule[]> {
    const client = getSupabaseClient();
    if (!client) return itdDb.getNoSpamRules();

    try {
      const { data, error } = await client
        .from('no_spam_rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data) return itdDb.getNoSpamRules();
      return data as DbNoSpamRule[];
    } catch {
      return itdDb.getNoSpamRules();
    }
  },

  async addNoSpamRule(rule: Omit<DbNoSpamRule, 'id' | 'created_at' | 'matches_count'>): Promise<DbNoSpamRule> {
    const client = getSupabaseClient();
    const local = itdDb.addNoSpamRule(rule);

    if (!client) return local;

    try {
      const { data: remoteRule, error } = await client
        .from('no_spam_rules')
        .insert({
          id: local.id,
          section: rule.section,
          substring: rule.substring || null,
          threshold: rule.threshold || null,
          ip: rule.ip || null,
          user_agent: rule.user_agent || null,
          time_before: rule.time_before || null,
          time_after: rule.time_after || null,
          code_condition: rule.code_condition,
          simplification: rule.simplification || null,
          ban_action: rule.ban_action,
          clean_frequency: rule.clean_frequency || null,
          search_depth: rule.search_depth || null,
          only_uncaught: Boolean(rule.only_uncaught),
          only_links: Boolean(rule.only_links),
          is_active: rule.is_active !== false,
          matches_count: 0,
          author_name: rule.author_name,
        })
        .select('*')
        .single();

      if (error || !remoteRule) return local;
      return remoteRule as DbNoSpamRule;
    } catch {
      return local;
    }
  },

  async toggleNoSpamRule(id: string): Promise<void> {
    itdDb.toggleNoSpamRule(id);
    const client = getSupabaseClient();
    if (!client) return;

    try {
      const { data: rule } = await client.from('no_spam_rules').select('is_active').eq('id', id).single();
      if (rule) {
        await client.from('no_spam_rules').update({ is_active: !rule.is_active }).eq('id', id);
      }
    } catch (err) {
      console.warn('[Supabase] toggleNoSpamRule error:', err);
    }
  },

  async deleteNoSpamRule(id: string): Promise<void> {
    itdDb.deleteNoSpamRule(id);
    const client = getSupabaseClient();
    if (!client) return;

    try {
      await client.from('no_spam_rules').delete().eq('id', id);
    } catch (err) {
      console.warn('[Supabase] deleteNoSpamRule error:', err);
    }
  },

  // ============================================================================
  // DATA MIGRATION
  // ============================================================================

  async migrateLocalDataToSupabase(): Promise<{
    success: boolean;
    migrated: { users: number; posts: number; tickets: number };
    error?: string;
  }> {
    const client = getSupabaseClient();
    if (!client) {
      return {
        success: false,
        migrated: { users: 0, posts: 0, tickets: 0 },
        error: 'Supabase не настроен. Добавьте VITE_SUPABASE_ANON_KEY.',
      };
    }

    try {
      const users = itdDb.getAllUsers();
      const posts = itdDb.getAllPosts();
      const tickets = itdDb.getSupportTickets();

      let usersCount = 0;
      let postsCount = 0;
      let ticketsCount = 0;

      // 1. Profiles
      if (users.length > 0) {
        const profilePayloads = users.map((u) => ({
          id: u.id.startsWith('user-') ? generateUUID() : u.id,
          username: u.username.toLowerCase().replace(/^@/, ''),
          name: u.name,
          email: u.email || `${u.username}@shum.net`,
          password_hash: u.password || 'password123',
          avatar_url: u.avatar_url || '',
          avatar_emoji: u.avatar_emoji || null,
          bio: u.bio || '',
          skills: u.skills || [],
          is_verified: Boolean(u.is_verified),
          is_blocked: Boolean(u.is_blocked),
          blocked_reason: u.blocked_reason || null,
          created_at: u.created_at || new Date().toISOString(),
        }));

        const { error: profError } = await client
          .from('profiles')
          .upsert(profilePayloads, { onConflict: 'username' });

        if (!profError) {
          usersCount = users.length;
        } else {
          console.warn('[Supabase Sync] Profile sync notice:', profError);
        }
      }

      // Map remote profiles
      const { data: remoteProfiles } = await client.from('profiles').select('id, username');
      const usernameToId: Record<string, string> = {};
      if (remoteProfiles) {
        for (const rp of remoteProfiles) {
          usernameToId[rp.username] = rp.id;
        }
      }

      // 2. Posts
      if (posts.length > 0 && Object.keys(usernameToId).length > 0) {
        const postPayloads = [];
        for (const p of posts) {
          const author = users.find((u) => u.id === p.user_id);
          const authorUsername = author?.username.toLowerCase().replace(/^@/, '');
          const mappedAuthorId = authorUsername ? usernameToId[authorUsername] : null;

          if (mappedAuthorId) {
            postPayloads.push({
              user_id: mappedAuthorId,
              post_number: p.post_number,
              content: p.content,
              image_url: p.image_url || null,
              image_kid: p.image_kid || null,
              image_hash: p.image_hash || null,
              is_pinned: Boolean(p.is_pinned),
              views_count: p.views_count || 1,
              created_at: p.created_at || new Date().toISOString(),
            });
          }
        }

        if (postPayloads.length > 0) {
          const { error: postError } = await client
            .from('posts')
            .upsert(postPayloads, { onConflict: 'user_id, post_number' });

          if (!postError) {
            postsCount = postPayloads.length;
          }
        }
      }

      // 3. Support Tickets
      if (tickets.length > 0 && Object.keys(usernameToId).length > 0) {
        const ticketPayloads = [];
        for (const t of tickets) {
          const author = users.find((u) => u.id === t.user_id);
          const authorUsername = author?.username.toLowerCase().replace(/^@/, '');
          const mappedAuthorId = authorUsername ? usernameToId[authorUsername] : null;

          if (mappedAuthorId) {
            ticketPayloads.push({
              user_id: mappedAuthorId,
              problem_title: t.problem_title,
              problem_description: t.problem_description,
              attachments: t.attachments || [],
              status: t.status,
              has_unread_reply: t.has_unread_reply,
              created_at: t.created_at,
              updated_at: t.updated_at,
            });
          }
        }

        if (ticketPayloads.length > 0) {
          const { error: ticketError } = await client
            .from('support_tickets')
            .upsert(ticketPayloads);

          if (!ticketError) {
            ticketsCount = ticketPayloads.length;
          }
        }
      }

      return {
        success: true,
        migrated: { users: usersCount, posts: postsCount, tickets: ticketsCount },
      };
    } catch (err: any) {
      return {
        success: false,
        migrated: { users: 0, posts: 0, tickets: 0 },
        error: err?.message || 'Ошибка миграции данных в Supabase',
      };
    }
  },
};
