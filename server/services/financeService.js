import { resolveTicker } from './companyLookup.js'
import { execFileSync } from 'node:child_process'

function formatLargeNumber(value) {
  if (typeof value !== 'number') {
    return null
  }

  if (value >= 1_000_000_000_000) {
    return `${(value / 1_000_000_000_000).toFixed(2)}T`
  }

  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`
  }

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`
  }

  return `${Math.round(value)}`
}

async function fetchQuoteSummary(ticker) {
  return execFileSync(
    'curl.exe',
    ['-L', '--compressed', '-A', 'Mozilla/5.0', `https://finance.yahoo.com/quote/${encodeURIComponent(ticker)}/`],
    {
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
    },
  )
}

function parseQuoteSummary(html, ticker) {
  const scriptPattern = new RegExp(
    `data-url=\"https://query1\.finance\.yahoo\.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}[^\"]*\"[^>]*>(.*?)<\/script>`,
  )
  const scriptMatch = html.match(scriptPattern)

  if (!scriptMatch?.[1]) {
    throw new Error('Could not find quoteSummary payload.')
  }

  const outerPayload = JSON.parse(scriptMatch[1])
  const innerPayload = JSON.parse(outerPayload.body)
  const quoteSummary = innerPayload.quoteSummary?.result?.[0]

  if (!quoteSummary) {
    throw new Error('Could not parse quoteSummary payload.')
  }

  return quoteSummary
}

export async function getFinancialSnapshot(companyName) {
  const ticker = await resolveTicker(companyName)

  if (!ticker) {
    return {
      companyName,
      ticker: null,
      marketCap: null,
      revenue: null,
      currentPrice: null,
      peRatio: null,
      currency: null,
      error: 'Ticker not found.',
    }
  }

  try {
    const html = await fetchQuoteSummary(ticker)
    const summary = parseQuoteSummary(html, ticker)
    const price = summary.price || {}
    const financialData = summary.financialData || {}
    const defaultKeyStatistics = summary.defaultKeyStatistics || {}
    const incomeHistory = summary.incomeStatementHistory?.incomeStatementHistory?.[0] || {}

    const marketCap = price.marketCap?.raw ?? defaultKeyStatistics.marketCap?.raw ?? null
    const peRatio = financialData.trailingPE?.raw ?? price.trailingPE?.raw ?? null
    const currentPrice = price.regularMarketPrice?.raw ?? null
    const revenue = incomeHistory.totalRevenue?.raw ?? null
    const companyLabel = price.longName || price.shortName || companyName

    return {
      companyName: companyLabel,
      ticker,
      marketCap,
      marketCapLabel: formatLargeNumber(marketCap),
      revenue,
      revenueLabel: formatLargeNumber(revenue),
      currentPrice,
      peRatio,
      currency: price.currency || financialData.financialCurrency || null,
      error: null,
    }
  } catch {
    return {
      companyName,
      ticker,
      marketCap: null,
      revenue: null,
      currentPrice: null,
      peRatio: null,
      currency: null,
      error: 'Finance data unavailable right now.',
    }
  }
}