import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY environment variable is missing.' }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');

  try {
    let tasks;
    let project = null;

    if (projectId && projectId !== 'all') {
      project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { name: true, description: true }
      });
      tasks = await prisma.task.findMany({
        where: { projectId },
        include: {
          project: { select: { name: true } },
          assignee: { select: { name: true } },
          subtasks: true,
        }
      });
    } else {
      tasks = await prisma.task.findMany({
        include: {
          project: { select: { name: true } },
          assignee: { select: { name: true } },
          subtasks: true,
        }
      });
    }

    if (tasks.length === 0) {
      return NextResponse.json({ summary: "No tasks found in this project to generate a summary." });
    }

    const taskListString = tasks.map(t => {
      const subtaskStatus = t.subtasks.length > 0 
        ? ` (Checklist: ${t.subtasks.filter(s => s.isCompleted).length}/${t.subtasks.length} items complete)`
        : '';
      return `- Title: "${t.title}"
  Status: ${t.status}
  Priority: ${t.priority || 'MEDIUM'}
  Assignee: ${t.assignee?.name || 'Unassigned'}
  Due Date: ${t.dueDate ? new Date(t.dueDate).toISOString().split('T')[0] : 'None'}
  Project: ${t.project?.name || project?.name || 'Default Project'}${subtaskStatus}`;
    }).join('\n\n');

    const currentDate = new Date();
    const currentDateFormatted = currentDate.toISOString().split('T')[0];
    const currentDateStr = currentDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are an elite Agile Project Management Consultant.
The current date is ${currentDateStr} (formatted as YYYY-MM-DD: ${currentDateFormatted}).

Analyze the following active task data for the project "${project?.name || 'All Projects'}":

${taskListString}

Generate a concise, high-impact Executive Progress Summary report.
Make sure you include the correct current date (${currentDateStr}) under the title at the top of the report.
Compare each task's Due Date with the current date (${currentDateFormatted}) to identify if any tasks are overdue or approaching their deadline.

Structure your report with the following section headings exactly:
1. **Overall Progress Summary** (Provide progress completion metrics and percentages: e.g. X/Y tasks completed, checklist progress)
2. **Current Velocity & Highlights** (Describe what features are currently in progress or recently finished)
3. **Risk Analysis & Blockers** (Identify tasks that are high priority or overdue relative to the current date: ${currentDateFormatted}, and mention any potential resource bottlenecks)
4. **Agile Recommendations** (Provide 2-3 specific, tactical next steps to accelerate execution)

Format your response in beautiful, readable markdown. Keep the writing style premium, executive, professional, and engaging.`;

    const result = await model.generateContent(prompt);
    const summaryText = result.response.text();

    return NextResponse.json({ summary: summaryText });
  } catch (error: any) {
    console.error('Gemini AI Summary Error:', error);
    return NextResponse.json({ error: 'AI summary generation failed: ' + error.message }, { status: 500 });
  }
}
