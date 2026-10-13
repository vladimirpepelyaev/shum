import React, { useState, useEffect } from 'react';
import { Sparkles, Users } from 'lucide-react';
import { DbUser, PostWithMeta } from '../types/database';
import { Composer } from './Composer';
import { PostCard } from './PostCard';
import { itdDb } from '../lib/storage';

interface FeedViewProps {
  currentUser: DbUser | null;
  onNavigateToProfile: (username: string) => void;
  onNavigateToPost: (username: string, postNumber: number) => void;
  onOpenReportModal: (postId: string) => void;
  onOpenAuth: () => void;
}

export const FeedView: React.FC<FeedViewProps> = ({
  currentUser,
  onNavigateToProfile,
  onNavigateToPost,
  onOpenReportModal,
  onOpenAuth,
}) => {
  const [activeTab, setActiveTab] = useState<'for_you' | 'following'>('for_you');
  const [posts, setPosts] = useState<PostWithMeta[]>([]);

  const loadFeed = () => {
    const feedPosts = itdDb.getFeedPosts(activeTab);
    setPosts(feedPosts);
  };

  useEffect(() => {
    loadFeed();
  }, [activeTab, currentUser]);

  return (
    <div className="space-y-4">
      {/* Top Segmented Tabs: Для вас | Подписки (Clans removed as requested) */}
      <div className="flex justify-center mb-2">
        <div className="inline-flex bg-[#1c1c20] border border-neutral-800/80 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab('for_you')}
            className={`px-6 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
              activeTab === 'for_you'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Для вас
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('following')}
            className={`px-6 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
              activeTab === 'following'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Подписки
          </button>
        </div>
      </div>

      {/* Composer Card ("Что нового?") */}
      {currentUser ? (
        <Composer
          currentUser={currentUser}
          onPostCreated={loadFeed}
          placeholder="Что нового?"
        />
      ) : (
        <div
          onClick={onOpenAuth}
          className="bg-[#1c1c20] border border-neutral-800/80 rounded-3xl p-5 text-center cursor-pointer hover:border-neutral-700 transition"
        >
          <p className="text-sm text-neutral-300 font-medium">
            Что нового? Войдите или зарегистрируйтесь, чтобы опубликовать пост
          </p>
        </div>
      )}

      {/* Posts Feed list */}
      <div className="space-y-4">
        {posts.length === 0 ? (
          <div className="bg-[#1c1c20] border border-neutral-800/80 rounded-3xl p-10 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">В ленте пока пусто</h3>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto leading-relaxed">
              {activeTab === 'following'
                ? 'Вы пока ни на кого не подписаны. Найдите интересных авторов в поиске или опубликуйте свой первый пост!'
                : 'Здесь будут появляться публикации пользователей. Напишите первый пост в поле выше!'}
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
              onPostUpdated={loadFeed}
              onOpenReportModal={onOpenReportModal}
            />
          ))
        )}
      </div>
    </div>
  );
};
