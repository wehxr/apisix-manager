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
          此插件用于从 HTTP 请求头或查询参数中提取并设置客户端的真实 IP 地址。
          当 APISIX 位于反向代理（如 Nginx、负载均衡器、CDN）后面时，需要使用此插件来获取真实的客户端 IP，而不是代理服务器的 IP。
        </div>
      </template>
    </el-alert>
    <el-form-item label="开启插件">
      <el-switch :model-value="localEnabled" @update:model-value="handleEnableChange" />
    </el-form-item>
    <template v-if="localEnabled">
      <el-form-item label="IP 来源" required>
        <el-select
          :model-value="source"
          @update:model-value="handleSourceChange"
          placeholder="选择 IP 来源"
          style="width: 100%"
        >
          <el-option label="X-Forwarded-For (http_x_forwarded_for)" value="http_x_forwarded_for" />
          <el-option label="X-Real-IP (http_x_real_ip)" value="http_x_real_ip" />
          <el-option label="Query 参数 realip (arg_realip)" value="arg_realip" />
        </el-select>
        <div class="form-tip">
          指定从哪个变量获取客户端真实 IP 地址：<br/>
          • <strong>http_x_forwarded_for</strong>：从 X-Forwarded-For 请求头获取（常用）<br/>
          • <strong>http_x_real_ip</strong>：从 X-Real-IP 请求头获取<br/>
          • <strong>arg_realip</strong>：从 URL 查询参数 realip 获取，如 /api?realip=1.2.3.4:8080
        </div>
      </el-form-item>
      
      <el-form-item label="可信地址列表">
        <el-input
          :model-value="trustedAddressesInput"
          @update:model-value="handleTrustedAddressesInput"
          @blur="handleTrustedAddressesBlur"
          type="textarea"
          :rows="4"
          placeholder="每行一个 IP 或 CIDR，如:&#10;127.0.0.1&#10;192.168.1.0/24&#10;10.0.0.0/8"
        />
        <div class="form-tip">
          配置可信的代理服务器地址列表。只有来自这些地址的请求才会被信任并提取真实 IP，防止 IP 伪造攻击。<br/>
          格式：每行一个 IP 地址或 CIDR 网段，如：127.0.0.1、192.168.1.0/24、10.0.0.0/8
        </div>
      </el-form-item>
      
      <el-form-item label="递归查找">
        <el-switch
          :model-value="recursive"
          @update:model-value="handleRecursiveChange"
        />
        <div class="form-tip">
          控制多层代理场景下的真实 IP 提取方式：<br/>
          • <strong>关闭（false）</strong>：使用 source 中的最后一个地址，适用于单层代理<br/>
          • <strong>开启（true）</strong>：递归查找，跳过所有可信地址，使用最后一个非可信地址，适用于多层代理（如：客户端 → CDN → 负载均衡器 → APISIX）
        </div>
      </el-form-item>
    </template>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { isPluginEnabled, setPluginEnabled } from '../../utils/plugin'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      plugins: {}
    })
  }
})

const emit = defineEmits(['update:modelValue'])

// 从 plugins 中提取 real-ip 配置
const realIpPlugin = computed(() => props.modelValue.plugins?.['real-ip'] || {})

// 计算 enabled 状态
const enabled = computed(() => isPluginEnabled(realIpPlugin.value))

// 计算 source
const source = computed(() => {
  if (!enabled.value) return ''
  return realIpPlugin.value.source || 'http_x_forwarded_for'
})

// 计算 trusted_addresses
const trustedAddresses = computed(() => {
  if (!enabled.value) return []
  return Array.isArray(realIpPlugin.value.trusted_addresses) 
    ? realIpPlugin.value.trusted_addresses 
    : []
})

// 计算 recursive
const recursive = computed(() => {
  if (!enabled.value) return false
  return realIpPlugin.value.recursive !== undefined ? realIpPlugin.value.recursive : false
})

// 内部状态
const localEnabled = ref(enabled.value)
const trustedAddressesInput = ref('')

// 初始化可信地址输入
if (trustedAddresses.value.length > 0) {
  trustedAddressesInput.value = trustedAddresses.value.join('\n')
}

