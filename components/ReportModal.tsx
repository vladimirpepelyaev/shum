import React, { useState } from 'react';
import { Flag, X, AlertTriangle, Check } from 'lucide-react';
import { itdDb } from '../lib/storage';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  reporterId: string;
  onSuccess: () => void;
}

const REPORT_REASONS = [
  'Спам или нежелательная реклама',
  'Оскорбления или травля',
  'Запрещённый контент',
  'Дезинформация или обман',
  'Нарушение авторских прав',
  'Другое',
];

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  postId,
  reporterId,
  onSuccess,
}) => {
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason =
      selectedReason === 'Другое' && customReason.trim()
        ? `Другое: ${customReason.trim()}`
        : selectedReason;

    itdDb.createReport({
      postId,
      reporterId,
      reason: finalReason,
    });

    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      onSuccess();
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#18181b] border border-neutral-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
          <div className="flex items-center space-x-2 text-rose-400">
            <Flag className="w-5 h-5" />
            <h3 className="font-semibold text-white text-base">Пожаловаться на пост</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSubmitted ? (
          <div className="p-8 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Check className="w-6 h-6" />
            </div>
            <h4 className="font-semibold text-white">Жалоба отправлена</h4>
            <p className="text-xs text-neutral-400">
              Спасибо за сигнал. Запись сохранена в таблице reports для модерации.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <p className="text-xs text-neutral-400">
              Укажите причину, по которой этот пост нарушает правила сообщества:
            </p>

            <div className="space-y-2">
              {REPORT_REASONS.map((reason) => (
                <label
                  key={reason}
                  className={`flex items-center space-x-3 p-3 rounded-xl border cursor-pointer transition text-sm ${
                    selectedReason === reason
                      ? 'border-neutral-500 bg-neutral-800 text-white'
                      : 'border-neutral-800/80 bg-neutral-900/40 text-neutral-300 hover:border-neutral-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    checked={selectedReason === reason}
                    onChange={() => setSelectedReason(reason)}
                    className="accent-white"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>

            {selectedReason === 'Другое' && (
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Опишите подробнее..."
                rows={2}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-neutral-400 resize-none"
              />
            )}

            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-sm transition shadow-lg shadow-rose-900/20"
              >
                Отправить жалобу
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
