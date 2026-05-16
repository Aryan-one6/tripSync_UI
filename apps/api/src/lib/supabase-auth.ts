import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

function getSupabaseClient() {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    throw new Error(
      'Supabase Auth is not configured: SUPABASE_URL and SUPABASE_ANON_KEY are required.',
    );
  }

  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

function getVerificationRedirectUrl() {
  return `${env.FRONTEND_URL}/login?verified=1`;
}

export async function sendSupabaseSignupVerificationEmail(input: {
  email: string;
  password: string;
  fullName: string;
}): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: getVerificationRedirectUrl(),
      data: {
        full_name: input.fullName,
      },
    },
  });

  if (error) {
    throw error;
  }
}

export async function resendSupabaseSignupVerificationEmail(email: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: getVerificationRedirectUrl(),
    },
  });

  if (error) {
    throw error;
  }
}

export async function isSupabaseEmailVerified(
  input: { email: string; password: string },
): Promise<boolean | null> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error) {
    if (error.code === 'email_not_confirmed') {
      return false;
    }
    return null;
  }

  // Session persistence is disabled for this server client, but sign out defensively.
  await supabase.auth.signOut().catch(() => undefined);
  return true;
}
