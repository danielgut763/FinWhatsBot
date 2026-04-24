import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf-8');
const keyMatch = env.split('\n').find(l => l.startsWith('GEMINI_API_KEY='));
const key = keyMatch ? keyMatch.split('=')[1].trim() : '';

async function run() {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
    const resp = await fetch(url);
    const data = await resp.json();
    console.log(data.models.map(m => m.name).join('\n'));
  } catch (e) {
    console.error("Erro:", e);
  }
}
run();
