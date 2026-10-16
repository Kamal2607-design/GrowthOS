import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from './routes/auth.routes.js';
import cookieParser from 'cookie-parser';
import visionRoutes from './routes/vision.routes.js';
import goalRoutes from './routes/goal.routes.js';
import actionRoutes from './routes/action.routes.js';
import actionSuggestionRoutes from './routes/action-suggestion.routes.js';
import reflectionRoutes from './routes/reflection.routes.js';
import aiReflectionRoutes from './routes/ai-reflection.routes.js';
import documentRouter from './routes/document.route.js';
import goalProgressRoutes from './routes/goal-progress.routes.js';
import memoryRoutes from './routes/memory.routes.js';
import memoryEmbeddingRoutes from './routes/memory-embedding.routes.js';
import memoryRetrievalRoutes from './routes/memory-retrieval.routes.js';
import contextAssemblyRoutes from './routes/context-assembly.routes.js';
import ragRoutes from './routes/rag.routes.js';
import actionPlannerRoutes from './routes/action-planner.routes.js';
import dailyGrowthLoopRoutes
  from './routes/daily-growth-loop.routes.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

app.use('/api/auth', authRoutes);

//test api
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'GrowthOS API is running',
  });
});

app.use('/api/vision', visionRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/actions', actionRoutes);
app.use('/api/action-suggestions', actionSuggestionRoutes);
app.use('/api/reflections', reflectionRoutes);
app.use(
  '/api/reflections',
  aiReflectionRoutes
);
app.use('/api/documents', documentRouter);
app.use(
  '/api/goal-progress',
  goalProgressRoutes
);
app.use('/api/memories', memoryRoutes);

app.use(
  '/api',
  memoryEmbeddingRoutes
);
app.use(
  '/api/memories/search',
  memoryRetrievalRoutes
);
app.use(
  '/api/context',
  contextAssemblyRoutes
);
app.use(
  '/api/rag',
  ragRoutes
);
app.use(
  '/api/action-planner',
  actionPlannerRoutes
);
app.use(
  '/api/daily-growth',
  dailyGrowthLoopRoutes
);

export default app;