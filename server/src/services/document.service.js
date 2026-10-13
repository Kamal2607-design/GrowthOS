import { db } from '../prisma/db.ts';
import { createGoal } from './goal.service.js';
import { createAction } from './action.service.js';

export async function createDocument(
  userId,
  {
    fileName,
    filePath,
    mimeType,
    fileSize,
  }
) {
  if (!fileName || !fileName.trim()) {
    throw new Error('DOCUMENT_FILE_NAME_REQUIRED');
  }

  if (!filePath || !filePath.trim()) {
    throw new Error('DOCUMENT_FILE_PATH_REQUIRED');
  }

  if (!mimeType || !mimeType.trim()) {
    throw new Error('DOCUMENT_MIME_TYPE_REQUIRED');
  }

  if (
    fileSize === undefined ||
    fileSize === null ||
    !Number.isInteger(fileSize) ||
    fileSize < 0
  ) {
    throw new Error('INVALID_DOCUMENT_FILE_SIZE');
  }

  const document =
    await db.orm.public.Document.create({
      userId,

      fileName: fileName.trim(),
      filePath: filePath.trim(),
      mimeType: mimeType.trim(),
      fileSize,

      processingStatus: 'pending',

      extractedText: null,
      extractionMethod: null,
      summary: null,
      structuredData: null,
    });

  return document;
}


export async function getDocuments(userId) {
  return await db.orm.public.Document
    .where({
      userId,
    })
    .all();
}


export async function getDocumentById(
  userId,
  documentId
) {
  const document =
    await db.orm.public.Document.first({
      id: documentId,
      userId,
    });

  if (!document) {
    throw new Error('DOCUMENT_NOT_FOUND');
  }

  return document;
}


export async function getDocumentText(
  userId,
  documentId
) {
  const document =
    await getDocumentById(
      userId,
      documentId
    );

  return {
    id: document.id,
    fileName: document.fileName,
    processingStatus:
      document.processingStatus,
    extractionMethod:
      document.extractionMethod,
    extractedText:
      document.extractedText,
  };
}


export async function deleteDocument(
  userId,
  documentId
) {
  const document =
    await getDocumentById(
      userId,
      documentId
    );

  await db.orm.public.Document
    .where({
      id: document.id,
      userId,
    })
    .delete();

  return document;
}


