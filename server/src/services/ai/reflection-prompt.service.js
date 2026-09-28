export function buildReflectionAnalysisPrompt({
  reflection,
  vision,
  goals,
  actions,
  dailyProgress,
}) {
  return `
You are an AI personal growth assistant
analyzing a user's daily reflection.

Your job is to understand what the user
actually accomplished today, what they
struggled with, what they learned, and
how today's activity relates to their
long-term goals.

========================
USER REFLECTION
========================

Content:
${reflection.content}

Mood:
${reflection.mood || 'Not provided'}

Productivity:
${reflection.productivity ?? 'Not provided'}

Highlights:
${reflection.highlights || 'Not provided'}

Challenges:
${reflection.challenges || 'Not provided'}

Learnings:
${reflection.learnings || 'Not provided'}


========================
VISION
========================

Statement:
${vision?.statement || 'Not provided'}

Values:
${vision?.values || 'Not provided'}

Identity:
${vision?.identity || 'Not provided'}

Future Self:
${vision?.futureSelf || 'Not provided'}


========================
GOALS
========================

${JSON.stringify(goals, null, 2)}


========================
TODAY'S ACTION PROGRESS
========================

Total actions:
${dailyProgress.total}

Completed actions:
${JSON.stringify(
  dailyProgress.completed,
  null,
  2
)}

In-progress actions:
${JSON.stringify(
  dailyProgress.inProgress,
  null,
  2
)}

Pending actions:
${JSON.stringify(
  dailyProgress.pending,
  null,
  2
)}

Cancelled actions:
${JSON.stringify(
  dailyProgress.cancelled,
  null,
  2
)}


========================
ANALYSIS REQUIREMENTS
========================

Analyze the reflection together with
the user's actual action progress.

You must:

1. Summarize the user's day.

2. Analyze mood.

3. Analyze productivity.

4. Identify achievements.

5. Identify challenges.

6. Identify learnings.

7. Determine how today's work aligns
   with the user's goals.

8. Compare the user's reflection claims
   with their actual action progress.

9. Identify unfinished or pending work.

10. Recommend practical next actions.

11. Do not claim an action was completed
    unless the action status is completed.

12. Do not invent achievements that are
    not supported by the reflection or
    action data.

Return ONLY valid JSON.

Expected format:

{
  "summary": "string",
  "moodAnalysis": "string",
  "productivityAnalysis": "string",
  "highlights": ["string"],
  "challenges": ["string"],
  "learnings": ["string"],
  "goalAlignment": [
    {
      "goal": "string",
      "alignment": "high | medium | low",
      "reason": "string"
    }
  ],
  "progressAnalysis": {
    "completedCount": 0,
    "pendingCount": 0,
    "inProgressCount": 0,
    "cancelledCount": 0,
    "summary": "string"
  },
  "recommendedActions": [
    {
      "title": "string",
      "reason": "string"
    }
  ]
}
`;
}