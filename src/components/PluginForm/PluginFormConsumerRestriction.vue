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
          此插件用于为路由添加 HTTP 基本认证。启用后，客户端需要在请求头中提供有效的用户名和密码才能访问该路由。
          可以限制只有特定的消费者或消费者组可以访问此路由。
        </div>
      </template>
    </el-alert>
    <el-form-item label="开启插件">
      <el-switch v-model="localEnable" @change="handleEnableChange" />
    </el-form-item>
    <template v-if="localEnable">
      <el-form-item label="限制类型">
        <el-radio-group v-model="localType" @change="handleTypeChange">
          <el-radio label="consumer">消费者</el-radio>
          <el-radio label="group">消费者组</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-alert
        type="warning"
        :closable="false"
        show-icon
        style="margin-bottom: 16px;"
      >
        <template #title>
          <span style="font-size: 13px;">黑名单生效的优先级高于白名单</span>
        </template>
        <template #default>
          <div style="font-size: 12px; line-height: 1.5;">
            可同时配置白名单与黑名单。若某消费者既在白名单中又在黑名单中，以黑名单为准，即禁止访问。
          </div>
        </template>
      </el-alert>
      <template v-if="localType === 'consumer'">
        <el-form-item label="白名单（允许的消费者）" prop="basicAuthConsumerWhitelist">
          <el-select
            v-model="localConsumerWhitelist"
            filterable
            clearable
            multiple
            placeholder="请选择允许的消费者（可多选）"
            style="width: 100%"
            :loading="loadingConsumers"
          >
            <el-option
              v-for="item in consumerList"
              :key="String(item.username)"
              :label="item.username"
              :value="item.username"
            />
          </el-select>
          <div class="form-tip">选中的消费者允许访问此路由</div>
        </el-form-item>
        <el-form-item label="黑名单（禁止的消费者）" prop="basicAuthConsumerBlacklist">
          <el-select
            v-model="localConsumerBlacklist"
            filterable
            clearable
            multiple
            placeholder="请选择禁止的消费者（可多选）"
            style="width: 100%"
            :loading="loadingConsumers"
          >
            <el-option
              v-for="item in consumerList"
              :key="String(item.username)"
              :label="item.username"
              :value="item.username"
            />
          </el-select>
          <div class="form-tip">选中的消费者禁止访问此路由，优先级高于白名单</div>
        </el-form-item>
      </template>
      <template v-if="localType === 'group'">
        <el-form-item label="白名单（允许的消费者组）" prop="basicAuthGroupWhitelist">
          <el-select
            v-model="localGroupWhitelist"
            filterable
            clearable
            multiple
            placeholder="请选择允许的消费者组（可多选）"
            style="width: 100%"
            :loading="loadingConsumerGroups"
          >
            <el-option
              v-for="item in consumerGroupList"
              :key="String(item.id)"
              :label="item.name || item.id"
              :value="item.id"
            >
              <span>{{ item.name || item.id }}</span>
              <span v-if="item.desc" style="color: #8492a6; font-size: 12px; margin-left: 10px">- {{ item.desc }}</span>
            </el-option>
          </el-select>
          <div class="form-tip">选中消费者组中的消费者允许访问此路由</div>
        </el-form-item>
        <el-form-item label="黑名单（禁止的消费者组）" prop="basicAuthGroupBlacklist">
          <el-select
            v-model="localGroupBlacklist"
            filterable
            clearable
            multiple
            placeholder="请选择禁止的消费者组（可多选）"
            style="width: 100%"
            :loading="loadingConsumerGroups"
          >
            <el-option
              v-for="item in consumerGroupList"
              :key="String(item.id)"
              :label="item.name || item.id"
              :value="item.id"
            >
              <span>{{ item.name || item.id }}</span>
              <span v-if="item.desc" style="color: #8492a6; font-size: 12px; margin-left: 10px">- {{ item.desc }}</span>
            </el-option>
          </el-select>
          <div class="form-tip">选中消费者组中的消费者禁止访问此路由，优先级高于白名单</div>
        </el-form-item>
      </template>
    </template>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, computed, nextTick } from 'vue'
import { consumerApi, consumerGroupApi } from '@/utils/api'
import { isPluginEnabled } from '@/utils/plugin'
import { usePluginConfig } from '@/composables/usePluginConfig'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      plugin_config_id: null
    })
  }
})

const emit = defineEmits(['update:modelValue'])

// 使用 composable 加载和管理 Plugin Config
const { plugins, updatePlugins } = usePluginConfig(props, emit)

// 从 plugins 中提取 basic-auth 配置
const basicAuthPlugin = computed(() => plugins.value['basic-auth'] || {})
const consumerRestrictionPlugin = computed(() => plugins.value['consumer-restriction'] || {})

