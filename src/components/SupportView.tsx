import React, { useState, useEffect, useRef } from 'react';
import {
  HelpCircle,
  Paperclip,
  Video,
  X,
  Send,
  Clock,
  Plus,
  ArrowLeft,
  ChevronRight,
  Check
} from 'lucide-react';
import { DbUser, DbSupportTicket, DbSupportAttachment } from '../types/database';
import { itdDb } from '../lib/storage';
import { supabaseService } from '../lib/supabaseService';
import { Avatar } from './Avatar';

interface SupportViewProps {
  currentUser: DbUser;
  onBackToFeed: () => void;
  onTicketRead?: () => void;
  initialTicketId?: string | null;
}

export const SupportView: React.FC<SupportViewProps> = ({
  currentUser,
  onBackToFeed,
  onTicketRead,
  initialTicketId,
}) => {
  const [tickets, setTickets] = useState<DbSupportTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(initialTicketId || null);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);

  // Form states: 2 blocks as required
  const [problemTitle, setProblemTitle] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [attachments, setAttachments] = useState<DbSupportAttachment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [replyText, setReplyText] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const reloadTickets = async () => {
    try {
      const userTickets = await supabaseService.getSupportTickets(currentUser.id);
      setTickets(userTickets);

      if (userTickets.length === 0 && !selectedTicketId) {
        setIsCreatingTicket(true);
      }
    } catch {
      const userTickets = itdDb.getSupportTickets(currentUser.id);
      setTickets(userTickets);

      if (userTickets.length === 0 && !selectedTicketId) {
        setIsCreatingTicket(true);
      }
    }
  };

  useEffect(() => {
    reloadTickets();
  }, [currentUser.id]);

  useEffect(() => {
    if (initialTicketId) {
      setSelectedTicketId(initialTicketId);
      setIsCreatingTicket(false);
    }
  }, [initialTicketId]);

  useEffect(() => {
    if (selectedTicketId) {
      const ticket = tickets.find((t) => t.id === selectedTicketId);
      if (ticket && ticket.has_unread_reply) {
        supabaseService.markTicketAsRead(selectedTicketId).then(() => {
          reloadTickets();
          if (onTicketRead) onTicketRead();
        });
      }
    }
  }, [selectedTicketId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      const fileType: 'image' | 'video' | 'file' = isVideo ? 'video' : isImage ? 'image' : 'file';

      const reader = new FileReader();
      reader.onload = (event) => {
        const resultUrl = event.target?.result as string;
        if (resultUrl) {
          setAttachments((prev) => [
            ...prev,
            {
              name: file.name,
              type: fileType,
              url: resultUrl,
              size: file.size,
            },
          ]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!problemTitle.trim()) {
      setErrorMessage('Заполните поле «Опишите проблему»');
      return;
    }
    if (!problemDescription.trim()) {
      setErrorMessage('Заполните поле «Расскажите о проблеме подробнее»');
      return;
    }

    setIsSubmitting(true);
    try {
      const newTicket = await supabaseService.createSupportTicket({
        userId: currentUser.id,
        problemTitle: problemTitle.trim(),
        problemDescription: problemDescription.trim(),
        attachments,
      });

      setProblemTitle('');
      setProblemDescription('');
      setAttachments([]);
      setIsCreatingTicket(false);
      setSelectedTicketId(newTicket.id);

      await reloadTickets();
    } catch (err: any) {
      setErrorMessage(err.message || 'Ошибка создания обращения');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReply = async (ticketId: string) => {
    if (!replyText.trim()) return;

    const text = replyText.trim();
    setReplyText('');
    await supabaseService.addSupportMessage(ticketId, {
      senderRole: 'user',
      senderName: currentUser.name,
      text,
    });
    await reloadTickets();
  };

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId);

  return (
    <div className="w-full space-y-5 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800/80">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400">
            <HelpCircle className="w-4 h-4 text-neutral-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">
              Помощь
            </h1>
            <p className="text-xs text-neutral-400">
              Служба поддержки и решение вопросов
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {tickets.length > 0 && !isCreatingTicket && !selectedTicketId && (
            <button
              type="button"
              onClick={() => {
                setIsCreatingTicket(true);
                setSelectedTicketId(null);
              }}
              className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium rounded-xl transition flex items-center space-x-1.5 border border-neutral-700"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Новое обращение</span>
            </button>
          )}

          {(isCreatingTicket || selectedTicketId) && tickets.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setIsCreatingTicket(false);
                setSelectedTicketId(null);
                reloadTickets();
              }}
              className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white text-xs font-medium rounded-xl border border-neutral-800 transition flex items-center space-x-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>История обращений ({tickets.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* CASE 1: Single Ticket Conversation View */}
      {selectedTicketId && selectedTicket && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-[#1c1c20] border border-neutral-800 space-y-3 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider block mb-1">
                  Обращение #{selectedTicket.id.slice(0, 8)}
                </span>
                <h2 className="text-base font-bold text-white">
                  {selectedTicket.problem_title}
                </h2>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-800 text-neutral-300 border border-neutral-700">
                {selectedTicket.status === 'answered'
                  ? 'Ответ получен'
                  : selectedTicket.status === 'in_progress'
                  ? 'В обработке'
                  : 'Открыто'}
              </span>
            </div>

            <div className="text-[11px] text-neutral-500 flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>
                {new Date(selectedTicket.created_at).toLocaleString('ru-RU', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>

          {/* Messages Thread (стиль комментариев под постом, прибито слева) */}
          <div className="bg-[#1c1c20] border border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800/80">
              <h3 className="font-bold text-white text-sm">
                Переписка
              </h3>
              <span className="text-xs text-neutral-500">
                {selectedTicket.messages.filter((m) => m.sender_role !== 'system').length} сообщений
              </span>
            </div>

            {/* Фильтруем системные внутренние плашки — клиент их не видит */}
            <div className="space-y-4 divide-y divide-neutral-800/60">
              {(() => {
                const supportSettings = itdDb.getSupportSettings();
                return selectedTicket.messages
                  .filter((msg) => msg.sender_role !== 'system')
                  .map((msg, idx) => {
                    const isSupport = msg.sender_role === 'support';
                    const supportDisplayName = isSupport
                      ? (msg.operator_display_name ||
                         (msg.operator_id ? itdDb.getSupportAgentDisplayName(msg.operator_id) : (msg.sender_name && msg.sender_name !== 'Поддержка' ? msg.sender_name : 'Саппорт #1')))
                      : msg.sender_name;

                    return (
                      <div key={msg.id || idx} className="pt-4 first:pt-0 flex space-x-3 items-start">
                        <div className="shrink-0 pt-0.5">
                          <Avatar
                            name={isSupport ? supportDisplayName : currentUser.name}
                            avatarUrl={isSupport ? supportSettings.support_avatar_url : currentUser.avatar_url}
                            emoji={isSupport ? (supportSettings.support_avatar_url ? null : '🛡️') : currentUser.avatar_emoji}
                            hasEyes={false}
                            size="sm"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 flex-wrap">
                            <span className="font-semibold text-xs text-white">
                              {isSupport ? supportDisplayName : msg.sender_name}
                            </span>
                            {isSupport && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 font-medium">
                                саппорт
                              </span>
                            )}
                            {!isSupport && (
                              <span className="text-[11px] text-neutral-400 font-mono">
                                @{currentUser.username}
                              </span>
                            )}
                            <span className="text-[10px] text-neutral-500">
                              {new Date(msg.created_at).toLocaleString('ru-RU', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          <div className="text-xs md:text-sm text-neutral-200 mt-1 leading-relaxed break-words whitespace-pre-wrap select-text">
                            {msg.text}
                          </div>

                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mt-2.5 flex flex-wrap gap-2">
                              {msg.attachments.map((att, attIdx) => (
                                <div
                                  key={attIdx}
                                  className="rounded-xl border border-neutral-800 bg-black/40 overflow-hidden max-w-xs"
                                >
                                  {att.type === 'video' ? (
                                    <div className="p-3 flex items-center space-x-2 text-xs text-neutral-400">
                                      <Video className="w-4 h-4" />
                                      <span>{att.name}</span>
                                    </div>
                                  ) : (
                                    <img
                                      src={att.url}
                                      alt={att.name}
                                      className="max-h-40 w-auto object-cover rounded-xl"
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  });
              })()}
            </div>
          </div>

          {/* Follow-up input */}
          <div className="p-4 rounded-2xl bg-[#1c1c20] border border-neutral-800 space-y-2.5 shadow-sm">
            <h4 className="text-xs font-semibold text-neutral-300">
              Дополнить обращение
            </h4>
            <div className="flex gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendReply(selectedTicket.id);
                }}
                placeholder="Напишите ответ или уточнение..."
                className="flex-1 bg-[#141416] border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-700 transition"
              />
              <button
                type="button"
                onClick={() => handleSendReply(selectedTicket.id)}
                className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-medium text-xs border border-neutral-700 transition flex items-center space-x-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Отправить</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CASE 2: History List */}
      {!selectedTicketId && !isCreatingTicket && tickets.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              История обращений
            </h2>
            <span className="text-xs text-neutral-500">
              Всего: {tickets.length}
            </span>
          </div>

          <div className="space-y-2.5">
            {tickets.map((ticket) => {
              const lastMsg = ticket.messages[ticket.messages.length - 1];
              return (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicketId(ticket.id)}
                  className="p-4 rounded-2xl bg-[#1c1c20] border border-neutral-800/80 hover:border-neutral-700 transition cursor-pointer group shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <h3 className="font-semibold text-white text-sm truncate group-hover:text-neutral-200 transition">
                      {ticket.problem_title}
                    </h3>
                    <div className="flex items-center space-x-2 shrink-0">
                      {ticket.has_unread_reply && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-800 text-neutral-200 border border-neutral-700">
                          +1 ответ
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-900 text-neutral-400 border border-neutral-800">
                        {ticket.status === 'answered'
                          ? 'Отвечен'
                          : ticket.status === 'in_progress'
                          ? 'В обработке'
                          : 'Открыт'}
                      </span>
                      <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-neutral-300 transition" />
                    </div>
                  </div>

                  <p className="text-xs text-neutral-400 line-clamp-2 mb-2 leading-relaxed">
                    {lastMsg ? `${lastMsg.sender_name}: ${lastMsg.text}` : ticket.problem_description}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-2 border-t border-neutral-900">
                    <span>
                      {new Date(ticket.created_at).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                    {ticket.attachments && ticket.attachments.length > 0 && (
                      <span className="flex items-center space-x-1">
                        <Paperclip className="w-3 h-3" />
                        <span>{ticket.attachments.length}</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CASE 3: Creation Form (2 blocks as required) */}
      {(isCreatingTicket || tickets.length === 0) && !selectedTicketId && (
        <form onSubmit={handleSubmitTicket} className="space-y-4">
          <div className="p-5 sm:p-6 rounded-2xl bg-[#1c1c20] border border-neutral-800 space-y-5 shadow-sm">
            {errorMessage && (
              <div className="p-3 bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs rounded-xl">
                {errorMessage}
              </div>
            )}

            {/* БЛОК 1: Опишите проблему */}
            <div className="space-y-1.5">
              <label
                htmlFor="problem-title"
                className="block text-xs font-semibold text-neutral-300"
              >
                Опишите проблему
              </label>
              <input
                id="problem-title"
                type="text"
                value={problemTitle}
                onChange={(e) => setProblemTitle(e.target.value)}
                placeholder="Кратко сформулируйте тему вопроса..."
                className="w-full px-3.5 py-2.5 bg-[#141416] border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-700 transition"
                required
              />
            </div>

            {/* БЛОК 2: Расскажите о проблеме подробнее */}
            <div className="space-y-1.5">
              <label
                htmlFor="problem-desc"
                className="block text-xs font-semibold text-neutral-300"
              >
                Расскажите о проблеме подробнее
              </label>
              <textarea
                id="problem-desc"
                rows={5}
                value={problemDescription}
                onChange={(e) => setProblemDescription(e.target.value)}
                placeholder="Опишите подробности, шаги и детали ситуации..."
                className="w-full px-3.5 py-2.5 bg-[#141416] border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-700 transition resize-none leading-relaxed"
                required
              />
            </div>

            {/* Вложения: фото / видео */}
            <div className="space-y-2 pt-2 border-t border-neutral-800/80">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">
                  Прикрепить фото / видео
                </span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-xl text-xs font-medium border border-neutral-800 transition flex items-center space-x-1.5"
                >
                  <Paperclip className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Выбрать файлы</span>
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {attachments.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {attachments.map((file, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-[#141416] border border-neutral-800 rounded-xl flex items-center justify-between space-x-2"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        {file.type === 'video' ? (
                          <div className="w-10 h-10 bg-neutral-900 rounded-lg flex items-center justify-center shrink-0 text-neutral-400">
                            <Video className="w-4 h-4" />
                          </div>
                        ) : (
                          <img
                            src={file.url}
                            alt={file.name}
                            className="w-10 h-10 object-cover rounded-lg shrink-0 border border-neutral-800"
                          />
                        )}
                        <p className="text-xs text-white truncate font-medium">
                          {file.name}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(idx)}
                        className="p-1 text-neutral-500 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Кнопка Отправить */}
            <div className="pt-2 border-t border-neutral-800/80 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || !problemTitle.trim() || !problemDescription.trim()}
                className="px-5 py-2 bg-white hover:bg-neutral-200 text-black font-semibold text-xs rounded-xl disabled:opacity-40 transition flex items-center space-x-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Отправить</span>
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
