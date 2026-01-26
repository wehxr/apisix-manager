import { createRouter, createWebHistory } from 'vue-router'
import Layout from '../components/Layout.vue'
import Settings from '../views/Settings.vue'
import Dashboard from '../views/Dashboard.vue'
import SSL from '../views/SSL.vue'
import Consumer from '../views/Consumer.vue'
import ConsumerGroup from '../views/ConsumerGroup.vue'
import Upstream from '../views/Upstream.vue'
import Route from '../views/Route.vue'
import GlobalRule from '../views/GlobalRule.vue'
import { getConfig } from '../utils/api'

const routes = [
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', component: Dashboard },
      { path: 'settings', component: Settings },
      { path: 'ssl', component: SSL },
      { path: 'consumer', component: Consumer },
      { path: 'consumer-group', component: ConsumerGroup },
      { path: 'upstream', component: Upstream },
      { path: 'route', component: Route },
      { path: 'global-rule', component: GlobalRule }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫：检查 admin key
router.beforeEach((to, from, next) => {
  try {
    const config = getConfig()
    // 如果没有 adminKey 且不是访问设置页面，则重定向到设置页面
    if (!config.adminKey && to.path !== '/settings') {
      next('/settings')
    } else {
      next()
    }
  } catch (error) {
    // 如果获取配置失败，也允许访问设置页面
    if (to.path !== '/settings') {
      next('/settings')
    } else {
      next()
    }
  }
})

export default router
