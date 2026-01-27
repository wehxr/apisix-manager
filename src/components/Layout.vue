<template>
  <el-container class="layout-container">
    <el-header class="header">
      <div class="header-content">
        <div class="logo">
          <img src="/logo2.svg" alt="APISIX" class="logo-img" />
          <h2 class="logo-text">APISIX Manager</h2>
        </div>
        
        <!-- Desktop Menu -->
        <div class="menu-wrapper desktop-menu">
          <el-menu
            :default-active="activeMenu"
            mode="horizontal"
            router
            :ellipsis="false"
            class="el-menu-demo"
          >
            <template v-for="item in menuItems" :key="item.path || item.label">
              <el-sub-menu v-if="item.children" :index="item.label">
                <template #title>
                  <el-icon><component :is="item.icon" /></el-icon>
                  <span>{{ item.label }}</span>
                </template>
                <el-menu-item 
                  v-for="child in item.children" 
                  :key="child.path" 
                  :index="child.path"
                >
                  {{ child.label }}
                </el-menu-item>
              </el-sub-menu>
              
              <el-menu-item v-else :index="item.path">
                <el-icon><component :is="item.icon" /></el-icon>
                <span>{{ item.label }}</span>
              </el-menu-item>
            </template>
          </el-menu>
        </div>

        <div class="header-actions">
          <router-link to="/settings" class="settings-btn">
            <el-icon><Setting /></el-icon>
          </router-link>
          <el-button 
            class="mobile-menu-btn" 
            @click="toggleMobileMenu"
            :icon="Menu"
            circle
            text
          />
        </div>
      </div>
    </el-header>

    <!-- Mobile Drawer Menu -->
    <el-drawer
      v-model="mobileMenuOpen"
      direction="ltr"
      size="280px"
      :with-header="false"
      class="mobile-drawer"
    >
      <div class="mobile-menu-header">
        <img src="/logo2.svg" alt="APISIX" class="mobile-logo-img" />
        <h2 class="mobile-logo-text">APISIX Manager</h2>
      </div>
      <el-menu
        :default-active="activeMenu"
        class="mobile-el-menu"
        router
      >
        <template v-for="item in menuItems" :key="item.path || item.label">
          <el-sub-menu v-if="item.children" :index="item.label">
            <template #title>
              <el-icon><component :is="item.icon" /></el-icon>
              <span>{{ item.label }}</span>
            </template>
            <el-menu-item 
              v-for="child in item.children" 
              :key="child.path" 
              :index="child.path"
              @click="closeMobileMenu"
            >
              {{ child.label }}
            </el-menu-item>
          </el-sub-menu>
          
          <el-menu-item v-else :index="item.path" @click="closeMobileMenu">
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.label }}</span>
          </el-menu-item>
        </template>
      </el-menu>
    </el-drawer>

    <el-main class="main-content">
      <div class="main-content-wrapper">
        <router-view />
      </div>
    </el-main>
  </el-container>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Lock, User, Monitor, Connection, Setting, Odometer, Menu, Tools } from '@element-plus/icons-vue'

const route = useRoute()
const activeMenu = computed(() => route.path)
const mobileMenuOpen = ref(false)

const menuItems = [
  { path: '/dashboard', label: '仪表盘', icon: Odometer },
  { path: '/route', label: '路由管理', icon: Connection },
  { path: '/upstream', label: '上游服务', icon: Monitor },
  { 
    label: '消费者', 
    icon: User,
    children: [
      { path: '/consumer', label: '消费者' },
      { path: '/consumer-group', label: '消费者组' }
    ]
  },
  { path: '/ssl', label: '证书管理', icon: Lock },
  { path: '/global-rule', label: '全局规则', icon: Tools },
]

const toggleMobileMenu = () => {
  mobileMenuOpen.value = !mobileMenuOpen.value
}

const closeMobileMenu = () => {
  mobileMenuOpen.value = false
}
</script>

<style scoped>
.layout-container {
  min-height: 100vh;
  background: #f5f7fa;
}

.header {
  background-color: #ffffff;
  border-bottom: 1px solid #e4e7ed;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  padding: 0;
  height: 64px !important;
  position: relative;
  z-index: 1000;
}

.header-content {
  max-width: 1600px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding: 0 20px;
  width: 100%;
  box-sizing: border-box;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-right: 40px;
  flex-shrink: 0;
}

.logo-text {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  white-space: nowrap;
}

.logo-img {
  width: 32px;
  height: 32px;
}

.menu-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  height: 100%;
  overflow: hidden;
}

.el-menu-demo {
  border-bottom: none !important;
  background-color: transparent;
  width: 100%;
  height: 64px;
}

:deep(.el-menu--horizontal > .el-menu-item),
:deep(.el-menu--horizontal > .el-sub-menu .el-sub-menu__title) {
  height: 64px;
  line-height: 64px;
  border-bottom: 2px solid transparent;
  color: #606266;
  font-size: 15px;
}

:deep(.el-menu--horizontal > .el-menu-item.is-active),
:deep(.el-menu--horizontal > .el-sub-menu.is-active .el-sub-menu__title) {
  border-bottom: 2px solid var(--el-color-primary);
  color: var(--el-color-primary) !important;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-left: 20px;
}

.settings-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #606266;
  font-size: 20px;
  transition: color 0.3s;
  padding: 8px;
}

.settings-btn:hover {
  color: var(--el-color-primary);
}

.mobile-menu-btn {
  display: none;
  font-size: 24px;
  color: #606266;
}

/* Mobile Drawer Styles */
.mobile-menu-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px;
  border-bottom: 1px solid #e4e7ed;
  margin-bottom: 10px;
}

.mobile-logo-img {
  width: 28px;
  height: 28px;
}

.mobile-logo-text {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.mobile-el-menu {
  border-right: none;
}

.main-content {
  background-color: #f5f7fa;
  padding: 20px;
  min-height: calc(100vh - 64px);
}

.main-content-wrapper {
  max-width: 1600px;
  margin: 0 auto;
  width: 100%;
}

/* Responsive Design */
@media (max-width: 768px) {
  .desktop-menu {
    display: none;
  }

  .mobile-menu-btn {
    display: inline-flex;
  }

  .header-content {
    padding: 0 16px;
  }
  
  .logo {
    margin-right: auto;
  }
  
  .main-content {
    padding: 16px;
  }
}

@media (max-width: 480px) {
  .logo-text {
    display: none;
  }
}
</style>