export async function generateDocumentCandidates(
  userId,
  documentId
) {
  // 1. Verify document ownership.
  const document = await getDocumentById(
    userId,
    documentId
  );

  // 2. Ensure saved analysis exists.
  if (!document.structuredData) {
    throw new Error('DOCUMENT_ANALYSIS_NOT_FOUND');
  }

  // 3. Parse the previously saved analysis.
  let analysis;

  try {
    analysis = JSON.parse(document.structuredData);
  } catch {
    throw new Error('DOCUMENT_ANALYSIS_INVALID');
  }

    if (
    !analysis ||
    typeof analysis !== 'object' ||
    Array.isArray(analysis)
  ) {
    throw new Error('DOCUMENT_ANALYSIS_INVALID');
  }

  // 4. Map the saved analysis to candidate types.
  const candidateGroups = [
    {
      type: 'memory',
      items: analysis.candidateMemories ?? [],
    },
    {
      type: 'goal',
      items: analysis.candidateGoals ?? [],
    },
    {
      type: 'action',
      items: analysis.candidateActions ?? [],
    },
  ];

  const candidates = [];

  for (const group of candidateGroups) {
    if (!Array.isArray(group.items)) {
      throw new Error('DOCUMENT_ANALYSIS_INVALID');
    }

    for (
      let sourceIndex = 0;
      sourceIndex < group.items.length;
      sourceIndex++
    ) {
      const item = group.items[sourceIndex];

      if (!item || typeof item !== 'object') {
        continue;
      }

      let title = null;
      let content = null;
      let reason = null;
      let importance = null;

      if (group.type === 'memory') {
        content =
          typeof item.content === 'string'
            ? item.content.trim()
            : null;

        importance =
          Number.isInteger(item.importance)
            ? item.importance
            : 1;

        title = content
          ? content.slice(0, 200)
          : null;
      } else {
        title =
          typeof item.title === 'string'
            ? item.title.trim()
            : null;

        reason =
          typeof item.reason === 'string'
            ? item.reason.trim()
            : null;

        content = reason;
      }

      // Skip unusable candidate entries.
      if (
        group.type === 'memory'
          ? !content
          : !title
      ) {
        continue;
      }

      candidates.push({
        userId,
        documentId: document.id,
        type: group.type,
        sourceIndex,
        title,
        content,
        reason,
        importance,
        status: 'pending',
      });
    }
  }

  // 5. Insert only candidates that don't already exist.
  const createdCandidates = [];

  for (const candidate of candidates) {
    const existing =
      await db.orm.public.DocumentCandidate.first({
        documentId: candidate.documentId,
        type: candidate.type,
        sourceIndex: candidate.sourceIndex,
      });

    if (existing) {
      createdCandidates.push(existing);
      continue;
    }

    try {
      const created =
        await db.orm.public.DocumentCandidate.create(
          candidate
        );

      createdCandidates.push(created);
    } catch (error) {
      // Protect against a duplicate inserted concurrently.
      const existingAfterError =
        await db.orm.public.DocumentCandidate.first({
          documentId: candidate.documentId,
          type: candidate.type,
          sourceIndex: candidate.sourceIndex,
        });

      if (existingAfterError) {
        createdCandidates.push(existingAfterError);
      } else {
        throw error;
      }
    }
  }

  return {
    documentId: document.id,
    totalCandidates: createdCandidates.length,
    createdCandidates,
  };
}

//Memory candidates

export async function getMemoryCandidates(
  userId,
  documentId,
  status = 'pending'
) {
  const document = await getDocumentById(
    userId,
    documentId
  );

  const where = {
    userId,
    documentId: document.id,
    type: 'memory',
  };

  if (status) {
    where.status = status;
  }

  return await db.orm.public.DocumentCandidate
    .where(where)
    .all();
}

export async function acceptMemoryCandidate(userId, candidateId) {
  const candidate = await db.orm.public.DocumentCandidate.first({
    id: candidateId,
    userId,
    type: 'memory',
  });

  if (!candidate) {
    throw new Error('MEMORY_CANDIDATE_NOT_FOUND');
  }

  // Check the source relationship first. This also handles a retry
  // where the Memory was created but the candidate update failed.
  const existingMemory = await db.orm.public.Memory.first({
    sourceCandidateId: candidate.id,
    userId,
  });

  if (existingMemory) {
    if (candidate.status === 'rejected') {
      throw new Error('MEMORY_CANDIDATE_ALREADY_REVIEWED');
    }

    if (candidate.status !== 'accepted') {
      await db.orm.public.DocumentCandidate.where({
        id: candidate.id,
        userId,
      }).update({
        status: 'accepted',
        reviewedAt: Temporal.Now.instant(),
      });
    }

    return {
      candidateId: candidate.id,
      status: 'accepted',
      memory: existingMemory,
    };
  }

  if (candidate.status !== 'pending') {
    throw new Error('MEMORY_CANDIDATE_ALREADY_REVIEWED');
  }

  if (!candidate.content?.trim()) {
    throw new Error('MEMORY_CANDIDATE_CONTENT_REQUIRED');
  }

  const importance = Math.min(
    5,
    Math.max(1, candidate.importance ?? 1),
  );

  let memory;

  try {
    memory = await db.orm.public.Memory.create({
      userId,
      type: 'document_insight',
      content: candidate.content.trim(),
      source: `document-candidate:${candidate.id}`,
      sourceCandidateId: candidate.id,
      importance,
    });
  } catch (error) {
    // Another request may have created the Memory first.
    // The unique sourceCandidateId constraint prevents duplicates.
    const createdMemory = await db.orm.public.Memory.first({
      sourceCandidateId: candidate.id,
      userId,
    });

    if (!createdMemory) {
      throw error;
    }

    memory = createdMemory;
  }

  await db.orm.public.DocumentCandidate.where({
    id: candidate.id,
    userId,
  }).update({
    status: 'accepted',
    reviewedAt: Temporal.Now.instant(),
  });

  return {
    candidateId: candidate.id,
    status: 'accepted',
    memory,
  };
}


