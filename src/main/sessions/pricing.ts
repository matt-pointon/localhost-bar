// Approximate, public list prices used only to *estimate* session cost from local
// token usage. These are not billing figures and can drift as providers change
// pricing — the UI labels every cost as an estimate. USD per 1M tokens.

export interface ModelPrice {
  input: number
  output: number
}

// Matched by substring against the lowercased model id, most-specific first.
const PRICE_TABLE: [string, ModelPrice][] = [
  // Anthropic
  ['claude-3-5-haiku', { input: 0.8, output: 4 }],
  ['claude-haiku', { input: 1, output: 5 }],
  ['claude-3-haiku', { input: 0.25, output: 1.25 }],
  ['claude-opus', { input: 15, output: 75 }],
  ['claude-3-opus', { input: 15, output: 75 }],
  ['claude-sonnet', { input: 3, output: 15 }],
  ['claude-3-7-sonnet', { input: 3, output: 15 }],
  ['claude-3-5-sonnet', { input: 3, output: 15 }],
  ['claude', { input: 3, output: 15 }],

  // OpenAI
  ['gpt-4o-mini', { input: 0.15, output: 0.6 }],
  ['gpt-4o', { input: 2.5, output: 10 }],
  ['gpt-4.1-mini', { input: 0.4, output: 1.6 }],
  ['gpt-4.1-nano', { input: 0.1, output: 0.4 }],
  ['gpt-4.1', { input: 2, output: 8 }],
  ['o4-mini', { input: 1.1, output: 4.4 }],
  ['o3-mini', { input: 1.1, output: 4.4 }],
  ['o3', { input: 2, output: 8 }],
  ['o1-mini', { input: 1.1, output: 4.4 }],
  ['o1', { input: 15, output: 60 }],

  // Google
  ['gemini-1.5-flash', { input: 0.075, output: 0.3 }],
  ['gemini-2.0-flash', { input: 0.1, output: 0.4 }],
  ['gemini-2.5-flash', { input: 0.3, output: 2.5 }],
  ['gemini-1.5-pro', { input: 1.25, output: 5 }],
  ['gemini-2.5-pro', { input: 1.25, output: 10 }],
  ['gemini', { input: 1.25, output: 5 }]
]

export function priceForModel(model: string | null): ModelPrice | null {
  if (!model) return null
  const m = model.toLowerCase()
  for (const [needle, price] of PRICE_TABLE) {
    if (m.includes(needle)) return price
  }
  return null
}

export interface TokenUsage {
  input: number
  output: number
  cacheCreate: number
  cacheRead: number
}

// Returns an estimated USD cost, or null when the model isn't in the price table.
// Cache reads are billed far cheaper and cache writes a bit more than base input;
// we approximate those multipliers so heavy-cache sessions aren't wildly off.
export function estimateCost(model: string | null, usage: TokenUsage): number | null {
  const price = priceForModel(model)
  if (!price) return null
  const inputCost = usage.input * price.input
  const cacheCreateCost = usage.cacheCreate * price.input * 1.25
  const cacheReadCost = usage.cacheRead * price.input * 0.1
  const outputCost = usage.output * price.output
  return (inputCost + cacheCreateCost + cacheReadCost + outputCost) / 1_000_000
}
