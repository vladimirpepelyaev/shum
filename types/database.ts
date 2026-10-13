/**
 * Supabase-compatible relational database types for ШУМ Social Network.
 * Every user-generated entity strictly adheres to these relational tables.
 */

export type StaffSkill =
  | 'support'       // 1. Поддержка — CRM поддержки в левом меню
  | 'moderation'    // 2. Модерация — CRM модератора в левом меню
  | 'block_user'    // 3. Блокировка профиля — кнопка "Заблокировать" в трех точках профиля
  | 'user_card'     // 4. Карточка пользователя — кнопка "Карточка", экран /@{username}#info
  | 'verification'  // 5. Верификация пользователя — кнопка "Верифицировать"
  | 'no_spam'       // 6. noSpam — CRM автобанов по шаблонам-слепкам
  | 'support_management' // 7. Поддержка. Управление — вкладка Управление в CRM поддержки, фото саппорта и номера сотрудников
  | 'delete_content'; // 8. Удаление контента — кнопка "Удалить публикацию" в трех точках любого поста (даже чужого)

export interface DbUser {
  id: string; // uuid
  name: string; // display name e.g. "Владимир"
  username: string; // short handle e.g. "pepelyaev" (unique, lowercase)
  email?: string; // email address e.g. "pepelyaev@shum.net"
  email_verified?: boolean; // подтверждение почты при регистрации
  password?: string; // password for auth
  password_hash?: string; // hashed/stored password
  avatar_url: string; // avatar data URL or image link
  avatar_emoji?: string | null; // custom emoji avatar if chosen
  avatar_eyes?: boolean;
  bio: string;
  created_at: string; // ISO date timestamp for registration
  skills?: StaffSkill[]; // Выданные скиллы сотрудника платформы
  is_verified?: boolean; // Галочка справа от имени (скилл Верификация)
  is_blocked?: boolean; // Флаг блокировки аккаунта (скилл Блокировка / Модерация)
  blocked_reason?: string; // Причина блокировки
  blocked_at?: string; // Дата блокировки
  has_subscription?: boolean; // Наличие выданной подписки ШУМ+
  subscription_label?: string; // e.g. "ШУМ Премиум"
}

export interface DbFollow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string; // ISO timestamp - logging fact and date of follow
}

export interface DbPost {
  id: string;
  user_id: string;
  post_number: number; // Sequential post number specifically for this user (1, 2, 3...)
  content: string;
  image_url: string | null;
  image_kid?: string | null; // Контрольный идентификатор изображения (kid)
  image_hash?: string | null; // Сигнатурный хэш изображения (hash)
  is_pinned: boolean;
  views_count: number;
  created_at: string; // ISO timestamp - date of publication
}

export interface DbComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string; // ISO timestamp - date of comment
}

export interface DbLike {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string; // ISO timestamp - logging fact and date of like
}

export interface DbReport {
  id: string;
  post_id: string;
  reporter_id: string;
  reason: string;
  status?: 'pending' | 'accepted' | 'rejected';
  created_at: string; // ISO timestamp
}

export interface DbNotification {
  id: string;
  user_id: string; // recipient of notification
  sender_id: string; // initiator of action
  type: 'follow' | 'like' | 'comment' | 'system';
  post_id: string | null;
  post_number?: number | null;
  post_author_username?: string | null;
  text: string;
  created_at: string; // ISO timestamp - exact date and time of notification
  is_read: boolean;
}

export interface DbSupportAttachment {
  name: string;
  type: 'image' | 'video' | 'file';
  url: string;
  size?: number;
}

export interface DbSupportSettings {
  support_avatar_url: string | null;
  agent_display_names: Record<string, string>; // userId -> custom name e.g. "Саппорт #1"
  updated_at?: string;
}

export interface DbSupportMessage {
  id: string;
  ticket_id: string;
  sender_role: 'user' | 'support' | 'system';
  sender_name: string; // Пользователю отображается "Поддержка"
  operator_id?: string;
  operator_name?: string;
  operator_username?: string;
  operator_display_name?: string; // Номер или имя саппорта в CRM ("Саппорт #1")
  text: string;
  attachments?: DbSupportAttachment[];
  created_at: string;
}

export interface DbSupportTicket {
  id: string;
  user_id: string;
  problem_title: string; // "Опишите проблему"
  problem_description: string; // "Расскажите о проблеме подробнее"
  attachments: DbSupportAttachment[];
  status: 'open' | 'in_progress' | 'answered' | 'resolved' | 'unanswered';
  has_unread_reply: boolean;
  messages: DbSupportMessage[];
  created_at: string;
  updated_at: string;
}

export interface PostWithMeta extends DbPost {
  author: DbUser;
  likes_count: number;
  comments_count: number;
  is_liked_by_viewer: boolean;
}

export interface DbModerationLog {
  id: string;
  target_user_id: string;
  action: 'block' | 'unblock';
  reason: string;
  moderator_id: string;
  moderator_name: string;
  created_at: string;
}

export interface DbModerationDecision {
  id: string;
  report_id?: string;
  post_id: string;
  post_number?: number;
  post_content?: string;
  post_image_url?: string;
  post_author_id: string;
  post_author_name: string;
  post_author_username: string;
  reporter_id?: string;
  reporter_name?: string;
  reporter_username?: string;
  action: 'accepted' | 'dismissed'; // Принято (удаление + блок) или Отклонено
  reason: string;
  moderator_id: string;
  moderator_name: string;
  moderator_username: string;
  created_at: string;
}

export interface DbUserNote {
  id: string;
  user_id: string;
  author_id: string;
  author_name: string;
  author_username: string;
  author_avatar_url?: string;
  author_avatar_emoji?: string | null;
  content: string;
  created_at: string;
}

export interface DbNoSpamRule {
  id: string;
  section: string; // e.g. "Фотографии", "Публикации", "Комментарии", "Профили", "Сообщения"
  substring: string;
  threshold?: string;
  ip?: string;
  user_agent?: string;
  time_before?: string;
  time_after?: string;
  code_condition: string; // e.g. "kid = '7aaab3b4abca32634dc2be52a4d59152' && type = 3500"
  simplification?: string; // "Частичное" | "Полное" | "Строгое"
  ban_action: string; // "Откат контента" | "Блокировка + откат"
  clean_frequency?: string; // "Один раз" | "Периодически" | "Постоянно"
  search_depth?: string; // "10 дней" | "30 дней" | "За всё время"
  only_uncaught?: boolean;
  only_links?: boolean;
  is_active: boolean;
  matches_count: number;
  created_at: string;
  author_name: string;
}

