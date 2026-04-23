import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf-8');
const keyMatch = env.split('\n').find(l => l.startsWith('GEMINI_API_KEY='));
const key = keyMatch ? keyMatch.split('=')[1].trim() : '';

async function listModels() {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
  const data = await res.json();
  if (data.models) {
    console.log(data.models.map(m => m.name).join('\n'));
  } else {
    console.log(data);
  }
}

listModels();
