import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Send,
  Heart,
  Share2,
  MessageCircle,
  Copy,
  Check,
  MoreHorizontal,
  Trash2,
  Flag,
  Smile,
} from 'lucide-react';
import { PostWithMeta, DbUser, DbComment } from '../types/database';
import { Avatar } from './Avatar';
import { itdDb, getImageFingerprint } from '../lib/storage';
import { IosEmojiPicker } from './IosEmojiPicker';
import { showAppToast } from '../lib/toast';

import { supabaseService } from '../lib/supabaseService';

interface PostDetailViewProps {
  username: string;
  postNumber: number;
  currentUser: DbUser | null;
  onBack: () => void;
  onNavigateToProfile: (username: string) => void;
  onOpenReportModal: (postId: string) => void;
}

export const PostDetailView: React.FC<PostDetailViewProps> = ({
  username,
  postNumber,
  currentUser,
  onBack,
  onNavigateToProfile,
  onOpenReportModal,
}) => {
  const [post, setPost] = useState<PostWithMeta | null>(null);
  const [comments, setComments] = useState<Array<DbComment & { author: DbUser }>>([]);
  const [commentText, setCommentText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedKid, setCopiedKid] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const hasNoSpamSkill = currentUser?.skills?.includes('no_spam') || false;

  const loadPostAndComments = async () => {
    setIsLoading(true);
    try {
      const foundPost = await supabaseService.getPostByUsernameAndNumber(username, postNumber, currentUser?.id);
      if (foundPost) {
        setPost(foundPost);
        const postComments = await supabaseService.getCommentsForPost(foundPost.id);
        setComments(postComments);
      } else {
        setPost(null);
      }
    } catch {
      const foundPost = itdDb.getPostByUsernameAndNumber(username, postNumber);
      if (foundPost) {
        setPost(foundPost);
        setComments(itdDb.getCommentsForPost(foundPost.id));
      } else {
        setPost(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPostAndComments();
  }, [username, postNumber, currentUser]);

  const handleLike = async () => {
    if (!currentUser || !post) return;
    await supabaseService.toggleLike(post.id, currentUser.id);
    await loadPostAndComments();
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !post || !commentText.trim()) return;

    const text = commentText.trim();
    setCommentText('');
    await supabaseService.addComment({
      postId: post.id,
      userId: currentUser.id,
      content: text,
    });

    await loadPostAndComments();
  };

  const handleCopyLink = () => {
    if (!post) return;
    const url = `${window.location.origin}/@${post.author.username}/post_${post.post_number}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 1500);
    setShowMenu(false);
  };

  const userFresh = currentUser ? itdDb.getUserById(currentUser.id) || currentUser : null;
  const userSkills = userFresh?.skills || [];
  const hasDeleteSkill = userSkills.includes('delete_content') || userSkills.includes('moderation');

  const handleDeletePost = async () => {
    if (!currentUser || !post) return;
    const isOwner = currentUser.id === post.user_id;
    if (!isOwner && !hasDeleteSkill) return;

    try {
      await supabaseService.deletePost(post.id, currentUser.id);
      showAppToast('Публикация удалена', 'Пост успешно удалён из ленты и стены', 'info');
      onBack();
    } catch (err: any) {
      console.error('Delete post error:', err);
      showAppToast('Ошибка', err?.message || 'Не удалось удалить публикацию', 'error');
    }
  };

  const formatCommentDate = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('ru-RU', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  if (!post) {
    return (
      <div className="bg-[#1c1c20] border border-neutral-800 rounded-3xl p-8 text-center space-y-4">
        <h3 className="text-lg font-bold text-white">Пост не найден</h3>
        <p className="text-sm text-neutral-400">
          Пост @{username}/post_{postNumber} не существует или был удалён.
        </p>
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Вернуться назад</span>
        </button>
      </div>
    );
  }

  const isAuthor = currentUser?.id === post.user_id;
  const canDeletePost = isAuthor || hasDeleteSkill;

  return (
    <div className="space-y-4">
      {/* Back button bar */}
      <div className="flex items-center justify-between pb-2">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-sm text-neutral-400 hover:text-white transition group py-1"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Назад к ленте</span>
        </button>

        <span className="text-xs font-mono text-neutral-500">
          /@{post.author.username}/post_{post.post_number}
        </span>
      </div>

      {/* Main post container */}
      <div className="bg-[#1c1c20] border border-neutral-800 rounded-3xl p-6 shadow-sm space-y-5">
        {/* Author row */}
        <div className="flex items-center justify-between">
          <div
            onClick={() => onNavigateToProfile(post.author.username)}
            className="flex items-center space-x-3.5 cursor-pointer group"
          >
            <Avatar
              name={post.author.name}
              avatarUrl={post.author.avatar_url}
              emoji={post.author.avatar_emoji}
              hasEyes={false}
              size="lg"
            />
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-base text-white group-hover:underline">
                  {post.author.name}
                </span>
                {post.author.is_verified && (
                  <span
                    title="Верифицированный профиль"
                    className="inline-flex items-center justify-center w-4 h-4 bg-sky-500 text-black font-black text-[10px] rounded-full shrink-0"
                  >
                    ✓
                  </span>
                )}
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-600 inline-block" />
              </div>
              <div className="text-xs text-neutral-400 font-mono">
                @{post.author.username}
              </div>
            </div>
          </div>

          {/* Three dots menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition"
              title="Меню"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-10 z-30 w-52 bg-[#18181b] border border-neutral-700 rounded-2xl shadow-2xl py-1.5 text-xs overflow-hidden">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-neutral-200 hover:bg-neutral-800 transition text-left"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">Ссылка скопирована!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-neutral-400" />
                      <span>Скопировать ссылку</span>
                    </>
                  )}
                </button>

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

                {!isAuthor && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onOpenReportModal(post.id);
                    }}
                    className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-neutral-300 hover:bg-neutral-800 transition text-left cursor-pointer"
                  >
                    <Flag className="w-4 h-4 text-rose-400" />
                    <span>Пожаловаться</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Text */}
        <div className="text-white text-base md:text-lg leading-relaxed whitespace-pre-wrap select-text">
          {post.content}
        </div>

        {/* Image */}
        {post.image_url && (() => {
          const photoFp = post.image_kid && post.image_hash ? { kid: post.image_kid, hash: post.image_hash } : getImageFingerprint(post.image_url);
          return (
            <div className="space-y-1.5">
              <div className="rounded-2xl overflow-hidden border border-neutral-800 bg-black/40">
                <img
                  src={post.image_url}
                  alt="Пост"
                  className="w-full max-h-[500px] object-contain mx-auto"
                />
              </div>

              {/* При наличии скилла отображай kid и hash под фотографией */}
              {hasNoSpamSkill && (
                <div
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-[#141416] border border-neutral-800 rounded-xl text-[11px] font-mono text-neutral-400 select-all"
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
                      onClick={() => {
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
          );
        })()}

        {/* Date and info */}
        <div className="text-xs text-neutral-400 pt-2 border-t border-neutral-800/80 flex items-center justify-between">
          <span>
            Дата публикации:{' '}
            {new Date(post.created_at).toLocaleString('ru-RU', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          <span className="font-mono text-[11px] text-neutral-500">
            ID: {post.id.slice(0, 8)}
          </span>
        </div>

        {/* Actions bar */}
        <div className="flex items-center space-x-6 pt-3 border-t border-neutral-800/80 text-sm">
          <button
            type="button"
            onClick={handleLike}
            className={`flex items-center space-x-2 transition ${
              post.is_liked_by_viewer
                ? 'text-rose-500 font-bold'
                : 'text-neutral-400 hover:text-rose-400'
            }`}
          >
            <Heart
              className={`w-5 h-5 ${
                post.is_liked_by_viewer ? 'fill-rose-500 text-rose-500' : ''
              }`}
            />
            <span>{post.likes_count}</span>
          </button>

          <div className="flex items-center space-x-2 text-neutral-400">
            <MessageCircle className="w-5 h-5" />
            <span>{comments.length}</span>
          </div>

          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center space-x-2 text-neutral-400 hover:text-white transition"
          >
            <Share2 className="w-5 h-5" />
            <span>{copiedLink ? 'Скопировано!' : 'Поделиться'}</span>
          </button>
        </div>
      </div>

      {/* Comments section */}
      <div className="bg-[#1c1c20] border border-neutral-800 rounded-3xl p-6 shadow-sm space-y-5">
        <h3 className="font-bold text-white text-base">
          Комментарии
        </h3>

        {/* Comment input form */}
        {currentUser ? (
          <div className="space-y-3">
            <form onSubmit={handleAddComment} className="flex space-x-3 items-start">
              <Avatar
                name={currentUser.name}
                avatarUrl={currentUser.avatar_url}
                emoji={currentUser.avatar_emoji}
                hasEyes={currentUser.avatar_eyes}
                size="md"
              />
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Написать комментарий..."
                  className="w-full bg-[#141416] border border-neutral-800 rounded-2xl pl-4 pr-24 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600 transition"
                />
                <div className="absolute right-2 top-2 flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={`p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800/80 transition active:scale-95 ${
                      showEmojiPicker ? 'text-amber-400 bg-amber-400/10' : ''
                    }`}
                    title="Смайлики"
                  >
                    <Smile className="w-4 h-4" />
                  </button>
                  <button
                    type="submit"
                    disabled={!commentText.trim()}
                    className="p-1.5 rounded-xl bg-white text-black disabled:bg-neutral-800 disabled:text-neutral-500 transition active:scale-95 shadow"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </form>

            {/* iOS Emoji Picker for comments */}
            {showEmojiPicker && (
              <IosEmojiPicker
                onSelectEmoji={(emoji) => setCommentText((prev) => prev + emoji)}
                onDeleteChar={() => setCommentText((prev) => prev.slice(0, -1))}
                onClose={() => setShowEmojiPicker(false)}
              />
            )}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-400 text-center">
            Зарегистрируйтесь или войдите, чтобы оставить комментарий
          </div>
        )}

        {/* Comments list */}
        {comments.length === 0 ? (
          <div className="text-center py-6 text-neutral-500 text-sm">
            Здесь пока нет комментариев. Будьте первым!
          </div>
        ) : (
          <div className="space-y-4 pt-2 divide-y divide-neutral-800/60">
            {comments.map((comment) => (
              <div key={comment.id} className="pt-4 first:pt-0 flex space-x-3">
                <div
                  onClick={() => onNavigateToProfile(comment.author.username)}
                  className="cursor-pointer"
                >
                  <Avatar
                    name={comment.author.name}
                    avatarUrl={comment.author.avatar_url}
                    emoji={comment.author.avatar_emoji}
                    hasEyes={false}
                    size="sm"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span
                      onClick={() => onNavigateToProfile(comment.author.username)}
                      className="font-semibold text-xs text-white hover:underline cursor-pointer"
                    >
                      {comment.author.name}
                    </span>
                    <span className="text-[11px] text-neutral-400 font-mono">
                      @{comment.author.username}
                    </span>
                    <span className="text-[10px] text-neutral-500">
                      {formatCommentDate(comment.created_at)}
                    </span>
                  </div>
                  <div className="text-xs md:text-sm text-neutral-200 mt-1 leading-relaxed break-words whitespace-pre-wrap select-text">
                    {comment.content}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
