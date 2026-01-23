<template>
  <el-container class="layout-container">
    <el-header class="header">
      <div class="header-content">
        <div class="logo">
          <img src="/logo2.svg" alt="APISIX" class="logo-img" />
          <h2>APISIX Manager</h2>
        </div>
        <div class="menu-wrapper">
          <div class="nav-menu">
            <router-link to="/dashboard" class="nav-item" :class="{ active: activeMenu === '/dashboard' }">
              <el-icon><Odometer /></el-icon>
              <span>仪表盘</span>
            </router-link>
            <router-link to="/route" class="nav-item" :class="{ active: activeMenu === '/route' }">
              <el-icon><Connection /></el-icon>
              <span>路由管理</span>
            </router-link>
            <router-link to="/upstream" class="nav-item" :class="{ active: activeMenu === '/upstream' }">
              <el-icon><Monitor /></el-icon>
              <span>上游服务</span>
            </router-link>
            <router-link to="/consumer" class="nav-item" :class="{ active: activeMenu === '/consumer' }">
              <el-icon><User /></el-icon>
              <span>消费者</span>
            </router-link>
            <router-link to="/ssl" class="nav-item" :class="{ active: activeMenu === '/ssl' }">
              <el-icon><Lock /></el-icon>
              <span>证书管理</span>
            </router-link>
          </div>
          <router-link to="/settings" class="nav-item settings-item" :class="{ active: activeMenu === '/settings' }">
            <el-icon><Setting /></el-icon>
          </router-link>
        </div>
      </div>
    </el-header>
    <el-main class="main-content">
      <div class="main-content-wrapper">
        <router-view />
      </div>
    </el-main>
  </el-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Lock, User, Monitor, Connection, Setting, Odometer } from '@element-plus/icons-vue'

const route = useRoute()
const activeMenu = computed(() => route.path)
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

.logo h2 {
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

.settings-item {
  margin-left: auto;
  padding: 0 16px;
}

.settings-item .el-icon {
  margin-right: 0;
  font-size: 20px;
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
</style>
