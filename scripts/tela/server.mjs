// Server di sviluppo per i test della tela: porta 3100, database di prova in .tela-test/
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
const dir = path.resolve('.tela-test'); fs.mkdirSync(dir, { recursive: true })
const env = { ...process.env, DATABASE_PATH: path.join(dir, 'tela.db') }
spawn('npx', ['next', 'dev', '--turbo', '--hostname', '127.0.0.1', '-p', '3100'], { stdio: 'inherit', env, shell: true })
