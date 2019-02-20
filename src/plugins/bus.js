export default ({ app, router, Vue }) => {
  Vue.prototype.$bus = new Vue()
}
