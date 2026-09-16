import { useEffect, useRef, useState } from 'react';
import { api } from '../utils/api-client';

export interface OAuthResult {
  orgId: string;
  nickname: string;
  loginUrl: string;
}

interface OAuthMessage {
  source?: string;
  ok?: boolean;
  orgId?: string;
  nickname?: string;
  loginUrl?: string;
  error?: string;
}

const OAUTH_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * OAuth web-server flow in a popup. The API callback page posts the result
 * back with `source: 'sf-migrator-oauth'`.
 *
 * Origin is intentionally not pinned: in dev the UI (:3000, via Vite proxy)
 * and the API (:3001, which serves the callback page) are different origins.
 * The `source` marker plus the random server-side `state` (consumed
 * single-use) authenticate the message. Serve UI + API from one origin in
 * production to tighten this further.
 */
export function useOAuthLogin() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const popupRef = useRef<Window | null>(null);

  useEffect(() => {
    const popup = popupRef.current;
    return () => {
      popup?.close();
    };
  }, []);

  async function login(loginUrl: string, nickname: string): Promise<OAuthResult> {
    setError(null);
    setBusy(true);
    try {
      const { url } = await api.get<{ url: string; state: string }>(
        `/api/auth/oauth-url?loginUrl=${encodeURIComponent(loginUrl)}&nickname=${encodeURIComponent(nickname)}`,
      );
      const popup = window.open(url, 'sf-migrator-oauth', 'width=560,height=720');
      if (!popup) throw new Error('Popup was blocked. Allow popups for this site and try again.');
      popupRef.current = popup;
      const win: Window = popup;
      return await new Promise<OAuthResult>((resolve, reject) => {
        const done = (): void => {
          clearTimeout(timeout);
          clearInterval(watcher);
          window.removeEventListener('message', onMessage);
          setBusy(false);
        };
        const timeout = setTimeout(() => {
          done();
          win.close();
          reject(new Error('OAuth timed out. Please try again.'));
        }, OAUTH_TIMEOUT_MS);
        const watcher = setInterval(() => {
          if (win.closed) {
            done();
            reject(new Error('Login window was closed before finishing.'));
          }
        }, 500);
        function onMessage(event: MessageEvent): void {
          const data = event.data as OAuthMessage | null;
          if (!data || data.source !== 'sf-migrator-oauth') return;
          done();
          win.close();
          if (data.ok && data.orgId) {
            resolve({
              orgId: data.orgId,
              nickname: data.nickname ?? nickname,
              loginUrl: data.loginUrl ?? loginUrl,
            });
          } else {
            reject(new Error(data.error ?? 'Salesforce login failed.'));
          }
        }
        window.addEventListener('message', onMessage);
      });
    } catch (err) {
      setBusy(false);
      setError((err as Error).message);
      throw err;
    }
  }

  return { login, busy, error };
}
