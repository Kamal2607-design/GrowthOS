import { db } from '../prisma/db.ts';

import {
  analyzeReflection,
} from '../services/ai/reflection-analysis.service.js';

export async function analyzeUserReflection(
  req,
  res
) {
  try {
    const userId = req.user.id;

    const reflectionId =
      Number(req.params.id);

    if (!Number.isInteger(reflectionId)) {
      return res.status(400).json({
        error: 'Invalid reflection ID',
      });
    }

    console.log(
      `Analyzing reflection ${reflectionId} for user ${userId}`
    );

    // ---------------------------------------------
    // 1. Get reflection
    // ---------------------------------------------

    const reflection =
      await db.orm.public.Reflection.first({
        id: reflectionId,
        userId,
      });

    if (!reflection) {
      return res.status(404).json({
        error: 'Reflection not found',
      });
    }

    console.log(
      'Reflection found:',
      JSON.stringify(
        reflection,
        null,
        2
      )
    );

    // ---------------------------------------------
    // 2. Get user's vision
    // ---------------------------------------------

    const vision =
      await db.orm.public.Vision.first({
        userId,
      });

    console.log(
      'Vision found:',
      JSON.stringify(
        vision,
        null,
        2
      )
    );

    // ---------------------------------------------
    // 3. Get user's goals
    // ---------------------------------------------

    const goals =
      await db.orm.public.Goal
        .where({
          userId,
        })
        .all();

    console.log(
      `Found ${goals.length} goals`
    );

    // ---------------------------------------------
    // 4. Get user's actions
    // ---------------------------------------------

    const actions =
      await db.orm.public.Action
        .where({
          userId,
        })
        .all();

    console.log(
      `Found ${actions.length} actions`
    );

    // ---------------------------------------------
    // 5. Analyze reflection with Qwen
    // ---------------------------------------------

    const analysis =
      await analyzeReflection({
        reflection,
        vision,
        goals,
        actions,
      });

    console.log(
      'Reflection AI analysis:',
      JSON.stringify(
        analysis,
        null,
        2
      )
    );

    // ---------------------------------------------
    // 6. Return analysis
    // ---------------------------------------------

    return res.status(200).json({
      success: true,
      message:
        'Reflection analyzed successfully',
      analysis,
    });
  } catch (error) {
    console.error(
      'Analyze reflection error:',
      error
    );

    return res.status(500).json({
      error:
        'Failed to analyze reflection',
    });
  }
}