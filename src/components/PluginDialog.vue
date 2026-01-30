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
      :model-value="(currentPluginConfig.plugins || {})[currentPluginType] ?? {}"
      :resource-type="resourceType"
      @update:model-value="handlePluginConfigUpdate"
    />
    <template #footer>
      <el-button @click="handleCancel">取消</el-button>
      <el-button type="primary" @click="handleSave" :loading="saving">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
// 父组件只传 resourceId，本组件打开时按 resourceType 请求获取资源配置，保存时只改 plugins
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getDialogWidth } from '@/utils/format'
import { getPluginName, isPluginAvailableForResource, isPluginEnabled } from '@/utils/plugin'
import { pluginConfigApi, globalRuleApi, consumerApi, consumerGroupApi } from '@/utils/api'
import pluginResourcesConfig from '@/config/plugin.json'
import PluginFormRequestId from '@/components/PluginForm/PluginFormRequestId.vue'
import PluginFormConsumerRestriction from '@/components/PluginForm/PluginFormConsumerRestriction.vue'
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
import PluginFormFileLogger from '@/components/PluginForm/PluginFormFileLogger.vue'
import PluginFormLdapAuth from '@/components/PluginForm/PluginFormLdapAuth.vue'

const componentMap = {
  'PluginFormRequestId': PluginFormRequestId,
  'PluginFormConsumerRestriction': PluginFormConsumerRestriction,
  'PluginFormBasicAuth': PluginFormBasicAuth,
  'PluginFormIpRestriction': PluginFormIpRestriction,
  'PluginFormCors': PluginFormCors,
  'PluginFormRealIp': PluginFormRealIp,
  'PluginFormRedirect': PluginFormRedirect,
  'PluginFormLimitReq': PluginFormLimitReq,
  'PluginFormLimitCount': PluginFormLimitCount,
  'PluginFormLimitConn': PluginFormLimitConn,
  'PluginFormProxyCache': PluginFormProxyCache,
  'PluginFormClientControl': PluginFormClientControl,
  'PluginFormUriBlocker': PluginFormUriBlocker,
  'PluginFormApiBreaker': PluginFormApiBreaker,
  'PluginFormGzip': PluginFormGzip,
  'PluginFormProxyRewrite': PluginFormProxyRewrite,
  'PluginFormFileLogger': PluginFormFileLogger,
  'PluginFormLdapAuth': PluginFormLdapAuth
}

const kebabToPascal = (str) =>
  str.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  resourceType: {
    type: String,
    required: true,
    validator: (v) => ['route', 'global_rule', 'consumer', 'consumer_group'].includes(v)
  },
  /** route=plugin_config_id, consumer=username, consumer_group=consumer_group_id, global_rule=global_rule_id */
  resourceId: { type: String, default: '' },
  pluginType: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue', 'saved'])

