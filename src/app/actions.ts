'use server'

import { cookies } from 'next/headers';

import { supabase } from '@/lib/supabase';

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

import { revalidatePath } from 'next/cache';

export async function updateBalance(newBalance: number) {
  const { error } = await supabase.from('settings').upsert({ id: 1, balance: newBalance });
  if (error) {
    console.error("Supabase Error Update Balance:", error);
  }
  revalidatePath('/');
  return { success: !error, error };
}
