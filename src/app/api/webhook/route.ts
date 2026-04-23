import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { processExpenseText, processExpenseAudio } from '@/lib/gemini';
import { addMonths, format } from 'date-fns';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function sendMessage(chatId: number, text: string) {
  if (!TELEGRAM_TOKEN) return;
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = body.message;

    if (!message) return NextResponse.json({ ok: true });

    const chatId = message.chat.id;
    let expenses = null;

    if (message.text) {
      if (message.text === '/start') {
        await sendMessage(chatId, "Olá! Sou o FinTrack Bot com IA. Mande seus gastos por texto ou áudio (ex: 'Gastei 50 no mercado') e eu registro pra você!");
        return NextResponse.json({ ok: true });
      }
      expenses = await processExpenseText(message.text);
    } else if (message.voice) {
      const fileId = message.voice.file_id;
      const fileUrlResp = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getFile?file_id=${fileId}`);
      const fileUrlData = await fileUrlResp.json();
      
      if (fileUrlData.ok) {
        const filePath = fileUrlData.result.file_path;
        const downloadUrl = `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${filePath}`;
        
        const audioResp = await fetch(downloadUrl);
        const audioBuffer = await audioResp.arrayBuffer();
        const base64Audio = Buffer.from(audioBuffer).toString('base64');
        
        expenses = await processExpenseAudio(base64Audio, 'audio/ogg');
      } else {
        await sendMessage(chatId, "Erro ao baixar o áudio do Telegram.");
        return NextResponse.json({ ok: true });
      }
    } else {
      await sendMessage(chatId, "Só entendo texto ou áudios de voz!");
      return NextResponse.json({ ok: true });
    }

    if (!expenses || !Array.isArray(expenses) || expenses.length === 0) {
      await sendMessage(chatId, "Não consegui identificar nenhum gasto nessa mensagem. Tente ser mais claro.");
      return NextResponse.json({ ok: true });
    }

    const date = new Date();
    
    for (const exp of expenses) {
      const amount = exp.amount;
      const category = exp.category;
      const desc = exp.description;
      const installments = exp.installments || 1;

      if (installments > 1) {
        const installmentAmount = amount / installments;
        for (let i = 0; i < installments; i++) {
          const futureDate = addMonths(date, i);
          const monthKey = format(futureDate, 'yyyy-MM');
          const installmentInfo = `${i + 1}/${installments}`;
          
          const { error } = await supabase.from('expenses').insert({
            amount: installmentAmount,
            category: category,
            description: desc,
            date: futureDate.toISOString().split('T')[0],
            month_key: monthKey,
            installment_info: installmentInfo
          });
          if (error) throw new Error("Erro no Supabase: " + JSON.stringify(error));
        }
        await sendMessage(chatId, `✅ Parcelado registrado!\n${category}: ${installments}x de R$ ${installmentAmount.toFixed(2)}\nTotal: R$ ${amount.toFixed(2)}`);
      } else {
        const monthKey = format(date, 'yyyy-MM');
        const { error } = await supabase.from('expenses').insert({
          amount: amount,
          category: category,
          description: desc,
          date: date.toISOString().split('T')[0],
          month_key: monthKey,
          installment_info: null
        });
        if (error) throw new Error("Erro no Supabase: " + JSON.stringify(error));
        await sendMessage(chatId, `✅ Gasto registrado!\nR$ ${amount.toFixed(2)} em ${category}.`);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
