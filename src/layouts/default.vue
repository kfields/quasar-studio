<template>
  <q-layout view="lHh Lpr lFf">
    <q-splitter
      v-model="splitterModel"
      style="height: 100vh"
    >
    <template v-slot:before>
      <Sidebar/>
    </template>
    <template v-slot:after>
      <Tv>
        <router-view />
      </Tv>
    </template>
  </q-splitter>
  </q-layout>
</template>

<script>
import { ref } from 'vue'
import Sidebar from '@/components/Sidebar.vue'
import Tv from '@/components/Tv.vue'
export default {
  setup () {
    return {
      splitterModel: ref(25) // start at 50%
    }
  },
  name: 'LayoutDefault',
  components: {
    Sidebar,
    Tv
  },
  data () {
    return {}
  },
  mounted () {
  },
  methods: {
  }
}
</script>

<style>
</style>
