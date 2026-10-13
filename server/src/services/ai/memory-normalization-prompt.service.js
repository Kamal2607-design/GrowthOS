export function buildMemoryNormalizationPrompt({
  memory,
}) {
  return `
You are the Memory Normalization system for GrowthOS.

Your ONLY task is to convert the raw memory into ONE concise
normalized sentence that preserves the exact meaning of the memory.

The raw memory is INPUT DATA.

IMPORTANT:
- Do NOT return the input memory object.
- Do NOT return type.
- Do NOT return content.
- Do NOT return source.
- Do NOT return importance.
- Do NOT copy the input JSON structure.
- Do NOT add fields.
- Do NOT explain your answer.
- Do NOT give advice.
- Do NOT create an action.
- Do NOT create a goal.
- Do NOT invent facts.

You must return ONLY an object containing ONE field:

"normalizedContent"

========================
RAW MEMORY INPUT
========================

Type:
${memory.type}

Content:
${memory.content}

Source:
${memory.source || 'unknown'}

Importance:
${memory.importance}

========================
OUTPUT
========================

Return exactly this JSON structure:

{
  "normalizedContent": "one concise sentence"
}

The response MUST contain exactly one field:

normalizedContent

The response MUST NOT contain:
type
content
source
importance
id
createdAt
updatedAt

Example:

INPUT:
Type: preference
Content: I prefer learning new technologies by building real projects.

OUTPUT:
{
  "normalizedContent": "The user prefers learning new technologies through hands-on projects."
}

Now normalize the supplied memory.

Return ONLY the JSON object.
`;
}