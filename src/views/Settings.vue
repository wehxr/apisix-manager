<template>
  <div class="settings-page">
    <el-card class="settings-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span>系统设置</span>
        </div>
      </template>
      <div class="settings-content">
        <el-alert
          title="提示"
          type="info"
          :closable="false"
          show-icon
          style="margin-bottom: 24px;"
        >
          <template #default>
            <span>这些配置信息仅保存在浏览器本地存储中，不会上传到服务器。清除浏览器数据或更换浏览器后需要重新配置。</span>
          </template>
        </el-alert>
        <el-form :model="form" label-width="150px" class="settings-form">
          <el-form-item label="APISIX 地址">
            <el-input 
              v-model="form.baseURL" 
              placeholder="http://127.0.0.1:9180"
            />
            <div class="form-tip">APISIX Admin API 的访问地址</div>
          </el-form-item>
          <el-form-item label="Admin Key">
            <el-input
              v-model="form.adminKey"
              type="password"
              show-password
              placeholder="请输入 Admin Key"
            />
            <div class="form-tip">Admin Key 用于访问 APISIX Admin API，请妥善保管</div>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="saveConfigHandler">保存配置</el-button>
            <el-button @click="testConnection">测试连接</el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getConfig, saveConfig, refreshApiInstance, upstreamApi } from '../utils/api'

const form = ref({
  baseURL: 'http://127.0.0.1:9180',
  adminKey: ''
})

onMounted(() => {
  const config = getConfig()
  form.value = {
    baseURL: config.baseURL || 'http://127.0.0.1:9180',
    adminKey: config.adminKey || ''
  }
})

const saveConfigHandler = () => {
  if (!form.value.adminKey) {
    ElMessage.warning('请输入 Admin Key')
    return
  }
  saveConfig(form.value)
  refreshApiInstance()
  ElMessage.success('配置已保存')
}

const testConnection = async () => {
  if (!form.value.adminKey) {
    ElMessage.warning('请先输入 Admin Key')
    return
  }
  
  // 临时保存配置以测试
  saveConfig(form.value)
  refreshApiInstance()
  
  try {
    await upstreamApi.list()
    ElMessage.success('连接成功！')
  } catch (error) {
    // 错误消息已由拦截器自动显示
  }
}
</script>

<style scoped>
.settings-page {
  max-width: 800px;
  margin: 0 auto;
}

.card-header {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.settings-content {
  padding: 24px;
}

.settings-form {
  max-width: 600px;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 6px;
  line-height: 1.5;
}
</style>
