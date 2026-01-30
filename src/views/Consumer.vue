<template>
  <div class="consumer-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>消费者管理</span>
          <el-button type="primary" @click="handleAdd" class="create-btn">
            <el-icon><Plus /></el-icon>
            <span class="btn-text">创建消费者</span>
          </el-button>
        </div>
      </template>

      <!-- 搜索过滤 -->
      <div class="filter-wrapper">
        <el-input
          v-model="filterLabel"
          placeholder="搜索标签"
          clearable
          style="width: 200px;"
          @clear="handleFilter"
          @keyup.enter="handleFilter"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-button type="primary" @click="handleFilter" style="margin-left: 12px;">
          搜索
        </el-button>
        <el-button @click="handleResetFilter" v-if="filterLabel">
          重置
        </el-button>
      </div>

      <div class="table-wrapper">
        <el-table :data="consumerList" v-loading="loading" style="width: 100%">
        <el-table-column prop="username" label="用户名" min-width="150" />
        <el-table-column prop="group_id" label="消费者组" width="150">
          <template #default="{ row }">
            <el-tag v-if="row.group_id" size="small">{{ getGroupName(row.group_id) }}</el-tag>
            <span v-else style="color: #909399">-</span>
          </template>
        </el-table-column>
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
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="labels" label="标签" min-width="200">
          <template #default="{ row }">
            <div v-if="row.labels && Object.keys(row.labels).length > 0" style="display: flex; flex-wrap: wrap; gap: 4px;">
              <el-tag
                v-for="(value, key) in row.labels"
                :key="key"
                size="small"
                type="info"
              >
                {{ key }}:{{ value }}
              </el-tag>
            </div>
            <span v-else style="color: #909399">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="desc" label="描述" min-width="200" show-overflow-tooltip />
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
        <el-table-column label="操作" width="280" fixed="right" class-name="action-column">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button size="small" @click="handleEdit(row)">编辑</el-button>
              <GroupedDropdown
                :grouped="pluginGrouped"
                @command="(command) => handlePluginCommand(row, command)"
              >
                <el-button size="small">
                  插件<el-icon class="el-icon--right"><arrow-down /></el-icon>
                </el-button>
              </GroupedDropdown>
              <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
      </div>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          :layout="paginationLayout"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- 消费者添加/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      :width="dialogWidth"
      @close="resetForm"
    >
      <el-form :model="form" label-width="120px" ref="formRef" :rules="rules">
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="form.username"
            :disabled="isEdit"
            placeholder="请输入用户名"
          />
        </el-form-item>
        <el-form-item label="描述" prop="desc">
          <el-input
            v-model="form.desc"
            type="textarea"
            :rows="3"
            placeholder="请输入描述信息（可选）"
          />
        </el-form-item>
        <el-form-item label="Consumer Group" prop="group_id">
          <el-select
            v-model="form.group_id"
            placeholder="请选择 Consumer Group（可选）"
            clearable
            filterable
            style="width: 100%"
            :loading="loadingGroups"
          >
            <el-option
              v-for="group in consumerGroupList"
              :key="group.id"
              :label="group.name || group.id"
              :value="group.id"
            >
              <span>{{ group.name || group.id }}</span>
              <span v-if="group.desc" style="color: #8492a6; font-size: 12px; margin-left: 10px">
                - {{ group.desc }}
              </span>
            </el-option>
          </el-select>
          <div class="form-tip">Consumer Group 用于配置一组可以在 Consumer 间复用的插件</div>
        </el-form-item>
        <el-form-item label="标签" prop="labels">
          <LabelsInput
            v-model="form.labels"
          />
          <div class="form-tip">可选，用于标记和分类消费者</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 插件配置对话框 -->
    <PluginDialog
      v-model="pluginDialogVisible"
      resource-type="consumer"
      :resource-id="currentConsumerId"
      :plugin-type="currentPluginType"
      @saved="handlePluginSaved"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, ArrowDown, Search } from '@element-plus/icons-vue'
import { consumerApi, consumerGroupApi } from '../utils/api'
import { formatTimestamp, getDialogWidth } from '../utils/format'
import { isPluginEnabled, getPluginName, getPluginsGroupedByResourceType } from '../utils/plugin'
import LabelsInput from '../components/LabelsInput.vue'
import PluginDialog from '../components/PluginDialog.vue'
import GroupedDropdown from '../components/GroupedDropdown.vue'

// 响应式分页布局
const paginationLayout = computed(() => {
  if (typeof window === 'undefined') {
    return 'total, sizes, prev, pager, next, jumper'
  }
  const screenWidth = window.innerWidth
  if (screenWidth < 768) {
    return 'prev, pager, next'
  } else if (screenWidth < 1024) {
    return 'total, prev, pager, next'
  } else {
    return 'total, sizes, prev, pager, next, jumper'
  }
})

const loading = ref(false)
const consumerList = ref([])
const dialogVisible = ref(false)
const dialogWidth = computed(() => getDialogWidth())
const dialogTitle = ref('创建消费者')
const formRef = ref(null)
const isEdit = ref(false)
const consumerGroupList = ref([])
const loadingGroups = ref(false)
const pluginDialogVisible = ref(false)
const currentConsumerId = ref('')
const currentPluginType = ref('')

const pluginGrouped = computed(() => getPluginsGroupedByResourceType('consumer'))

// 过滤条件
const filterLabel = ref('')

// 分页配置
const pagination = ref({
  page: 1,
  pageSize: 10,
  total: 0
})

const form = ref({
  username: '',
  desc: '',
  group_id: '',
  labels: {},
  plugins: {}
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }]
}

