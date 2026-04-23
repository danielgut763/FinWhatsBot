import { cookies } from 'next/headers';
import { supabase, Expense } from '@/lib/supabase';
import { Login } from '@/components/Login';
import { Dashboard } from '@/components/Dashboard';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function Home(props: { searchParams: Promise<{ month?: string }> }) {
  const cookieStore = await cookies();
  const auth = cookieStore.get('auth');

  if (!auth || auth.value !== 'true') {
    return <Login />;
  }

  const resolvedSearchParams = await props.searchParams;
  const currentMonthKey = resolvedSearchParams.month || format(new Date(), 'yyyy-MM');

  // Busca despesas do mês no Supabase
  const { data: expenses } = await supabase
    .from('expenses')
    .select('*')
    .eq('month_key', currentMonthKey)
    .order('date', { ascending: false });

  const { data: settings } = await supabase
    .from('settings')
    .select('balance')
    .eq('id', 1)
    .single();

  const balance = settings?.balance || 0;

  return (
    <Dashboard 
      currentMonthKey={currentMonthKey} 
      expenses={(expenses as Expense[]) || []} 
      balance={balance} 
    />
  );
}
