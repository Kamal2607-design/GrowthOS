/**
 * Deterministic grounding safeguard for daily planner suggestions.
 *
 * When the planner context has no reflection for today, a suggestion must
 * not claim that one exists (for example by citing "today's reflection" or
 * saying the user "reported today"). Historical memories are not a
 * same-day reflection.
 *
 * Suggestions that ask the user to WRITE today's reflection remain valid.
 * Only phrasing that asserts the content of a same-day reflection is
 * rejected.
 */

const CLAIM_VERBS =
  '(?:shows|showed|indicates|indicated|mentions|mentioned|notes|noted|' +
  'states|stated|reveals|revealed|highlights|highlighted|says|said|' +
  'suggests|suggested|reports|reported|describes|described|confirms|' +
  'confirmed)';

const AUTHORED_VERBS =
  '(?:reflected|noted|mentioned|wrote|reported|shared|stated)';

const SUBJECT = '(?:you|the user|user|they)';

const OWNER = "(?:(?:the user's|your|their)\\s+)?";

const SAME_DAY = "(?:today's|same day|this morning's)";

const SAME_DAY_REFLECTION_CLAIMS = [
  // "based on today's reflection", "according to your same-day reflection"
  new RegExp(
    '\\b(?:based on|according to|as (?:noted|mentioned|stated|shared|' +
    `described|reported) in)\\s+${OWNER}${SAME_DAY}\\s+reflection\\b`,
  ),
  // "today's reflection shows ..."
  new RegExp(`\\b${SAME_DAY}\\s+reflection\\s+${CLAIM_VERBS}\\b`),
  // "the reflection from today indicates ..."
  new RegExp(
    '\\breflection\\s+(?:from\\s+|for\\s+|written\\s+|recorded\\s+)?' +
    `(?:today|this morning)\\s+${CLAIM_VERBS}\\b`,
  ),
  // "in today's reflection, you ..."
  new RegExp(
    `\\bin\\s+${OWNER}${SAME_DAY}\\s+reflection,?\\s+${SUBJECT}\\b`,
  ),
  // "in your reflection today ..."
  new RegExp(
    `\\bin\\s+${OWNER}reflection\\s+(?:today|this morning)\\b`,
  ),
  // "you reflected today", "the user reported earlier today"
  new RegExp(
    `\\b${SUBJECT}\\s+${AUTHORED_VERBS}\\s+(?:earlier\\s+)?` +
    '(?:today|this morning)\\b',
  ),
  // "today, the user mentioned ..."
  new RegExp(
    `\\b(?:today|this morning),?\\s+${SUBJECT}\\s+${AUTHORED_VERBS}\\b`,
  ),
];

const CHECKED_FIELDS = ['title', 'description', 'reasoning'];

function normalizeClaimText(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[‘’ʼ`]/g, "'")
    .replace(/[-‐-―]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Returns null when the suggestion is acceptable, otherwise
 * { field, excerpt } describing the first unsupported claim.
 */
export function findUnsupportedReflectionClaim(
  suggestion,
  context,
) {
  // A same-day reflection exists, so references to it may be grounded.
  if (context?.reflection) {
    return null;
  }

  for (const field of CHECKED_FIELDS) {
    const text = normalizeClaimText(suggestion?.[field]);

    if (!text) {
      continue;
    }

    for (const pattern of SAME_DAY_REFLECTION_CLAIMS) {
      const match = text.match(pattern);

      if (match) {
        return {
          field,
          excerpt: match[0],
        };
      }
    }
  }

  return null;
}
