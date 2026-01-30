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
          此插件用于根据客户端 IP 地址控制访问。支持白名单模式（仅允许指定 IP 访问）和黑名单模式（禁止指定 IP 访问）。
          可以配置单个 IP 地址或 CIDR 网段。
        </div>
      </template>
    </el-alert>
    <el-form-item label="开启插件">
      <el-switch :model-value="enabled" @update:model-value="handleEnableChange" />
    </el-form-item>
    <template v-if="enabled">
      <el-form-item label="限制类型" required>
        <el-radio-group :model-value="type" @update:model-value="handleTypeChange">
          <el-radio label="whitelist">白名单（仅允许）</el-radio>
          <el-radio label="blacklist">黑名单（禁止）</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="IP 列表" required>
        <el-input
          :model-value="ipListInput"
          @update:model-value="handleIpListInput"
          type="textarea"
          :rows="4"
          placeholder="每行一个 IP 或 CIDR，如:&#10;192.168.1.1&#10;10.0.0.0/8"
        />
        <div class="form-tip">每行一个 IP 地址或 CIDR 网段</div>
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
const type = computed(() => {
  if (config.value.whitelist) return 'whitelist'
  if (config.value.blacklist) return 'blacklist'
  return 'whitelist'
})
const ipList = computed(() => {
  if (config.value.whitelist) return config.value.whitelist
  if (config.value.blacklist) return config.value.blacklist
  return []
})

const ipListInput = computed({
  get: () => ipList.value.join('\n'),
  set: (v) => {
    const ips = (v || '').split('\n').map((s) => s.trim()).filter(Boolean)
    applyIpList(ips)
  }
})

function buildCfg(ips, typ) {
  const cfg = {}
  setPluginEnabled(cfg, true)
  if (ips.length) {
    if (typ === 'whitelist') cfg.whitelist = ips
    else cfg.blacklist = ips
  }
  return cfg
}

function applyIpList(ips) {
  const cfg = buildCfg(ips, type.value)
  updateConfig(cfg)
}

function handleEnableChange(value) {
  const cfg = value
    ? buildCfg((ipListInput.value || '').split('\n').map((s) => s.trim()).filter(Boolean), type.value)
    : { ...config.value }
  setPluginEnabled(cfg, value)
  updateConfig(cfg)
}

function handleTypeChange(value) {
  const ips = (ipListInput.value || '').split('\n').map((s) => s.trim()).filter(Boolean)
  const cfg = buildCfg(ips, value)
  updateConfig(cfg)
}

function handleIpListInput(value) {
  ipListInput.value = value
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
