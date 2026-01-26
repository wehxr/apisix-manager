<template>
  <div class="consumer-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>消费者管理</span>
        </div>
      </template>

      <el-tabs v-model="activeTab" @tab-change="handleTabChange" :tab-position="tabPosition" class="consumer-tabs">
        <el-tab-pane label="消费者" name="consumer">
          <div class="action-bar">
            <el-button type="primary" @click="handleAdd" class="create-btn">
              <el-icon><Plus /></el-icon>
              <span class="btn-text">创建消费者</span>
            </el-button>
          </div>
          <div class="table-wrapper">
            <el-table :data="consumerList" v-loading="loading" style="width: 100%">
            <el-table-column prop="username" label="用户名"/>
            <el-table-column prop="group_id" label="消费者组" width="150">
              <template #default="{ row }">
                <el-tag v-if="row.group_id" type="info" size="small">{{ getGroupName(row.group_id) }}</el-tag>
                <span v-else style="color: #909399">-</span>
              </template>
            </el-table-column>
            <el-table-column prop="plugins" label="插件">
              <template #default="{ row }">
                <el-tag v-if="row.hasBasicAuth" size="small">Basic Auth</el-tag>
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
        </el-tab-pane>

        <el-tab-pane label="消费者组" name="group">
          <div class="action-bar">
            <el-button type="primary" @click="handleAdd" class="create-btn">
              <el-icon><Plus /></el-icon>
              <span class="btn-text">创建消费者组</span>
            </el-button>
          </div>
          <div class="table-wrapper">
            <el-table :data="groupList" v-loading="groupLoading" style="width: 100%">
            <el-table-column prop="name" label="名称" width="200">
              <template #default="{ row }">
                <span>{{ row.name || '-' }}</span>
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
                <el-button size="small" @click="handleGroupEdit(row)">编辑</el-button>
                <el-button size="small" type="danger" @click="handleGroupDelete(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          </div>

          <!-- 分页 -->
          <div class="pagination-wrapper">
            <el-pagination
              v-model:current-page="groupPagination.page"
              v-model:page-size="groupPagination.pageSize"
              :page-sizes="[10, 20, 50, 100]"
              :total="groupPagination.total"
              :layout="groupPaginationLayout"
              @size-change="handleGroupSizeChange"
              @current-change="handleGroupPageChange"
            />
          </div>
        </el-tab-pane>
      </el-tabs>
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
        <el-divider>Basic Auth 配置</el-divider>
        <el-form-item label="启用 Basic Auth">
          <el-switch v-model="enableBasicAuth" />
        </el-form-item>
        <template v-if="enableBasicAuth">
          <el-form-item label="认证用户名" prop="authUsername">
            <el-input
              v-model="form.authUsername"
              placeholder="Basic Auth 认证用户名（可与消费者用户名不同）"
            />
            <div class="form-tip">留空则使用消费者用户名</div>
          </el-form-item>
          <el-form-item label="密码" prop="password">
            <el-input
              v-model="form.password"
              type="password"
              show-password
              placeholder="请输入密码"
            />
          </el-form-item>
        </template>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 消费者组添加/编辑对话框 -->
    <el-dialog
      v-model="groupDialogVisible"
      :title="groupDialogTitle"
      :width="dialogWidth"
      @close="resetGroupForm"
    >
      <el-form :model="groupForm" label-width="120px" ref="groupFormRef" :rules="groupRules">
        <el-form-item label="名称" prop="name">
          <el-input
            v-model="groupForm.name"
            placeholder="请输入消费者组名称（可选）"
          />
        </el-form-item>
        <el-form-item label="描述" prop="desc">
          <el-input
            v-model="groupForm.desc"
            type="textarea"
            :rows="3"
            placeholder="请输入描述信息（可选）"
          />
        </el-form-item>
        <el-form-item label="标签" prop="labels">
          <LabelsInput
            v-model="groupForm.labels"
          />
          <div class="form-tip">可选，用于标记和分类消费者组</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="groupDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleGroupSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { consumerApi, consumerGroupApi, getConfig, getErrorMessage } from '../utils/api'
import { formatTimestamp, getDialogWidth } from '../utils/format'
import { generateId } from '../utils/id'
import axios from 'axios'
import LabelsInput from '../components/LabelsInput.vue'

// 响应式标签页位置
const tabPosition = computed(() => {
  if (typeof window === 'undefined') {
    return 'left'
  }
  return window.innerWidth < 768 ? 'top' : 'left'
})

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

