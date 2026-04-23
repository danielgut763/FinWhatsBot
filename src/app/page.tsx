import { cookies } from 'next/headers';
import { supabase, Expense } from '@/lib/supabase';
import { Login } from '@/components/Login';
import { Dashboard } from '@/components/Dashboard';
import { format } from 'date-fns';

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

  // Busca o saldo do usuário (como não temos tabela de saldo no MVP, fixamos um valor ou buscamos de um DB.
  // Vamos fixar um valor inicial de 5000 para demonstração)
  const balance = 5000;

  return (
    <Dashboard 
      currentMonthKey={currentMonthKey} 
      expenses={(expenses as Expense[]) || []} 
      balance={balance} 
    />
  );
}
