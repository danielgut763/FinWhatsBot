'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, LogOut, TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, Tag, Edit2, Check, X, Trash2, CreditCard, Settings2 } from 'lucide-react';
import { Expense, Card } from '@/lib/supabase';
import { logout, updateBalance, updateExpense, deleteExpense, upsertCard, updateCard, deleteCard } from '@/app/actions';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { format, subMonths, addMonths, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardProps {
  currentMonthKey: string;
  expenses: Expense[];
  balance: number;
  cards: Card[];
}

const COLORS = ['#1D9E75', '#378ADD', '#D85A30', '#7F77DD', '#D4537E', '#639922', '#BA7517'];

export function Dashboard({ currentMonthKey, expenses, balance, cards }: DashboardProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const [localBalance, setLocalBalance] = useState(balance);
  const [localExpenses, setLocalExpenses] = useState<Expense[]>(expenses);
  const [localCards, setLocalCards] = useState<Card[]>(cards);

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
  const [editExpenseData, setEditExpenseData] = useState({ amount: '', category: '', description: '', payment_method: '' });
  const [isSavingExpense, setIsSavingExpense] = useState(false);
  const [isDeletingExpense, setIsDeletingExpense] = useState(false);

  // Estados para configuração de cartões
  const [showCardConfig, setShowCardConfig] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editingCardOldName, setEditingCardOldName] = useState('');
  const [cardConfigName, setCardConfigName] = useState('');
  const [cardConfigDue, setCardConfigDue] = useState('');
  const [isSavingCard, setIsSavingCard] = useState(false);

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
    setEditExpenseData({ amount: exp.amount.toString(), category: exp.category, description: exp.description || '', payment_method: exp.payment_method || '' });
  };

  const handleSaveExpense = async () => {
    if (!editingExpenseId) return;
    setIsSavingExpense(true);
    const res = await updateExpense(editingExpenseId, Number(editExpenseData.amount), editExpenseData.category, editExpenseData.description, editExpenseData.payment_method);
    if (!res.success) {
      alert("Erro ao salvar despesa: " + JSON.stringify(res.error));
    } else {
      setLocalExpenses(prev => prev.map(e => e.id === editingExpenseId ? { ...e, amount: Number(editExpenseData.amount), category: editExpenseData.category, description: editExpenseData.description, payment_method: editExpenseData.payment_method } : e));
    }
    setIsSavingExpense(false);
    setEditingExpenseId(null);
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este gasto?")) return;
    setIsDeletingExpense(true);
    const res = await deleteExpense(id);
    if (!res.success) {
      alert("Erro ao excluir despesa: " + JSON.stringify(res.error));
    } else {
      setLocalExpenses(prev => prev.filter(e => e.id !== id));
      if (editingExpenseId === id) setEditingExpenseId(null);
    }
    setIsDeletingExpense(false);
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
  const cardTotals: Record<string, number> = {};
  
  localExpenses.forEach(e => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + Number(e.amount);
    
    if (e.payment_method && e.payment_method.toLowerCase() !== 'pix' && e.payment_method.toLowerCase() !== 'dinheiro' && e.payment_method.toLowerCase() !== 'outros') {
      const pm = e.payment_method.toLowerCase();
      cardTotals[pm] = (cardTotals[pm] || 0) + Number(e.amount);
    }
  });

  const pieData = Object.entries(categoryTotals)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const cardData = Object.entries(cardTotals)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const handleSaveCard = async () => {
    if (!cardConfigName || !cardConfigDue) return;
    setIsSavingCard(true);
    let res;
    let newCard = { id: editingCardId || Date.now().toString(), name: cardConfigName.toLowerCase(), due_day: Number(cardConfigDue) };
    
    if (editingCardId) {
      res = await updateCard(editingCardId, editingCardOldName, newCard.name, newCard.due_day);
    } else {
      res = await upsertCard(newCard.name, newCard.due_day);
    }

    if (!res.success) {
      alert("Erro ao salvar cartão: " + JSON.stringify(res.error));
    } else {
      setLocalCards(prev => {
        const filtered = prev.filter(c => c.id !== newCard.id && c.name !== newCard.name);
        return [...filtered, newCard];
      });
      // Update local expenses if payment method changed
      if (editingCardId && editingCardOldName !== newCard.name) {
        setLocalExpenses(prev => prev.map(e => {
          const oldMethod = editingCardOldName.startsWith('cartao ') ? editingCardOldName : `cartao ${editingCardOldName}`;
          if (e.payment_method === oldMethod) {
            return { ...e, payment_method: newCard.name.startsWith('cartao ') ? newCard.name : `cartao ${newCard.name}` };
          }
          return e;
        }));
      }
      setCardConfigName('');
      setCardConfigDue('');
      setEditingCardId(null);
      setEditingCardOldName('');
    }
    setIsSavingCard(false);
  };

  const handleEditCardClick = (card: Card) => {
    setEditingCardId(card.id);
    setEditingCardOldName(card.name);
    setCardConfigName(card.name);
    setCardConfigDue(card.due_day.toString());
  };

  const handleDeleteCardClick = async (cardId: string) => {
    if (!confirm("Tem certeza que deseja excluir as configurações deste cartão? Os gastos continuarão salvos, mas ele não terá mais vencimento configurado.")) return;
    const res = await deleteCard(cardId);
    if (!res.success) {
      alert("Erro ao excluir cartão: " + JSON.stringify(res.error));
    } else {
      setLocalCards(prev => prev.filter(c => c.id !== cardId));
    }
  };

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
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-emerald-500/20 pointer-events-none"></div>
            <div className="flex items-center gap-3 text-zinc-400 mb-2 relative z-10">
              <TrendingUp className="w-5 h-5" />
              <h2 className="font-medium">Despesas do Mês</h2>
            </div>
            <p className="text-4xl font-bold tracking-tight text-zinc-100 relative z-10">
              R$ {totalExpenses.toFixed(2)}
            </p>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-teal-500/20 pointer-events-none"></div>
            <div className="flex items-center gap-3 text-zinc-400 mb-2 relative z-10">
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

        {/* Card Configurations Modal/Section */}
        {showCardConfig && (
          <div className="bg-zinc-900/80 border border-zinc-800/50 rounded-3xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-zinc-300 flex items-center gap-2">
                <Settings2 className="w-4 h-4" /> Configurar Cartões
              </h3>
              <button onClick={() => setShowCardConfig(false)} className="p-1.5 hover:bg-zinc-800 rounded-md text-zinc-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input type="text" placeholder="Nome do cartão (ex: latam)" value={cardConfigName} onChange={e => setCardConfigName(e.target.value)} className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-teal-500" />
                  <input type="number" placeholder="Vencimento (ex: 15)" value={cardConfigDue} onChange={e => setCardConfigDue(e.target.value)} className="w-32 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-teal-500" />
                  <button onClick={handleSaveCard} disabled={isSavingCard} className="bg-teal-500 text-zinc-950 px-4 py-2 rounded-lg font-medium hover:bg-teal-400 transition-colors">
                    {editingCardId ? 'Atualizar' : 'Salvar'}
                  </button>
                  {editingCardId && (
                    <button onClick={() => { setEditingCardId(null); setCardConfigName(''); setCardConfigDue(''); }} className="bg-zinc-800 text-zinc-400 px-3 py-2 rounded-lg font-medium hover:bg-zinc-700 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="bg-zinc-950/50 rounded-xl p-4 border border-zinc-800/50">
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Cartões Cadastrados</h4>
                <div className="space-y-2">
                  {localCards.length === 0 ? <p className="text-sm text-zinc-600">Nenhum cartão cadastrado.</p> : 
                    localCards.map(c => (
                      <div key={c.id} className={`flex justify-between items-center text-sm p-1.5 rounded-md ${editingCardId === c.id ? 'bg-zinc-800/50 ring-1 ring-teal-500/50' : 'hover:bg-zinc-900/50'}`}>
                        <span className="capitalize text-zinc-300">{c.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded-full text-xs">Vence dia {c.due_day}</span>
                          <button onClick={() => handleEditCardClick(c)} className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-zinc-300 transition-colors" title="Editar">
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button onClick={() => handleDeleteCardClick(c.id)} className="p-1 hover:bg-red-500/20 rounded text-zinc-500 hover:text-red-400 transition-colors" title="Excluir">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          </div>
        )}

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

            {/* Cards Overview */}
            {cardData.length > 0 && (
              <div className="lg:col-span-1 bg-zinc-900/30 border border-zinc-800/50 rounded-3xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-medium text-zinc-300 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-500" /> Faturas no Mês
                  </h3>
                  <button onClick={() => setShowCardConfig(!showCardConfig)} className="p-1 hover:bg-zinc-800 rounded-md text-zinc-500 hover:text-zinc-300" title="Configurar Cartões">
                    <Settings2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  {cardData.map((item) => {
                    const cardConfig = localCards.find(c => c.name === item.name);
                    return (
                      <div key={item.name} className="flex flex-col gap-1 p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/30">
                        <div className="flex items-center justify-between">
                          <span className="capitalize text-zinc-300 font-medium">{item.name.replace('cartao ', '')}</span>
                          <span className="font-semibold text-zinc-100">R$ {item.value.toFixed(2)}</span>
                        </div>
                        {cardConfig ? (
                          <div className="text-xs text-zinc-500">
                            Vencimento: {String(cardConfig.due_day).padStart(2, '0')}/{currentMonthKey.split('-')[1]}/{currentMonthKey.split('-')[0]}
                          </div>
                        ) : (
                          <button onClick={() => { setCardConfigName(item.name); setShowCardConfig(true); }} className="text-xs text-teal-500/70 hover:text-teal-400 text-left transition-colors">
                            + Adicionar vencimento
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* List */}
            <div className={`lg:col-span-${cardData.length > 0 ? '1 lg:col-span-1' : '2'} bg-zinc-900/30 border border-zinc-800/50 rounded-3xl p-6`}>
              <h3 className="font-medium mb-6 text-zinc-300">Histórico</h3>
              <div className="space-y-4">
                {localExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(exp => (
                  <div key={exp.id} className="flex flex-col p-4 rounded-2xl bg-zinc-900/50 hover:bg-zinc-800/50 transition-colors border border-zinc-800/30 group">
                    {editingExpenseId === exp.id ? (
                      <div className="flex flex-col md:flex-row gap-3 w-full items-start md:items-center">
                        <div className="flex-1 w-full space-y-2">
                          <div className="flex flex-col md:flex-row gap-2">
                            <div className="w-full md:w-1/3">
                              <label className="text-xs text-zinc-500 mb-1 block pl-1">Categoria</label>
                              <input 
                                type="text" 
                                placeholder="Categoria"
                                value={editExpenseData.category}
                                onChange={e => setEditExpenseData({...editExpenseData, category: e.target.value})}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-teal-500"
                              />
                            </div>
                            <div className="w-full md:w-1/3">
                              <label className="text-xs text-zinc-500 mb-1 block pl-1">Método de Pgto</label>
                              <input 
                                type="text" 
                                placeholder="Método (Pix, Latam...)"
                                value={editExpenseData.payment_method}
                                onChange={e => setEditExpenseData({...editExpenseData, payment_method: e.target.value})}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-teal-500"
                              />
                            </div>
                            <div className="w-full md:w-1/3">
                              <label className="text-xs text-zinc-500 mb-1 block pl-1">Descrição</label>
                              <input 
                                type="text" 
                                placeholder="Descrição"
                                value={editExpenseData.description}
                                onChange={e => setEditExpenseData({...editExpenseData, description: e.target.value})}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-zinc-500 focus:outline-none focus:border-teal-500"
                              />
                            </div>
                          </div>
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
                          <button onClick={() => handleDeleteExpense(exp.id)} disabled={isDeletingExpense} className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors" title="Excluir gasto">
                            <Trash2 className="w-5 h-5" />
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
                              {exp.payment_method && exp.payment_method !== 'outros' && (
                                <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">{exp.payment_method}</span>
                              )}
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
