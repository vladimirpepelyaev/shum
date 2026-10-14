import React, { useState, useEffect } from 'react';
import {
  Database,
  X,
  Copy,
  Check,
  Table2,
  Code2,
  Shield,
  Zap,
  RefreshCw,
  Key,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { itdDb } from '../lib/storage';
import {
  getSupabaseSettings,
  savePublishableKey,
  testSupabaseConnection,
  DEFAULT_SUPABASE_URL,
} from '../lib/supabase';
import { showAppToast } from '../lib/toast';

interface SupabaseSchemaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseSchemaModal: React.FC<SupabaseSchemaModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'status' | 'entities' | 'sql' | 'guide'>('status');
  const [copied, setCopied] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    details?: string;
    hasTables?: boolean;
  } | null>(null);

  const [settings, setSettings] = useState(getSupabaseSettings());

  useEffect(() => {
    if (isOpen) {
      const current = getSupabaseSettings();
      setSettings(current);
      setKeyInput(current.anonKey);
      runAutoTest();
    }
  }, [isOpen]);

  const runAutoTest = async () => {
    const current = getSupabaseSettings();
    if (!current.isConfigured) {
      setTestResult({
        success: false,
        message: 'Требуется указать Publishable Key (Anon Key) для подключения к Supabase.',
      });
      return;
    }

    setIsTesting(true);
    const res = await testSupabaseConnection();
    setTestResult(res);
    setIsTesting(false);
  };

  if (!isOpen) return null;

  const sql = itdDb.getSupabaseSqlSchema();
  const stats = itdDb.getDbStats();

  const handleCopy = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    showAppToast('SQL скопирован', 'Скрипт создания таблиц скопирован в буфер обмена', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    savePublishableKey(keyInput);
    const updated = getSupabaseSettings();
    setSettings(updated);
    showAppToast('Ключ сохранён', 'Параметры подключения к Supabase обновлены', 'success');

    setIsTesting(true);
    const res = await testSupabaseConnection();
    setTestResult(res);
    setIsTesting(false);
  };

  const handleClearKey = () => {
    savePublishableKey('');
    setKeyInput('');
    const updated = getSupabaseSettings();
    setSettings(updated);
    setTestResult(null);
    showAppToast('Ключ удалён', 'Приложение вернулось в режим локального резерва', 'info');
  };

  const entities = [
    {
      name: 'profiles',
      title: '1. Профили и Авторизация',
      count: stats.users,
      desc: 'Пользователи социальной сети: логины, хэши паролей, имена, аватары/смайлики, даты регистрации и служебные скиллы сотрудников.',
      fields: [
        { name: 'id', type: 'UUID PRIMARY KEY', desc: 'Уникальный ID профиля' },
        { name: 'username', type: 'TEXT UNIQUE', desc: 'Короткий никнейм @ (pepelyaev)' },
        { name: 'name', type: 'TEXT', desc: 'Отображаемое имя (Владимир)' },
        { name: 'password_hash', type: 'TEXT', desc: 'Пароль учетной записи' },
        { name: 'avatar_url', type: 'TEXT', desc: 'URL загруженного фото аватара' },
        { name: 'avatar_emoji', type: 'TEXT', desc: 'Выбранный смайлик аватара (если фото не загружено)' },
        { name: 'bio', type: 'TEXT', desc: 'Описание профиля' },
        { name: 'skills', type: "TEXT[] DEFAULT '{}'", desc: 'Служебные скиллы: support, moderation, block_user, user_card, verification, delete_content, no_spam' },
        { name: 'is_verified', type: 'BOOLEAN DEFAULT FALSE', desc: 'Верифицированный профиль (галочка справа от имени)' },
        { name: 'is_blocked', type: 'BOOLEAN DEFAULT FALSE', desc: 'Блокировка доступа владельцу' },
        { name: 'blocked_reason', type: 'TEXT', desc: 'Причина блокировки модератором' },
        { name: 'created_at', type: 'TIMESTAMPTZ', desc: 'Дата и время регистрации' },
      ],
    },
    {
      name: 'follows',
      title: '2. Подписки (Follows)',
      count: stats.follows,
      desc: 'Логирование факта, участников и точной даты каждой подписки между пользователями.',
      fields: [
        { name: 'id', type: 'UUID PRIMARY KEY', desc: 'Уникальный ID подписки' },
        { name: 'follower_id', type: 'UUID REFERENCES profiles(id)', desc: 'Кто оформил подписку' },
        { name: 'following_id', type: 'UUID REFERENCES profiles(id)', desc: 'На кого подписались' },
        { name: 'created_at', type: 'TIMESTAMPTZ', desc: 'Точная дата и время оформления подписки' },
      ],
    },
    {
      name: 'posts',
      title: '3. Публикации (Posts)',
      count: stats.posts,
      desc: 'Посты пользователей с индивидуальным порядковым номером (post_1, post_2...) для маршрутизации по URL.',
      fields: [
        { name: 'id', type: 'UUID PRIMARY KEY', desc: 'Уникальный ID поста' },
        { name: 'user_id', type: 'UUID REFERENCES profiles(id)', desc: 'Автор публикации' },
        { name: 'post_number', type: 'INTEGER', desc: 'Порядковый номер у автора (post_{N})' },
        { name: 'content', type: 'TEXT', desc: 'Текст публикации' },
        { name: 'image_url', type: 'TEXT', desc: 'Прикреплённое изображение' },
        { name: 'is_pinned', type: 'BOOLEAN', desc: 'Флаг закреплённого поста' },
        { name: 'views_count', type: 'INTEGER', desc: 'Счётчик просмотров' },
        { name: 'created_at', type: 'TIMESTAMPTZ', desc: 'Точная дата и время публикации' },
      ],
    },
    {
      name: 'comments',
      title: '4. Комментарии (Comments)',
      count: stats.comments,
      desc: 'Логирование факта, автора, текста и точной даты публикации комментариев к постам.',
      fields: [
        { name: 'id', type: 'UUID PRIMARY KEY', desc: 'Уникальный ID комментария' },
        { name: 'post_id', type: 'UUID REFERENCES posts(id)', desc: 'ID комментируемого поста' },
        { name: 'user_id', type: 'UUID REFERENCES profiles(id)', desc: 'Автор комментария' },
        { name: 'content', type: 'TEXT', desc: 'Текст комментария' },
        { name: 'created_at', type: 'TIMESTAMPTZ', desc: 'Точная дата и время написания комментария' },
      ],
    },
    {
      name: 'likes',
      title: '5. Лайки (Likes)',
      count: stats.likes,
      desc: 'Логирование факта, автора, целевого поста и точной даты каждого поставленного лайка.',
      fields: [
        { name: 'id', type: 'UUID PRIMARY KEY', desc: 'Уникальный ID лайка' },
        { name: 'post_id', type: 'UUID REFERENCES posts(id)', desc: 'ID понравившегося поста' },
        { name: 'user_id', type: 'UUID REFERENCES profiles(id)', desc: 'Пользователь, поставивший лайк' },
        { name: 'created_at', type: 'TIMESTAMPTZ', desc: 'Точная дата и время проставления лайка' },
      ],
    },
    {
      name: 'notifications',
      title: '6. Центр Уведомлений (Notifications)',
      count: stats.notifications,
      desc: 'Логирование всех событий (лайк, коммент, подписка) с точной датой, инициатором и ссылкой для перехода.',
      fields: [
        { name: 'id', type: 'UUID PRIMARY KEY', desc: 'Уникальный ID уведомления' },
        { name: 'user_id', type: 'UUID REFERENCES profiles(id)', desc: 'Получатель уведомления' },
        { name: 'sender_id', type: 'UUID REFERENCES profiles(id)', desc: 'Инициатор (кто лайкнул/подписался)' },
        { name: 'type', type: 'TEXT', desc: 'Тип события: follow, like, comment, system' },
        { name: 'post_id', type: 'UUID', desc: 'ID связанного поста (для перехода)' },
        { name: 'post_number', type: 'INTEGER', desc: 'Номер поста у автора для URL post_{N}' },
        { name: 'post_author_username', type: 'TEXT', desc: 'Ник автора поста' },
        { name: 'text', type: 'TEXT', desc: 'Текст уведомления' },
        { name: 'is_read', type: 'BOOLEAN', desc: 'Статус прочтения' },
        { name: 'created_at', type: 'TIMESTAMPTZ', desc: 'Точная дата создания' },
      ],
    },
    {
      name: 'reports',
      title: '7. Жалобы и Модерация (Reports)',
      count: stats.reports,
      desc: 'Жалобы пользователей на контент для CRM модератора.',
      fields: [
        { name: 'id', type: 'UUID PRIMARY KEY', desc: 'ID жалобы' },
        { name: 'post_id', type: 'UUID REFERENCES posts(id)', desc: 'Пост с нарушением' },
        { name: 'reporter_id', type: 'UUID REFERENCES profiles(id)', desc: 'Кто пожаловался' },
        { name: 'reason', type: 'TEXT', desc: 'Выбранная причина' },
        { name: 'status', type: 'TEXT', desc: 'Статус (pending, accepted, rejected)' },
        { name: 'created_at', type: 'TIMESTAMPTZ', desc: 'Дата отправки' },
      ],
    },
    {
      name: 'support_tickets',
      title: '8. Тикеты Поддержки (Support Tickets)',
      count: stats.tickets,
      desc: 'Обращения пользователей в службу заботы.',
      fields: [
        { name: 'id', type: 'UUID PRIMARY KEY', desc: 'ID обращения' },
        { name: 'user_id', type: 'UUID REFERENCES profiles(id)', desc: 'Автор обращения' },
        { name: 'problem_title', type: 'TEXT', desc: 'Краткая суть проблемы' },
        { name: 'problem_description', type: 'TEXT', desc: 'Подробное описание' },
        { name: 'attachments', type: 'JSONB', desc: 'Прикреплённые файлы' },
        { name: 'status', type: 'TEXT', desc: 'Статус (open, in_progress, answered, resolved, unanswered)' },
        { name: 'has_unread_reply', type: 'BOOLEAN', desc: 'Флаг непрочитанного ответа' },
        { name: 'created_at', type: 'TIMESTAMPTZ', desc: 'Дата создания' },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <div className="bg-[#18181b] border border-neutral-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-[#141416]">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-2xl border ${
              settings.isConfigured
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}>
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-white text-base">
                  Интеграция Supabase
                </h3>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${
                  settings.isConfigured
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80'
                    : 'bg-amber-950/80 text-amber-300 border-amber-800/80'
                }`}>
                  {settings.isConfigured ? 'Ключ подключен' : 'Резервный режим (Local)'}
                </span>
              </div>
              <p className="text-xs text-neutral-400 font-mono mt-0.5">
                {DEFAULT_SUPABASE_URL}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center px-6 pt-3 border-b border-neutral-800/80 bg-[#141416] gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('status')}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold flex items-center space-x-2 transition relative whitespace-nowrap ${
              activeTab === 'status' ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Статус подключения</span>
            {activeTab === 'status' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('entities')}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold flex items-center space-x-2 transition relative whitespace-nowrap ${
              activeTab === 'entities' ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Table2 className="w-4 h-4" />
            <span>Таблицы и сущности ({entities.length})</span>
            {activeTab === 'entities' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sql')}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold flex items-center space-x-2 transition relative whitespace-nowrap ${
              activeTab === 'sql' ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>SQL Миграция (DDL + RLS)</span>
            {activeTab === 'sql' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold flex items-center space-x-2 transition relative whitespace-nowrap ${
              activeTab === 'guide' ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Инструкция по настройке</span>
            {activeTab === 'guide' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 bg-[#0f0f11]">
          {activeTab === 'status' && (
            <div className="space-y-6">
              {/* Project Info Card */}
              <div className="p-5 bg-[#18181b] border border-neutral-800 rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      Supabase Project URL
                    </span>
                    <div className="text-base font-mono font-bold text-white mt-0.5">
                      {settings.url}
                    </div>
                  </div>
                  <a
                    href="https://supabase.com/dashboard/project/ioxqhmnwegxdqxbfhwzg"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 font-semibold transition"
                  >
                    <span>Открыть Dashboard</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-neutral-400">Источник ключа:</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-300">
                      {settings.source === 'env'
                        ? 'Переменная окружения (VITE_SUPABASE_ANON_KEY)'
                        : settings.source === 'storage'
                        ? 'Сохранён в браузере (LocalStorage)'
                        : 'Не задан'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={runAutoTest}
                    disabled={isTesting}
                    className="inline-flex items-center space-x-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                    <span>Проверить связь</span>
                  </button>
                </div>
              </div>

              {/* Test Connection Banner */}
              {testResult && (
                <div
                  className={`p-4 rounded-2xl border flex items-start space-x-3.5 ${
                    testResult.success
                      ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                      : 'bg-amber-950/40 border-amber-800/60 text-amber-200'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1 text-xs">
                    <div className="font-semibold text-sm">
                      {testResult.message}
                    </div>
                    {testResult.details && (
                      <div className="font-mono text-[11px] opacity-80 break-all">
                        {testResult.details}
                      </div>
                    )}
                    {testResult.success && testResult.hasTables === false && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => setActiveTab('sql')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500 text-black font-semibold text-xs hover:bg-emerald-400 transition"
                        >
                          Перейти к SQL-миграции
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Publishable Key Form */}
              <div className="p-5 bg-[#18181b] border border-neutral-800 rounded-2xl space-y-4">
                <div className="flex items-center space-x-2">
                  <Key className="w-4 h-4 text-emerald-400" />
                  <h4 className="font-bold text-white text-sm">
                    Publishable Key (Anon Key)
                  </h4>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Публичный ключ безопасен для использования в клиентском браузере и защищается Row Level Security (RLS).
                  Вы можете добавить его в <code className="text-neutral-200 bg-neutral-900 px-1 py-0.5 rounded">.env</code> как <code className="text-neutral-200 bg-neutral-900 px-1 py-0.5 rounded">VITE_SUPABASE_ANON_KEY</code> или вставить прямо здесь:
                </p>

                <form onSubmit={handleSaveKey} className="space-y-3">
                  <input
                    type="password"
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full px-4 py-2.5 rounded-xl bg-[#121214] border border-neutral-800 text-white font-mono text-xs focus:outline-none focus:border-emerald-500/80 transition"
                  />

                  <div className="flex items-center space-x-3">
                    <button
                      type="submit"
                      disabled={!keyInput.trim() || isTesting}
                      className="px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition disabled:opacity-50"
                    >
                      {isTesting ? 'Проверка...' : 'Сохранить и подключить'}
                    </button>
                    {settings.anonKey && (
                      <button
                        type="button"
                        onClick={handleClearKey}
                        className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white font-medium text-xs border border-neutral-800 transition"
                      >
                        Очистить ключ
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'entities' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-[#18181b] border border-neutral-800 rounded-2xl">
                  <div className="text-[11px] text-neutral-400 font-medium">Пользователи</div>
                  <div className="text-xl font-bold text-white mt-0.5">{stats.users}</div>
                </div>
                <div className="p-3 bg-[#18181b] border border-neutral-800 rounded-2xl">
                  <div className="text-[11px] text-neutral-400 font-medium">Публикации</div>
                  <div className="text-xl font-bold text-white mt-0.5">{stats.posts}</div>
                </div>
                <div className="p-3 bg-[#18181b] border border-neutral-800 rounded-2xl">
                  <div className="text-[11px] text-neutral-400 font-medium">Лайки и подписки</div>
                  <div className="text-xl font-bold text-white mt-0.5">{stats.likes + stats.follows}</div>
                </div>
                <div className="p-3 bg-[#18181b] border border-neutral-800 rounded-2xl">
                  <div className="text-[11px] text-neutral-400 font-medium">Уведомления</div>
                  <div className="text-xl font-bold text-white mt-0.5">{stats.notifications}</div>
                </div>
              </div>

              {entities.map((entity) => (
                <div
                  key={entity.name}
                  className="bg-[#18181b] border border-neutral-800/90 rounded-2xl p-4 sm:p-5 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800/80 pb-3">
                    <div>
                      <h4 className="font-bold text-white text-sm sm:text-base flex items-center space-x-2">
                        <span>{entity.title}</span>
                        <code className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20 font-mono">
                          table: {entity.name}
                        </code>
                      </h4>
                      <p className="text-xs text-neutral-400 mt-1">
                        {entity.desc}
                      </p>
                    </div>
                    <span className="text-xs text-neutral-300 bg-neutral-800/90 px-3 py-1 rounded-xl self-start sm:self-auto font-mono">
                      Записей: {entity.count}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-neutral-500 border-b border-neutral-800/60">
                          <th className="pb-2 font-semibold">Поле</th>
                          <th className="pb-2 font-semibold">Тип данных PostgreSQL</th>
                          <th className="pb-2 font-semibold">Назначение / Логирование</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/40 font-mono">
                        {entity.fields.map((f) => (
                          <tr key={f.name} className="hover:bg-neutral-800/30">
                            <td className="py-2 text-white font-semibold pr-3">
                              {f.name}
                            </td>
                            <td className="py-2 text-emerald-400 pr-3">
                              {f.type}
                            </td>
                            <td className="py-2 text-neutral-300 font-sans text-xs">
                              {f.desc}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'sql' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-[#18181b] border border-neutral-800 rounded-2xl text-xs text-neutral-300">
                <div className="space-y-0.5">
                  <div className="font-semibold text-white">Готовая SQL-миграция PostgreSQL</div>
                  <div className="text-neutral-400">
                    Содержит таблицы, внешние ключи, каскадное удаление, индексы, RLS-политики и триггеры.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition shadow shrink-0 ml-3"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Скопировано!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Скопировать SQL</span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative font-mono text-xs text-neutral-300 bg-[#121214] p-4 rounded-2xl border border-neutral-800 max-h-[500px] overflow-y-auto">
                <pre className="whitespace-pre-wrap leading-relaxed">{sql}</pre>
              </div>
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-5 text-neutral-300 text-xs leading-relaxed">
              <div className="p-5 bg-[#18181b] border border-neutral-800 rounded-2xl space-y-4">
                <h4 className="font-bold text-white text-sm flex items-center space-x-2">
                  <span>Быстрый старт в 3 шага</span>
                </h4>

                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold shrink-0">
                      1
                    </span>
                    <div className="space-y-1">
                      <div className="font-semibold text-white">Скопируйте SQL-миграцию</div>
                      <p className="text-neutral-400">
                        Перейдите на вкладку «SQL Миграция» и нажмите «Скопировать SQL».
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold shrink-0">
                      2
                    </span>
                    <div className="space-y-1">
                      <div className="font-semibold text-white">Выполните SQL в Supabase Dashboard</div>
                      <p className="text-neutral-400">
                        Откройте <a href="https://supabase.com/dashboard/project/ioxqhmnwegxdqxbfhwzg/sql/new" target="_blank" rel="noreferrer" className="text-emerald-400 underline">SQL Editor</a> вашего проекта Supabase, вставьте скрипт и нажмите <strong>Run</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold shrink-0">
                      3
                    </span>
                    <div className="space-y-1">
                      <div className="font-semibold text-white">Скопируйте Anon Key</div>
                      <p className="text-neutral-400">
                        В Supabase перейдите в <strong>Project Settings → API</strong>, скопируйте <strong>anon / public</strong> ключ и вставьте его во вкладке «Статус подключения» либо в файл <code className="text-neutral-200 bg-neutral-900 px-1 py-0.5 rounded">.env</code>.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-neutral-800 bg-[#141416]">
          <span className="text-xs text-neutral-400 flex items-center space-x-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Совместимо с Supabase PostgreSQL, RLS и индексы включены</span>
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs transition"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
