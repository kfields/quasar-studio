<template>
  <li class="filetree" @click.stop="toggle" @contextmenu.prevent.stop="openContextMenu">
    <div v-if="isDirectory && !isRoot" class="filetree-expand">
      <q-icon v-if="expanded" name="fas fa-caret-up" size=".75em"/>
      <q-icon v-else name="fas fa-caret-right" size=".75em"/>
    </div>
    <span v-if="!isRoot" class="label" :class="{ 'is-active': isActiveFile }">{{ node.label }}</span>
    <q-menu
      ref="contextMenu"
      v-model="contextMenuOpen"
      touch-position
      auto-close
      no-parent-event
    >
      <q-list dense style="min-width: 180px">
        <q-item clickable @click.stop.prevent="runMenuAction(createFile)">
          <q-item-section>New File</q-item-section>
        </q-item>
        <q-item clickable @click.stop.prevent="runMenuAction(createFolder)">
          <q-item-section>New Folder</q-item-section>
        </q-item>
        <q-item v-if="!isRoot" clickable @click.stop.prevent="runMenuAction(renameNode)">
          <q-item-section>Rename</q-item-section>
        </q-item>
        <q-item v-if="!isRoot" clickable @click.stop.prevent="runMenuAction(deleteNode)">
          <q-item-section class="text-negative">Delete</q-item-section>
        </q-item>
        <q-separator />
        <q-item clickable @click.stop.prevent="runMenuAction(requestRefresh)">
          <q-item-section>Refresh</q-item-section>
        </q-item>
      </q-list>
    </q-menu>
    <q-dialog v-model="nameDialogOpen" persistent>
      <q-card style="min-width: 320px">
        <q-card-section class="text-h6">{{ nameDialogTitle }}</q-card-section>
        <q-card-section>
          <q-input
            v-model="nameDialogModel"
            autofocus
            dense
            outlined
            :error="Boolean(nameDialogModel) && Boolean(nameDialogErrorMessage)"
            :error-message="nameDialogErrorMessage"
            @update:model-value="onNameDialogModelChange"
            @keyup.enter="confirmNameDialog"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" @click="cancelNameDialog" />
          <q-btn flat label="OK" color="primary" :disable="!nameDialogValid" @click="confirmNameDialog" />
        </q-card-actions>
      </q-card>
    </q-dialog>
    <q-dialog v-model="confirmDialogOpen" persistent>
      <q-card style="min-width: 320px">
        <q-card-section class="text-h6">{{ confirmDialogTitle }}</q-card-section>
        <q-card-section>{{ confirmDialogMessage }}</q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" @click="cancelConfirmDialog" />
          <q-btn flat label="Confirm" color="negative" @click="confirmConfirmDialog" />
        </q-card-actions>
      </q-card>
    </q-dialog>
    <ul v-if="expanded && children.length">
      <FileTree v-for="(child, index) in children" :node="child" :key="index"/>
    </ul>
    <div v-if="readError" class="text-negative q-pa-sm">{{ readError }}</div>
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
      readError: '',
      contextMenuOpen: false,
      nameDialogOpen: false,
      nameDialogTitle: '',
      nameDialogModel: '',
      nameDialogResolver: null,
      nameDialogParentDir: '',
      nameDialogCurrentPath: '',
      nameDialogDuplicateExists: false,
      nameDialogValidationToken: 0,
      confirmDialogOpen: false,
      confirmDialogTitle: '',
      confirmDialogMessage: '',
      confirmDialogResolver: null,
      refreshTreeListener: null
    }
  },
  async mounted () {
    this.expanded = this.opened
    this.isDirectory = await this.getNodeIsDirectory(this.node)
    if (this.expanded && this.isDirectory) {
      await this.readDir()
    }
  },
  created () {
    this.refreshTreeListener = (payload = {}) => {
      const targetPath = payload?.path || ''
      if (!this.isDirectory) return
      if (!targetPath) {
        if (this.isRoot || this.expanded) {
          void this.readDir()
        }
        return
      }
      if (targetPath === this.node.path) {
        void this.readDir()
      }
    }
    this.$bus.$on('refreshTreeRequest', this.refreshTreeListener)
  },
  beforeUnmount () {
    if (this.refreshTreeListener) {
      this.$bus.$off('refreshTreeRequest', this.refreshTreeListener)
    }
  },
  computed: {
    activeFilePath () {
      const routePath = this.$route?.params?.id
      if (!routePath || Array.isArray(routePath)) return ''
      return this.decodeFilePath(routePath)
    },
    isActiveFile () {
      if (this.isDirectory) return false
      return this.activeFilePath === this.node?.path
    },
    nameDialogValid () {
      const normalizedName = this.normalizeName(this.nameDialogModel)
      if (!this.isValidNodeName(normalizedName)) return false
      return !this.nameDialogDuplicateExists
    },
    nameDialogErrorMessage () {
      const normalizedName = this.normalizeName(this.nameDialogModel)
      if (!normalizedName) return ''
      if (!this.isValidNodeName(normalizedName)) {
        return 'Use a valid name without / or \\'
      }
      if (this.nameDialogDuplicateExists) {
        return 'An item with that name already exists'
      }
      return ''
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
    getStudioFs () {
      return window.studioFs || null
    },
    openContextMenu (event) {
      this.contextMenuOpen = true
      this.$refs.contextMenu?.show(event)
    },
    async runMenuAction (action) {
      this.contextMenuOpen = false
      await action.call(this)
    },
    requestRefresh (path = '') {
      this.$bus.$emit('refreshTreeRequest', { path })
    },
    getParentPath (targetPath) {
      const lastSlash = targetPath.lastIndexOf('/')
      if (lastSlash <= 0) return '/'
      return targetPath.slice(0, lastSlash)
    },
    getContainingDirectory () {
      if (this.isDirectory) return this.node.path
      return this.getParentPath(this.node.path)
    },
    buildChildPath (dirPath, childName) {
      if (dirPath === '/') return `/${childName}`
      return `${dirPath}/${childName}`
    },
    normalizeName (name) {
      return (name || '').trim()
    },
    isValidNodeName (name) {
      if (!name) return false
      if (name === '.' || name === '..') return false
      return !name.includes('/') && !name.includes('\\')
    },
    async pathExists (targetPath) {
      const studioFs = this.getStudioFs()
      if (!studioFs || !targetPath) return false
      try {
        const stats = await studioFs.stat(targetPath)
        return Boolean(stats?.exists)
      } catch (error) {
        return false
      }
    },
    async onNameDialogModelChange () {
      await this.validateNameDialog()
    },
    async validateNameDialog () {
      const token = this.nameDialogValidationToken + 1
      this.nameDialogValidationToken = token
      const normalizedName = this.normalizeName(this.nameDialogModel)
      if (!this.isValidNodeName(normalizedName)) {
        this.nameDialogDuplicateExists = false
        return
      }
      if (!this.nameDialogParentDir) {
        this.nameDialogDuplicateExists = false
        return
      }
      const candidatePath = this.buildChildPath(this.nameDialogParentDir, normalizedName)
      if (candidatePath === this.nameDialogCurrentPath) {
        this.nameDialogDuplicateExists = false
        return
      }
      const exists = await this.pathExists(candidatePath)
      if (token !== this.nameDialogValidationToken) return
      this.nameDialogDuplicateExists = exists
    },
    askForName (title, initialValue = '', options = {}) {
      return new Promise((resolve) => {
        const parentDir = options.parentDir || ''
        const currentPath = options.currentPath || ''
        this.nameDialogTitle = title
        this.nameDialogModel = initialValue
        this.nameDialogResolver = resolve
        this.nameDialogParentDir = parentDir
        this.nameDialogCurrentPath = currentPath
        this.nameDialogDuplicateExists = false
        this.nameDialogOpen = true
        void this.validateNameDialog()
      })
    },
    confirmAction (title, message) {
      return new Promise((resolve) => {
        this.confirmDialogTitle = title
        this.confirmDialogMessage = message
        this.confirmDialogResolver = resolve
        this.confirmDialogOpen = true
      })
    },
    confirmNameDialog () {
      if (!this.nameDialogValid) return
      const resolver = this.nameDialogResolver
      const value = this.normalizeName(this.nameDialogModel)
      this.nameDialogOpen = false
      this.nameDialogTitle = ''
      this.nameDialogModel = ''
      this.nameDialogResolver = null
      this.nameDialogParentDir = ''
      this.nameDialogCurrentPath = ''
      this.nameDialogDuplicateExists = false
      resolver?.(value)
    },
    cancelNameDialog () {
      const resolver = this.nameDialogResolver
      this.nameDialogOpen = false
      this.nameDialogTitle = ''
      this.nameDialogModel = ''
      this.nameDialogResolver = null
      this.nameDialogParentDir = ''
      this.nameDialogCurrentPath = ''
      this.nameDialogDuplicateExists = false
      resolver?.('')
    },
    confirmConfirmDialog () {
      const resolver = this.confirmDialogResolver
      this.confirmDialogOpen = false
      this.confirmDialogTitle = ''
      this.confirmDialogMessage = ''
      this.confirmDialogResolver = null
      resolver?.(true)
    },
    cancelConfirmDialog () {
      const resolver = this.confirmDialogResolver
      this.confirmDialogOpen = false
      this.confirmDialogTitle = ''
      this.confirmDialogMessage = ''
      this.confirmDialogResolver = null
      resolver?.(false)
    },
    async createFile () {
      const studioFs = this.getStudioFs()
      if (!studioFs || !this.node?.path) return
      const parentDir = this.getContainingDirectory()
      const fileName = await this.askForName('New file name', '', { parentDir })
      if (!fileName) return
      const newPath = this.buildChildPath(parentDir, fileName)
      try {
        await studioFs.writeFile(newPath, '')
        this.requestRefresh(parentDir)
      } catch (error) {
        this.readError = `Unable to create file "${fileName}": ${error?.message || String(error)}`
      }
    },
    async createFolder () {
      const studioFs = this.getStudioFs()
      if (!studioFs || !this.node?.path) return
      const parentDir = this.getContainingDirectory()
      const folderName = await this.askForName('New folder name', '', { parentDir })
      if (!folderName) return
      const newPath = this.buildChildPath(parentDir, folderName)
      try {
        await studioFs.mkdir(newPath)
        this.requestRefresh(parentDir)
      } catch (error) {
        this.readError = `Unable to create folder "${folderName}": ${error?.message || String(error)}`
      }
    },
    async renameNode () {
      const studioFs = this.getStudioFs()
      if (!studioFs || !this.node?.path || this.isRoot) return
      const currentName = this.node.label || ''
      const parentDir = this.getParentPath(this.node.path)
      const nextName = await this.askForName('Rename to', currentName, {
        parentDir,
        currentPath: this.node.path
      })
      if (!nextName || nextName === currentName) return
      const newPath = this.buildChildPath(parentDir, nextName)
      try {
        await studioFs.rename(this.node.path, newPath)
        this.requestRefresh(parentDir)
      } catch (error) {
        this.readError = `Unable to rename "${currentName}": ${error?.message || String(error)}`
      }
    },
    async deleteNode () {
      const studioFs = this.getStudioFs()
      if (!studioFs || !this.node?.path || this.isRoot) return
      const confirmed = await this.confirmAction(
        'Delete item',
        `Delete "${this.node.label}"? This cannot be undone.`
      )
      if (!confirmed) return
      try {
        await studioFs.remove(this.node.path, this.isDirectory)
        this.requestRefresh(this.getParentPath(this.node.path))
      } catch (error) {
        this.readError = `Unable to delete "${this.node.label}": ${error?.message || String(error)}`
      }
    },
    async getNodeIsDirectory (node) {
      const studioFs = this.getStudioFs()
      if (!studioFs || !node || !node.path) return false
      try {
        const stats = await studioFs.stat(node.path)
        return !!stats?.isDirectory
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
      if (this.isRoot) return
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
