'use server'

import { cookies } from 'next/headers';

export async function login(password: string) {
  if (password === process.env.DASHBOARD_PASSWORD) {
    (await cookies()).set('auth', 'true', { secure: true, httpOnly: true, path: '/' });
    return { success: true };
  }
  return { success: false, error: 'Senha incorreta' };
}

export async function logout() {
  (await cookies()).delete('auth');
}
