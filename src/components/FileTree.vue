<template>
  <li class="filetree" @click.stop="toggle">
    <div v-if="isDirectory && !isRoot" class="filetree-expand">
      <q-icon v-if="expanded" name="fas fa-caret-up" size=".75em"/>
      <q-icon v-else name="fas fa-caret-right" size=".75em"/>
    </div>
    <span v-if="!isRoot" class="label">{{ node.label }}</span>
    <ul v-if="expanded && children.length">
      <FileTree v-for="(child, index) in children" :node="child" :key="index"/>
    </ul>
    <div v-if="readError && isRoot" class="text-negative q-pa-sm">{{ readError }}</div>
  </li>
</template>

<script>
export default {
  name: 'FileTree',
  props: {
    node: { type: Object, default: () => ({ path: '/', children: [] }) },
    opened: { type: Boolean, default: false },
    isRoot: { type: Boolean, default: false }
  },
  data () {
    return {
      isDirectory: false,
      expanded: false,
      children: [],
      readError: ''
    }
  },
  async mounted () {
    this.expanded = this.opened
    this.isDirectory = await this.getNodeIsDirectory(this.node)
    if (this.expanded && this.isDirectory) {
      await this.readDir()
    }
  },
  methods: {
    getStudioFs () {
      return window.studioFs || null
    },
    async getNodeIsDirectory (node) {
      const studioFs = this.getStudioFs()
      if (!studioFs || !node || !node.path) return false
      try {
        const stats = await studioFs.stat(node.path)
        return !!stats.isDirectory
      } catch (error) {
        return false
      }
    },
    openFile () {
      if (this.isDirectory) return
      if (!this.node || !this.node.path) return
      this.$bus.$emit('openFile', this.node.path)
    },
    async toggle () {
      if (!this.isDirectory) {
        this.openFile()
        return
      }
      this.expanded = !this.expanded
      await this.readDir()
    },
    async readDir () {
      const studioFs = this.getStudioFs()
      if (!studioFs || !this.node || !this.node.path) return
      this.children = []
      this.readError = ''

      try {
        const files = await studioFs.readdir(this.node.path)
        for (const file of files) {
          const filePath = `${this.node.path}/${file}`
          this.children.push({ label: file, path: filePath })
        }
      } catch (error) {
        this.children = []
        this.readError = `Unable to read directory "${this.node.path}": ${error?.message || String(error)}`
      }
    }
  }
}
</script>
