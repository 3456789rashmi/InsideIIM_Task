import { getFinancialSnapshot } from '../services/financeService.js'
import { getRecentNews } from '../services/newsService.js'
import { getInvestmentDecision } from '../services/llmService.js'

function scoreFinancials(financials) {
  let score = 50
  let riskScore = 50
  const reasons = []

  if (financials.marketCap) {
    score += financials.marketCap > 100_000_000_000 ? 12 : 4
    reasons.push(`Market cap is ${financials.marketCapLabel || financials.marketCap}.`)
  }

  if (financials.currentPrice) {
    reasons.push(`Current price is ${financials.currentPrice}.`)
  }

  if (financials.peRatio) {
    if (financials.peRatio < 25) {
      score += 10
      riskScore -= 6
    } else {
      score -= 4
      riskScore += 4
    }
    reasons.push(`PE ratio is ${financials.peRatio}.`)
  }

  if (financials.revenue) {
    score += financials.revenue > 50_000_000_000 ? 10 : 3
    reasons.push(`Revenue is ${financials.revenueLabel || financials.revenue}.`)
  }

  score = Math.max(0, Math.min(100, score))
  riskScore = Math.max(0, Math.min(100, riskScore))

  return { score, riskScore, reasons }
}

export async function analyzeCompany(request, response) {
  const company = String(request.body?.company || '').trim()

  if (!company) {
    return response.status(400).json({ error: 'Company name is required.' })
  }

  const financials = await getFinancialSnapshot(company)
  const ticker = financials.ticker || company
  const news = await getRecentNews(financials.companyName || company, ticker)

  const { score, riskScore, reasons } = scoreFinancials(financials)

  if (news.items.length) {
    const headlineReason = news.items[0]
    reasons.push(`Recent news is ${news.sentimentLabel}: ${headlineReason.title} (${headlineReason.source}, ${headlineReason.published}).`)
  }

  const adjustedScore = Math.max(0, Math.min(100, score + news.sentimentScore * 2))
  const adjustedRiskScore = Math.max(0, Math.min(100, riskScore - news.sentimentScore))
  const aiDecision = await getInvestmentDecision({
    company: financials.companyName || company,
    ticker: financials.ticker,
    financials,
    news,
    reasons,
    scores: {
      financialScore: adjustedScore,
      riskScore: adjustedRiskScore,
      newsScore: news.sentimentScore,
    },
  })

  return response.json({
    company: financials.companyName || company,
    ticker: financials.ticker,
    decision: aiDecision.decision,
    score: aiDecision.investmentScore ?? adjustedScore,
    riskScore: aiDecision.riskScore ?? adjustedRiskScore,
    confidence: aiDecision.confidence,
    summary: financials.error
      ? financials.error
      : `This version combines Yahoo Finance market data, recent Yahoo news headlines, and a Gemini decision step.`,
    financials,
    news: news.items,
    newsSignal: {
      sentimentScore: news.sentimentScore,
      sentimentLabel: news.sentimentLabel,
      error: news.error,
    },
    reasons,
    reasoning: aiDecision.reasoning,
    keyFactors: aiDecision.keyFactors,
    riskNotes: aiDecision.riskNotes,
  })
}