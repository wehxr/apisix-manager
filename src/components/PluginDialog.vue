<template>
  <el-dialog
    v-model="dialogVisible"
    :title="dialogTitle"
    :width="dialogWidth"
    @close="handleClose"
  >
    <component
      v-if="currentPluginComponent"
      :is="currentPluginComponent"
      :model-value="currentPluginConfig"
      @update:model-value="handlePluginConfigUpdate"
    />
    <template #footer>
      <el-button @click="handleCancel">取消</el-button>
      <el-button type="primary" @click="handleSave" :loading="saving">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { getDialogWidth } from '@/utils/format'
import { getPluginName, PLUGIN_NAMES, isPluginAvailableForResource, RESOURCE_TYPES } from '@/utils/plugin'
import { generateId } from '@/utils/id'
import { routeApi, pluginConfigApi, globalRuleApi } from '@/utils/api'

// 插件组件映射（统一使用 PluginForm 组件，支持所有资源类型）
import PluginFormRequestId from '@/components/PluginForm/PluginFormRequestId.vue'
import PluginFormBasicAuth from '@/components/PluginForm/PluginFormBasicAuth.vue'
import PluginFormIpRestriction from '@/components/PluginForm/PluginFormIpRestriction.vue'
import PluginFormCors from '@/components/PluginForm/PluginFormCors.vue'
import PluginFormRealIp from '@/components/PluginForm/PluginFormRealIp.vue'
import PluginFormRedirect from '@/components/PluginForm/PluginFormRedirect.vue'
import PluginFormLimitReq from '@/components/PluginForm/PluginFormLimitReq.vue'
import PluginFormLimitCount from '@/components/PluginForm/PluginFormLimitCount.vue'
import PluginFormLimitConn from '@/components/PluginForm/PluginFormLimitConn.vue'
import PluginFormProxyCache from '@/components/PluginForm/PluginFormProxyCache.vue'
import PluginFormClientControl from '@/components/PluginForm/PluginFormClientControl.vue'
import PluginFormUriBlocker from '@/components/PluginForm/PluginFormUriBlocker.vue'
import PluginFormApiBreaker from '@/components/PluginForm/PluginFormApiBreaker.vue'
import PluginFormGzip from '@/components/PluginForm/PluginFormGzip.vue'
import PluginFormProxyRewrite from '@/components/PluginForm/PluginFormProxyRewrite.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  // 资源类型：route, global_rule, consumer, upstream 等
  resourceType: {
    type: String,
    required: true,
    validator: (value) => Object.values(RESOURCE_TYPES).includes(value)
  },
  // 资源 ID（如 route id, global_rule id 等）
  resourceId: {
    type: String,
    default: ''
  },
  // 插件类型
  pluginType: {
    type: String,
    default: ''
  },
  // 初始配置（对于 route，包含 plugin_config_id；对于 global_rule，包含 plugins）
  initialConfig: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:modelValue', 'saved'])

// 插件组件映射（统一使用 PluginForm 组件，支持所有资源类型）
const pluginComponents = {
  'request-id': {
    [RESOURCE_TYPES.ROUTE]: PluginFormRequestId,
    [RESOURCE_TYPES.GLOBAL_RULE]: PluginFormRequestId
  },
  'basic-auth': {
    [RESOURCE_TYPES.ROUTE]: PluginFormBasicAuth
  },
  'ip-restriction': {
    [RESOURCE_TYPES.ROUTE]: PluginFormIpRestriction
  },
  'cors': {
    [RESOURCE_TYPES.ROUTE]: PluginFormCors,
    [RESOURCE_TYPES.GLOBAL_RULE]: PluginFormCors
  },
  'real-ip': {
    [RESOURCE_TYPES.ROUTE]: PluginFormRealIp,
    [RESOURCE_TYPES.GLOBAL_RULE]: PluginFormRealIp
  },
  'redirect': {
    [RESOURCE_TYPES.ROUTE]: PluginFormRedirect
  },
  'limit-req': {
    [RESOURCE_TYPES.ROUTE]: PluginFormLimitReq
  },
  'limit-count': {
    [RESOURCE_TYPES.ROUTE]: PluginFormLimitCount
  },
  'limit-conn': {
    [RESOURCE_TYPES.ROUTE]: PluginFormLimitConn
  },
  'proxy-cache': {
    [RESOURCE_TYPES.ROUTE]: PluginFormProxyCache
  },
  'client-control': {
    [RESOURCE_TYPES.ROUTE]: PluginFormClientControl
  },
  'uri-blocker': {
    [RESOURCE_TYPES.ROUTE]: PluginFormUriBlocker
  },
  'api-breaker': {
    [RESOURCE_TYPES.ROUTE]: PluginFormApiBreaker
  },
  'gzip': {
    [RESOURCE_TYPES.ROUTE]: PluginFormGzip
  },
  'proxy-rewrite': {
    [RESOURCE_TYPES.ROUTE]: PluginFormProxyRewrite
  }
}

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const dialogWidth = computed(() => getDialogWidth())
const saving = ref(false)

