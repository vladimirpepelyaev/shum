import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  MoreHorizontal,
  Share2,
  Edit3,
  UserPlus,
  UserCheck,
  Copy,
  Check,
  Camera,
  Upload,
  Smile,
  X,
  CreditCard,
  Ban,
  CheckCircle2,
  ShieldAlert,
  AlertTriangle
} from 'lucide-react';
import { DbUser, PostWithMeta } from '../types/database';
import { Avatar } from './Avatar';
import { PostCard } from './PostCard';
import { Composer } from './Composer';
import { EmojiAvatarPickerModal } from './EmojiAvatarPickerModal';
import { itdDb } from '../lib/storage';
import { showAppToast } from '../lib/toast';

interface ProfileViewProps {
  username: string;
  currentUser: DbUser | null;
  onNavigateToProfile: (username: string) => void;
  onNavigateToPost: (username: string, postNumber: number) => void;
  onNavigateToUserCard?: (username: string) => void;
  onOpenReportModal: (postId: string) => void;
  onUserUpdated: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  username,
  currentUser,
  onNavigateToProfile,
  onNavigateToPost,
  onNavigateToUserCard,
  onOpenReportModal,
  onUserUpdated,
}) => {
  const [profileUser, setProfileUser] = useState<DbUser | null>(null);
  const [posts, setPosts] = useState<PostWithMeta[]>([]);
  const [likedPosts, setLikedPosts] = useState<PostWithMeta[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'likes'>('posts');
  const [followers, setFollowers] = useState<DbUser[]>([]);
  const [following, setFollowing] = useState<DbUser[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showEditBioModal, setShowEditBioModal] = useState(false);
  const [showEmojiPickerModal, setShowEmojiPickerModal] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [bioInput, setBioInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [avatarInput, setAvatarInput] = useState('');
  const [emojiInput, setEmojiInput] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const isOwnProfile = currentUser?.id === profileUser?.id;

  // Check staff skills of current logged-in user
  const canBlock = currentUser?.skills?.includes('block_user') || false;
  const canViewUserCard = currentUser?.skills?.includes('user_card') || false;
  const canVerify = currentUser?.skills?.includes('verification') || false;

  const loadProfileData = () => {
    const user = itdDb.getUserByUsername(username);
    if (!user) {
      setProfileUser(null);
      return;
    }

    setProfileUser(user);
    setNameInput(user.name);
    setBioInput(user.bio || '');
    setAvatarInput(user.avatar_url || '');
    setEmojiInput(user.avatar_emoji || null);

    const userPosts = itdDb.getUserPosts(user.id);
    const sorted = [...userPosts].sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    setPosts(sorted);

    const userLiked = itdDb.getUserLikedPosts(user.id);
    setLikedPosts(userLiked);

    const userFollowers = itdDb.getFollowers(user.id);
    const userFollowing = itdDb.getFollowing(user.id);
    setFollowers(userFollowers);
    setFollowing(userFollowing);

    if (currentUser) {
      setIsFollowing(itdDb.isFollowing(currentUser.id, user.id));
    }
  };

  useEffect(() => {
    loadProfileData();
  }, [username, currentUser]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowActionMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showToast = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result && profileUser) {
        const url = event.target.result as string;
        setAvatarInput(url);
        itdDb.updateUser(profileUser.id, { avatar_url: url, avatar_emoji: null });
        loadProfileData();
        onUserUpdated();
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectEmojiAvatar = (emoji: string) => {
    if (!profileUser) return;
    setEmojiInput(emoji);
    setAvatarInput('');
    itdDb.updateUser(profileUser.id, { avatar_emoji: emoji, avatar_url: '' });
    loadProfileData();
    onUserUpdated();
  };

  const handleToggleFollow = () => {
    if (!currentUser || !profileUser) return;
    itdDb.toggleFollow(currentUser.id, profileUser.id);
    loadProfileData();
  };

  const handleSaveProfileEdits = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileUser) return;
    itdDb.updateUser(profileUser.id, {
      name: nameInput.trim() || profileUser.name,
      bio: bioInput.trim(),
      avatar_url: avatarInput,
      avatar_emoji: emojiInput,
    });
    setShowEditBioModal(false);
    loadProfileData();
    onUserUpdated();
  };

  const handleCopyProfileLink = () => {
    const url = `${window.location.origin}/@${username}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setShowActionMenu(false);
    showAppToast('Ссылка скопирована', 'Прямой адрес профиля скопирован в буфер обмена', 'success');
    setTimeout(() => setCopiedLink(false), 1500);
  };

  // Skill 3: Блокировка профиля сотрудником
  const handleToggleBlockProfile = () => {
    if (!profileUser) return;
    const nextState = !profileUser.is_blocked;
    itdDb.setUserBlocked(
      profileUser.id,
      nextState,
      nextState ? 'Блокировка сотрудником платформы ШУМ' : undefined
    );
    setShowActionMenu(false);
    loadProfileData();
    onUserUpdated();
    showToast(nextState ? `Профиль @${profileUser.username} заблокирован` : `Профиль @${profileUser.username} разблокирован`);
  };

  // Skill 5: Верификация пользователя сотрудником (галочка справа от имени)
  const handleToggleVerification = () => {
    if (!profileUser) return;
    const nextState = !profileUser.is_verified;
    itdDb.setUserVerified(profileUser.id, nextState);
    setShowActionMenu(false);
    loadProfileData();
    onUserUpdated();
    showToast(nextState ? `Верификация установлена (галочка справа от имени)` : `Верификация снята`);
  };

  const formatRegistrationDate = (isoString?: string): string => {
    if (!isoString) return 'февраль 2026 г.';
    try {
      const date = new Date(isoString);
      const months = [
        'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
        'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'
      ];
      return `${months[date.getMonth()]} ${date.getFullYear()} г.`;
    } catch {
      return '2026 г.';
    }
  };

  if (!profileUser) {
    return (
      <div className="bg-[#1c1c20] border border-neutral-800 rounded-3xl p-10 text-center space-y-4">
        <h3 className="text-xl font-bold text-white">Профиль @{username} не найден</h3>
        <p className="text-sm text-neutral-400">
          Пользователь с таким никнеймом пока не зарегистрирован в ШУМ.
        </p>
      </div>
    );
  }

  const isAvatarEmpty = !profileUser.avatar_url && !profileUser.avatar_emoji;

  return (
    <div className="space-y-6">
      {actionNotice && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-2xl flex items-center space-x-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Blocked Profile Banner if account is restricted */}
      {profileUser.is_blocked && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-between text-xs text-red-300">
          <div className="flex items-center space-x-2.5">
            <Ban className="w-4 h-4 text-red-400 shrink-0" />
            <div>
              <span className="font-bold text-white block">Профиль заблокирован</span>
              <span>Причина: {profileUser.blocked_reason || 'Нарушение правил сообщества ШУМ'}</span>
            </div>
          </div>
          {canBlock && (
            <button
              type="button"
              onClick={handleToggleBlockProfile}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl transition text-[11px] shrink-0"
            >
              Разблокировать
            </button>
          )}
        </div>
      )}

      {/* Profile Header without cover: Avatar on left, Name & Nick to the right */}
      <div className="bg-[#18181b] border border-neutral-800 rounded-3xl p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          {/* Avatar and Name/Nick in horizontal layout */}
          <div className="flex items-start sm:items-center space-x-5 min-w-0 flex-1">
            {/* Avatar with options */}
            <div className="relative group shrink-0">
              <div
                onClick={() => isOwnProfile && setShowEmojiPickerModal(true)}
                className={isOwnProfile ? 'cursor-pointer' : ''}
              >
                <Avatar
                  name={profileUser.name}
                  avatarUrl={profileUser.avatar_url}
                  emoji={profileUser.avatar_emoji}
                  hasEyes={false}
                  size="xl"
                  showOnline
                  className="border border-neutral-700/80 rounded-full shadow-lg"
                />
              </div>

              {isOwnProfile && (
                <div className="absolute -bottom-1 -right-1 flex space-x-1">
                  {/* Choose Emoji Button */}
                  <button
                    type="button"
                    onClick={() => setShowEmojiPickerModal(true)}
                    className="p-1.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition shadow"
                    title="Выбрать смайлик"
                  >
                    <Smile className="w-3.5 h-3.5" />
                  </button>

                  {/* Upload Image Button */}
                  <label
                    className="p-1.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition shadow cursor-pointer"
                    title="Загрузить фото"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Name, Nick and Action Buttons directly below name */}
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center space-x-2">
                <h1 className="text-base sm:text-lg font-bold text-white leading-tight truncate">
                  {profileUser.name}
                </h1>
                {/* Skill 5: "Верификация пользователя — устанавливает галочку справа от имени" */}
                {profileUser.is_verified && (
                  <span
                    title="Верифицированный профиль ШУМ"
                    className="inline-flex items-center justify-center w-4 h-4 bg-sky-500 text-black font-black text-[10px] rounded-full shrink-0 shadow-sm"
                  >
                    ✓
                  </span>
                )}
              </div>
              <div className="text-xs text-neutral-400 font-mono">
                @{profileUser.username}
              </div>

              {/* Action Buttons directly BELOW name: Подписка / Редактировать, Три точки, Карточка */}
              <div className="flex items-center space-x-2 pt-2 flex-wrap gap-y-2">
                {isOwnProfile ? (
                  <button
                    type="button"
                    onClick={() => setShowEditBioModal(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-neutral-200 text-black font-semibold text-xs transition shadow"
                  >
                    Редактировать
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleToggleFollow}
                    className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl font-semibold text-xs transition shadow ${
                      isFollowing
                        ? 'bg-neutral-800 text-white hover:bg-neutral-700'
                        : 'bg-white text-black hover:bg-neutral-200'
                    }`}
                  >
                    {isFollowing ? (
                      <>
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Вы подписаны</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Подписаться</span>
                      </>
                    )}
                  </button>
                )}

                {/* Three dots dropdown */}
                <div className="relative" ref={menuRef}>
                  <button
                    type="button"
                    onClick={() => setShowActionMenu(!showActionMenu)}
                    className="p-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 transition text-xs flex items-center justify-center"
                    title="Действия с профилем"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>

                  {showActionMenu && (
                    <div className="absolute left-0 top-9 z-30 w-56 bg-[#18181b] border border-neutral-700 rounded-2xl shadow-2xl py-1.5 text-xs overflow-hidden">
                      <button
                        type="button"
                        onClick={handleCopyProfileLink}
                        className="w-full flex items-center space-x-2 px-3.5 py-2 text-neutral-200 hover:bg-neutral-800 transition text-left"
                      >
                        <Copy className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Скопировать ссылку</span>
                      </button>

                      {/* Skill 5: Верификация */}
                      {canVerify && (
                        <button
                          type="button"
                          onClick={handleToggleVerification}
                          className="w-full flex items-center space-x-2 px-3.5 py-2 text-sky-400 hover:bg-neutral-800 transition text-left border-t border-neutral-800/80"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{profileUser.is_verified ? 'Снять верификацию' : 'Верифицировать'}</span>
                        </button>
                      )}

                      {/* Skill 3: Блокировка */}
                      {canBlock && !isOwnProfile && (
                        <button
                          type="button"
                          onClick={handleToggleBlockProfile}
                          className="w-full flex items-center space-x-2 px-3.5 py-2 text-red-400 hover:bg-red-950/30 transition text-left border-t border-neutral-800/80"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>{profileUser.is_blocked ? 'Разблокировать' : 'Заблокировать'}</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Skill 4: Карточка */}
                {canViewUserCard && onNavigateToUserCard && (
                  <button
                    type="button"
                    onClick={() => onNavigateToUserCard(profileUser.username)}
                    className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 transition text-xs font-medium flex items-center space-x-1"
                    title="Открыть карточку пользователя"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Карточка</span>
                  </button>
                )}
              </div>

              {/* If avatar is empty and it's own profile, show friendly prompt */}
              {isOwnProfile && isAvatarEmpty && (
                <div className="pt-1.5">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPickerModal(true)}
                    className="inline-flex items-center space-x-1.5 text-xs text-neutral-200 hover:text-white bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 rounded-xl border border-neutral-700 transition"
                  >
                    <Smile className="w-3.5 h-3.5 text-amber-400" />
                    <span>Выбрать смайлик аватара</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bio and Registration Meta */}
        <div className="mt-5 pt-5 border-t border-neutral-800/80 space-y-3">
          {profileUser.bio ? (
            <p className="text-sm text-neutral-200 whitespace-pre-wrap leading-relaxed">
              {profileUser.bio}
            </p>
          ) : (
            <p className="text-xs text-neutral-500 italic">
              {isOwnProfile
                ? 'Нажмите «Редактировать», чтобы добавить информацию о себе'
                : 'Пользователь пока не добавил описание'}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-400 pt-1">
            <div className="flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-neutral-500" />
              <span>Регистрация: {formatRegistrationDate(profileUser.created_at)}</span>
            </div>

            <div className="flex items-center space-x-3 text-neutral-300">
              <span>
                <strong className="text-white">{following.length}</strong>{' '}
                <span className="text-neutral-500">подписок</span>
              </span>
              <span>
                <strong className="text-white">{followers.length}</strong>{' '}
                <span className="text-neutral-500">подписчиков</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Tabs */}
      <div className="flex border-b border-neutral-800 px-2 space-x-8">
        <button
          type="button"
          onClick={() => setActiveTab('posts')}
          className={`pb-3 font-semibold text-sm transition relative ${
            activeTab === 'posts'
              ? 'text-white'
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <span>Публикации</span>
          {activeTab === 'posts' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('likes')}
          className={`pb-3 font-semibold text-sm transition relative ${
            activeTab === 'likes'
              ? 'text-white'
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <span>Понравилось</span>
          {activeTab === 'likes' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />
          )}
        </button>
      </div>

      {/* Composer on own profile */}
      {isOwnProfile && currentUser && activeTab === 'posts' && !profileUser.is_blocked && (
        <Composer
          currentUser={currentUser}
          onPostCreated={loadProfileData}
        />
      )}

      {/* Posts list */}
      <div className="space-y-4">
        {activeTab === 'posts' && (
          <>
            {posts.length === 0 ? (
              <div className="p-8 text-center bg-[#141416] border border-neutral-800/80 rounded-3xl">
                <p className="text-sm text-neutral-400">
                  {isOwnProfile
                    ? 'У вас пока нет публикаций. Создайте первую запись выше!'
                    : 'Пользователь еще ничего не опубликовал.'}
                </p>
              </div>
            ) : (
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUser={currentUser}
                  onNavigateToProfile={onNavigateToProfile}
                  onNavigateToPost={onNavigateToPost}
                  onOpenReportModal={onOpenReportModal}
                  onPostUpdated={loadProfileData}
                />
              ))
            )}
          </>
        )}

        {activeTab === 'likes' && (
          <>
            {likedPosts.length === 0 ? (
              <div className="p-8 text-center bg-[#141416] border border-neutral-800/80 rounded-3xl">
                <p className="text-sm text-neutral-400">
                  Список понравившихся записей пуст.
                </p>
              </div>
            ) : (
              likedPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUser={currentUser}
                  onNavigateToProfile={onNavigateToProfile}
                  onNavigateToPost={onNavigateToPost}
                  onOpenReportModal={onOpenReportModal}
                  onPostUpdated={loadProfileData}
                />
              ))
            )}
          </>
        )}
      </div>

      {/* Edit Bio Modal */}
      {showEditBioModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#18181b] border border-neutral-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-800">
              <h3 className="font-bold text-white text-base">
                Редактирование профиля
              </h3>
              <button
                type="button"
                onClick={() => setShowEditBioModal(false)}
                className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfileEdits} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Имя
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-neutral-900 border border-neutral-700 rounded-xl text-sm text-white focus:outline-none focus:border-neutral-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  О себе
                </label>
                <textarea
                  rows={4}
                  value={bioInput}
                  onChange={(e) => setBioInput(e.target.value)}
                  placeholder="Расскажите о себе, своих интересах..."
                  className="w-full px-3.5 py-2.5 bg-neutral-900 border border-neutral-700 rounded-xl text-sm text-white focus:outline-none focus:border-neutral-500 resize-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditBioModal(false)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-medium transition"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-white hover:bg-neutral-200 text-black font-semibold rounded-xl text-xs transition shadow"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Emoji Picker Modal */}
      <EmojiAvatarPickerModal
        isOpen={showEmojiPickerModal}
        onClose={() => setShowEmojiPickerModal(false)}
        onSelectEmoji={handleSelectEmojiAvatar}
        currentEmoji={profileUser.avatar_emoji}
      />
    </div>
  );
};
