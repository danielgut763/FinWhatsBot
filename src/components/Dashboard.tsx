'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, LogOut, TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, Tag, Edit2, Check, X } from 'lucide-react';
import { Expense } from '@/lib/supabase';
import { logout, updateBalance, updateExpense } from '@/app/actions';
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
  
  const [localBalance, setLocalBalance] = useState(balance);
  const [localExpenses, setLocalExpenses] = useState<Expense[]>(expenses);

  useEffect(() => {
    setLocalBalance(balance);
    setLocalExpenses(expenses);
    setEditBalanceValue(balance.toString());
  }, [balance, expenses]);

  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [editBalanceValue, setEditBalanceValue] = useState(balance.toString());
  const [isSavingBalance, setIsSavingBalance] = useState(false);

  // Estados para edição de despesa
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editExpenseData, setEditExpenseData] = useState({ amount: '', category: '', description: '' });
  const [isSavingExpense, setIsSavingExpense] = useState(false);

  const handleSaveBalance = async () => {
    setIsSavingBalance(true);
    const newBal = Number(editBalanceValue);
    const res = await updateBalance(newBal);
    if (!res.success) {
      alert("Erro ao salvar saldo: " + JSON.stringify(res.error));
    } else {
      setLocalBalance(newBal);
    }
    setIsSavingBalance(false);
    setIsEditingBalance(false);
  };

  const handleEditExpense = (exp: Expense) => {
    setEditingExpenseId(exp.id);
    setEditExpenseData({ amount: exp.amount.toString(), category: exp.category, description: exp.description || '' });
  };

  const handleSaveExpense = async () => {
    if (!editingExpenseId) return;
    setIsSavingExpense(true);
    const res = await updateExpense(editingExpenseId, Number(editExpenseData.amount), editExpenseData.category, editExpenseData.description);
    if (!res.success) {
      alert("Erro ao salvar despesa: " + JSON.stringify(res.error));
    } else {
      setLocalExpenses(prev => prev.map(e => e.id === editingExpenseId ? { ...e, amount: Number(editExpenseData.amount), category: editExpenseData.category, description: editExpenseData.description } : e));
    }
    setIsSavingExpense(false);
    setEditingExpenseId(null);
  };

  const currentDate = parse(currentMonthKey, 'yyyy-MM', new Date());
  const formattedMonth = format(currentDate, 'MMMM yyyy', { locale: ptBR });

  const totalExpenses = localExpenses.reduce((acc, curr) => acc + Number(curr.amount), 0);
  const remainingBalance = localBalance - totalExpenses;

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
  localExpenses.forEach(e => {
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
              {!isEditingBalance && (
                <button onClick={() => setIsEditingBalance(true)} className="ml-auto p-1.5 hover:bg-zinc-800 rounded-md transition-colors text-zinc-500 hover:text-zinc-300" title="Editar saldo base">
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
            </div>
            {isEditingBalance ? (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-bold text-zinc-400">R$</span>
                <input 
                  type="number" 
                  value={editBalanceValue}
                  onChange={e => setEditBalanceValue(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-2xl font-bold text-zinc-100 w-32 focus:outline-none focus:border-teal-500"
                  autoFocus
                />
                <button onClick={handleSaveBalance} disabled={isSavingBalance} className="p-1.5 bg-teal-500/20 text-teal-400 hover:bg-teal-500/30 rounded-lg transition-colors">
                  <Check className="w-5 h-5" />
                </button>
                <button onClick={() => setIsEditingBalance(false)} className="p-1.5 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <p className={`text-4xl font-bold tracking-tight ${remainingBalance < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                R$ {remainingBalance.toFixed(2)}
              </p>
            )}
          </div>
        </div>

        {localExpenses.length === 0 ? (
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
                      formatter={(value: any) => `R$ ${Number(value).toFixed(2)}`}
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
                {localExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(exp => (
                  <div key={exp.id} className="flex flex-col p-4 rounded-2xl bg-zinc-900/50 hover:bg-zinc-800/50 transition-colors border border-zinc-800/30 group">
                    {editingExpenseId === exp.id ? (
                      <div className="flex flex-col md:flex-row gap-3 w-full items-start md:items-center">
                        <div className="flex-1 w-full space-y-2">
                          <input 
                            type="text" 
                            placeholder="Categoria"
                            value={editExpenseData.category}
                            onChange={e => setEditExpenseData({...editExpenseData, category: e.target.value})}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-teal-500"
                          />
                          <input 
                            type="text" 
                            placeholder="Descrição"
                            value={editExpenseData.description}
                            onChange={e => setEditExpenseData({...editExpenseData, description: e.target.value})}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-zinc-500 focus:outline-none focus:border-teal-500"
                          />
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto">
                          <span className="font-semibold text-zinc-400">R$</span>
                          <input 
                            type="number" 
                            value={editExpenseData.amount}
                            onChange={e => setEditExpenseData({...editExpenseData, amount: e.target.value})}
                            className="w-24 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-sm font-semibold text-zinc-100 focus:outline-none focus:border-teal-500"
                          />
                          <button onClick={handleSaveExpense} disabled={isSavingExpense} className="p-1.5 bg-teal-500/20 text-teal-400 hover:bg-teal-500/30 rounded-lg transition-colors">
                            <Check className="w-5 h-5" />
                          </button>
                          <button onClick={() => setEditingExpenseId(null)} className="p-1.5 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 rounded-lg transition-colors">
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                            <Tag className="w-4 h-4 text-zinc-400" />
                          </div>
                          <div>
                            <p className="font-medium text-zinc-200 capitalize flex items-center gap-2">
                              {exp.category} 
                              {exp.installment_info && <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">Parc: {exp.installment_info}</span>}
                            </p>
                            <p className="text-sm text-zinc-500">{exp.description || 'Sem descrição'} • {format(new Date(exp.date), 'dd/MM/yyyy')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-semibold text-zinc-300">R$ {Number(exp.amount).toFixed(2)}</span>
                          <button onClick={() => handleEditExpense(exp)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-zinc-800 rounded-md transition-all text-zinc-500 hover:text-zinc-300" title="Editar gasto">
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
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
