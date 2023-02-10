import fetch from 'unfetch';
import { SupabaseClient } from '@supabase/supabase-js';

type UnfetchRequestInit = {
  method?: string;
  headers?: Record<string, string>;
  credentials?: 'include' | 'omit';
  body?: Parameters<XMLHttpRequest['send']>[0];
};

type UnfetchResponse = {
  ok: boolean;
  statusText: string;
  status: number;
  url: string;
  text: () => Promise<string>;
  json: () => Promise<any>;
  blob: () => Promise<Blob>;
  clone: () => UnfetchResponse;
  headers: {
    keys: () => string[];
    entries: () => Array<[string, string]>;
    get: (key: string) => string | undefined;
    has: (key: string) => boolean;
  };
};

const getOptionsWithAuth = async (
  supabase: SupabaseClient,
  options?: UnfetchRequestInit,
) => {
  const {
    data: { session: currentSession },
  } = await supabase.auth.getSession();

  const token = currentSession?.access_token;

  if (!token) {
    return options;
  }

  return {
    ...options,
    headers: {
      ...options?.headers,
      Authorization: `Bearer ${token}`,
    },
  };
};

/**
 * If an API call fails attempt to refresh the session and retry.
 */
export const createAuthenticatedFetch = (supabase: SupabaseClient) => {
  const signOut = async () => {
    await supabase.auth.signOut();

    throw new Error('Unauthorized');
  };

  const handleAuth = async () => {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();

    if (!currentSession) {
      await signOut();

      return;
    }

    const {
      data: { session: newSession },
    } = await supabase.auth.setSession(currentSession);

    if (!newSession?.access_token) {
      await signOut();
    }
  };

  const authenticatedFetch = async (
    url: string,
    options?: UnfetchRequestInit,
    _retried?: boolean,
  ): Promise<UnfetchResponse> => {
    const init = await getOptionsWithAuth(supabase, options);
    const res = await fetch(url, init);

    if (res?.status && [401, 403].includes(res.status)) {
      if (_retried) {
        await signOut();
      }

      await handleAuth();

      return authenticatedFetch(url, options, true);
    }

    return res;
  };

  return authenticatedFetch;
};
