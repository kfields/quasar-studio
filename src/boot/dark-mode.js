import { watch } from 'vue'
import { boot } from 'quasar/wrappers'

const DARK_MODE_STORAGE_KEY = 'quasar-studio.dark-mode'

export default boot(({ app }) => {
  if (typeof window === 'undefined') return
  const $q = app.config.globalProperties.$q
  if (!$q || !$q.dark) return

  const saved = window.localStorage.getItem(DARK_MODE_STORAGE_KEY)
  if (saved === 'true' || saved === 'false') {
    $q.dark.set(saved === 'true')
  }

  watch(
    () => $q.dark.isActive,
    (isDark) => {
      window.localStorage.setItem(DARK_MODE_STORAGE_KEY, String(isDark))
    },
    { immediate: true }
  )
})
