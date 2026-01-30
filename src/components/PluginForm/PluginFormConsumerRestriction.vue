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
  modelValue: { type: Object, default: () => ({}) },
  resourceType: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])
const { config, updateConfig } = usePluginConfig(props, emit)

const enabled = computed(() => isPluginEnabled(config.value))

const type = computed(() => {
  if (!enabled.value) return 'consumer'
  const cr = config.value
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

const emitConsumerRestrictionKeep = (restrictionType, whiteArr, blackArr) => {
  isInternalUpdate = true
  const white = Array.isArray(whiteArr) ? whiteArr : []
  const black = Array.isArray(blackArr) ? blackArr : []
  const base = {
    type: restrictionType === 'consumer' ? 'consumer_name' : 'consumer_group_id',
    rejected_msg: '访问被拒绝，您没有权限访问此路由'
  }
  if (white.length > 0) base.whitelist = white
  if (black.length > 0) base.blacklist = black
  updateConfig(base)
}

const emitConsumerRestrictionFromLocal = (restrictionType) => {
  const isConsumer = restrictionType === 'consumer'
  const white = isConsumer ? localConsumerWhitelist.value : localGroupWhitelist.value
  const black = isConsumer ? localConsumerBlacklist.value : localGroupBlacklist.value
  const w = Array.isArray(white) ? white : []
  const b = Array.isArray(black) ? black : []
  isInternalUpdate = true
  const base = {
    type: isConsumer ? 'consumer_name' : 'consumer_group_id',
    rejected_msg: '访问被拒绝，您没有权限访问'
  }
  if (w.length > 0) base.whitelist = w
  if (b.length > 0) base.blacklist = b
  updateConfig(base)
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

watch(
  () => config.value,
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

watch([localEnable, localType], ([newEnabled, newType]) => {
  if (skipLocalEnableTypeEmit) return
  const cr = config.value || {}
  let next
  if (newEnabled) {
    if (Object.keys(cr).length === 0 || (Object.keys(cr).length === 1 && cr._meta)) {
      const restrictionType = newType === 'consumer' ? 'consumer_name' : 'consumer_group_id'
      next = { type: restrictionType, rejected_msg: '访问被拒绝，您没有权限访问此路由' }
    } else {
      next = { ...cr }
      if (next._meta?.disable) {
        delete next._meta.disable
        if (Object.keys(next._meta || {}).length === 0) delete next._meta
      }
      if (!next.type) next.type = newType === 'consumer' ? 'consumer_name' : 'consumer_group_id'
      if (!next.rejected_msg) next.rejected_msg = '访问被拒绝，您没有权限访问此路由'
    }
  } else {
    next = Object.keys(cr).length > 0 ? { ...cr } : {}
    if (!next._meta) next._meta = {}
    next._meta.disable = true
  }
  updateConfig(next)
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
