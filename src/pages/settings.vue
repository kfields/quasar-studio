<template>
  <q-page class="q-pa-md">
    <q-card flat bordered class="settings-card">
      <q-card-section>
        <div class="text-h6">Settings</div>
        <div class="text-caption">Customize your Quasar Studio experience.</div>
      </q-card-section>

      <q-separator />

      <q-card-section>
        <q-toggle
          :model-value="$q.dark.isActive"
          label="Dark mode"
          @update:model-value="setDarkMode"
        />
      </q-card-section>

      <q-separator />

      <q-card-section>
        <q-select
          v-model="selectedTheme"
          :options="themeOptions"
          label="Editor theme"
          dense
          outlined
          emit-value
          map-options
          style="max-width: 260px"
          @update:model-value="setEditorTheme"
        />
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script>
const THEME_STORAGE_KEY = 'quasar-studio.editor-theme'
const THEME_VALUES = ['auto', 'one-dark', 'monokai', 'dracula', 'github-dark', 'nord', 'solarized-dark']

export default {
  name: 'PageSettings',
  data () {
    return {
      selectedTheme: 'auto',
      themeOptions: [
        { label: 'Auto (Quasar Dark Mode)', value: 'auto' },
        { label: 'One Dark', value: 'one-dark' },
        { label: 'Monokai', value: 'monokai' },
        { label: 'Dracula', value: 'dracula' },
        { label: 'GitHub Dark', value: 'github-dark' },
        { label: 'Nord', value: 'nord' },
        { label: 'Solarized Dark', value: 'solarized-dark' }
      ]
    }
  },
  mounted () {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (THEME_VALUES.includes(savedTheme)) {
      this.selectedTheme = savedTheme
    }
  },
  methods: {
    setDarkMode (enabled) {
      this.$q.dark.set(enabled)
    },
    setEditorTheme (theme) {
      if (!THEME_VALUES.includes(theme)) return
      this.selectedTheme = theme
      window.localStorage.setItem(THEME_STORAGE_KEY, theme)
      this.$bus.$emit('editorThemeChanged', theme)
    }
  }
}
</script>
