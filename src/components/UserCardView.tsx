import React, { useState } from 'react';
import {
  ArrowLeft,
  ExternalLink,
  MessageSquare,
  Send,
  Ban,
  CheckCircle2,
  Clock,
  Shield,
  LifeBuoy,
  X,
  Plus
} from 'lucide-react';
import { DbUser, StaffSkill, DbModerationLog, DbUserNote } from '../types/database';
import { itdDb } from '../lib/storage';
import { Avatar } from './Avatar';
import { showAppToast } from '../lib/toast';

interface UserCardViewProps {
  targetUsername: string;
  currentUser: DbUser;
  onNavigateToProfile: (username: string) => void;
  onBack: () => void;
  onUserUpdated?: () => void;
  onNavigateToTicketPath?: (path: string) => void;
}

export const UserCardView: React.FC<UserCardViewProps> = ({
  targetUsername,
  currentUser,
  onNavigateToProfile,
  onBack,
  onUserUpdated,
  onNavigateToTicketPath,
}) => {
  const targetUser = itdDb.getUserByUsername(targetUsername);
  const [, setTick] = useState(0);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Modal / drawer state for user's support tickets
  const [showTicketsModal, setShowTicketsModal] = useState(false);

  // Block modal state with reason input
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockReasonInput, setBlockReasonInput] = useState('');

  // Note form state
  const [noteInput, setNoteInput] = useState('');

  if (!targetUser) {
    return (
      <div className="p-8 text-center text-neutral-400">
        <p>Пользователь @{targetUsername} не найден.</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-neutral-800 text-white rounded-xl text-xs"
        >
          Назад
        </button>
      </div>
    );
  }

  const postsCount = itdDb.getUserPosts(targetUser.id).length;
  const userTickets = itdDb.getSupportTickets(targetUser.id);
  const moderationLogs = itdDb.getModerationLogs(targetUser.id);
  const userNotes = itdDb.getUserNotes(targetUser.id);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleToggleVerification = () => {
    const nextVal = !targetUser.is_verified;
    itdDb.setUserVerified(targetUser.id, nextVal);
    setTick((t) => t + 1);
    showToast(nextVal ? 'Верификация установлена' : 'Верификация снята');
    if (onUserUpdated) onUserUpdated();
  };

  const handleConfirmBlock = (e: React.FormEvent) => {
    e.preventDefault();
    const reason = blockReasonInput.trim() || 'Нарушение правил сообщества';
    itdDb.setUserBlocked(
      targetUser.id,
      true,
      reason,
      currentUser.id,
      currentUser.name
    );
    setShowBlockModal(false);
    setBlockReasonInput('');
    setTick((t) => t + 1);
    showToast(`Профиль @${targetUser.username} заблокирован`);
    if (onUserUpdated) onUserUpdated();
  };

  const handleUnblock = () => {
    itdDb.setUserBlocked(
      targetUser.id,
      false,
      'Разблокирован сотрудником',
      currentUser.id,
      currentUser.name
    );
    setTick((t) => t + 1);
    showToast(`Профиль @${targetUser.username} разблокирован`);
    if (onUserUpdated) onUserUpdated();
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteInput.trim()) return;

    itdDb.addUserNote({
      userId: targetUser.id,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorUsername: currentUser.username,
      authorAvatarUrl: currentUser.avatar_url,
      authorAvatarEmoji: currentUser.avatar_emoji,
      content: noteInput.trim(),
    });

    setNoteInput('');
    setTick((t) => t + 1);
    showToast('Заметка добавлена');
    showAppToast('Служебная заметка', `Заметка о пользователе @${targetUser.username} сохранена в карточке`, 'info');
  };

  return (
    <div className="w-full space-y-5 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-neutral-800/80">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-xl transition border border-neutral-800"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight flex items-center space-x-2">
              <span>Карточка пользователя</span>
              <span className="text-neutral-500 font-mono text-xs">
                @{targetUser.username}
              </span>
            </h1>
            <p className="text-xs text-neutral-400">
              Служебная карточка аккаунта
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigateToProfile(targetUser.username)}
          className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-xl text-xs font-medium border border-neutral-800 transition flex items-center space-x-1.5"
        >
          <span>В профиль</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {successToast && (
        <div className="p-3 bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs rounded-xl flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-neutral-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* 1. БЛОК: Информация списком в требуемом формате */}
      <div className="p-5 rounded-2xl bg-[#1c1c20] border border-neutral-800 space-y-3 shadow-sm">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-800/80">
          <div className="flex items-center space-x-3">
            <Avatar
              name={targetUser.name}
              avatarUrl={targetUser.avatar_url}
              emoji={targetUser.avatar_emoji}
              hasEyes={false}
              size="md"
            />
            <div>
              <span className="font-bold text-white text-sm">{targetUser.name}</span>
              <span className="text-neutral-500 font-mono text-xs block">
                @{targetUser.username}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleToggleVerification}
              className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-xl text-xs font-medium border border-neutral-800 transition"
            >
              {targetUser.is_verified ? 'Снять верификацию' : 'Верифицировать'}
            </button>

            {targetUser.is_blocked ? (
              <button
                type="button"
                onClick={handleUnblock}
                className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-xl text-xs font-medium border border-neutral-800 transition"
              >
                Разблокировать
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowBlockModal(true)}
                className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-red-400 rounded-xl text-xs font-medium border border-neutral-800 transition"
              >
                Заблокировать
              </button>
            )}
          </div>
        </div>

        {/* Список в точном формате: Имя, Статус, Короткий адрес, Дата регистрации, Публикаций, Обращения */}
        <div className="space-y-2 text-xs divide-y divide-neutral-800/60 pt-1">
          <div className="flex items-center justify-between py-1.5 first:pt-0">
            <span className="text-neutral-400">Имя:</span>
            <span className="text-white font-medium">{targetUser.name}</span>
          </div>

          <div className="flex items-center justify-between py-1.5">
            <span className="text-neutral-400">Статус:</span>
            <span className="text-white font-medium">
              {targetUser.is_blocked ? (
                <span className="text-red-400">Заблокирован</span>
              ) : (
                <span className="text-neutral-200">Активен</span>
              )}
              {targetUser.is_verified && (
                <span className="text-sky-400 ml-1.5 font-bold">✓ Верифицирован</span>
              )}
            </span>
          </div>

          <div className="flex items-center justify-between py-1.5">
            <span className="text-neutral-400">Короткий адрес:</span>
            <span className="text-white font-mono">/@{targetUser.username}</span>
          </div>

          <div className="flex items-center justify-between py-1.5">
            <span className="text-neutral-400">Дата регистрации:</span>
            <span className="text-white">
              {new Date(targetUser.created_at).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>

          <div className="flex items-center justify-between py-1.5">
            <span className="text-neutral-400">Публикаций:</span>
            <span className="text-white font-medium">{postsCount}</span>
          </div>

          {/* Обращения: Открыть */}
          <div className="flex items-center justify-between py-1.5">
            <span className="text-neutral-400">Обращения:</span>
            <button
              type="button"
              onClick={() => setShowTicketsModal(true)}
              className="px-3 py-1 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-medium border border-neutral-800 transition flex items-center space-x-1"
            >
              <span>Открыть ({userTickets.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. БЛОК: История модераций */}
      <div className="p-5 rounded-2xl bg-[#1c1c20] border border-neutral-800 space-y-3 shadow-sm">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-800/80">
          <h3 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
            История модераций
          </h3>
          <span className="text-[11px] text-neutral-500">
            Записей: {moderationLogs.length}
          </span>
        </div>

        {moderationLogs.length === 0 ? (
          <div className="text-xs text-neutral-500 py-3 text-center">
            Записей о блокировках и модерации нет
          </div>
        ) : (
          <div className="space-y-2">
            {moderationLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-[#141416] border border-neutral-800 text-xs space-y-1"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span
                    className={`font-semibold ${
                      log.action === 'block' ? 'text-red-400' : 'text-neutral-300'
                    }`}
                  >
                    {log.action === 'block' ? 'Блокировка аккаунта' : 'Разблокировка'}
                  </span>
                  <span className="text-neutral-500">
                    {new Date(log.created_at).toLocaleString('ru-RU', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <div className="text-neutral-300">
                  <span className="text-neutral-500">Причина: </span>
                  <span>{log.reason}</span>
                </div>

                <div className="text-neutral-500 text-[11px] pt-0.5">
                  Автор бана: <span className="text-neutral-400 font-medium">{log.moderator_name}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. БЛОК: Заметки (поле для комментариев, как у комментов под постом) */}
      <div className="p-5 rounded-2xl bg-[#1c1c20] border border-neutral-800 space-y-4 shadow-sm">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-800/80">
          <h3 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
            Заметки о профиле
          </h3>
          <span className="text-[11px] text-neutral-500">
            {userNotes.length} заметок
          </span>
        </div>

        {/* Note input form */}
        <form onSubmit={handleAddNote} className="space-y-2">
          <textarea
            rows={2}
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder="Оставить служебную заметку о пользователе..."
            className="w-full px-3.5 py-2.5 bg-[#141416] border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-700 resize-none leading-relaxed"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!noteInput.trim()}
              className="px-4 py-1.5 bg-white text-black hover:bg-neutral-200 disabled:opacity-40 font-semibold rounded-xl text-xs transition flex items-center space-x-1.5"
            >
              <Send className="w-3 h-3" />
              <span>Добавить заметку</span>
            </button>
          </div>
        </form>

        {/* List of notes (like comments) */}
        {userNotes.length === 0 ? (
          <div className="text-xs text-neutral-500 py-3 text-center">
            Заметок о пользователе пока нет. Добавьте первую запись выше.
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            {userNotes.map((note) => (
              <div
                key={note.id}
                className="p-3.5 rounded-xl bg-[#141416] border border-neutral-800/80 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Avatar
                      name={note.author_name}
                      avatarUrl={note.author_avatar_url}
                      emoji={note.author_avatar_emoji}
                      hasEyes={false}
                      size="sm"
                    />
                    <div>
                      <span className="text-xs font-semibold text-white">
                        {note.author_name}
                      </span>
                      <span className="text-[10px] text-neutral-500 font-mono ml-1.5">
                        @{note.author_username}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] text-neutral-500">
                    {new Date(note.created_at).toLocaleString('ru-RU', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <p className="text-xs text-neutral-200 whitespace-pre-wrap leading-relaxed pl-10">
                  {note.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Список обращений пользователя (Обращения: Открыть) */}
      {showTicketsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#18181b] border border-neutral-800 rounded-3xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-[#141416]">
              <div className="flex items-center space-x-2">
                <LifeBuoy className="w-4 h-4 text-neutral-400" />
                <h3 className="font-semibold text-white text-sm">
                  Обращения в саппорт от @{targetUser.username}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTicketsModal(false)}
                className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3">
              {userTickets.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-500">
                  Пользователь еще не создавал обращений в службу поддержки
                </div>
              ) : (
                userTickets.map((t) => (
                  <div
                    key={t.id}
                    className="p-3.5 rounded-xl bg-[#141416] border border-neutral-800 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-neutral-500">
                        #{t.id.slice(0, 8)}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                          t.status === 'answered'
                            ? 'bg-neutral-800 text-neutral-300 border-neutral-700'
                            : 'bg-neutral-800 text-white border-neutral-700'
                        }`}
                      >
                        {t.status === 'answered' ? 'Отвечен' : 'Открыт'}
                      </span>
                    </div>

                    <h4 className="font-semibold text-white text-xs">
                      {t.problem_title}
                    </h4>

                    <p className="text-neutral-400 text-xs line-clamp-2">
                      {t.problem_description}
                    </p>

                    <div className="flex items-center justify-between pt-1 border-t border-neutral-800/60 text-[11px] text-neutral-500">
                      <span>
                        {new Date(t.created_at).toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>

                      {onNavigateToTicketPath && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowTicketsModal(false);
                            onNavigateToTicketPath(`/support?act=show(${t.id})`);
                          }}
                          className="text-neutral-300 hover:text-white font-medium underline"
                        >
                          Перейти в CRM
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="px-5 py-3 border-t border-neutral-800 bg-[#141416] flex justify-end">
              <button
                type="button"
                onClick={() => setShowTicketsModal(false)}
                className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-medium transition"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Заблокировать пользователя с указанием причины */}
      {showBlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#18181b] border border-neutral-800 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center space-x-2 text-white">
                <Ban className="w-4 h-4 text-neutral-400" />
                <h3 className="font-bold text-sm">Блокировка аккаунта @{targetUser.username}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBlockModal(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmBlock} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-neutral-400 block font-medium">
                  Укажите причину блокировки:
                </label>
                <textarea
                  rows={3}
                  value={blockReasonInput}
                  onChange={(e) => setBlockReasonInput(e.target.value)}
                  placeholder="Например: Спам, нарушение правил сообщества, оскорбления..."
                  className="w-full px-3 py-2 bg-[#141416] border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-700 resize-none leading-relaxed"
                  required
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBlockModal(false)}
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-xl text-xs transition"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold rounded-xl text-xs border border-neutral-700 transition"
                >
                  Заблокировать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
