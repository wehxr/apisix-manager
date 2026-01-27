<template>
  <router-view />
</template>

<script setup>
// App 组件只负责渲染路由视图
// 路由守卫在 router/index.js 中处理
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  background-color: #f5f7fa;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  min-height: 100vh;
}

/* Element Plus 深绿色主题 */
:root {
  --el-color-primary: #2d8659;
  --el-color-primary-light-3: #4da375;
  --el-color-primary-light-5: #6db88a;
  --el-color-primary-light-7: #8dcd9f;
  --el-color-primary-light-8: #9dd5ab;
  --el-color-primary-light-9: #bde5c7;
  --el-color-primary-dark-2: #1e5c3d;
  --el-color-primary-rgb: 45, 134, 89;
  
  /* 成功色保持绿色系 */
  --el-color-success: #67c23a;
  --el-color-success-light-3: #85ce61;
  --el-color-success-light-5: #95d475;
  --el-color-success-light-7: #b3e19d;
  --el-color-success-light-8: #c2e7b0;
  --el-color-success-light-9: #d1edc4;
  --el-color-success-dark-2: #529b2e;
}

/* 全局卡片样式 */
.el-card {
  border-radius: 4px;
  border: 1px solid #e4e7ed;
}

.el-card__header {
  background-color: #ffffff;
  border-top: 3px solid var(--el-color-primary-light-5);
  border-bottom: 1px solid #e4e7ed;
  padding: 18px 20px;
  font-weight: 600;
}

/* 表格样式 */
.el-table {
  border-radius: 4px;
}

.el-table th {
  background-color: #fafafa;
  color: #606266;
  font-weight: 600;
}

/* 按钮样式 */
.el-button {
  border-radius: 4px;
}

/* 标签样式 */
.el-tag {
  border-radius: 4px;
}

/* 输入框样式 */
.el-input__wrapper {
  border-radius: 4px;
}

/* 对话框样式 */
.el-dialog {
  border-radius: 4px;
}

/* 移动端全局样式优化 */
@media (max-width: 768px) {
  .el-dialog {
    width: 90% !important;
  }
  
  .el-dialog__body {
    max-height: 70vh;
    overflow-y: auto;
  }
}

/* 移动端触摸优化 */
@media (max-width: 768px) {
  .el-button,
  .el-input__inner,
  .el-select,
  .el-checkbox,
  .el-radio {
    -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
  }

  /* 优化滚动体验 */
  .el-table__body-wrapper,
  .el-dialog__body {
    -webkit-overflow-scrolling: touch;
  }
}
</style>
