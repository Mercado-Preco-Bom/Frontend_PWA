import axios from 'axios';

const USER_KEY = '@PrecoBom:user';
const TOKEN_KEY = '@PrecoBom:token';
const EXPIRES_KEY = '@PrecoBom:expiresAt';

// Quantos dias a conta fica salva depois do último uso do app.
export const SESSION_DAYS = 7;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

export interface StoredUser {
  id?: string;
  name?: string;
  role?: string;
  [key: string]: unknown;
}

export function clearSession() {
  [localStorage, sessionStorage].forEach(s => {
    s.removeItem(USER_KEY);
    s.removeItem(TOKEN_KEY);
    s.removeItem(EXPIRES_KEY);
  });
  delete axios.defaults.headers.common['Authorization'];
}

export function saveSession(user: StoredUser, token?: string) {
  clearSession();
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
  localStorage.setItem(EXPIRES_KEY, String(Date.now() + SESSION_MS));
}

/**
 * Retorna o usuário salvo (ou null se não há sessão / expirou).
 * Cada vez que o app abre, a validade é renovada por mais 7 dias
 * (quem usa o app toda semana nunca precisa logar de novo).
 */
export function getSession(): StoredUser | null {
  const userStr = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
  if (!userStr) return null;

  const expiresAt = Number(localStorage.getItem(EXPIRES_KEY));
  // Sessões antigas (sem data de validade) ganham 7 dias a partir de agora.
  if (expiresAt && Date.now() > expiresAt) {
    clearSession();
    return null;
  }

  try {
    const user = JSON.parse(userStr) as StoredUser;
    const token = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
    if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    if (localStorage.getItem(USER_KEY)) {
      localStorage.setItem(EXPIRES_KEY, String(Date.now() + SESSION_MS));
    }
    return user;
  } catch {
    clearSession();
    return null;
  }
}

/** Se o servidor recusar o token (401), desloga e volta para o login. */
export function setupAuthInterceptor() {
  axios.interceptors.response.use(
    res => res,
    error => {
      const url: string = error?.config?.url || '';
      if (error?.response?.status === 401 && !url.includes('/users/login')) {
        clearSession();
        if (window.location.pathname !== '/login') window.location.replace('/login');
      }
      return Promise.reject(error);
    }
  );
}

/** Pede ao navegador para não apagar os dados do app (evita perder o login). */
export function requestPersistentStorage() {
  try {
    navigator.storage?.persist?.();
  } catch {
    /* ignora */
  }
}

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  CASHIER: 'Caixa',
  CAIXA: 'Caixa',
  DRIVER: 'Motorista',
  MOTORISTA: 'Motorista',
};

export const getRoleLabel = (role?: string) =>
  (role && ROLE_LABELS[role.toUpperCase()]) || role || '-';
