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

  // 判断是 route 模式还是 global_rule 模式
  const isRouteMode = computed(() => {
    return !!props.modelValue.plugin_config_id
  })

  const isGlobalRuleMode = computed(() => {
    return !isRouteMode.value && !!props.modelValue.plugins
  })

  // 从 Plugin Config 加载插件配置（route 模式）
  const loadPluginConfig = async () => {
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

  // 监听 plugin_config_id 或 plugins 变化
  watch(() => [props.modelValue.plugin_config_id, props.modelValue.plugins], () => {
    loadPluginConfig()
  }, { immediate: true, deep: true })

  onMounted(() => {
    loadPluginConfig()
  })

  // 更新插件配置并通知父组件
  const updatePlugins = (newPlugins) => {
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
  }

  return {
    plugins,
    loadPluginConfig,
    updatePlugins,
    isRouteMode,
    isGlobalRuleMode
  }
}
