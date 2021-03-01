// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import App from './App'
import router from './router'
import Axios from 'axios'

Vue.prototype.$axios = Axios
// Axios.defaults.baseURL = "http://127.0.0.1:18888/" 
Vue.prototype.$model = 'http://127.0.0.1:18888/'
// Vue.prototype.$model = 'http://47.113.95.5:18888/'

Vue.config.productionTip = false

/* eslint-disable no-new */
new Vue({
  el: '#app',
  router,
  components: { App },
  template: '<App/>'
})
