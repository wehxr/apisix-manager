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
          此插件用于缓存 HTTP 响应。支持基于磁盘或内存的缓存策略，可以缓存 GET、POST 和 HEAD 请求的响应。
          通过配置缓存键、缓存区域和缓存策略，可以有效减少对上游服务的请求，提高响应速度。
        </div>
      </template>
    </el-alert>
    <el-form-item label="开启插件">
      <el-switch :model-value="localEnabled" @update:model-value="handleEnableChange" />
    </el-form-item>
    <template v-if="localEnabled">
      <el-form-item label="缓存策略">
        <el-radio-group :model-value="cacheStrategy" @update:model-value="handleStrategyChange">
          <el-radio label="disk">磁盘缓存 (disk)</el-radio>
          <el-radio label="memory">内存缓存 (memory)</el-radio>
        </el-radio-group>
        <div class="form-tip">缓存策略，缓存在磁盘还是内存中，默认 disk</div>
      </el-form-item>
      <el-form-item label="缓存区域">
        <el-input
          :model-value="cacheZone"
          @update:model-value="handleZoneChange"
          placeholder="如: disk_cache_one 或 memory_cache"
        />
        <div class="form-tip">与缓存策略一起使用的缓存区域，该值应与配置文件中定义的缓存区域之一匹配，默认 disk_cache_one</div>
      </el-form-item>
      <el-form-item label="缓存键">
        <el-select
          :model-value="cacheKey"
          @update:model-value="handleCacheKeyChange"
          multiple
          filterable
          allow-create
          default-first-option
          placeholder="输入键后按回车添加，支持 NGINX 变量，如: $host, $request_uri"
          style="width: 100%"
        >
          <el-option
            v-for="key in cacheKey"
            :key="key"
            :label="key"
            :value="key"
          />
        </el-select>
        <div class="form-tip">用于缓存的键，支持 NGINX 变量和常量字符串，变量应该以 $ 符号为前缀，默认 ["$host", "$request_uri"]</div>
      </el-form-item>
      <el-form-item label="缓存方法">
        <el-select
          :model-value="cacheMethod"
          @update:model-value="handleCacheMethodChange"
          multiple
          placeholder="选择要缓存的 HTTP 方法"
          style="width: 100%"
        >
          <el-option label="GET" value="GET" />
          <el-option label="POST" value="POST" />
          <el-option label="HEAD" value="HEAD" />
        </el-select>
        <div class="form-tip">应缓存响应的请求方法，默认 ["GET", "HEAD"]</div>
      </el-form-item>
      <el-form-item label="缓存 HTTP 状态码">
        <el-select
          :model-value="cacheHttpStatus"
          @update:model-value="handleCacheHttpStatusChange"
          multiple
          filterable
          allow-create
          default-first-option
          placeholder="输入状态码后按回车添加，如: 200, 301, 404"
          style="width: 100%"
        >
          <el-option
            v-for="status in cacheHttpStatus"
            :key="status"
            :label="String(status)"
            :value="status"
          />
        </el-select>
        <div class="form-tip">应缓存响应的响应 HTTP 状态代码，默认 [200, 301, 404]</div>
      </el-form-item>
      <el-form-item label="缓存时间（秒）">
        <el-input-number
          :model-value="cacheTtl"
          @update:model-value="handleTtlChange"
          :min="1"
          style="width: 100%"
        />
        <div class="form-tip">在内存中缓存时的缓存生存时间 (TTL)，以秒为单位，默认 300。磁盘缓存的 TTL 由响应标头或配置文件决定</div>
      </el-form-item>

      <el-divider>高级配置</el-divider>
      <el-form-item label="隐藏缓存头">
        <el-switch
          :model-value="hideCacheHeaders"
          @update:model-value="handleHideCacheHeadersChange"
        />
        <div class="form-tip">如果为 true，则隐藏 Expires 和 Cache-Control 响应标头</div>
      </el-form-item>
      <el-form-item label="遵守 Cache-Control">
        <el-switch
          :model-value="cacheControl"
          @update:model-value="handleCacheControlChange"
        />
        <div class="form-tip">如果为 true，则遵守 HTTP 规范中的 Cache-Control 行为，仅对内存中策略有效</div>
      </el-form-item>
      <el-form-item label="缓存绕过条件">
        <el-select
          :model-value="cacheBypass"
          @update:model-value="handleCacheBypassChange"
          multiple
          filterable
          allow-create
          default-first-option
          placeholder="输入条件后按回车添加，支持 NGINX 变量，如: $arg_bypass, $http_bypass"
          style="width: 100%"
        >
          <el-option
            v-for="bypass in cacheBypass"
            :key="bypass"
            :label="bypass"
            :value="bypass"
          />
        </el-select>
        <div class="form-tip">如果任何值不为空且不等于 0，则不会从缓存中检索响应。支持 NGINX 变量和常量字符串，变量应该以 $ 符号为前缀</div>
      </el-form-item>
      <el-form-item label="不缓存条件">
        <el-select
          :model-value="noCache"
          @update:model-value="handleNoCacheChange"
          multiple
          filterable
          allow-create
          default-first-option
          placeholder="输入条件后按回车添加，支持 NGINX 变量，如: $arg_no_cache, $http_no_cache"
          style="width: 100%"
        >
          <el-option
            v-for="item in noCache"
            :key="item"
            :label="item"
            :value="item"
          />
        </el-select>
        <div class="form-tip">如果任何值不为空且不等于 0，则不会缓存响应。支持 NGINX 变量和常量字符串，变量应以 $ 符号为前缀</div>
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

