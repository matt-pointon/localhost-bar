export interface AgentSession {
  id: string
  source: string
  sourceLabel: string
  project: string | null
  cwd: string | null
  model: string | null
  providerSlug: string
  providerName: string
  lastRequest: number
  requests: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
  estimatedCost: number | null
}

export function inferProvider(model: string | null): { slug: string; name: string } {
  if (!model) return { slug: 'unknown', name: 'Unknown' }
  const m = model.toLowerCase()
  if (m.includes('claude')) return { slug: 'anthropic', name: 'Anthropic' }
  if (m.includes('gemini')) return { slug: 'google', name: 'Google' }
  if (m.includes('gpt') || m.includes('codex') || /^o[1-4]/.test(m)) {
    return { slug: 'openai', name: 'OpenAI' }
  }
  if (m.includes('kimi') || m.includes('moonshot')) return { slug: 'moonshotai', name: 'Moonshot AI' }
  if (m.includes('llama')) return { slug: 'meta', name: 'Meta' }
  if (m.includes('mistral') || m.includes('mixtral')) return { slug: 'mistral', name: 'Mistral' }
  if (m.includes('grok')) return { slug: 'xai', name: 'xAI' }
  if (m.includes('deepseek')) return { slug: 'deepseek', name: 'DeepSeek' }
  return { slug: 'unknown', name: 'Unknown' }
}
