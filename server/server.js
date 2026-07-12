import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { analyzeCompany } from './routes/analyze.js'

dotenv.config()

const app = express()
const port = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.get('/api/health', (_request, response) => {
  response.json({ ok: true })
})

app.post('/api/analyze', analyzeCompany)

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})