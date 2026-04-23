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
  "installments": número (quantidade de parcelas, default 1)
}
Exemplos:
User: "gastei 150 no mercado"
[{"amount": 150.00, "category": "comida", "description": "mercado", "installments": 1}]

User: "comprei uma tv de 1200 em 10x"
[{"amount": 1200.00, "category": "casa", "description": "tv", "installments": 10}]`;

const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
  systemInstruction,
  generationConfig: {
    responseMimeType: "application/json",
  }
});

export async function processExpenseText(text: string) {
  try {
    const result = await model.generateContent(text);
    return extractJSON(result.response.text());
  } catch (error) {
    console.error("Erro ao processar com Gemini:", error);
    return null;
  }
}

export async function processExpenseAudio(base64Audio: string, mimeType: string) {
  try {
    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Audio,
          mimeType: mimeType
        }
      },
      "Ouça o áudio e extraia as informações de gasto conforme as instruções de sistema em JSON."
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