// 计算 enabled 状态
// basic-auth 的启用状态由 consumer-restriction 决定
// 与列表显示使用相同的判断逻辑：只要 consumer-restriction 存在且 type 是 consumer_name 或 consumer_group_id，就认为启用
const enabled = computed(() => {
  // 检查 consumer-restriction 的启用状态，而不是 basic-auth
  return isPluginEnabled(consumerRestrictionPlugin.value)
})

// 计算 type（清空名单时仍按 cr.type 保持当前类型，不切回消费者）
const type = computed(() => {
  if (!enabled.value) return 'consumer'
  const cr = consumerRestrictionPlugin.value
  const restrictionType = cr.type || 'consumer_name'
  return restrictionType === 'consumer_group_id' ? 'group' : 'consumer'
})

// 内部状态：白名单 / 黑名单分开，支持同时配置
const localEnable = ref(enabled.value)
const localType = ref(type.value)
const localConsumerWhitelist = ref([])
const localConsumerBlacklist = ref([])
const localGroupWhitelist = ref([])
const localGroupBlacklist = ref([])

const consumerList = ref([])
const consumerGroupList = ref([])
const loadingConsumerGroups = ref(false)
const loadingConsumers = ref(false)

// 加载消费者列表
const loadConsumerList = async () => {
  loadingConsumers.value = true
  try {
    const response = await consumerApi.list({ page_size: 100 })
    const consumerData = response.data
    if (consumerData.list) {
      consumerList.value = consumerData.list.map(item => {
        const value = item.value || {}
        let username = value.username
        if (!username && item.key) {
          const parts = item.key.split('/')
          username = parts[parts.length - 1]
        }
        return { ...value, username: username || item.key }
      })
    } else {
      consumerList.value = []
    }
  } catch (error) {
    console.error('加载消费者列表失败:', error)
    consumerList.value = []
  } finally {
    loadingConsumers.value = false
  }
}

// 加载消费者组列表
const loadConsumerGroups = async () => {
  loadingConsumerGroups.value = true
  try {
    const response = await consumerGroupApi.list({ page_size: 100 })
    const data = response.data
    if (data.list) {
      consumerGroupList.value = data.list.map(item => {
        const value = item.value || {}
        let id = value.id
        if (!id && item.key) {
          const parts = item.key.split('/')
          id = parts[parts.length - 1]
        }
        return { ...value, id: id || item.key }
      })
    } else {
      consumerGroupList.value = []
    }
  } catch (error) {
    console.error('加载消费者组列表失败:', error)
    consumerGroupList.value = []
  } finally {
    loadingConsumerGroups.value = false
  }
}

// 确保数据已加载
const ensureDataLoaded = async () => {
  await Promise.all([
    loadConsumerList(),
    loadConsumerGroups()
  ])
}

// 组件挂载时立即加载数据
onMounted(async () => {
  await ensureDataLoaded()
})

const handleEnableChange = (value) => {
  localEnable.value = value
}

const handleTypeChange = (value) => {
  localType.value = value
  skipLocalEnableTypeEmit = true
  if (value === 'consumer') {
    localGroupWhitelist.value = []
    localGroupBlacklist.value = []
    emitConsumerRestrictionKeep('consumer', [], [])
  } else {
    localConsumerWhitelist.value = []
    localConsumerBlacklist.value = []
    emitConsumerRestrictionKeep('group', [], [])
  }
  nextTick(() => { skipLocalEnableTypeEmit = false })
}

// 始终保留 consumer-restriction（不删除），用于切换 type 时避免触发禁用
const emitConsumerRestrictionKeep = (restrictionType, whiteArr, blackArr) => {
  isInternalUpdate = true
  const currentPlugins = { ...plugins.value }
  const white = Array.isArray(whiteArr) ? whiteArr : []
  const black = Array.isArray(blackArr) ? blackArr : []
  // 确保 basic-auth 存在
  currentPlugins['basic-auth'] = currentPlugins['basic-auth'] || {}
  // basic-auth 的启用/禁用完全由 consumer-restriction 决定
  const base = {
    type: restrictionType === 'consumer' ? 'consumer_name' : 'consumer_group_id',
    rejected_msg: '访问被拒绝，您没有权限访问此路由'
  }
  // 只有当数组长度 > 0 时才设置，否则不设置（避免验证错误）
  if (white.length > 0) {
    base.whitelist = white
  }
  if (black.length > 0) {
    base.blacklist = black
  }
  currentPlugins['consumer-restriction'] = base
  updatePlugins(currentPlugins)
}

// 根据当前本地白/黑名单 emit；两侧都为空时保留 consumer-restriction（仅 type + rejected_msg），不删除插件
const emitConsumerRestrictionFromLocal = (restrictionType) => {
  const isConsumer = restrictionType === 'consumer'
  const white = isConsumer ? localConsumerWhitelist.value : localGroupWhitelist.value
  const black = isConsumer ? localConsumerBlacklist.value : localGroupBlacklist.value
  const w = Array.isArray(white) ? white : []
  const b = Array.isArray(black) ? black : []
  isInternalUpdate = true
  const currentPlugins = { ...plugins.value }
  // 确保 basic-auth 存在
  currentPlugins['basic-auth'] = currentPlugins['basic-auth'] || {}
  const base = {
    type: isConsumer ? 'consumer_name' : 'consumer_group_id',
    rejected_msg: '访问被拒绝，您没有权限访问'
  }
  // 只有当数组长度 > 0 时才设置，否则不设置（避免验证错误）
  if (w.length > 0) {
    base.whitelist = w
  }
  if (b.length > 0) {
    base.blacklist = b
  }
  currentPlugins['consumer-restriction'] = base
  updatePlugins(currentPlugins)
}

