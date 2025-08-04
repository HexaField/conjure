
import { koa } from '@feathersjs/koa'
import packageRoot from 'app-root-path'
import dotenv from 'dotenv'
import { createServer as _createServer } from 'http'
import { createServer } from 'https'
import send from 'koa-send'
import serve from 'koa-static'
import { readFileSync } from 'node:fs'
import path from 'path'

const cwd = process.cwd()

dotenv.config({ path: packageRoot.path + '/.env.local' })

const app = new koa()
const PORT = parseInt(process.env.VITE_APP_PORT) || 3000
const HTTPS = process.env.VITE_LOCAL_BUILD ?? false
const key = process.env.KEY || 'certs/key.pem'
const cert = process.env.CERT || 'certs/cert.pem'

app.use(
  serve(path.join(cwd, 'dist'), {
    brotli: true,
    setHeaders: (ctx) => {
      ctx.setHeader('Origin-Agent-Cluster', '?1')
    }
  })
)

app.use(async (ctx) => {
  await send(ctx, path.join('dist', 'index.html'), {
    root: cwd
  })
})

app.listen = function () {
  let server
  if (HTTPS) {
    const pathedkey = readFileSync(path.join(packageRoot.path, key))
    const pathedcert = readFileSync(path.join(packageRoot.path, cert))
    server = createServer({ key: pathedkey, cert: pathedcert }, this.callback())
  } else {
    server = _createServer(this.callback())
  }
  return server.listen.apply(server, arguments)
}
app.listen(PORT, () => console.log(`Server listening on port: ${PORT}`))