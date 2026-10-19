<template>
  <div>
    <ul class="channelbar shadow-2">
      <router-link exact v-for="(item, index) in items" :key="index" tag="li" :to="item.to" class="channelbar-item shadow-1">
        {{ item.label }}
        <div @click.stop="closeFile(index)" class="channelbar-item-close">
          <q-icon name="fas fa-times" size=".75em" style="margin-left:.75em"/>
        </div>
      </router-link>
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
      ]
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
    openFile (filePath) {
      const label = filePath.split(/[\\/]/).pop() || filePath
      const to = `/edit/${encodeURIComponent(filePath)}`
      const existingIndex = this.items.findIndex((item) => item.to === to)
      if (existingIndex === -1) {
        this.items.push({ label, to })
      }
      this.$router.push(to)
    },
    closeFile (index) {
      this.items.splice(index, 1)
      this.$router.go(-1)
    }
  }
}
</script>

<style>
</style>