export async function rejectMemoryCandidate(
  userId,
  candidateId
) {
  const candidate =
    await db.orm.public.DocumentCandidate.first({
      id: candidateId,
      userId,
      type: 'memory',
    });

  if (!candidate) {
    throw new Error('MEMORY_CANDIDATE_NOT_FOUND');
  }

  if (candidate.status !== 'pending') {
    throw new Error('MEMORY_CANDIDATE_ALREADY_REVIEWED');
  }

  await db.orm.public.DocumentCandidate
    .where({
      id: candidate.id,
      userId,
    })
    .update({
      status: 'rejected',
      reviewedAt: Temporal.Now.instant(),
    });

  return {
    candidateId: candidate.id,
    status: 'rejected',
  };
}

//Goal candidates

export async function getGoalCandidates(
  userId,
  documentId,
  status = 'pending'
) {
  const document = await getDocumentById(
    userId,
    documentId
  );

  const where = {
    userId,
    documentId: document.id,
    type: 'goal',
  };

  if (status) {
    where.status = status;
  }

  return await db.orm.public.DocumentCandidate
    .where(where)
    .all();
}


export async function acceptGoalCandidate(userId, candidateId) {
  const candidate = await db.orm.public.DocumentCandidate.first({
    id: candidateId,
    userId,
    type: 'goal',
  });

  if (!candidate) {
    throw new Error('GOAL_CANDIDATE_NOT_FOUND');
  }

  const existingGoal = await db.orm.public.Goal.first({
    sourceCandidateId: candidate.id,
    userId,
  });

  if (existingGoal) {
    if (candidate.status === 'rejected') {
      throw new Error('GOAL_CANDIDATE_ALREADY_REVIEWED');
    }

    if (candidate.status !== 'accepted') {
      await db.orm.public.DocumentCandidate.where({
        id: candidate.id,
        userId,
      }).update({
        status: 'accepted',
        reviewedAt: Temporal.Now.instant(),
      });
    }

    return {
      candidateId: candidate.id,
      status: 'accepted',
      goal: existingGoal,
    };
  }

  if (candidate.status !== 'pending') {
    throw new Error('GOAL_CANDIDATE_ALREADY_REVIEWED');
  }

  if (!candidate.title?.trim()) {
    throw new Error('GOAL_CANDIDATE_TITLE_REQUIRED');
  }

  let goal;

  try {
    goal = await createGoal(userId, {
      title: candidate.title.trim(),
      description: candidate.reason?.trim() || null,
      status: 'active',
      priority: candidate.importance ?? 0,
      targetDate: null,
      sourceCandidateId: candidate.id,
    });
  } catch (error) {
    // Recover from a concurrent request that created this Goal.
    const createdGoal = await db.orm.public.Goal.first({
      sourceCandidateId: candidate.id,
      userId,
    });

    if (!createdGoal) {
      throw error;
    }

    goal = createdGoal;
  }

  await db.orm.public.DocumentCandidate.where({
    id: candidate.id,
    userId,
  }).update({
    status: 'accepted',
    reviewedAt: Temporal.Now.instant(),
  });

  return {
    candidateId: candidate.id,
    status: 'accepted',
    goal,
  };
}

