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
          此插件用于控制客户端请求行为，主要功能是限制客户端请求体的大小。
          可以防止过大的请求体导致服务器资源耗尽，保护上游服务免受恶意请求的影响。
        </div>
      </template>
    </el-alert>
    <el-form-item label="开启插件">
      <el-switch :model-value="enabled" @update:model-value="handleEnableChange" />
    </el-form-item>
    <template v-if="enabled">
      <el-form-item label="最大请求体大小（字节）" required>
        <el-input-number
          :model-value="maxBodySize"
          @update:model-value="handleMaxBodySizeChange"
          :min="0"
          :max="1073741824"
          style="width: 100%"
        />
        <div class="form-tip">客户端请求体的最大大小，0 表示不限制，单位：字节（1MB = 1048576 字节）</div>
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
const maxBodySize = computed(() => config.value.max_body_size ?? 1048576)

function handleEnableChange(value) {
  const cfg = value ? { ...config.value, max_body_size: maxBodySize.value ?? 1048576 } : { ...config.value }
  setPluginEnabled(cfg, value)
  updateConfig(cfg)
}

function handleMaxBodySizeChange(value) {
  const cfg = { ...config.value, max_body_size: value }
  setPluginEnabled(cfg, enabled.value)
  updateConfig(cfg)
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
