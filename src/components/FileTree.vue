<template>
  <li class="filetree" @click.stop="toggle" @contextmenu.prevent.stop="openContextMenu">
    <div v-if="isDirectory && !isRoot" class="filetree-expand">
      <q-icon v-if="expanded" name="fas fa-caret-up" size=".75em"/>
      <q-icon v-else name="fas fa-caret-right" size=".75em"/>
    </div>
    <span
      v-if="!isRoot"
      class="label"
      :class="{ 'is-active': isActiveFile }"
      tabindex="0"
      @keydown.stop="handleKeydown"
    >
      <q-icon :name="nodeIcon" size="14px" :class="['filetree-node-icon', nodeIconClass]" />
      <span class="label-text">{{ node.label }}</span>
    </span>
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
      <FileTree v-for="child in children" :node="child" :key="child.path"/>
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
    if (typeof this.node?.isDirectory === 'boolean') {
      this.isDirectory = this.node.isDirectory
    } else {
      this.isDirectory = await this.getNodeIsDirectory(this.node)
    }
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
    },
    nodeIcon () {
      if (this.isDirectory) {
        return this.expanded ? 'folder_open' : 'folder'
      }
      const normalizedName = this.getNormalizedFileName(this.node?.label)
      const normalizedPath = this.getNormalizedNodePath(this.node?.path)
      if (normalizedName === 'package.json') return 'inventory'
      if (normalizedName === 'dockerfile') return 'view_in_ar'
      if (normalizedName === 'license' || normalizedName === 'license.md') return 'gavel'
      if (normalizedName === '.env' || normalizedName.startsWith('.env.')) return 'key'
      if (normalizedName === 'readme' || normalizedName === 'readme.md' || normalizedName === 'readme.txt') return 'menu_book'
      if (['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb'].includes(normalizedName)) return 'lock'
      if (normalizedPath.includes('/.github/workflows/') && ['yml', 'yaml'].includes(this.getFileExtension(normalizedName))) {
        return 'precision_manufacturing'
      }
      const extension = this.getFileExtension(this.node?.label)
      if (['js', 'mjs', 'cjs', 'jsx'].includes(extension)) return 'javascript'
      if (['ts', 'tsx'].includes(extension)) return 'data_object'
      if (['json', 'yml', 'yaml', 'toml', 'ini'].includes(extension)) return 'settings'
      if (['md', 'markdown', 'txt', 'rst'].includes(extension)) return 'article'
      if (['html', 'htm', 'xml', 'svg'].includes(extension)) return 'code'
      if (['css', 'scss', 'sass', 'less'].includes(extension)) return 'palette'
      if (['vue'].includes(extension)) return 'web'
      if (['py', 'rb', 'php', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'hpp'].includes(extension)) return 'terminal'
      if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'bmp'].includes(extension)) return 'image'
      if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(extension)) return 'movie'
      if (['mp3', 'wav', 'ogg', 'flac'].includes(extension)) return 'audiotrack'
      if (['zip', 'tar', 'gz', 'tgz', '7z', 'rar'].includes(extension)) return 'inventory_2'
      if (['pdf'].includes(extension)) return 'picture_as_pdf'
      return 'description'
    },
    nodeIconClass () {
      if (this.isDirectory) {
        return 'filetree-node-icon--folder'
      }
      const normalizedName = this.getNormalizedFileName(this.node?.label)
      const normalizedPath = this.getNormalizedNodePath(this.node?.path)
      if (normalizedName === 'package.json') return 'filetree-node-icon--package'
      if (normalizedName === 'dockerfile') return 'filetree-node-icon--docker'
      if (normalizedName === 'license' || normalizedName === 'license.md') return 'filetree-node-icon--license'
      if (normalizedName === '.env' || normalizedName.startsWith('.env.')) return 'filetree-node-icon--env'
      if (normalizedName === 'readme' || normalizedName === 'readme.md' || normalizedName === 'readme.txt') return 'filetree-node-icon--readme'
      if (['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb'].includes(normalizedName)) return 'filetree-node-icon--lockfile'
      if (normalizedPath.includes('/.github/workflows/') && ['yml', 'yaml'].includes(this.getFileExtension(normalizedName))) {
        return 'filetree-node-icon--workflow'
      }
      const extension = this.getFileExtension(this.node?.label)
      if (['js', 'mjs', 'cjs', 'jsx', 'ts', 'tsx', 'vue', 'html', 'htm', 'xml', 'css', 'scss', 'sass', 'less'].includes(extension)) {
        return 'filetree-node-icon--code'
      }
      if (['json', 'yml', 'yaml', 'toml', 'ini'].includes(extension)) return 'filetree-node-icon--config'
      if (['md', 'markdown', 'txt', 'rst'].includes(extension)) return 'filetree-node-icon--docs'
      if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'bmp', 'svg'].includes(extension)) return 'filetree-node-icon--image'
      if (['mp4', 'webm', 'mov', 'avi', 'mkv', 'mp3', 'wav', 'ogg', 'flac'].includes(extension)) return 'filetree-node-icon--media'
      if (['zip', 'tar', 'gz', 'tgz', '7z', 'rar'].includes(extension)) return 'filetree-node-icon--archive'
      if (['pdf'].includes(extension)) return 'filetree-node-icon--pdf'
      return 'filetree-node-icon--default'
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
    getNormalizedFileName (fileName) {
      if (!fileName || typeof fileName !== 'string') return ''
      return fileName.trim().toLowerCase()
    },
    getNormalizedNodePath (nodePath) {
      if (!nodePath || typeof nodePath !== 'string') return ''
      return nodePath.trim().toLowerCase().replaceAll('\\', '/')
    },
    getFileExtension (fileName) {
      if (!fileName || typeof fileName !== 'string') return ''
      const normalizedName = this.getNormalizedFileName(fileName)
      const dotIndex = normalizedName.lastIndexOf('.')
      if (dotIndex <= 0 || dotIndex === normalizedName.length - 1) return ''
      return normalizedName.slice(dotIndex + 1)
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
    async handleKeydown (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        await this.toggle()
        return
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        if (this.isDirectory && !this.expanded) {
          this.expanded = true
          await this.readDir()
        }
        return
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        if (this.isDirectory && this.expanded) {
          this.expanded = false
        }
        return
      }
      if (event.key === 'Delete') {
        if (this.isRoot) return
        event.preventDefault()
        await this.deleteNode()
        return
      }
      if (event.key === 'F2') {
        if (this.isRoot) return
        event.preventDefault()
        await this.renameNode()
      }
    },
    sortNodes (left, right) {
      if (left.isDirectory !== right.isDirectory) {
        return left.isDirectory ? -1 : 1
      }
      return left.label.localeCompare(right.label, undefined, { sensitivity: 'base', numeric: true })
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
        const nodes = await Promise.all(files.map(async (file) => {
          const filePath = `${this.node.path}/${file}`
          const isDirectory = await this.getNodeIsDirectory({ path: filePath })
          return { label: file, path: filePath, isDirectory }
        }))
        this.children = nodes.sort(this.sortNodes)
      } catch (error) {
        this.children = []
        this.readError = `Unable to read directory "${this.node.path}": ${error?.message || String(error)}`
      }
    }
  }
}
</script>
