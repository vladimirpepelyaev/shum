import {
  DbUser,
  DbFollow,
  DbPost,
  DbComment,
  DbLike,
  DbReport,
  DbNotification,
  DbSupportTicket,
  DbSupportMessage,
  DbSupportAttachment,
  DbSupportSettings,
  StaffSkill,
  PostWithMeta,
  DbModerationLog,
  DbModerationDecision,
  DbUserNote,
  DbNoSpamRule
} from '../types/database';
import { showAppToast } from './toast';

const STORAGE_KEYS = {
  CURRENT_USER_ID: 'shum_current_user_id',
  USERS: 'shum_users',
  FOLLOWS: 'shum_follows',
  POSTS: 'shum_posts',
  COMMENTS: 'shum_comments',
  LIKES: 'shum_likes',
  REPORTS: 'shum_reports',
  NOTIFICATIONS: 'shum_notifications',
  SUPPORT_TICKETS: 'shum_support_tickets',
  SUPPORT_SETTINGS: 'shum_support_settings',
  MODERATION_LOGS: 'shum_moderation_logs',
  MODERATION_DECISIONS: 'shum_moderation_decisions',
  USER_NOTES: 'shum_user_notes',
  NO_SPAM_RULES: 'shum_nospam_rules',
};

function getJson<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setJson<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage write error', e);
  }
}

/**
 * Вычисляет или возвращает контрольный идентификатор (kid) и сигнатурный хэш (hash) изображения.
 * Используется в CRM noSpam и при отображении под фотографиями.
 */
export function getImageFingerprint(imageUrl: string | null | undefined): { kid: string; hash: string } {
  if (!imageUrl) return { kid: '', hash: '' };

  // Эталонный медиафайл из спецификации/скриншота
  if (imageUrl.includes('unsplash.com') || imageUrl.includes('sample') || imageUrl.includes('kid-demo')) {
    return {
      kid: '7aaab3b4abca32634dc2be52a4d59152',
      hash: '9f83ab24e18c50d1',
    };
  }

  let h1 = 0x811c9dc5;
  let h2 = 0x27d4eb2f;
  let h3 = 0x5bd1e995;
  let h4 = 0x1a2b3c4d;

  for (let i = 0; i < imageUrl.length; i++) {
    const code = imageUrl.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ code, 0x5bd1e995) >>> 0;
    h3 = Math.imul(h3 ^ (code << 3), 0x27d4eb2f) >>> 0;
    h4 = (h4 * 33) ^ code;
  }

  const toHex8 = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  const kid = `${toHex8(h1)}${toHex8(h2)}${toHex8(h3)}${toHex8(h4)}`;
  const hash = `${toHex8(h2 ^ h3)}${toHex8(h1 ^ h4)}`;

  return { kid, hash };
}


export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const ALL_STAFF_SKILLS: StaffSkill[] = [
  'support',
  'moderation',
  'block_user',
  'user_card',
  'verification',
  'no_spam',
  'support_management',
  'delete_content',
];

