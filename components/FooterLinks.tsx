import React from 'react';
import { LegalDocType } from './LegalModal';

interface FooterLinksProps {
  onNavigateToSupport: () => void;
  onOpenLegal: (type: LegalDocType) => void;
  hasUnreadSupport?: boolean;
}

export const FooterLinks: React.FC<FooterLinksProps> = ({
  onNavigateToSupport,
  onOpenLegal,
  hasUnreadSupport = false,
}) => {
  return (
    <footer className="select-none text-xs text-neutral-500 space-y-2 pt-6">
      <div>
        <button
          type="button"
          onClick={onNavigateToSupport}
          className="text-neutral-400 hover:text-white transition flex items-center space-x-1.5"
        >
          <span>Помощь</span>
          {hasUnreadSupport && (
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 inline-block" />
          )}
        </button>
      </div>

      <div>
        <button
          type="button"
          onClick={() => onOpenLegal('terms')}
          className="hover:text-neutral-300 transition text-left"
        >
          Условия использования
        </button>
      </div>

      <div>
        <button
          type="button"
          onClick={() => onOpenLegal('license')}
          className="hover:text-neutral-300 transition text-left"
        >
          Лицензионное соглашение
        </button>
      </div>

      <div>
        <button
          type="button"
          onClick={() => onOpenLegal('cookie')}
          className="hover:text-neutral-300 transition text-left"
        >
          Политика Cookie
        </button>
      </div>

      <div className="pt-3 text-[11px] text-neutral-600">
        ООО «Шум» 2026
      </div>
    </footer>
  );
};

