<template>
  <q-page>
    <div class="q-pa-sm">
      <q-select
        v-model="selectedTheme"
        :options="themeOptions"
        label="Editor Theme"
        dense
        outlined
        emit-value
        map-options
        style="max-width: 220px"
        @update:model-value="onThemeChange"
      />
    </div>
    <div ref="editor"></div>
    <div v-if="loadError" class="text-negative q-pa-sm">{{ loadError }}</div>
  </q-page>
</template>

<script>
import { Compartment, EditorState } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { basicSetup } from 'codemirror'
import { defaultKeymap } from '@codemirror/commands'
import { oneDark } from '@codemirror/theme-one-dark'
import { dracula } from '@uiw/codemirror-theme-dracula'
import { githubDark } from '@uiw/codemirror-theme-github'
import { monokai } from '@uiw/codemirror-theme-monokai'
import { nord } from '@uiw/codemirror-theme-nord'
import { solarizedDark } from '@uiw/codemirror-theme-solarized'
import { css } from '@codemirror/lang-css'
import { html } from '@codemirror/lang-html'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { markdown } from '@codemirror/lang-markdown'
import { python } from '@codemirror/lang-python'
import { sql } from '@codemirror/lang-sql'
import { yaml } from '@codemirror/lang-yaml'

const languageCompartment = new Compartment()
const themeCompartment = new Compartment()
const THEME_STORAGE_KEY = 'quasar-studio.editor-theme'
const THEME_VALUES = ['one-dark', 'monokai', 'dracula', 'github-dark', 'nord', 'solarized-dark']

export default {
  name: 'EditPage',
  props: [
    'id'
  ],
  data () {
    return {
      content: '',
      cm: null,
      loadError: '',
      selectedTheme: 'one-dark',
      themeOptions: [
        { label: 'One Dark', value: 'one-dark' },
        { label: 'Monokai', value: 'monokai' },
        { label: 'Dracula', value: 'dracula' },
        { label: 'GitHub Dark', value: 'github-dark' },
        { label: 'Nord', value: 'nord' },
        { label: 'Solarized Dark', value: 'solarized-dark' }
      ]
    }
  },
  async mounted () {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (THEME_VALUES.includes(savedTheme)) {
      this.selectedTheme = savedTheme
    }
    await this.loadEditor()
  },
  beforeRouteUpdate (to, from, next) {
    this.loadContent(to.params.id)
      .then((content) => {
        this.loadError = ''
        if (this.cm) {
          this.cm.dispatch({
            changes: { from: 0, to: this.cm.state.doc.length, insert: content },
            effects: languageCompartment.reconfigure(this.getLanguageExtension(to.params.id))
          })
        }
        next()
      })
      .catch((error) => {
        this.loadError = `Unable to load file: ${error?.message || String(error)}`
        next()
      })
  },
  beforeUnmount () {
    if (this.cm) {
      this.cm.destroy()
    }
  },
  methods: {
    decodeFilePath (filePath) {
      try {
        return decodeURIComponent(filePath)
      } catch (error) {
        return filePath
      }
    },
    getFileExtension (filePath) {
      const decodedPath = this.decodeFilePath(filePath || '')
      const parts = decodedPath.split('/')
      const fileName = parts[parts.length - 1] || ''
      const segments = fileName.split('.')
      if (segments.length < 2) return ''
      return segments[segments.length - 1].toLowerCase()
    },
    getLanguageExtension (filePath) {
      const extension = this.getFileExtension(filePath)
      if (['js', 'mjs', 'cjs', 'jsx'].includes(extension)) {
        return javascript({ jsx: true })
      }
      if (['ts', 'tsx'].includes(extension)) {
        return javascript({ typescript: true, jsx: true })
      }
      if (extension === 'json') return json()
      if (['html', 'htm', 'vue'].includes(extension)) return html()
      if (extension === 'css') return css()
      if (['md', 'markdown'].includes(extension)) return markdown()
      if (extension === 'py') return python()
      if (['sql', 'psql'].includes(extension)) return sql()
      if (['yaml', 'yml'].includes(extension)) return yaml()
      return []
    },
    getThemeExtension () {
      if (this.selectedTheme === 'github-dark') return githubDark
      if (this.selectedTheme === 'dracula') return dracula
      if (this.selectedTheme === 'nord') return nord
      if (this.selectedTheme === 'solarized-dark') return solarizedDark
      if (this.selectedTheme === 'one-dark') return oneDark
      return monokai
    },
    async loadContent (filePath) {
      if (!window.studioFs || !filePath) return ''
      return window.studioFs.readFile(this.decodeFilePath(filePath))
    },
    getEditorExtensions (filePath) {
      return [
        basicSetup,
        keymap.of(defaultKeymap),
        EditorView.lineWrapping,
        themeCompartment.of(this.getThemeExtension()),
        languageCompartment.of(this.getLanguageExtension(filePath))
      ]
    },
    onThemeChange () {
      window.localStorage.setItem(THEME_STORAGE_KEY, this.selectedTheme)
      if (!this.cm) return
      this.cm.dispatch({
        effects: themeCompartment.reconfigure(this.getThemeExtension())
      })
    },
    async loadEditor () {
      try {
        const starter = await this.loadContent(this.id)
        this.loadError = ''
        const state = EditorState.create({
          doc: starter,
          extensions: this.getEditorExtensions(this.id)
        })
        this.cm = new EditorView({
          state,
          parent: this.$refs.editor
        })
      } catch (error) {
        this.loadError = `Unable to load file: ${error?.message || String(error)}`
        const state = EditorState.create({
          doc: '',
          extensions: this.getEditorExtensions(this.id)
        })
        this.cm = new EditorView({
          state,
          parent: this.$refs.editor
        })
      }
    }
  }
}
</script>
