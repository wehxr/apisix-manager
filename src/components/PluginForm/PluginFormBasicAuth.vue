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
      <el-switch :model-value="enabled" @update:model-value="handleEnableChange" />
    </el-form-item>
    <template v-if="enabled">
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
import { computed } from 'vue'
import { isPluginEnabled, setPluginEnabled } from '@/utils/plugin'
import { usePluginConfig } from '@/composables/usePluginConfig'

const props = defineProps({
  modelValue: { type: Object, default: () => ({}) },
  resourceType: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])

const { config, updateConfig } = usePluginConfig(props, emit)

const enabled = computed(() => isPluginEnabled(config.value))
const username = computed(() => config.value.username || '')
const password = computed(() => config.value.password || '')

function applyBasicAuth(partial) {
  const cfg = { ...config.value, ...partial }
  const hasCreds = (cfg.username || '').trim() && (cfg.password || '').trim()
  setPluginEnabled(cfg, hasCreds)
  updateConfig(cfg)
}

function handleEnableChange(value) {
  const cfg = value
    ? { ...config.value, username: username.value || '', password: password.value || '' }
    : { ...config.value }
  setPluginEnabled(cfg, value)
  updateConfig(cfg)
}

function handleUsernameChange(value) {
  applyBasicAuth({ username: value || '' })
}

function handlePasswordChange(value) {
  applyBasicAuth({ password: value || '' })
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
