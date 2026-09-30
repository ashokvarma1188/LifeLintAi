import api from "./api";

const TOKEN_KEY = "token";
const USER_KEY = "user";

/* Both endpoints return { token, user }, so one helper persists either. */
function persistSession({ token, user }) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

/** Returns either { token, user } (persisted) or { requires2FA: true, userId, ... } for the caller to handle. */
export async function login({ email, password }) {
  const { data } = await api.post("/auth/login", { email, password });
  if (data.requires2FA) return data;
  return persistSession(data);
}

export async function verifyTwoFactor(userId, code) {
  const { data } = await api.post("/auth/verify-2fa", { userId, code });
  return persistSession(data);
}

export async function setTwoFactor(enable) {
  const { data } = await api.post("/auth/2fa", { enable });
  return data;
}

export async function logoutEverywhere() {
  const { data } = await api.post("/auth/logout-everywhere");
  return data;
}

/** `docFile` is an optional proof-of-registration document (org roles only) — sent as multipart when present. */
export async function register(form, docFile) {
  let body = form;
  if (docFile) {
    body = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (value !== undefined && value !== null) body.append(key, value);
    });
    body.append("pdf", docFile);
  }
  const { data } = await api.post("/auth/register", body);
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

export async function forgotPassword(email) {
  const { data } = await api.post("/auth/forgot-password", { email });
  return data;
}

export async function resetPassword(token, password) {
  const { data } = await api.post(`/auth/reset-password/${token}`, { password });
  return data;
}

export async function verifyEmail(token) {
  const { data } = await api.post(`/auth/verify-email/${token}`);
  return data;
}

export async function resendVerification() {
  const { data } = await api.post("/auth/resend-verification");
  return data;
}

/** Only works for the one hand-seeded demo account — every other user gets a 403. */
export async function demoSwitchRole(role) {
  const { data } = await api.post("/auth/demo-switch-role", { role });
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  return data.user;
}
