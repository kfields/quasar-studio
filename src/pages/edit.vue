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
    async loadEditor () {
      try {
        const starter = await this.loadContent(this.id)
        this.loadError = ''
        const state = EditorState.create({
          doc: starter,
          extensions: [
            basicSetup,
            keymap.of(defaultKeymap),
            EditorView.lineWrapping
          ]
        })
        this.cm = new EditorView({
          state,
          parent: this.$refs.editor
        })
      } catch (error) {
        this.loadError = `Unable to load file: ${error?.message || String(error)}`
        const state = EditorState.create({
          doc: '',
          extensions: [
            basicSetup,
            keymap.of(defaultKeymap),
            EditorView.lineWrapping
          ]
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
