<template>
  <div>
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
        <span class="tab-label">{{ item.label }}</span>
        <div @click.stop="closeFile(index)" class="channelbar-item-close">
          <q-icon name="fas fa-times" size=".75em" style="margin-left:.75em"/>
        </div>
      </li>
    </ul>
    <q-page-container>
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
        { label: 'Welcome', to: '/' }
      ],
      dragIndex: null
    }
  },
  created () {
    this.$bus.$on('openFile', this.openFile)
  },
  beforeUnmount () {
    this.$bus.$off('openFile', this.openFile)
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
        this.items.push({ label, to })
      }
      this.openTab(to)
    },
    closeFile (index) {
      const closed = this.items[index]
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
