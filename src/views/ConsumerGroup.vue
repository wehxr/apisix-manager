<template>
  <div class="consumer-group-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>消费者组管理</span>
          <el-button type="primary" @click="handleAdd" class="create-btn">
            <el-icon><Plus /></el-icon>
            <span class="btn-text">创建消费者组</span>
          </el-button>
        </div>
      </template>

      <!-- 搜索过滤 -->
      <div class="filter-wrapper">
        <el-input
          v-model="filterName"
          placeholder="搜索名称"
          clearable
          style="width: 200px;"
          @clear="handleFilter"
          @keyup.enter="handleFilter"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-input
          v-model="filterLabel"
          placeholder="搜索标签"
          clearable
          style="width: 200px; margin-left: 12px;"
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
        <el-button @click="handleResetFilter" v-if="filterName || filterLabel">
          重置
        </el-button>
      </div>

      <div class="table-wrapper">
        <el-table :data="groupList" v-loading="loading" style="width: 100%">
        <el-table-column prop="name" label="名称" width="200">
          <template #default="{ row }">
            <span>{{ row.name || '-' }}</span>
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
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
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

    <!-- 消费者组添加/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      :width="dialogWidth"
      @close="resetForm"
    >
      <el-form :model="form" label-width="120px" ref="formRef" :rules="rules">
        <el-form-item label="名称" prop="name">
          <el-input
            v-model="form.name"
            placeholder="请输入消费者组名称（可选）"
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
        <el-form-item label="标签" prop="labels">
          <LabelsInput
            v-model="form.labels"
          />
          <div class="form-tip">可选，用于标记和分类消费者组</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'
import { consumerGroupApi } from '../utils/api'
import { formatTimestamp, getDialogWidth } from '../utils/format'
import { generateId } from '../utils/id'
import LabelsInput from '../components/LabelsInput.vue'

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
const groupList = ref([])
const dialogVisible = ref(false)
const dialogWidth = computed(() => getDialogWidth())
const dialogTitle = ref('创建消费者组')
const formRef = ref(null)
const isEdit = ref(false)

// 过滤条件
const filterName = ref('')
const filterLabel = ref('')

// 分页配置
const pagination = ref({
  page: 1,
  pageSize: 10,
  total: 0
})

const form = ref({
  id: '',
  name: '',
  desc: '',
  labels: {}
})

const rules = {
  // id 自动生成，不需要验证规则
}

// 加载消费者组列表
const loadData = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.value.page,
      page_size: pagination.value.pageSize
    }
    if (filterName.value) {
      params.name = filterName.value
    }
    if (filterLabel.value) {
      params.label = filterLabel.value
    }
    
    const response = await consumerGroupApi.list(params)
    const data = response.data
    if (data.list && data.list.length > 0) {
      groupList.value = data.list.map(item => {
        const value = item.value || {}
        let id = value.id
        if (!id && item.key) {
          const parts = item.key.split('/')
          id = parts[parts.length - 1]
        }
        return {
          ...value,
          id: id || item.key,
          create_time: value.create_time || item.create_time,
          update_time: value.update_time || item.update_time
        }
      })
      pagination.value.total = data.total || 0
    } else {
      groupList.value = []
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
  filterName.value = ''
  filterLabel.value = ''
  pagination.value.page = 1
  loadData()
}

const handleAdd = () => {
  dialogTitle.value = '创建消费者组'
  isEdit.value = false
  form.value = {
    id: generateId('group'),
    name: '',
    desc: '',
    labels: {}
  }
  dialogVisible.value = true
}

const handleEdit = async (row) => {
  dialogTitle.value = '编辑消费者组'
  isEdit.value = true
  try {
    const response = await consumerGroupApi.get(row.id)
    const data = response.data.value
    form.value = {
      id: data.id || row.id,
      name: data.name || '',
      desc: data.desc || '',
      labels: data.labels || row.labels || {}
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
      const groupData = {
        plugins: {}, // 暂时不需要配置插件
        name: form.value.name || undefined,
        desc: form.value.desc || undefined
      }

      // 添加标签
      if (form.value.labels && typeof form.value.labels === 'object' && Object.keys(form.value.labels).length > 0) {
        groupData.labels = form.value.labels
      }

      if (isEdit.value) {
        await consumerGroupApi.update(form.value.id, groupData)
      } else {
        await consumerGroupApi.create(form.value.id, groupData)
      }

      ElMessage.success(isEdit.value ? '更新成功' : '创建成功')
      dialogVisible.value = false
      loadData()
    } catch (error) {
      // 错误消息已由拦截器自动显示
    }
  })
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除这个消费者组吗？', '提示', {
      type: 'warning'
    })
    await consumerGroupApi.delete(row.id)
    ElMessage.success('删除成功')
    loadData()
  } catch (error) {
    // 错误消息已由拦截器自动显示（用户取消操作除外）
  }
}

const resetForm = () => {
  formRef.value?.resetFields()
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.consumer-group-page {
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
