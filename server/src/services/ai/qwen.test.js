
import { generateWithQwen } from './qwen.service.js';
const result = await generateWithQwen(
  'Give me one practical action for becoming a better full-stack developer.'
);

console.log(result);