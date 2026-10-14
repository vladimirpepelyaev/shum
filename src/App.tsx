import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { FeedView } from './components/FeedView';
import { SearchView } from './components/SearchView';
import { NotificationsView } from './components/NotificationsView';
import { ProfileView } from './components/ProfileView';
import { PostDetailView } from './components/PostDetailView';
import { SupportView } from './components/SupportView';
import { SupportCrmView } from './components/SupportCrmView';
import { ModerationCrmView } from './components/ModerationCrmView';
import { UserCardView } from './components/UserCardView';
import { NoSpamAdminView } from './components/NoSpamAdminView';
import { FooterLinks } from './components/FooterLinks';
import { LegalModal, LegalDocType } from './components/LegalModal';
import { AuthScreen } from './components/AuthScreen';
import { BlockedScreen } from './components/BlockedScreen';
import { ReportModal } from './components/ReportModal';
import { ToastContainer } from './components/ToastContainer';
import { itdDb } from './lib/storage';
import { supabaseService } from './lib/supabaseService';
import { getSupabaseSettings, testSupabaseConnection } from './lib/supabase';
import { DbUser } from './types/database';
import {
  Menu,
  X,
  Ban,
  AlertTriangle,
  Archive,
  Search,
  Bell,
  LifeBuoy,
  User as UserIcon,
  ShieldAlert,
  Database,
  Key,
} from 'lucide-react';

