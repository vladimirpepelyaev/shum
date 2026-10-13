import React, { useState } from 'react';
import { Database, X, Copy, Check, Table2, Code2, Layers, Clock, Shield } from 'lucide-react';
import { itdDb } from '../lib/storage';

interface SupabaseSchemaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseSchemaModal: React.FC<SupabaseSchemaModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'entities' | 'sql'>('entities');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const sql = itdDb.getSupabaseSqlSchema();
  const stats = itdDb.getDbStats();

  const handleCopy = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        { name: 'skills', type: 'TEXT[] DEFAULT \'{}\'', desc: 'Служебные скиллы: support, moderation, block_user, user_card, verification, no_spam, delete_content' },
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
        { name: 'type', type: 'TEXT', desc: 'Тип события: follow, like, comment' },
        { name: 'post_id', type: 'UUID', desc: 'ID связанного поста (для перехода)' },
        { name: 'post_number', type: 'INTEGER', desc: 'Номер поста у автора для URL post_{N}' },
        { name: 'post_author_username', type: 'TEXT', desc: 'Ник автора поста для URL /@{nick}/post_{N}' },
        { name: 'text', type: 'TEXT', desc: 'Текст уведомления' },
        { name: 'is_read', type: 'BOOLEAN', desc: 'Статус прочтения' },
        { name: 'created_at', type: 'TIMESTAMPTZ', desc: 'Точная дата и время создания уведомления' },
      ],
    },
    {
      name: 'reports',
      title: '7. Жалобы (Reports)',
      count: stats.reports,
      desc: 'Жалобы пользователей на публикации при нажатии трех точек (для модерации).',
      fields: [
        { name: 'id', type: 'UUID PRIMARY KEY', desc: 'Уникальный ID жалобы' },
        { name: 'post_id', type: 'UUID REFERENCES posts(id)', desc: 'Пост, на который пожаловались' },
        { name: 'reporter_id', type: 'UUID REFERENCES profiles(id)', desc: 'Кто пожаловался' },
        { name: 'reason', type: 'TEXT', desc: 'Причина жалобы' },
        { name: 'created_at', type: 'TIMESTAMPTZ', desc: 'Дата и время подачи жалобы' },
      ],
    },
    {
      name: 'support_tickets',
      title: '8. Тикеты Поддержки (Support Tickets)',
      count: stats.tickets,
      desc: 'Обращения пользователей в саппорт (Помощь / support): тема, подробное описание, фото/видео, статус и уведомления ответов.',
      fields: [
        { name: 'id', type: 'UUID PRIMARY KEY', desc: 'Уникальный ID тикета' },
        { name: 'user_id', type: 'UUID REFERENCES profiles(id)', desc: 'Автор обращения' },
        { name: 'problem_title', type: 'TEXT', desc: 'Опишите проблему' },
        { name: 'problem_description', type: 'TEXT', desc: 'Расскажите о проблеме подробнее' },
        { name: 'attachments', type: 'JSONB', desc: 'Прикреплённые фото и видео файлы' },
        { name: 'status', type: 'TEXT', desc: 'Статус (open, in_progress, answered, resolved)' },
        { name: 'has_unread_reply', type: 'BOOLEAN', desc: 'Индикатор непрочитанного ответа (+1)' },
        { name: 'created_at', type: 'TIMESTAMPTZ', desc: 'Дата создания обращения' },
        { name: 'updated_at', type: 'TIMESTAMPTZ', desc: 'Дата последнего обновления' },
      ],
    },
    {
      name: 'support_messages',
      title: '9. Сообщения Саппорта (Support Messages)',
      count: stats.tickets > 0 ? stats.tickets : 0,
      desc: 'Диалог внутри тикета поддержки между пользователем и Службой заботы ШУМ с историей, фиксацией сотрудника и файлами.',
      fields: [
        { name: 'id', type: 'UUID PRIMARY KEY', desc: 'Уникальный ID сообщения' },
        { name: 'ticket_id', type: 'UUID REFERENCES support_tickets(id)', desc: 'Связанный тикет' },
        { name: 'sender_role', type: 'TEXT', desc: 'Роль отправителя (user / support / system)' },
        { name: 'sender_name', type: 'TEXT', desc: 'Имя для клиента ("Поддержка")' },
        { name: 'operator_id', type: 'UUID REFERENCES profiles(id)', desc: 'ID ответившего сотрудника саппорта' },
        { name: 'operator_name', type: 'TEXT', desc: 'Имя сотрудника (Владимир)' },
        { name: 'operator_username', type: 'TEXT', desc: 'Короткий никнейм (@pepelyaev)' },
        { name: 'operator_display_name', type: 'TEXT', desc: 'Зафиксированный номер саппорта в CRM ("Саппорт #1")' },
        { name: 'text', type: 'TEXT', desc: 'Текст ответа саппорта или уточнения' },
        { name: 'attachments', type: 'JSONB', desc: 'Прикрепленные файлы' },
        { name: 'created_at', type: 'TIMESTAMPTZ', desc: 'Дата и время сообщения' },
      ],
    },
    {
      name: 'support_settings',
      title: '10. Настройки Поддержки (Support Settings)',
      count: 1,
      desc: 'Глобальные параметры службы заботы: единое фото ответов от лица саппорта и закрепленные отображаемые номера сотрудников (Саппорт #1, #2...).',
      fields: [
        { name: 'id', type: 'TEXT PRIMARY KEY', desc: 'Глобальный идентификатор' },
        { name: 'support_avatar_url', type: 'TEXT', desc: 'URL/DataURI единого фото саппорта' },
        { name: 'agent_display_names', type: 'JSONB', desc: 'Карта номеров сотрудников (userId -> Саппорт #1)' },
        { name: 'updated_at', type: 'TIMESTAMPTZ', desc: 'Дата последнего изменения' },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#18181b] border border-neutral-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-[#141416]">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                Структура Базы Данных (Supabase / PostgreSQL)
              </h3>
              <p className="text-xs text-neutral-400">
                Все сущности социальной сети ШУМ, логирование дат, фактов подписок, лайков, комментов и уведомлений
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center px-6 pt-3 border-b border-neutral-800/80 bg-[#141416] gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('entities')}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold flex items-center space-x-2 transition relative ${
              activeTab === 'entities' ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Table2 className="w-4 h-4" />
            <span>Сущности и логирование ({entities.length})</span>
            {activeTab === 'entities' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sql')}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold flex items-center space-x-2 transition relative ${
              activeTab === 'sql' ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>SQL DDL Скрипт</span>
            {activeTab === 'sql' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 bg-[#0f0f11]">
          {activeTab === 'entities' ? (
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
                        <code className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
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
          ) : (
            <div className="relative font-mono text-xs text-neutral-300 bg-[#121214] p-4 rounded-2xl border border-neutral-800">
              <pre className="whitespace-pre-wrap leading-relaxed">{sql}</pre>
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
            onClick={handleCopy}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition shadow"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span>SQL скопирован!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Скопировать SQL DDL</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
