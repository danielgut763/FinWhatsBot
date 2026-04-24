import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

export type Expense = {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  month_key: string;
  installment_info: string | null;
  payment_method: string | null;
  created_at: string;
};

export type Card = {
  id: string;
  name: string;
  due_day: number;
};
