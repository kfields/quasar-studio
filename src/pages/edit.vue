<template>
  <q-page>
    <textarea ref="editor"></textarea>
  </q-page>
</template>

<script>
import fs from 'fs'
import CodeMirror from 'codemirror'
import 'codemirror/lib/codemirror.css'
// import 'codemirror/theme/monokai.css'
// import 'codemirror/mode/javascript/javascript.js'
import 'codemirror/mode/coffeescript/coffeescript.js'

export default {
  name: 'EditPage',
  props: [
    'id'
  ],
  data () {
    return {
      content: ''
    }
  },
  mounted () {
    const cm = this.cm = CodeMirror.fromTextArea(this.$refs.editor, {
      theme: 'miakai',
      mode: 'coffeescript',
      lineNumbers: true,
      styleActiveLine: true,
      matchBrackets: true,
      tabSize: 2
    })
    const content = fs.readFileSync(this.id, 'utf8')
    cm.setValue(content)
  },
  beforeRouteUpdate (to, from, next) {
    const content = fs.readFileSync(to.params.id, 'utf8')
    this.cm.setValue(content)
    next()
  },
  methods: {
  }
}
</script>
