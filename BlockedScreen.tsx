import React from 'react';
import { Ban, LogOut, MessageSquare } from 'lucide-react';
import { DbUser } from '../types/database';

interface BlockedScreenProps {
  currentUser: DbUser;
  onLogout: () => void;
  onNavigateToSupport: () => void;
}

export const BlockedScreen: React.FC<BlockedScreenProps> = ({
  currentUser,
  onLogout,
  onNavigateToSupport,
}) => {
  return (
    <div className="min-h-screen bg-black text-neutral-200 flex flex-col items-center justify-center p-6 selection:bg-neutral-800 selection:text-white">
      <div className="w-full max-w-md bg-[#18181b] border border-neutral-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400">
          <Ban className="w-8 h-8 text-neutral-400" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-white tracking-tight">
            Аккаунт заблокирован
          </h1>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Действие вашей учетной записи <span className="font-mono text-neutral-300">@{currentUser.username}</span> временно приостановлено. Доступ к ленте, публикациям и поиску ограничен.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-black/50 border border-neutral-800/80 text-left space-y-1.5">
          <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block">
            Причина блокировки:
          </span>
          <p className="text-xs text-neutral-200 font-medium">
            {currentUser.blocked_reason || 'Нарушение правил сообщества'}
          </p>
          {currentUser.blocked_at && (
            <span className="text-[10px] text-neutral-500 block pt-1">
              Дата: {new Date(currentUser.blocked_at).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          )}
        </div>

        <div className="space-y-2.5 pt-2">
          <button
            type="button"
            onClick={onNavigateToSupport}
            className="w-full py-2.5 px-4 bg-white hover:bg-neutral-200 text-black font-semibold text-xs rounded-xl transition flex items-center justify-center space-x-2"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Обратиться в поддержку для разблокировки</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="w-full py-2.5 px-4 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white font-medium text-xs rounded-xl border border-neutral-800 transition flex items-center justify-center space-x-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Выйти из аккаунта</span>
          </button>
        </div>

        <div className="pt-2 text-[11px] text-neutral-600">
          ООО «Шум» 2026
        </div>
      </div>
    </div>
  );
};
