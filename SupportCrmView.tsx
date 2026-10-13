import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  LifeBuoy,
  Search,
  Settings,
  Star,
  MoreHorizontal,
  Video,
  Send,
  XCircle,
  Check,
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  Clock,
  CheckCircle2,
  Ban,
  ShieldAlert,
  CreditCard,
  Gift,
  X,
  Upload,
  Camera,
  Trash2,
  Users,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { DbUser, DbSupportTicket, DbSupportMessage, DbSupportSettings } from '../types/database';
import { itdDb } from '../lib/storage';
import { Avatar } from './Avatar';
import { NoSpamAdminView } from './NoSpamAdminView';

interface SupportCrmViewProps {
  currentUser: DbUser;
  initialTicketId?: string | null;
  onNavigateToProfile: (username: string) => void;
  onNavigateToTicketPath?: (path: string) => void;
  onNavigateToUserCard?: (username: string) => void;
}

type CrmTab =
  | 'my_questions'
  | 'question_detail'
  | 'my_replies'
  | 'all_replies'
  | 'all_questions'
  | 'stats'
  | 'nospam'
  | 'management';

export const SupportCrmView: React.FC<SupportCrmViewProps> = ({
  currentUser,
  initialTicketId,
  onNavigateToProfile,
  onNavigateToTicketPath,
  onNavigateToUserCard,
}) => {
  const [tickets, setTickets] = useState<DbSupportTicket[]>([]);
  const [activeTab, setActiveTab] = useState<CrmTab>(
    initialTicketId ? 'question_detail' : 'my_questions'
  );
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(
    initialTicketId || null
  );

  const [isShiftActive, setIsShiftActive] = useState<boolean>(true);
  const [showUserTicketsModal, setShowUserTicketsModal] = useState<boolean>(false);
  const [showActionsModal, setShowActionsModal] = useState<boolean>(false);
  const [actionBlockReason, setActionBlockReason] = useState<string>(
    'Нарушение правил сообщества'
  );

  // Draft reply in ticket view: clean & empty (no prefilled greeting template)
  const [replyDraft, setReplyDraft] = useState<string>('');
  const [isStarred, setIsStarred] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Support settings & management
  const [supportSettings, setSupportSettings] = useState<DbSupportSettings>(() =>
    itdDb.getSupportSettings()
  );
  const [editingAgentNames, setEditingAgentNames] = useState<Record<string, string>>({});
  const supportPhotoInputRef = useRef<HTMLInputElement>(null);

  const hasUserCardSkill = currentUser.skills?.includes('user_card') || false;
  const hasNoSpamSkill = currentUser.skills?.includes('no_spam') || false;
  const hasSupportManagementSkill =
    currentUser.skills?.includes('support_management') || false;

  const getMinutesInQueue = (ticket: DbSupportTicket): number => {
    const diffMs = Date.now() - new Date(ticket.created_at).getTime();
    const mins = Math.floor(diffMs / 60000);
    return mins > 0 ? mins : 1;
  };

  const formatMinutesInQueue = (ticket: DbSupportTicket): string => {
    const mins = getMinutesInQueue(ticket);
    const abs = Math.abs(mins) % 100;
    const num = abs % 10;
    let word = 'минут';
    if (abs > 10 && abs < 20) {
      word = 'минут';
    } else if (num > 1 && num < 5) {
      word = 'минуты';
    } else if (num === 1) {
      word = 'минута';
    }
    return `В очереди: ${mins} ${word}`;
  };

  const loadTickets = () => {
    const all = itdDb.getSupportTickets();
    setTickets(all);
    if (!selectedTicketId && all.length > 0 && activeTab === 'question_detail') {
      setSelectedTicketId(all[0].id);
    }
    setSupportSettings(itdDb.getSupportSettings());
  };

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => {
    if (initialTicketId) {
      setSelectedTicketId(initialTicketId);
      setActiveTab('question_detail');
    }
  }, [initialTicketId]);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // Convert ticket ID to readable numeric code
  const getTicketDisplayId = (id: string): string => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = (hash << 5) - hash + id.charCodeAt(i);
      hash |= 0;
    }
    const positive = (Math.abs(hash) % 90000000) + 10000000;
    return positive.toString();
  };

  const formatSlaTime = (ticket: DbSupportTicket): string => {
    const now = Date.now();
    const created = new Date(ticket.created_at).getTime();
    const diffMins = Math.max(1, Math.floor((now - created) / 60000));

    if (ticket.status === 'answered') {
      return `${diffMins < 60 ? `${diffMins} минут` : `${Math.floor(diffMins / 60)} час`} (Есть ответ)`;
    }

    if (diffMins < 60) {
      return `${diffMins} минут`;
    }
    const hours = Math.floor(diffMins / 60);
    return `${hours} ${hours === 1 ? 'час' : 'часа'}`;
  };

  const handleOpenTicket = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setActiveTab('question_detail');
    setReplyDraft('');
    if (onNavigateToTicketPath) {
      onNavigateToTicketPath(`/support?act=show(${ticketId})`);
    }
  };

  const handleGetNextQuestion = () => {
    const pending = tickets.filter(
      (t) => t.status === 'open' || t.status === 'in_progress'
    );
    if (pending.length === 0) {
      showToast('Нет новых вопросов в очереди');
      return;
    }
    const nextTicket = pending[0];
    handleOpenTicket(nextTicket.id);
  };

  const handleSendReply = (ticketId: string) => {
    if (!replyDraft.trim()) return;

    // В CRM фиксируем имя ответившего сотрудника (его номер саппорта из управления)
    const operatorDisplayName = itdDb.getSupportAgentDisplayName(currentUser.id);

    itdDb.replyToTicketAsSupport(ticketId, replyDraft.trim(), {
      id: currentUser.id,
      name: currentUser.name,
      username: currentUser.username,
      displayName: operatorDisplayName,
    });

    showToast(`Ответ зафиксирован от сотрудника «${operatorDisplayName}»`);
    setReplyDraft('');
    loadTickets();
  };

  const handleLeaveUnanswered = (ticketId: string) => {
    itdDb.leaveTicketUnanswered(ticketId, {
      id: currentUser.id,
      name: currentUser.name,
      username: currentUser.username,
    });
    const opNick = currentUser.username ? `@${currentUser.username}` : currentUser.name;
    showToast(`${opNick} закрыл обращение без ответа. Вопрос убран из очереди.`);
    loadTickets();
    setSelectedTicketId(null);
    setActiveTab('my_questions');
  };

  const handleOpenAll = () => {
    const pending = tickets.filter(
      (t) => t.status === 'open' || t.status === 'in_progress'
    );
    if (pending.length > 0) {
      handleOpenTicket(pending[0].id);
    }
  };

  const selectedTicket = selectedTicketId
    ? tickets.find((t) => t.id === selectedTicketId) || null
    : null;
  const ticketAuthor = selectedTicket
    ? itdDb.getUserById(selectedTicket.user_id)
    : null;
  const authorTicketsCount = selectedTicket
    ? itdDb.getSupportTickets(selectedTicket.user_id).length
    : 0;

  const handleToggleBlock = () => {
    if (!ticketAuthor) return;
    const isNowBlocked = !ticketAuthor.is_blocked;
    itdDb.setUserBlocked(
      ticketAuthor.id,
      isNowBlocked,
      actionBlockReason,
      currentUser.id,
      currentUser.name
    );
    showToast(
      isNowBlocked
        ? `Пользователь @${ticketAuthor.username} заблокирован`
        : `Пользователь @${ticketAuthor.username} разблокирован`
    );
    loadTickets();
  };

  const handleToggleVerify = () => {
    if (!ticketAuthor) return;
    const isNowVerified = !ticketAuthor.is_verified;
    itdDb.setUserVerified(ticketAuthor.id, isNowVerified);
    showToast(
      isNowVerified
        ? `Пользователю @${ticketAuthor.username} выдана верификация`
        : `Верификация снята`
    );
    loadTickets();
  };

  const handleToggleSubscription = () => {
    if (!ticketAuthor) return;
    const hasSub = !ticketAuthor.has_subscription;
    itdDb.setUserSubscription(ticketAuthor.id, hasSub, 'ШУМ+');
    showToast(
      hasSub
        ? `Пользователю @${ticketAuthor.username} выдана подписка ШУМ+`
        : `Подписка отозвана`
    );
    loadTickets();
  };

  // Support photo upload handler
  const handleSupportPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        const updated = itdDb.updateSupportSettings({ support_avatar_url: dataUrl });
        setSupportSettings(updated);
        showToast('Фотография поддержки обновлена');
      }
    };
    reader.readAsDataURL(file);

    if (supportPhotoInputRef.current) {
      supportPhotoInputRef.current.value = '';
    }
  };

  const handleRemoveSupportPhoto = () => {
    const updated = itdDb.updateSupportSettings({ support_avatar_url: null });
    setSupportSettings(updated);
    showToast('Фотография поддержки удалена');
  };

  // Save agent badge name (e.g. "Саппорт #1")
  const handleSaveAgentBadge = (userId: string, defaultIdx: number) => {
    const rawVal =
      editingAgentNames[userId] !== undefined
        ? editingAgentNames[userId]
        : supportSettings.agent_display_names?.[userId] || `Саппорт #${defaultIdx + 1}`;
    const cleanVal = rawVal.trim() || `Саппорт #${defaultIdx + 1}`;

    itdDb.setSupportAgentDisplayName(userId, cleanVal);
    const updated = itdDb.getSupportSettings();
    setSupportSettings(updated);
    showToast(`Отображаемый номер саппорта сохранен: ${cleanVal}`);
  };

  // Filter pending / my questions list (excluding answered and left-unanswered questions)
  const pendingTickets = tickets.filter(
    (t) => t.status === 'open' || t.status === 'in_progress'
  );
  const answeredTickets = tickets.filter((t) => t.status === 'answered');

  // All replies across all operators
  const allOperatorReplies = useMemo(() => {
    const list: Array<{
      ticket: DbSupportTicket;
      message: DbSupportMessage;
    }> = [];
    tickets.forEach((t) => {
      t.messages.forEach((m) => {
        if (m.sender_role === 'support' || m.sender_role === 'system') {
          list.push({ ticket: t, message: m });
        }
      });
    });
    return list.sort(
      (a, b) =>
        new Date(b.message.created_at).getTime() -
        new Date(a.message.created_at).getTime()
    );
  }, [tickets]);

  // Current operator's replies
  const myOperatorReplies = useMemo(() => {
    return allOperatorReplies.filter((item) => {
      const m = item.message;
      return (
        m.operator_id === currentUser.id ||
        (m.operator_username && m.operator_username === currentUser.username) ||
        (!m.operator_id && m.sender_role === 'support')
      );
    });
  }, [allOperatorReplies, currentUser]);

  const supportStaffUsers = useMemo(() => {
    return itdDb.getSupportStaffUsers();
  }, [tickets, supportSettings]);

  return (
    <div className="w-full space-y-4 pb-20 font-sans">
      {/* 1. TOP CRM NAVIGATION BAR */}
      <div className="bg-[#141416] border border-neutral-800 rounded-2xl px-3 py-1.5 text-xs select-none">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
          {/* Мои вопросы (СТАРТОВЫЙ ЭКРАН) */}
          <button
            type="button"
            onClick={() => setActiveTab('my_questions')}
            className={`px-2.5 py-1.5 rounded-xl font-medium text-xs transition whitespace-nowrap ${
              activeTab === 'my_questions'
                ? 'text-white bg-neutral-800 shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
            }`}
          >
            <span>Мои вопросы</span>
            {pendingTickets.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-neutral-900 border border-neutral-700 text-neutral-300">
                {pendingTickets.length}
              </span>
            )}
          </button>

          {/* Мои ответы */}
          <button
            type="button"
            onClick={() => setActiveTab('my_replies')}
            className={`px-2.5 py-1.5 rounded-xl font-medium text-xs transition whitespace-nowrap ${
              activeTab === 'my_replies'
                ? 'text-white bg-neutral-800 shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
            }`}
          >
            <span>Мои ответы</span>
          </button>

          {/* Ответы */}
          <button
            type="button"
            onClick={() => setActiveTab('all_replies')}
            className={`px-2.5 py-1.5 rounded-xl font-medium text-xs transition whitespace-nowrap ${
              activeTab === 'all_replies'
                ? 'text-white bg-neutral-800 shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
            }`}
          >
            <span>Ответы</span>
          </button>

          {/* Вопросы (вся очередь) */}
          <button
            type="button"
            onClick={() => setActiveTab('all_questions')}
            className={`px-2.5 py-1.5 rounded-xl font-medium text-xs transition whitespace-nowrap ${
              activeTab === 'all_questions'
                ? 'text-white bg-neutral-800 shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
            }`}
          >
            <span>Вопросы</span>
          </button>

          {/* Статистика */}
          <button
            type="button"
            onClick={() => setActiveTab('stats')}
            className={`px-2.5 py-1.5 rounded-xl font-medium text-xs transition whitespace-nowrap ${
              activeTab === 'stats'
                ? 'text-white bg-neutral-800 shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
            }`}
          >
            <span>Статистика</span>
          </button>

          {/* noSpam (если есть скилл no_spam) */}
          {hasNoSpamSkill && (
            <button
              type="button"
              onClick={() => setActiveTab('nospam')}
              className={`px-2.5 py-1.5 rounded-xl font-medium text-xs transition whitespace-nowrap ${
                activeTab === 'nospam'
                  ? 'text-white bg-neutral-800 shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
              }`}
            >
              <span>noSpam</span>
            </button>
          )}

          {/* Вкладка «Управление» (доступна при скилле Поддержка. Управление) */}
          {hasSupportManagementSkill && (
            <button
              type="button"
              onClick={() => setActiveTab('management')}
              className={`px-2.5 py-1.5 rounded-xl font-medium text-xs transition whitespace-nowrap ${
                activeTab === 'management'
                  ? 'text-white bg-neutral-800 shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
              }`}
            >
              <div className="flex items-center space-x-1.5">
                <Settings className="w-3.5 h-3.5" />
                <span>Управление</span>
              </div>
            </button>
          )}

          {/* Вопрос (статично на своем месте) */}
          <button
            type="button"
            disabled={!selectedTicket}
            onClick={() => {
              if (selectedTicket) setActiveTab('question_detail');
            }}
            className={`px-2.5 py-1.5 rounded-xl font-medium text-xs transition whitespace-nowrap ${
              !selectedTicket
                ? 'text-neutral-600 cursor-not-allowed'
                : activeTab === 'question_detail'
                ? 'text-white bg-neutral-800 shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
            }`}
          >
            <span>Вопрос</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className="p-3 bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs rounded-xl flex items-center space-x-2">
          <Check className="w-4 h-4 text-neutral-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* 2. СТАРТОВЫЙ ЭКРАН CRM («Мои вопросы») */}
      {activeTab === 'my_questions' && (
        <div className="p-5 sm:p-6 rounded-2xl bg-[#141416] border border-neutral-800 space-y-4 shadow-sm">
          <div className="flex items-center space-x-2 text-xs pb-1">
            <span className="font-bold text-white text-sm">
              Вопросы в очереди ({pendingTickets.length})
            </span>
            <span className="text-neutral-600">•</span>
            <button
              type="button"
              onClick={handleOpenAll}
              className="text-neutral-400 hover:text-white transition cursor-pointer"
            >
              Открыть все
            </button>
          </div>

          <div className="rounded-xl border border-neutral-800 overflow-hidden bg-[#18181b]">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-400 bg-[#141416]">
                  <th className="py-3 px-4 font-semibold w-28">ID</th>
                  <th className="py-3 px-4 font-semibold">Вопрос</th>
                  <th className="py-3 px-4 font-semibold w-48 text-right sm:text-left">
                    Время для ответа
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/80">
                {pendingTickets.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-neutral-500">
                      Нет новых вопросов в очереди
                    </td>
                  </tr>
                ) : (
                  pendingTickets.map((ticket) => {
                    const u = itdDb.getUserById(ticket.user_id);
                    const displayId = getTicketDisplayId(ticket.id);

                    return (
                      <tr
                        key={ticket.id}
                        onClick={() => handleOpenTicket(ticket.id)}
                        className="hover:bg-neutral-800/50 cursor-pointer transition group"
                      >
                        <td className="py-3 px-4 font-bold text-white font-mono">
                          {displayId}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <span className="text-neutral-200 group-hover:text-white font-medium hover:underline transition">
                              Вопрос от {u?.name || 'Пользователя'} #{ticket.id.slice(0, 8)}
                            </span>
                            <span className="text-neutral-500 text-[11px] hidden md:inline truncate max-w-xs">
                              — {ticket.problem_title}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-neutral-300 font-mono text-right sm:text-left">
                          <span className="font-semibold text-white">
                            {formatSlaTime(ticket)}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-neutral-800/80">
            <span className="text-xs text-neutral-400 text-center sm:text-left">
              {pendingTickets.length === 0
                ? 'Нет ни одного нового вопроса'
                : `В очереди ожидает ${pendingTickets.length} ${
                    pendingTickets.length === 1 ? 'вопрос' : 'вопросов'
                  }`}
            </span>

            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleGetNextQuestion}
                className="flex-1 sm:flex-none px-5 py-2.5 bg-white hover:bg-neutral-200 text-black font-semibold text-xs rounded-xl transition shadow flex items-center justify-center space-x-1.5"
              >
                <span>Получить новый вопрос</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsShiftActive(false);
                  showToast('Смена в поддержке завершена');
                }}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white font-medium text-xs rounded-xl border border-neutral-800 transition flex items-center justify-center"
              >
                <span>Завершить работу</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. ДЕТАЛЬНЫЙ ЭКРАН ТИКЕТА («Вопрос») — ЕДИНЫЙ СТИЛЬ С РАЗДЕЛОМ ПОМОЩЬ */}
      {activeTab === 'question_detail' && selectedTicket && (
        <div className="space-y-4">
          <div className="p-5 sm:p-6 rounded-2xl bg-[#141416] border border-neutral-800 space-y-5 shadow-sm">
            {/* Header: Topic, Star, Menu */}
            <div className="pb-4 border-b border-neutral-800/80 space-y-1.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center space-x-2 flex-wrap">
                  <span className="text-neutral-400 text-sm"></span>
                  <h2 className="text-base font-bold text-white leading-tight">
                    {selectedTicket.problem_title}
                  </h2>
                  <span className="text-xs text-neutral-500 font-mono">
                    (ID: {getTicketDisplayId(selectedTicket.id)}, 2FA, macOS Chrome)
                  </span>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsStarred(!isStarred)}
                    className={`p-1.5 rounded-lg transition ${
                      isStarred
                        ? 'text-neutral-200 bg-neutral-800'
                        : 'text-neutral-500 hover:text-white hover:bg-neutral-800'
                    }`}
                    title="В избранное"
                  >
                    <Star className={`w-4 h-4 ${isStarred ? 'fill-current' : ''}`} />
                  </button>

                  <button
                    type="button"
                    onClick={() => showToast(`Тикет #${selectedTicket.id.slice(0, 8)}`)}
                    className="p-1.5 text-neutral-500 hover:text-white rounded-lg hover:bg-neutral-800 transition"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Sub-bar tags */}
              <div className="flex items-center space-x-2 text-xs text-neutral-400 flex-wrap gap-y-1 pt-1">
                <span>{formatMinutesInQueue(selectedTicket)}</span>
                {hasUserCardSkill && ticketAuthor && (
                  <>
                    <span className="text-neutral-600">•</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (onNavigateToUserCard) {
                          onNavigateToUserCard(ticketAuthor.username);
                        } else if (onNavigateToTicketPath) {
                          onNavigateToTicketPath(`/@${ticketAuthor.username}#info`);
                        } else {
                          onNavigateToProfile(ticketAuthor.username);
                        }
                      }}
                      className="hover:text-white underline transition cursor-pointer"
                    >
                      Карточка
                    </button>
                  </>
                )}
                <span className="text-neutral-600">•</span>
                <button
                  type="button"
                  onClick={() => setShowActionsModal(true)}
                  className="hover:text-white underline transition cursor-pointer"
                >
                  Действия
                </button>
              </div>
            </div>

            {/* В начале: Автор обращения и его вопрос — ОФОРМЛЕНО КАК КОММЕНТАРИЙ ПОД ИМЕНЕМ ЮЗЕРА И КОЛИЧЕСТВОМ ВОПРОСОВ */}
            {(() => {
              const questionText =
                selectedTicket.problem_description ||
                selectedTicket.messages[0]?.text ||
                '';
              const questionAttachments =
                selectedTicket.attachments && selectedTicket.attachments.length > 0
                  ? selectedTicket.attachments
                  : selectedTicket.messages[0]?.attachments || [];

              // Последующие ответы (сообщения после первоначального вопроса)
              const hasExplicitFirstMsg =
                selectedTicket.messages.length > 0 &&
                selectedTicket.messages[0].text === questionText;
              const subsequentMessages = hasExplicitFirstMsg
                ? selectedTicket.messages.slice(1)
                : selectedTicket.messages;

              return (
                <div className="space-y-4">
                  {/* Первоначальный вопрос пользователя — как комментарий */}
                  <div className="flex space-x-3 items-start">
                    <div className="shrink-0 pt-0.5">
                      <Avatar
                        name={ticketAuthor?.name || 'Пользователь'}
                        avatarUrl={ticketAuthor?.avatar_url}
                        emoji={ticketAuthor?.avatar_emoji}
                        hasEyes={false}
                        size="sm"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            if (ticketAuthor) onNavigateToProfile(ticketAuthor.username);
                          }}
                          className="font-bold text-xs sm:text-sm text-white hover:underline transition"
                        >
                          {ticketAuthor?.name || 'Пользователь'}
                        </button>
                        {ticketAuthor?.username && (
                          <span className="text-[11px] text-neutral-400 font-mono">
                            @{ticketAuthor.username}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowUserTicketsModal(true)}
                          className="text-xs text-neutral-400 hover:text-white underline transition cursor-pointer"
                          title="Открыть перечень всех вопросов пользователя"
                        >
                          ({authorTicketsCount}{' '}
                          {authorTicketsCount === 1 ? 'вопрос' : 'вопросов'})
                        </button>
                        {ticketAuthor?.is_verified && (
                          <span className="text-sky-400 font-bold text-xs" title="Верифицирован">
                            ✓
                          </span>
                        )}
                        <span className="text-[10px] text-neutral-500">
                          {new Date(selectedTicket.created_at).toLocaleString('ru-RU', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {/* Текст вопроса как комментарий */}
                      <div className="text-xs md:text-sm text-neutral-200 mt-1 leading-relaxed break-words whitespace-pre-wrap select-text">
                        {questionText}
                      </div>

                      {/* Вложения к вопросу */}
                      {questionAttachments.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-2">
                          {questionAttachments.map((att, attIdx) => (
                            <div
                              key={attIdx}
                              className="rounded-xl border border-neutral-800 bg-black/40 overflow-hidden max-w-xs"
                            >
                              {att.type === 'video' ? (
                                <div className="p-3 flex items-center space-x-2 text-xs text-neutral-400">
                                  <Video className="w-4 h-4" />
                                  <span>{att.name}</span>
                                </div>
                              ) : (
                                <img
                                  src={att.url}
                                  alt={att.name}
                                  className="max-h-40 w-auto object-cover rounded-xl"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Последующие сообщения в переписке (единый стиль переписки с клиентом) */}
                  {subsequentMessages.length > 0 && (
                    <div className="space-y-4 pt-4 border-t border-neutral-800/60 divide-y divide-neutral-800/60">
                      {subsequentMessages.map((m, idx) => {
                        if (m.sender_role === 'system') {
                          return (
                            <div key={m.id || idx} className="pt-3 first:pt-0">
                              <div className="py-2.5 px-4 rounded-xl bg-[#18181b] border border-neutral-800 text-xs text-neutral-300 flex items-center justify-between shadow-sm">
                                <div className="flex items-center space-x-2 flex-wrap">
                                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 shrink-0" />
                                  <span className="font-medium text-neutral-200">{m.text}</span>
                                  <span className="text-[10px] text-neutral-500 font-mono bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 rounded">
                                    внутренняя плашка
                                  </span>
                                </div>
                                <span className="text-[10px] text-neutral-500 font-mono shrink-0">
                                  {new Date(m.created_at).toLocaleTimeString('ru-RU', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                            </div>
                          );
                        }

                        const isSupport = m.sender_role === 'support';
                        const supportLabel =
                          m.operator_display_name ||
                          (m.operator_id
                            ? itdDb.getSupportAgentDisplayName(m.operator_id)
                            : 'Саппорт #1');
                        const avatarName = isSupport ? supportLabel : (ticketAuthor?.name || m.sender_name);
                        const avatarUrl = isSupport
                          ? supportSettings.support_avatar_url
                          : ticketAuthor?.avatar_url;
                        const avatarEmoji = isSupport
                          ? (supportSettings.support_avatar_url ? null : '🛡️')
                          : ticketAuthor?.avatar_emoji;

                        return (
                          <div key={m.id || idx} className="pt-4 first:pt-0 flex space-x-3 items-start">
                            <div className="shrink-0 pt-0.5">
                              <Avatar
                                name={avatarName}
                                avatarUrl={avatarUrl}
                                emoji={avatarEmoji}
                                hasEyes={false}
                                size="sm"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 flex-wrap">
                                {isSupport ? (
                                  <>
                                    <span className="font-semibold text-xs text-white">
                                      {supportLabel}
                                    </span>
                                    {m.operator_username && (
                                      <span className="text-[11px] text-neutral-400 font-mono">
                                        @{m.operator_username}
                                      </span>
                                    )}
                                    {m.operator_name &&
                                      m.operator_name !== supportLabel && (
                                        <span className="text-[11px] text-neutral-500">
                                          • {m.operator_name}
                                        </span>
                                      )}
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 font-medium">
                                      саппорт
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <span className="font-semibold text-xs text-white">
                                      {m.sender_name}
                                    </span>
                                    {ticketAuthor?.username && (
                                      <span className="text-[11px] text-neutral-400 font-mono">
                                        @{ticketAuthor.username}
                                      </span>
                                    )}
                                  </>
                                )}
                                <span className="text-[10px] text-neutral-500">
                                  {new Date(m.created_at).toLocaleString('ru-RU', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>

                              <div className="text-xs md:text-sm text-neutral-200 mt-1 leading-relaxed break-words whitespace-pre-wrap select-text">
                                {m.text}
                              </div>

                              {/* Attachments if any */}
                              {m.attachments && m.attachments.length > 0 && (
                                <div className="mt-2.5 flex flex-wrap gap-2">
                                  {m.attachments.map((att, attIdx) => (
                                    <div
                                      key={attIdx}
                                      className="rounded-xl border border-neutral-800 bg-black/40 overflow-hidden max-w-xs"
                                    >
                                      {att.type === 'video' ? (
                                        <div className="p-3 flex items-center space-x-2 text-xs text-neutral-400">
                                          <Video className="w-4 h-4" />
                                          <span>{att.name}</span>
                                        </div>
                                      ) : (
                                        <img
                                          src={att.url}
                                          alt={att.name}
                                          className="max-h-40 w-auto object-cover rounded-xl"
                                        />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* БЛОК ОТВЕТА — БЕЗ ШАБЛОНОВ И ТЕГОВ, ЕДИНЫЙ ЧИСТЫЙ СТИЛЬ */}
            <div className="pt-4 border-t border-neutral-800/80 space-y-3">
              <textarea
                rows={4}
                value={replyDraft}
                onChange={(e) => setReplyDraft(e.target.value)}
                placeholder="Напишите ответ пользователю..."
                className="w-full p-4 bg-[#18181b] border border-neutral-800 rounded-2xl text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-700 resize-none leading-relaxed"
              />

              <div className="flex items-center justify-between pt-1 gap-3">
                <button
                  type="button"
                  onClick={() => handleLeaveUnanswered(selectedTicket.id)}
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-xl text-xs font-medium border border-neutral-800 transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Оставить без ответа</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendReply(selectedTicket.id)}
                  disabled={!replyDraft.trim()}
                  className="px-6 py-2.5 bg-white hover:bg-neutral-200 disabled:opacity-40 text-black font-semibold text-xs rounded-xl transition flex items-center space-x-1.5 shadow cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Отправить ответ</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB: УПРАВЛЕНИЕ ПОДДЕРЖКОЙ (СКИЛЛ Поддержка. Управление) */}
      {activeTab === 'management' && (
        <div className="p-5 sm:p-7 rounded-2xl bg-[#141416] border border-neutral-800 space-y-6 shadow-sm">
          {/* Header */}
          <div className="pb-4 border-b border-neutral-800/80 flex items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">
                  Поддержка. Управление
                </h2>
                <p className="text-xs text-neutral-400">
                  Настройка единого аватара саппорта и закрепление отображаемых номеров сотрудников
                </p>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-900 border border-neutral-800 text-neutral-300">
              Скилл активен
            </span>
          </div>

          {/* 1. ФОТОГРАФИЯ ОТВЕТА ОТ ЛИЦА ПОДДЕРЖКИ */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[#18181b] border border-neutral-800 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <span>1. Фотография ответа от лица поддержки</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Загруженное фото отображается во всех ответах от лица саппорта
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-5 pt-2">
              {/* Аватарка превью */}
              <div className="w-20 h-20 rounded-full border-2 border-neutral-700 bg-neutral-900 overflow-hidden flex items-center justify-center shrink-0 shadow-inner relative group">
                {supportSettings.support_avatar_url ? (
                  <img
                    src={supportSettings.support_avatar_url}
                    alt="Аватар саппорта"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-neutral-500">
                    <span className="text-2xl">🛡️</span>
                  </div>
                )}
              </div>

              {/* Кнопки загрузки */}
              <div className="space-y-2 text-center sm:text-left flex-1">
                <input
                  type="file"
                  ref={supportPhotoInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleSupportPhotoUpload}
                />

                <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                  <button
                    type="button"
                    onClick={() => supportPhotoInputRef.current?.click()}
                    className="px-4 py-2 bg-white hover:bg-neutral-200 text-black font-semibold text-xs rounded-xl transition flex items-center space-x-2 shadow cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Загрузить фото</span>
                  </button>

                  {supportSettings.support_avatar_url && (
                    <button
                      type="button"
                      onClick={handleRemoveSupportPhoto}
                      className="px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-red-400 border border-neutral-800 rounded-xl text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Удалить фото</span>
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-neutral-500">
                  Поддерживаются форматы PNG, JPG, WEBP. Фото синхронизируется в базе данных и автоматически отображается в переписке у всех пользователей и в CRM.
                </p>
              </div>
            </div>
          </div>

          {/* 2. СОТРУДНИКИ ПОДДЕРЖКИ */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[#18181b] border border-neutral-800 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800/80">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Users className="w-4 h-4 text-cyan-400" />
                  <span>2. Сотрудники поддержки</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  В этом разделе глава поддержки может изменить отображаемый номер саппорта. Это имя используется в качестве имени отвечающего от лица поддержки.
                </p>
              </div>
              <span className="text-xs text-neutral-500 font-mono">
                Всего: {supportStaffUsers.length}
              </span>
            </div>

            <div className="space-y-3 pt-1">
              {supportStaffUsers.map((staffUser, idx) => {
                const currentBadge =
                  editingAgentNames[staffUser.id] !== undefined
                    ? editingAgentNames[staffUser.id]
                    : supportSettings.agent_display_names?.[staffUser.id] ||
                      `Саппорт #${idx + 1}`;

                return (
                  <div
                    key={staffUser.id}
                    className="p-4 rounded-xl bg-[#141416] border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm hover:border-neutral-700/80 transition"
                  >
                    {/* Информация о сотруднике: Имя, @короткое имя */}
                    <div className="flex items-center space-x-3 min-w-0">
                      <Avatar
                        name={staffUser.name}
                        avatarUrl={staffUser.avatar_url}
                        emoji={staffUser.avatar_emoji}
                        hasEyes={false}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-xs sm:text-sm text-white truncate">
                            {staffUser.name}
                          </span>
                          <span className="text-xs text-neutral-400 font-mono truncate">
                            @{staffUser.username}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-[11px] text-neutral-500 mt-0.5">
                          <span>
                            {staffUser.skills?.includes('support_management')
                              ? 'Глава поддержки'
                              : 'Специалист'}
                          </span>
                          <span>•</span>
                          <span>ID: {staffUser.id.slice(0, 8)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Поле ввода с предзаполненным Саппорт #(цифры по порядку) */}
                    <div className="flex items-center space-x-2 sm:w-72">
                      <input
                        type="text"
                        value={currentBadge}
                        onChange={(e) =>
                          setEditingAgentNames((prev) => ({
                            ...prev,
                            [staffUser.id]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveAgentBadge(staffUser.id, idx);
                        }}
                        placeholder={`Саппорт #${idx + 1}`}
                        className="flex-1 px-3 py-2 bg-[#18181b] border border-neutral-700/80 focus:border-cyan-500 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none transition font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveAgentBadge(staffUser.id, idx)}
                        className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-semibold border border-neutral-700 transition cursor-pointer shrink-0"
                      >
                        Сохранить
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 5. TAB: ВСЕ ВОПРОСЫ */}
      {activeTab === 'all_questions' && (
        <div className="p-5 sm:p-6 rounded-2xl bg-[#141416] border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between text-xs">
            <h2 className="font-bold text-white text-sm">
              Все зарегистрированные вопросы ({tickets.length})
            </h2>
          </div>

          <div className="rounded-xl border border-neutral-800 overflow-hidden bg-[#18181b]">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-400 bg-[#141416]">
                  <th className="py-3 px-4 font-semibold w-28">ID</th>
                  <th className="py-3 px-4 font-semibold">Вопрос</th>
                  <th className="py-3 px-4 font-semibold w-48">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/80">
                {tickets.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => handleOpenTicket(t.id)}
                    className="hover:bg-neutral-800/50 cursor-pointer transition group"
                  >
                    <td className="py-3 px-4 font-bold text-white font-mono">
                      {getTicketDisplayId(t.id)}
                    </td>
                    <td className="py-3 px-4 text-neutral-200 group-hover:text-white">
                      {t.problem_title}
                    </td>
                    <td className="py-3 px-4 text-neutral-400">
                      {t.status === 'answered' ? 'Отвечен' : 'В очереди'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. TAB: ОТВЕТЫ (всех операторов) */}
      {activeTab === 'all_replies' && (
        <div className="p-5 sm:p-6 rounded-2xl bg-[#141416] border border-neutral-800 space-y-4 shadow-sm">
          <div className="flex items-center justify-between text-xs pb-1">
            <h2 className="font-bold text-white text-sm">
              Ответы всех операторов ({allOperatorReplies.length})
            </h2>
            <span className="text-[11px] text-neutral-500">
              Нажмите на запись, чтобы открыть тикет
            </span>
          </div>

          {allOperatorReplies.length === 0 ? (
            <div className="py-12 text-center text-xs text-neutral-500 rounded-xl border border-neutral-800/80 bg-[#18181b]">
              Предоставленных ответов пока нет
            </div>
          ) : (
            <div className="space-y-3">
              {allOperatorReplies.map((item, idx) => (
                <div
                  key={`${item.ticket.id}-${item.message.id || idx}`}
                  onClick={() => handleOpenTicket(item.ticket.id)}
                  className="p-4 rounded-xl bg-[#18181b] border border-neutral-800 hover:border-neutral-700 transition cursor-pointer space-y-2.5 group shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono text-neutral-500 uppercase">
                        ID: {getTicketDisplayId(item.ticket.id)}
                      </span>
                      <h3 className="font-bold text-white text-xs sm:text-sm group-hover:text-neutral-200 transition">
                        {item.ticket.problem_title}
                      </h3>
                    </div>

                    <span className="text-[11px] text-neutral-500 shrink-0 font-mono">
                      {new Date(item.message.created_at).toLocaleString('ru-RU', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#141416] border border-neutral-800 text-xs text-neutral-200 whitespace-pre-wrap leading-relaxed group-hover:border-neutral-700 transition">
                    {item.message.text}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-0.5">
                    <span>
                      Сотрудник:{' '}
                      <strong className="text-white font-medium">
                        {item.message.operator_display_name ||
                          item.message.operator_name ||
                          'Саппорт #1'}
                      </strong>
                      {item.message.operator_username && (
                        <span className="text-neutral-400 font-mono ml-1">
                          (@{item.message.operator_username})
                        </span>
                      )}
                    </span>
                    <span className="text-neutral-400 group-hover:text-white transition underline">
                      Открыть тикет →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 7. TAB: МОИ ОТВЕТЫ */}
      {activeTab === 'my_replies' && (
        <div className="p-5 sm:p-6 rounded-2xl bg-[#141416] border border-neutral-800 space-y-4 shadow-sm">
          <div className="flex items-center justify-between text-xs pb-1">
            <h2 className="font-bold text-white text-sm">
              Мои ответы ({myOperatorReplies.length})
            </h2>
            <span className="text-[11px] text-neutral-500">
              Нажмите на запись, чтобы открыть тикет
            </span>
          </div>

          {myOperatorReplies.length === 0 ? (
            <div className="py-12 text-center text-xs text-neutral-500 rounded-xl border border-neutral-800/80 bg-[#18181b]">
              Вы еще не предоставили ни одного ответа
            </div>
          ) : (
            <div className="space-y-3">
              {myOperatorReplies.map((item, idx) => (
                <div
                  key={`${item.ticket.id}-${item.message.id || idx}`}
                  onClick={() => handleOpenTicket(item.ticket.id)}
                  className="p-4 rounded-xl bg-[#18181b] border border-neutral-800 hover:border-neutral-700 transition cursor-pointer space-y-2.5 group shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono text-neutral-500 uppercase">
                        ID: {getTicketDisplayId(item.ticket.id)}
                      </span>
                      <h3 className="font-bold text-white text-xs sm:text-sm group-hover:text-neutral-200 transition">
                        {item.ticket.problem_title}
                      </h3>
                    </div>

                    <span className="text-[11px] text-neutral-500 shrink-0 font-mono">
                      {new Date(item.message.created_at).toLocaleString('ru-RU', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#141416] border border-neutral-800 text-xs text-neutral-200 whitespace-pre-wrap leading-relaxed group-hover:border-neutral-700 transition">
                    {item.message.text}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-0.5">
                    <span>
                      Зафиксировано как:{' '}
                      <strong className="text-white font-medium">
                        {item.message.operator_display_name ||
                          itdDb.getSupportAgentDisplayName(currentUser.id)}
                      </strong>
                    </span>
                    <span className="text-neutral-400 group-hover:text-white transition underline">
                      Открыть тикет →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 8. TAB: СТАТИСТИКА */}
      {activeTab === 'stats' && (
        <div className="p-5 sm:p-6 rounded-2xl bg-[#141416] border border-neutral-800 space-y-4">
          <h2 className="font-bold text-white text-sm">Статистика поддержки ШУМ</h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-[#18181b] border border-neutral-800 rounded-xl">
              <span className="text-[11px] text-neutral-500 block">Всего вопросов</span>
              <span className="text-xl font-bold text-white mt-1 block">
                {tickets.length}
              </span>
            </div>
            <div className="p-4 bg-[#18181b] border border-neutral-800 rounded-xl">
              <span className="text-[11px] text-neutral-500 block">Отвечено</span>
              <span className="text-xl font-bold text-white mt-1 block">
                {answeredTickets.length}
              </span>
            </div>
            <div className="p-4 bg-[#18181b] border border-neutral-800 rounded-xl">
              <span className="text-[11px] text-neutral-500 block">В очереди</span>
              <span className="text-xl font-bold text-white mt-1 block">
                {pendingTickets.length}
              </span>
            </div>
            <div className="p-4 bg-[#18181b] border border-neutral-800 rounded-xl">
              <span className="text-[11px] text-neutral-500 block">Сотрудников</span>
              <span className="text-xl font-bold text-white mt-1 block">
                {supportStaffUsers.length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 9. noSpam CRM TAB */}
      {activeTab === 'nospam' && (
        <NoSpamAdminView
          currentUser={currentUser}
          onNavigateToProfile={onNavigateToProfile}
        />
      )}

      {/* Modal: Действия над пользователем */}
      {showActionsModal && ticketAuthor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#18181b] border border-neutral-800 rounded-3xl w-full max-w-lg flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-[#141416]">
              <div className="flex items-center space-x-3">
                <Avatar
                  name={ticketAuthor.name}
                  avatarUrl={ticketAuthor.avatar_url}
                  emoji={ticketAuthor.avatar_emoji}
                  size="sm"
                />
                <div>
                  <h3 className="font-bold text-white text-sm">
                    Действия над пользователем
                  </h3>
                  <span className="text-xs text-neutral-400 font-mono">
                    {ticketAuthor.name} (@{ticketAuthor.username})
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowActionsModal(false)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                <div
                  className={`p-2.5 rounded-xl border ${
                    ticketAuthor.is_blocked
                      ? 'bg-red-500/10 text-red-400 border-red-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}
                >
                  <span className="block font-semibold">
                    {ticketAuthor.is_blocked ? 'Заблокирован' : 'Активен'}
                  </span>
                </div>

                <div
                  className={`p-2.5 rounded-xl border ${
                    ticketAuthor.is_verified
                      ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                      : 'bg-neutral-900 text-neutral-400 border-neutral-800'
                  }`}
                >
                  <span className="block font-semibold">
                    {ticketAuthor.is_verified ? 'Верифицирован' : 'Обычный'}
                  </span>
                </div>

                <div
                  className={`p-2.5 rounded-xl border ${
                    ticketAuthor.has_subscription
                      ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                      : 'bg-neutral-900 text-neutral-400 border-neutral-800'
                  }`}
                >
                  <span className="block font-semibold">
                    {ticketAuthor.has_subscription ? 'ШУМ+' : 'Без подписки'}
                  </span>
                </div>
              </div>

              {/* Action 1: Заблокировать */}
              <div className="p-4 rounded-2xl bg-[#141416] border border-neutral-800/80 space-y-3">
                <div className="flex items-center space-x-2">
                  <Ban
                    className={`w-4 h-4 ${
                      ticketAuthor.is_blocked ? 'text-red-400' : 'text-neutral-400'
                    }`}
                  />
                  <span className="font-semibold text-xs text-white">
                    Блокировка аккаунта
                  </span>
                </div>

                {!ticketAuthor.is_blocked ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={actionBlockReason}
                      onChange={(e) => setActionBlockReason(e.target.value)}
                      placeholder="Причина блокировки"
                      className="w-full px-3 py-2 bg-[#18181b] border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
                    />
                    <button
                      type="button"
                      onClick={handleToggleBlock}
                      className="w-full py-2.5 px-4 bg-red-950/80 hover:bg-red-900 text-red-200 font-semibold text-xs rounded-xl border border-red-800/80 transition cursor-pointer flex items-center justify-center space-x-1.5"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Заблокировать</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[11px] text-neutral-400">
                      Причина бана: {ticketAuthor.blocked_reason || 'Нарушение правил'}
                    </p>
                    <button
                      type="button"
                      onClick={handleToggleBlock}
                      className="w-full py-2.5 px-4 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs rounded-xl border border-neutral-700 transition cursor-pointer flex items-center justify-center space-x-1.5"
                    >
                      <span>Разблокировать</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Action 2: Верифицировать */}
              <div className="p-4 rounded-2xl bg-[#141416] border border-neutral-800/80 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2
                      className={`w-4 h-4 ${
                        ticketAuthor.is_verified ? 'text-sky-400' : 'text-neutral-400'
                      }`}
                    />
                    <span className="font-semibold text-xs text-white">
                      Верификация профиля
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Синяя галочка рядом с именем в ленте и профиле
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleToggleVerify}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
                    ticketAuthor.is_verified
                      ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700'
                      : 'bg-white hover:bg-neutral-200 text-black'
                  }`}
                >
                  {ticketAuthor.is_verified ? 'Снять верификацию' : 'Верифицировать'}
                </button>
              </div>

              {/* Action 3: Выдать подписку */}
              <div className="p-4 rounded-2xl bg-[#141416] border border-neutral-800/80 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <Gift
                      className={`w-4 h-4 ${
                        ticketAuthor.has_subscription
                          ? 'text-purple-400'
                          : 'text-neutral-400'
                      }`}
                    />
                    <span className="font-semibold text-xs text-white">
                      Подписка ШУМ+
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Премиум-доступ к эксклюзивным функциям сети
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleToggleSubscription}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
                    ticketAuthor.has_subscription
                      ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700'
                      : 'bg-purple-900/60 hover:bg-purple-900 text-purple-200 border border-purple-700/80'
                  }`}
                >
                  {ticketAuthor.has_subscription ? 'Отозвать подписку' : 'Выдать подписку'}
                </button>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-neutral-800 bg-[#141416] flex justify-end">
              <button
                type="button"
                onClick={() => setShowActionsModal(false)}
                className="px-5 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Готово
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Все обращения данного пользователя */}
      {showUserTicketsModal && ticketAuthor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#18181b] border border-neutral-800 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-[#141416]">
              <div className="flex items-center space-x-2.5">
                <Avatar
                  name={ticketAuthor.name}
                  avatarUrl={ticketAuthor.avatar_url}
                  emoji={ticketAuthor.avatar_emoji}
                  size="sm"
                />
                <div>
                  <h3 className="font-bold text-white text-sm">
                    Обращения пользователя {ticketAuthor.name}
                  </h3>
                  <span className="text-xs text-neutral-500 font-mono">
                    @{ticketAuthor.username}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUserTicketsModal(false)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-2.5">
              {itdDb.getSupportTickets(ticketAuthor.id).length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-500">
                  У пользователя пока нет других обращений
                </div>
              ) : (
                itdDb.getSupportTickets(ticketAuthor.id).map((t) => (
                  <div
                    key={t.id}
                    onClick={() => {
                      setShowUserTicketsModal(false);
                      handleOpenTicket(t.id);
                    }}
                    className={`p-3.5 rounded-xl border transition cursor-pointer space-y-1.5 group ${
                      t.id === selectedTicket?.id
                        ? 'bg-neutral-800/80 border-neutral-600'
                        : 'bg-[#141416] border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-[10px] text-neutral-500">
                        ID: {getTicketDisplayId(t.id)}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-neutral-800 text-neutral-300 border border-neutral-700">
                        {t.status === 'answered'
                          ? 'Отвечен'
                          : t.status === 'unanswered'
                          ? 'Без ответа'
                          : 'В очереди'}
                      </span>
                    </div>
                    <h4 className="font-semibold text-white text-xs group-hover:text-neutral-200 transition">
                      {t.problem_title}
                    </h4>
                    <p className="text-xs text-neutral-400 line-clamp-2">
                      {t.problem_description}
                    </p>
                    <div className="text-[10px] text-neutral-500 pt-1 flex items-center justify-between">
                      <span>
                        {new Date(t.created_at).toLocaleString('ru-RU', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className="text-neutral-400 group-hover:text-white underline">
                        {t.id === selectedTicket?.id ? 'Текущий тикет' : 'Открыть →'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="px-5 py-3 border-t border-neutral-800 bg-[#141416] flex justify-end">
              <button
                type="button"
                onClick={() => setShowUserTicketsModal(false)}
                className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-medium transition"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
