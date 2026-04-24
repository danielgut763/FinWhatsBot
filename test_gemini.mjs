import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf-8');
const keyMatch = env.split('\n').find(l => l.startsWith('GEMINI_API_KEY='));
const key = keyMatch ? keyMatch.split('=')[1].trim() : '';

const genAI = new GoogleGenerativeAI(key);

const systemInstruction = `Você é um assistente financeiro de um bot do Telegram. 
Seu objetivo é extrair gastos (despesas) de textos ou áudios do usuário e formatá-los estritamente como JSON.
Sempre retorne APENAS um array JSON. Se não houver gasto, retorne um array vazio [].
A estrutura do objeto JSON deve ser:
{
  "amount": número (valor total, usando ponto para decimal),
  "category": string (em minúsculas, ex: comida, transporte, lazer, casa, saude, educacao. Se não souber, use "outros"),
  "description": string (breve descrição se houver),
  "installments": número (quantidade de parcelas, default 1),
  "payment_method": string (ex: "pix", "dinheiro", "cartao nubank", "cartao latam". Em minúsculas. Se não souber, use "outros"),
  "target_date": string (opcional, formato "YYYY-MM-DD". Preencha apenas se o usuário falar um mês específico ou data específica futura/passada. Ex: se ele disser "para maio", retorne o primeiro dia de maio do ano correspondente).
}
Exemplos:
User: "gastei 150 no mercado no pix"
[{"amount": 150.00, "category": "comida", "description": "mercado", "installments": 1, "payment_method": "pix"}]

User: "comprei uma tv de 1200 em 10x no cartao nubank para maio"
[{"amount": 1200.00, "category": "casa", "description": "tv", "installments": 10, "payment_method": "cartao nubank", "target_date": "2026-05-01"}]`;

const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash-lite',
  systemInstruction,
  generationConfig: {
    responseMimeType: "application/json",
  }
});

async function run() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const text = "25 de uber no nubank para maio";
    const result = await model.generateContent(`Hoje é ${today}. O usuário disse: "${text}"`);
    const resultText = result.response.text();
    console.log("TEXTO PURO:", resultText);
    
    // Testa o extrator
    const match = resultText.match(/\[[\s\S]*\]/);
    if (match) {
      console.log("JSON PARSEADO:", JSON.parse(match[0]));
    } else {
      const jsonString = resultText.replace(/```json\n?|\n?```/g, '').trim();
      console.log("JSON PARSEADO (FALLBACK):", JSON.parse(jsonString));
    }
  } catch (e) {
    console.error("ERRO DO GEMINI:", e);
  }
}
run();
