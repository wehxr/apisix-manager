<template>
  <div class="global-rule-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>全局规则</span>
        </div>
      </template>

      <div class="table-wrapper">
        <el-table :data="globalRuleList" v-loading="loading" style="width: 100%">
          <el-table-column prop="id" label="规则 ID" width="200" />
          <el-table-column prop="plugins" label="插件" min-width="250">
            <template #default="{ row }">
              <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                <template v-if="row.plugins" v-for="(plugin, key) in row.plugins" :key="key">
                  <el-tag
                    v-if="isPluginEnabled(plugin)"
                    size="small"
                  >
                    {{ getPluginName(key) }}
                  </el-tag>
                </template>
                <span v-if="!row.plugins || !Object.keys(row.plugins || {}).some(key => isPluginEnabled(row.plugins[key]))" style="color: #909399">-</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="create_time" label="创建时间" width="180">
            <template #default="{ row }">
              <span>{{ formatTimestamp(row.create_time) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="update_time" label="更新时间" width="180">
            <template #default="{ row }">
              <span>{{ formatTimestamp(row.update_time) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="220" fixed="right" class-name="action-column">
            <template #default="{ row }">
              <div class="action-buttons">
                <el-dropdown @command="(command) => handlePluginCommand(row, command)" trigger="click">
                  <el-button size="small">
                    插件<el-icon class="el-icon--right"><arrow-down /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item 
                        v-for="pluginKey in availablePlugins" 
                        :key="pluginKey" 
                        :command="pluginKey"
                      >
                        {{ PLUGIN_NAMES[pluginKey] }}
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
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
      :initial-config="{ plugins: currentGlobalRulePlugins || {} }"
      @saved="handlePluginSaved"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowDown } from '@element-plus/icons-vue'
import { globalRuleApi } from '@/utils/api'
import { formatTimestamp } from '@/utils/format'
import { isPluginEnabled, getPluginName, PLUGIN_NAMES, RESOURCE_TYPES, getPluginsByResourceType } from '@/utils/plugin'
import { generateId } from '@/utils/id'
import PluginDialog from '@/components/PluginDialog.vue'

const loading = ref(false)
const globalRuleList = ref([])
const pluginDialogVisible = ref(false)
const currentGlobalRuleId = ref('')
const currentPluginType = ref('')
const currentGlobalRulePlugins = ref({})

// 获取可用于 global_rule 的插件列表
const availablePlugins = computed(() => {
  return getPluginsByResourceType(RESOURCE_TYPES.GLOBAL_RULE)
})


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

// 处理插件下拉菜单命令
const handlePluginCommand = (row, command) => {
  handleConfigPlugin(row, command)
}

// 配置单个插件
const handleConfigPlugin = async (row, pluginType) => {
  // 先关闭对话框（如果已打开），确保状态重置
  if (pluginDialogVisible.value) {
    pluginDialogVisible.value = false
    await nextTick()
  }
  
  // 设置所有必要的值
  currentGlobalRuleId.value = row.id
  currentPluginType.value = pluginType
  currentGlobalRulePlugins.value = row.plugins || {}
  
  // 等待一个 tick 确保响应式更新完成
  await nextTick()
  
  // 打开对话框
  pluginDialogVisible.value = true
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
