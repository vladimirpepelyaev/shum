import React, { useState } from 'react';
import {
  Sliders,
  X,
  LifeBuoy,
  ShieldAlert,
  Ban,
  CreditCard,
  CheckCircle2,
  Database,
  Check,
  Copy,
  Users,
  Trash2
} from 'lucide-react';
import { DbUser, StaffSkill } from '../types/database';
import { itdDb, ALL_STAFF_SKILLS } from '../lib/storage';

interface SkillsManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: DbUser;
  onUserUpdated: () => void;
}

const SKILL_CONFIG: Record<
  StaffSkill,
  { label: string; desc: string; icon: React.ReactNode; color: string }
> = {
  support: {
    label: '1. Поддержка (CRM)',
    desc: 'Вкладка «Поддержка» в левом меню со Спасательным кругом. Доступ ко всем тикетам и ответы от имени «Специалист поддержки ШУМ».',
    icon: <LifeBuoy className="w-4 h-4 text-emerald-400" />,
    color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  },
  moderation: {
    label: '2. Модерация (CRM)',
    desc: 'Вкладка «Модерация» в левом меню со Щитом. Лента жалоб с выпадающим списком причин, кнопки «Принять» (удаление + бан) и «Отклонить».',
    icon: <ShieldAlert className="w-4 h-4 text-amber-400" />,
    color: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  },
  block_user: {
    label: '3. Блокировка профиля',
    desc: 'Добавляет сотруднику кнопку «Заблокировать» в меню трёх точек профиля для ограничения доступа владельцу.',
    icon: <Ban className="w-4 h-4 text-red-400" />,
    color: 'border-red-500/30 bg-red-500/10 text-red-400',
  },
  user_card: {
    label: '4. Карточка пользователя',
    desc: 'Добавляет кнопку «Карточка». Открывает экран с досье об аккаунте по ссылке вида название.com/{@короткий ник}#info.',
    icon: <CreditCard className="w-4 h-4 text-blue-400" />,
    color: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
  },
  verification: {
    label: '5. Верификация пользователя',
    desc: 'Добавляет сотруднику в меню трёх точек кнопку «Верифицировать». Устанавливает синюю галочку справа от имени.',
    icon: <CheckCircle2 className="w-4 h-4 text-sky-400" />,
    color: 'border-sky-500/30 bg-sky-500/10 text-sky-400',
  },
  no_spam: {
    label: '6. noSpam (Автобаны)',
    desc: 'CRM автобанов по шаблонам-слепкам. Отображает kid и hash под фотографиями для формирования слепков.',
    icon: <ShieldAlert className="w-4 h-4 text-emerald-400" />,
    color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  },
  support_management: {
    label: '7. Поддержка. Управление',
    desc: 'Вкладка «Управление» в CRM поддержки: единое фото ответа от лица саппорта и настройка отображаемых номеров сотрудников (Саппорт #1, #2...).',
    icon: <LifeBuoy className="w-4 h-4 text-cyan-400" />,
    color: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400',
  },
  delete_content: {
    label: '8. Удаление контента',
    desc: 'Добавляет сотруднику в меню трёх точек кнопку «Удалить публикацию», даже если это не его пост. Действие фактически удаляет публикацию из ленты и стены.',
    icon: <Trash2 className="w-4 h-4 text-rose-400" />,
    color: 'border-rose-500/30 bg-rose-500/10 text-rose-400',
  },
};

export const SkillsManageModal: React.FC<SkillsManageModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserUpdated,
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUser.id);
  const [copiedSql, setCopiedSql] = useState(false);
  const allUsers = itdDb.getAllUsers();

  if (!isOpen) return null;

  const targetUser = itdDb.getUserById(selectedUserId) || currentUser;
  const userSkills = targetUser.skills || [];

  const handleToggle = (skill: StaffSkill) => {
    itdDb.toggleUserSkill(targetUser.id, skill);
    onUserUpdated();
  };

  const handleGrantAll = () => {
    itdDb.setUserSkills(targetUser.id, [...ALL_STAFF_SKILLS]);
    onUserUpdated();
  };

  const handleRevokeAll = () => {
    itdDb.setUserSkills(targetUser.id, []);
    onUserUpdated();
  };

  const sqlSample = `-- Выдача скилла на аккаунт пользователя через базу данных (Supabase SQL):
UPDATE public.profiles
SET skills = ARRAY['support', 'moderation', 'block_user', 'user_card', 'verification', 'no_spam', 'support_management']
WHERE username = '${targetUser.username}';`;

  const copySql = () => {
    navigator.clipboard.writeText(sqlSample);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#18181b] border border-neutral-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-[#141416]">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                Скиллы сотрудников (RBAC)
              </h3>
              <p className="text-xs text-neutral-400">
                Гибкое управление служебными доступами для сотрудников ШУМ
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Target user selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-black/40 border border-neutral-800">
            <div className="flex items-center space-x-2 text-xs text-neutral-300">
              <Users className="w-4 h-4 text-neutral-400" />
              <span>Аккаунт для настройки:</span>
            </div>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="px-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-neutral-500"
            >
              {allUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} (@{u.username}) {u.id === currentUser.id ? '— Вы' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Quick bulk actions */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Список служебных скиллов:
            </span>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={handleGrantAll}
                className="px-2.5 py-1 text-[11px] bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition"
              >
                Выдать все 6
              </button>
              <button
                type="button"
                onClick={handleRevokeAll}
                className="px-2.5 py-1 text-[11px] bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-lg transition"
              >
                Снять все
              </button>
            </div>
          </div>

          {/* Skills checklist */}
          <div className="space-y-3">
            {ALL_STAFF_SKILLS.map((skillKey) => {
              const cfg = SKILL_CONFIG[skillKey];
              const isEnabled = userSkills.includes(skillKey);

              return (
                <div
                  key={skillKey}
                  onClick={() => handleToggle(skillKey)}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-start justify-between gap-4 group ${
                    isEnabled
                      ? 'bg-neutral-900/90 border-emerald-500/40 shadow-sm'
                      : 'bg-black/30 border-neutral-800/80 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-start space-x-3 min-w-0">
                    <div className="p-2 rounded-xl bg-neutral-800/80 border border-neutral-700/60 shrink-0 mt-0.5">
                      {cfg.icon}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition">
                        {cfg.label}
                      </h4>
                      <p className="text-[11px] text-neutral-400 leading-relaxed mt-0.5">
                        {cfg.desc}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 mt-1">
                    <span
                      className={`px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider transition ${
                        isEnabled
                          ? 'bg-emerald-500 text-black shadow'
                          : 'bg-neutral-800 text-neutral-500'
                      }`}
                    >
                      {isEnabled ? 'Активен' : 'Отключен'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Database SQL code hint */}
          <div className="p-4 rounded-2xl bg-black/60 border border-neutral-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span className="flex items-center space-x-1.5 font-medium">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span>Выдача через базу данных (Supabase SQL):</span>
              </span>
              <button
                type="button"
                onClick={copySql}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
              >
                {copiedSql ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedSql ? 'Скопировано!' : 'Копировать SQL'}</span>
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-[#0d0d0f] border border-neutral-800 text-[11px] font-mono text-neutral-300 overflow-x-auto whitespace-pre-wrap">
              {sqlSample}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-neutral-800 bg-[#141416] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-white hover:bg-neutral-200 text-black font-semibold rounded-xl text-xs transition shadow"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
};