// 监听 props 变化，更新内部状态
watch([enabled, trustedAddresses], ([newEnabled, newTrustedAddresses]) => {
  localEnabled.value = newEnabled
  if (newTrustedAddresses && newTrustedAddresses.length > 0) {
    trustedAddressesInput.value = newTrustedAddresses.join('\n')
  } else {
    trustedAddressesInput.value = ''
  }
}, { immediate: true })

// 监听内部状态变化，更新到父组件
watch(localEnabled, (newEnabled) => {
  const currentConfig = {
    plugins: { ...props.modelValue.plugins }
  }
  
  if (newEnabled) {
    currentConfig.plugins['real-ip'] = {
      source: source.value || 'http_x_forwarded_for'
    }
    
    // 添加可信地址列表（如果存在）
    if (trustedAddressesInput.value && trustedAddressesInput.value.trim()) {
      const addresses = trustedAddressesInput.value
        .split('\n')
        .map(s => s.trim())
        .filter(s => s)
      if (addresses.length > 0) {
        currentConfig.plugins['real-ip'].trusted_addresses = addresses
      }
    }
    
    // 添加 recursive 配置（如果为 true，false 时可以不添加，但为了明确性还是添加）
    currentConfig.plugins['real-ip'].recursive = recursive.value !== undefined ? recursive.value : false
    
    setPluginEnabled(currentConfig.plugins['real-ip'], true)
  } else {
    // 禁用时保留所有配置，只是设置 _meta.disable = true
    currentConfig.plugins['real-ip'] = {
      ...realIpPlugin.value,
      source: source.value || 'http_x_forwarded_for'
    }
    if (trustedAddresses.value.length > 0) {
      currentConfig.plugins['real-ip'].trusted_addresses = trustedAddresses.value
    }
    if (recursive.value !== undefined) {
      currentConfig.plugins['real-ip'].recursive = recursive.value
    }
    setPluginEnabled(currentConfig.plugins['real-ip'], false)
  }
  
  emit('update:modelValue', currentConfig)
})

const handleEnableChange = (value) => {
  localEnabled.value = value
}

// 更新插件的辅助函数
const updatePlugin = (updates) => {
  const currentConfig = {
    plugins: { ...props.modelValue.plugins }
  }
  
  currentConfig.plugins['real-ip'] = {
    ...realIpPlugin.value,
    ...updates
  }
  setPluginEnabled(currentConfig.plugins['real-ip'], enabled.value)
  
  emit('update:modelValue', currentConfig)
}

const handleSourceChange = (value) => {
  updatePlugin({ source: value })
}

const handleTrustedAddressesInput = (value) => {
  trustedAddressesInput.value = value
}

const handleTrustedAddressesBlur = () => {
  const currentConfig = {
    plugins: { ...props.modelValue.plugins }
  }
  
  if (localEnabled.value) {
    currentConfig.plugins['real-ip'] = {
      ...realIpPlugin.value,
      source: source.value || 'http_x_forwarded_for'
    }
    
    // 处理可信地址列表
    if (trustedAddressesInput.value && trustedAddressesInput.value.trim()) {
      const addresses = trustedAddressesInput.value
        .split('\n')
        .map(s => s.trim())
        .filter(s => s)
      if (addresses.length > 0) {
        currentConfig.plugins['real-ip'].trusted_addresses = addresses
      } else {
        // 如果清空了所有地址，删除该字段
        delete currentConfig.plugins['real-ip'].trusted_addresses
      }
    } else {
      // 如果输入为空，删除该字段
      delete currentConfig.plugins['real-ip'].trusted_addresses
    }
    
    // 确保 recursive 字段存在
    if (recursive.value !== undefined) {
      currentConfig.plugins['real-ip'].recursive = recursive.value
    }
    
    setPluginEnabled(currentConfig.plugins['real-ip'], true)
  } else {
    currentConfig.plugins['real-ip'] = currentConfig.plugins['real-ip'] || {}
    setPluginEnabled(currentConfig.plugins['real-ip'], false)
  }
  
  emit('update:modelValue', currentConfig)
}

const handleRecursiveChange = (value) => {
  updatePlugin({ recursive: value })
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