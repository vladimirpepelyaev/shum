import React, { useState, useRef, useEffect } from 'react';
import {
  Heart,
  MessageCircle,
  Repeat2,
  Eye,
  MoreHorizontal,
  Copy,
  Trash2,
  Flag,
  Pin,
  Check,
  Share2
} from 'lucide-react';
import { PostWithMeta, DbUser } from '../types/database';
import { Avatar } from './Avatar';
import { itdDb, getImageFingerprint } from '../lib/storage';
import { supabaseService } from '../lib/supabaseService';
import { showAppToast } from '../lib/toast';

interface PostCardProps {
  post: PostWithMeta;
  currentUser: DbUser | null;
  onNavigateToProfile: (username: string) => void;
  onNavigateToPost: (username: string, postNumber: number) => void;
  onPostUpdated: () => void;
  onOpenReportModal: (postId: string) => void;
  showCommentsPreview?: boolean;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  currentUser,
  onNavigateToProfile,
  onNavigateToPost,
  onPostUpdated,
  onOpenReportModal,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedKid, setCopiedKid] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const isAuthor = currentUser?.id === post.user_id;
  const hasNoSpamSkill = currentUser?.skills?.includes('no_spam') || false;
  const photoFp = post.image_url ? (post.image_kid && post.image_hash ? { kid: post.image_kid, hash: post.image_hash } : getImageFingerprint(post.image_url)) : null;

  // Format date similar to screenshots: "1 ч.", "только что", "27 мая"
  const formatPostDate = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'только что';
      if (diffMins < 60) return `${diffMins} мин.`;
      if (diffHours < 24) return `${diffHours} ч.`;
      if (diffDays < 7) return `${diffDays} дн.`;

      const months = [
        'янв.', 'февр.', 'мар.', 'апр.', 'мая', 'июн.',
        'июл.', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.'
      ];
      return `${date.getDate()} ${months[date.getMonth()]}`;
    } catch {
      return 'недавно';
    }
  };

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  // Handle Likes via Supabase
  const [isLiking, setIsLiking] = useState(false);
  const handleLikeClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser || isLiking) return;
    setIsLiking(true);
    try {
      await supabaseService.toggleLike(post.id, currentUser.id);
      onPostUpdated();
    } catch (err: any) {
      showAppToast('Ошибка лайка', err?.message || 'Не удалось поставить лайк', 'error');
    } finally {
      setIsLiking(false);
    }
  };

  // Rule 3: Copy post link to clipboard
  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/@${post.author.username}/post_${post.post_number}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => {
      setCopiedLink(false);
      setShowMenu(false);
    }, 1500);
  };

  // Delete post (author or staff with delete_content / moderation skill)
  const userFresh = currentUser ? itdDb.getUserById(currentUser.id) || currentUser : null;
  const userSkills = userFresh?.skills || [];
  const hasDeleteSkill = userSkills.includes('delete_content') || userSkills.includes('moderation');
  const canDeletePost = isAuthor || hasDeleteSkill;

  const handleDeletePost = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser || !canDeletePost) return;
    try {
      await supabaseService.deletePost(post.id, currentUser.id);
      showAppToast('Публикация удалена', 'Пост успешно удалён из ленты и профиля', 'info');
      setShowMenu(false);
      onPostUpdated();
    } catch (err: any) {
      console.error('Delete post error:', err);
      showAppToast('Ошибка', err?.message || 'Не удалось удалить публикацию', 'error');
    }
  };

  // Rule 3: Report post (viewer only)
  const handleReportPost = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    onOpenReportModal(post.id);
  };

  return (
    <article className="bg-[#1c1c20] border border-neutral-800/80 rounded-3xl p-5 shadow-sm hover:border-neutral-700/80 transition-colors">
      {/* Pinned header badge */}
      {post.is_pinned && (
        <div className="flex items-center space-x-1.5 text-xs text-neutral-400 mb-3 pb-2 border-b border-neutral-800/50">
          <Pin className="w-3.5 h-3.5 text-neutral-400 rotate-45" />
          <span className="font-medium">Закреплённый пост</span>
        </div>
      )}

      {/* Author Header */}
      <div className="flex items-center justify-between mb-3">
        <div
          onClick={() => onNavigateToProfile(post.author.username)}
          className="flex items-center space-x-3 cursor-pointer group"
        >
          <Avatar
            name={post.author.name}
            avatarUrl={post.author.avatar_url}
            emoji={post.author.avatar_emoji}
            hasEyes={false}
            size="md"
          />
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-semibold text-sm text-white group-hover:underline">
                {post.author.name}
              </span>
              {post.author.is_verified && (
                <span
                  title="Верифицированный профиль"
                  className="inline-flex items-center justify-center w-3.5 h-3.5 bg-sky-500 text-black font-black text-[9px] rounded-full shrink-0"
                >
                  ✓
                </span>
              )}
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-600 inline-block" />
              <span className="text-xs text-neutral-400">
                {formatPostDate(post.created_at)}
              </span>
            </div>
            <div className="text-xs text-neutral-400 font-mono">
              @{post.author.username}
            </div>
          </div>
        </div>

        {/* Three dots dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800/70 transition"
            title="Опции поста"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-8 z-30 w-56 bg-[#18181b] border border-neutral-700 rounded-2xl shadow-2xl py-1.5 text-xs overflow-hidden">
              {/* Copy Link Option (for anyone) */}
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-neutral-200 hover:bg-neutral-800 transition text-left"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400 font-medium">
                      Ссылка скопирована!
                    </span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-neutral-400" />
                    <span>Скопировать ссылку</span>
                  </>
                )}
              </button>

              {/* Author or staff with delete_content skill: Delete Post */}
              {canDeletePost && (
                <button
                  type="button"
                  onClick={handleDeletePost}
                  className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-rose-400 hover:bg-rose-950/30 transition text-left cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Удалить публикацию</span>
                </button>
              )}

              {/* Viewer: Report Post */}
              {!isAuthor && (
                <button
                  type="button"
                  onClick={handleReportPost}
                  className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-neutral-300 hover:bg-neutral-800 transition text-left"
                >
                  <Flag className="w-4 h-4 text-rose-400" />
                  <span>Пожаловаться</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Post Text: Rule 2 specifies clicking on text opens post in separate screen */}
      {post.content && (
        <div
          onClick={() => onNavigateToPost(post.author.username, post.post_number)}
          className="text-white text-sm md:text-base leading-relaxed mb-3 cursor-pointer hover:text-neutral-200 transition-colors whitespace-pre-wrap select-text"
          title="Нажмите на текст, чтобы открыть пост"
        >
          {post.content}
        </div>
      )}

      {/* Post Image attachment */}
      {post.image_url && (
        <div className="mb-3">
          <div
            onClick={() => onNavigateToPost(post.author.username, post.post_number)}
            className="rounded-2xl overflow-hidden border border-neutral-800/80 cursor-pointer bg-black/40 max-h-96"
          >
            <img
              src={post.image_url}
              alt="Пост"
              className="w-full h-auto max-h-96 object-contain"
            />
          </div>

          {/* При наличии скилла отображай kid и hash под фотографией */}
          {hasNoSpamSkill && photoFp && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="mt-1.5 flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-[#141416] border border-neutral-800/80 rounded-xl text-[11px] font-mono text-neutral-400 select-all"
            >
              <div className="flex items-center space-x-3 overflow-hidden text-ellipsis">
                <span className="truncate" title="Контрольный идентификатор изображения (kid)">
                  <span className="text-neutral-500">kid: </span>
                  <span className="text-neutral-200">{photoFp.kid}</span>
                </span>
                <span className="truncate" title="Сигнатурный хэш изображения (hash)">
                  <span className="text-neutral-500">hash: </span>
                  <span className="text-neutral-200">{photoFp.hash}</span>
                </span>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(`kid = '${photoFp.kid}'`);
                    setCopiedKid(true);
                    setTimeout(() => setCopiedKid(false), 2000);
                  }}
                  className="px-2 py-0.5 rounded text-[10px] text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition cursor-pointer"
                  title="Скопировать правило kid"
                >
                  {copiedKid ? 'Скопировано' : 'Копировать kid'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}


      {/* Bottom Actions Bar */}
      <div className="flex items-center justify-between text-neutral-400 text-xs pt-2 border-t border-neutral-800/50">
        <div className="flex items-center space-x-4 sm:space-x-6">
          {/* Like */}
          <button
            type="button"
            onClick={handleLikeClick}
            className={`flex items-center space-x-1.5 transition ${
              post.is_liked_by_viewer
                ? 'text-rose-500 font-semibold'
                : 'hover:text-rose-400'
            }`}
          >
            <Heart
              className={`w-4 h-4 ${
                post.is_liked_by_viewer ? 'fill-rose-500 text-rose-500' : ''
              }`}
            />
            <span>{post.likes_count}</span>
          </button>

          {/* Comment */}
          <button
            type="button"
            onClick={() => onNavigateToPost(post.author.username, post.post_number)}
            className="flex items-center space-x-1.5 hover:text-neutral-200 transition"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{post.comments_count}</span>
          </button>

          {/* Repost */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center space-x-1.5 hover:text-neutral-200 transition"
            title="Поделиться"
          >
            <Repeat2 className="w-4 h-4" />
            <span>0</span>
          </button>
        </div>

        <div className="flex items-center space-x-1 text-neutral-400">
          <Eye className="w-3.5 h-3.5" />
          <span>{post.views_count}</span>
        </div>
      </div>
    </article>
  );
};
