import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY environment variable is missing.' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { title, description } = body;

    if (!title) {
      return NextResponse.json({ error: 'Task title is required.' }, { status: 400 });
    }

    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are an expert technical product manager.
Given the following task details:
Title: "${title}"
Description: "${description || 'No description provided.'}"

Break down this task into 3 to 6 logical, actionable subtasks.
You must return the result strictly as a valid JSON array of objects, where each object has a "title" string and an "isCompleted" boolean (which should default to false).
Do not return any markdown formatting, explainers, or backticks (e.g. do not wrap in \`\`\`json). Return ONLY the raw JSON array.

Example:
[
  { "title": "Configure NextAuth callbacks", "isCompleted": false },
  { "title": "Implement JWT middleware", "isCompleted": false }
]`;

    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();

    // Clean up any markdown code blocks if the model wrapped the response
    if (text.startsWith('```')) {
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    }

    const subtasks = JSON.parse(text);
    return NextResponse.json(subtasks);
  } catch (error: any) {
    console.error('Gemini AI Breakdown Error:', error);
    return NextResponse.json({ error: 'AI generation failed: ' + error.message }, { status: 500 });
  }
}
