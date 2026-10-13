import React from 'react';
import {
  Search,
  Bell,
  User,
  LogOut,
  Archive,
  Database,
  HelpCircle,
  LifeBuoy,
  ShieldAlert,
  Sliders
} from 'lucide-react';
import { DbUser } from '../types/database';
import { itdDb } from '../lib/storage';

interface SidebarProps {
  currentPath: string;
  currentUser: DbUser | null;
  onNavigate: (path: string) => void;
  onOpenAuth: () => void;
  onOpenSchemaModal?: () => void;
  onOpenSkillsModal?: () => void;
  onLogout?: () => void;
  unreadCount?: number;
  unreadSupportCount?: number;
  hasSupportTickets?: boolean;
  supportQueueCount?: number;
  moderationQueueCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath,
  currentUser,
  onNavigate,
  onOpenAuth,
  onOpenSchemaModal,
  onOpenSkillsModal,
  onLogout,
  unreadCount = 0,
  unreadSupportCount = 0,
  hasSupportTickets = false,
  supportQueueCount,
  moderationQueueCount,
}) => {
  const isFeedActive =
    currentPath === '/' || currentPath === '/feed' || currentPath === '';
  const isSearchActive = currentPath === '/search';
  const isNotifsActive = currentPath === '/notifications';
  const isSupportActive = currentPath === '/support';
  const isSupportCrmActive = currentPath === '/crm/support';
  const isModerationCrmActive = currentPath === '/crm/moderation';
  const isProfileActive =
    currentUser && currentPath === `/@${currentUser.username}`;

  // Skill checks
  const hasSupportSkill =
    currentUser?.skills?.includes('support') ||
    currentUser?.skills?.includes('support_management') ||
    false;
  const hasModerationSkill = currentUser?.skills?.includes('moderation') || false;
  const hasNoSpamSkill = currentUser?.skills?.includes('no_spam') || false;
  const isNoSpamActive = currentPath === '/crm/nospam' || currentPath === '/nospam';

  // Очереди заявок в работе
  const supportQueue =
    supportQueueCount !== undefined
      ? supportQueueCount
      : hasSupportSkill
      ? itdDb
          .getSupportTickets()
          .filter((t) => t.status === 'open' || t.status === 'in_progress').length
      : 0;

  const moderationQueue =
    moderationQueueCount !== undefined
      ? moderationQueueCount
      : hasModerationSkill
      ? itdDb.getAllReports().length
      : 0;

  // Requirement: "При получении ответа из поддержки в левом меню появляется поле Помощь и (+1) до прочтения."
  const showSupportInSidebar =
    unreadSupportCount > 0 || hasSupportTickets || isSupportActive;

  return (
    <aside className="w-56 lg:w-64 shrink-0 flex flex-col justify-between py-6 px-4 select-none">
      {/* Top Header & Logo */}
      <div>
        <div
          onClick={() => onNavigate('/')}
          className="flex items-center space-x-2 px-3 mb-8 cursor-pointer group"
        >
          <span className="text-2xl font-black text-white tracking-wider">
            ШУМ
          </span>
          <span className="text-xs text-neutral-500 font-medium">v1.1.2</span>
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-1.5">
          {/* Лента */}
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className={`w-full flex items-center space-x-3.5 px-4 py-2.5 rounded-2xl font-medium text-sm transition ${
              isFeedActive
                ? 'bg-[#242428] text-white shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
            }`}
          >
            <Archive className="w-4 h-4" />
            <span>Лента</span>
          </button>

          {/* Поиск */}
          <button
            type="button"
            onClick={() => onNavigate('/search')}
            className={`w-full flex items-center space-x-3.5 px-4 py-2.5 rounded-2xl font-medium text-sm transition ${
              isSearchActive
                ? 'bg-[#242428] text-white shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Поиск</span>
          </button>

          {/* Центр уведомлений */}
          <button
            type="button"
            onClick={() => onNavigate('/notifications')}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-2xl font-medium text-sm transition ${
              isNotifsActive
                ? 'bg-[#242428] text-white shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
            }`}
          >
            <div className="flex items-center space-x-3.5">
              <Bell className="w-4 h-4" />
              <span>Центр уведомлений</span>
            </div>
            {unreadCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            )}
          </button>

          {/* Помощь для пользователей (появляется при наличии ответа (+1)) */}
          {showSupportInSidebar && (
            <button
              type="button"
              onClick={() => onNavigate('/support')}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-2xl font-medium text-sm transition ${
                isSupportActive
                  ? 'bg-[#242428] text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
              }`}
            >
              <div className="flex items-center space-x-3.5">
                <HelpCircle className="w-4 h-4 text-neutral-400" />
                <span>Помощь</span>
              </div>
              {unreadSupportCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-neutral-800 text-neutral-200 border border-neutral-700">
                  +{unreadSupportCount}
                </span>
              )}
            </button>
          )}

          {/* Skill 1: Поддержка — CRM поддержки */}
          {hasSupportSkill && (
            <button
              type="button"
              onClick={() => onNavigate('/crm/support')}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-2xl font-medium text-sm transition ${
                isSupportCrmActive
                  ? 'bg-[#242428] text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
              }`}
            >
              <div className="flex items-center space-x-3.5">
                <LifeBuoy className="w-4 h-4 text-neutral-400" />
                <span>Поддержка</span>
              </div>
              {supportQueue > 0 && (
                <span
                  title="Очередь заявок в работе"
                  className="px-2 py-0.5 rounded-full text-xs font-semibold bg-neutral-800 text-neutral-200 border border-neutral-700 font-mono"
                >
                  {supportQueue}
                </span>
              )}
            </button>
          )}

          {/* Skill 2: Модерация — CRM модератора */}
          {hasModerationSkill && (
            <button
              type="button"
              onClick={() => onNavigate('/crm/moderation')}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-2xl font-medium text-sm transition ${
                isModerationCrmActive
                  ? 'bg-[#242428] text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
              }`}
            >
              <div className="flex items-center space-x-3.5">
                <ShieldAlert className="w-4 h-4 text-neutral-400" />
                <span>Модерация</span>
              </div>
              {moderationQueue > 0 && (
                <span
                  title="Очередь заявок в работе"
                  className="px-2 py-0.5 rounded-full text-xs font-semibold bg-neutral-800 text-neutral-200 border border-neutral-700 font-mono"
                >
                  {moderationQueue}
                </span>
              )}
            </button>
          )}

          {/* Skill 6: noSpam — CRM автобанов */}
          {hasNoSpamSkill && (
            <button
              type="button"
              onClick={() => onNavigate('/crm/nospam')}
              className={`w-full flex items-center space-x-3.5 px-4 py-2.5 rounded-2xl font-medium text-sm transition ${
                isNoSpamActive
                  ? 'bg-[#242428] text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-purple-400" />
              <span>noSpam</span>
            </button>
          )}

          {/* Профиль */}
          <button
            type="button"
            onClick={() => {
              if (currentUser) {
                onNavigate(`/@${currentUser.username}`);
              } else {
                onOpenAuth();
              }
            }}
            className={`w-full flex items-center space-x-3.5 px-4 py-2.5 rounded-2xl font-medium text-sm transition ${
              isProfileActive
                ? 'bg-[#242428] text-white shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Профиль</span>
          </button>

          {/* Управление скиллами сотрудника (быстрый доступ для тестов/админа) */}
          {onOpenSkillsModal && (
            <button
              type="button"
              onClick={onOpenSkillsModal}
              className="w-full flex items-center space-x-3.5 px-4 py-2.5 rounded-2xl font-medium text-sm text-neutral-400 hover:text-white hover:bg-neutral-900/60 transition"
            >
              <Sliders className="w-4 h-4 text-neutral-400" />
              <span>Скиллы ({currentUser?.skills?.length || 0})</span>
            </button>
          )}

          {/* Структура БД */}
          {onOpenSchemaModal && (
            <button
              type="button"
              onClick={onOpenSchemaModal}
              className="w-full flex items-center space-x-3.5 px-4 py-2.5 rounded-2xl font-medium text-sm text-neutral-400 hover:text-white hover:bg-neutral-900/60 transition"
            >
              <Database className="w-4 h-4 text-neutral-400" />
              <span>Структура БД</span>
            </button>
          )}
        </nav>
      </div>

      {/* Bottom section */}
      <div className="space-y-1 pt-6 border-t border-neutral-900">
        <button
          type="button"
          onClick={currentUser ? onLogout || onOpenAuth : onOpenAuth}
          className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs text-neutral-400 hover:text-white hover:bg-neutral-900/60 rounded-xl transition"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{currentUser ? 'Выйти' : 'Войти'}</span>
        </button>
      </div>
    </aside>
  );
};
