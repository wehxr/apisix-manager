<template>
  <div>
    <el-alert
      title="插件说明"
      type="info"
      :closable="false"
      style="margin-bottom: 20px;"
    >
      <template #default>
        <div style="font-size: 13px; line-height: 1.6;">
          此插件用于为消费者添加 HTTP 基本认证凭证。配置后，消费者可以使用这些凭证进行身份验证。
          用户名和密码是必填项。
        </div>
      </template>
    </el-alert>
    <el-form-item label="开启插件">
      <el-switch :model-value="localEnabled" @update:model-value="handleEnableChange" />
    </el-form-item>
    <template v-if="localEnabled">
      <el-form-item label="用户名" prop="username">
        <el-input
          :model-value="username"
          @update:model-value="handleUsernameChange"
          placeholder="请输入用户名"
        />
        <div class="form-tip">用于基本认证的用户名，通常与消费者用户名相同</div>
      </el-form-item>
      <el-form-item label="密码" prop="password">
        <el-input
          :model-value="password"
          @update:model-value="handlePasswordChange"
          type="password"
          show-password
          placeholder="请输入密码"
        />
        <div class="form-tip">用于基本认证的密码</div>
      </el-form-item>
    </template>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { isPluginEnabled, setPluginEnabled } from '@/utils/plugin'
import { usePluginConfig } from '@/composables/usePluginConfig'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      plugins: {}
    })
  }
})

const emit = defineEmits(['update:modelValue'])

// 使用 composable 加载和管理 Plugin Config
const { plugins, updatePlugins } = usePluginConfig(props, emit)

// 从 plugins 中提取 basic-auth 配置
const basicAuthPlugin = computed(() => plugins.value['basic-auth'] || {})

// 计算 enabled 状态（使用统一的 isPluginEnabled 函数）
const enabled = computed(() => {
  return isPluginEnabled(basicAuthPlugin.value)
})

// 计算各个配置项
const username = computed(() => {
  return basicAuthPlugin.value.username || ''
})

const password = computed(() => {
  return basicAuthPlugin.value.password || ''
})

// 内部状态
const localEnabled = ref(enabled.value)
const localUsername = ref(username.value)
const localPassword = ref(password.value)

// 标志：是否正在内部更新，避免触发 watch 重新加载
let isInternalUpdate = false

// 监听 props 变化，更新内部状态（仅在非内部更新时）
watch([enabled, username, password], ([newEnabled, newUsername, newPassword]) => {
  if (isInternalUpdate) {
    isInternalUpdate = false
    return
  }
  localEnabled.value = newEnabled
  localUsername.value = newUsername
  localPassword.value = newPassword
}, { immediate: true })

// 监听内部状态变化，更新到父组件
watch(localEnabled, (newEnabled) => {
  isInternalUpdate = true
  const currentPlugins = { ...plugins.value }
  
  if (newEnabled) {
    // 启用时：确保有 username 和 password（如果为空，使用默认值）
    if (!currentPlugins['basic-auth']) {
      currentPlugins['basic-auth'] = {}
    }
    currentPlugins['basic-auth'] = {
      ...currentPlugins['basic-auth'],
      username: localUsername.value || '',
      password: localPassword.value || ''
    }
    setPluginEnabled(currentPlugins['basic-auth'], true)
  } else {
    // 禁用时：设置 _meta.disable 为 true
    if (currentPlugins['basic-auth']) {
      setPluginEnabled(currentPlugins['basic-auth'], false)
    } else {
      // 如果插件不存在，创建一个并禁用
      currentPlugins['basic-auth'] = {}
      setPluginEnabled(currentPlugins['basic-auth'], false)
    }
  }
  
  updatePlugins(currentPlugins)
})

const handleEnableChange = (value) => {
  localEnabled.value = value
}

const handleUsernameChange = (value) => {
  isInternalUpdate = true
  localUsername.value = value
  const currentPlugins = { ...plugins.value }
  
  // 确保 basic-auth 存在
  if (!currentPlugins['basic-auth']) {
    currentPlugins['basic-auth'] = {}
  }
  
  currentPlugins['basic-auth'] = {
    ...currentPlugins['basic-auth'],
    username: value || ''
  }
  
  // 如果 username 和 password 都存在，确保启用状态
  if (value && currentPlugins['basic-auth'].password) {
    setPluginEnabled(currentPlugins['basic-auth'], true)
  }
  
  updatePlugins(currentPlugins)
}

const handlePasswordChange = (value) => {
  isInternalUpdate = true
  localPassword.value = value
  const currentPlugins = { ...plugins.value }
  
  // 确保 basic-auth 存在
  if (!currentPlugins['basic-auth']) {
    currentPlugins['basic-auth'] = {}
  }
  
  currentPlugins['basic-auth'] = {
    ...currentPlugins['basic-auth'],
    password: value || ''
  }
  
  // 如果 username 和 password 都存在，确保启用状态
  if (value && currentPlugins['basic-auth'].username) {
    setPluginEnabled(currentPlugins['basic-auth'], true)
  }
  
  updatePlugins(currentPlugins)
}
</script>

<style scoped>
.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
  display: block; 
  width: 100%;
}
</style>
