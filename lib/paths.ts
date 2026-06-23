import path from 'path'
import fs from 'fs'

export function dataDir() {
  const dir = process.env.DATA_DIR || path.join(process.cwd(), 'data')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}
export function videosDir() {
  const dir = path.join(dataDir(), 'videos')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}
export function dbPath() {
  return path.join(dataDir(), 'rehab.db')
}
