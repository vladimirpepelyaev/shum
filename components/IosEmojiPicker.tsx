import React, { useState, useMemo, useRef } from 'react';
import {
  Search,
  Delete,
  X,
  Clock,
  Smile,
  User,
  Trees,
  Utensils,
  Trophy,
  Plane,
  Lightbulb,
  Flag,
  Check,
} from 'lucide-react';

export interface IosEmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onDeleteChar?: () => void;
  onClose?: () => void;
}

interface EmojiCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  emojis: string[];
}

const CATEGORIES: EmojiCategory[] = [
  {
    id: 'frequent',
    name: 'Часто используемые',
    icon: <Clock className="w-4 h-4" />,
    emojis: [
      '😂', '❤️', '🔥', '👍', '🥺', '😍', '😭', '🤣', '✨', '💀', '👏', '🙏', '😊', '🥳', '🤔', '💯',
      '💔', '🤤', '😴', '👀', '🤙', '🙌', '🎉', '⚡', '😎', '👌', '🤝', '😉', '🤯', '🥰', '😏', '🫡'
    ],
  },
  {
    id: 'smileys',
    name: 'Смайлы и эмоции',
    icon: <Smile className="w-4 h-4" />,
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩',
      '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨',
      '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕',
      '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐', '😕', '😟',
      '🙁', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣',
      '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹',
      '👺', '👻', '👽', '👾', '🤖'
    ],
  },
  {
    id: 'people',
    name: 'Люди и жесты',
    icon: <User className="w-4 h-4" />,
    emojis: [
      '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉',
      '👆', '🖕', '👇', '☝️', '🫵', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝',
      '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷',
      '🦴', '👀', '👁️', '👅', '👄', '🫦', '👤', '👥', '🫂', '👶', '👧', '🧒', '👦', '👩', '🧑', '👨',
      '👩‍🦱', '🧑‍🦱', '👨‍🦱', '👩‍🦰', '🧑‍🦰', '👨‍🦰', '👱‍♀️', '👱', '👱‍♂️', '👩‍🦳', '🧑‍🦳', '👨‍🦳', '👩‍🦲', '🧑‍🦲', '👨‍🦲'
    ],
  },
  {
    id: 'nature',
    name: 'Животные и природа',
    icon: <Trees className="w-4 h-4" />,
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸',
      '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺',
      '🐗', '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞', '🐜', '🪰', '🪲', '🪳', '🦟', '🦗', '🕷️',
      '🕸️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬',
      '🐳', '🐋', '🦈', '🐊', '🐆', '🐅', '🐃', '🐂', '🐄', '🦌', '🐪', '🐫', '🦙', '🦒', '🐘', '🦣',
      '🌲', '🌳', '🌴', '🌵', '🌾', '🌿', '☘️', '🍀', '🍁', '🍂', '🍃', '🍄', '🌰'
    ],
  },
  {
    id: 'food',
    name: 'Еда и напитки',
    icon: <Utensils className="w-4 h-4" />,
    emojis: [
      '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥',
      '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠',
      '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🌭',
      '🍔', '🍟', '🍕', '🫓', '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗', '🥘', '🫕', '🥫', '🍝', '🍜',
      '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧',
      '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜', '🍯',
      '🥛', '🍼', '☕', '🫖', '🍵', '🧃', '🥤', '🧋', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹'
    ],
  },
  {
    id: 'activities',
    name: 'Активности',
    icon: <Trophy className="w-4 h-4" />,
    emojis: [
      '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍',
      '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸️', '🥌',
      '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '⛹️', '🤺', '🤾', '🏌️', '🏇', '🧘', '🏄', '🏊', '🤽',
      '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎗️', '🎫', '🎟️', '🎪', '🤹', '🎭', '🩰', '🎨', '🎬',
      '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🪕', '🎻', '🎲', '♟️', '🎯', '🎳', '🎮', '🎰'
    ],
  },
  {
    id: 'travel',
    name: 'Путешествия и места',
    icon: <Plane className="w-4 h-4" />,
    emojis: [
      '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🦯', '🦽',
      '🛴', '🚲', '🛵', '🏍️', '🛺', '🚨', '🚔', '🚍', '🚘', '🚖', '🚡', '🚠', '🚟', '🚃', '🚋', '🚞',
      '✈️', '🛫', '🛬', '🛩️', '💺', '🛰️', '🚀', '🛸', '🚁', '🛶', '⛵', '🚤', '🛥️', '🛳️', '⛴️', '🚢',
      '⚓', '🛟', '⛽', '🚧', '🚦', '🚥', '🗺️', '🗿', '🗽', '🗼', '🏰', '🏯', '🏟️', '🎡', '🎢', '🎠',
      '🏖️', '🏝️', '🏜️', '🌋', '⛰️', '🏔️', '🗻', '🏕️', '⛺', '🏠', '🏡', '🏢', '🏣', '🏤', '🏥', '🏦'
    ],
  },
  {
    id: 'objects',
    name: 'Предметы и символы',
    icon: <Lightbulb className="w-4 h-4" />,
    emojis: [
      '⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '💽', '💾', '💿', '📀', '📷', '📸', '📹', '🎥',
      '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡',
      '🔋', '🔌', '💡', '🔦', '🕯️', '🧯', '🗑️', '🛢️', '💸', '💵', '💴', '💶', '💷', '🪙', '💰', '💳',
      '💎', '⚖️', '🧰', '🔧', '🔨', '⚒️', '🛠️', '⛏️', '🔩', '⚙️', '🧱', '⛓️', '🧲', '💣', '🧨', '🔪',
      '🗡️', '⚔️', '🛡️', '🔮', '🧿', '💈', '⚗️', '🔭', '🔬', '🩺', '💊', '💉', '🩹', '🧬', '🧹', '🧻',
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖',
      '💘', '💝', '💟', '☮️', '✝️', '☯️', '☸️', '✡️', '🕎', '♾️', '❌', '⭕', '🛑', '⛔', '📛', '🚫',
      '💯', '💢', '♨️', '⚠️', '🚸', '🔰', '♻️', '✅', '🌐', '💠', '💤', '🏧', '0️⃣', '1️⃣', '2️⃣', '3️⃣'
    ],
  },
  {
    id: 'flags',
    name: 'Флаги',
    icon: <Flag className="w-4 h-4" />,
    emojis: [
      '🇷🇺', '🇧🇾', '🇰🇿', '🇦🇲', '🇬🇪', '🇺🇦', '🇺🇿', '🇹🇯', '🇰🇬', '🇦🇿', '🇲🇩', '🇹🇷', '🇨🇳', '🇯🇵', '🇰🇷', '🇩🇪',
      '🇫🇷', '🇬🇧', '🇮🇹', '🇪🇸', '🇺🇸', '🇨🇦', '🇧🇷', '🇦🇺', '🇮🇳', '🏳️', '🏴', '🏁', '🚩', '🏳️‍🌈'
    ],
  },
];

