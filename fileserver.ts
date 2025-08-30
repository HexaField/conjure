import express, { Request } from 'express'
import fs from 'fs'
import https from 'https'
import path from 'path'

type QueryParams = {
  source: string
  predicate: string
}

type FileParams = QueryParams & {
  target: string
}

// Basic config
const PORT = 8000
// Resolve repo-level dev certs; this file lives in packages/projects/projects/hexafield/conjure/
const CERT_PATH = path.resolve(__dirname, '../../../../../certs/cert.pem')
const KEY_PATH = path.resolve(__dirname, '../../../../../certs/key.pem')

// Local storage directory for uploaded files
const STORAGE_DIR = path.resolve(__dirname, 'storage')
fs.mkdirSync(STORAGE_DIR, { recursive: true })

// Minimal CORS for local dev
const corsMiddleware: express.RequestHandler = (req, res, next) => {
  console.log(`[fileserver] ${req.method} ${req.url}`)
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*')
  res.header('Access-Control-Allow-Credentials', 'true')
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
}

const app = express()
app.use(corsMiddleware)
app.use(express.json({ limit: '10mb' })) // JSON only for metadata routes

const keyFor = ({ source, predicate }: QueryParams) => `${encodeURIComponent(predicate)}__${encodeURIComponent(source)}`

const pathFor = (q: QueryParams) => path.join(STORAGE_DIR, `${keyFor(q)}.json`)

const readFile = (q: QueryParams): FileParams | undefined => {
  const path = pathFor(q)
  if (!fs.existsSync(path)) return undefined
  try {
    return JSON.parse(fs.readFileSync(path, 'utf-8')) as FileParams
  } catch {
    return undefined
  }
}

const writeFile = (q: QueryParams, data: string) => {
  fs.writeFileSync(pathFor(q), data)
}

app.get('/health', (_req, res) => res.status(200).send('ok'))

app.post('/create', (req: Request, res) => {
  try {
    const { source, predicate, target } = req.body as unknown as FileParams
    if (!source || !predicate || !target) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const q: QueryParams = { source, predicate }
    const finalPath = pathFor(q)

    if (finalPath && fs.existsSync(finalPath)) fs.unlinkSync(finalPath)

    writeFile(q, target)

    return res.status(201).json({ ok: true })
  } catch (e) {
    console.error('CREATE error', e)
    return res.status(500).json({ error: 'Internal error' })
  }
})

// Get (download)
app.post('/get', (req, res) => {
  try {
    const { source, predicate } = req.body as QueryParams
    if (!source || !predicate) return res.status(400).json({ error: 'Missing required fields' })

    const path = pathFor({ source, predicate })
    if (!path || !fs.existsSync(path)) return res.status(404).json({ error: 'Not found' })

    const file = readFile({ source, predicate })
    if (!file) return res.status(404).json({ error: 'Not found' })

    return res.status(200).json(file)
  } catch (e) {
    console.error('GET error', e)
    return res.status(500).json({ error: 'Internal error' })
  }
})

// Find (return results for matching predicate)
app.post('/find', (req, res) => {
  try {
    const { predicate } = req.body as { predicate?: string }
    if (!predicate) return res.status(400).json({ error: 'Missing required fields' })

    // Scan storage dir for all .json meta files
    const results: Array<string> = []
    const files = fs.readdirSync(STORAGE_DIR)
    for (const file of files) {
      if (!file.endsWith('.json')) continue
      const encodedPredicate = encodeURIComponent(predicate)
      if (file.startsWith(encodedPredicate)) {
        results.push(decodeURIComponent(file.slice(encodedPredicate.length + 2, -5)))
      }
    }
    return res.status(200).json({ ok: true, results })
  } catch (e) {
    console.error('FIND error', e)
    return res.status(500).json({ error: 'Internal error' })
  }
})

app.post('/has', (req, res) => {
  try {
    const { source, predicate } = req.body as QueryParams
    if (!source || !predicate) return res.status(400).json({ error: 'Missing required fields' })

    const file = fs.existsSync(pathFor({ source, predicate }))
    if (!file) return res.status(200).json({ ok: false })

    return res.status(200).json({ ok: true })
  } catch (e) {
    console.error('HAS error', e)
    return res.status(500).json({ error: 'Internal error' })
  }
})

// Replace
app.post('/replace', (req: Request, res) => {
  try {
    const { source, predicate, target } = req.body as unknown as FileParams
    if (!source || !predicate || !target) {
      return res.status(400).json({ error: 'Missing required fields' })
    }
    const q: QueryParams = { source, predicate }
    const path = pathFor(q)
    if (!path) {
      return res.status(404).json({ error: 'Not found' })
    }
    // Remove old file
    if (path && fs.existsSync(path)) fs.unlinkSync(path)

    writeFile(q, target)

    return res.status(200).json({ ok: true })
  } catch (e) {
    console.error('REPLACE error', e)
    return res.status(500).json({ error: 'Internal error' })
  }
})

// Delete
app.post('/delete', (req, res) => {
  try {
    const { source, predicate } = req.body as QueryParams
    if (!source || !predicate) return res.status(400).json({ error: 'Missing required fields' })
    const q: QueryParams = { source, predicate }

    const path = pathFor(q)
    if (fs.existsSync(path)) fs.unlinkSync(path)

    return res.status(200).json({ ok: true })
  } catch (e) {
    console.error('DELETE error', e)
    return res.status(500).json({ error: 'Internal error' })
  }
})

// HTTPS server
const key = fs.readFileSync(KEY_PATH)
const cert = fs.readFileSync(CERT_PATH)
https.createServer({ key, cert }, app).listen(PORT, () => {
  console.log(`[fileserver] HTTPS listening on https://localhost:${PORT}`)
})
