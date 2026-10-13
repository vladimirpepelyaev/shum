import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  HelpCircle,
  Plus,
  Trash2,
  Search,
  RefreshCw,
  X,
  Ban,
  Check,
  Image as ImageIcon,
  MessageSquare,
  FileText,
  Layers,
  ExternalLink,
  UserX,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { DbUser, DbNoSpamRule } from '../types/database';
import { itdDb } from '../lib/storage';

interface NoSpamAdminViewProps {
  currentUser: DbUser;
  onNavigateToProfile?: (username: string) => void;
  onBack?: () => void;
}

const AVAILABLE_SECTIONS = [
  { id: 'Все', label: 'Все разделы', icon: Layers },
  { id: 'Публикации', label: 'Публикации', icon: FileText },
  { id: 'Фотографии', label: 'Фотографии (kid / hash)', icon: ImageIcon },
  { id: 'Комментарии', label: 'Комментарии', icon: MessageSquare },
];

const USER_SANCTIONS = [
  { id: 'none', label: 'Без бана пользователя', desc: 'Только удаление найденного контента' },
  { id: 'ban_24h', label: 'Бан на 24 часа', desc: 'Временная блокировка нарушителя на сутки' },
  { id: 'ban_7d', label: 'Бан на 7 дней', desc: 'Блокировка нарушителя на одну неделю' },
  { id: 'ban_perm', label: 'Перманентный бан', desc: 'Полная бессрочная блокировка профиля' },
];

const CONTENT_ACTIONS = [
  { id: 'delete', label: 'Откат контента (удалить)', desc: 'Полное удаление из ленты и базы' },
  { id: 'hide', label: 'Скрыть до проверки', desc: 'Скрытие от пользователей до решения модератора' },
];

