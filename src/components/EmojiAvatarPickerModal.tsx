import React, { useState } from 'react';
import { Smile, X, Check } from 'lucide-react';

interface EmojiAvatarPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
  currentEmoji?: string | null;
}

const POPULAR_EMOJIS = [
  '😎', '😀', '🦊', '🐱', '🐶', '👾', '🚀', '🔥',
  '⚡', '💎', '🎨', '🎧', '🎮', '🍕', '☕', '🌟',
  '👻', '🦁', '🐻', '🐼', '🦄', '🌈', '🌙', '⚔️',
  '🔮', '🎸', '🎯', '🍀', '🍓', '🥑', '🍩', '🏆',
  '🤖', '👽', '💀', '👀', '🤙', '✌️', '✨', '🪐'
];

export const EmojiAvatarPickerModal: React.FC<EmojiAvatarPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectEmoji,
  currentEmoji,
}) => {
  const [customEmoji, setCustomEmoji] = useState('');

  if (!isOpen) return null;

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customEmoji.trim()) {
      onSelectEmoji(customEmoji.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#18181b] border border-neutral-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
          <div className="flex items-center space-x-2">
            <Smile className="w-5 h-5 text-neutral-300" />
            <h3 className="font-semibold text-white text-sm">Выбрать смайлик-аватар</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-neutral-400">
            Выберите готовый смайлик или введите любой свой:
          </p>

          {/* Grid of popular emojis */}
          <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 p-3 bg-[#121214] border border-neutral-800 rounded-2xl max-h-60 overflow-y-auto">
            {POPULAR_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onSelectEmoji(emoji);
                  onClose();
                }}
                className={`h-11 w-full text-2xl rounded-xl hover:bg-neutral-800 hover:scale-110 active:scale-95 transition flex items-center justify-center leading-none select-none [font-family:'Apple_Color_Emoji','Segoe_UI_Emoji','Noto_Color_Emoji',sans-serif] ${
                  currentEmoji === emoji ? 'bg-neutral-800 ring-2 ring-neutral-500' : ''
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Custom emoji input */}
          <form onSubmit={handleCustomSubmit} className="space-y-2">
            <span className="block text-xs text-neutral-400">
              Или вставьте любой другой эмодзи:
            </span>
            <div className="flex space-x-2">
              <input
                type="text"
                value={customEmoji}
                onChange={(e) => setCustomEmoji(e.target.value)}
                placeholder="например: 🛸"
                className="flex-1 bg-[#121214] border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
              />
              <button
                type="submit"
                disabled={!customEmoji.trim()}
                className="px-4 py-2 rounded-xl bg-white disabled:bg-neutral-800 disabled:text-neutral-500 text-black font-semibold text-xs hover:bg-neutral-200 transition"
              >
                Применить
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