export async function rejectGoalCandidate(
  userId,
  candidateId
) {
  const candidate =
    await db.orm.public.DocumentCandidate.first({
      id: candidateId,
      userId,
      type: 'goal',
    });

  if (!candidate) {
    throw new Error('GOAL_CANDIDATE_NOT_FOUND');
  }

  if (candidate.status !== 'pending') {
    throw new Error(
      'GOAL_CANDIDATE_ALREADY_REVIEWED'
    );
  }

  await db.orm.public.DocumentCandidate
    .where({
      id: candidate.id,
      userId,
    })
    .update({
      status: 'rejected',
      reviewedAt: Temporal.Now.instant(),
    });

  return {
    candidateId: candidate.id,
    status: 'rejected',
  };
}

//Action candidates

export async function getActionCandidates(
  userId,
  documentId,
  status = 'pending'
) {
  const document = await getDocumentById(
    userId,
    documentId
  );

  const where = {
    userId,
    documentId: document.id,
    type: 'action',
  };

  if (status) {
    where.status = status;
  }

  return await db.orm.public.DocumentCandidate
    .where(where)
    .all();
}


export async function acceptActionCandidate(userId, candidateId) {
  const candidate = await db.orm.public.DocumentCandidate.first({
    id: candidateId,
    userId,
    type: 'action',
  });

  if (!candidate) {
    throw new Error('ACTION_CANDIDATE_NOT_FOUND');
  }

  const existingAction = await db.orm.public.Action.first({
    sourceCandidateId: candidate.id,
    userId,
  });

  if (existingAction) {
    if (candidate.status === 'rejected') {
      throw new Error('ACTION_CANDIDATE_ALREADY_REVIEWED');
    }

    if (candidate.status !== 'accepted') {
      await db.orm.public.DocumentCandidate.where({
        id: candidate.id,
        userId,
      }).update({
        status: 'accepted',
        reviewedAt: Temporal.Now.instant(),
      });
    }

    return {
      candidateId: candidate.id,
      status: 'accepted',
      action: existingAction,
    };
  }

  if (candidate.status !== 'pending') {
    throw new Error('ACTION_CANDIDATE_ALREADY_REVIEWED');
  }

  if (!candidate.title?.trim()) {
    throw new Error('ACTION_CANDIDATE_TITLE_REQUIRED');
  }

  let action;

  try {
    action = await createAction(userId, {
      title: candidate.title.trim(),
      description: candidate.reason?.trim() || null,
      goalId: null,
      suggestionId: null,
      status: 'pending',
      priority: candidate.importance ?? 0,
      dueDate: null,
      sourceCandidateId: candidate.id,
    });
  } catch (error) {
    // Recover if another request created this Action first.
    const createdAction = await db.orm.public.Action.first({
      sourceCandidateId: candidate.id,
      userId,
    });

    if (!createdAction) {
      throw error;
    }

    action = createdAction;
  }

  await db.orm.public.DocumentCandidate.where({
    id: candidate.id,
    userId,
  }).update({
    status: 'accepted',
    reviewedAt: Temporal.Now.instant(),
  });

  return {
    candidateId: candidate.id,
    status: 'accepted',
    action,
  };
}

export async function rejectActionCandidate(
  userId,
  candidateId
) {
  const candidate =
    await db.orm.public.DocumentCandidate.first({
      id: candidateId,
      userId,
      type: 'action',
    });

  if (!candidate) {
    throw new Error(
      'ACTION_CANDIDATE_NOT_FOUND'
    );
  }

  if (candidate.status !== 'pending') {
    throw new Error(
      'ACTION_CANDIDATE_ALREADY_REVIEWED'
    );
  }

  await db.orm.public.DocumentCandidate
    .where({
      id: candidate.id,
      userId,
    })
    .update({
      status: 'rejected',
      reviewedAt: Temporal.Now.instant(),
    });

  return {
    candidateId: candidate.id,
    status: 'rejected',
  };
}