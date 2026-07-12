import yahooFinance from 'yahoo-finance2'

const DEMO_TICKERS = new Map([
  ['tesla', 'TSLA'],
  ['apple', 'AAPL'],
  ['microsoft', 'MSFT'],
  ['nvidia', 'NVDA'],
  ['amazon', 'AMZN'],
  ['google', 'GOOGL'],
  ['alphabet', 'GOOGL'],
  ['meta', 'META'],
  ['netflix', 'NFLX'],
])

export async function resolveTicker(companyName) {
  const cleanName = String(companyName || '').trim()

  if (!cleanName) {
    return null
  }

  const directTicker = DEMO_TICKERS.get(cleanName.toLowerCase())

  if (directTicker) {
    return directTicker
  }

  if (/^[A-Z.]{1,6}$/.test(cleanName)) {
    return cleanName.toUpperCase()
  }

  try {
    const quote = await yahooFinance.quote(cleanName)

    if (quote?.symbol) {
      return quote.symbol
    }
  } catch {
    return null
  }

  return null
}