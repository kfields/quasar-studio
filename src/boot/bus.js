import { boot } from 'quasar/wrappers'

const listeners = new Map()

const bus = {
  $on (event, callback) {
    if (!listeners.has(event)) {
      listeners.set(event, new Set())
    }
    listeners.get(event).add(callback)
  },
  $off (event, callback) {
    const handlers = listeners.get(event)
    if (!handlers) return
    handlers.delete(callback)
    if (handlers.size === 0) {
      listeners.delete(event)
    }
  },
  $emit (event, ...args) {
    const handlers = listeners.get(event)
    if (!handlers) return
    for (const handler of handlers) {
      handler(...args)
    }
  }
}

export default boot(({ app }) => {
  app.config.globalProperties.$bus = bus
})
