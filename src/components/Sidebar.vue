<template>
  <div class="sidebar">
    <div class="button-column" style="float: left">
      <q-btn flat icon="far fa-copy" to="/"/>
      <q-btn flat icon="fas fa-share-alt" to="/graph"/>
      <q-btn flat icon="settings" to="/settings"/>
      <q-btn flat icon="refresh" @click="refreshTree"/>
      <q-btn
        flat
        :icon="$q.dark.isActive ? 'light_mode' : 'dark_mode'"
        @click="$q.dark.toggle()"
      />
    </div>
    <div class="sidebar-content">
      <div v-if="loadError" class="text-negative q-pa-sm">{{ loadError }}</div>
      <ul v-else-if="folder && folder.path" class="q-pa-none q-ma-none">
        <FileTree :key="treeVersion" :node="folder" :opened="true" :isRoot="true"/>
      </ul>
    </div>
  </div>
</template>

<script>
import FileTree from '@/components/FileTree.vue'
export default {
  name: 'Sidebar',
  components: {
    FileTree
  },
  data () {
    return {
      folder: { path: '', children: [] },
      loadError: '',
      treeVersion: 0
    }
  },
  async mounted () {
    if (!window.studioFs) {
      this.loadError = 'Filesystem bridge is unavailable. Start the app in Electron mode (quasar dev -m electron).'
      return
    }
    if (!this.folder) {
      this.folder = { path: '', children: [] }
    }
    try {
      this.folder.path = await window.studioFs.cwd()
    } catch (error) {
      this.loadError = `Unable to load project folder: ${error?.message || String(error)}`
    }
  },
  methods: {
    refreshTree () {
      this.treeVersion += 1
    }
  }
}
</script>
