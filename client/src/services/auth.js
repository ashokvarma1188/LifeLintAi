import api from "./api";

const TOKEN_KEY = "token";
const USER_KEY = "user";

/* Both endpoints return { token, user }, so one helper persists either. */
function persistSession({ token, user }) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

export async function login({ email, password }) {
  const { data } = await api.post("/auth/login", { email, password });
  return persistSession(data);
}

export async function register(form) {
  const { data } = await api.post("/auth/register", form);
  return persistSession(data);
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    // A corrupted entry should not crash the app on boot.
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function isAuthenticated() {
  return Boolean(getToken());
}