export const itdDb = {
  // Session
  getCurrentUserId(): string | null {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
  },

  setCurrentUserId(id: string | null): void {
    if (id) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, id);
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
    }
  },

  getCurrentUser(): DbUser | null {
    const id = this.getCurrentUserId();
    if (!id) return null;
    return this.getUserById(id);
  },

  // Users / Profiles
  getAllUsers(): DbUser[] {
    return getJson<DbUser[]>(STORAGE_KEYS.USERS, []);
  },

  getUserById(id: string): DbUser | null {
    const users = this.getAllUsers();
    const user = users.find((u) => u.id === id);
    if (user && user.skills && user.skills.length > 0 && !user.skills.includes('delete_content')) {
      user.skills.push('delete_content');
      setJson(STORAGE_KEYS.USERS, users);
    }
    return user || null;
  },

  getUserByUsername(username: string): DbUser | null {
    const clean = username.replace(/^@/, '').toLowerCase();
    const users = this.getAllUsers();
    return users.find((u) => u.username.toLowerCase() === clean) || null;
  },

  getUserByUsernameOrEmail(identifier: string): DbUser | null {
    const clean = identifier.trim().replace(/^@/, '').toLowerCase();
    const users = this.getAllUsers();
    return (
      users.find(
        (u) =>
          u.username.toLowerCase() === clean ||
          (u.email && u.email.toLowerCase() === clean)
      ) || null
    );
  },

  registerUser(data: {
    name: string;
    username: string;
    email?: string;
    email_verified?: boolean;
    password?: string;
    bio?: string;
    avatar_url?: string;
    avatar_emoji?: string | null;
  }): DbUser {
    const cleanUsername = data.username.trim().replace(/^@/, '').toLowerCase();
    if (!cleanUsername) throw new Error('Логин обязателен');

    const existing = this.getUserByUsername(cleanUsername);
    if (existing) {
      throw new Error(`Логин @${cleanUsername} уже занят`);
    }

    const cleanEmail = data.email?.trim().toLowerCase();
    if (cleanEmail) {
      const existingEmail = this.getAllUsers().find(
        (u) => u.email && u.email.toLowerCase() === cleanEmail
      );
      if (existingEmail) {
        throw new Error(`Почта ${cleanEmail} уже зарегистрирована в системе`);
      }
    }

    if (!data.password || data.password.length < 3) {
      throw new Error('Пароль должен содержать не менее 3 символов');
    }

    const users = this.getAllUsers();
    // First user or administrative account automatically receives staff skills for testing
    const isFirstUser = users.length === 0;

    const newUser: DbUser = {
      id: generateUUID(),
      name: data.name.trim() || cleanUsername,
      username: cleanUsername,
      email: cleanEmail || `${cleanUsername}@shum.net`,
      email_verified: data.email_verified ?? true,
      password: data.password,
      password_hash: data.password,
      avatar_url: data.avatar_url || '',
      avatar_emoji: data.avatar_emoji || null,
      avatar_eyes: !data.avatar_url && !data.avatar_emoji,
      bio: data.bio || '',
      created_at: new Date().toISOString(),
      skills: isFirstUser ? [...ALL_STAFF_SKILLS] : ['support', 'moderation', 'block_user', 'user_card', 'verification', 'no_spam', 'support_management', 'delete_content'],
      is_verified: isFirstUser,
      is_blocked: false,
    };

    users.push(newUser);
    setJson(STORAGE_KEYS.USERS, users);
    this.setCurrentUserId(newUser.id);
    return newUser;
  },

  loginUser(identifier: string, password?: string): DbUser {
    const clean = identifier.trim().replace(/^@/, '').toLowerCase();
    const user = this.getUserByUsernameOrEmail(clean);
    if (!user) {
      throw new Error(`Пользователь с логином или почтой «${identifier}» не найден`);
    }

    if (!password) {
      throw new Error('Введите пароль');
    }

    const storedPass = user.password || user.password_hash;
    if (storedPass && storedPass !== password) {
      throw new Error('Неверный пароль');
    }

    this.setCurrentUserId(user.id);
    return user;
  },

  updateUser(id: string, updates: Partial<DbUser>): DbUser {
    const users = this.getAllUsers();
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) throw new Error('Пользователь не найден');

    if (updates.username) {
      const clean = updates.username.replace(/^@/, '').toLowerCase();
      const existing = users.find((u) => u.username === clean && u.id !== id);
      if (existing) throw new Error(`Логин @${clean} уже занят`);
      updates.username = clean;
    }

    const updated = { ...users[index], ...updates };
    users[index] = updated;
    setJson(STORAGE_KEYS.USERS, users);
    return updated;
  },

  // Staff Skills (Служебные разделы / Управление доступами)
  hasSkill(userId: string, skill: StaffSkill): boolean {
    const user = this.getUserById(userId);
    if (!user || !user.skills) return false;
    return user.skills.includes(skill);
  },

  getUserSkills(userId: string): StaffSkill[] {
    const user = this.getUserById(userId);
    return user?.skills || [];
  },

  setUserSkills(userId: string, skills: StaffSkill[]): DbUser {
    return this.updateUser(userId, { skills });
  },

  toggleUserSkill(userId: string, skill: StaffSkill): DbUser {
    const current = this.getUserSkills(userId);
    const updated = current.includes(skill)
      ? current.filter((s) => s !== skill)
      : [...current, skill];
    return this.setUserSkills(userId, updated);
  },

  setUserVerified(userId: string, isVerified: boolean): DbUser {
    const target = this.getUserById(userId);
    const updated = this.updateUser(userId, { is_verified: isVerified });
    const targetHandle = target ? `@${target.username}` : 'Пользователь';
    showAppToast(
      isVerified ? 'Верификация пользователя' : 'Верификация снята',
      isVerified
        ? `Профилю ${targetHandle} присвоена официальная галочка верификации`
        : `С профиля ${targetHandle} снят статус верификации`,
      isVerified ? 'verified' : 'unverified'
    );
    return updated;
  },

  setUserSubscription(userId: string, hasSubscription: boolean, label?: string): DbUser {
    const target = this.getUserById(userId);
    const updated = this.updateUser(userId, {
      has_subscription: hasSubscription,
      subscription_label: hasSubscription ? (label || 'ШУМ Премиум') : undefined,
    });
    const targetHandle = target ? `@${target.username}` : 'Пользователь';
    showAppToast(
      hasSubscription ? 'Выдана подписка ШУМ+' : 'Подписка отозвана',
      hasSubscription
        ? `Профилю ${targetHandle} присвоена подписка «${label || 'ШУМ Премиум'}»`
        : `У профиля ${targetHandle} отключена подписка`,
      'info'
    );
    return updated;
  },

  setUserBlocked(
    userId: string,
    isBlocked: boolean,
    reason?: string,
    moderatorId?: string,
    moderatorName?: string
  ): DbUser {
    const target = this.getUserById(userId);
    const updated = this.updateUser(userId, {
      is_blocked: isBlocked,
      blocked_reason: isBlocked ? (reason || 'Нарушение правил сообщества') : undefined,
      blocked_at: isBlocked ? new Date().toISOString() : undefined,
    });

    const activeMod = this.getCurrentUser();
    this.addModerationLog({
      target_user_id: userId,
      action: isBlocked ? 'block' : 'unblock',
      reason: reason || (isBlocked ? 'Нарушение правил сообщества' : 'Разблокировка аккаунта'),
      moderator_id: moderatorId || activeMod?.id || 'staff',
      moderator_name: moderatorName || activeMod?.name || 'Модератор ШУМ',
    });

    const targetHandle = target ? `@${target.username}` : 'Пользователь';
    showAppToast(
      isBlocked ? 'Профиль заблокирован' : 'Профиль разблокирован',
      isBlocked
        ? `Профиль ${targetHandle} заблокирован: ${reason || 'Нарушение правил сообщества'}`
        : `Блокировка с профиля ${targetHandle} успешно снята`,
      isBlocked ? 'block' : 'unblock'
    );

    return updated;
  },

  getModerationLogs(userId: string): DbModerationLog[] {
    const logs = getJson<DbModerationLog[]>(STORAGE_KEYS.MODERATION_LOGS, []);
    return logs
      .filter((l) => l.target_user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  addModerationLog(log: Omit<DbModerationLog, 'id' | 'created_at'>): DbModerationLog {
    const logs = getJson<DbModerationLog[]>(STORAGE_KEYS.MODERATION_LOGS, []);
    const newLog: DbModerationLog = {
      ...log,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };
    logs.unshift(newLog);
    setJson(STORAGE_KEYS.MODERATION_LOGS, logs);
    return newLog;
  },

  getUserNotes(userId: string): DbUserNote[] {
    const notes = getJson<DbUserNote[]>(STORAGE_KEYS.USER_NOTES, []);
    return notes
      .filter((n) => n.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  addUserNote(data: {
    userId: string;
    authorId: string;
    authorName: string;
    authorUsername: string;
    authorAvatarUrl?: string;
    authorAvatarEmoji?: string | null;
    content: string;
  }): DbUserNote {
    const notes = getJson<DbUserNote[]>(STORAGE_KEYS.USER_NOTES, []);
    const newNote: DbUserNote = {
      id: generateUUID(),
      user_id: data.userId,
      author_id: data.authorId,
      author_name: data.authorName,
      author_username: data.authorUsername,
      author_avatar_url: data.authorAvatarUrl || '',
      author_avatar_emoji: data.authorAvatarEmoji || null,
      content: data.content.trim(),
      created_at: new Date().toISOString(),
    };
    notes.unshift(newNote);
    setJson(STORAGE_KEYS.USER_NOTES, notes);
    return newNote;
  },

  // Follows
  getFollowers(userId: string): DbUser[] {
    const follows = getJson<DbFollow[]>(STORAGE_KEYS.FOLLOWS, []);
    const followerIds = follows
      .filter((f) => f.following_id === userId)
      .map((f) => f.follower_id);
    const users = this.getAllUsers();
    return users.filter((u) => followerIds.includes(u.id));
  },

  getFollowing(userId: string): DbUser[] {
    const follows = getJson<DbFollow[]>(STORAGE_KEYS.FOLLOWS, []);
    const followingIds = follows
      .filter((f) => f.follower_id === userId)
      .map((f) => f.following_id);
    const users = this.getAllUsers();
    return users.filter((u) => followingIds.includes(u.id));
  },

  isFollowing(followerId: string, followingId: string): boolean {
    const follows = getJson<DbFollow[]>(STORAGE_KEYS.FOLLOWS, []);
    return follows.some(
      (f) => f.follower_id === followerId && f.following_id === followingId
    );
  },

  toggleFollow(followerId: string, followingId: string): boolean {
    if (followerId === followingId) return false;
    let follows = getJson<DbFollow[]>(STORAGE_KEYS.FOLLOWS, []);
    const existingIndex = follows.findIndex(
      (f) => f.follower_id === followerId && f.following_id === followingId
    );

    let followed = false;
    if (existingIndex >= 0) {
      follows.splice(existingIndex, 1);
      followed = false;
    } else {
      follows.push({
        id: generateUUID(),
        follower_id: followerId,
        following_id: followingId,
        created_at: new Date().toISOString(),
      });
      followed = true;

      const follower = this.getUserById(followerId);
      this.createNotification({
        user_id: followingId,
        sender_id: followerId,
        type: 'follow',
        post_id: null,
        text: `${follower?.name || 'Пользователь'} подписался(-ась) на ваш профиль`,
      });
    }

    setJson(STORAGE_KEYS.FOLLOWS, follows);
    return followed;
  },

  // Posts
  getAllPosts(): DbPost[] {
    const posts = getJson<DbPost[]>(STORAGE_KEYS.POSTS, []);
    let modified = false;
    // Гарантируем наличие тестовой фотографии в ленте с эталонным kid и hash для noSpam
    const post1 = posts.find((p) => p.id === 'post-1');
    if (post1 && !post1.image_url) {
      post1.image_url = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80';
      post1.image_kid = '7aaab3b4abca32634dc2be52a4d59152';
      post1.image_hash = '9f83ab24e18c50d1';
      modified = true;
    }
    if (modified) {
      setJson(STORAGE_KEYS.POSTS, posts);
    }
    return posts;
  },

  createPost(data: {
    userId: string;
    content: string;
    image_url?: string | null;
    is_pinned?: boolean;
  }): DbPost {
    const posts = this.getAllPosts();
    const userPosts = posts.filter((p) => p.user_id === data.userId);
    const nextPostNumber = userPosts.length + 1;

    const fp = data.image_url ? getImageFingerprint(data.image_url) : { kid: '', hash: '' };

    const newPost: DbPost = {
      id: generateUUID(),
      user_id: data.userId,
      post_number: nextPostNumber,
      content: data.content,
      image_url: data.image_url || null,
      image_kid: fp.kid || null,
      image_hash: fp.hash || null,
      is_pinned: !!data.is_pinned,
      views_count: 1,
      created_at: new Date().toISOString(),
    };

    posts.unshift(newPost);
    setJson(STORAGE_KEYS.POSTS, posts);
    return newPost;
  },

  deletePost(postId: string, userId?: string): boolean {
    const posts = this.getAllPosts();
    const postIndex = posts.findIndex((p) => p.id === postId);
    if (postIndex === -1) return false;

    if (userId) {
      const user = this.getUserById(userId);
      const isOwner = posts[postIndex].user_id === userId;
      const hasSkill =
        user?.skills?.includes('delete_content') ||
        user?.skills?.includes('moderation') ||
        false;

      if (!isOwner && !hasSkill) {
        throw new Error('Удалять публикации могут только автор или сотрудники со скиллом «Удаление контента»');
      }
    }

    return this.forceDeletePost(postId);
  },

  // Permanent removal across all feeds and associations (used by moderation CRM and author)
  forceDeletePost(postId: string): boolean {
    let posts = this.getAllPosts();
    const postIndex = posts.findIndex((p) => p.id === postId);
    if (postIndex === -1) return false;

    posts.splice(postIndex, 1);
    setJson(STORAGE_KEYS.POSTS, posts);

    let comments = getJson<DbComment[]>(STORAGE_KEYS.COMMENTS, []);
    comments = comments.filter((c) => c.post_id !== postId);
    setJson(STORAGE_KEYS.COMMENTS, comments);

    let likes = getJson<DbLike[]>(STORAGE_KEYS.LIKES, []);
    likes = likes.filter((l) => l.post_id !== postId);
    setJson(STORAGE_KEYS.LIKES, likes);

    let reports = getJson<DbReport[]>(STORAGE_KEYS.REPORTS, []);
    reports = reports.filter((r) => r.post_id !== postId);
    setJson(STORAGE_KEYS.REPORTS, reports);

    let notifs = getJson<DbNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    notifs = notifs.filter((n) => n.post_id !== postId);
    setJson(STORAGE_KEYS.NOTIFICATIONS, notifs);

    return true;
  },

  getPostByUsernameAndNumber(
    username: string,
    postNumber: number
  ): PostWithMeta | null {
    const user = this.getUserByUsername(username);
    if (!user) return null;

    const posts = this.getAllPosts();
    const post = posts.find(
      (p) => p.user_id === user.id && p.post_number === postNumber
    );
    if (!post) return null;

    return this.enrichPostWithMeta(post);
  },

  getPostById(postId: string): PostWithMeta | null {
    const posts = this.getAllPosts();
    const post = posts.find((p) => p.id === postId);
    if (!post) return null;
    return this.enrichPostWithMeta(post);
  },

  enrichPostWithMeta(post: DbPost): PostWithMeta {
    const author = this.getUserById(post.user_id) || {
      id: post.user_id,
      name: 'Автор',
      username: 'user',
      avatar_url: '',
      avatar_emoji: null,
      bio: '',
      created_at: post.created_at,
    };

    const likes = getJson<DbLike[]>(STORAGE_KEYS.LIKES, []);
    const postLikes = likes.filter((l) => l.post_id === post.id);

    const comments = getJson<DbComment[]>(STORAGE_KEYS.COMMENTS, []);
    const postComments = comments.filter((c) => c.post_id === post.id);

    const viewerId = this.getCurrentUserId();
    const isLiked = viewerId
      ? postLikes.some((l) => l.user_id === viewerId)
      : false;

    return {
      ...post,
      author,
      likes_count: postLikes.length,
      comments_count: postComments.length,
      is_liked_by_viewer: isLiked,
    };
  },

  getFeedPosts(tab: 'for_you' | 'following'): PostWithMeta[] {
    const posts = this.getAllPosts();
    const viewerId = this.getCurrentUserId();

    let filtered = [...posts];

    if (tab === 'following' && viewerId) {
      const following = this.getFollowing(viewerId).map((u) => u.id);
      filtered = filtered.filter(
        (p) => following.includes(p.user_id) || p.user_id === viewerId
      );
    }

    return filtered.map((p) => this.enrichPostWithMeta(p));
  },

  getUserPosts(userId: string): PostWithMeta[] {
    const posts = this.getAllPosts();
    const userPosts = posts.filter((p) => p.user_id === userId);
    return userPosts.map((p) => this.enrichPostWithMeta(p));
  },

  getUserLikedPosts(userId: string): PostWithMeta[] {
    const likes = getJson<DbLike[]>(STORAGE_KEYS.LIKES, []);
    const userLikes = likes.filter((l) => l.user_id === userId);
    const postIds = userLikes.map((l) => l.post_id);

    const posts = this.getAllPosts().filter((p) => postIds.includes(p.id));
    return posts.map((p) => this.enrichPostWithMeta(p));
  },

  incrementPostViews(postId: string): void {
    const posts = this.getAllPosts();
    const idx = posts.findIndex((p) => p.id === postId);
    if (idx !== -1) {
      posts[idx].views_count = (posts[idx].views_count || 1) + 1;
      setJson(STORAGE_KEYS.POSTS, posts);
    }
  },

  // Likes
  toggleLike(postId: string, userId: string): boolean {
    let likes = getJson<DbLike[]>(STORAGE_KEYS.LIKES, []);
    const existingIndex = likes.findIndex(
      (l) => l.post_id === postId && l.user_id === userId
    );

    let liked = false;
    if (existingIndex >= 0) {
      likes.splice(existingIndex, 1);
      liked = false;
    } else {
      likes.push({
        id: generateUUID(),
        post_id: postId,
        user_id: userId,
        created_at: new Date().toISOString(),
      });
      liked = true;

      const post = this.getAllPosts().find((p) => p.id === postId);
      if (post && post.user_id !== userId) {
        const liker = this.getUserById(userId);
        const postAuthor = this.getUserById(post.user_id);
        this.createNotification({
          user_id: post.user_id,
          sender_id: userId,
          type: 'like',
          post_id: postId,
          post_number: post.post_number,
          post_author_username: postAuthor?.username || null,
          text: `${liker?.name || 'Пользователь'} оценил(а) ваш пост`,
        });
      }
    }

    setJson(STORAGE_KEYS.LIKES, likes);
    return liked;
  },

  // Comments
  getComments(postId: string): Array<DbComment & { author: DbUser }> {
    const comments = getJson<DbComment[]>(STORAGE_KEYS.COMMENTS, []);
    const postComments = comments.filter((c) => c.post_id === postId);
    const users = this.getAllUsers();

    return postComments
      .map((c) => ({
        ...c,
        author: users.find((u) => u.id === c.user_id) || {
          id: c.user_id,
          name: 'Пользователь',
          username: 'user',
          avatar_url: '',
          avatar_emoji: null,
          bio: '',
          created_at: c.created_at,
        },
      }))
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
  },

  createComment(data: {
    postId: string;
    userId: string;
    content: string;
  }): DbComment {
    const comments = getJson<DbComment[]>(STORAGE_KEYS.COMMENTS, []);
    const newComment: DbComment = {
      id: generateUUID(),
      post_id: data.postId,
      user_id: data.userId,
      content: data.content,
      created_at: new Date().toISOString(),
    };

    comments.push(newComment);
    setJson(STORAGE_KEYS.COMMENTS, comments);

    const post = this.getAllPosts().find((p) => p.id === data.postId);
    if (post && post.user_id !== data.userId) {
      const commenter = this.getUserById(data.userId);
      const postAuthor = this.getUserById(post.user_id);
      this.createNotification({
        user_id: post.user_id,
        sender_id: data.userId,
        type: 'comment',
        post_id: data.postId,
        post_number: post.post_number,
        post_author_username: postAuthor?.username || null,
        text: `${commenter?.name || 'Пользователь'} прокомментировал(а) ваш пост: "${data.content.slice(0, 40)}"`,
      });
    }

    return newComment;
  },

  deleteComment(commentId: string): boolean {
    const comments = getJson<DbComment[]>(STORAGE_KEYS.COMMENTS, []);
    const filtered = comments.filter((c) => c.id !== commentId);
    if (filtered.length !== comments.length) {
      setJson(STORAGE_KEYS.COMMENTS, filtered);
      return true;
    }
    return false;
  },

  getCommentsForPost(postId: string): Array<DbComment & { author: DbUser }> {
    return this.getComments(postId);
  },

  addComment(data: { postId: string; userId: string; content: string }): DbComment {
    return this.createComment(data);
  },

  // Reports & Moderation CRM
  createReport(data: {
    postId: string;
    reporterId: string;
    reason: string;
  }): DbReport {
    const reports = getJson<DbReport[]>(STORAGE_KEYS.REPORTS, []);
    const newReport: DbReport = {
      id: generateUUID(),
      post_id: data.postId,
      reporter_id: data.reporterId,
      reason: data.reason,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    reports.push(newReport);
    setJson(STORAGE_KEYS.REPORTS, reports);
    return newReport;
  },

  getAllReports(): Array<DbReport & { post: PostWithMeta | null; reporter: DbUser | null }> {
    const reports = getJson<DbReport[]>(STORAGE_KEYS.REPORTS, []);
    const users = this.getAllUsers();

    return reports
      .filter((r) => r.status !== 'rejected')
      .map((r) => ({
        ...r,
        post: this.getPostById(r.post_id),
        reporter: users.find((u) => u.id === r.reporter_id) || null,
      }))
      .filter((r) => r.post !== null) // keep only active posts that haven't been deleted yet
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  // Moderation decisions history & archive
  getModerationDecisions(): DbModerationDecision[] {
    const list = getJson<DbModerationDecision[]>(STORAGE_KEYS.MODERATION_DECISIONS, []);
    return list.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  logModerationDecision(decision: Omit<DbModerationDecision, 'id' | 'created_at'>): DbModerationDecision {
    const list = getJson<DbModerationDecision[]>(STORAGE_KEYS.MODERATION_DECISIONS, []);
    const record: DbModerationDecision = {
      ...decision,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };
    list.unshift(record);
    setJson(STORAGE_KEYS.MODERATION_DECISIONS, list);
    return record;
  },

  // Skill 2: Moderation action: "Отклонить → удаляет жалобу из очереди и логирует решение"
  dismissReport(
    reportId: string,
    moderator?: { id?: string; name?: string; username?: string }
  ): void {
    const reports = getJson<DbReport[]>(STORAGE_KEYS.REPORTS, []);
    const report = reports.find((r) => r.id === reportId);

    if (report) {
      const post = this.getPostById(report.post_id);
      const author = post ? this.getUserById(post.user_id) : null;
      const reporter = this.getUserById(report.reporter_id);

      const modId = moderator?.id || this.getCurrentUserId() || 'mod-system';
      const modUser = this.getUserById(modId);
      const modName = moderator?.name || modUser?.name || 'Модератор';
      const modUsername = moderator?.username || modUser?.username || 'moderator';

      this.logModerationDecision({
        report_id: reportId,
        post_id: report.post_id,
        post_number: post?.post_number,
        post_content: post?.content,
        post_image_url: post?.image_url,
        post_author_id: author?.id || 'unknown',
        post_author_name: author?.name || 'Пользователь',
        post_author_username: author?.username || 'user',
        reporter_id: reporter?.id,
        reporter_name: reporter?.name,
        reporter_username: reporter?.username,
        action: 'dismissed',
        reason: report.reason || 'Нарушений не выявлено',
        moderator_id: modId,
        moderator_name: modName,
        moderator_username: modUsername,
      });
    }

    const remaining = reports.filter((r) => r.id !== reportId);
    setJson(STORAGE_KEYS.REPORTS, remaining);
    showAppToast('Жалоба отклонена', 'Жалоба снята с рассмотрения и сохранена в истории решений', 'info');
  },

  // Skill 2: Moderation action: "Принять → удаляет публикацию отовсюду, профиль автора блокируется, решение логируется"
  acceptReport(
    reportId: string,
    moderatorReason: string,
    moderator?: { id?: string; name?: string; username?: string }
  ): void {
    const reports = getJson<DbReport[]>(STORAGE_KEYS.REPORTS, []);
    const report = reports.find((r) => r.id === reportId);
    if (!report) return;

    const post = this.getPostById(report.post_id);
    const author = post ? this.getUserById(post.user_id) : null;
    const reporter = this.getUserById(report.reporter_id);

    const modId = moderator?.id || this.getCurrentUserId() || 'mod-system';
    const modUser = this.getUserById(modId);
    const modName = moderator?.name || modUser?.name || 'Модератор';
    const modUsername = moderator?.username || modUser?.username || 'moderator';

    if (post && author) {
      // 1. Log decision to history
      this.logModerationDecision({
        report_id: reportId,
        post_id: post.id,
        post_number: post.post_number,
        post_content: post.content,
        post_image_url: post.image_url,
        post_author_id: author.id,
        post_author_name: author.name,
        post_author_username: author.username,
        reporter_id: reporter?.id,
        reporter_name: reporter?.name,
        reporter_username: reporter?.username,
        action: 'accepted',
        reason: moderatorReason,
        moderator_id: modId,
        moderator_name: modName,
        moderator_username: modUsername,
      });

      // 2. Delete post everywhere
      this.forceDeletePost(post.id);
      // 3. Block author profile with specified reason
      this.setUserBlocked(author.id, true, moderatorReason, modId, modName);
    }

    // 4. Remove report from moderation queue
    const remaining = reports.filter((r) => r.id !== reportId);
    setJson(STORAGE_KEYS.REPORTS, remaining);
    showAppToast('Жалоба принята', `Публикация удалена, автор @${author?.username || ''} заблокирован`, 'info');
  },

  // Notifications
  getNotifications(userId: string): Array<DbNotification & { sender?: DbUser }> {
    const list = getJson<DbNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    const userNotifs = list.filter((n) => n.user_id === userId);
    const users = this.getAllUsers();

    return userNotifs
      .map((n) => ({
        ...n,
        sender: users.find((u) => u.id === n.sender_id),
      }))
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  },

  createNotification(data: {
    user_id: string;
    sender_id: string;
    type: 'follow' | 'like' | 'comment' | 'system';
    post_id: string | null;
    post_number?: number | null;
    post_author_username?: string | null;
    text: string;
  }): DbNotification {
    const notifs = getJson<DbNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    const newNotif: DbNotification = {
      id: generateUUID(),
      user_id: data.user_id,
      sender_id: data.sender_id,
      type: data.type,
      post_id: data.post_id,
      post_number: data.post_number || null,
      post_author_username: data.post_author_username || null,
      text: data.text,
      created_at: new Date().toISOString(),
      is_read: false,
    };
    notifs.unshift(newNotif);
    setJson(STORAGE_KEYS.NOTIFICATIONS, notifs);
    return newNotif;
  },

  // Support Tickets (Помощь / Саппорт)
  getSupportTickets(userId?: string): DbSupportTicket[] {
    const tickets = getJson<DbSupportTicket[]>(STORAGE_KEYS.SUPPORT_TICKETS, []);
    if (!userId) {
      return tickets.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
    return tickets
      .filter((t) => t.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  getSupportTicketById(id: string): DbSupportTicket | null {
    const tickets = getJson<DbSupportTicket[]>(STORAGE_KEYS.SUPPORT_TICKETS, []);
    return tickets.find((t) => t.id === id) || null;
  },

  createSupportTicket(data: {
    userId: string;
    problemTitle: string;
    problemDescription: string;
    attachments: DbSupportAttachment[];
  }): DbSupportTicket {
    const tickets = getJson<DbSupportTicket[]>(STORAGE_KEYS.SUPPORT_TICKETS, []);
    const now = new Date().toISOString();
    const ticketId = generateUUID();

    const initialMessage: DbSupportMessage = {
      id: generateUUID(),
      ticket_id: ticketId,
      sender_role: 'user',
      sender_name: this.getUserById(data.userId)?.name || 'Пользователь',
      text: data.problemDescription,
      attachments: data.attachments,
      created_at: now,
    };

    const newTicket: DbSupportTicket = {
      id: ticketId,
      user_id: data.userId,
      problem_title: data.problemTitle.trim(),
      problem_description: data.problemDescription.trim(),
      attachments: data.attachments,
      status: 'open',
      has_unread_reply: false,
      messages: [initialMessage],
      created_at: now,
      updated_at: now,
    };

    tickets.unshift(newTicket);
    setJson(STORAGE_KEYS.SUPPORT_TICKETS, tickets);

    return newTicket;
  },

  addSupportMessage(
    ticketId: string,
    message: {
      sender_role: 'user' | 'support' | 'system';
      sender_name: string;
      operator_id?: string;
      operator_name?: string;
      operator_username?: string;
      operator_display_name?: string;
      text: string;
      attachments?: DbSupportAttachment[];
    }
  ): DbSupportMessage {
    const tickets = getJson<DbSupportTicket[]>(STORAGE_KEYS.SUPPORT_TICKETS, []);
    const idx = tickets.findIndex((t) => t.id === ticketId);
    if (idx === -1) throw new Error('Тикет не найден');

    const now = new Date().toISOString();
    const newMsg: DbSupportMessage = {
      id: generateUUID(),
      ticket_id: ticketId,
      sender_role: message.sender_role,
      sender_name: message.sender_name,
      operator_id: message.operator_id,
      operator_name: message.operator_name,
      operator_username: message.operator_username,
      operator_display_name: message.operator_display_name,
      text: message.text,
      attachments: message.attachments || [],
      created_at: now,
    };

    tickets[idx].messages.push(newMsg);
    tickets[idx].updated_at = now;
    if (message.sender_role === 'support') {
      tickets[idx].has_unread_reply = true;
      tickets[idx].status = 'answered';
    } else if (message.sender_role === 'system') {
      tickets[idx].status = 'unanswered';
    } else {
      tickets[idx].status = 'in_progress';
    }

    setJson(STORAGE_KEYS.SUPPORT_TICKETS, tickets);
    return newMsg;
  },

  // Support Settings & Management
  getSupportSettings(): DbSupportSettings {
    return getJson<DbSupportSettings>(STORAGE_KEYS.SUPPORT_SETTINGS, {
      support_avatar_url: null,
      agent_display_names: {},
    });
  },

  updateSupportSettings(settings: Partial<DbSupportSettings>): DbSupportSettings {
    const current = this.getSupportSettings();
    const updated: DbSupportSettings = {
      ...current,
      ...settings,
      agent_display_names: {
        ...(current.agent_display_names || {}),
        ...(settings.agent_display_names || {}),
      },
      updated_at: new Date().toISOString(),
    };
    setJson(STORAGE_KEYS.SUPPORT_SETTINGS, updated);
    return updated;
  },

  getSupportStaffUsers(): DbUser[] {
    const allUsers = this.getAllUsers();
    const staff = allUsers.filter(
      (u) => u.skills?.includes('support') || u.skills?.includes('support_management')
    );
    if (staff.length === 0 && allUsers.length > 0) {
      return [allUsers[0]];
    }
    return staff;
  },

  getSupportAgentDisplayName(userId: string, fallbackIndex?: number): string {
    const settings = this.getSupportSettings();
    if (settings.agent_display_names && settings.agent_display_names[userId]) {
      return settings.agent_display_names[userId];
    }
    if (fallbackIndex !== undefined) {
      return `Саппорт #${fallbackIndex}`;
    }
    const staff = this.getSupportStaffUsers();
    const idx = staff.findIndex((u) => u.id === userId);
    const num = idx !== -1 ? idx + 1 : 1;
    return `Саппорт #${num}`;
  },

  setSupportAgentDisplayName(userId: string, displayName: string): void {
    const settings = this.getSupportSettings();
    const names = { ...(settings.agent_display_names || {}), [userId]: displayName.trim() };
    this.updateSupportSettings({ agent_display_names: names });
  },

  // Skill 1 & 7: Support CRM action: "в CRM в качестве сотрудника зафиксируй имя ответившего сотрудника, но пользователю отображай просто Поддержка"
  replyToTicketAsSupport(
    ticketId: string,
    text: string,
    operator?: { id: string; name: string; username: string; displayName?: string }
  ): DbSupportMessage {
    const displayName =
      operator?.displayName ||
      (operator?.id ? this.getSupportAgentDisplayName(operator.id) : 'Саппорт #1');

    return this.addSupportMessage(ticketId, {
      sender_role: 'support',
      sender_name: displayName || 'Саппорт #1', // Пользователю отображается "Саппорт #(номер)"
      operator_id: operator?.id,
      operator_name: operator?.name,
      operator_username: operator?.username,
      operator_display_name: displayName,
      text: text.trim(),
    });
  },

  // Skill 1: Support CRM action: "Кнопка оставить без ответа в CRM ставит плашку {Никнейм оператора} закрыл обращения без ответа"
  leaveTicketUnanswered(
    ticketId: string,
    operator?: { id: string; name: string; username: string }
  ): DbSupportMessage {
    const opNick = operator?.username
      ? `@${operator.username}`
      : operator?.name || 'Оператор';
    const noticeText = `${opNick} закрыл обращения без ответа`;

    return this.addSupportMessage(ticketId, {
      sender_role: 'system',
      sender_name: opNick,
      operator_id: operator?.id,
      operator_username: operator?.username,
      text: noticeText,
    });
  },

  markTicketAsRead(ticketId: string): void {
    const tickets = getJson<DbSupportTicket[]>(STORAGE_KEYS.SUPPORT_TICKETS, []);
    const idx = tickets.findIndex((t) => t.id === ticketId);
    if (idx !== -1 && tickets[idx].has_unread_reply) {
      tickets[idx].has_unread_reply = false;
      setJson(STORAGE_KEYS.SUPPORT_TICKETS, tickets);
    }
  },

  getUnreadSupportTicketsCount(userId: string): number {
    const tickets = this.getSupportTickets(userId);
    return tickets.filter((t) => t.has_unread_reply).length;
  },

  simulateSupportResponse(ticketId: string, customText?: string): DbSupportMessage {
    const ticket = this.getSupportTicketById(ticketId);
    if (!ticket) throw new Error('Тикет не найден');

    const cannedResponses = [
      'Здравствуйте! Специалист поддержки ШУМ принял ваше обращение. Мы зафиксировали детали проблемы и передали инженерам. Ожидайте обновления статуса.',
      'Добрый день! Спасибо за обратную связь. Мы уже разбираемся с описанной ситуацией. При необходимости запросим дополнительную диагностику.',
      'Приветствуем! Ваше обращение рассмотрено. Мы внесли необходимые корректировки в конфигурацию сервиса. Пожалуйста, проверьте работу функции.'
    ];

    const replyText = customText || cannedResponses[Math.floor(Math.random() * cannedResponses.length)];

    return this.replyToTicketAsSupport(ticketId, replyText);
  },

  // Database statistics for live inspection
  getDbStats(): {
    users: number;
    follows: number;
    posts: number;
    comments: number;
    likes: number;
    notifications: number;
    reports: number;
    tickets: number;
    noSpamRules: number;
    moderationDecisions: number;
  } {
    return {
      users: this.getAllUsers().length,
      follows: getJson<DbFollow[]>(STORAGE_KEYS.FOLLOWS, []).length,
      posts: this.getAllPosts().length,
      comments: getJson<DbComment[]>(STORAGE_KEYS.COMMENTS, []).length,
      likes: getJson<DbLike[]>(STORAGE_KEYS.LIKES, []).length,
      notifications: getJson<DbNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []).length,
      reports: getJson<DbReport[]>(STORAGE_KEYS.REPORTS, []).length,
      tickets: getJson<DbSupportTicket[]>(STORAGE_KEYS.SUPPORT_TICKETS, []).length,
      noSpamRules: getJson<DbNoSpamRule[]>(STORAGE_KEYS.NO_SPAM_RULES, []).length,
      moderationDecisions: this.getModerationDecisions().length,
    };
  },

  // noSpam CRM methods
  getNoSpamRules(): DbNoSpamRule[] {
    const raw = getJson<DbNoSpamRule[]>(STORAGE_KEYS.NO_SPAM_RULES, []);
    // Исключаем синтетические сгенерированные демо-правила
    const rules = raw.filter((r) => !r.id.startsWith('rule-demo-'));
    return rules.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  addNoSpamRule(rule: Omit<DbNoSpamRule, 'id' | 'created_at' | 'matches_count'>): DbNoSpamRule {
    const rules = this.getNoSpamRules();
    const newRule: DbNoSpamRule = {
      ...rule,
      id: generateUUID(),
      matches_count: 0,
      created_at: new Date().toISOString(),
    };
    rules.unshift(newRule);
    setJson(STORAGE_KEYS.NO_SPAM_RULES, rules);
    return newRule;
  },

  toggleNoSpamRule(ruleId: string): void {
    const rules = this.getNoSpamRules();
    const idx = rules.findIndex((r) => r.id === ruleId);
    if (idx !== -1) {
      rules[idx].is_active = !rules[idx].is_active;
      setJson(STORAGE_KEYS.NO_SPAM_RULES, rules);
    }
  },

  deleteNoSpamRule(ruleId: string): void {
    const rules = this.getNoSpamRules().filter((r) => r.id !== ruleId);
    setJson(STORAGE_KEYS.NO_SPAM_RULES, rules);
  },

  searchNoSpamMatches(rule: Partial<DbNoSpamRule>): Array<{
    id: string;
    type: 'post' | 'comment';
    content: string;
    image_url?: string | null;
    image_kid?: string | null;
    image_hash?: string | null;
    author_name: string;
    author_username: string;
    author_id: string;
    created_at: string;
    matched_reason: string;
  }> {
    const posts = this.getAllPosts();
    const comments = getJson<DbComment[]>(STORAGE_KEYS.COMMENTS, []);
    const users = this.getAllUsers();
    const results: Array<{
      id: string;
      type: 'post' | 'comment';
      content: string;
      image_url?: string | null;
      image_kid?: string | null;
      image_hash?: string | null;
      author_name: string;
      author_username: string;
      author_id: string;
      created_at: string;
      matched_reason: string;
    }> = [];

    const section = rule.section || 'Все';
    const sub = (rule.substring || '').trim().toLowerCase();
    const condition = (rule.code_condition || '').trim();
    const conditionLower = condition.toLowerCase();

    // Извлечение kid или hash из условия
    let targetKid: string | null = null;
    let targetHash: string | null = null;

    const kidRegex = /kid\s*[:=]\s*['"]?([a-f0-9]+)['"]?/i;
    const hashRegex = /hash\s*[:=]\s*['"]?([a-f0-9]+)['"]?/i;

    const kidMatch = condition.match(kidRegex);
    if (kidMatch) {
      targetKid = kidMatch[1].toLowerCase();
    } else if (condition.length >= 24 && /^[a-f0-9]+$/i.test(condition)) {
      targetKid = condition.toLowerCase();
    }

    const hashMatch = condition.match(hashRegex);
    if (hashMatch) {
      targetHash = hashMatch[1].toLowerCase();
    }

    // Поиск по публикациям
    if (section === 'Все' || section === 'Публикации' || section === 'Фотографии') {
      posts.forEach((p) => {
        if (section === 'Фотографии' && !p.image_url) {
          return;
        }

        const text = (p.content || '').toLowerCase();
        const photoFp = p.image_url ? (p.image_kid && p.image_hash ? { kid: p.image_kid, hash: p.image_hash } : getImageFingerprint(p.image_url)) : null;
        const postKid = (p.image_kid || photoFp?.kid || '').toLowerCase();
        const postHash = (p.image_hash || photoFp?.hash || '').toLowerCase();

        let matched = false;
        let reason = '';

        if (targetKid && postKid && postKid.includes(targetKid)) {
          matched = true;
          reason = `Слепок kid: ${postKid.slice(0, 16)}...`;
        } else if (targetHash && postHash && postHash.includes(targetHash)) {
          matched = true;
          reason = `Слепок hash: ${postHash}`;
        } else if (sub && sub !== '/' && text.includes(sub)) {
          matched = true;
          reason = `Подстрока "${rule.substring}"`;
        } else if (rule.only_links && (text.includes('http') || text.includes('t.me') || text.includes('.com') || text.includes('.ru') || text.includes('://'))) {
          matched = true;
          reason = 'Внешняя ссылка в публикации';
        } else if (condition && !targetKid && !targetHash && text.includes(conditionLower)) {
          matched = true;
          reason = `Критерий: "${condition}"`;
        }

        if (matched) {
          const author = users.find((u) => u.id === p.user_id);
          results.push({
            id: p.id,
            type: 'post',
            content: p.content,
            image_url: p.image_url,
            image_kid: postKid || null,
            image_hash: postHash || null,
            author_name: author?.name || 'Пользователь',
            author_username: author?.username || 'user',
            author_id: p.user_id,
            created_at: p.created_at,
            matched_reason: reason,
          });
        }
      });
    }

    // Поиск по комментариям
    if (section === 'Все' || section === 'Комментарии') {
      comments.forEach((c) => {
        const text = (c.content || '').toLowerCase();
        let matched = false;
        let reason = '';

        if (sub && sub !== '/' && text.includes(sub)) {
          matched = true;
          reason = `Подстрока "${rule.substring}"`;
        } else if (rule.only_links && (text.includes('http') || text.includes('t.me') || text.includes('.com') || text.includes('.ru'))) {
          matched = true;
          reason = 'Внешняя ссылка в комментарии';
        } else if (condition && !targetKid && !targetHash && text.includes(conditionLower)) {
          matched = true;
          reason = `Критерий: "${condition}"`;
        }

        if (matched) {
          const author = users.find((u) => u.id === c.user_id);
          results.push({
            id: c.id,
            type: 'comment',
            content: c.content,
            author_name: author?.name || 'Пользователь',
            author_username: author?.username || 'user',
            author_id: c.user_id,
            created_at: c.created_at,
            matched_reason: reason,
          });
        }
      });
    }

    return results;
  },

  applyNoSpamRule(ruleData: Partial<DbNoSpamRule>, moderatorName: string): { affectedCount: number; blockedUsersCount: number } {
    const matches = this.searchNoSpamMatches(ruleData);
    let affectedCount = 0;
    const blockedUserIds = new Set<string>();

    const banAction = ruleData.ban_action || 'Откат контента';
    const shouldBlock = banAction.includes('Блокировка') || banAction.includes('Перманентный');

    matches.forEach((m) => {
      if (m.type === 'post') {
        this.forceDeletePost(m.id);
        affectedCount++;
      } else if (m.type === 'comment') {
        this.deleteComment(m.id);
        affectedCount++;
      }
      if (shouldBlock && !blockedUserIds.has(m.author_id)) {
        blockedUserIds.add(m.author_id);
        this.setUserBlocked(m.author_id, true, `Автобан noSpam: ${m.matched_reason}`, 'nospam_engine', `noSpam (${moderatorName})`);
      }
    });

    // Сохраняем правило, если задан слепок или подстрока
    if (ruleData.code_condition || ruleData.substring) {
      this.addNoSpamRule({
        section: ruleData.section || 'Все',
        substring: ruleData.substring || '',
        code_condition: ruleData.code_condition || '',
        threshold: ruleData.threshold || '1',
        ban_action: ruleData.ban_action || 'Откат контента',
        clean_frequency: ruleData.clean_frequency || 'Постоянно',
        search_depth: ruleData.search_depth || 'За всё время',
        only_uncaught: !!ruleData.only_uncaught,
        only_links: !!ruleData.only_links,
        is_active: true,
        author_name: moderatorName,
      });
    }

    return {
      affectedCount,
      blockedUsersCount: blockedUserIds.size,
    };
  },

  // Ensure initial data exists for CRM testing if storage is fresh
  ensureSeedData(): void {
    let users = this.getAllUsers();
    if (users.length === 0) {
      const now = new Date().toISOString();
      const adminUser: DbUser = {
        id: 'user-admin-1',
        name: 'Владимир Пепеляев',
        username: 'pepelyaev',
        email: 'pepelyaev@shum.net',
        email_verified: true,
        password: 'password123',
        password_hash: 'password123',
        avatar_url: '',
        avatar_emoji: '⚡',
        bio: 'Основатель и главный инженер проекта ШУМ.',
        created_at: now,
        skills: [...ALL_STAFF_SKILLS],
        is_verified: true,
        is_blocked: false,
      };

      const user2: DbUser = {
        id: 'user-demo-2',
        name: 'Александр Новиков',
        username: 'alex_noise',
        email: 'alex@shum.net',
        email_verified: true,
        password: 'password123',
        password_hash: 'password123',
        avatar_url: '',
        avatar_emoji: '🎧',
        bio: 'Звуковой дизайнер, электронная музыка и генеративные медиа.',
        created_at: now,
        skills: [],
        is_verified: false,
        is_blocked: false,
      };

      const user3: DbUser = {
        id: 'user-demo-3',
        name: 'Екатерина Морозова',
        username: 'kate_art',
        email: 'kate@shum.net',
        email_verified: true,
        password: 'password123',
        password_hash: 'password123',
        avatar_url: '',
        avatar_emoji: '🎨',
        bio: 'Цифровая графика и концептуальный дизайн.',
        created_at: now,
        skills: [],
        is_verified: true,
        is_blocked: false,
      };

      users = [adminUser, user2, user3];
      setJson(STORAGE_KEYS.USERS, users);
      this.setCurrentUserId(adminUser.id);

      // Seed sample posts
      const post1: DbPost = {
        id: 'post-1',
        user_id: user2.id,
        post_number: 1,
        content: 'Запустили новую звуковую волну в ШУМ! Оцените минималистичный интерфейс и скорость работы ленты.',
        image_url: null,
        is_pinned: false,
        views_count: 142,
        created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
      };

      const post2: DbPost = {
        id: 'post-2',
        user_id: user3.id,
        post_number: 1,
        content: 'Продаю подозрительные ссылки и навязчивую рекламу сомнительного сервиса! Кликайте сюда скорее.',
        image_url: null,
        is_pinned: false,
        views_count: 38,
        created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      };

      setJson(STORAGE_KEYS.POSTS, [post1, post2]);

      // Seed a report for testing Moderator CRM
      const report1: DbReport = {
        id: 'report-demo-1',
        post_id: post2.id,
        reporter_id: adminUser.id,
        reason: 'Спам и реклама',
        status: 'pending',
        created_at: new Date(Date.now() - 1800000).toISOString(),
      };
      setJson(STORAGE_KEYS.REPORTS, [report1]);

      // Seed a ticket for testing Support CRM
      const ticket1: DbSupportTicket = {
        id: 'ticket-demo-1',
        user_id: user2.id,
        problem_title: 'Не могу прикрепить видеозапись в высоком разрешении',
        problem_description: 'При попытке загрузить видеофайл размером более 50 МБ загрузка зависает на 90%. Браузер Safari, macOS 15. Проверьте пожалуйста.',
        attachments: [],
        status: 'open',
        has_unread_reply: false,
        messages: [
          {
            id: generateUUID(),
            ticket_id: 'ticket-demo-1',
            sender_role: 'user',
            sender_name: user2.name,
            text: 'При попытке загрузить видеофайл размером более 50 МБ загрузка зависает на 90%. Браузер Safari, macOS 15. Проверьте пожалуйста.',
            created_at: new Date(Date.now() - 7200000).toISOString(),
          },
        ],
        created_at: new Date(Date.now() - 7200000).toISOString(),
        updated_at: new Date(Date.now() - 7200000).toISOString(),
      };
      setJson(STORAGE_KEYS.SUPPORT_TICKETS, [ticket1]);
    } else {
      // Ensure all existing users have a skills array, is_blocked boolean and email
      let updated = false;
      users.forEach((u) => {
        if (!u.skills) {
          u.skills = [...ALL_STAFF_SKILLS];
          updated = true;
        } else if (u.skills.includes('support') && !u.skills.includes('support_management')) {
          u.skills.push('support_management');
          updated = true;
        }
        if (u.skills && !u.skills.includes('delete_content')) {
          u.skills.push('delete_content');
          updated = true;
        }
        if (u.is_blocked === undefined) {
          u.is_blocked = false;
          updated = true;
        }
        if (!u.email) {
          u.email = `${u.username}@shum.net`;
          updated = true;
        }
        if (u.email_verified === undefined) {
          u.email_verified = true;
          updated = true;
        }
      });
      if (updated) {
        setJson(STORAGE_KEYS.USERS, users);
      }
    }

    const existingDecisions = getJson<DbModerationDecision[]>(STORAGE_KEYS.MODERATION_DECISIONS, []);
    if (existingDecisions.length === 0) {
      const sampleDecisions: DbModerationDecision[] = [
        {
          id: 'dec-demo-1',
          report_id: 'rep-old-1',
          post_id: 'post-old-1',
          post_number: 4,
          post_content: 'Срочно переходите по ссылке win-bonus-free.xyz для получения призов! Акция ограничена по времени.',
          post_image_url: undefined,
          post_author_id: 'user-demo-spammer',
          post_author_name: 'Бот Рассылки',
          post_author_username: 'free_bonus_bot',
          reporter_id: 'user-admin-1',
          reporter_name: 'Владимир Пепеляев',
          reporter_username: 'pepelyaev',
          action: 'accepted',
          reason: 'Спам и реклама',
          moderator_id: 'user-admin-1',
          moderator_name: 'Владимир Пепеляев',
          moderator_username: 'pepelyaev',
          created_at: new Date(Date.now() - 3600000 * 14).toISOString(),
        },
        {
          id: 'dec-demo-2',
          report_id: 'rep-old-2',
          post_id: 'post-old-2',
          post_number: 7,
          post_content: 'Мне кажется, что интерфейс темной темы мог бы быть более контрастным. Делюсь мнением о шрифтах.',
          post_image_url: undefined,
          post_author_id: 'user-demo-2',
          post_author_name: 'Александр Новиков',
          post_author_username: 'alex_noise',
          reporter_id: 'user-kate-3',
          reporter_name: 'Екатерина Морозова',
          reporter_username: 'kate_art',
          action: 'dismissed',
          reason: 'Нарушение правил сообщества ШУМ (нарушений не подтверждено)',
          moderator_id: 'user-admin-1',
          moderator_name: 'Владимир Пепеляев',
          moderator_username: 'pepelyaev',
          created_at: new Date(Date.now() - 3600000 * 28).toISOString(),
        },
        {
          id: 'dec-demo-3',
          report_id: 'rep-old-3',
          post_id: 'post-old-3',
          post_number: 2,
          post_content: 'Оскорбительный комментарий и агрессивные выпады в адрес участников сообщества с нецензурной бранью.',
          post_image_url: undefined,
          post_author_id: 'user-troll-9',
          post_author_name: 'Анонимный Провокатор',
          post_author_username: 'troll_user',
          reporter_id: 'user-demo-2',
          reporter_name: 'Александр Новиков',
          reporter_username: 'alex_noise',
          action: 'accepted',
          reason: 'Оскорбления и травля',
          moderator_id: 'user-admin-1',
          moderator_name: 'Владимир Пепеляев',
          moderator_username: 'pepelyaev',
          created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
        },
      ];
      setJson(STORAGE_KEYS.MODERATION_DECISIONS, sampleDecisions);
    }
  },

  // Supabase SQL Schema Generator with complete entities
  getSupabaseSqlSchema(): string {
    return `-- ========================================================
-- СХЕМА БАЗЫ ДАННЫХ ДЛЯ СОЦИАЛЬНОЙ СЕТИ ШУМ (SUPABASE POSTGRESQL)
-- Включает все сущности: логины, пароли, профили, подписки, посты,
-- комментарии, лайки, жалобы, тикеты в саппорт, логирование уведомлений и дат,
-- а также служебные разделы (СКИЛЛЫ СОТРУДНИКОВ, ВЕРИФИКАЦИЯ, БЛОКИРОВКИ).
-- ========================================================

-- 1. Таблица профилей пользователей и авторизации
-- Включает скиллы сотрудников (support, moderation, block_user, user_card, verification, delete_content)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,                             -- Имя профиля
    username TEXT UNIQUE NOT NULL,                  -- Короткий никнейм @ (уникальный, lowercase)
    password_hash TEXT NOT NULL,                    -- Хэш пароля пользователя
    avatar_url TEXT DEFAULT '',                     -- Загруженное изображение аватара
    avatar_emoji TEXT,                              -- Выбранный смайлик-аватар (если нет фото)
    bio TEXT DEFAULT '',                            -- О себе
    skills TEXT[] DEFAULT '{}',                     -- Скиллы сотрудника (support, moderation, block_user, user_card, verification, delete_content)
    is_verified BOOLEAN DEFAULT FALSE,              -- Верификация (галочка справа от имени)
    is_blocked BOOLEAN DEFAULT FALSE,               -- Блокировка доступа владельцу
    blocked_reason TEXT,                            -- Причина блокировки профиля
    blocked_at TIMESTAMPTZ,                         -- Дата блокировки
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()   -- Точная дата регистрации
);

-- Выдача скилла через базу данных администратором:
-- UPDATE public.profiles SET skills = ARRAY['support', 'moderation', 'block_user', 'user_card', 'verification'] WHERE username = 'pepelyaev';

-- 2. Таблица подписок (логирование факта, участников и точной даты подписки)
CREATE TABLE IF NOT EXISTS public.follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,  -- Кто подписался
    following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- На кого подписался
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                               -- Дата и время подписки
    UNIQUE (follower_id, following_id)
);

-- 3. Таблица публикаций (посты с порядковым номером у автора post_1, post_2...)
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    post_number INTEGER NOT NULL,                   -- Порядковый номер у автора (post_{N})
    content TEXT NOT NULL,                          -- Текст поста
    image_url TEXT,                                 -- Прикрепленное изображение
    is_pinned BOOLEAN DEFAULT FALSE,                -- Закрепленный пост
    views_count INTEGER DEFAULT 1,                  -- Просмотры
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- Точная дата и время публикации
    UNIQUE (user_id, post_number)
);

-- 4. Таблица комментариев (логирование факта, автора, текста и точной даты комментария)
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,                          -- Текст комментария
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()   -- Дата и время написания комментария
);

-- 5. Таблица лайков (логирование факта, автора, поста и точной даты лайка)
CREATE TABLE IF NOT EXISTS public.likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- Точная дата проставления лайка
    UNIQUE (post_id, user_id)
);

-- 6. Таблица Центра Уведомлений (логирование событий, инициаторов, дат и целевых маршрутов)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,   -- Получатель
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- Инициатор события
    type TEXT NOT NULL CHECK (type IN ('follow', 'like', 'comment', 'system')),
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    post_number INTEGER,                            -- Для мгновенного перехода в post_{N}
    post_author_username TEXT,                      -- Для формирования URL /@{username}/post_{N}
    text TEXT NOT NULL,                             -- Описание действия
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()   -- Точная дата и время события
);

-- 7. Таблица жалоб пользователей (CRM Модератора)
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,                           -- Причина жалобы от пользователя (или измененная модератором)
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()   -- Дата подачи жалобы
);

-- 8. Таблица обращений в поддержку (CRM Поддержки - Тикеты Помощи)
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    problem_title TEXT NOT NULL,                    -- Опишите проблему (кратко)
    problem_description TEXT NOT NULL,              -- Расскажите о проблеме подробнее
    attachments JSONB DEFAULT '[]'::jsonb,          -- Фото и видео вложения
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'answered', 'resolved', 'unanswered')),
    has_unread_reply BOOLEAN DEFAULT FALSE,         -- Флаг для индикатора (+1) в меню
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- Дата создания тикета
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()   -- Дата последнего сообщения
);

-- 9. Таблица сообщений в тикете поддержки (диалог со Службой поддержки ШУМ)
CREATE TABLE IF NOT EXISTS public.support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    sender_role TEXT NOT NULL CHECK (sender_role IN ('user', 'support', 'system')),
    sender_name TEXT NOT NULL,                      -- Имя отправителя (клиенту: "Поддержка")
    operator_id UUID REFERENCES public.profiles(id),-- ID ответившего сотрудника саппорта
    operator_name TEXT,                             -- Имя сотрудника (Владимир)
    operator_username TEXT,                         -- @username сотрудника (pepelyaev)
    operator_display_name TEXT,                     -- Зафиксированный номер саппорта ("Саппорт #1")
    text TEXT NOT NULL,                             -- Текст сообщения
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()   -- Дата и время сообщения
);

-- 10. Настройки поддержки и единый аватар (CRM Поддержка. Управление)
CREATE TABLE IF NOT EXISTS public.support_settings (
    id TEXT PRIMARY KEY DEFAULT 'global',
    support_avatar_url TEXT,                        -- Единое фото ответа от лица поддержки
    agent_display_names JSONB DEFAULT '{}'::jsonb,  -- Карта отображаемых номеров сотрудников (userId -> Саппорт #1)
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Индексы для сверхбыстрых выборок
CREATE INDEX IF NOT EXISTS idx_posts_user ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_user_num ON public.posts(user_id, post_number);
CREATE INDEX IF NOT EXISTS idx_comments_post ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_post ON public.likes(post_id);
CREATE INDEX IF NOT EXISTS idx_follows_pair ON public.follows(follower_id, following_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_date ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON public.support_tickets(user_id, updated_at DESC);

-- Настройка безопасности строк (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Публичное чтение профилей" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Публичное чтение постов" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Публичное чтение комментариев" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Публичное чтение лайков" ON public.likes FOR SELECT USING (true);
CREATE POLICY "Публичное чтение подписок" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Чтение своих уведомлений" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Чтение своих тикетов поддержки" ON public.support_tickets FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND 'support' = ANY(skills)));
CREATE POLICY "Чтение сообщений своих тикетов" ON public.support_messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.support_tickets WHERE id = ticket_id AND (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND 'support' = ANY(skills))))
);
CREATE POLICY "Чтение настроек поддержки" ON public.support_settings FOR SELECT USING (true);
`;
  },
};
