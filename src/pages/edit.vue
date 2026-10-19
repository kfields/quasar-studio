<template>
  <q-page>
    <div ref="editor"></div>
    <div v-if="loadError" class="text-negative q-pa-sm">{{ loadError }}</div>
  </q-page>
</template>

<script>
import { EditorState } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { basicSetup } from 'codemirror'
import { defaultKeymap } from '@codemirror/commands'

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
            changes: { from: 0, to: this.cm.state.doc.length, insert: content }
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
    async loadContent (filePath) {
      if (!window.studioFs || !filePath) return ''
      return window.studioFs.readFile(this.decodeFilePath(filePath))
    },
    getEditorExtensions () {
      return [
        basicSetup,
        keymap.of(defaultKeymap),
        EditorView.lineWrapping,
        darkEditorTheme
      ]
    },
    async loadEditor () {
      try {
        const starter = await this.loadContent(this.id)
        this.loadError = ''
        const state = EditorState.create({
          doc: starter,
          extensions: this.getEditorExtensions()
        })
        this.cm = new EditorView({
          state,
          parent: this.$refs.editor
        })
      } catch (error) {
        this.loadError = `Unable to load file: ${error?.message || String(error)}`
        const state = EditorState.create({
          doc: '',
          extensions: this.getEditorExtensions()
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
