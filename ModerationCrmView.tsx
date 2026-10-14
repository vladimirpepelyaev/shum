import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  X,
  Check,
  Ban,
  CheckCircle2,
  Search,
  Archive,
  Clock,
  ExternalLink,
  User,
  Trash2,
  FileText
} from 'lucide-react';
import { DbUser, DbReport, PostWithMeta, DbModerationDecision } from '../types/database';
import { itdDb, getImageFingerprint } from '../lib/storage';
import { supabaseService } from '../lib/supabaseService';
import { Avatar } from './Avatar';

interface ModerationCrmViewProps {
  currentUser: DbUser;
  onNavigateToProfile: (username: string) => void;
  onNavigateToPost?: (username: string, postNumber: number) => void;
}

const MODERATION_REASONS = [
  'Спам и реклама',
  'Оскорбления и травля',
  'Недостоверная информация',
  'Запрещенный контент',
  'Нарушение авторских прав',
  'Разжигание вражды',
  'Мошенничество',
  'Нарушение правил сообщества ШУМ',
];

export const ModerationCrmView: React.FC<ModerationCrmViewProps> = ({
  currentUser,
  onNavigateToProfile,
  onNavigateToPost,
}) => {
  const [activeTab, setActiveTab] = useState<'reports' | 'decisions'>('reports');
  const [reports, setReports] = useState<
    Array<DbReport & { post: PostWithMeta | null; reporter: DbUser | null }>
  >([]);
  const [decisions, setDecisions] = useState<DbModerationDecision[]>([]);
  const [customReasons, setCustomReasons] = useState<{ [reportId: string]: string }>({});
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // History search & filters
  const [decisionFilter, setDecisionFilter] = useState<'all' | 'accepted' | 'dismissed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    try {
      const list = await supabaseService.getAllReports();
      setReports(list);

      const initialReasons: { [reportId: string]: string } = {};
      list.forEach((r) => {
        initialReasons[r.id] = r.reason || MODERATION_REASONS[0];
      });
      setCustomReasons((prev) => ({ ...initialReasons, ...prev }));

      const history = await supabaseService.getModerationDecisions();
      setDecisions(history);
    } catch {
      const list = itdDb.getAllReports();
      setReports(list);

      const initialReasons: { [reportId: string]: string } = {};
      list.forEach((r) => {
        initialReasons[r.id] = r.reason || MODERATION_REASONS[0];
      });
      setCustomReasons((prev) => ({ ...initialReasons, ...prev }));

      const history = itdDb.getModerationDecisions();
      setDecisions(history);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAcceptReport = async (reportId: string, authorName: string, authorUsername: string) => {
    const chosenReason = customReasons[reportId] || 'Нарушение правил сообщества';
    await supabaseService.acceptReport(reportId, chosenReason, {
      id: currentUser.id,
      name: currentUser.name,
      username: currentUser.username,
    });
    setFeedbackMessage(
      `Публикация удалена. Профиль @${authorUsername} (${authorName}) заблокирован: «${chosenReason}». Решение занесено в историю.`
    );
    setTimeout(() => setFeedbackMessage(null), 3500);
    await loadData();
  };

  const handleDismissReport = async (reportId: string) => {
    await supabaseService.dismissReport(reportId, {
      id: currentUser.id,
      name: currentUser.name,
      username: currentUser.username,
    });
    setFeedbackMessage('Жалоба отклонена и занесена в историю решений.');
    setTimeout(() => setFeedbackMessage(null), 3000);
    await loadData();
  };

  const handleReasonChange = (reportId: string, newReason: string) => {
    setCustomReasons((prev) => ({
      ...prev,
      [reportId]: newReason,
    }));
  };

  // Metrics for history storage
  const acceptedCount = useMemo(
    () => decisions.filter((d) => d.action === 'accepted').length,
    [decisions]
  );
  const dismissedCount = useMemo(
    () => decisions.filter((d) => d.action === 'dismissed').length,
    [decisions]
  );

  // Filtered decisions list
  const filteredDecisions = useMemo(() => {
    return decisions.filter((item) => {
      if (decisionFilter === 'accepted' && item.action !== 'accepted') return false;
      if (decisionFilter === 'dismissed' && item.action !== 'dismissed') return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchAuthor = item.post_author_username?.toLowerCase().includes(q) || item.post_author_name?.toLowerCase().includes(q);
      const matchReporter = item.reporter_username?.toLowerCase().includes(q) || item.reporter_name?.toLowerCase().includes(q);
      const matchReason = item.reason?.toLowerCase().includes(q);
      const matchContent = item.post_content?.toLowerCase().includes(q);
      const matchMod = item.moderator_username?.toLowerCase().includes(q) || item.moderator_name?.toLowerCase().includes(q);
      const matchId = item.id?.toLowerCase().includes(q);

      return matchAuthor || matchReporter || matchReason || matchContent || matchMod || matchId;
    });
  }, [decisions, decisionFilter, searchQuery]);

  const formatDate = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('ru-RU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="w-full space-y-4 pb-16 font-sans">
      {/* 1. TOP CRM NAVIGATION BAR (Static, compact gap like in Support) */}
      <div className="bg-[#141416] border border-neutral-800 rounded-2xl px-3 py-1.5 text-xs select-none">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
          {/* Очередь жалоб */}
          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`px-2.5 py-1.5 rounded-xl font-medium text-xs transition whitespace-nowrap ${
              activeTab === 'reports'
                ? 'text-white bg-neutral-800 shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
            }`}
          >
            <span>Очередь жалоб</span>
            {reports.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-neutral-900 border border-neutral-700 text-neutral-300">
                {reports.length}
              </span>
            )}
          </button>

          {/* История решений (Хранилище) */}
          <button
            type="button"
            onClick={() => setActiveTab('decisions')}
            className={`px-2.5 py-1.5 rounded-xl font-medium text-xs transition whitespace-nowrap ${
              activeTab === 'decisions'
                ? 'text-white bg-neutral-800 shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
            }`}
          >
            <span>История решений</span>
            {decisions.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-neutral-900 border border-neutral-700 text-neutral-400">
                {decisions.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {feedbackMessage && (
        <div className="p-3 bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs rounded-xl flex items-center space-x-2">
          <Check className="w-4 h-4 text-neutral-400 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* 2. TAB: ОЧЕРЕДЬ ЖАЛОБ */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1 text-xs text-neutral-400">
            <span className="font-semibold text-white">
              Активные жалобы на рассмотрении ({reports.length})
            </span>
          </div>

          {reports.length === 0 ? (
            <div className="p-10 text-center rounded-2xl bg-[#141416] border border-neutral-800 space-y-2">
              <h3 className="text-sm font-semibold text-white">
                Нет активных жалоб
              </h3>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                Очередь модерации пуста. Все отправленные жалобы пользователей обработаны.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => {
                const post = report.post;
                if (!post) return null;
                const author = post.author;
                const currentSelectedReason = customReasons[report.id] || report.reason;

                return (
                  <div
                    key={report.id}
                    className="p-5 rounded-2xl bg-[#141416] border border-neutral-800 space-y-4 shadow-sm"
                  >
                    {/* Author and Reporter Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800/80">
                      <div className="flex items-center space-x-3">
                        <Avatar
                          name={author.name}
                          avatarUrl={author.avatar_url}
                          emoji={author.avatar_emoji}
                          hasEyes={false}
                          size="md"
                        />
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <button
                              type="button"
                              onClick={() => onNavigateToProfile(author.username)}
                              className="text-sm font-semibold text-white hover:underline transition"
                            >
                              {author.name}
                            </button>
                            {author.is_verified && (
                              <span className="text-sky-400 font-bold text-xs">✓</span>
                            )}
                          </div>
                          <span className="text-xs text-neutral-500 font-mono">
                            @{author.username} • Пост #{post.post_number}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-neutral-400 flex items-center space-x-2">
                        <span>
                          Жалоба от: <strong className="text-neutral-300">{report.reporter?.name || 'Пользователь'}</strong>
                        </span>
                        <span className="text-neutral-600">•</span>
                        <span className="text-neutral-500 text-[11px]">
                          {new Date(report.created_at).toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Content snippet */}
                    <div className="p-3.5 rounded-xl bg-[#18181b] border border-neutral-800 text-xs text-neutral-200 space-y-2">
                      <p className="whitespace-pre-wrap leading-relaxed">{post.content}</p>
                      {post.image_url && (() => {
                        const photoFp = post.image_kid && post.image_hash
                          ? { kid: post.image_kid, hash: post.image_hash }
                          : getImageFingerprint(post.image_url);
                        const hasNoSpamSkill = currentUser?.skills?.includes('no_spam') || false;
                        return (
                          <div className="space-y-1.5">
                            <div className="rounded-lg overflow-hidden border border-neutral-800 max-h-60 bg-black/40">
                              <img
                                src={post.image_url}
                                alt="Вложение"
                                className="w-full h-full object-contain"
                              />
                            </div>
                            {hasNoSpamSkill && (
                              <div className="flex flex-wrap items-center justify-between gap-1.5 px-2.5 py-1 bg-black/60 border border-neutral-800 rounded-lg text-[10px] font-mono text-neutral-400 select-all">
                                <span className="truncate">
                                  <span className="text-neutral-500">kid: </span>
                                  <span className="text-neutral-200">{photoFp.kid}</span>
                                </span>
                                <span className="truncate">
                                  <span className="text-neutral-500">hash: </span>
                                  <span className="text-neutral-200">{photoFp.hash}</span>
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      <div className="text-[11px] text-neutral-500 pt-1">
                        Просмотры: {post.views_count} • Лайки: {post.likes_count}
                      </div>
                    </div>

                    {/* Reason Dropdown */}
                    <div className="space-y-1.5">
                      <label
                        htmlFor={`reason-select-${report.id}`}
                        className="text-xs text-neutral-400 block"
                      >
                        Причина нарушения:
                      </label>
                      <select
                        id={`reason-select-${report.id}`}
                        value={currentSelectedReason}
                        onChange={(e) => handleReasonChange(report.id, e.target.value)}
                        className="w-full px-3 py-2 bg-[#18181b] border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-neutral-500"
                      >
                        {!MODERATION_REASONS.includes(report.reason) && (
                          <option value={report.reason}>Исходная: {report.reason}</option>
                        )}
                        {MODERATION_REASONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-end space-x-2.5 pt-1">
                      <button
                        type="button"
                        onClick={() => handleDismissReport(report.id)}
                        className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-xl text-xs font-medium border border-neutral-800 transition cursor-pointer"
                      >
                        Отклонить
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAcceptReport(report.id, author.name, author.username)}
                        className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-semibold border border-neutral-700 transition cursor-pointer"
                      >
                        Принять (Удалить + Блок)
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. TAB: ИСТОРИЯ ПРИНЯТЫХ РЕШЕНИЙ (Хранилище по аналогии со Статистикой в поддержке) */}
      {activeTab === 'decisions' && (
        <div className="space-y-5">
          {/* A. Метрики статистики модерации (по аналогии со Статистикой саппорта) */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[#141416] border border-neutral-800 space-y-4">
            <h2 className="font-bold text-white text-sm flex items-center space-x-2">
              <Archive className="w-4 h-4 text-neutral-400" />
              <span>Хранилище решений модерации ШУМ</span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 bg-[#18181b] border border-neutral-800 rounded-xl">
                <span className="text-[11px] text-neutral-500 block">Всего решений</span>
                <span className="text-xl font-bold text-white mt-1 block">
                  {decisions.length}
                </span>
              </div>
              <div className="p-4 bg-[#18181b] border border-neutral-800 rounded-xl">
                <span className="text-[11px] text-neutral-500 block">Принято (Бан + Удален)</span>
                <span className="text-xl font-bold text-rose-400 mt-1 block">
                  {acceptedCount}
                </span>
              </div>
              <div className="p-4 bg-[#18181b] border border-neutral-800 rounded-xl">
                <span className="text-[11px] text-neutral-500 block">Отклонено</span>
                <span className="text-xl font-bold text-neutral-300 mt-1 block">
                  {dismissedCount}
                </span>
              </div>
              <div className="p-4 bg-[#18181b] border border-neutral-800 rounded-xl">
                <span className="text-[11px] text-neutral-500 block">В очереди сейчас</span>
                <span className="text-xl font-bold text-white mt-1 block">
                  {reports.length}
                </span>
              </div>
            </div>
          </div>

          {/* B. Поиск и фильтры по хранилищу */}
          <div className="p-4 rounded-2xl bg-[#141416] border border-neutral-800 space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Поиск */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по нарушителю, заявителю, причине или тексту..."
                  className="w-full pl-9 pr-4 py-2 bg-[#18181b] border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white text-xs"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Фильтр: Все / Принятые / Отклоненные */}
              <div className="flex items-center gap-1 bg-[#18181b] border border-neutral-800 p-1 rounded-xl text-xs self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setDecisionFilter('all')}
                  className={`px-3 py-1 rounded-lg font-medium transition ${
                    decisionFilter === 'all'
                      ? 'bg-neutral-800 text-white'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Все ({decisions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDecisionFilter('accepted')}
                  className={`px-3 py-1 rounded-lg font-medium transition ${
                    decisionFilter === 'accepted'
                      ? 'bg-neutral-800 text-rose-300'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Принятые ({acceptedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setDecisionFilter('dismissed')}
                  className={`px-3 py-1 rounded-lg font-medium transition ${
                    decisionFilter === 'dismissed'
                      ? 'bg-neutral-800 text-neutral-200'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Отклоненные ({dismissedCount})
                </button>
              </div>
            </div>
          </div>

          {/* C. Список записей в хранилище */}
          {filteredDecisions.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-[#141416] border border-neutral-800 space-y-2">
              <p className="text-sm font-semibold text-neutral-300">
                Записи не найдены
              </p>
              <p className="text-xs text-neutral-500">
                {searchQuery
                  ? 'По вашему поисковому запросу ничего не найдено.'
                  : 'История принятых решений пуста.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDecisions.map((dec) => {
                const isAccepted = dec.action === 'accepted';

                return (
                  <div
                    key={dec.id}
                    className="p-4 sm:p-5 rounded-2xl bg-[#141416] border border-neutral-800 space-y-3 shadow-sm hover:border-neutral-700/80 transition-colors"
                  >
                    {/* Header: Решение и дата */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-neutral-800/80">
                      <div className="flex items-center space-x-2">
                        {isAccepted ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs font-semibold">
                            <Ban className="w-3.5 h-3.5 text-rose-400" />
                            <span>Принято: Публикация удалена • Автор заблокирован</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-700 text-neutral-300 text-xs font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5 text-neutral-400" />
                            <span>Отклонено: Жалоба отклонена (нарушений не выявлено)</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 text-[11px] text-neutral-500 font-mono">
                        <Clock className="w-3.5 h-3.5 text-neutral-500" />
                        <span>{formatDate(dec.created_at)}</span>
                      </div>
                    </div>

                    {/* Metadata: Нарушитель, Заявитель, Модератор, Причина */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs text-neutral-400 pt-1">
                      <div>
                        <span className="text-[11px] text-neutral-500 block">Нарушитель:</span>
                        <button
                          type="button"
                          onClick={() => onNavigateToProfile(dec.post_author_username)}
                          className="font-semibold text-white hover:underline transition truncate max-w-full text-left"
                        >
                          {dec.post_author_name} (@{dec.post_author_username})
                        </button>
                      </div>

                      <div>
                        <span className="text-[11px] text-neutral-500 block">Заявитель:</span>
                        <span className="text-neutral-300 truncate block">
                          {dec.reporter_name
                            ? `${dec.reporter_name} (@${dec.reporter_username || 'id'})`
                            : 'Пользователь платформы'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[11px] text-neutral-500 block">Причина:</span>
                        <span className="text-neutral-200 font-medium truncate block">
                          {dec.reason}
                        </span>
                      </div>

                      <div>
                        <span className="text-[11px] text-neutral-500 block">Модератор:</span>
                        <span className="text-neutral-400 font-mono truncate block">
                          @{dec.moderator_username} ({dec.moderator_name})
                        </span>
                      </div>
                    </div>

                    {/* Сохраненный фрагмент публикации (Хранилище) */}
                    {(dec.post_content || dec.post_image_url) && (
                      <div className="p-3 rounded-xl bg-[#18181b] border border-neutral-800/80 text-xs text-neutral-300 space-y-2 mt-2">
                        <div className="flex items-center justify-between text-[11px] text-neutral-500 border-b border-neutral-800/60 pb-1.5">
                          <span className="flex items-center space-x-1.5">
                            <FileText className="w-3 h-3 text-neutral-500" />
                            <span>Архивный сниппет публикации {dec.post_number ? `(#${dec.post_number})` : ''}</span>
                          </span>
                        </div>

                        {dec.post_content && (
                          <p className="whitespace-pre-wrap leading-relaxed text-neutral-300 font-mono text-[11px]">
                            {dec.post_content}
                          </p>
                        )}

                        {dec.post_image_url && (
                          <div className="pt-1">
                            <div className="rounded-lg overflow-hidden border border-neutral-800 max-h-40 max-w-xs bg-black/40">
                              <img
                                src={dec.post_image_url}
                                alt="Архивное вложение"
                                className="w-full h-full object-contain"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
