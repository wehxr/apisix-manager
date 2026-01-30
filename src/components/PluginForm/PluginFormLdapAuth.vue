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
          <template v-if="isConsumerSide">
            LDAP 认证需与 Consumer 配合使用。在 Consumer 端配置 <code>user_dn</code>（LDAP 客户端的 DN），
            调用方使用 Basic Authentication 与 LDAP 服务器进行认证。
          </template>
          <template v-else>
            在路由/服务端配置 LDAP 服务器地址、base_dn 等，与已配置 ldap-auth 的 Consumer 一起完成认证。
          </template>
        </div>
      </template>
    </el-alert>
    <el-form-item label="开启插件">
      <el-switch :model-value="enabled" @update:model-value="handleEnableChange" />
    </el-form-item>
    <template v-if="enabled">
      <!-- Consumer 端：仅 user_dn -->
      <template v-if="isConsumerSide">
        <el-form-item label="user_dn" prop="user_dn" required>
          <el-input
            :model-value="user_dn"
            @update:model-value="handleUserDnChange"
            placeholder="例如：cn=user01,ou=users,dc=example,dc=org"
          />
          <div class="form-tip">LDAP 客户端的 DN，支持 APISIX Secret 资源</div>
        </el-form-item>
      </template>
      <!-- Route 端：base_dn, ldap_uri, use_tls, tls_verify, uid -->
      <template v-else>
        <el-form-item label="ldap_uri" prop="ldap_uri" required>
          <el-input
            :model-value="ldap_uri"
            @update:model-value="handleLdapUriChange"
            placeholder="例如：localhost:1389"
          />
          <div class="form-tip">LDAP 服务器的 URI</div>
        </el-form-item>
        <el-form-item label="base_dn" prop="base_dn" required>
          <el-input
            :model-value="base_dn"
            @update:model-value="handleBaseDnChange"
            placeholder="例如：ou=users,dc=example,dc=org"
          />
          <div class="form-tip">LDAP 服务器的 base DN</div>
        </el-form-item>
        <el-form-item label="uid" prop="uid">
          <el-input
            :model-value="uid"
            @update:model-value="handleUidChange"
            placeholder="默认：cn"
          />
          <div class="form-tip">UID 属性，默认 cn</div>
        </el-form-item>
        <el-form-item label="use_tls" prop="use_tls">
          <el-switch
            :model-value="use_tls"
            @update:model-value="handleUseTlsChange"
          />
          <div class="form-tip">是否启用 TLS，默认 false</div>
        </el-form-item>
        <el-form-item label="tls_verify" prop="tls_verify">
          <el-switch
            :model-value="tls_verify"
            @update:model-value="handleTlsVerifyChange"
          />
          <div class="form-tip">是否校验 LDAP 服务器证书，默认 false</div>
        </el-form-item>
      </template>
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

// Consumer 端：consumer / consumer_group；Route 端：route / global_rule
const isConsumerSide = computed(() =>
  ['consumer', 'consumer_group'].includes(props.resourceType)
)

const enabled = computed(() => isPluginEnabled(config.value))

// Consumer 端字段
const user_dn = computed(() => config.value.user_dn ?? '')

// Route 端字段
const base_dn = computed(() => config.value.base_dn ?? '')
const ldap_uri = computed(() => config.value.ldap_uri ?? '')
const use_tls = computed(() => config.value.use_tls === true)
const tls_verify = computed(() => config.value.tls_verify === true)
const uid = computed(() => config.value.uid ?? 'cn')

// 编辑字段时只更新字段值，不改变插件的启用/禁用状态
function buildConsumerConfig(partial) {
  const cfg = { ...config.value, ...partial }
  return {
    user_dn: cfg.user_dn ?? '',
    ...(cfg._meta && Object.keys(cfg._meta).length > 0 ? { _meta: cfg._meta } : {})
  }
}

function buildRouteConfig(partial) {
  const cfg = { ...config.value, ...partial }
  const out = {
    base_dn: cfg.base_dn ?? '',
    ldap_uri: cfg.ldap_uri ?? '',
    uid: (cfg.uid ?? 'cn').toString().trim() || 'cn',
    ...(cfg._meta && Object.keys(cfg._meta).length > 0 ? { _meta: cfg._meta } : {})
  }
  if (cfg.use_tls === true) out.use_tls = true
  if (cfg.tls_verify === true) out.tls_verify = true
  return out
}

function handleEnableChange(value) {
  if (!value) {
    const cfg = { ...config.value }
    setPluginEnabled(cfg, false)
    updateConfig(cfg)
    return
  }
  // 用户点击「开启」时强制为启用，不根据必填项判断，否则空配置时开关会立刻被关掉
  if (isConsumerSide.value) {
    const cfg = buildConsumerConfig({ user_dn: user_dn.value || '' })
    setPluginEnabled(cfg, true)
    updateConfig(cfg)
  } else {
    const cfg = buildRouteConfig({
      base_dn: base_dn.value || '',
      ldap_uri: ldap_uri.value || '',
      use_tls: use_tls.value,
      tls_verify: tls_verify.value,
      uid: uid.value || 'cn'
    })
    setPluginEnabled(cfg, true)
    updateConfig(cfg)
  }
}

function handleUserDnChange(value) {
  updateConfig(buildConsumerConfig({ user_dn: value ?? '' }))
}

function handleBaseDnChange(value) {
  updateConfig(buildRouteConfig({ base_dn: value ?? '' }))
}

function handleLdapUriChange(value) {
  updateConfig(buildRouteConfig({ ldap_uri: value ?? '' }))
}

function handleUseTlsChange(value) {
  updateConfig(buildRouteConfig({ use_tls: value }))
}

function handleTlsVerifyChange(value) {
  updateConfig(buildRouteConfig({ tls_verify: value }))
}

function handleUidChange(value) {
  updateConfig(buildRouteConfig({ uid: (value ?? 'cn').toString().trim() || 'cn' }))
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
code {
  font-size: 12px;
  background: #f5f7fa;
  padding: 1px 6px;
  border-radius: 4px;
}
</style>
