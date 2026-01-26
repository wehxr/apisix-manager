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
          此插件用于根据客户端 IP 地址控制访问。支持白名单模式（仅允许指定 IP 访问）和黑名单模式（禁止指定 IP 访问）。
          可以配置单个 IP 地址或 CIDR 网段。
        </div>
      </template>
    </el-alert>
    <el-form-item label="开启插件">
      <el-switch v-model="localEnable" @change="handleEnableChange" />
    </el-form-item>
    <template v-if="localEnable">
      <el-form-item label="限制类型" required>
        <el-radio-group v-model="localType" @change="handleTypeChange">
          <el-radio label="whitelist">白名单（仅允许）</el-radio>
          <el-radio label="blacklist">黑名单（禁止）</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="IP 列表" required>
        <el-input
          :model-value="ipListInput"
          @update:model-value="handleIpListInput"
          @blur="handleBlur"
          type="textarea"
          :rows="4"
          placeholder="每行一个 IP 或 CIDR，如:&#10;192.168.1.1&#10;10.0.0.0/8"
        />
        <div class="form-tip">每行一个 IP 地址或 CIDR 网段</div>
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
      plugin_config_id: null
    })
  }
})

const emit = defineEmits(['update:modelValue'])

// 使用 composable 加载和管理 Plugin Config
const { plugins, updatePlugins } = usePluginConfig(props, emit)

// 从 plugins 中提取 ip-restriction 配置
const ipRestrictionPlugin = computed(() => plugins.value['ip-restriction'] || {})

// 计算 enabled 状态
const enabled = computed(() => isPluginEnabled(ipRestrictionPlugin.value))

// 计算 type 和 ipList
const type = computed(() => {
  if (!enabled.value) return 'whitelist'
  if (ipRestrictionPlugin.value.whitelist) {
    return 'whitelist'
  } else if (ipRestrictionPlugin.value.blacklist) {
    return 'blacklist'
  }
  return 'whitelist'
})

const ipList = computed(() => {
  if (!enabled.value) return []
  if (ipRestrictionPlugin.value.whitelist) {
    return ipRestrictionPlugin.value.whitelist
  } else if (ipRestrictionPlugin.value.blacklist) {
    return ipRestrictionPlugin.value.blacklist
  }
  return []
})

// 内部状态
const localEnable = ref(enabled.value)
const localType = ref(type.value)
const ipListInput = ref('')

// 初始化 IP 列表输入
if (ipList.value.length > 0) {
  ipListInput.value = ipList.value.join('\n')
}

// 监听 props 变化，更新内部状态
watch([enabled, type, ipList], ([newEnabled, newType, newIpList]) => {
  localEnable.value = newEnabled
  localType.value = newType
  if (newIpList && newIpList.length > 0) {
    ipListInput.value = newIpList.join('\n')
  } else {
    ipListInput.value = ''
  }
}, { immediate: true })

// 监听内部状态变化，更新到父组件
watch([localEnable, localType], ([newEnabled, newType]) => {
  const currentPlugins = { ...plugins.value }
  
  if (newEnabled) {
    currentPlugins['ip-restriction'] = {}
    setPluginEnabled(currentPlugins['ip-restriction'], true)
    
    // 根据类型设置 whitelist 或 blacklist
    if (ipListInput.value && ipListInput.value.trim()) {
      const ips = ipListInput.value.split('\n').map(s => s.trim()).filter(s => s)
      if (newType === 'whitelist') {
        currentPlugins['ip-restriction'].whitelist = ips
      } else {
        currentPlugins['ip-restriction'].blacklist = ips
      }
    }
  } else {
    currentPlugins['ip-restriction'] = currentPlugins['ip-restriction'] || {}
    setPluginEnabled(currentPlugins['ip-restriction'], false)
  }
  
  updatePlugins(currentPlugins)
})

const handleEnableChange = (value) => {
  localEnable.value = value
}

const handleTypeChange = (value) => {
  localType.value = value
  // 类型变化时立即更新配置
  const currentPlugins = { ...plugins.value }
  
  if (localEnable.value) {
    currentPlugins['ip-restriction'] = {}
    setPluginEnabled(currentPlugins['ip-restriction'], true)
    
    if (ipListInput.value && ipListInput.value.trim()) {
      const ips = ipListInput.value.split('\n').map(s => s.trim()).filter(s => s)
      if (value === 'whitelist') {
        currentPlugins['ip-restriction'].whitelist = ips
      } else {
        currentPlugins['ip-restriction'].blacklist = ips
      }
    }
  }
  
  updatePlugins(currentPlugins)
}

const handleIpListInput = (value) => {
  ipListInput.value = value
}

const handleBlur = () => {
  const currentPlugins = { ...plugins.value }
  
  if (ipListInput.value && localEnable.value) {
    const ips = ipListInput.value.split('\n').map(s => s.trim()).filter(s => s)
    currentPlugins['ip-restriction'] = {}
    setPluginEnabled(currentPlugins['ip-restriction'], true)
    
    if (localType.value === 'whitelist') {
      currentPlugins['ip-restriction'].whitelist = ips
    } else {
      currentPlugins['ip-restriction'].blacklist = ips
    }
  } else if (!localEnable.value) {
    currentPlugins['ip-restriction'] = currentPlugins['ip-restriction'] || {}
    setPluginEnabled(currentPlugins['ip-restriction'], false)
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