const getPluginComponent = (pluginType, resourceType) => {
  const config = pluginResourcesConfig[pluginType]
  if (!config) return null
  if (config.components?.[resourceType]) {
    return componentMap[config.components[resourceType]] || null
  }
  return componentMap[`PluginForm${kebabToPascal(pluginType)}`] || null
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
const fetchedResource = ref(null)

const dialogTitle = computed(() =>
  getPluginName(currentPluginType.value) || '配置插件'
)

watch(() => props.modelValue, async (visible) => {
  if (visible && props.pluginType && props.resourceType) await openDialog(props.pluginType, props.resourceType)
  else if (!visible) resetDialog()
})

watch(() => props.pluginType, async (newType, oldType) => {
  if (props.modelValue && newType && newType !== oldType && props.resourceType) {
    resetDialog()
    await openDialog(newType, props.resourceType)
  }
})

// --- 打开对话框：校验 → 取组件 → 按资源类型初始化 plugins ---
const openDialog = async (pluginType, resourceType) => {
  if (!isPluginAvailableForResource(pluginType, resourceType)) {
    ElMessage.warning(`插件 ${getPluginName(pluginType)} 不适用于 ${resourceType}`)
    dialogVisible.value = false
    return
  }
  const component = getPluginComponent(pluginType, resourceType)
  if (!component) {
    ElMessage.warning(`插件 ${getPluginName(pluginType)} 没有对应组件`)
    dialogVisible.value = false
    return
  }
  currentPluginType.value = pluginType
  currentPluginComponent.value = component
  if (resourceType === 'route') await initRouteConfig()
  else if (resourceType === 'global_rule') await initGlobalRuleConfig()
  else if (resourceType === 'consumer_group') await initConsumerGroupConfig()
  else await initConsumerConfig()
}

// route 场景：resourceId = plugin_config_id，由 Route 在创建路由时已生成，此处只拉取
const initRouteConfig = async () => {
  const rid = (props.resourceId || '').trim()
  let plugins = {}
  if (rid) {
    try {
      const res = await pluginConfigApi.get(rid)
      const data = res.data?.value || res.data || {}
      plugins = data.plugins || {}
    } catch {}
  }
  currentPluginConfig.value = { plugin_config_id: rid || null, plugins }
}

const initGlobalRuleConfig = async () => {
  try {
    const res = await globalRuleApi.get(props.resourceId)
    const data = res.data?.value || res.data || {}
    fetchedResource.value = data
    currentPluginConfig.value = { plugins: data.plugins || {} }
  } catch {
    fetchedResource.value = { id: props.resourceId, plugins: {} }
    currentPluginConfig.value = { plugins: {} }
  }
}

const initConsumerConfig = async () => {
  const res = await consumerApi.get(props.resourceId)
  const data = res.data?.value || res.data || {}
  fetchedResource.value = data
  currentPluginConfig.value = { plugins: data.plugins || {} }
}

const initConsumerGroupConfig = async () => {
  const res = await consumerGroupApi.get(props.resourceId)
  const data = res.data?.value || res.data || {}
  fetchedResource.value = data
  currentPluginConfig.value = { plugins: data.plugins || {} }
}

const handlePluginConfigUpdate = (value) => {
  const plugins = { ...(currentPluginConfig.value.plugins || {}), [currentPluginType.value]: value ?? {} }
  currentPluginConfig.value = { ...currentPluginConfig.value, plugins }
}

const handleSave = async () => {
  saving.value = true
  try {
    if (props.resourceType === 'route') await saveRoutePlugin()
    else if (props.resourceType === 'global_rule') await saveGlobalRulePlugin()
    else if (props.resourceType === 'consumer_group') await saveConsumerGroupPlugin()
    else await saveConsumerPlugin()
  } catch (error) {
    console.error('保存插件配置失败:', error)
  } finally {
    saving.value = false
  }
}

const saveRoutePlugin = async () => {
  const pluginConfigId = currentPluginConfig.value.plugin_config_id
  let plugins = { ...(currentPluginConfig.value.plugins || {}) }

  // 特殊处理 consumer-restriction 开启时需附带 basic-auth: {}，关闭时移除 basic-auth
  if (currentPluginType.value === 'consumer-restriction') {
    const consumerRestrictionConfig = plugins['consumer-restriction'] ?? {}
    if (isPluginEnabled(consumerRestrictionConfig)) {
      plugins = { ...plugins, 'basic-auth': plugins['basic-auth'] ?? {} }
    } else {
      const { 'basic-auth': _, ...rest } = plugins
      plugins = rest
    }
  }

  await pluginConfigApi.update(pluginConfigId, { plugins })
  ElMessage.success('保存成功')
  emit('saved', { plugin_config_id: pluginConfigId, plugins })
  dialogVisible.value = false
}

// global_rule：由 GlobalRule 页 getOrCreateGlobalRuleId 保证已有规则，此处只更新
const saveGlobalRulePlugin = async () => {
  const plugins = currentPluginConfig.value.plugins || {}
  const { update_time, create_time, ...rest } = fetchedResource.value || {}
  const payload = { ...rest, plugins }
  await globalRuleApi.update(props.resourceId, payload)
  ElMessage.success('保存成功')
  emit('saved', { id: props.resourceId, plugins })
  dialogVisible.value = false
}

const saveConsumerPlugin = async () => {
  const plugins = currentPluginConfig.value.plugins || {}
  const { update_time, create_time, ...rest } = fetchedResource.value || {}
  const payload = { ...rest, plugins }
  await consumerApi.update(props.resourceId, payload)
  ElMessage.success('保存成功')
  emit('saved', {})
  dialogVisible.value = false
}

const saveConsumerGroupPlugin = async () => {
  const plugins = currentPluginConfig.value.plugins || {}
  const { update_time, create_time, ...rest } = fetchedResource.value || {}
  const payload = { ...rest, plugins }
  await consumerGroupApi.update(props.resourceId, payload)
  ElMessage.success('保存成功')
  emit('saved', {})
  dialogVisible.value = false
}

const handleCancel = () => { dialogVisible.value = false }
const handleClose = () => resetDialog()
const resetDialog = () => {
  currentPluginComponent.value = null
  currentPluginConfig.value = {}
  currentPluginType.value = ''
  fetchedResource.value = null
}
</script>
