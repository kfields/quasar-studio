
export default [
  {
    path: '/',
    component: () => import('@/layouts/default.vue'),
    children: [
      { path: '', component: () => import('@/pages/index.vue') },
      { path: 'graph', component: () => import('@/pages/graph.vue') },
      { path: 'settings', component: () => import('@/pages/settings.vue') },
      { path: 'edit/:id', component: () => import('@/pages/edit.vue'), props: true }
    ]
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('@/pages/404.vue')
  }

]
