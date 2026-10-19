<template>
  <q-page class="editor-page">
    <div ref="editor" class="editor-host"></div>
    <div v-if="loadError" class="text-negative q-pa-sm">{{ loadError }}</div>
  </q-page>
</template>

<script>
import { Compartment, EditorState } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { basicSetup } from 'codemirror'
import { defaultKeymap } from '@codemirror/commands'
import { search, searchKeymap } from '@codemirror/search'
import { oneDark } from '@codemirror/theme-one-dark'
import { dracula } from '@uiw/codemirror-theme-dracula'
import { githubDark, githubLight } from '@uiw/codemirror-theme-github'
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
const THEME_VALUES = ['auto', 'one-dark', 'monokai', 'dracula', 'github-dark', 'nord', 'solarized-dark']

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
      lastSavedContent: '',
      isDirty: false,
      isSaving: false,
      isApplyingContent: false,
      selectedTheme: 'auto'
    }
  },
  created () {
    this.$bus.$on('editorThemeChanged', this.onExternalThemeChange)
  },
  async mounted () {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (THEME_VALUES.includes(savedTheme)) {
      this.selectedTheme = savedTheme
    }
    await this.loadEditor()
  },
  watch: {
    '$q.dark.isActive' () {
      if (this.selectedTheme === 'auto') {
        this.applyTheme()
      }
    }
  },
  async beforeRouteUpdate (to, from) {
    if (this.isDirty) {
      const shouldLeave = window.confirm('You have unsaved changes. Leave this file without saving?')
      if (!shouldLeave) {
        return false
      }
      this.setDirtyState(false)
    }

    try {
      const content = await this.loadContent(to.params.id)
      this.loadError = ''
      if (this.cm) {
        this.isApplyingContent = true
        this.lastSavedContent = content
        this.cm.dispatch({
          changes: { from: 0, to: this.cm.state.doc.length, insert: content },
          effects: languageCompartment.reconfigure(this.getLanguageExtension(to.params.id))
        })
        this.isApplyingContent = false
        this.setDirtyState(false)
      }
    } catch (error) {
      this.loadError = `Unable to load file: ${error?.message || String(error)}`
    }
  },
  beforeRouteLeave () {
    if (!this.isDirty) {
      return true
    }
    if (window.confirm('You have unsaved changes. Leave this file without saving?')) {
      this.setDirtyState(false)
      return true
    }
    return false
  },
  beforeUnmount () {
    this.$bus.$off('editorThemeChanged', this.onExternalThemeChange)
    this.emitDirtyState(false)
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
      if (this.selectedTheme === 'auto') {
        return this.$q.dark.isActive ? oneDark : githubLight
      }
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
    getCurrentFileRoute () {
      return `/edit/${encodeURIComponent(this.decodeFilePath(this.id))}`
    },
    emitDirtyState (isDirty) {
      this.$bus.$emit('fileDirtyStateChanged', {
        to: this.getCurrentFileRoute(),
        isDirty
      })
    },
    setDirtyState (isDirty) {
      if (this.isDirty === isDirty) return
      this.isDirty = isDirty
      this.emitDirtyState(isDirty)
      if (window.studioWindow) {
        window.studioWindow.setDirty(isDirty)
      }
    },
    getSaveKeyBindings () {
      return [{
        key: 'Mod-s',
        run: () => {
          this.saveCurrentFile()
          return true
        }
      }]
    },
    getEditorExtensions (filePath) {
      return [
        basicSetup,
        keymap.of(this.getSaveKeyBindings()),
        search({ top: true }),
        keymap.of(searchKeymap),
        keymap.of(defaultKeymap),
        EditorView.lineWrapping,
        themeCompartment.of(this.getThemeExtension()),
        EditorView.updateListener.of((update) => {
          if (!update.docChanged || this.isApplyingContent) return
          const current = update.state.doc.toString()
          this.setDirtyState(current !== this.lastSavedContent)
        }),
        languageCompartment.of(this.getLanguageExtension(filePath))
      ]
    },
    onExternalThemeChange (theme) {
      if (!THEME_VALUES.includes(theme)) return
      this.selectedTheme = theme
      this.applyTheme()
    },
    applyTheme () {
      if (!this.cm) return
      this.cm.dispatch({
        effects: themeCompartment.reconfigure(this.getThemeExtension())
      })
    },
    async saveCurrentFile () {
      if (!this.cm || !window.studioFs || this.isSaving) return
      this.isSaving = true
      try {
        const currentFilePath = this.decodeFilePath(this.id)
        const content = this.cm.state.doc.toString()
        await window.studioFs.writeFile(currentFilePath, content)
        this.lastSavedContent = content
        this.setDirtyState(false)
        this.loadError = ''
      } catch (error) {
        this.loadError = `Unable to save file: ${error?.message || String(error)}`
      } finally {
        this.isSaving = false
      }
    },
    async loadEditor () {
      try {
        const starter = await this.loadContent(this.id)
        this.loadError = ''
        this.lastSavedContent = starter
        this.setDirtyState(false)
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
        this.lastSavedContent = ''
        this.setDirtyState(false)
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