interface RouteState {
  type:
    | 'feed'
    | 'search'
    | 'notifications'
    | 'profile'
    | 'post'
    | 'support'
    | 'crm_support'
    | 'crm_moderation'
    | 'crm_nospam'
    | 'user_card';
  username?: string;
  postNumber?: number;
  ticketId?: string;
  rawPath: string;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<DbUser | null>(null);
  const [currentPath, setCurrentPath] = useState<string>('/');
  const [route, setRoute] = useState<RouteState>({ type: 'feed', rawPath: '/' });
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportingPostId, setReportingPostId] = useState<string | null>(null);
  const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDocType>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [, setTick] = useState(0);

  // Parse path according to URL rules and staff skill CRM routes
  const parsePath = useCallback((path: string): RouteState => {
    let normalized = path;
    if (normalized.startsWith('#')) {
      normalized = normalized.slice(1);
    }
    if (!normalized.startsWith('/')) {
      normalized = '/' + normalized;
    }

    // Support ticket query /support?act=show(ID) or /crm/support?act=show(ID)
    const showTicketMatch = normalized.match(
      /^\/(?:crm\/)?support\?act=show(?:\(([^)]+)\)|([a-zA-Z0-9_-]+))/i
    );
    if (showTicketMatch) {
      const ticketId = (showTicketMatch[1] || showTicketMatch[2] || '').trim();
      const isCrm = normalized.startsWith('/crm') || itdDb.getCurrentUser()?.skills?.includes('support');
      return {
        type: isCrm ? 'crm_support' : 'support',
        ticketId,
        rawPath: normalized,
      };
    }

    // Skill 1: CRM Поддержки (/crm/support)
    if (normalized === '/crm/support' || normalized === '/support-crm') {
      return { type: 'crm_support', rawPath: '/crm/support' };
    }

    // Skill 2: CRM Модератора (/crm/moderation)
    if (normalized === '/crm/moderation' || normalized === '/moderation') {
      return { type: 'crm_moderation', rawPath: '/crm/moderation' };
    }

    // Skill 6: CRM noSpam (/crm/nospam или /nospam)
    if (normalized === '/crm/nospam' || normalized === '/nospam') {
      return { type: 'crm_nospam', rawPath: '/crm/nospam' };
    }

    // Support screen for users (/support)
    if (normalized === '/support' || normalized === '/help') {
      return { type: 'support', rawPath: '/support' };
    }

    // Skill 4: Карточка пользователя (название.com/@{ник}#info или /@{ник}/info)
    const cardMatch = normalized.match(/^\/@([a-zA-Z0-9_]+)(?:#info|\/info)/i);
    if (cardMatch) {
      return {
        type: 'user_card',
        username: cardMatch[1].toLowerCase(),
        rawPath: normalized,
      };
    }

    // Check window hash for #info directly on profile
    if (typeof window !== 'undefined' && window.location.hash === '#info') {
      const directMatch = normalized.match(/^\/@([a-zA-Z0-9_]+)\/?$/i);
      if (directMatch) {
        return {
          type: 'user_card',
          username: directMatch[1].toLowerCase(),
          rawPath: normalized,
        };
      }
    }

    // Match /@{username}/post_{postNumber} (Rule 2)
    const postMatch = normalized.match(/^\/@([a-zA-Z0-9_]+)\/post_(\d+)/i);
    if (postMatch) {
      return {
        type: 'post',
        username: postMatch[1].toLowerCase(),
        postNumber: parseInt(postMatch[2], 10),
        rawPath: normalized,
      };
    }

    // Match /@{username} (Rule 1)
    const profileMatch = normalized.match(/^\/@([a-zA-Z0-9_]+)\/?$/i);
    if (profileMatch) {
      return {
        type: 'profile',
        username: profileMatch[1].toLowerCase(),
        rawPath: normalized,
      };
    }

    if (normalized === '/search') {
      return { type: 'search', rawPath: '/search' };
    }
    if (normalized === '/notifications') {
      return { type: 'notifications', rawPath: '/notifications' };
    }

    return { type: 'feed', rawPath: '/' };
  }, []);

  // Sync route with browser window.location
  const navigate = useCallback(
    (newPath: string) => {
      try {
        window.history.pushState(null, '', newPath);
      } catch {
        window.location.hash = newPath;
      }
      setCurrentPath(newPath);
      setRoute(parsePath(newPath));
      setMobileMenuOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [parsePath]
  );

  // Initial load & seed
  useEffect(() => {
    itdDb.ensureSeedData();

    // Load initial user session (from Supabase or local fallback)
    const initUser = async () => {
      try {
        const user = await supabaseService.getCurrentUser();
        setCurrentUser(user);
      } catch (e) {
        console.warn('Failed to load user session:', e);
        setCurrentUser(itdDb.getCurrentUser());
      }
    };
    initUser();

    const getPathFromLocation = (): string => {
      if (typeof window === 'undefined') return '/';
      if (window.location.hash && window.location.hash.startsWith('#/')) {
        return window.location.hash.slice(1);
      }
      const pathname = window.location.pathname || '/';
      const search = window.location.search || '';
      const hash = window.location.hash || '';
      return `${pathname}${search}${hash}`;
    };

    const initialPath = getPathFromLocation();
    setCurrentPath(initialPath);
    setRoute(parsePath(initialPath));
    setIsInitialized(true);

    const handleLocationChange = () => {
      const p = getPathFromLocation();
      setCurrentPath(p);
      setRoute(parsePath(p));
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, [parsePath]);

  // Periodic polling for background support responses and notifications
  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 2000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const handleLogout = async () => {
    await supabaseService.signOut();
    setCurrentUser(null);
  };

  const handleOpenReportModal = (postId: string) => {
    setReportingPostId(postId);
    setIsReportOpen(true);
  };

  const handleUserUpdated = async () => {
    try {
      const updated = await supabaseService.getCurrentUser();
      setCurrentUser(updated);
    } catch {
      setCurrentUser(itdDb.getCurrentUser());
    }
    setTick((t) => t + 1);
  };

  if (!isInitialized) {
    return <div className="min-h-screen bg-black" />;
  }

  // Authentication Screen
  if (!currentUser) {
    return (
      <AuthScreen
        onSuccess={(user) => {
          setCurrentUser(user);
        }}
      />
    );
  }

  // Blocked Screen check: restricts access across the entire app
  if (currentUser.is_blocked && route.type !== 'support') {
    return (
      <BlockedScreen
        currentUser={currentUser}
        onLogout={handleLogout}
        onNavigateToSupport={() => navigate('/support')}
      />
    );
  }

  const unreadNotifs = itdDb.getNotifications(currentUser.id).filter((n) => !n.is_read).length;
  const unreadSupportCount = itdDb.getUnreadSupportTicketsCount(currentUser.id);
  const hasSupportTickets = itdDb.getSupportTickets(currentUser.id).length > 0;
  const supportQueueCount =
    currentUser.skills?.includes('support') ||
    currentUser.skills?.includes('support_management')
      ? itdDb
          .getSupportTickets()
          .filter((t) => t.status === 'open' || t.status === 'in_progress').length
      : 0;
  const moderationQueueCount = currentUser.skills?.includes('moderation')
    ? itdDb.getAllReports().length
    : 0;

  return (
    <div className="min-h-screen bg-black text-neutral-100 flex flex-col font-sans selection:bg-neutral-800 selection:text-white">
      {/* Global Right-Side Floating Toast Notifications */}
      <ToastContainer />

      {/* Mobile Top Header */}
      <header className="md:hidden sticky top-0 z-40 bg-black/90 backdrop-blur-md border-b border-neutral-900 px-4 h-14 flex items-center justify-between">
        <div
          onClick={() => navigate('/')}
          className="flex items-center space-x-2 cursor-pointer"
        >
          <span className="text-xl font-black text-white tracking-wider">ШУМ</span>
          <span className="text-xs text-neutral-500">v1.1.2</span>
        </div>
        <div className="flex items-center space-x-2">
          {unreadSupportCount > 0 && (
            <button
              onClick={() => navigate('/support')}
              className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-800 text-neutral-300 border border-neutral-700"
            >
              Помощь (+{unreadSupportCount})
            </button>
          )}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-neutral-400 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Main Layout Container (Three-column layout) */}
      <div className="flex-1 max-w-6xl w-full mx-auto flex relative justify-center">
        {/* Desktop Left Sidebar (Sticky) */}
        <div className="hidden md:block sticky top-0 h-screen overflow-y-auto">
          <Sidebar
            currentPath={currentPath}
            currentUser={currentUser}
            onNavigate={navigate}
            onOpenAuth={() => setCurrentUser(null)}
            onLogout={handleLogout}
            unreadCount={unreadNotifs}
            unreadSupportCount={unreadSupportCount}
            hasSupportTickets={hasSupportTickets}
            supportQueueCount={supportQueueCount}
            moderationQueueCount={moderationQueueCount}
          />
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-black/95 p-6 flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex justify-between items-center mb-6">
                <span className="text-xl font-bold text-white">ШУМ v1.1.2</span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-neutral-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <Sidebar
                currentPath={currentPath}
                currentUser={currentUser}
                onNavigate={navigate}
                onOpenAuth={() => {
                  setMobileMenuOpen(false);
                  setCurrentUser(null);
                }}
                onLogout={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                unreadCount={unreadNotifs}
                unreadSupportCount={unreadSupportCount}
                hasSupportTickets={hasSupportTickets}
                supportQueueCount={supportQueueCount}
                moderationQueueCount={moderationQueueCount}
              />
            </div>

            {/* Mobile Footer Links */}
            <div className="pt-6 border-t border-neutral-900 mt-6">
              <FooterLinks
                onNavigateToSupport={() => {
                  setMobileMenuOpen(false);
                  navigate('/support');
                }}
                onOpenLegal={(type) => {
                  setMobileMenuOpen(false);
                  setActiveLegalDoc(type);
                }}
                hasUnreadSupport={unreadSupportCount > 0}
              />
            </div>
          </div>
        )}

        {/* Central Feed / Content Column */}
        <main className="flex-1 min-w-0 max-w-2xl px-3 sm:px-6 py-4 sm:py-6 pb-28 md:pb-24">
          {route.type === 'feed' && (
            <FeedView
              currentUser={currentUser}
              onNavigateToProfile={(username) => navigate(`/@${username}`)}
              onNavigateToPost={(username, postNumber) =>
                navigate(`/@${username}/post_${postNumber}`)
              }
              onOpenReportModal={handleOpenReportModal}
              onOpenAuth={() => setCurrentUser(null)}
            />
          )}

          {route.type === 'search' && (
            <SearchView
              currentUser={currentUser}
              onNavigateToProfile={(username) => navigate(`/@${username}`)}
              onNavigateToPost={(username, postNumber) =>
                navigate(`/@${username}/post_${postNumber}`)
              }
              onOpenReportModal={handleOpenReportModal}
            />
          )}

          {route.type === 'notifications' && (
            <NotificationsView
              currentUser={currentUser}
              onNavigateToProfile={(username) => navigate(`/@${username}`)}
              onNavigateToPost={(username, postNumber) =>
                navigate(`/@${username}/post_${postNumber}`)
              }
            />
          )}

          {route.type === 'support' && (
            <SupportView
              currentUser={currentUser}
              initialTicketId={route.ticketId}
              onBackToFeed={() => navigate('/')}
              onTicketRead={() => setTick((t) => t + 1)}
            />
          )}

          {/* Skill 1: CRM Поддержки */}
          {route.type === 'crm_support' && (
            <SupportCrmView
              currentUser={currentUser}
              initialTicketId={route.ticketId}
              onNavigateToProfile={(username) => navigate(`/@${username}`)}
              onNavigateToTicketPath={(path) => navigate(path)}
              onNavigateToUserCard={(username) => navigate(`/@${username}#info`)}
            />
          )}

          {/* Skill 2: CRM Модератора */}
          {route.type === 'crm_moderation' && (
            <ModerationCrmView
              currentUser={currentUser}
              onNavigateToProfile={(username) => navigate(`/@${username}`)}
              onNavigateToPost={(username, postNumber) =>
                navigate(`/@${username}/post_${postNumber}`)
              }
            />
          )}

          {/* Skill 6: CRM noSpam (Автобаны по шаблонам-слепкам) */}
          {route.type === 'crm_nospam' && (
            <NoSpamAdminView
              currentUser={currentUser}
              onNavigateToProfile={(username) => navigate(`/@${username}`)}
              onBack={() => navigate('/')}
            />
          )}

          {/* Skill 4: Карточка пользователя (название.com/@{ник}#info) */}
          {route.type === 'user_card' && route.username && (
            <UserCardView
              targetUsername={route.username}
              currentUser={currentUser}
              onNavigateToProfile={(username) => navigate(`/@${username}`)}
              onBack={() => navigate(`/@${route.username}`)}
              onUserUpdated={handleUserUpdated}
              onNavigateToTicketPath={(path) => navigate(path)}
            />
          )}

          {route.type === 'profile' && route.username && (
            <ProfileView
              username={route.username}
              currentUser={currentUser}
              onNavigateToProfile={(username) => navigate(`/@${username}`)}
              onNavigateToPost={(username, postNumber) =>
                navigate(`/@${username}/post_${postNumber}`)
              }
              onNavigateToUserCard={(username) => navigate(`/@${username}#info`)}
              onOpenReportModal={handleOpenReportModal}
              onUserUpdated={handleUserUpdated}
            />
          )}

          {route.type === 'post' && route.username && route.postNumber && (
            <PostDetailView
              username={route.username}
              postNumber={route.postNumber}
              currentUser={currentUser}
              onBack={() => navigate('/')}
              onNavigateToProfile={(username) => navigate(`/@${username}`)}
              onOpenReportModal={handleOpenReportModal}
            />
          )}
        </main>

        {/* Desktop Right Column */}
        <div className="hidden lg:block w-64 shrink-0 px-4 py-6 sticky top-0 h-screen overflow-y-auto">
          <FooterLinks
            onNavigateToSupport={() => navigate('/support')}
            onOpenLegal={(type) => setActiveLegalDoc(type)}
            hasUnreadSupport={unreadSupportCount > 0}
          />
        </div>
      </div>

      {/* Post Reporting Modal */}
      {reportingPostId && currentUser && (
        <ReportModal
          isOpen={isReportOpen}
          onClose={() => {
            setIsReportOpen(false);
            setReportingPostId(null);
          }}
          postId={reportingPostId}
          reporterId={currentUser.id}
          onSuccess={() => {}}
        />
      )}

      {/* Legal Documents Modal */}
      <LegalModal
        type={activeLegalDoc}
        onClose={() => setActiveLegalDoc(null)}
      />

      {/* Native Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#121214]/95 backdrop-blur-xl border-t border-neutral-800/80 px-2 py-1.5 flex items-center justify-around safe-area-pb shadow-2xl">
        {/* Feed */}
        <button
          type="button"
          onClick={() => navigate('/')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
            route.type === 'feed'
              ? 'text-white font-semibold'
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <Archive className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Лента</span>
        </button>

        {/* Search */}
        <button
          type="button"
          onClick={() => navigate('/search')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
            route.type === 'search'
              ? 'text-white font-semibold'
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <Search className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Поиск</span>
        </button>

        {/* Notifications */}
        <button
          type="button"
          onClick={() => navigate('/notifications')}
          className={`relative flex flex-col items-center justify-center flex-1 py-1 transition ${
            route.type === 'notifications'
              ? 'text-white font-semibold'
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <div className="relative">
            <Bell className="w-5 h-5 mb-0.5" />
            {unreadNotifs > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400" />
            )}
          </div>
          <span className="text-[10px]">Уведомления</span>
        </button>

        {/* Support or CRM for staff */}
        <button
          type="button"
          onClick={() => {
            if (currentUser?.skills?.includes('support')) {
              navigate('/crm/support');
            } else if (currentUser?.skills?.includes('moderation')) {
              navigate('/crm/moderation');
            } else if (currentUser?.skills?.includes('no_spam')) {
              navigate('/crm/nospam');
            } else {
              navigate('/support');
            }
          }}
          className={`relative flex flex-col items-center justify-center flex-1 py-1 transition ${
            route.type === 'support' || route.type.startsWith('crm_')
              ? 'text-white font-semibold'
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <div className="relative">
            {currentUser?.skills && currentUser.skills.length > 0 ? (
              <ShieldAlert className="w-5 h-5 mb-0.5 text-neutral-300" />
            ) : (
              <LifeBuoy className="w-5 h-5 mb-0.5 text-neutral-400" />
            )}
            {currentUser?.skills && currentUser.skills.length > 0 ? (
              (supportQueueCount > 0 || moderationQueueCount > 0) && (
                <span className="absolute -top-1 -right-2 px-1 rounded-full text-[9px] font-bold bg-neutral-800 text-white border border-neutral-700">
                  {supportQueueCount + moderationQueueCount}
                </span>
              )
            ) : (
              unreadSupportCount > 0 && (
                <span className="absolute -top-1 -right-2 px-1 rounded-full text-[9px] font-bold bg-neutral-800 text-white border border-neutral-700">
                  +{unreadSupportCount}
                </span>
              )
            )}
          </div>
          <span className="text-[10px]">
            {currentUser?.skills && currentUser.skills.length > 0 ? 'CRM' : 'Помощь'}
          </span>
        </button>

        {/* Profile */}
        <button
          type="button"
          onClick={() => navigate(`/@${currentUser.username}`)}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
            route.type === 'profile' && route.username === currentUser.username
              ? 'text-white font-semibold'
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <div className="w-5 h-5 mb-0.5 rounded-full overflow-hidden flex items-center justify-center border border-neutral-700 bg-neutral-900">
            {currentUser.avatar_url ? (
              <img
                src={currentUser.avatar_url}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : currentUser.avatar_emoji ? (
              <span className="text-[12px] leading-none select-none flex items-center justify-center [font-family:'Apple_Color_Emoji','Segoe_UI_Emoji','Noto_Color_Emoji',sans-serif]">
                {currentUser.avatar_emoji}
              </span>
            ) : (
              <UserIcon className="w-3.5 h-3.5" />
            )}
          </div>
          <span className="text-[10px]">Профиль</span>
        </button>
      </nav>
    </div>
  );
}
