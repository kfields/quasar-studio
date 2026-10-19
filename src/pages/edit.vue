<template>
  <q-page>
    <div ref="editor"></div>
    <div v-if="loadError" class="text-negative q-pa-sm">{{ loadError }}</div>
  </q-page>
</template>

<script>
import { Compartment, EditorState } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { basicSetup } from 'codemirror'
import { defaultKeymap } from '@codemirror/commands'
import { css } from '@codemirror/lang-css'
import { html } from '@codemirror/lang-html'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { markdown } from '@codemirror/lang-markdown'
import { python } from '@codemirror/lang-python'
import { sql } from '@codemirror/lang-sql'
import { yaml } from '@codemirror/lang-yaml'

const darkEditorTheme = EditorView.theme({
  '&': {
    color: '#d4d4d4',
    backgroundColor: '#1e1e1e',
    minHeight: '100%'
  },
  '.cm-content': {
    caretColor: '#ffffff'
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: '#ffffff'
  },
  '.cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: '#264f78'
  },
  '.cm-gutters': {
    backgroundColor: '#252526',
    color: '#858585',
    border: 'none'
  },
  '.cm-activeLine': {
    backgroundColor: '#2a2d2e'
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#2a2d2e'
  }
}, { dark: true })

const languageCompartment = new Compartment()

export default {
  name: 'EditPage',
  props: [
    'id'
  ],
  data () {
    return {
      content: '',
      cm: null,
      loadError: ''
    }
  },
  async mounted () {
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
    async loadContent (filePath) {
      if (!window.studioFs || !filePath) return ''
      return window.studioFs.readFile(this.decodeFilePath(filePath))
    },
    getEditorExtensions (filePath) {
      return [
        basicSetup,
        keymap.of(defaultKeymap),
        EditorView.lineWrapping,
        darkEditorTheme,
        languageCompartment.of(this.getLanguageExtension(filePath))
      ]
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