export const IosEmojiPicker: React.FC<IosEmojiPickerProps> = ({
  onSelectEmoji,
  onDeleteChar,
  onClose,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('frequent');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Filter emojis if searching
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return CATEGORIES;
    const query = searchQuery.trim().toLowerCase();
    return CATEGORIES.map((cat) => ({
      ...cat,
      emojis: cat.emojis.filter((emoji) => emoji.includes(query)),
    })).filter((cat) => cat.emojis.length > 0);
  }, [searchQuery]);

  const scrollToCategory = (catId: string) => {
    setActiveCategory(catId);
    const el = document.getElementById(`ios-emoji-cat-${catId}`);
    if (el && scrollContainerRef.current) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <>
      {/* Mobile Backdrop (closes on tap outside) */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs sm:hidden transition-opacity"
        aria-hidden="true"
      />

      {/* Main Container: On mobile behaves as an iOS bottom sheet dock; on desktop as an inline card */}
      <div
        className="fixed sm:static inset-x-0 bottom-0 sm:inset-auto z-50 sm:z-auto w-full sm:max-w-none bg-[#161619] sm:bg-[#18181b] border-t sm:border border-neutral-700/70 sm:border-neutral-800 rounded-t-[32px] sm:rounded-3xl shadow-2xl flex flex-col h-[65vh] sm:h-96 max-h-[520px] select-none font-sans"
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
        }}
      >
        {/* iOS Grabber handle for mobile */}
        <div className="w-full pt-2.5 pb-1 flex justify-center sm:hidden shrink-0">
          <div className="w-10 h-1 bg-neutral-600 rounded-full" />
        </div>

        {/* Top Bar: Search, Backspace & Done Button */}
        <div className="px-3.5 py-2 bg-[#121215] sm:bg-[#141416] border-b border-neutral-800/80 flex items-center space-x-2 shrink-0">
          <div className="flex-1 relative flex items-center">
            <Search className="w-4 h-4 absolute left-3 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск эмодзи..."
              className="w-full bg-[#1e1e22] sm:bg-[#1f1f23] border border-neutral-700/70 rounded-xl pl-9 pr-8 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-400 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 text-neutral-400 hover:text-white p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* iOS Backspace Key */}
          {onDeleteChar && (
            <button
              type="button"
              onClick={onDeleteChar}
              title="Удалить символ"
              className="p-2 bg-[#26262a] active:bg-[#38383e] text-neutral-300 hover:text-white rounded-xl border border-neutral-700/70 transition shrink-0 flex items-center justify-center shadow-sm active:scale-95"
            >
              <Delete className="w-4 h-4" />
            </button>
          )}

          {/* iOS "Done / Готово" button for mobile */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-white text-xs font-semibold rounded-xl border border-neutral-700/60 transition shrink-0 flex items-center space-x-1"
            >
              <span>Готово</span>
            </button>
          )}
        </div>

        {/* Emoji Grid Scroll Area */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-2.5 sm:p-3 space-y-4 overscroll-contain"
        >
          {filteredCategories.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-500">
              <Smile className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-xs">Ничего не найдено</p>
            </div>
          ) : (
            filteredCategories.map((cat) => (
              <div key={cat.id} id={`ios-emoji-cat-${cat.id}`} className="space-y-1.5">
                <div className="text-[11px] font-semibold text-neutral-400 tracking-wider uppercase px-1.5 sticky top-0 bg-[#161619]/95 sm:bg-[#18181b]/95 backdrop-blur-sm py-1 z-10 flex items-center space-x-1.5">
                  <span>{cat.name}</span>
                </div>
                {/* Clean responsive grid with native touch sizing */}
                <div className="grid grid-cols-7 sm:grid-cols-8 md:grid-cols-9 gap-1 sm:gap-1.5">
                  {cat.emojis.map((emoji, idx) => (
                    <button
                      key={`${cat.id}-${idx}-${emoji}`}
                      type="button"
                      onClick={() => onSelectEmoji(emoji)}
                      className="h-11 sm:h-10 text-[26px] sm:text-2xl flex items-center justify-center rounded-xl hover:bg-neutral-800/80 active:scale-125 active:bg-neutral-700/60 transition-transform duration-75 cursor-pointer leading-none select-none"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* iOS Bottom Navigation Bar: Horizontally scrollable on mobile to ensure all 9 categories fit comfortably */}
        <div className="bg-[#101012] sm:bg-[#121214] border-t border-neutral-800/80 px-2 py-1.5 shrink-0 pb-safe sm:pb-1.5">
          <div className="flex items-center justify-between sm:justify-around overflow-x-auto no-scrollbar space-x-1">
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => scrollToCategory(cat.id)}
                  className={`p-2 sm:p-2 rounded-xl transition flex items-center justify-center shrink-0 ${
                    isActive
                      ? 'bg-neutral-800 text-white scale-110 shadow-sm border border-neutral-700'
                      : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/40 active:scale-95'
                  }`}
                  title={cat.name}
                >
                  {cat.icon}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};
