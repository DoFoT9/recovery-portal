import 'server-only'

type Level = 'debug' | 'info' | 'warn' | 'error'

function emit(level: Level, msg: string, meta?: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'development') {
    const icon = level === 'error' ? '✗' : level === 'warn' ? '⚠' : level === 'info' ? 'ℹ' : '·'
    const tail = meta ? ` ${JSON.stringify(meta)}` : ''
    console.log(`${icon} [${level}] ${msg}${tail}`)
    return
  }
  const record = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...meta,
  }
  const line = JSON.stringify(record)
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

export const log = {
  debug: (msg: string, meta?: Record<string, unknown>) => emit('debug', msg, meta),
  info:  (msg: string, meta?: Record<string, unknown>) => emit('info', msg, meta),
  warn:  (msg: string, meta?: Record<string, unknown>) => emit('warn', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => emit('error', msg, meta),
}
