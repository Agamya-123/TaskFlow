const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

// Parse .env file manually
const envPath = path.resolve(process.cwd(), '.env');
const envConfig = fs.readFileSync(envPath, 'utf-8');
let apiKey = '';
envConfig.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts[0]?.trim() === 'GEMINI_API_KEY') {
    apiKey = parts[1]?.trim().replace(/(^"|"$)/g, '').replace(/(^'|'$)/g, '') || '';
  }
});

if (!apiKey) {
  console.error('GEMINI_API_KEY not found in .env');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function run() {
  try {
    const list = await genAI.listModels();
    console.log('Available models:');
    for (const model of list.models) {
      if (model.supportedGenerationMethods.includes('generateContent')) {
        console.log(`- ${model.name}`);
      }
    }
  } catch (err) {
    console.error('Error listing models:', err);
  }
}

run();
