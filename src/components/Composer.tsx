import React, { useState, useRef } from 'react';
import { Paperclip, Smile, X, Pin } from 'lucide-react';
import { DbUser, DbPost } from '../types/database';
import { Avatar } from './Avatar';
import { itdDb } from '../lib/storage';
import { IosEmojiPicker } from './IosEmojiPicker';

interface ComposerProps {
  currentUser: DbUser;
  onPostCreated: (post: DbPost) => void;
  placeholder?: string;
}

export const Composer: React.FC<ComposerProps> = ({
  currentUser,
  onPostCreated,
  placeholder = 'Что нового?',
}) => {
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !imageUrl) return;

    const newPost = itdDb.createPost({
      userId: currentUser.id,
      content: content.trim(),
      image_url: imageUrl,
      is_pinned: isPinned,
    });

    setContent('');
    setImageUrl(null);
    setShowEmojiPicker(false);
    setIsPinned(false);

    onPostCreated(newPost);
  };

  // Directly handle native file dialog selection
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImageUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
    // Reset file input so selecting the same file again triggers change
    e.target.value = '';
  };

  // Insert emoji at cursor position in textarea
  const handleSelectEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart || content.length;
      const end = textarea.selectionEnd || content.length;
      const newText = content.substring(0, start) + emoji + content.substring(end);
      setContent(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 10);
    } else {
      setContent((prev) => prev + emoji);
    }
  };

  // iOS delete/backspace key handler
  const handleDeleteChar = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart || content.length;
      const end = textarea.selectionEnd || content.length;
      if (start > 0 || start !== end) {
        const deleteFrom = start === end ? start - 1 : start;
        const newText = content.substring(0, deleteFrom) + content.substring(end);
        setContent(newText);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(deleteFrom, deleteFrom);
        }, 10);
      }
    } else {
      setContent((prev) => prev.slice(0, -1));
    }
  };

  const isSubmitDisabled = !content.trim() && !imageUrl;

  return (
    <div className="bg-[#1c1c20] border border-neutral-800/80 rounded-3xl p-4 sm:p-5 shadow-sm">
      {/* Hidden native file input for direct file upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      <form onSubmit={handleSubmit}>
        <div className="flex space-x-3.5 items-start">
          <Avatar
            name={currentUser.name}
            avatarUrl={currentUser.avatar_url}
            emoji={currentUser.avatar_emoji}
            hasEyes={false}
            size="md"
          />

          <div className="flex-1 min-w-0">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={placeholder}
              rows={content.length > 80 ? 3 : 2}
              className="w-full bg-transparent text-white placeholder-neutral-400 text-sm md:text-base resize-none focus:outline-none leading-relaxed"
            />

            {/* Attached image preview with native remove button */}
            {imageUrl && (
              <div className="relative mt-2 mb-3 rounded-2xl overflow-hidden border border-neutral-800 max-h-72 w-full bg-black/40">
                <img
                  src={imageUrl}
                  alt="Вложение"
                  className="w-full h-auto object-cover max-h-72"
                />
                <button
                  type="button"
                  onClick={() => setImageUrl(null)}
                  className="absolute top-2.5 right-2.5 p-1.5 bg-black/80 hover:bg-black text-white rounded-full transition shadow-lg border border-neutral-700"
                  title="Удалить фото"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Full iOS Emoji Keyboard Panel */}
            {showEmojiPicker && (
              <div className="mt-2 mb-3">
                <IosEmojiPicker
                  onSelectEmoji={handleSelectEmoji}
                  onDeleteChar={handleDeleteChar}
                  onClose={() => setShowEmojiPicker(false)}
                />
              </div>
            )}

            {/* Bottom Actions Bar */}
            <div className="flex items-center justify-between pt-3 border-t border-neutral-800/60 mt-2">
              <div className="flex items-center space-x-1 sm:space-x-2">
                {/* File Attachment: directly triggers native file upload dialog */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-2.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800/80 transition active:scale-95 ${
                    imageUrl ? 'text-emerald-400 bg-emerald-500/10' : ''
                  }`}
                  title="Прикрепить файл (открыть выбор файла)"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                {/* Emoji button: toggles full iOS Emoji Panel */}
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={`p-2.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800/80 transition active:scale-95 ${
                    showEmojiPicker ? 'text-amber-400 bg-amber-400/15' : ''
                  }`}
                  title="Смайлики iOS"
                >
                  <Smile className="w-4 h-4" />
                </button>

                {/* Pin post toggle */}
                <button
                  type="button"
                  onClick={() => setIsPinned(!isPinned)}
                  className={`p-2.5 rounded-xl transition active:scale-95 ${
                    isPinned
                      ? 'text-amber-400 bg-amber-400/10'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800/80'
                  }`}
                  title={isPinned ? 'Пост будет закреплён' : 'Закрепить пост'}
                >
                  <Pin className="w-4 h-4" />
                </button>
              </div>

              {/* Publish button */}
              <button
                type="submit"
                disabled={isSubmitDisabled}
                className="px-5 py-2.5 rounded-2xl bg-white disabled:bg-neutral-800 disabled:text-neutral-500 text-black font-semibold text-xs sm:text-sm hover:bg-neutral-200 transition shadow"
              >
                Опубликовать
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
