import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf-8');
const keyMatch = env.split('\n').find(l => l.startsWith('GEMINI_API_KEY='));
const key = keyMatch ? keyMatch.split('=')[1].trim() : '';

const genAI = new GoogleGenerativeAI(key);

const systemInstruction = `Você é um assistente financeiro de um bot do Telegram. 
Seu objetivo é extrair gastos (despesas) de textos ou áudios do usuário e formatá-los estritamente como JSON.
Sempre retorne APENAS um array JSON. Se não houver gasto, retorne array vazio [].
A estrutura deve ser:
{ "amount": number, "category": string, "description": string, "installments": number }`;

const model = genAI.getGenerativeModel({
  model: 'gemini-flash-latest',
  systemInstruction,
  generationConfig: {
    responseMimeType: "application/json",
  }
});

async function run() {
  try {
    const result = await model.generateContent("gastei 50 reais de uber");
    const text = result.response.text();
    console.log("TEXTO PURO:", text);
    
    // Testa o extrator
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      console.log("JSON PARSEADO:", JSON.parse(match[0]));
    } else {
      const jsonString = text.replace(/```json\n?|\n?```/g, '').trim();
      console.log("JSON PARSEADO (FALLBACK):", JSON.parse(jsonString));
    }
  } catch (e) {
    console.error("ERRO DO GEMINI:", e);
  }
}
run();
