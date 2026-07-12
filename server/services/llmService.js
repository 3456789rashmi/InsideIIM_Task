import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { z } from 'zod'
import { decisionPrompt } from '../prompts/decisionPrompt.js'

const decisionSchema = z.object({
  decision: z.enum(['Invest', 'Pass']),
  confidence: z.number().min(0).max(100),
  reasoning: z.string(),
  keyFactors: z.array(z.string()).default([]),
  riskNotes: z.array(z.string()).default([]),
  investmentScore: z.number().min(0).max(100),
  riskScore: z.number().min(0).max(100),
})

function buildFallbackDecision(context) {
  const financialScore = Number(context?.scores?.financialScore ?? 50)
  const newsScore = Number(context?.scores?.newsScore ?? 0)
  const totalScore = Math.max(0, Math.min(100, financialScore + newsScore * 2))
  const riskScore = Math.max(0, Math.min(100, 100 - totalScore / 1.2))
  const decision = totalScore >= riskScore ? 'Invest' : 'Pass'

  return {
    decision,
    confidence: 55,
    reasoning: 'Gemini is not configured, so this result uses the deterministic fallback scoring path.',
    keyFactors: context?.reasons || [],
    riskNotes: context?.news?.items?.length ? [context.news.items[0].title] : [],
    investmentScore: totalScore,
    riskScore,
  }
}

export async function getInvestmentDecision(context) {
  const apiKey = process.env.GOOGLE_API_KEY

  if (!apiKey) {
    return buildFallbackDecision(context)
  }

  const model = new ChatGoogleGenerativeAI({
    apiKey,
    model: 'gemini-2.5-flash',
    temperature: 0.2,
    maxOutputTokens: 512,
  })

  const structuredModel = model.withStructuredOutput(decisionSchema, {
    name: 'investment_decision',
  })

  const prompt = `${decisionPrompt}\n\nResearch snapshot:\n${JSON.stringify(context, null, 2)}`
  const result = await structuredModel.invoke(prompt)

  return result
}