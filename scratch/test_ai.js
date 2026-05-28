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

const models = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-pro',
  'gemini-2.5-pro'
];

async function run() {
  for (const modelName of models) {
    try {
      console.log(`Testing model: ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Say hello');
      console.log(`\n🎉 SUCCESS with "${modelName}":`, result.response.text().trim());
      return;
    } catch (err) {
      console.error(`❌ FAILED with "${modelName}":`, err.message);
    }
  }
}

run();
