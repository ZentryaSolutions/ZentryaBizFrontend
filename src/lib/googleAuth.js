/** Google Identity Services — load once, render sign-in button. */

const GSI_SCRIPT = 'https://accounts.google.com/gsi/client';

let scriptPromise = null;
let initializedClientId = '';
let activeCredentialCallback = null;

export function getGoogleClientId() {
  return String(process.env.REACT_APP_GOOGLE_CLIENT_ID || '').trim();
}

export function isGoogleSignInConfigured() {
  return Boolean(getGoogleClientId());
}

export function loadGoogleIdentityScript() {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GSI_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Google script failed')));
      if (window.google?.accounts?.id) resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = GSI_SCRIPT;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Could not load Google sign-in'));
    document.head.appendChild(s);
  });

  return scriptPromise;
}

/**
 * @param {HTMLElement} container
 * @param {(credential: string) => void} onCredential
 */
export async function mountGoogleSignInButton(container, onCredential) {
  const clientId = getGoogleClientId();
  if (!clientId || !container) return false;

  await loadGoogleIdentityScript();

  activeCredentialCallback = onCredential;
  if (initializedClientId !== clientId) {
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => {
        if (response?.credential) activeCredentialCallback?.(response.credential);
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    });
    initializedClientId = clientId;
  }

  container.innerHTML = '';
  window.google.accounts.id.renderButton(container, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    text: 'continue_with',
    shape: 'pill',
    width: Math.min(400, container.offsetWidth || 360),
  });

  return true;
}