const groupPaginationLayout = computed(() => {
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

const activeTab = ref('consumer')
const loading = ref(false)
const groupLoading = ref(false)
const consumerList = ref([])
const groupList = ref([])
const dialogVisible = ref(false)
const dialogWidth = computed(() => getDialogWidth())
const groupDialogVisible = ref(false)
const dialogTitle = ref('创建消费者')
const groupDialogTitle = ref('创建消费者组')
const formRef = ref(null)
const groupFormRef = ref(null)
const enableBasicAuth = ref(false)
const isEdit = ref(false)
const isGroupEdit = ref(false)
const consumerGroupList = ref([])
const loadingGroups = ref(false)

// 分页配置
const pagination = ref({
  page: 1,
  pageSize: 10,
  total: 0
})

const groupPagination = ref({
  page: 1,
  pageSize: 10,
  total: 0
})

const form = ref({
  username: '',
  desc: '',
  group_id: '',
  authUsername: '',
  password: '',
  labels: {}
})

const groupForm = ref({
  id: '',
  name: '',
  desc: '',
  labels: {}
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [
    {
      validator: (rule, value, callback) => {
        if (enableBasicAuth.value && !value) {
          callback(new Error('启用 Basic Auth 时必须输入密码'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

const groupRules = {
  // id 自动生成，不需要验证规则
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
    const config = getConfig()
    const response = await consumerApi.list({
      page: pagination.value.page,
      page_size: pagination.value.pageSize
    })
    const data = response.data
    if (data.list) {
      const consumers = data.list.map(item => ({
        ...item.value,
        username: item.value.username || item.key,
        create_time: item.value.create_time || item.create_time,
        update_time: item.value.update_time || item.update_time
      }))
      
      const consumersWithAuth = await Promise.all(
        consumers.map(async (consumer) => {
          try {
            const credResponse = await axios.get(
              `${config.baseURL}/apisix/admin/consumers/${consumer.username}/credentials`,
              {
                headers: {
                  'X-API-KEY': config.adminKey
                }
              }
            )
            
            const hasBasicAuth = credResponse.data?.list?.some(
              item => item.value?.plugins?.['basic-auth']
            ) || false
            
            return {
              ...consumer,
              hasBasicAuth
            }
          } catch (error) {
            return {
              ...consumer,
              hasBasicAuth: false
            }
          }
        })
      )
      
      consumerList.value = consumersWithAuth
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

// 加载消费者组列表
const loadGroupData = async () => {
  groupLoading.value = true
  try {
    const response = await consumerGroupApi.list({
      page: groupPagination.value.page,
      page_size: groupPagination.value.pageSize
    })
    const data = response.data
    if (data.list) {
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
      groupPagination.value.total = data.total || 0
    } else {
      groupList.value = []
      groupPagination.value.total = 0
    }
  } catch (error) {
    // 错误消息已由拦截器自动显示
  } finally {
    groupLoading.value = false
  }
}

const handleTabChange = (tabName) => {
  if (tabName === 'group') {
    loadGroupData()
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

const handleGroupSizeChange = (size) => {
  groupPagination.value.pageSize = size
  groupPagination.value.page = 1
  loadGroupData()
}

const handleGroupPageChange = (page) => {
  groupPagination.value.page = page
  loadGroupData()
}

const handleAdd = () => {
  if (activeTab.value === 'consumer') {
    dialogTitle.value = '创建消费者'
    isEdit.value = false
    form.value = {
      username: '',
      desc: '',
      group_id: '',
      authUsername: '',
      password: '',
      labels: {}
    }
    enableBasicAuth.value = false
    dialogVisible.value = true
  } else {
    groupDialogTitle.value = '创建消费者组'
    isGroupEdit.value = false
    groupForm.value = {
      id: generateId('group'),
      name: '',
      desc: '',
      labels: {}
    }
    groupDialogVisible.value = true
  }
}

const handleEdit = async (row) => {
  dialogTitle.value = '编辑消费者'
  isEdit.value = true
  try {
    const config = getConfig()
    const response = await consumerApi.get(row.username)
    const data = response.data.value
    form.value = {
      username: data.username || row.username,
      desc: data.desc || '',
      group_id: data.group_id || '',
      authUsername: '',
      password: '',
      labels: data.labels || row.labels || {}
    }
    
    try {
      const credResponse = await axios.get(
        `${config.baseURL}/apisix/admin/consumers/${form.value.username}/credentials`,
        {
          headers: {
            'X-API-KEY': config.adminKey
          }
        }
      )
      
      if (credResponse.data?.list && credResponse.data.list.length > 0) {
        const basicAuthCred = credResponse.data.list.find(
          item => item.value?.plugins?.['basic-auth']
        )
        
        if (basicAuthCred) {
          enableBasicAuth.value = true
          const basicAuth = basicAuthCred.value.plugins['basic-auth']
          form.value.authUsername = basicAuth.username || ''
          form.value.password = ''
        } else {
          enableBasicAuth.value = false
        }
      } else {
        enableBasicAuth.value = false
      }
    } catch (error) {
      enableBasicAuth.value = false
    }
    
    dialogVisible.value = true
  } catch (error) {
    // 错误消息已由拦截器自动显示
  }
}

const handleGroupEdit = async (row) => {
  groupDialogTitle.value = '编辑消费者组'
  isGroupEdit.value = true
  try {
    const response = await consumerGroupApi.get(row.id)
    const data = response.data.value
    groupForm.value = {
      id: data.id || row.id,
      name: data.name || '',
      desc: data.desc || '',
      labels: data.labels || row.labels || {}
    }
    groupDialogVisible.value = true
  } catch (error) {
    // 错误消息已由拦截器自动显示
  }
}

const handleSubmit = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (!valid) return

    try {
      const config = getConfig()
      
      const consumerData = {
        username: form.value.username,
        desc: form.value.desc || undefined,
        group_id: form.value.group_id || undefined
      }

      // 添加标签
      if (form.value.labels && typeof form.value.labels === 'object' && Object.keys(form.value.labels).length > 0) {
        consumerData.labels = form.value.labels
      }

      if (isEdit.value) {
        await consumerApi.update(form.value.username, consumerData)
      } else {
        await consumerApi.create(form.value.username, consumerData)
      }

      if (enableBasicAuth.value) {
        if (!form.value.password) {
          ElMessage.warning('启用 Basic Auth 时必须输入密码')
          return
        }

        const credentialData = {
          id: `cred-${form.value.username}-basic-auth`,
          plugins: {
            'basic-auth': {
              username: form.value.authUsername || form.value.username,
              password: form.value.password
            }
          }
        }

        try {
          await axios.put(
            `${config.baseURL}/apisix/admin/consumers/${form.value.username}/credentials`,
            credentialData,
            {
              headers: {
                'X-API-KEY': config.adminKey
              }
            }
          )
        } catch (error) {
          ElMessage.error(getErrorMessage(error, '配置 Basic Auth 凭证失败'))
          throw error
        }
      } else if (isEdit.value) {
        try {
          const credResponse = await axios.get(
            `${config.baseURL}/apisix/admin/consumers/${form.value.username}/credentials`,
            {
              headers: {
                'X-API-KEY': config.adminKey
              }
            }
          )
          
          if (credResponse.data?.list && credResponse.data.list.length > 0) {
            for (const item of credResponse.data.list) {
              const credId = item.value?.id || item.key
              if (item.value?.plugins?.['basic-auth'] || credId.includes('basic-auth')) {
                try {
                  await axios.delete(
                    `${config.baseURL}/apisix/admin/consumers/${form.value.username}/credentials/${credId}`,
                    {
                      headers: {
                        'X-API-KEY': config.adminKey
                      }
                    }
                  )
                } catch (delError) {
                  console.warn('删除凭证失败:', delError)
                }
              }
            }
          }
        } catch (error) {
          console.warn('获取或删除 Basic Auth 凭证失败:', error)
        }
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

const handleGroupSubmit = async () => {
  if (!groupFormRef.value) return
  
  await groupFormRef.value.validate(async (valid) => {
    if (!valid) return

    try {
      const groupData = {
        plugins: {}, // 暂时不需要配置插件
        name: groupForm.value.name || undefined,
        desc: groupForm.value.desc || undefined
      }

      // 添加标签
      if (groupForm.value.labels && typeof groupForm.value.labels === 'object' && Object.keys(groupForm.value.labels).length > 0) {
        groupData.labels = groupForm.value.labels
      }

      if (isGroupEdit.value) {
        await consumerGroupApi.update(groupForm.value.id, groupData)
      } else {
        await consumerGroupApi.create(groupForm.value.id, groupData)
      }

      ElMessage.success(isGroupEdit.value ? '更新成功' : '创建成功')
      groupDialogVisible.value = false
      loadGroupData()
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

const handleGroupDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除这个消费者组吗？', '提示', {
      type: 'warning'
    })
    await consumerGroupApi.delete(row.id)
    ElMessage.success('删除成功')
    loadGroupData()
    loadConsumerGroups() // 刷新消费者组列表
  } catch (error) {
    // 错误消息已由拦截器自动显示（用户取消操作除外）
  }
}

const resetForm = () => {
  formRef.value?.resetFields()
  enableBasicAuth.value = false
  form.value.authUsername = ''
}

const resetGroupForm = () => {
  groupFormRef.value?.resetFields()
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

.consumer-tabs {
  min-height: 400px;
}

.action-bar {
  margin-bottom: 16px;
  display: flex;
  justify-content: flex-end;
}

.create-btn .btn-text {
  margin-left: 4px;
}

.table-wrapper {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
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

  .table-wrapper {
    margin: 0 -12px;
    padding: 0 12px;
  }

  .pagination-wrapper {
    justify-content: center;
  }

  :deep(.consumer-tabs .el-tabs__header) {
    margin-bottom: 16px;
  }

  :deep(.consumer-tabs .el-tabs__item) {
    padding: 0 12px;
    font-size: 14px;
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

  :deep(.consumer-tabs .el-tabs__item) {
    padding: 0 8px;
    font-size: 12px;
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
