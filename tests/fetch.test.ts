import { SupabaseClient } from '@supabase/supabase-js';
import unfetch from 'unfetch';
import { createAuthenticatedFetch } from '../src';

const supabase = {
  auth: {
    getSession: jest.fn(),
    setSession: jest.fn(),
    signOut: jest.fn(),
  },
} as unknown as SupabaseClient;

jest.mock('unfetch');

const authenticatedFetch = createAuthenticatedFetch(supabase);

describe('Fetch', () => {
  beforeEach(() => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: {
        session: {
          refresh_token: 'current_refresh_token',
          access_token: 'current_access_token',
        },
      },
    });

    (supabase.auth.setSession as jest.Mock).mockResolvedValue({
      data: {
        session: {
          refresh_token: 'new_refresh_token',
          access_token: 'new_access_token',
        },
      },
    });
  });

  it('appends the authorization header', async () => {
    await authenticatedFetch('http://api.com/example', { method: 'POST' });

    expect(unfetch).toHaveBeenCalledTimes(1);
    expect(unfetch).toHaveBeenCalledWith('http://api.com/example', {
      method: 'POST',
      headers: {
        Authorization: `Bearer current_access_token`,
      },
    });
  });

  it('does not append the authorization header if not defined', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: {},
    });

    await authenticatedFetch('http://api.com/example', { method: 'POST' });

    expect(unfetch).toHaveBeenCalledTimes(1);
    expect(unfetch).toHaveBeenCalledWith('http://api.com/example', {
      method: 'POST',
    });
  });

  it.each([401, 403])(
    'reauthenticates and retries if the first request fails with a %s',
    async (status) => {
      (unfetch as jest.Mock).mockResolvedValueOnce({ status });
      (unfetch as jest.Mock).mockResolvedValueOnce({ status: 200 });

      const res = await authenticatedFetch('http://api.com/example', {
        method: 'POST',
      });

      expect(res).toEqual({ status: 200 });

      expect(unfetch).toHaveBeenCalledTimes(2);
      expect(unfetch).toHaveBeenCalledWith('http://api.com/example', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer current_access_token',
        },
      });

      expect(supabase.auth.getSession).toHaveBeenCalledTimes(3);
      expect(supabase.auth.setSession).toHaveBeenCalledTimes(1);
      expect(supabase.auth.setSession).toHaveBeenCalledWith({
        refresh_token: 'current_refresh_token',
        access_token: 'current_access_token',
      });

      expect(supabase.auth.signOut).not.toHaveBeenCalled();
    },
  );

  it('signs out if the retry fails', async () => {
    (unfetch as jest.Mock).mockResolvedValue({ status: 401 });

    await expect(async () =>
      authenticatedFetch('http://api.com/example', {
        method: 'POST',
      }),
    ).rejects.toThrow('Unauthorized');

    expect(unfetch).toHaveBeenCalledTimes(2);
    expect(unfetch).toHaveBeenCalledWith('http://api.com/example', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer current_access_token',
      },
    });

    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it('signs out if the first request fails and no current session', async () => {
    (unfetch as jest.Mock).mockResolvedValue({ status: 401 });
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
    });

    await expect(async () =>
      authenticatedFetch('http://api.com/example', {
        method: 'POST',
      }),
    ).rejects.toThrow('Unauthorized');

    expect(unfetch).toHaveBeenCalledTimes(1);
    expect(unfetch).toHaveBeenCalledWith('http://api.com/example', {
      method: 'POST',
    });

    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it('signs out if the first request fails and no new session', async () => {
    (unfetch as jest.Mock).mockResolvedValue({ status: 401 });
    (supabase.auth.setSession as jest.Mock).mockResolvedValue({
      data: { session: null },
    });

    await expect(async () =>
      authenticatedFetch('http://api.com/example', {
        method: 'POST',
      }),
    ).rejects.toThrow('Unauthorized');

    expect(unfetch).toHaveBeenCalledTimes(1);
    expect(unfetch).toHaveBeenCalledWith('http://api.com/example', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer current_access_token',
      },
    });

    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});