const currentPluginComponent = ref(null)
const currentPluginConfig = ref({})
const currentPluginType = ref('')

// 对话框标题
const dialogTitle = computed(() => {
  if (currentPluginType.value) {
    return getPluginName(currentPluginType.value) || '配置插件'
  }
  return '配置插件'
})

// 监听对话框显示状态和插件类型变化
watch(() => props.modelValue, async (visible) => {
  if (visible && props.pluginType && props.resourceType) {
    await openDialog(props.pluginType, props.resourceType)
  } else if (!visible) {
    resetDialog()
  }
})

// 单独监听 pluginType 变化，确保切换插件时能正确更新
watch(() => props.pluginType, async (newPluginType, oldPluginType) => {
  if (props.modelValue && newPluginType && newPluginType !== oldPluginType && props.resourceType) {
    resetDialog()
    await openDialog(newPluginType, props.resourceType)
  }
})

// 打开对话框
const openDialog = async (pluginType, resourceType) => {
  // 验证插件是否可用于该资源类型
  if (!isPluginAvailableForResource(pluginType, resourceType)) {
    ElMessage.warning(`插件 ${getPluginName(pluginType)} 不适用于资源类型 ${resourceType}`)
    dialogVisible.value = false
    return
  }

  // 获取对应的组件
  const componentMap = pluginComponents[pluginType]
  if (!componentMap) {
    ElMessage.warning(`未知的插件类型: ${pluginType}`)
    dialogVisible.value = false
    return
  }

  const component = componentMap[resourceType]
  if (!component) {
    ElMessage.warning(`插件 ${getPluginName(pluginType)} 没有对应的 ${resourceType} 组件`)
    dialogVisible.value = false
    return
  }

  currentPluginType.value = pluginType
  currentPluginComponent.value = component

  // 根据资源类型初始化配置
  if (resourceType === RESOURCE_TYPES.ROUTE) {
    await initRouteConfig()
  } else if (resourceType === RESOURCE_TYPES.GLOBAL_RULE) {
    initGlobalRuleConfig()
  } else {
    // 其他资源类型的初始化逻辑
    currentPluginConfig.value = { ...props.initialConfig }
  }
}

// 初始化路由配置（使用 plugin_config_id）
const initRouteConfig = async () => {
  let pluginConfigId = props.initialConfig.plugin_config_id || null

  // 如果没有 plugin_config_id，创建一个空的 Plugin Config
  if (!pluginConfigId && props.resourceId) {
    try {
      // 先获取路由信息，看是否已有 plugin_config_id
      const routeRes = await routeApi.get(props.resourceId)
      const routeData = routeRes.data?.value || routeRes.data || {}
      pluginConfigId = routeData.plugin_config_id || null

      // 如果还是没有，创建一个新的
      if (!pluginConfigId) {
        pluginConfigId = generateId('plugin_config')
        await pluginConfigApi.create(pluginConfigId, {
          plugins: {}
        })

        // 更新路由，关联 plugin_config_id
        await routeApi.update(props.resourceId, {
          plugin_config_id: pluginConfigId
        })
      }
    } catch (error) {
      console.warn('初始化 Plugin Config 失败:', error)
      // 即使失败，也继续打开对话框
    }
  }

  currentPluginConfig.value = {
    plugin_config_id: pluginConfigId
  }
}

// 初始化全局规则配置（直接使用 plugins）
const initGlobalRuleConfig = () => {
  const plugins = props.initialConfig.plugins || {}
  // 传递所有 plugins，让组件自己处理（因为 usePluginConfig 会正确处理）
  currentPluginConfig.value = {
    plugins: plugins
  }
}

// 处理插件配置更新
const handlePluginConfigUpdate = (value) => {
  if (props.resourceType === RESOURCE_TYPES.ROUTE) {
    // 对于 route，子组件会返回包含 plugins 的对象
    currentPluginConfig.value = {
      plugin_config_id: currentPluginConfig.value.plugin_config_id,
      plugins: value.plugins || {}
    }
  } else if (props.resourceType === RESOURCE_TYPES.GLOBAL_RULE) {
    // 对于 global_rule，合并 plugins
    currentPluginConfig.value = {
      plugins: {
        ...(currentPluginConfig.value.plugins || {}),
        ...(value.plugins || {})
      }
    }
  } else {
    currentPluginConfig.value = { ...value }
  }
}

// 保存配置
const handleSave = async () => {
  saving.value = true
  try {
    if (props.resourceType === RESOURCE_TYPES.ROUTE) {
      await saveRoutePlugin()
    } else if (props.resourceType === RESOURCE_TYPES.GLOBAL_RULE) {
      await saveGlobalRulePlugin()
    } else {
      ElMessage.warning(`暂不支持保存 ${props.resourceType} 类型的插件配置`)
    }
  } catch (error) {
    console.error('保存插件配置失败:', error)
    // 错误消息已由拦截器自动显示
  } finally {
    saving.value = false
  }
}

