<template>
  <div class="consumer-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>消费者管理</span>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            创建消费者
          </el-button>
        </div>
      </template>

      <el-table :data="consumerList" v-loading="loading" style="width: 100%">
        <el-table-column prop="username" label="用户名"/>
        <el-table-column prop="plugins" label="插件">
          <template #default="{ row }">
            <el-tag v-if="row.hasBasicAuth" type="success" size="small">Basic Auth</el-tag>
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

      <!-- 分页 -->
      <div style="margin-top: 20px; display: flex; justify-content: flex-end;">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- 添加/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
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
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { consumerApi, getConfig, getErrorMessage } from '../utils/api'
import { formatTimestamp } from '../utils/format'
import axios from 'axios'

const loading = ref(false)
const consumerList = ref([])
const dialogVisible = ref(false)
const dialogTitle = ref('创建消费者')
const formRef = ref(null)
const enableBasicAuth = ref(false)
const isEdit = ref(false)

// 分页配置
const pagination = ref({
  page: 1,
  pageSize: 10,
  total: 0
})

const form = ref({
  username: '',
  desc: '',
  authUsername: '',
  password: ''
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
      // 先映射基本数据
      const consumers = data.list.map(item => ({
        ...item.value,
        username: item.value.username || item.key,
        create_time: item.value.create_time || item.create_time,
        update_time: item.value.update_time || item.update_time
      }))
      
      // 为每个消费者检查 Basic Auth 凭证
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
            
            // 检查是否有 basic-auth 凭证
            const hasBasicAuth = credResponse.data?.list?.some(
              item => item.value?.plugins?.['basic-auth']
            ) || false
            
            return {
              ...consumer,
              hasBasicAuth
            }
          } catch (error) {
            // 如果获取凭证失败（可能是没有凭证），返回 false
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

const handleSizeChange = (size) => {
  pagination.value.pageSize = size
  pagination.value.page = 1
  loadData()
}

const handlePageChange = (page) => {
  pagination.value.page = page
  loadData()
}

const handleAdd = () => {
  dialogTitle.value = '创建消费者'
  isEdit.value = false
  form.value = {
    username: '',
    desc: '',
    authUsername: '',
    password: ''
  }
  enableBasicAuth.value = false
  dialogVisible.value = true
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
      authUsername: '',
      password: ''
    }
    
    // 检查是否有 Basic Auth 凭证（通过 Credential API）
    try {
      const credResponse = await axios.get(
        `${config.baseURL}/apisix/admin/consumers/${form.value.username}/credentials`,
        {
          headers: {
            'X-API-KEY': config.adminKey
          }
        }
      )
      
      // 查找 basic-auth 凭证
      if (credResponse.data?.list && credResponse.data.list.length > 0) {
        const basicAuthCred = credResponse.data.list.find(
          item => item.value?.plugins?.['basic-auth']
        )
        
        if (basicAuthCred) {
          enableBasicAuth.value = true
          const basicAuth = basicAuthCred.value.plugins['basic-auth']
          form.value.authUsername = basicAuth.username || ''
          // 密码不能回显，留空
          form.value.password = ''
        } else {
          enableBasicAuth.value = false
        }
      } else {
        enableBasicAuth.value = false
      }
    } catch (error) {
      // 如果没有凭证或获取失败，说明未启用
      enableBasicAuth.value = false
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
      const config = getConfig()
      
      // 构建消费者数据（不包含 Basic Auth 配置）
      const consumerData = {
        username: form.value.username,
        desc: form.value.desc || undefined
      }

      // 创建或更新消费者
      if (isEdit.value) {
        await consumerApi.update(form.value.username, consumerData)
      } else {
        await consumerApi.create(form.value.username, consumerData)
      }

      // 如果启用了 Basic Auth，通过 Credential API 配置
      if (enableBasicAuth.value) {
        if (!form.value.password) {
          ElMessage.warning('启用 Basic Auth 时必须输入密码')
          return
        }

        // 使用 Credential API 配置 Basic Auth
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
          // 直接使用 axios 的请求需要手动显示错误
          ElMessage.error(getErrorMessage(error, '配置 Basic Auth 凭证失败'))
          throw error
        }
      } else if (isEdit.value) {
        // 如果编辑时取消了 Basic Auth，尝试删除凭证
        try {
          // 先获取现有的凭证列表
          const credResponse = await axios.get(
            `${config.baseURL}/apisix/admin/consumers/${form.value.username}/credentials`,
            {
              headers: {
                'X-API-KEY': config.adminKey
              }
            }
          )
          
          // 删除所有 basic-auth 凭证
          if (credResponse.data?.list && credResponse.data.list.length > 0) {
            for (const item of credResponse.data.list) {
              const credId = item.value?.id || item.key
              // 检查是否是 basic-auth 凭证
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
          // 如果凭证不存在或获取失败，忽略错误
          console.warn('获取或删除 Basic Auth 凭证失败:', error)
        }
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

const resetForm = () => {
  formRef.value?.resetFields()
  enableBasicAuth.value = false
  form.value.authUsername = ''
}

onMounted(() => {
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
}
</style>