// 从 plugins 中提取 proxy-cache 配置
const proxyCachePlugin = computed(() => props.modelValue.plugins?.['proxy-cache'] || {})

// 计算 enabled 状态
const enabled = computed(() => isPluginEnabled(proxyCachePlugin.value))

// 计算各个字段
const cacheStrategy = computed(() => {
  return proxyCachePlugin.value.cache_strategy || 'disk'
})

const cacheZone = computed(() => {
  return proxyCachePlugin.value.cache_zone || 'disk_cache_one'
})

const cacheKey = computed(() => {
  if (Array.isArray(proxyCachePlugin.value.cache_key) && proxyCachePlugin.value.cache_key.length > 0) {
    return proxyCachePlugin.value.cache_key
  }
  return ['$host', '$request_uri']
})

const cacheMethod = computed(() => {
  if (Array.isArray(proxyCachePlugin.value.cache_method) && proxyCachePlugin.value.cache_method.length > 0) {
    return proxyCachePlugin.value.cache_method
  }
  return ['GET', 'HEAD']
})

const cacheHttpStatus = computed(() => {
  if (Array.isArray(proxyCachePlugin.value.cache_http_status) && proxyCachePlugin.value.cache_http_status.length > 0) {
    return proxyCachePlugin.value.cache_http_status.map(s => {
      const num = typeof s === 'number' ? s : parseInt(s, 10)
      return isNaN(num) ? 200 : num
    }).filter(s => typeof s === 'number')
  }
  return [200, 301, 404]
})

const cacheTtl = computed(() => {
  return proxyCachePlugin.value.cache_ttl !== undefined ? proxyCachePlugin.value.cache_ttl : 300
})

const hideCacheHeaders = computed(() => {
  return proxyCachePlugin.value.hide_cache_headers !== undefined ? proxyCachePlugin.value.hide_cache_headers : false
})

const cacheControl = computed(() => {
  return proxyCachePlugin.value.cache_control !== undefined ? proxyCachePlugin.value.cache_control : false
})

const cacheBypass = computed(() => {
  return Array.isArray(proxyCachePlugin.value.cache_bypass) ? proxyCachePlugin.value.cache_bypass : []
})

const noCache = computed(() => {
  return Array.isArray(proxyCachePlugin.value.no_cache) ? proxyCachePlugin.value.no_cache : []
})

// 内部状态
const localEnabled = ref(enabled.value)

// 监听 props 变化，更新内部状态
watch(enabled, (newEnabled) => {
  localEnabled.value = newEnabled
}, { immediate: true })

// 监听内部状态变化，更新到父组件
watch(localEnabled, (newEnabled) => {
  const currentConfig = {
    plugins: { ...props.modelValue.plugins }
  }
  
  if (newEnabled) {
    currentConfig.plugins['proxy-cache'] = {
      cache_strategy: cacheStrategy.value,
      cache_zone: cacheZone.value,
      cache_key: cacheKey.value,
      cache_method: cacheMethod.value,
      cache_http_status: cacheHttpStatus.value,
      cache_ttl: cacheTtl.value,
      hide_cache_headers: hideCacheHeaders.value,
      cache_control: cacheControl.value
    }
    // 只有当数组不为空时才添加这些字段
    if (cacheBypass.value && Array.isArray(cacheBypass.value) && cacheBypass.value.length > 0) {
      currentConfig.plugins['proxy-cache'].cache_bypass = cacheBypass.value
    }
    if (noCache.value && Array.isArray(noCache.value) && noCache.value.length > 0) {
      currentConfig.plugins['proxy-cache'].no_cache = noCache.value
    }
    setPluginEnabled(currentConfig.plugins['proxy-cache'], true)
  } else {
    currentConfig.plugins['proxy-cache'] = currentConfig.plugins['proxy-cache'] || {}
    setPluginEnabled(currentConfig.plugins['proxy-cache'], false)
  }
  
  emit('update:modelValue', currentConfig)
})

const handleEnableChange = (value) => {
  localEnabled.value = value
}

const handleStrategyChange = (value) => {
  const currentConfig = {
    plugins: { ...props.modelValue.plugins }
  }
  
  currentConfig.plugins['proxy-cache'] = {
    ...proxyCachePlugin.value,
    cache_strategy: value
  }
  setPluginEnabled(currentConfig.plugins['proxy-cache'], enabled.value)
  
  emit('update:modelValue', currentConfig)
}

