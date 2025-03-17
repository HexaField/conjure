import config from '@ir-engine/server-core/src/appconfig'
import { StartCorsServer } from '@ir-engine/server-core/src/createCorsServer'
import fs from 'fs'

const certPath = config.server.certPath
const certKeyPath = config.server.keyPath

const certOptions = {
  key: fs.readFileSync(certKeyPath),
  cert: fs.readFileSync(certPath)
}
StartCorsServer(true, certOptions)
