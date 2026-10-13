import React from 'react';
import { X, ShieldCheck, FileText, Cookie } from 'lucide-react';

export type LegalDocType = 'terms' | 'license' | 'cookie' | null;

interface LegalModalProps {
  type: LegalDocType;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({ type, onClose }) => {
  if (!type) return null;

  const docConfig = {
    terms: {
      title: 'Условия использования сервиса ШУМ',
      subtitle: 'Действует с 1 января 2026 года • ООО «Шум»',
      icon: <FileText className="w-5 h-5 text-neutral-300" />,
      content: (
        <div className="space-y-4 text-sm text-neutral-300 leading-relaxed">
          <section>
            <h4 className="font-semibold text-white mb-1.5">1. Общие положения</h4>
            <p>
              Настоящие Условия определяют порядок использования платформы «ШУМ» (название.com / shum.com),
              разрабатываемой и поддерживаемой ООО «Шум» (ОГРН 1267700123456, 2026 год). Регистрация
              в сервисе подтверждает безоговорочное согласие пользователя с настоящими условиями.
            </p>
          </section>
          <section>
            <h4 className="font-semibold text-white mb-1.5">2. Аккаунт и аутентификация</h4>
            <p>
              Пользователь несет полную ответственность за безопасность своего логина и пароля. Запрещается
              передавать данные учетной записи третьим лицам или использовать сервис для автоматизированного
              парсинга и рассылки спама.
            </p>
          </section>
          <section>
            <h4 className="font-semibold text-white mb-1.5">3. Публикация контента</h4>
            <p>
              В сети «ШУМ» запрещена публикация материалов, нарушающих законодательство РФ, пропагандирующих
              насилие, оскорбления или нарушающих авторские права. Все публикации индексируются с уникальным
              порядковым номером автора (/@author/post_N).
            </p>
          </section>
          <section>
            <h4 className="font-semibold text-white mb-1.5">4. Модерация и жалобы</h4>
            <p>
              Администрация сервиса оставляет за собой право блокировать контент и ограничивать доступ
              аккаунтам на основании поступивших жалоб (Reports) или решений Службы заботы ШУМ.
            </p>
          </section>
        </div>
      ),
    },
    license: {
      title: 'Лицензионное соглашение',
      subtitle: 'Пользовательская лицензия на программное обеспечение ШУМ • ООО «Шум» 2026',
      icon: <ShieldCheck className="w-5 h-5 text-neutral-300" />,
      content: (
        <div className="space-y-4 text-sm text-neutral-300 leading-relaxed">
          <section>
            <h4 className="font-semibold text-white mb-1.5">1. Предмет соглашения</h4>
            <p>
              ООО «Шум» предоставляет пользователю неисключительную, безвозмездную лицензию на использование
              веб-платформы и клиентских интерфейсов социальной сети «ШУМ» в личных некоммерческих целях.
            </p>
          </section>
          <section>
            <h4 className="font-semibold text-white mb-1.5">2. Интеллектуальная собственность</h4>
            <p>
              Все графические элементы интерфейса, архитектурный стек, база данных и исходный код платформы
              являются собственностью правообладателя ООО «Шум». Пользователь сохраняет авторские права
              на размещаемый им текстовый и медиа-контент.
            </p>
          </section>
          <section>
            <h4 className="font-semibold text-white mb-1.5">3. Ограничения</h4>
            <p>
              Запрещается декомпилировать, модифицировать серверную логику или воспроизводить структуру
              сервиса без официального письменного согласия правообладателя ООО «Шум».
            </p>
          </section>
          <section>
            <h4 className="font-semibold text-white mb-1.5">4. Срок действия</h4>
            <p>
              Настоящее лицензионное соглашение действует с момента первого входа пользователя и сохраняет
              силу на протяжении всего периода использования сервиса «ШУМ».
            </p>
          </section>
        </div>
      ),
    },
    cookie: {
      title: 'Политика использования файлов Cookie',
      subtitle: 'Правила хранения сессий и локальных данных • ООО «Шум» 2026',
      icon: <Cookie className="w-5 h-5 text-neutral-300" />,
      content: (
        <div className="space-y-4 text-sm text-neutral-300 leading-relaxed">
          <section>
            <h4 className="font-semibold text-white mb-1.5">1. Назначение Cookie</h4>
            <p>
              Сервис «ШУМ» использует локальные файлы cookie и веб-хранилище (LocalStorage) исключительно для
              поддержания авторизованной сессии пользователя, сохранения темы оформления и фиксации состояния
              прочитанных уведомлений.
            </p>
          </section>
          <section>
            <h4 className="font-semibold text-white mb-1.5">2. Безопасность данных</h4>
            <p>
              Мы не передаем cookie третьим лицам и не используем сторонние рекламные трекеры. Вся информация
              хранится в защищенном виде и удаляется при нажатии кнопки «Выйти».
            </p>
          </section>
          <section>
            <h4 className="font-semibold text-white mb-1.5">3. Управление Cookie</h4>
            <p>
              Пользователь может в любой момент очистить хранилище браузера в настройках конфиденциальности
              своего устройства.
            </p>
          </section>
        </div>
      ),
    },
  }[type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#18181b] border border-neutral-800 rounded-3xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-[#141416]">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-neutral-800 border border-neutral-700/60">
              {docConfig.icon}
            </div>
            <div>
              <h3 className="font-bold text-white text-base">{docConfig.title}</h3>
              <p className="text-xs text-neutral-400">{docConfig.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">{docConfig.content}</div>

        <div className="px-6 py-3 border-t border-neutral-800 bg-[#141416] flex justify-between items-center text-xs text-neutral-500">
          <span>ООО «Шум» 2026</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white font-medium rounded-xl transition"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
