<template>
  <q-page class="q-pa-md">
    <q-card flat bordered class="settings-card">
      <q-card-section>
        <div class="text-h6">Settings</div>
        <div class="text-caption">Customize your Quasar Studio experience.</div>
      </q-card-section>

      <q-separator />

      <q-card-section>
        <q-toggle
          :model-value="$q.dark.isActive"
          label="Dark mode"
          @update:model-value="setDarkMode"
        />
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script>
export default {
  name: 'PageSettings',
  methods: {
    setDarkMode (enabled) {
      this.$q.dark.set(enabled)
    }
  }
}
</script>