// 保存路由插件配置
const saveRoutePlugin = async () => {
  // 获取当前路由信息
  const routeRes = await routeApi.get(props.resourceId)
  const routeData = routeRes.data?.value || routeRes.data || {}

  // 获取更新后的插件配置
  const updatedPlugins = currentPluginConfig.value.plugins || {}

  // 特殊处理：proxy-cache 插件，清理空数组字段
  if (updatedPlugins['proxy-cache']) {
    const proxyCache = updatedPlugins['proxy-cache']
    if (Array.isArray(proxyCache.cache_bypass) && proxyCache.cache_bypass.length === 0) {
      delete proxyCache.cache_bypass
    }
    if (Array.isArray(proxyCache.no_cache) && proxyCache.no_cache.length === 0) {
      delete proxyCache.no_cache
    }
  }

  // 特殊处理：basic-auth 可能关联 consumer-restriction
  if (currentPluginType.value === 'basic-auth' && !updatedPlugins['consumer-restriction']) {
    delete updatedPlugins['consumer-restriction']
  }

  // 清理空插件配置
  const cleanedPlugins = {}
  Object.keys(updatedPlugins).forEach(pluginName => {
    const pluginConfig = updatedPlugins[pluginName]
    if (pluginConfig) {
      const keys = Object.keys(pluginConfig)
      // 特殊处理：basic-auth 即使为空对象也要保留
      if (pluginName === 'basic-auth') {
        cleanedPlugins[pluginName] = {}
        return
      }
      // 过滤掉只有 _meta.disable 的配置
      if (keys.length === 1 && keys[0] === '_meta' && pluginConfig._meta?.disable === true) {
        return
      }
      // 过滤掉空对象（除了 basic-auth）
      if (keys.length === 0) {
        return
      }
      cleanedPlugins[pluginName] = { ...pluginConfig }
    }
  })

  // 获取或创建 Plugin Config ID
  let pluginConfigId = currentPluginConfig.value.plugin_config_id || routeData.plugin_config_id

  if (!pluginConfigId) {
    pluginConfigId = generateId('plugin_config')
  }

  // 更新或创建 Plugin Config
  const pluginConfigData = { plugins: cleanedPlugins }

  try {
    await pluginConfigApi.get(pluginConfigId)
    await pluginConfigApi.update(pluginConfigId, pluginConfigData)
  } catch (error) {
    await pluginConfigApi.create(pluginConfigId, pluginConfigData)
  }

  // 如果路由没有关联 plugin_config_id，则更新路由
  if (!routeData.plugin_config_id || routeData.plugin_config_id !== pluginConfigId) {
    await routeApi.update(props.resourceId, {
      plugin_config_id: pluginConfigId
    })
  }

  ElMessage.success('保存成功')
  emit('saved', { plugin_config_id: pluginConfigId, plugins: cleanedPlugins })
  dialogVisible.value = false
}

// 保存全局规则插件配置
const saveGlobalRulePlugin = async () => {
  const plugins = currentPluginConfig.value.plugins || {}

  // 清理空插件配置
  const cleanedPlugins = {}
  Object.keys(plugins).forEach(pluginName => {
    const pluginConfig = plugins[pluginName]
    if (pluginConfig) {
      const keys = Object.keys(pluginConfig)
      // 过滤掉只有 _meta.disable 的配置
      if (keys.length === 1 && keys[0] === '_meta' && pluginConfig._meta?.disable === true) {
        return
      }
      // 过滤掉空对象
      if (keys.length === 0) {
        return
      }
      cleanedPlugins[pluginName] = { ...pluginConfig }
    }
  })

  // 合并到现有的全局规则配置中
  const existingPlugins = props.initialConfig.plugins || {}
  const mergedPlugins = {
    ...existingPlugins,
    ...cleanedPlugins
  }

  // 更新全局规则
  const ruleData = {
    plugins: mergedPlugins
  }

  if (props.resourceId) {
    await globalRuleApi.update(props.resourceId, ruleData)
  } else {
    const newId = generateId('global_rule')
    await globalRuleApi.create(newId, ruleData)
    emit('saved', { id: newId, plugins: mergedPlugins })
  }

  ElMessage.success('保存成功')
  emit('saved', { plugins: mergedPlugins })
  dialogVisible.value = false
}

// 取消
const handleCancel = () => {
  dialogVisible.value = false
}

// 关闭对话框
const handleClose = () => {
  resetDialog()
}

// 重置对话框状态
const resetDialog = () => {
  currentPluginComponent.value = null
  currentPluginConfig.value = {}
  currentPluginType.value = ''
}
</script>
