import React, { useState, useRef } from 'react';
import {
  Camera,
  Upload,
  Smile,
  X,
  Eye,
  EyeOff,
  User,
  AtSign,
  Mail,
  Lock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { itdDb } from '../lib/storage';
import { DbUser } from '../types/database';
import { EmojiAvatarPickerModal } from './EmojiAvatarPickerModal';
import { showAppToast } from '../lib/toast';

interface AuthScreenProps {
  onSuccess: (user: DbUser) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess }) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register form state (single step - direct registration without sync/verification)
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regBio, setRegBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [avatarEmoji, setAvatarEmoji] = useState<string | null>(null);
  const [showEmojiPickerModal, setShowEmojiPickerModal] = useState(false);
  const [isAvatarDragOver, setIsAvatarDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Handle native photo selection / drop
  const handleAvatarFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Пожалуйста, выберите файл изображения (PNG, JPG, WEBP)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setAvatarUrl(event.target.result as string);
        setAvatarEmoji(null);
        setError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleNativeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleAvatarFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsAvatarDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsAvatarDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsAvatarDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleAvatarFile(file);
  };

  // Login handler: username OR email, no profiles saved, no confirmation code
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const identifier = loginIdentifier.trim();
    if (!identifier) {
      setError('Введите логин (@ник) или адрес электронной почты');
      return;
    }
    if (!loginPassword) {
      setError('Введите пароль');
      return;
    }

    try {
      const user = itdDb.loginUser(identifier, loginPassword);
      showAppToast(
        'Вход выполнен',
        `С возвращением в ШУМ, ${user.name}!`,
        'success'
      );
      onSuccess(user);
    } catch (err: any) {
      setError(err?.message || 'Неверный логин, почта или пароль');
    }
  };

  // Direct registration handler: no email sync step, no confirmation code
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanNick = regUsername.trim().replace(/^@/, '').toLowerCase();
    const cleanEmail = regEmail.trim().toLowerCase();
    const cleanName = regName.trim();

    if (!cleanName) {
      setError('Укажите имя профиля');
      return;
    }

    if (!cleanNick || cleanNick.length < 2) {
      setError('Укажите никнейм (не менее 2 латинских символов)');
      return;
    }

    if (cleanEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        setError('Укажите корректный адрес электронной почты');
        return;
      }
    }

    if (!regPassword || regPassword.length < 3) {
      setError('Пароль должен содержать минимум 3 символа');
      return;
    }

    // Check if username is already taken
    const existingNick = itdDb.getUserByUsername(cleanNick);
    if (existingNick) {
      setError(`Никнейм @${cleanNick} уже занят другим пользователем`);
      return;
    }

    // Check if email is already taken (if provided)
    if (cleanEmail) {
      const existingEmail = itdDb.getAllUsers().find(
        (u) => u.email && u.email.toLowerCase() === cleanEmail
      );
      if (existingEmail) {
        setError(`Почта ${cleanEmail} уже зарегистрирована. Войдите в существующий аккаунт.`);
        return;
      }
    }

    try {
      const user = itdDb.registerUser({
        name: cleanName,
        username: cleanNick,
        email: cleanEmail || `${cleanNick}@shum.net`,
        email_verified: true,
        password: regPassword,
        bio: regBio.trim(),
        avatar_url: avatarUrl || '',
        avatar_emoji: avatarEmoji || null,
      });

      showAppToast(
        'Регистрация завершена',
        `Добро пожаловать в ШУМ, ${user.name}!`,
        'success'
      );

      onSuccess(user);
    } catch (err: any) {
      setError(err?.message || 'Ошибка регистрации профиля');
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-3.5 sm:p-6 selection:bg-neutral-800 selection:text-white">
      <div className="w-full max-w-md bg-[#141416] border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl transition-all">
        {/* Header */}
        <div className="p-6 sm:p-8 text-center border-b border-neutral-800/80 bg-[#18181b]">
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-wider mb-1">
            ШУМ
          </h1>
          <p className="text-xs text-neutral-400">
            Социальная сеть v1.1.2
          </p>

          {/* Segmented tabs */}
          <div className="flex bg-[#0f0f11] rounded-2xl p-1 mt-6 border border-neutral-800">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition ${
                tab === 'login'
                  ? 'bg-neutral-800 text-white shadow'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Вход
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('register');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition ${
                tab === 'register'
                  ? 'bg-neutral-800 text-white shadow'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Регистрация
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-5 sm:p-7">
          {error && (
            <div className="mb-5 p-3 rounded-2xl bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs text-center leading-relaxed">
              {error}
            </div>
          )}

          {tab === 'login' ? (
            /* Login Form: Auth strictly by Username OR Email (Profiles are NOT saved, direct login) */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1.5">
                  Логин или Email
                </label>
                <div className="relative">
                  <AtSign className="w-4 h-4 absolute left-3.5 top-3 text-neutral-500" />
                  <input
                    type="text"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="логин (@ник) или адрес@почты.ru"
                    className="w-full bg-[#1b1b1e] border border-neutral-800 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600 transition"
                    required
                  />
                </div>
                <p className="text-[11px] text-neutral-500 mt-1">
                  Вход возможен как по никнейму, так и по адресу электронной почты.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1.5">
                  Пароль
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3 text-neutral-500" />
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#1b1b1e] border border-neutral-800 rounded-2xl pl-10 pr-11 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600 transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3.5 top-3 text-neutral-500 hover:text-white"
                  >
                    {showLoginPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-white hover:bg-neutral-200 text-black font-semibold text-sm transition mt-3 shadow-md flex items-center justify-center space-x-2"
              >
                <span>Войти</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* Direct Registration Form: Single-step, no verification/sync code */
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Native Photo / Avatar Upload Section */}
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-2 text-center">
                  Фотография профиля
                </label>

                {/* Hidden native file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  onChange={handleNativeFileChange}
                  className="hidden"
                />

                <div className="flex flex-col items-center">
                  {/* Avatar Preview circle with native drag & drop */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative w-24 h-24 rounded-full border-2 cursor-pointer transition-all flex items-center justify-center overflow-hidden group shadow-lg ${
                      isAvatarDragOver
                        ? 'border-white bg-neutral-800 scale-105'
                        : avatarUrl || avatarEmoji
                        ? 'border-neutral-700 bg-[#1a1a1e]'
                        : 'border-dashed border-neutral-700 hover:border-neutral-500 bg-[#1a1a1e]'
                    }`}
                    title="Нажмите для загрузки файла"
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Аватар"
                        className="w-full h-full object-cover"
                      />
                    ) : avatarEmoji ? (
                      <span className="text-4xl select-none leading-none flex items-center justify-center [font-family:'Apple_Color_Emoji','Segoe_UI_Emoji','Noto_Color_Emoji',sans-serif]">
                        {avatarEmoji}
                      </span>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-neutral-500 group-hover:text-neutral-300 transition">
                        <Camera className="w-7 h-7 mb-1" />
                        <span className="text-[10px] font-medium">Фото</span>
                      </div>
                    )}

                    {/* Hover overlay with upload icon */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-medium transition">
                      <Upload className="w-5 h-5 mb-0.5" />
                      <span>{avatarUrl ? 'Заменить' : 'Выбрать'}</span>
                    </div>
                  </div>

                  {/* Actions under Avatar */}
                  <div className="flex items-center space-x-2 mt-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center space-x-1.5 transition border border-neutral-700"
                    >
                      <Upload className="w-3.5 h-3.5 text-neutral-400" />
                      <span>{avatarUrl ? 'Сменить фото' : 'Загрузить фото'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowEmojiPickerModal(true)}
                      className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center space-x-1.5 transition border border-neutral-700"
                    >
                      <Smile className="w-3.5 h-3.5 text-amber-400" />
                      <span>Смайлик</span>
                    </button>

                    {(avatarUrl || avatarEmoji) && (
                      <button
                        type="button"
                        onClick={() => {
                          setAvatarUrl('');
                          setAvatarEmoji(null);
                        }}
                        className="p-1.5 text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 rounded-xl transition"
                        title="Удалить"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1.5">
                  Имя профиля
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-3 text-neutral-500" />
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Владимир"
                    className="w-full bg-[#1b1b1e] border border-neutral-800 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600 transition"
                    required
                  />
                </div>
              </div>

              {/* Handle @ */}
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1.5">
                  Никнейм @
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-neutral-500 text-sm font-mono">
                    @
                  </span>
                  <input
                    type="text"
                    value={regUsername}
                    onChange={(e) =>
                      setRegUsername(
                        e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
                      )
                    }
                    placeholder="pepelyaev"
                    className="w-full bg-[#1b1b1e] border border-neutral-800 rounded-2xl pl-8 pr-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600 font-mono transition"
                    required
                  />
                </div>
              </div>

              {/* Email (Optional or standard, without code sync) */}
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1.5">
                  Электронная почта
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3 text-neutral-500" />
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="pochta@domain.ru"
                    className="w-full bg-[#1b1b1e] border border-neutral-800 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600 transition"
                  />
                </div>
                <p className="text-[11px] text-neutral-500 mt-1">
                  Используется для быстрого входа в аккаунт.
                </p>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1.5">
                  Пароль
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3 text-neutral-500" />
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Минимум 3 символа"
                    className="w-full bg-[#1b1b1e] border border-neutral-800 rounded-2xl pl-10 pr-11 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600 transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-3.5 top-3 text-neutral-500 hover:text-white"
                  >
                    {showRegPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1.5">
                  О себе (необязательно)
                </label>
                <textarea
                  value={regBio}
                  onChange={(e) => setRegBio(e.target.value)}
                  placeholder="Коротко о вас..."
                  rows={2}
                  className="w-full bg-[#1b1b1e] border border-neutral-800 rounded-2xl px-4 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600 resize-none transition"
                />
              </div>

              {/* Submit button: direct instant registration */}
              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-white hover:bg-neutral-200 text-black font-semibold text-sm transition mt-3 shadow-md flex items-center justify-center space-x-2"
              >
                <span>Зарегистрироваться</span>
                <Sparkles className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Emoji Avatar Picker Modal */}
      <EmojiAvatarPickerModal
        isOpen={showEmojiPickerModal}
        onClose={() => setShowEmojiPickerModal(false)}
        onSelectEmoji={(emoji) => {
          setAvatarEmoji(emoji);
          setAvatarUrl('');
        }}
        currentEmoji={avatarEmoji}
      />
    </div>
  );
};
