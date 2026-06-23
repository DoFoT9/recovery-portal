// Injected into the generated service worker by @ducanh2912/next-pwa.
// Adds Web Push handling on top of the standard PWA caching SW.

export {}

;(self as any).addEventListener('push', (event: any) => {
  try {
    const data = event.data ? event.data.json() : {}
    const title = data.title || 'Recovery Portal'
    const opts = {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url || '/' },
    }
    event.waitUntil((self as any).registration.showNotification(title, opts))
  } catch {
    event.waitUntil((self as any).registration.showNotification('Recovery Portal', { body: 'You have a new update.' }))
  }
})

;(self as any).addEventListener('notificationclick', (event: any) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil((async () => {
    const wins = await (self as any).clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const c of wins) {
      if (c.url.endsWith(url)) { c.focus(); return }
    }
    return (self as any).clients.openWindow(url)
  })())
})