// 监听 props 变化，更新内部状态
watch([enabled, type], ([newEnabled, newType]) => {
  localEnable.value = newEnabled
  localType.value = newType
}, { immediate: true })

// 标记变量，用于区分是用户选择还是从 props 同步
let isInternalUpdate = false
let isSyncingFromProps = false
// 切换 type/listType 时跳过 [localEnable, localType] 的 emit，避免用旧 props 覆盖新配置
let skipLocalEnableTypeEmit = false

// 监听本地白/黑名单变化，自动更新配置（仅用户操作时触发）
watch([localConsumerWhitelist, localConsumerBlacklist], () => {
  if (isSyncingFromProps) return
  if (localType.value !== 'consumer') return
  emitConsumerRestrictionFromLocal('consumer')
}, { deep: true })

watch([localGroupWhitelist, localGroupBlacklist], () => {
  if (isSyncingFromProps) return
  if (localType.value !== 'group') return
  emitConsumerRestrictionFromLocal('group')
}, { deep: true })

// 从 plugins 同步白/黑名单到本地 ref（打开弹窗、回显已保存配置时）
watch(
  () => plugins.value['consumer-restriction'],
  (cr) => {
    if (isInternalUpdate) {
      isInternalUpdate = false
      return
    }
    isSyncingFromProps = true
    const w = cr?.whitelist
    const b = cr?.blacklist
    const restrictionType = cr?.type || 'consumer_name'
    const wArr = Array.isArray(w) ? [...w] : []
    const bArr = Array.isArray(b) ? [...b] : []
    if (restrictionType === 'consumer_name') {
      localConsumerWhitelist.value = wArr
      localConsumerBlacklist.value = bArr
      localGroupWhitelist.value = []
      localGroupBlacklist.value = []
    } else {
      localGroupWhitelist.value = wArr
      localGroupBlacklist.value = bArr
      localConsumerWhitelist.value = []
      localConsumerBlacklist.value = []
    }
    nextTick(() => {
      isSyncingFromProps = false
    })
  },
  { immediate: true, deep: true }
)

// 监听内部状态变化，更新到父组件（仅 basic-auth 开关）
// basic-auth 的启用/禁用完全由 consumer-restriction 的启用/禁用决定
// 关闭基础认证时：设置 consumer-restriction 为 _meta.disable = true（保留原配置）
// 开启基础认证时：移除 consumer-restriction 的 _meta.disable，并确保 basic-auth 和 consumer-restriction 都存在
watch([localEnable, localType], ([newEnabled, newType]) => {
  if (skipLocalEnableTypeEmit) return
  const currentPlugins = { ...plugins.value }
  const cr = currentPlugins['consumer-restriction'] || {}
  
  if (newEnabled) {
    // 开启时：确保 basic-auth 和 consumer-restriction 都存在
    currentPlugins['basic-auth'] = currentPlugins['basic-auth'] || {}
    
    // 如果 consumer-restriction 不存在或只有 _meta，创建默认配置
    if (Object.keys(cr).length === 0 || (Object.keys(cr).length === 1 && cr._meta)) {
      const restrictionType = newType === 'consumer' ? 'consumer_name' : 'consumer_group_id'
      currentPlugins['consumer-restriction'] = {
        type: restrictionType,
        rejected_msg: '访问被拒绝，您没有权限访问此路由'
      }
    } else {
      // 如果已存在配置，移除 _meta.disable
      const next = { ...cr }
      if (next._meta?.disable) {
        delete next._meta.disable
        if (Object.keys(next._meta || {}).length === 0) delete next._meta
      }
      // 确保 type 和 rejected_msg 存在
      if (!next.type) {
        next.type = newType === 'consumer' ? 'consumer_name' : 'consumer_group_id'
      }
      if (!next.rejected_msg) {
        next.rejected_msg = '访问被拒绝，您没有权限访问此路由'
      }
      currentPlugins['consumer-restriction'] = next
    }
  } else {
    // 关闭时：设置 consumer-restriction 为 _meta.disable = true，保留原有 whitelist/blacklist/type 等
    // 如果 consumer-restriction 不存在，创建一个只有 _meta.disable 的配置
    const next = Object.keys(cr).length > 0 ? { ...cr } : {}
    if (!next._meta) next._meta = {}
    next._meta.disable = true
    currentPlugins['consumer-restriction'] = next
  }
  updatePlugins(currentPlugins)
})
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
