<template>
  <div>
    <el-alert
      title="插件说明"
      type="info"
      :closable="false"
      style="margin-bottom: 20px;"
    >
      <template #default>
        <div style="font-size: 13px; line-height: 1.8;">
          <p style="margin: 0 0 8px 0;">
            <strong>功能说明：</strong>此插件将传入流量复制到 APISIX 并转发到指定的上游，而不会中断常规服务。可配置镜像全部流量或仅镜像一部分流量。
          </p>
          <ul style="margin: 0 0 8px 0; padding-left: 20px;">
            <li><strong>故障排查：</strong>将流量镜像到测试环境进行分析</li>
            <li><strong>安全检查：</strong>将流量镜像到安全审计服务</li>
            <li><strong>数据分析：</strong>将部分流量镜像到分析服务</li>
          </ul>
          <p style="margin: 0; color: #909399;">
            APISIX 会忽略接收镜像流量的上游主机的任何响应，不影响正常请求的响应。
          </p>
        </div>
      </template>
    </el-alert>
    <el-form-item label="开启插件">
      <el-switch :model-value="enabled" @update:model-value="handleEnableChange" />
    </el-form-item>
    <template v-if="enabled">
      <el-form-item label="镜像目标地址" required>
        <el-input
          :model-value="host"
          @update:model-value="handleHostChange"
          placeholder="如: http://127.0.0.1:8081"
        />
        <div class="form-tip">
          <p style="margin: 0 0 5px 0;"><strong>说明：</strong>将镜像流量转发到的主机地址。必须包含协议（scheme），但不包含路径。</p>
          <p style="margin: 0; color: #909399;">
            <strong>示例：</strong><code style="background: #f5f7fa; padding: 2px 4px; border-radius: 2px;">http://127.0.0.1:8081</code>、<code style="background: #f5f7fa; padding: 2px 4px; border-radius: 2px;">https://mirror.example.com</code>
          </p>
        </div>
      </el-form-item>

      <el-form-item label="镜像路径">
        <el-input
          :model-value="path"
          @update:model-value="handlePathChange"
          placeholder="留空则使用当前路由的 URI 路径"
        />
        <div class="form-tip">
          <p style="margin: 0 0 5px 0;"><strong>说明：</strong>镜像流量转发到的主机路径。未指定时默认为当前路由的 URI 路径。镜像 gRPC 流量时不适用。</p>
        </div>
      </el-form-item>

      <el-form-item label="路径连接模式" v-if="path">
        <el-radio-group :model-value="pathConcatMode" @update:model-value="handlePathConcatModeChange">
          <el-radio label="replace">replace（直接使用配置的路径）</el-radio>
          <el-radio label="prefix">prefix（配置路径 + 请求 URI 路径）</el-radio>
        </el-radio-group>
        <div class="form-tip">
          <p style="margin: 0 0 5px 0;"><strong>replace：</strong>配置的 path 直接作为转发到镜像主机的路径。</p>
          <p style="margin: 0;"><strong>prefix：</strong>转发路径 = 配置的 path + 路由的请求 URI 路径。镜像 gRPC 流量时不适用。</p>
        </div>
      </el-form-item>

      <el-form-item label="镜像比例">
        <el-input-number
          :model-value="sampleRatio"
          @update:model-value="handleSampleRatioChange"
          :min="0.00001"
          :max="1"
          :step="0.1"
          :precision="5"
          style="width: 100%"
        />
        <div class="form-tip">
          <p style="margin: 0 0 5px 0;"><strong>说明：</strong>被镜像的请求比例，取值范围 0.00001 ~ 1。默认 1 表示镜像全部流量；0.5 表示镜像 50% 的请求。</p>
          <p style="margin: 0; color: #909399;">
            <strong>示例：</strong>设为 0.5 时，约一半的请求会被复制并转发到镜像目标。
          </p>
        </div>
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
const host = computed(() => config.value.host || '')
const path = computed(() => config.value.path || '')
const pathConcatMode = computed(() => config.value.path_concat_mode || 'replace')
const sampleRatio = computed(() => {
  const v = config.value.sample_ratio
  return v !== undefined && v !== null ? Number(v) : 1
})

function buildConfig() {
  return {
    host: host.value || '',
    ...(path.value ? { path: path.value, path_concat_mode: pathConcatMode.value } : {}),
    sample_ratio: sampleRatio.value
  }
}

function handleEnableChange(value) {
  const cfg = value ? buildConfig() : { ...config.value }
  setPluginEnabled(cfg, value)
  updateConfig(cfg)
}

function handleHostChange(value) {
  const cfg = { ...config.value, host: value }
  setPluginEnabled(cfg, enabled.value)
  updateConfig(cfg)
}

function handlePathChange(value) {
  const cfg = { ...config.value, path: value || undefined }
  if (!value) delete cfg.path_concat_mode
  setPluginEnabled(cfg, enabled.value)
  updateConfig(cfg)
}

function handlePathConcatModeChange(value) {
  const cfg = { ...config.value, path_concat_mode: value }
  setPluginEnabled(cfg, enabled.value)
  updateConfig(cfg)
}

function handleSampleRatioChange(value) {
  const cfg = { ...config.value, sample_ratio: value }
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
