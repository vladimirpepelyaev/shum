import React, { useState } from 'react';
import {
  X,
  UserPlus,
  Users,
  Check,
  Trash2,
  AlertTriangle,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { DbUser } from '../types/database';
import { itdDb } from '../lib/storage';
import { Avatar } from './Avatar';
import { showAppToast } from '../lib/toast';

interface AccountSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: DbUser | null;
  onUserSwitched: (user: DbUser) => void;
  onResetData: () => void;
}

export const AccountSwitcherModal: React.FC<AccountSwitcherModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserSwitched,
  onResetData,
}) => {
  const [mode, setMode] = useState<'list' | 'create'>('list');
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newBio, setNewBio] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const allUsers = itdDb.getAllUsers();

  const handleSwitch = (user: DbUser) => {
    itdDb.setCurrentUserId(user.id);
    showAppToast('Аккаунт переключен', `Вы вошли как ${user.name} (@${user.username})`, 'info');
    onUserSwitched(user);
    onClose();
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const name = newName.trim();
    const username = newUsername.trim().replace(/^@/, '').toLowerCase();

    if (!name) {
      setError('Укажите имя профиля');
      return;
    }
    if (!username || username.length < 2) {
      setError('Укажите никнейм (от 2 символов)');
      return;
    }

    try {
      const created = itdDb.registerUser({
        name,
        username,
        bio: newBio.trim() || 'Автор контента',
        password: 'password123',
        avatar_emoji: '✨',
      });
      showAppToast('Аккаунт создан', `Создан профиль @${created.username}`, 'success');
      onUserSwitched(created);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Ошибка создания аккаунта');
    }
  };

  const handleResetDataClick = () => {
    if (window.confirm('Очистить все публикации, комментарии, лайки и заявки? Платформа вернется к абсолютно чистому состоянию.')) {
      localStorage.clear();
      showAppToast('Данные очищены', 'Все посты и записи удалены', 'info');
      onResetData();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#18181b] border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Users className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">
              {mode === 'list' ? 'Управление аккаунтами' : 'Создать новый профиль'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {mode === 'list' ? (
            <>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {allUsers.map((u) => {
                  const isCurrent = currentUser?.id === u.id;
                  return (
                    <div
                      key={u.id}
                      onClick={() => handleSwitch(u)}
                      className={`p-3 rounded-2xl border transition flex items-center justify-between cursor-pointer ${
                        isCurrent
                          ? 'border-indigo-500 bg-indigo-500/10'
                          : 'border-neutral-800 hover:border-neutral-700 bg-[#202025]'
                      }`}
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
                          <div className="font-semibold text-sm text-white flex items-center space-x-1.5">
                            <span>{u.name}</span>
                            {isCurrent && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500 text-white font-medium">
                                Активен
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-neutral-400 font-mono">
                            @{u.username}
                          </div>
                        </div>
                      </div>

                      {isCurrent && (
                        <Check className="w-4 h-4 text-indigo-400" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setMode('create')}
                  className="w-full py-2.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-white font-medium text-xs sm:text-sm transition flex items-center justify-center space-x-2"
                >
                  <UserPlus className="w-4 h-4 text-indigo-400" />
                  <span>Создать дополнительный профиль</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetDataClick}
                  className="w-full py-2 rounded-2xl border border-rose-900/50 bg-rose-950/20 hover:bg-rose-950/40 text-rose-400 text-xs transition flex items-center justify-center space-x-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Очистить все данные платформы (сброс к нулю)</span>
                </button>
              </div>
            </>
          ) : (
            /* Create new profile form */
            <form onSubmit={handleCreateAccount} className="space-y-3.5">
              {error && (
                <div className="p-2.5 rounded-xl bg-rose-950/50 border border-rose-800/60 text-xs text-rose-300">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">
                  Имя автора
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Например: Артем"
                  className="w-full bg-[#1e1e24] border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">
                  Никнейм @handle
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="artem_sound"
                  className="w-full bg-[#1e1e24] border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">
                  О себе
                </label>
                <input
                  type="text"
                  value={newBio}
                  onChange={(e) => setNewBio(e.target.value)}
                  placeholder="Музыкант, продюсер..."
                  className="w-full bg-[#1e1e24] border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMode('list')}
                  className="flex-1 py-2.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium"
                >
                  Назад
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-white hover:bg-neutral-200 text-black text-xs font-semibold"
                >
                  Создать профиль
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