const handleZoneChange = (value) => {
  const currentConfig = {
    plugins: { ...props.modelValue.plugins }
  }
  
  currentConfig.plugins['proxy-cache'] = {
    ...proxyCachePlugin.value,
    cache_zone: value
  }
  setPluginEnabled(currentConfig.plugins['proxy-cache'], enabled.value)
  
  emit('update:modelValue', currentConfig)
}

const handleCacheKeyChange = (value) => {
  const currentConfig = {
    plugins: { ...props.modelValue.plugins }
  }
  
  // 确保至少有一个默认值，不能为空数组
  const keyArray = Array.isArray(value) && value.length > 0 ? value : ['$host', '$request_uri']
  
  currentConfig.plugins['proxy-cache'] = {
    ...proxyCachePlugin.value,
    cache_key: keyArray
  }
  setPluginEnabled(currentConfig.plugins['proxy-cache'], enabled.value)
  
  emit('update:modelValue', currentConfig)
}

const handleCacheMethodChange = (value) => {
  const currentConfig = {
    plugins: { ...props.modelValue.plugins }
  }
  
  // 确保至少有一个默认值，不能为空数组
  const methodArray = Array.isArray(value) && value.length > 0 ? value : ['GET', 'HEAD']
  
  currentConfig.plugins['proxy-cache'] = {
    ...proxyCachePlugin.value,
    cache_method: methodArray
  }
  setPluginEnabled(currentConfig.plugins['proxy-cache'], enabled.value)
  
  emit('update:modelValue', currentConfig)
}

const handleCacheHttpStatusChange = (value) => {
  const currentConfig = {
    plugins: { ...props.modelValue.plugins }
  }
  
  // 将字符串数组转换为数字数组，过滤掉无效值
  const statusArray = Array.isArray(value)
    ? value.map(s => {
        const num = typeof s === 'number' ? s : parseInt(s, 10)
        return isNaN(num) ? null : num
      }).filter(s => s !== null && s !== undefined && typeof s === 'number')
    : []
  
  currentConfig.plugins['proxy-cache'] = {
    ...proxyCachePlugin.value,
    cache_http_status: statusArray.length > 0 ? statusArray : [200, 301, 404]
  }
  setPluginEnabled(currentConfig.plugins['proxy-cache'], enabled.value)
  
  emit('update:modelValue', currentConfig)
}

const handleTtlChange = (value) => {
  const currentConfig = {
    plugins: { ...props.modelValue.plugins }
  }
  
  currentConfig.plugins['proxy-cache'] = {
    ...proxyCachePlugin.value,
    cache_ttl: value
  }
  setPluginEnabled(currentConfig.plugins['proxy-cache'], enabled.value)
  
  emit('update:modelValue', currentConfig)
}

const handleHideCacheHeadersChange = (value) => {
  const currentConfig = {
    plugins: { ...props.modelValue.plugins }
  }
  
  currentConfig.plugins['proxy-cache'] = {
    ...proxyCachePlugin.value,
    hide_cache_headers: value
  }
  setPluginEnabled(currentConfig.plugins['proxy-cache'], enabled.value)
  
  emit('update:modelValue', currentConfig)
}

const handleCacheControlChange = (value) => {
  const currentConfig = {
    plugins: { ...props.modelValue.plugins }
  }
  
  currentConfig.plugins['proxy-cache'] = {
    ...proxyCachePlugin.value,
    cache_control: value
  }
  setPluginEnabled(currentConfig.plugins['proxy-cache'], enabled.value)
  
  emit('update:modelValue', currentConfig)
}

const handleCacheBypassChange = (value) => {
  const currentConfig = {
    plugins: { ...props.modelValue.plugins }
  }
  
  currentConfig.plugins['proxy-cache'] = {
    ...proxyCachePlugin.value
  }
  
  // 只有当数组不为空时才添加该字段，否则删除该字段
  const bypassArray = Array.isArray(value) ? value : []
  if (bypassArray.length > 0) {
    currentConfig.plugins['proxy-cache'].cache_bypass = bypassArray
  } else {
    delete currentConfig.plugins['proxy-cache'].cache_bypass
  }
  
  setPluginEnabled(currentConfig.plugins['proxy-cache'], enabled.value)
  
  emit('update:modelValue', currentConfig)
}

const handleNoCacheChange = (value) => {
  const currentConfig = {
    plugins: { ...props.modelValue.plugins }
  }
  
  currentConfig.plugins['proxy-cache'] = {
    ...proxyCachePlugin.value
  }
  
  // 只有当数组不为空时才添加该字段，否则删除该字段
  const noCacheArray = Array.isArray(value) ? value : []
  if (noCacheArray.length > 0) {
    currentConfig.plugins['proxy-cache'].no_cache = noCacheArray
  } else {
    delete currentConfig.plugins['proxy-cache'].no_cache
  }
  
  setPluginEnabled(currentConfig.plugins['proxy-cache'], enabled.value)
  
  emit('update:modelValue', currentConfig)
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
