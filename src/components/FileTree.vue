<template>
  <li class="filetree" @click.stop="toggle">
    <div v-if="isDirectory && !isRoot" class="filetree-expand">
      <q-icon v-if="expanded" name="fas fa-caret-up" size=".75em"/>
      <q-icon v-else name="fas fa-caret-right" size=".75em"/>
    </div>
    <span v-if="!isRoot" class="label" @dblclick.stop="openFile">{{ node.label }}</span>
    <ul v-if="expanded && node.children && node.children.length">
      <FileTree v-for="(child, index) in node.children" :node="child" :key="index"/>
    </ul>
  </li>
</template>

<script>
import fs from 'fs'
// import path from 'path'

export default {
  name: 'FileTree',
  props: {
    node: { children: [] },
    opened: false,
    isRoot: false
  },
  data () {
    return {
      isDirectory: false,
      expanded: false
    }
  },
  mounted: function () {
    this.expanded = this.opened
    const dir = this.node.path
    this.isDirectory = fs.statSync(dir).isDirectory()
    if (this.expanded && this.isDirectory) {
      this.readDir()
    }
  },
  methods: {
    openFile (event) {
      if (this.isDirectory) return
      this.$bus.$emit('openFile', this.node.path)
    },
    toggle (event) {
      if (!this.isDirectory) return
      this.expanded = !this.expanded
      this.readDir()
    },
    readDir () {
      this.node.children = []
      const dir = this.node.path
      let files = fs.readdirSync(dir)
      for (let file of files) {
        const filePath = `${dir}/${file}`
        const child = {label: file, path: filePath}
        this.node.children.push(child)
      }
    }
  }
}
</script>
