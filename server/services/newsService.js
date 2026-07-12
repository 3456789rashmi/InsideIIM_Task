import { execFileSync } from 'node:child_process'

function fetchQuotePage(ticker) {
  return execFileSync(
    'curl.exe',
    ['-L', '--compressed', '-A', 'Mozilla/5.0', `https://finance.yahoo.com/quote/${encodeURIComponent(ticker)}/`],
    {
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
    },
  )
}

function cleanText(value) {
  return String(value || '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function collectNewsItems(html) {
  const items = []
  const itemPattern = /\\"title\\":\\"([^\\"]+)\\"[\s\S]{0,800}?\\"yahoo_url\\":\\"([^\\"]+)\\"[\s\S]{0,800}?\\"provider_name\\":\\"([^\\"]+)\\"[\s\S]{0,400}?\\"published_date\\":\\"([^\\"]+)\\"/g

  for (const match of html.matchAll(itemPattern)) {
    const title = cleanText(match[1])
    const url = match[2]?.replace(/&amp;/g, '&')
    const source = cleanText(match[3])
    const published = cleanText(match[4])

    if (!title || !source || !url) {
      continue
    }

    items.push({
      title,
      source,
      url,
      published,
    })
  }

  return items.slice(0, 6)
}

function scoreHeadline(title) {
  const lowerTitle = title.toLowerCase()

  if (/(lawsuit|probe|investigation|scrutiny|fraud|recall|cuts|layoffs|controversy|safety questions|red flags)/.test(lowerTitle)) {
    return -2
  }

  if (/(beats|record|growth|expansion|upside|raises|strong buy|upgrade|partnership|launch|wins)/.test(lowerTitle)) {
    return 2
  }

  return 0
}

export async function getRecentNews(companyName, ticker) {
  try {
    const html = fetchQuotePage(ticker)
    const items = collectNewsItems(html)
    const sentimentScore = items.reduce((total, item) => total + scoreHeadline(item.title), 0)

    return {
      companyName,
      ticker,
      sentimentScore,
      sentimentLabel: sentimentScore > 1 ? 'positive' : sentimentScore < -1 ? 'negative' : 'mixed',
      items,
      error: items.length ? null : 'No recent news items found.',
    }
  } catch {
    return {
      companyName,
      ticker,
      sentimentScore: 0,
      sentimentLabel: 'mixed',
      items: [],
      error: 'News data unavailable right now.',
    }
  }
}