// 加载 Consumer Group 列表（用于消费者表单中的选择器）
const loadConsumerGroups = async () => {
  loadingGroups.value = true
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
        return {
          ...value,
          id: id || item.key
        }
      })
    } else {
      consumerGroupList.value = []
    }
  } catch (error) {
    consumerGroupList.value = []
  } finally {
    loadingGroups.value = false
  }
}

// 根据 group_id 获取消费者组名字
const getGroupName = (groupId) => {
  if (!groupId) return ''
  const group = consumerGroupList.value.find(g => g.id === groupId)
  return group?.name || groupId
}

// 加载消费者列表
const loadData = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.value.page,
      page_size: pagination.value.pageSize
    }
    if (filterLabel.value) {
      params.label = filterLabel.value
    }
    
    const response = await consumerApi.list(params)
    const data = response.data
    if (data.list && data.list.length > 0) {
      consumerList.value = data.list.map(item => {
        const consumer = {
          ...item.value,
          username: item.value.username || item.key,
          create_time: item.value.create_time || item.create_time,
          update_time: item.value.update_time || item.update_time,
          plugins: item.value.plugins || {}
        }
        return consumer
      })
      pagination.value.total = data.total || 0
    } else {
      consumerList.value = []
      pagination.value.total = 0
    }
  } catch (error) {
    // 错误消息已由拦截器自动显示
  } finally {
    loading.value = false
  }
}


const handleSizeChange = (size) => {
  pagination.value.pageSize = size
  pagination.value.page = 1
  loadData()
}

const handlePageChange = (page) => {
  pagination.value.page = page
  loadData()
}

// 处理过滤
const handleFilter = () => {
  pagination.value.page = 1
  loadData()
}

// 重置过滤
const handleResetFilter = () => {
  filterLabel.value = ''
  pagination.value.page = 1
  loadData()
}

const handleAdd = () => {
  dialogTitle.value = '创建消费者'
  isEdit.value = false
  form.value = {
    username: '',
    desc: '',
    group_id: '',
    labels: {},
    plugins: {}
  }
  dialogVisible.value = true
}

const handleEdit = async (row) => {
  dialogTitle.value = '编辑消费者'
  isEdit.value = true
  try {
    const response = await consumerApi.get(row.username)
    const data = response.data.value
    form.value = {
      username: data.username || row.username,
      desc: data.desc || '',
      group_id: data.group_id || '',
      labels: data.labels || row.labels || {},
      plugins: data.plugins || row.plugins || {}
    }
    dialogVisible.value = true
  } catch (error) {
    // 错误消息已由拦截器自动显示
  }
}


const handleSubmit = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (!valid) return

    try {
      const consumerData = {
        username: form.value.username,
        desc: form.value.desc || undefined,
        group_id: form.value.group_id || undefined
      }

      // 添加标签
      if (form.value.labels && typeof form.value.labels === 'object' && Object.keys(form.value.labels).length > 0) {
        consumerData.labels = form.value.labels
      }

      // 编辑时保留现有的插件配置
      if (isEdit.value && form.value.plugins && typeof form.value.plugins === 'object' && Object.keys(form.value.plugins).length > 0) {
        consumerData.plugins = form.value.plugins
      }

      if (isEdit.value) {
        await consumerApi.update(form.value.username, consumerData)
      } else {
        await consumerApi.create(form.value.username, consumerData)
      }

      ElMessage.success(isEdit.value ? '更新成功' : '创建成功')
      dialogVisible.value = false
      loadData()
      loadConsumerGroups() // 刷新消费者组列表，以便选择器更新
    } catch (error) {
      // 错误消息已由拦截器自动显示
    }
  })
}


const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除这个消费者吗？', '提示', {
      type: 'warning'
    })
    await consumerApi.delete(row.username)
    ElMessage.success('删除成功')
    loadData()
  } catch (error) {
    // 错误消息已由拦截器自动显示（用户取消操作除外）
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
  
  currentConsumerId.value = row.username
  currentPluginType.value = pluginType
  
  // 等待一个 tick 确保响应式更新完成
  await nextTick()
  
  // 打开对话框
  pluginDialogVisible.value = true
}

// 处理插件保存成功
const handlePluginSaved = () => {
  loadData()
}

const resetForm = () => {
  formRef.value?.resetFields()
}

onMounted(() => {
  loadConsumerGroups()
  loadData()
})
</script>

<style scoped>
.consumer-page {
  width: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 18px;
  font-weight: 600;
  flex-wrap: wrap;
  gap: 12px;
}


.create-btn .btn-text {
  margin-left: 4px;
}

.table-wrapper {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.filter-wrapper {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
  overflow-x: auto;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
  display: block; 
  width: 100%;
}

.action-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .card-header {
    font-size: 16px;
  }

  .create-btn .btn-text {
    display: none;
  }

  .filter-wrapper {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-wrapper .el-input {
    width: 100% !important;
    margin-left: 0 !important;
  }

  .filter-wrapper .el-button {
    width: 100%;
    margin-left: 0 !important;
  }

  .table-wrapper {
    margin: 0 -12px;
    padding: 0 12px;
  }

  .pagination-wrapper {
    justify-content: center;
  }

  :deep(.el-table) {
    font-size: 12px;
  }

  :deep(.el-table th),
  :deep(.el-table td) {
    padding: 8px 4px;
  }

  :deep(.el-button--small) {
    padding: 5px 8px;
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .card-header {
    font-size: 14px;
  }

  :deep(.el-table) {
    font-size: 11px;
  }

  :deep(.el-table th),
  :deep(.el-table td) {
    padding: 6px 2px;
  }

  :deep(.el-button--small) {
    padding: 4px 6px;
    font-size: 11px;
  }
}
</style>
