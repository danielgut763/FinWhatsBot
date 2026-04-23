'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, LogOut, TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, Tag } from 'lucide-react';
import { Expense } from '@/lib/supabase';
import { logout } from '@/app/actions';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { format, subMonths, addMonths, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardProps {
  currentMonthKey: string;
  expenses: Expense[];
  balance: number;
}

const COLORS = ['#1D9E75', '#378ADD', '#D85A30', '#7F77DD', '#D4537E', '#639922', '#BA7517'];

export function Dashboard({ currentMonthKey, expenses, balance }: DashboardProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const currentDate = parse(currentMonthKey, 'yyyy-MM', new Date());
  const formattedMonth = format(currentDate, 'MMMM yyyy', { locale: ptBR });

  const totalExpenses = expenses.reduce((acc, curr) => acc + Number(curr.amount), 0);
  const remainingBalance = balance - totalExpenses;

  const handlePrevMonth = () => {
    const prev = subMonths(currentDate, 1);
    router.push(`/?month=${format(prev, 'yyyy-MM')}`);
  };

  const handleNextMonth = () => {
    const next = addMonths(currentDate, 1);
    router.push(`/?month=${format(next, 'yyyy-MM')}`);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    window.location.reload();
  };

  // Prepara dados para os gráficos
  const categoryTotals: Record<string, number> = {};
  expenses.forEach(e => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + Number(e.amount);
  });

  const pieData = Object.entries(categoryTotals)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-zinc-950" />
            </div>
            <span className="font-bold text-lg tracking-tight">FinTrack</span>
          </div>
          <button 
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="p-2 text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        
        {/* Month Navigation */}
        <div className="flex items-center justify-between bg-zinc-900/40 p-2 rounded-2xl border border-zinc-800/50 backdrop-blur-sm w-max mx-auto">
          <button onClick={handlePrevMonth} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="w-40 text-center font-medium capitalize">{formattedMonth}</span>
          <button onClick={handleNextMonth} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-emerald-500/20"></div>
            <div className="flex items-center gap-3 text-zinc-400 mb-2">
              <TrendingUp className="w-5 h-5" />
              <h2 className="font-medium">Despesas do Mês</h2>
            </div>
            <p className="text-4xl font-bold tracking-tight text-zinc-100">
              R$ {totalExpenses.toFixed(2)}
            </p>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-teal-500/20"></div>
            <div className="flex items-center gap-3 text-zinc-400 mb-2">
              <Wallet className="w-5 h-5" />
              <h2 className="font-medium">Saldo Restante</h2>
            </div>
            <p className={`text-4xl font-bold tracking-tight ${remainingBalance < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              R$ {remainingBalance.toFixed(2)}
            </p>
          </div>
        </div>

        {expenses.length === 0 ? (
          <div className="text-center py-20 text-zinc-500 border border-dashed border-zinc-800 rounded-3xl">
            Nenhuma despesa registrada neste mês.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Charts */}
            <div className="lg:col-span-1 bg-zinc-900/30 border border-zinc-800/50 rounded-3xl p-6">
              <h3 className="font-medium mb-6 text-zinc-300">Por Categoria</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3 mt-4">
                {pieData.map((item, idx) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                      <span className="capitalize text-zinc-400">{item.name}</span>
                    </div>
                    <span className="font-medium">R$ {item.value.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="lg:col-span-2 bg-zinc-900/30 border border-zinc-800/50 rounded-3xl p-6">
              <h3 className="font-medium mb-6 text-zinc-300">Histórico</h3>
              <div className="space-y-4">
                {expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(exp => (
                  <div key={exp.id} className="flex items-center justify-between p-4 rounded-2xl bg-zinc-900/50 hover:bg-zinc-800/50 transition-colors border border-zinc-800/30">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                        <Tag className="w-4 h-4 text-zinc-400" />
                      </div>
                      <div>
                        <p className="font-medium text-zinc-200 capitalize">
                          {exp.category} 
                          {exp.installment_info && <span className="ml-2 text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">Parc: {exp.installment_info}</span>}
                        </p>
                        <p className="text-sm text-zinc-500">{exp.description || 'Sem descrição'} • {format(new Date(exp.date), 'dd/MM/yyyy')}</p>
                      </div>
                    </div>
                    <span className="font-semibold text-zinc-300">R$ {Number(exp.amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
