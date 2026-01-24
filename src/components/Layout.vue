<template>
  <el-container class="layout-container">
    <el-header class="header">
      <div class="header-content">
        <div class="logo">
          <img src="/logo2.svg" alt="APISIX" class="logo-img" />
          <h2 class="logo-text">APISIX Manager</h2>
        </div>
        <div class="menu-wrapper">
          <div class="nav-menu" :class="{ 'mobile-menu-open': mobileMenuOpen }">
            <router-link to="/dashboard" class="nav-item" :class="{ active: activeMenu === '/dashboard' }" @click="closeMobileMenu">
              <el-icon><Odometer /></el-icon>
              <span>仪表盘</span>
            </router-link>
            <router-link to="/route" class="nav-item" :class="{ active: activeMenu === '/route' }" @click="closeMobileMenu">
              <el-icon><Connection /></el-icon>
              <span>路由管理</span>
            </router-link>
            <router-link to="/upstream" class="nav-item" :class="{ active: activeMenu === '/upstream' }" @click="closeMobileMenu">
              <el-icon><Monitor /></el-icon>
              <span>上游服务</span>
            </router-link>
            <router-link to="/consumer" class="nav-item" :class="{ active: activeMenu === '/consumer' }" @click="closeMobileMenu">
              <el-icon><User /></el-icon>
              <span>消费者</span>
            </router-link>
            <router-link to="/ssl" class="nav-item" :class="{ active: activeMenu === '/ssl' }" @click="closeMobileMenu">
              <el-icon><Lock /></el-icon>
              <span>证书管理</span>
            </router-link>
          </div>
          <div class="header-actions">
            <router-link to="/settings" class="nav-item settings-item" :class="{ active: activeMenu === '/settings' }" @click="closeMobileMenu">
              <el-icon><Setting /></el-icon>
            </router-link>
            <el-button 
              class="mobile-menu-btn" 
              @click="toggleMobileMenu"
              :icon="mobileMenuOpen ? Close : Menu"
              circle
            />
          </div>
        </div>
      </div>
    </el-header>
    <!-- 移动端遮罩层 -->
    <div v-if="mobileMenuOpen" class="mobile-overlay" @click="closeMobileMenu"></div>
    <el-main class="main-content">
      <div class="main-content-wrapper">
        <router-view />
      </div>
    </el-main>
  </el-container>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { Lock, User, Monitor, Connection, Setting, Odometer, Menu, Close } from '@element-plus/icons-vue'

const route = useRoute()
const activeMenu = computed(() => route.path)
const mobileMenuOpen = ref(false)

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
  margin-right: 20px;
  flex-shrink: 0;
}

.logo-text {
  font-size: 16px;
  white-space: nowrap;
}

.menu-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  overflow: visible;
  gap: 10px;
}

.logo-img {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
}

.nav-menu {
  display: flex;
  align-items: center;
  gap: 0;
  flex: 1;
  overflow: visible;
}

.nav-item {
  display: inline-flex;
  align-items: center;
  height: 64px;
  line-height: 64px;
  padding: 0 16px;
  color: #606266;
  text-decoration: none;
  border-bottom: 2px solid transparent;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 0.3s;
  cursor: pointer;
}

.nav-item:hover {
  color: var(--el-color-primary);
  border-bottom-color: var(--el-color-primary);
}

.nav-item.active {
  color: var(--el-color-primary);
  border-bottom-color: var(--el-color-primary);
}

.nav-item .el-icon {
  margin-right: 6px;
  font-size: 18px;
  flex-shrink: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.settings-item {
  padding: 0 16px;
}

.settings-item .el-icon {
  margin-right: 0;
  font-size: 20px;
}

.mobile-menu-btn {
  display: none;
}

.mobile-overlay {
  display: none;
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

/* 移动端适配 */
@media (max-width: 768px) {
  .header-content {
    padding: 0 12px;
  }

  .logo-text {
    font-size: 14px;
  }

  .logo-img {
    width: 28px;
    height: 28px;
  }

  .mobile-menu-btn {
    display: inline-flex !important;
    padding: 8px;
  }

  .nav-menu {
    position: fixed;
    top: 64px;
    left: 0;
    right: 0;
    background: #ffffff;
    flex-direction: column;
    align-items: stretch;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease;
    z-index: 999;
  }

  .nav-menu.mobile-menu-open {
    max-height: 500px;
    padding: 10px 0;
  }

  .nav-item {
    height: 48px;
    line-height: 48px;
    padding: 0 20px;
    border-bottom: 1px solid #f0f0f0;
    border-left: 3px solid transparent;
    justify-content: flex-start;
  }

  .nav-item.active {
    border-left-color: var(--el-color-primary);
    background-color: #f5f7fa;
  }

  .nav-item .el-icon {
    margin-right: 12px;
  }

  .settings-item {
    padding: 0 20px;
  }

  .mobile-overlay {
    display: block;
    position: fixed;
    top: 64px;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.3);
    z-index: 998;
  }

  .main-content {
    padding: 12px;
  }
}

@media (max-width: 480px) {
  .logo-text {
    font-size: 12px;
  }

  .header-content {
    padding: 0 8px;
  }
}
</style>
