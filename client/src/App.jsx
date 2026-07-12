import { useState } from 'react'
import './App.css'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || ''

const initialResult = {
  company: '',
  decision: '',
  score: 0,
  riskScore: 0,
  confidence: 0,
  summary: '',
  financials: null,
  news: [],
  reasons: [],
  reasoning: '',
  keyFactors: [],
  riskNotes: [],
  newsSignal: null,
}

function App() {
  const [company, setCompany] = useState('Tesla')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(initialResult)

  async function handleAnalyze() {
    const trimmedCompany = company.trim()

    if (!trimmedCompany) {
      setError('Enter a company name first.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${apiBaseUrl}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ company: trimmedCompany }),
      })

      if (!response.ok) {
        throw new Error('Analysis request failed.')
      }

      const data = await response.json()
      setResult(data)
    } catch (requestError) {
      setError(requestError.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">AI Investment Research Agent</p>
        <h1>Type a company name and get a plain-English invest or pass recommendation.</h1>
        <p className="lede">
          The first version checks the UI and backend connection. Next we will add
          finance data, news, and Gemini reasoning step by step.
        </p>

        <div className="controls">
          <input
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            placeholder="Tesla"
            aria-label="Company name"
          />
          <button type="button" onClick={handleAnalyze} disabled={loading}>
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>

        {error ? <p className="error">{error}</p> : null}
      </section>

      <section className="card result-card">
        <div className="result-top">
          <div>
            <p className="label">Company</p>
            <h2>{result.company || 'Waiting for input'}</h2>
          </div>
          <div className={`decision ${result.decision.toLowerCase()}`}>
            {result.decision || 'No decision yet'}
          </div>
        </div>

        <div className="score-grid">
          <div>
            <span>Investment Score</span>
            <strong>{result.score || '--'}</strong>
          </div>
          <div>
            <span>Risk Score</span>
            <strong>{result.riskScore || '--'}</strong>
          </div>
          <div>
            <span>Confidence</span>
            <strong>{result.confidence || '--'}</strong>
          </div>
        </div>

        <p className="summary">{result.summary || 'Run an analysis to see the reasoning.'}</p>

        {result.reasoning ? (
          <div className="list-block">
            <h3>Reasoning</h3>
            <p className="summary">{result.reasoning}</p>
          </div>
        ) : null}

        <div className="list-block">
          <h3>Reasons</h3>
          <ul>
            {result.reasons.length ? (
              result.reasons.map((reason, index) => <li key={`${reason}-${index}`}>{reason}</li>)
            ) : (
              <li>No reasons yet.</li>
            )}
          </ul>
        </div>

        <div className="list-block">
          <h3>Key Factors</h3>
          <ul>
            {(result.keyFactors || []).length ? (
              (result.keyFactors || []).map((factor, index) => <li key={`${factor}-${index}`}>{factor}</li>)
            ) : (
              <li>No key factors yet.</li>
            )}
          </ul>
        </div>

        <div className="list-block">
          <h3>Risk Notes</h3>
          <ul>
            {(result.riskNotes || []).length ? (
              (result.riskNotes || []).map((note, index) => <li key={`${note}-${index}`}>{note}</li>)
            ) : (
              <li>No risk notes yet.</li>
            )}
          </ul>
        </div>

        <div className="list-block">
          <h3>News Signal</h3>
          <pre>{JSON.stringify(result.newsSignal, null, 2) || 'No news signal yet.'}</pre>
        </div>

        <div className="list-block">
          <h3>Research Snapshot</h3>
          <pre>{JSON.stringify(result.financials, null, 2) || 'No financials yet.'}</pre>
        </div>

        <div className="list-block">
          <h3>Latest News</h3>
          <ul>
            {result.news.length ? (
              result.news.map((item, index) => (
                <li key={`${item.title}-${index}`}>
                  {item.title}
                </li>
              ))
            ) : (
              <li>No news yet.</li>
            )}
          </ul>
        </div>
      </section>
    </main>
  )
}

export default App