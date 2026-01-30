<template>
  <div class="global-rule-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>全局规则</span>
          <GroupedDropdown
            :grouped="pluginGrouped"
            @command="handleAddPlugin"
          >
            <el-button type="primary">
              插件<el-icon class="el-icon--right"><arrow-down /></el-icon>
            </el-button>
          </GroupedDropdown>
        </div>
      </template>

      <div class="table-wrapper">
        <el-table :data="pluginList" v-loading="loading" style="width: 100%">
          <el-table-column prop="name" label="插件名称">
            <template #default="{ row }">
              <span>{{ getPluginName(row.type) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" >
            <template #default="{ row }">
              <el-tag :type="row.enabled ? 'success' : 'info'" size="small">
                {{ row.enabled ? '已启用' : '已禁用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="update_time" label="更新时间" >
            <template #default="{ row }">
              <span>{{ formatTimestamp(row.update_time) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right" class-name="action-column">
            <template #default="{ row }">
              <div class="action-buttons">
                <el-button size="small" @click="handleEditPlugin(row)">编辑</el-button>
                <el-button size="small" type="danger" @click="handleDeletePlugin(row)">删除</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>

    <!-- 插件配置对话框 -->
    <PluginDialog
      v-model="pluginDialogVisible"
      resource-type="global_rule"
      :resource-id="currentGlobalRuleId"
      :plugin-type="currentPluginType"
      @saved="handlePluginSaved"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowDown } from '@element-plus/icons-vue'
import { globalRuleApi } from '@/utils/api'
import { formatTimestamp } from '@/utils/format'
import { isPluginEnabled, getPluginName, getPluginsGroupedByResourceType } from '@/utils/plugin'
import { generateId } from '@/utils/id'
import PluginDialog from '@/components/PluginDialog.vue'
import GroupedDropdown from '@/components/GroupedDropdown.vue'

const loading = ref(false)
const globalRuleList = ref([])
const pluginDialogVisible = ref(false)
const currentGlobalRuleId = ref('')
const currentPluginType = ref('')

// 将全局规则列表转换为插件列表（每行一个插件）
const pluginList = computed(() => {
  const plugins = []
  
  globalRuleList.value.forEach(rule => {
    const rulePlugins = rule.plugins || {}
    Object.keys(rulePlugins).forEach(pluginType => {
      const pluginConfig = rulePlugins[pluginType]
      plugins.push({
        type: pluginType,
        config: pluginConfig,
        enabled: isPluginEnabled(pluginConfig),
        globalRuleId: rule.id,
        update_time: rule.update_time,
        create_time: rule.create_time
      })
    })
  })
  
  return plugins
})

const pluginGrouped = computed(() => getPluginsGroupedByResourceType('global_rule'))

const loadData = async () => {
  loading.value = true
  try {
    const response = await globalRuleApi.list()
    const data = response.data
    if (data.list && data.list.length > 0) {
      globalRuleList.value = data.list.map(item => {
        const rule = item.value || {}
        return {
          ...rule,
          id: rule.id || item.key?.split('/').pop() || generateId('global_rule'),
          plugins: rule.plugins || {},
          create_time: rule.create_time || item.create_time,
          update_time: rule.update_time || item.update_time
        }
      })
    } else {
      globalRuleList.value = []
    }
  } catch (error) {
    console.error('加载全局规则失败:', error)
    globalRuleList.value = []
  } finally {
    loading.value = false
  }
}

// 获取或创建全局规则 ID
const getOrCreateGlobalRuleId = async () => {
  if (globalRuleList.value.length > 0) {
    return globalRuleList.value[0].id
  }
  
  // 如果没有全局规则，创建一个
  const newId = generateId('global_rule')
  try {
    await globalRuleApi.create(newId, { plugins: {} })
    await loadData()
    return newId
  } catch (error) {
    console.error('创建全局规则失败:', error)
    throw error
  }
}

// 处理添加/配置插件（已存在则直接打开配置页）
const handleAddPlugin = async (pluginType) => {
  try {
    const globalRuleId = await getOrCreateGlobalRuleId()
    if (pluginDialogVisible.value) {
      pluginDialogVisible.value = false
      await nextTick()
    }
    currentGlobalRuleId.value = globalRuleId
    currentPluginType.value = pluginType
    await nextTick()
    pluginDialogVisible.value = true
  } catch (error) {
    console.error('打开插件配置失败:', error)
    ElMessage.error('无法打开配置，请检查网络或稍后重试')
  }
}

// 处理编辑插件
const handleEditPlugin = async (row) => {
  if (pluginDialogVisible.value) {
    pluginDialogVisible.value = false
    await nextTick()
  }
  currentGlobalRuleId.value = row.globalRuleId
  currentPluginType.value = row.type
  await nextTick()
  pluginDialogVisible.value = true
}

// 处理删除插件
const handleDeletePlugin = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除插件 "${getPluginName(row.type)}" 吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const globalRuleId = row.globalRuleId
    const currentRule = globalRuleList.value.find(r => r.id === globalRuleId)
    if (!currentRule) {
      ElMessage.error('未找到对应的全局规则')
      return
    }
    
    const updatedPlugins = { ...currentRule.plugins }
    delete updatedPlugins[row.type]
    const { update_time, create_time, ...rest } = currentRule
    await globalRuleApi.update(globalRuleId, { ...rest, plugins: updatedPlugins })
    
    ElMessage.success('删除成功')
    await loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除插件失败:', error)
      ElMessage.error('删除插件失败')
    }
  }
}

// 处理插件保存成功
const handlePluginSaved = () => {
  loadData()
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.global-rule-page {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-wrapper {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.action-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .action-buttons {
    flex-direction: column;
  }
}
</style>
