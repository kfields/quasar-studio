<template>
  <div class="tv-shell">
    <ul class="channelbar shadow-2">
      <li
        v-for="(item, index) in items"
        :key="item.to"
        class="channelbar-item shadow-1"
        :class="{ 'router-link-exact-active': isActive(item) }"
        draggable="true"
        @click="openTab(item.to)"
        @dragstart="onDragStart(index, $event)"
        @dragover.prevent
        @drop="onDrop(index)"
        @dragend="onDragEnd"
      >
        <span class="tab-label">
          <span v-if="item.dirty" class="tab-dirty-dot">●</span>{{ item.label }}
        </span>
        <div @click.stop="closeFile(index)" class="channelbar-item-close">
          <q-icon name="fas fa-times" size=".75em" style="margin-left:.75em"/>
        </div>
      </li>
    </ul>
    <q-page-container class="tv-page-container">
      <router-view />
    </q-page-container>
  </div>
</template>

<script>
export default {
  name: 'Tv',
  components: {
  },
  data () {
    return {
      items: [
        { label: 'Welcome', to: '/', dirty: false }
      ],
      dragIndex: null
    }
  },
  created () {
    this.$bus.$on('openFile', this.openFile)
    this.$bus.$on('fileDirtyStateChanged', this.onFileDirtyStateChanged)
  },
  beforeUnmount () {
    this.$bus.$off('openFile', this.openFile)
    this.$bus.$off('fileDirtyStateChanged', this.onFileDirtyStateChanged)
  },
  mounted () {
  },
  methods: {
    isActive (item) {
      return this.$route.path === item.to
    },
    openTab (to) {
      this.$router.push(to)
    },
    openFile (filePath) {
      const label = filePath.split(/[\\/]/).pop() || filePath
      const to = `/edit/${encodeURIComponent(filePath)}`
      const existingIndex = this.items.findIndex((item) => item.to === to)
      if (existingIndex === -1) {
        this.items.push({ label, to, dirty: false })
      }
      this.openTab(to)
    },
    onFileDirtyStateChanged ({ to, isDirty }) {
      const tab = this.items.find((item) => item.to === to)
      if (!tab) return
      tab.dirty = isDirty
    },
    closeFile (index) {
      const closed = this.items[index]
      if (closed?.dirty) {
        const shouldClose = window.confirm(`"${closed.label}" has unsaved changes. Close this tab anyway?`)
        if (!shouldClose) return
      }
      this.items.splice(index, 1)
      if (!closed) return
      if (this.$route.path !== closed.to) return
      const fallback = this.items[index] || this.items[index - 1] || { to: '/' }
      this.openTab(fallback.to)
    },
    onDragStart (index, event) {
      this.dragIndex = index
      event.dataTransfer.effectAllowed = 'move'
    },
    onDrop (index) {
      if (this.dragIndex === null || this.dragIndex === index) return
      const moved = this.items.splice(this.dragIndex, 1)[0]
      this.items.splice(index, 0, moved)
      this.dragIndex = null
    },
    onDragEnd () {
      this.dragIndex = null
    }
  }
}
</script>

<style>
</style>
