import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const DEFAULT_SUPABASE_URL = 'https://ioxqhmnwegxdqxbfhwzg.supabase.co';

const STORAGE_KEY_ANON_KEY = 'shum_supabase_anon_key';
const STORAGE_KEY_CUSTOM_URL = 'shum_supabase_custom_url';

/**
 * Returns current Supabase connection settings.
 * Priority: Environment variable (VITE_*) -> localStorage fallback.
 */
export function getSupabaseSettings(): {
  url: string;
  anonKey: string;
  isConfigured: boolean;
  source: 'env' | 'storage' | 'none';
} {
  const envUrl = (import.meta.env?.VITE_SUPABASE_URL as string | undefined)?.trim();
  const envKey = (import.meta.env?.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

  const storedUrl = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_CUSTOM_URL)?.trim() : null;
  const storedKey = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_ANON_KEY)?.trim() : null;

  const url = envUrl || storedUrl || DEFAULT_SUPABASE_URL;
  const anonKey = (envKey && envKey !== 'YOUR_SUPABASE_PUBLISHABLE_KEY') 
    ? envKey 
    : (storedKey || '');

  const isConfigured = Boolean(
    url && 
    anonKey && 
    anonKey !== 'YOUR_SUPABASE_PUBLISHABLE_KEY' &&
    anonKey.length > 20
  );

  const source = envKey && envKey !== 'YOUR_SUPABASE_PUBLISHABLE_KEY' 
    ? 'env' 
    : storedKey 
    ? 'storage' 
    : 'none';

  return { url, anonKey, isConfigured, source };
}

let cachedClient: SupabaseClient | null = null;
let cachedKeySignature = '';

/**
 * Returns the active Supabase client singleton, or null if key is not yet provided.
 */
export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey, isConfigured } = getSupabaseSettings();
  if (!isConfigured) return null;

  const signature = `${url}::${anonKey}`;
  if (cachedClient && cachedKeySignature === signature) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    cachedKeySignature = signature;
    return cachedClient;
  } catch (error) {
    console.error('[Supabase] Failed to initialize client:', error);
    return null;
  }
}

/**
 * Saves a user-provided publishable key to localStorage (runtime configuration).
 */
export function savePublishableKey(key: string): void {
  const clean = key.trim();
  if (clean) {
    localStorage.setItem(STORAGE_KEY_ANON_KEY, clean);
  } else {
    localStorage.removeItem(STORAGE_KEY_ANON_KEY);
  }
  cachedClient = null;
  cachedKeySignature = '';
}

/**
 * Tests connection to the remote Supabase project.
 */
export async function testSupabaseConnection(): Promise<{
  success: boolean;
  message: string;
  details?: string;
  hasTables?: boolean;
}> {
  const client = getSupabaseClient();
  const settings = getSupabaseSettings();

  if (!settings.isConfigured || !client) {
    return {
      success: false,
      message: 'Publishable Key отсутствует. Добавьте VITE_SUPABASE_ANON_KEY.',
    };
  }

  try {
    // 1. Probe profiles table
    const { data, error } = await client
      .from('profiles')
      .select('id')
      .limit(1);

    if (error) {
      // Check if table does not exist yet (PGRST204 or 42P01)
      if (
        error.code === '42P01' || 
        error.message?.includes('does not exist') ||
        error.message?.includes('relation "public.profiles"')
      ) {
        return {
          success: true,
          hasTables: false,
          message: 'Подключение к Supabase успешно! Таблицы ещё не созданы (требуется SQL-миграция).',
          details: error.message,
        };
      }

      // Check invalid key
      if (error.code === 'PGRST301' || error.message?.includes('JWT') || error.message?.includes('apikey')) {
        return {
          success: false,
          message: 'Неверный API-ключ (Publishable / Anon key). Проверьте ключ в Supabase Dashboard.',
          details: error.message,
        };
      }

      return {
        success: false,
        message: `Ошибка Supabase: ${error.message}`,
        details: error.details || error.hint || error.code,
      };
    }

    return {
      success: true,
      hasTables: true,
      message: 'Успешное подключение к базе данных Supabase! Таблицы готовы к работе.',
    };
  } catch (err: any) {
    return {
      success: false,
      message: 'Сетевая ошибка при обращении к Supabase.',
      details: err?.message || String(err),
    };
  }
}
