import React from 'react';
import { Bell, Heart, UserPlus, MessageCircle, Sparkles } from 'lucide-react';
import { DbUser, DbNotification } from '../types/database';
import { Avatar } from './Avatar';
import { itdDb } from '../lib/storage';

interface NotificationsViewProps {
  currentUser: DbUser | null;
  onNavigateToProfile: (username: string) => void;
  onNavigateToPost?: (username: string, postNumber: number) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  currentUser,
  onNavigateToProfile,
  onNavigateToPost,
}) => {
  if (!currentUser) {
    return (
      <div className="bg-[#1c1c20] border border-neutral-800 rounded-3xl p-8 text-center text-neutral-400 text-sm">
        Войдите или зарегистрируйтесь, чтобы просматривать уведомления
      </div>
    );
  }

  const notifications = itdDb.getNotifications(currentUser.id);

  const formatDate = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      const months = [
        'янв.', 'февр.', 'мар.', 'апр.', 'мая', 'июн.',
        'июл.', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.'
      ];
      return `${date.getDate()} ${months[date.getMonth()]}`;
    } catch {
      return '';
    }
  };

  const handleFollowBack = (sender: DbUser) => {
    itdDb.toggleFollow(currentUser.id, sender.id);
  };

  const handleNotificationClick = (notif: DbNotification & { sender?: DbUser }) => {
    if ((notif.type === 'like' || notif.type === 'comment') && onNavigateToPost) {
      if (notif.post_author_username && notif.post_number) {
        onNavigateToPost(notif.post_author_username, notif.post_number);
        return;
      }
      if (currentUser && notif.post_id) {
        const post = itdDb.getPostById(notif.post_id);
        if (post) {
          onNavigateToPost(post.author.username, post.post_number);
          return;
        }
      }
    } else if (notif.type === 'follow' && notif.sender) {
      onNavigateToProfile(notif.sender.username);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl md:text-2xl font-bold text-white">Уведомления</h1>

      {notifications.length === 0 ? (
        <div className="bg-[#1c1c20] border border-neutral-800 rounded-3xl p-8 text-center space-y-2">
          <Bell className="w-8 h-8 mx-auto text-neutral-600" />
          <h3 className="font-semibold text-white text-base">Нет новых уведомлений</h3>
          <p className="text-xs text-neutral-400">
            Здесь будут отображаться подписки на ваш профиль, лайки и комментарии к постам
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => {
            const isFollower = notif.type === 'follow' && notif.sender;
            const isFollowingSender = notif.sender
              ? itdDb.isFollowing(currentUser.id, notif.sender.id)
              : false;

            return (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className="bg-[#1c1c20] border border-neutral-800/80 hover:border-neutral-700/80 rounded-3xl p-4 sm:p-5 flex items-start justify-between gap-4 transition shadow-sm cursor-pointer"
              >
                <div className="flex items-start space-x-3.5 min-w-0">
                  <div
                    onClick={() =>
                      notif.sender && onNavigateToProfile(notif.sender.username)
                    }
                    className="cursor-pointer"
                  >
                    {notif.sender ? (
                      <Avatar
                        name={notif.sender.name}
                        avatarUrl={notif.sender.avatar_url}
                        emoji={notif.sender.avatar_emoji}
                        hasEyes={false}
                        size="md"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-amber-400">
                        <Bell className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      {notif.sender && (
                        <span
                          onClick={() =>
                            onNavigateToProfile(notif.sender!.username)
                          }
                          className="font-bold text-sm text-white hover:underline cursor-pointer"
                        >
                          {notif.sender.name}
                        </span>
                      )}
                      <span className="text-xs text-neutral-400">
                        {notif.type === 'follow'
                          ? 'подписался(-ась) на вас'
                          : notif.type === 'like'
                          ? 'оценил(а) ваш пост'
                          : notif.type === 'comment'
                          ? 'оставил(а) комментарий'
                          : ''}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
                      {notif.text}
                    </p>

                    <span className="text-[11px] text-neutral-500 mt-1.5 block">
                      {formatDate(notif.created_at)}
                    </span>
                  </div>
                </div>

                {/* Follow back button (Screenshot 3: + Подписаться в ответ) */}
                {isFollower && notif.sender && !isFollowingSender && (
                  <button
                    type="button"
                    onClick={() => handleFollowBack(notif.sender!)}
                    className="shrink-0 flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition"
                  >
                    <span>+ Подписаться в ответ</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
