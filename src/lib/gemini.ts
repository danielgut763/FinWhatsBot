import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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
  model: 'gemini-flash-latest',
  systemInstruction,
  generationConfig: {
    responseMimeType: "application/json",
  }
});

export async function processExpenseText(text: string) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const result = await model.generateContent(`Hoje é ${today}. O usuário disse: "${text}"`);
    return extractJSON(result.response.text());
  } catch (error) {
    console.error("Erro ao processar com Gemini:", error);
    return null;
  }
}

export async function processExpenseAudio(base64Audio: string, mimeType: string) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Audio,
          mimeType: mimeType
        }
      },
      `Hoje é ${today}. Ouça o áudio e extraia as informações de gasto conforme as instruções de sistema em JSON.`
    ]);
    return extractJSON(result.response.text());
  } catch (error) {
    console.error("Erro ao processar áudio com Gemini:", error);
    return null;
  }
}

function extractJSON(text: string) {
  try {
    // Tenta encontrar um array no meio do texto
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      return JSON.parse(match[0]);
    }
    const jsonString = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(jsonString);
  } catch (e) {
    console.error("Falha no JSON. Recebido:", text);
    throw e;
  }
}
