import { ref, watch, onMounted, computed } from 'vue'
import { pluginConfigApi } from '../utils/api'

/**
 * 插件配置 composable
 * 用于在插件子组件中加载和管理 Plugin Config
 * 支持两种模式：
 * 1. route 模式：使用 plugin_config_id 加载配置
 * 2. global_rule 模式：直接使用 plugins 对象
 */
export function usePluginConfig(props, emit) {
  // 内部状态：plugins
  const plugins = ref({})
  // 标志：是否正在内部更新，避免触发 watch 重新加载
  const isInternalUpdate = ref(false)

  // 判断是 route 模式还是 global_rule 模式
  const isRouteMode = computed(() => {
    return !!props.modelValue.plugin_config_id
  })

  const isGlobalRuleMode = computed(() => {
    return !isRouteMode.value && !!props.modelValue.plugins
  })

  // 从 Plugin Config 加载插件配置（route 模式）
  const loadPluginConfig = async () => {
    // 如果正在内部更新，不重新加载
    if (isInternalUpdate.value) {
      return
    }
    
    if (props.modelValue.plugin_config_id) {
      try {
        const pluginConfigRes = await pluginConfigApi.get(props.modelValue.plugin_config_id)
        const pluginConfigData = pluginConfigRes.data?.value || pluginConfigRes.data || {}
        plugins.value = pluginConfigData.plugins || {}
      } catch (error) {
        plugins.value = {}
      }
    } else if (props.modelValue.plugins) {
      // global_rule 模式：直接使用 plugins
      plugins.value = { ...(props.modelValue.plugins || {}) }
    } else {
      plugins.value = {}
    }
  }

  // 监听 plugin_config_id 变化（只监听外部变化，不监听 plugins 变化）
  // 对于 global_rule 模式，只在初始化时加载，之后不再监听 plugins 变化
  watch(() => props.modelValue.plugin_config_id, () => {
    if (!isInternalUpdate.value) {
      loadPluginConfig()
    }
  }, { immediate: true })

  // 初始化加载配置
  onMounted(() => {
    loadPluginConfig()
  })

  // 更新插件配置并通知父组件
  const updatePlugins = (newPlugins) => {
    isInternalUpdate.value = true
    plugins.value = { ...newPlugins }
    
    if (isRouteMode.value) {
      // route 模式：只发送 plugins，由父组件处理 plugin_config_id
      emit('update:modelValue', { plugins: plugins.value })
    } else if (isGlobalRuleMode.value) {
      // global_rule 模式：发送包含 plugins 的对象
      emit('update:modelValue', { plugins: plugins.value })
    } else {
      // 其他模式
      emit('update:modelValue', { plugins: plugins.value })
    }
    
    // 使用 nextTick 确保 emit 完成后再重置标志
    setTimeout(() => {
      isInternalUpdate.value = false
    }, 0)
  }

  return {
    plugins,
    loadPluginConfig,
    updatePlugins,
    isRouteMode,
    isGlobalRuleMode
  }
}
