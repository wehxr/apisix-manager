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
          此插件用于拦截和阻止匹配指定模式的请求 URI。可以配置多个正则表达式规则来阻止恶意请求或不需要的 URI。
          适用于防止 SQL 注入、路径遍历等攻击，或阻止访问特定的资源路径。
        </div>
      </template>
    </el-alert>
    <el-form-item label="开启插件">
      <el-switch :model-value="enabled" @update:model-value="handleEnableChange" />
    </el-form-item>
    <template v-if="enabled">
      <el-form-item label="阻止规则" required>
        <el-input
          :model-value="blockRulesInput"
          @update:model-value="handleBlockRulesInput"
          type="textarea"
          :rows="4"
          placeholder="每行一个正则表达式，如:&#10;root.exe&#10;root.m+&#10;\.\./"
        />
        <div class="form-tip">每行一个正则表达式模式，匹配的 URI 将被阻止</div>
      </el-form-item>
      <el-form-item label="拒绝状态码" required>
        <el-input-number
          :model-value="rejectedCode"
          @update:model-value="handleRejectedCodeChange"
          :min="200"
          :max="599"
          style="width: 100%"
        />
        <div class="form-tip">当请求被阻止时返回的 HTTP 状态码，默认 403</div>
      </el-form-item>
      <el-form-item label="拒绝消息" required>
        <el-input
          :model-value="rejectedMsg"
          @update:model-value="handleRejectedMsgChange"
          placeholder="请求被阻止时返回的消息"
        />
        <div class="form-tip">可选，当请求被阻止时返回的自定义消息</div>
      </el-form-item>
      <el-form-item label="忽略大小写">
        <el-switch :model-value="caseInsensitive" @update:model-value="handleCaseInsensitiveChange" />
        <div class="form-tip">是否在匹配时忽略大小写</div>
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
const blockRules = computed(() => config.value.block_rules || [])
const rejectedCode = computed(() => config.value.rejected_code || 403)
const rejectedMsg = computed(() => config.value.rejected_msg || '访问被拒绝，您没有权限访问')
const caseInsensitive = computed(() => config.value.case_insensitive || false)

const blockRulesInput = computed({
  get: () => blockRules.value.join('\n'),
  set: (v) => {
    const rules = (v || '').split('\n').map((s) => s.trim()).filter(Boolean)
    apply({ block_rules: rules })
  }
})

function apply(partial) {
  const cfg = { ...config.value, ...partial }
  setPluginEnabled(cfg, enabled.value)
  updateConfig(cfg)
}

function handleEnableChange(value) {
  const cfg = value
    ? {
        block_rules: blockRules.value,
        rejected_code: rejectedCode.value,
        rejected_msg: rejectedMsg.value,
        case_insensitive: caseInsensitive.value
      }
    : { ...config.value }
  setPluginEnabled(cfg, value)
  updateConfig(cfg)
}

function handleBlockRulesInput(value) {
  blockRulesInput.value = value
}

const handleRejectedCodeChange = (v) => apply({ rejected_code: v })
const handleRejectedMsgChange = (v) => apply({ rejected_msg: v })
const handleCaseInsensitiveChange = (v) => apply({ case_insensitive: v })
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
