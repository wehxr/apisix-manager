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
          此插件用于从 HTTP 请求头或查询参数中提取并设置客户端的真实 IP 地址。
          当 APISIX 位于反向代理（如 Nginx、负载均衡器、CDN）后面时，需要使用此插件来获取真实的客户端 IP，而不是代理服务器的 IP。
        </div>
      </template>
    </el-alert>
    <el-form-item label="开启插件">
      <el-switch :model-value="enabled" @update:model-value="handleEnableChange" />
    </el-form-item>
    <template v-if="enabled">
      <el-form-item label="IP 来源" required>
        <el-select
          :model-value="source"
          @update:model-value="handleSourceChange"
          placeholder="选择 IP 来源"
          style="width: 100%"
        >
          <el-option label="X-Forwarded-For (http_x_forwarded_for)" value="http_x_forwarded_for" />
          <el-option label="X-Real-IP (http_x_real_ip)" value="http_x_real_ip" />
          <el-option label="Query 参数 realip (arg_realip)" value="arg_realip" />
        </el-select>
        <div class="form-tip">
          指定从哪个变量获取客户端真实 IP 地址：<br/>
          • <strong>http_x_forwarded_for</strong>：从 X-Forwarded-For 请求头获取（常用）<br/>
          • <strong>http_x_real_ip</strong>：从 X-Real-IP 请求头获取<br/>
          • <strong>arg_realip</strong>：从 URL 查询参数 realip 获取，如 /api?realip=1.2.3.4:8080
        </div>
      </el-form-item>
      <el-form-item label="可信地址列表">
        <el-input
          :model-value="trustedAddressesInput"
          @update:model-value="handleTrustedAddressesInput"
          type="textarea"
          :rows="4"
          placeholder="每行一个 IP 或 CIDR，如:&#10;127.0.0.1&#10;192.168.1.0/24&#10;10.0.0.0/8"
        />
        <div class="form-tip">
          配置可信的代理服务器地址列表。只有来自这些地址的请求才会被信任并提取真实 IP，防止 IP 伪造攻击。<br/>
          格式：每行一个 IP 地址或 CIDR 网段，如：127.0.0.1、192.168.1.0/24、10.0.0.0/8
        </div>
      </el-form-item>
      <el-form-item label="递归查找">
        <el-switch
          :model-value="recursive"
          @update:model-value="handleRecursiveChange"
        />
        <div class="form-tip">
          控制多层代理场景下的真实 IP 提取方式：<br/>
          • <strong>关闭（false）</strong>：使用 source 中的最后一个地址，适用于单层代理<br/>
          • <strong>开启（true）</strong>：递归查找，跳过所有可信地址，使用最后一个非可信地址，适用于多层代理（如：客户端 → CDN → 负载均衡器 → APISIX）
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
const source = computed(() => config.value.source || 'http_x_forwarded_for')
const trustedAddresses = computed(() =>
  Array.isArray(config.value.trusted_addresses)
    ? config.value.trusted_addresses
    : []
)
const recursive = computed(() => config.value.recursive !== undefined ? config.value.recursive : false)

const trustedAddressesInput = computed({
  get: () => trustedAddresses.value.join('\n'),
  set: (v) => {
    const arr = (v || '')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
    apply({ trusted_addresses: arr.length ? arr : undefined })
  }
})

function apply(partial) {
  const cfg = { ...config.value, ...partial }
  if ('trusted_addresses' in partial && partial.trusted_addresses === undefined) {
    delete cfg.trusted_addresses
  }
  setPluginEnabled(cfg, enabled.value)
  updateConfig(cfg)
}

function handleEnableChange(value) {
  const cfg = value
    ? {
        source: source.value || 'http_x_forwarded_for',
        trusted_addresses: trustedAddresses.value.length ? trustedAddresses.value : undefined,
        recursive: recursive.value
      }
    : { ...config.value }
  setPluginEnabled(cfg, value)
  updateConfig(cfg)
}

function handleTrustedAddressesInput(value) {
  trustedAddressesInput.value = value
}

const handleSourceChange = (v) => apply({ source: v || 'http_x_forwarded_for' })
const handleRecursiveChange = (v) => apply({ recursive: v })
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