export const NoSpamAdminView: React.FC<NoSpamAdminViewProps> = ({
  currentUser,
  onNavigateToProfile,
  onBack,
}) => {
  const [rules, setRules] = useState<DbNoSpamRule[]>([]);
  const [showTutorialModal, setShowTutorialModal] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  // 1. Выбор раздела контента
  const [selectedSection, setSelectedSection] = useState<string>('Все');

  // 2. Содержание контента под автоправило
  const [contentQuery, setContentQuery] = useState<string>("kid = '7aaab3b4abca32634dc2be52a4d59152'");
  const [onlyLinks, setOnlyLinks] = useState<boolean>(false);

  // 3. Что делать с пользователями и контентом
  const [userSanction, setUserSanction] = useState<string>('none');
  const [contentAction, setContentAction] = useState<string>('delete');
  const [threshold, setThreshold] = useState<string>('1');
  const [reasonTag, setReasonTag] = useState<string>('Спам / Нарушение правил');

  // Результаты проверки совпадений
  const [testResults, setTestResults] = useState<Array<{
    id: string;
    type: 'post' | 'comment';
    content: string;
    image_url?: string | null;
    image_kid?: string | null;
    image_hash?: string | null;
    author_name: string;
    author_username: string;
    author_id: string;
    created_at: string;
    matched_reason: string;
  }>>([]);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [hasScanned, setHasScanned] = useState<boolean>(false);

  const loadRules = () => {
    const list = itdDb.getNoSpamRules();
    setRules(list);
  };

  useEffect(() => {
    loadRules();
  }, []);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Преобразование настроек в ban_action для хранилища
  const getComputedBanActionLabel = (): string => {
    if (userSanction === 'ban_perm') {
      return 'Перманентный бан + откат';
    }
    if (userSanction === 'ban_7d') {
      return 'Бан 7 дней + откат';
    }
    if (userSanction === 'ban_24h') {
      return 'Бан 24ч + откат';
    }
    return contentAction === 'hide' ? 'Скрытие контента' : 'Откат контента';
  };

  const handleTestRule = () => {
    if (!contentQuery.trim()) {
      showToast('Укажите содержание, фразу, kid или hash');
      return;
    }

    setIsScanning(true);
    setHasScanned(true);

    setTimeout(() => {
      const matches = itdDb.searchNoSpamMatches({
        substring: contentQuery.trim(),
        code_condition: contentQuery.trim(),
        only_links: onlyLinks,
        section: selectedSection,
      });
      setTestResults(matches);
      setIsScanning(false);
      showToast(`Найдено совпадений: ${matches.length}`);
    }, 120);
  };

  const handleSaveRule = () => {
    if (!contentQuery.trim()) {
      showToast('Укажите содержание, фразу, kid или hash');
      return;
    }

    itdDb.addNoSpamRule({
      section: selectedSection,
      substring: contentQuery.trim(),
      threshold: threshold.trim() || '1',
      code_condition: contentQuery.trim(),
      ban_action: getComputedBanActionLabel(),
      clean_frequency: 'Постоянно',
      search_depth: 'За всё время',
      only_uncaught: true,
      only_links: onlyLinks,
      is_active: true,
      author_name: currentUser.name || 'Сотрудник noSpam',
    });

    loadRules();
    showToast('Автоправило сохранено и активно');
  };

  const handleApplyNow = () => {
    if (!contentQuery.trim()) {
      showToast('Укажите содержание, фразу, kid или hash');
      return;
    }

    const res = itdDb.applyNoSpamRule(
      {
        section: selectedSection,
        substring: contentQuery.trim(),
        code_condition: contentQuery.trim(),
        threshold: threshold.trim() || '1',
        ban_action: getComputedBanActionLabel(),
        only_links: onlyLinks,
      },
      currentUser.name || 'Сотрудник noSpam'
    );

    loadRules();
    setTestResults([]);
    setHasScanned(false);
    showToast(`Применено: удалено контента — ${res.affectedCount}, заблокировано пользователей — ${res.blockedUsersCount}`);
  };

  const handleToggleRule = (id: string) => {
    itdDb.toggleNoSpamRule(id);
    loadRules();
    showToast('Статус правила изменен');
  };

  const handleDeleteRule = (id: string) => {
    itdDb.deleteNoSpamRule(id);
    loadRules();
    showToast('Правило удалено');
  };

  const handleQuickDelete = (postId: string) => {
    itdDb.forceDeletePost(postId);
    setTestResults((prev) => prev.filter((p) => p.id !== postId));
    showToast('Публикация удалена из базы');
  };

  const handleQuickBlockUser = (userId: string, reason: string) => {
    itdDb.setUserBlocked(userId, true, `Автобан: ${reason}`, 'nospam_crm', currentUser.name);
    showToast('Пользователь заблокирован');
  };

  return (
    <div className="space-y-6">
      {/* 1. Шапка раздела noSpam */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#141416] border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300">
            <ShieldAlert className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-white tracking-wide">noSpam</h2>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-neutral-900 text-neutral-300 border border-neutral-800">
                Автоправила
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Модерация контента и автосанкции: выбор разделов, слепки фотографий (kid / hash) и ключевые стоп-паттерны
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-3 py-1.5 rounded-xl text-xs text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 transition cursor-pointer"
            >
              Назад
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowTutorialModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-neutral-200 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:text-white transition cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-neutral-400" />
            <span>Инструкция</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className="p-3 bg-[#141416] border border-neutral-800 text-neutral-200 text-xs rounded-xl flex items-center space-x-2.5">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* 2. Конструктор автоправила */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#141416] border border-neutral-800 space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <h3 className="font-bold text-sm text-white">Создание автоправила</h3>
          <span className="text-xs text-neutral-500 font-mono">Фильтрация &amp; Санкции</span>
        </div>

        {/* ШАГ 1: Разделы контента */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-neutral-300">
            1. Выберите раздел контента
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {AVAILABLE_SECTIONS.map((sec) => {
              const Icon = sec.icon;
              const isSelected = selectedSection === sec.id;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setSelectedSection(sec.id)}
                  className={`flex items-center space-x-2 px-3 py-2.5 rounded-xl text-xs font-medium border transition cursor-pointer ${
                    isSelected
                      ? 'bg-neutral-800 text-white border-neutral-600 shadow-sm'
                      : 'bg-neutral-900/80 text-neutral-400 border-neutral-800 hover:border-neutral-700 hover:text-neutral-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-emerald-400' : 'text-neutral-500'}`} />
                  <span className="truncate">{sec.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ШАГ 2: Содержание, попадающее под автоправило */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-neutral-300">
              2. Содержание под автоправило
            </label>
            <span className="text-[11px] font-mono text-neutral-500">
              kid = '...' | hash = '...' | ключевая фраза | ссылка
            </span>
          </div>

          <textarea
            rows={2}
            value={contentQuery}
            onChange={(e) => setContentQuery(e.target.value)}
            placeholder="Впишите ключевую фразу, ссылку (например t.me/), kid или hash фотографии..."
            className="w-full px-3.5 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-emerald-400 font-mono placeholder-neutral-600 focus:outline-none focus:border-neutral-600 resize-none leading-relaxed"
          />

          {/* Быстрые подстановки */}
          <div className="flex items-center space-x-2 pt-0.5 flex-wrap gap-y-1.5">
            <span className="text-[11px] text-neutral-500">Быстрый шаблон:</span>
            <button
              type="button"
              onClick={() => setContentQuery("kid = '7aaab3b4abca32634dc2be52a4d59152'")}
              className="px-2 py-0.5 rounded-lg text-[10px] font-mono text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition cursor-pointer"
            >
              kid = '7aaab3b...'
            </button>
            <button
              type="button"
              onClick={() => setContentQuery("hash = '9f83ab24e18c50d1'")}
              className="px-2 py-0.5 rounded-lg text-[10px] font-mono text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition cursor-pointer"
            >
              hash = '9f83ab...'
            </button>
            <button
              type="button"
              onClick={() => setContentQuery("t.me/")}
              className="px-2 py-0.5 rounded-lg text-[10px] font-mono text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition cursor-pointer"
            >
              t.me/
            </button>
            <button
              type="button"
              onClick={() => setContentQuery("крипто-бот")}
              className="px-2 py-0.5 rounded-lg text-[10px] font-mono text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition cursor-pointer"
            >
              крипто-бот
            </button>
          </div>

          <div className="pt-1">
            <label className="flex items-center space-x-2 text-xs text-neutral-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyLinks}
                onChange={(e) => setOnlyLinks(e.target.checked)}
                className="rounded bg-neutral-900 border-neutral-700 text-emerald-500 focus:ring-0"
              />
              <span>Только внешние ссылки (URL)</span>
            </label>
          </div>
        </div>

        {/* ШАГ 3: Настройка санкций к пользователям и контенту */}
        <div className="space-y-3 pt-1 border-t border-neutral-800/80">
          <label className="block text-xs font-semibold text-neutral-300">
            3. Что делать с пользователями и контентом
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Санкции к пользователю */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-neutral-400">
                Действие к автору (пользователю)
              </label>
              <select
                value={userSanction}
                onChange={(e) => setUserSanction(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-neutral-600 cursor-pointer"
              >
                {USER_SANCTIONS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label} — {s.desc}
                  </option>
                ))}
              </select>
            </div>

            {/* Действие к найденному контенту */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-neutral-400">
                Действие с контентом
              </label>
              <select
                value={contentAction}
                onChange={(e) => setContentAction(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-neutral-600 cursor-pointer"
              >
                {CONTENT_ACTIONS.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Порог срабатываний */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-neutral-400">
                Порог нарушений для применения бана
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  className="w-24 px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-neutral-600 font-mono"
                />
                <span className="text-xs text-neutral-500">
                  {threshold === '1' ? 'сразу при первом нарушении' : `после ${threshold} нарушений`}
                </span>
              </div>
            </div>

            {/* Причина для журнала */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-neutral-400">
                Причина автобана (в профиль и журнал)
              </label>
              <input
                type="text"
                value={reasonTag}
                onChange={(e) => setReasonTag(e.target.value)}
                placeholder="Спам-рассылка, запрещенное фото..."
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-neutral-600"
              />
            </div>
          </div>
        </div>

        {/* Кнопки действий */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-neutral-800">
          <button
            type="button"
            onClick={handleTestRule}
            disabled={isScanning}
            className="flex items-center justify-center space-x-2 px-4 py-2 rounded-xl text-xs font-medium text-neutral-200 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:text-white transition cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 text-neutral-400" />
            <span>{isScanning ? 'Поиск совпадений...' : 'Проверить совпадения в базе'}</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleSaveRule}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Сохранить автоправило</span>
            </button>

            <button
              type="button"
              onClick={handleApplyNow}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-rose-300 bg-rose-950/40 hover:bg-rose-950/70 border border-rose-900/60 transition cursor-pointer"
            >
              <Ban className="w-3.5 h-3.5 text-rose-400" />
              <span>Применить и зачистить</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Результаты проверки совпадений в базе */}
      {hasScanned && (
        <div className="p-5 sm:p-6 rounded-2xl bg-[#141416] border border-neutral-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm text-white">
                Совпадения в базе данных ({testResults.length})
              </span>
              <span className="text-[11px] text-neutral-500">
                по текущему фильтру
              </span>
            </div>
            <button
              type="button"
              onClick={() => setHasScanned(false)}
              className="text-xs text-neutral-500 hover:text-neutral-300 transition cursor-pointer"
            >
              Закрыть
            </button>
          </div>

          {testResults.length === 0 ? (
            <div className="py-6 text-center text-neutral-500 text-xs">
              Совпадений в базе не обнаружено. Контент чист.
            </div>
          ) : (
            <div className="space-y-3">
              {testResults.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-white">{item.author_name}</span>
                      <span className="text-neutral-500 font-mono">@{item.author_username}</span>
                      <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-[10px] text-neutral-400">
                        {item.type === 'post' ? 'Публикация' : 'Комментарий'}
                      </span>
                    </div>

                    <p className="text-neutral-300 line-clamp-2 leading-relaxed">
                      {item.content}
                    </p>

                    {/* Превью фото с kid и hash */}
                    {item.image_url && (
                      <div className="pt-1 space-y-1.5 max-w-sm">
                        <div className="rounded-lg overflow-hidden border border-neutral-800 max-h-36 bg-black/40">
                          <img
                            src={item.image_url}
                            alt="Медиафайл"
                            className="w-full h-auto max-h-36 object-contain"
                          />
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1 bg-black/60 border border-neutral-800 rounded-lg text-[10px] font-mono text-neutral-400">
                          <span>
                            <span className="text-neutral-500">kid: </span>
                            <span className="text-neutral-200">{item.image_kid}</span>
                          </span>
                          <span>
                            <span className="text-neutral-500">hash: </span>
                            <span className="text-neutral-200">{item.image_hash}</span>
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="text-[11px] font-mono text-emerald-400 pt-0.5">
                      {item.matched_reason}
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end gap-1.5 shrink-0 pt-2 sm:pt-0">
                    <button
                      type="button"
                      onClick={() => handleQuickDelete(item.id)}
                      className="px-2.5 py-1 rounded-lg text-[11px] text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 transition cursor-pointer"
                    >
                      Удалить
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickBlockUser(item.author_id, item.matched_reason)}
                      className="px-2.5 py-1 rounded-lg text-[11px] text-rose-400 hover:text-rose-300 bg-rose-950/30 hover:bg-rose-950/60 border border-rose-900/50 transition cursor-pointer"
                    >
                      Заблокировать автора
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. Список действующих правил */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#141416] border border-neutral-800 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
          <div className="flex items-center space-x-2">
            <h3 className="font-bold text-sm text-white">
              Действующие автоправила ({rules.length})
            </h3>
          </div>
          <button
            type="button"
            onClick={loadRules}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition cursor-pointer"
            title="Обновить"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {rules.length === 0 ? (
          <div className="py-8 text-center text-neutral-500 text-xs">
            Нет активных правил. Настройте разделы и содержание выше, затем нажмите «Сохранить автоправило».
          </div>
        ) : (
          <div className="space-y-2.5">
            {rules.map((r) => (
              <div
                key={r.id}
                className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition hover:border-neutral-700"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-[11px] font-medium text-neutral-300">
                      {r.section}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-neutral-800 text-neutral-400 border border-neutral-700">
                      {r.ban_action}
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      Порог: {r.threshold || '1'}
                    </span>
                  </div>

                  <div className="font-mono text-[11px] text-neutral-200 truncate pt-0.5">
                    {r.code_condition || r.substring}
                  </div>

                  <div className="text-[10px] text-neutral-500 flex items-center space-x-2 pt-0.5">
                    <span>Автор: {r.author_name}</span>
                    <span>•</span>
                    <span>{new Date(r.created_at).toLocaleDateString('ru-RU')}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleRule(r.id)}
                    className={`px-3 py-1 rounded-xl text-xs font-medium transition cursor-pointer ${
                      r.is_active
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-neutral-800 text-neutral-500 border border-neutral-700'
                    }`}
                  >
                    {r.is_active ? 'Активно' : 'Отключено'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteRule(r.id)}
                    className="p-1.5 text-neutral-500 hover:text-rose-400 rounded-lg hover:bg-neutral-800 transition cursor-pointer"
                    title="Удалить правило"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Инструкция для сотрудника */}
      {showTutorialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#141416] border border-neutral-800 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-[#141416]">
              <div className="flex items-center space-x-2.5">
                <HelpCircle className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-white text-sm">
                  Инструкция по работе с noSpam
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTutorialModal(false)}
                className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs text-neutral-300 leading-relaxed">
              <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1.5">
                <div className="font-semibold text-white">1. Разделы контента</div>
                <p className="text-neutral-400">
                  Выберите, где правило должно искать совпадения: во всех разделах, только в публикациях, в фотографиях или в комментариях.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1.5">
                <div className="font-semibold text-white">2. Слепки фото (kid и hash)</div>
                <p className="text-neutral-400">
                  Каждая загруженная в сервис фотография имеет <code className="text-neutral-200 font-mono">kid</code> (идентификатор сеанса) и <code className="text-neutral-200 font-mono">hash</code> (перцептивный хэш изображения). При наличии скилла <b>noSpam</b> эти параметры отображаются прямо под фото в ленте, посте и CRM с кнопкой копирования в один клик.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1.5">
                <div className="font-semibold text-white">3. Содержание правила</div>
                <p className="text-neutral-400">
                  В поле содержания можно указать:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-neutral-300 font-mono text-[11px]">
                  <li><code>kid = '7aaab3b4abca32634dc2be52a4d59152'</code></li>
                  <li><code>hash = '9f83ab24e18c50d1'</code></li>
                  <li>Фразу или стоп-слово: <code>t.me/</code>, спам-ссылка</li>
                </ul>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1.5">
                <div className="font-semibold text-white">4. Настройка действий с пользователями</div>
                <p className="text-neutral-400">
                  Сотрудник определяет последствия для автора: удаление без блокировки, бан на 24 часа, 7 дней или перманентная блокировка профиля. Также задается порог количества нарушений.
                </p>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-neutral-800 bg-[#141416] flex justify-end">
              <button
                type="button"
                onClick={() => setShowTutorialModal(false)}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-neutral-800 hover:bg-neutral-700 transition cursor-pointer"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
