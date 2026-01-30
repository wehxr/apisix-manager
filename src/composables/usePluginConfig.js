import { ref, watch } from 'vue'

/**
 * 插件配置 composable：父组件只传当前插件的 config，子组件只编辑并回传该 config。
 */
export function usePluginConfig(props, emit) {
  const config = ref({})
  const isInternalUpdate = ref(false)

  watch(
    () => props.modelValue,
    (val) => {
      if (isInternalUpdate.value) return
      config.value = val && typeof val === 'object' ? { ...val } : {}
    },
    { immediate: true }
  )

  const updateConfig = (newConfig) => {
    isInternalUpdate.value = true
    config.value = newConfig && typeof newConfig === 'object' ? { ...newConfig } : {}
    emit('update:modelValue', config.value)
    setTimeout(() => { isInternalUpdate.value = false }, 0)
  }

  return {
    config,
    updateConfig
  }
}
