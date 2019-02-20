<template>
  <div class="sidebar">
    <div class="button-column" style="float: left">
      <q-btn flat icon="far fa-copy" to="/"/>
      <q-btn flat icon="fas fa-share-alt" to="/graph"/>
    </div>
    <div style="white-space: nowrap; overflow: hidden; min-height: 100vh !important; background-color: #111111;">
      <FileTree :node="this.folder" :opened="true" :isRoot="true"/>
    </div>
  </div>
</template>

<script>
import FileTree from 'components/FileTree'
import process from 'process'
export default {
  name: 'Sidebar',
  components: {
    FileTree
  },
  data () {
    return {
      folder: { path: process.cwd(), children: [] }
    }
  },
  created () {
  },
  mounted () {
  },
  methods: {
  }
}
</script>
