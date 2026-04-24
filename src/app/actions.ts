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

export async function updateExpense(id: string, amount: number, category: string, description: string, payment_method: string) {
  const { error } = await supabase.from('expenses').update({ amount, category, description, payment_method }).eq('id', id);
  if (error) {
    console.error("Supabase Error Update Expense:", error);
  }
  revalidatePath('/');
  return { success: !error, error };
}

export async function deleteExpense(id: string) {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) {
    console.error("Supabase Error Delete Expense:", error);
  }
  revalidatePath('/');
  return { success: !error, error };
}

export async function upsertCard(name: string, dueDay: number) {
  const { data, error } = await supabase.from('cards').upsert({ name, due_day: dueDay }, { onConflict: 'name' }).select().single();
  if (error) {
    console.error("Supabase Error Upsert Card:", error);
  }
  revalidatePath('/');
  return { success: !error, error, data };
}

export async function updateCard(id: string, oldName: string, newName: string, dueDay: number) {
  const { error } = await supabase.from('cards').update({ name: newName, due_day: dueDay }).eq('id', id);
  if (error) {
    console.error("Supabase Error Update Card:", error);
  } else if (oldName !== newName) {
    // Atualiza o histórico de gastos se o nome mudou
    const oldMethod = oldName.startsWith('cartao ') ? oldName : `cartao ${oldName}`;
    const newMethod = newName.startsWith('cartao ') ? newName : `cartao ${newName}`;
    await supabase.from('expenses').update({ payment_method: newMethod }).eq('payment_method', oldMethod);
  }
  revalidatePath('/');
  return { success: !error, error };
}

export async function deleteCard(id: string) {
  const { error } = await supabase.from('cards').delete().eq('id', id);
  if (error) {
    console.error("Supabase Error Delete Card:", error);
  }
  revalidatePath('/');
  return { success: !error, error };
}
