<template>
  <div class="ssl-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>SSL 证书管理</span>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            添加证书
          </el-button>
        </div>
      </template>

      <el-table :data="sslList" v-loading="loading" style="width: 100%">
        <el-table-column prop="id" label="ID" width="150" />
        <el-table-column prop="snis" label="域名" min-width="250">
          <template #default="{ row }">
            <div style="display: flex; flex-wrap: wrap; gap: 4px;">
              <el-tag v-for="sni in (row.snis || [])" :key="sni" size="small">{{ sni }}</el-tag>
              <span v-if="!row.snis || row.snis.length === 0" style="color: #909399">-</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="证书类型" width="120">
          <template #default="{ row }">
            <el-tag size="small" type="primary">
              {{ row.type === 'server' ? '服务端' : row.type || '服务端' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
              {{ row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="ssl_protocols" label="SSL 协议" width="200">
          <template #default="{ row }">
            <div style="display: flex; flex-wrap: wrap; gap: 4px;">
              <el-tag
                v-for="protocol in (row.ssl_protocols || [])"
                :key="protocol"
                size="small"
                type="info"
              >
                {{ protocol }}
              </el-tag>
              <span v-if="!row.ssl_protocols || row.ssl_protocols.length === 0" style="color: #909399">-</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="desc" label="描述" min-width="150" show-overflow-tooltip />
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
      width="800px"
      @close="resetForm"
    >
      <el-form :model="form" label-width="120px" ref="formRef" :rules="rules">
        <el-form-item label="证书 ID" prop="id">
          <el-input v-model="form.id" placeholder="自动生成或手动输入" />
        </el-form-item>

        <el-form-item label="证书状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio :label="1">启用</el-radio>
            <el-radio :label="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="SSL 协议" prop="ssl_protocols">
          <el-checkbox-group v-model="form.ssl_protocols">
            <el-checkbox label="TLSv1.1">TLSv1.1</el-checkbox>
            <el-checkbox label="TLSv1.2">TLSv1.2</el-checkbox>
            <el-checkbox label="TLSv1.3">TLSv1.3</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        
        <el-form-item label="域名 (SNI)" prop="snis">
          <el-select
            v-model="form.snis"
            multiple
            filterable
            allow-create
            default-first-option
            :reserve-keyword="false"
            placeholder="输入域名并按回车添加，如: example.com, *.example.com"
            style="width: 100%"
          >
            <el-option
              v-for="sni in form.snis"
              :key="sni"
              :label="sni"
              :value="sni"
            />
          </el-select>
          <div class="form-tip">支持多个域名，输入后按回车添加，支持通配符（如 *.example.com）</div>
        </el-form-item>
        <el-form-item label="描述" prop="desc">
          <el-input
            v-model="form.desc"
            type="textarea"
            :rows="3"
            placeholder="请输入描述信息（可选）"
          />
        </el-form-item>
        <el-form-item label="证书内容" prop="cert">
          <el-input
            v-model="form.cert"
            type="textarea"
            :rows="8"
            placeholder="请输入证书内容（PEM 格式）"
          />
        </el-form-item>
        <el-form-item label="私钥内容" prop="key">
          <el-input
            v-model="form.key"
            type="textarea"
            :rows="8"
            placeholder="请输入私钥内容（PEM 格式）"
          />
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
import { Plus } from '@element-plus/icons-vue'
import { sslApi } from '../utils/api'
import { formatTimestamp } from '../utils/format'

const loading = ref(false)
const sslList = ref([])
const dialogVisible = ref(false)
const dialogTitle = ref('添加证书')
const formRef = ref(null)
const sniInput = ref('')

// 分页配置
const pagination = ref({
  page: 1,
  pageSize: 10,
  total: 0
})

const form = ref({
  id: '',
  snis: [],
  desc: '',
  cert: '',
  key: '',
  ssl_protocols: ['TLSv1.2', 'TLSv1.3'],
  status: 1,
  type: 'server'
})

const rules = {
  snis: [{ required: true, message: '请输入域名', trigger: 'change' }],
  cert: [{ required: true, message: '请输入证书内容', trigger: 'blur' }],
  key: [{ required: true, message: '请输入私钥内容', trigger: 'blur' }]
}


const loadData = async () => {
  loading.value = true
  try {
    const response = await sslApi.list({
      page: pagination.value.page,
      page_size: pagination.value.pageSize
    })
    const data = response.data
    if (data.list) {
      sslList.value = data.list.map(item => ({
        ...item.value,
        id: item.value.id || item.key,
        create_time: item.value.create_time || item.create_time,
        update_time: item.value.update_time || item.update_time
      }))
      pagination.value.total = data.total || 0
    } else {
      sslList.value = []
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
  dialogTitle.value = '添加证书'
  form.value = {
    id: Date.now().toString(),
    snis: [],
    desc: '',
    cert: '',
    key: '',
    ssl_protocols: ['TLSv1.2', 'TLSv1.3'],
    status: 1,
    type: 'server'
  }
  dialogVisible.value = true
}

const handleEdit = (row) => {
  dialogTitle.value = '编辑证书'
  form.value = {
    id: row.id,
    snis: row.snis || [],
    desc: row.desc || '',
    cert: row.cert || '',
    key: row.key || '',
    ssl_protocols: row.ssl_protocols || ['TLSv1.2', 'TLSv1.3'],
    status: row.status !== undefined ? row.status : 1,
    type: 'server'
  }
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    
    if (form.value.snis.length === 0) {
      ElMessage.warning('请输入至少一个域名')
      return
    }

    try {
      const sslData = {
        id: form.value.id,
        snis: form.value.snis,
        cert: form.value.cert,
        key: form.value.key,
        type: 'server', // 写死为 server
        status: form.value.status !== undefined ? form.value.status : 1
      }
      
      // 添加描述
      if (form.value.desc && form.value.desc.trim()) {
        sslData.desc = form.value.desc.trim()
      }
      
      // 添加 SSL 协议配置
      if (form.value.ssl_protocols && form.value.ssl_protocols.length > 0) {
        sslData.ssl_protocols = form.value.ssl_protocols
      }
      
      if (dialogTitle.value === '添加证书') {
        await sslApi.create(sslData)
        ElMessage.success('添加成功')
      } else {
        await sslApi.update(form.value.id, sslData)
        ElMessage.success('更新成功')
      }
      dialogVisible.value = false
      loadData()
    } catch (error) {
      // 错误消息已由拦截器自动显示
    }
  })
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除这个证书吗？', '提示', {
      type: 'warning'
    })
    await sslApi.delete(row.id)
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
.ssl-page {
  width: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 18px;
  font-weight: 600;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}
</style>
