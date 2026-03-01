import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'homebase_token';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: string;
  orgId: number;
}

export async function loginUser(email: string, password: string): Promise<AuthUser> {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? 'Login failed');
  }

  const { user, token } = await res.json();
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  return user;
}

export async function signupUser(
  name: string,
  email: string,
  password: string,
  orgName: string
): Promise<AuthUser> {
  const res = await fetch(`${API_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, orgName }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? 'Signup failed');
  }

  const { user, token } = await res.json();
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  return user;
}

export async function logoutUser(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function getStoredToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getMe(): Promise<AuthUser | null> {
  const token = await getStoredToken();
  if (!token) return null;

  const res = await fetch(`${API_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return null;
  const { user } = await res.json();
  return user;
}
