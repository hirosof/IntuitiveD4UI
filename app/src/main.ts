import { createApp } from 'vue'
import { createPinia } from 'pinia'
import VueKonva from 'vue-konva'
import vuetify from './plugins/vuetify'
import App from './App.vue'

const app = createApp(App)
app.use(createPinia())
app.use(vuetify)
app.use(VueKonva)
app.mount('#app')
