<template>
  <q-layout view="lHh Lpr lFf">
    <Sidebar ref="left" class="split split-horizontal"/>
    <Tv ref="right" class="split split-horizontal">
      <router-view />
    </Tv>
  </q-layout>
</template>

<script>
import Split from 'split.js'
import Sidebar from 'components/Sidebar'
import Tv from 'components/Tv'
export default {
  name: 'LayoutDefault',
  components: {
    Sidebar,
    Tv
  },
  data () {
    return {
    }
  },
  mounted () {
    Split([this.$refs.left.$el, this.$refs.right.$el], {
      sizes: [25, 75]
    })
  },
  methods: {
  }
}
</script>

<style>
</style>
