import { ref, watch, onMounted } from 'vue'
import { pluginConfigApi } from '../utils/api'

/**
 * 插件配置 composable
 * 用于在插件子组件中加载和管理 Plugin Config
 */
export function usePluginConfig(props, emit) {
  // 内部状态：plugins
  const plugins = ref({})

  // 从 Plugin Config 加载插件配置
  const loadPluginConfig = async () => {
    if (props.modelValue.plugin_config_id) {
      try {
        const pluginConfigRes = await pluginConfigApi.get(props.modelValue.plugin_config_id)
        const pluginConfigData = pluginConfigRes.data?.value || pluginConfigRes.data || {}
        plugins.value = pluginConfigData.plugins || {}
      } catch (error) {
        plugins.value = {}
      }
    } else {
      plugins.value = {}
    }
  }

  // 监听 plugin_config_id 变化
  watch(() => props.modelValue.plugin_config_id, () => {
    loadPluginConfig()
  }, { immediate: true })

  onMounted(() => {
    loadPluginConfig()
  })

  // 更新插件配置并通知父组件
  const updatePlugins = (newPlugins) => {
    plugins.value = { ...newPlugins }
    emit('update:modelValue', { plugins: plugins.value })
  }

  return {
    plugins,
    loadPluginConfig,
    updatePlugins
  }
}
