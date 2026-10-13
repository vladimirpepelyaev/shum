import React, { useState, useMemo } from 'react';
import { Search, User, FileText, ArrowRight } from 'lucide-react';
import { itdDb } from '../lib/storage';
import { DbUser, PostWithMeta } from '../types/database';
import { Avatar } from './Avatar';
import { PostCard } from './PostCard';

interface SearchViewProps {
  currentUser: DbUser | null;
  onNavigateToProfile: (username: string) => void;
  onNavigateToPost: (username: string, postNumber: number) => void;
  onOpenReportModal: (postId: string) => void;
}

export const SearchView: React.FC<SearchViewProps> = ({
  currentUser,
  onNavigateToProfile,
  onNavigateToPost,
  onOpenReportModal,
}) => {
  const [query, setQuery] = useState('');

  const users = itdDb.getAllUsers();
  const allPosts = itdDb.getFeedPosts('for_you');

  // Filter users by query
  const matchingUsers = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().replace(/^@/, '');
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q)
    );
  }, [query, users]);

  // Filter posts by query
  const matchingPosts = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return allPosts.filter((p) => p.content.toLowerCase().includes(q));
  }, [query, allPosts]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl md:text-2xl font-bold text-white">Поиск</h1>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-4 top-3.5 text-neutral-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск авторов и постов..."
          className="w-full bg-[#1c1c20] border border-neutral-800 rounded-2xl pl-12 pr-10 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600 transition"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-4 top-3 text-xs text-neutral-400 hover:text-white"
          >
            Очистить
          </button>
        )}
      </div>

      {query.trim() ? (
        /* Search Results */
        <div className="space-y-6">
          {/* Matching Users */}
          <div>
            <h2 className="text-sm font-semibold text-neutral-400 mb-3 flex items-center space-x-1.5">
              <User className="w-4 h-4" />
              <span>Пользователи</span>
            </h2>

            {matchingUsers.length === 0 ? (
              <div className="p-4 bg-[#1c1c20] border border-neutral-800 rounded-2xl text-xs text-neutral-500">
                Пользователи по запросу «{query}» не найдены
              </div>
            ) : (
              <div className="space-y-2">
                {matchingUsers.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => onNavigateToProfile(u.username)}
                    className="p-3.5 bg-[#1c1c20] hover:bg-neutral-800/80 border border-neutral-800 rounded-2xl flex items-center justify-between cursor-pointer transition"
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar
                        name={u.name}
                        avatarUrl={u.avatar_url}
                        emoji={u.avatar_emoji}
                        hasEyes={false}
                        size="md"
                      />
                      <div>
                        <div className="font-semibold text-sm text-white">
                          {u.name}
                        </div>
                        <div className="text-xs text-neutral-400 font-mono">
                          @{u.username}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-neutral-400 bg-neutral-900 px-3 py-1.5 rounded-xl border border-neutral-800 flex items-center space-x-1">
                      <span>Профиль</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Matching Posts */}
          <div>
            <h2 className="text-sm font-semibold text-neutral-400 mb-3 flex items-center space-x-1.5">
              <FileText className="w-4 h-4" />
              <span>Публикации</span>
            </h2>

            {matchingPosts.length === 0 ? (
              <div className="p-4 bg-[#1c1c20] border border-neutral-800 rounded-2xl text-xs text-neutral-500">
                Постов с таким текстом не найдено
              </div>
            ) : (
              <div className="space-y-4">
                {matchingPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    currentUser={currentUser}
                    onNavigateToProfile={onNavigateToProfile}
                    onNavigateToPost={onNavigateToPost}
                    onPostUpdated={() => {}}
                    onOpenReportModal={onOpenReportModal}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Empty / Default Search State (Clans and Hashtags removed) */
        <div className="space-y-5">
          <div className="bg-[#1c1c20] border border-neutral-800/80 rounded-3xl p-6 text-center space-y-2">
            <Search className="w-8 h-8 mx-auto text-neutral-600" />
            <h3 className="font-semibold text-white text-base">Поиск по ШУМ</h3>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto">
              Введите имя, никнейм @ или фрагмент текста публикации, чтобы найти людей и посты
            </p>
          </div>

          {/* List of active users to discover */}
          {users.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-neutral-400 flex items-center space-x-1.5 px-1">
                <User className="w-4 h-4" />
                <span>Пользователи</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {users.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => onNavigateToProfile(u.username)}
                    className="p-3.5 bg-[#1c1c20] hover:bg-neutral-800/80 border border-neutral-800 rounded-2xl flex items-center justify-between cursor-pointer transition group"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <Avatar
                        name={u.name}
                        avatarUrl={u.avatar_url}
                        emoji={u.avatar_emoji}
                        hasEyes={false}
                        size="md"
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-white truncate group-hover:underline">
                          {u.name}
                        </div>
                        <div className="text-xs text-neutral-400 font-mono truncate">
                          @{u.username}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-white transition shrink-0 ml-2" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
