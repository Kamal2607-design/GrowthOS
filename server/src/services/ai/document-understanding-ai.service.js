import { generateWithQwen } from './qwen.service.js';

import {
  buildDocumentUnderstandingPrompt,
} from './document-understanding-prompt.service.js';


export async function analyzeDocument(
  document
) {
  const prompt =
    buildDocumentUnderstandingPrompt({
      document,
    });


  const result =
    await generateWithQwen(
      prompt
    );


  let parsed;

  try {

    parsed =
      JSON.parse(
        result.response
      );

  } catch (error) {

    throw new Error(
      'Qwen returned an invalid document understanding JSON response.'
    );
  }


  if (!parsed) {
    throw new Error(
      'Qwen returned an empty document understanding response.'
    );
  }


  if (
    typeof parsed.documentType !==
    'string'
  ) {
    throw new Error(
      'Invalid documentType in Qwen response.'
    );
  }


  if (
    typeof parsed.title !==
    'string'
  ) {
    throw new Error(
      'Invalid title in Qwen response.'
    );
  }


  if (
    typeof parsed.summary !==
    'string'
  ) {
    throw new Error(
      'Invalid summary in Qwen response.'
    );
  }


  if (
    !Array.isArray(
      parsed.topics
    )
  ) {
    throw new Error(
      'Invalid topics in Qwen response.'
    );
  }


  if (
    !Array.isArray(
      parsed.keyPoints
    )
  ) {
    throw new Error(
      'Invalid keyPoints in Qwen response.'
    );
  }


  if (
    !Array.isArray(
      parsed.insights
    )
  ) {
    throw new Error(
      'Invalid insights in Qwen response.'
    );
  }


  if (
    !Array.isArray(
      parsed.candidateMemories
    )
  ) {
    throw new Error(
      'Invalid candidateMemories in Qwen response.'
    );
  }


  if (
    !Array.isArray(
      parsed.candidateGoals
    )
  ) {
    throw new Error(
      'Invalid candidateGoals in Qwen response.'
    );
  }


  if (
    !Array.isArray(
      parsed.candidateActions
    )
  ) {
    throw new Error(
      'Invalid candidateActions in Qwen response.'
    );
  }


  return {
    documentType:
      parsed.documentType,

    title:
      parsed.title,

    summary:
      parsed.summary,

    topics:
      parsed.topics,

    keyPoints:
      parsed.keyPoints,

    insights:
      parsed.insights,

    candidateMemories:
      parsed.candidateMemories.map(
        (memory) => ({
          content:
            memory.content,

          importance:
            Number.isInteger(
              memory.importance
            )
              ? memory.importance
              : 1,
        })
      ),

    candidateGoals:
      parsed.candidateGoals.map(
        (goal) => ({
          title:
            goal.title,

          reason:
            goal.reason,
        })
      ),

    candidateActions:
      parsed.candidateActions.map(
        (action) => ({
          title:
            action.title,

          reason:
            action.reason,
        })
      ),
  };
}