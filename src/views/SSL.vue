<template>
  <div class="ssl-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>SSL 证书管理</span>
          <el-button type="primary" @click="handleAdd" class="create-btn">
            <el-icon><Plus /></el-icon>
            <span class="btn-text">添加证书</span>
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
        <el-table :data="sslList" v-loading="loading" style="width: 100%">
        <el-table-column prop="id" label="ID" width="150" />
        <el-table-column prop="snis" label="域名" min-width="250">
          <template #default="{ row }">
            <span v-if="!row.snis || row.snis.length === 0" style="color: #909399">-</span>
            <div v-else style="display: flex; flex-direction: column; gap: 4px;">
              <el-tag style="width: fit-content;" v-for="sni in (row.snis || [])" :key="sni" size="small">{{ sni }}</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="证书类型" width="120">
          <template #default="{ row }">
            <el-tag size="small" :type="row.type === 'client' ? 'warning' : 'primary'">
              {{ row.type === 'client' ? '客户端' : '服务端' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'primary' : 'info'" size="small">
              {{ row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="ssl_protocols" label="SSL 协议" width="200">
          <template #default="{ row }">
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <el-tag
                v-for="protocol in (row.ssl_protocols || [])"
                :key="protocol"
                size="small"
                style="width: fit-content;"
              >
                {{ protocol }}
              </el-tag>
              <span v-if="!row.ssl_protocols || row.ssl_protocols.length === 0" style="color: #909399">-</span>
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

    <!-- 添加/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      :width="dialogWidth"
      @close="resetForm"
    >
      <el-form
        :model="form"
        label-width="120px"
        ref="formRef"
        :rules="rules"
      >
        <el-form-item label="证书 ID" prop="id">
          <el-input
            v-model="form.id"
            placeholder="请输入证书 ID"
            :disabled="isEdit"
          />
          <div v-if="isEdit" class="form-tip">编辑时不可修改证书 ID</div>
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

        <el-form-item label="证书类型" prop="type">
          <el-radio-group v-model="form.type">
            <el-radio label="server">服务端</el-radio>
            <el-radio label="client">客户端</el-radio>
          </el-radio-group>
          <div class="form-tip">服务端证书用于验证客户端请求，客户端证书用于访问上游服务</div>
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
        <el-form-item label="标签" prop="labels">
          <LabelsInput
            v-model="form.labels"
          />
          <div class="form-tip">可选，用于标记和分类证书</div>
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

        <!-- 多个证书支持 -->
        <el-divider>
          <span class="section-title">多证书配置（可选）</span>
        </el-divider>
        <el-alert
            type="info"
            :closable="false"
            style="margin-bottom: 16px;"
          >
            <template #title>
              <span style="font-size: 13px; font-weight: 500;">多证书配置说明</span>
            </template>
            <template #default>
              <div style="font-size: 12px; line-height: 1.6; margin-top: 4px;">
                当需要为同一个域名配置多个证书时，除了第一个证书通过上面的"证书内容"传递外，剩下的证书可以通过这里添加
              </div>
            </template>
          </el-alert>

        <el-form-item label="额外证书" prop="certs">
          <div class="cert-list">
            <div v-for="(cert, index) in form.certs" :key="index" class="cert-item">
              <div class="cert-item-header">
                <el-tag size="small" type="primary">证书组 {{ index + 1 }}</el-tag>
                <el-button
                  type="danger"
                  size="small"
                  text
                  @click="removeCert(index)"
                  class="remove-btn"
                >
                  <el-icon><Delete /></el-icon>
                  删除
                </el-button>
              </div>
              <div class="cert-item-content">
                <div class="cert-field">
                  <div class="cert-field-label">
                    <el-icon><Document /></el-icon>
                    <span>证书内容</span>
                  </div>
                  <el-input
                    v-model="form.certs[index]"
                    type="textarea"
                    :rows="6"
                    placeholder="请输入证书内容（PEM 格式）"
                    class="cert-input"
                  />
                </div>
                <div class="cert-field">
                  <div class="cert-field-label">
                    <el-icon><Key /></el-icon>
                    <span>私钥内容</span>
                  </div>
                  <el-input
                    v-model="form.keys[index]"
                    type="textarea"
                    :rows="6"
                    placeholder="请输入对应证书的私钥内容（PEM 格式）"
                    class="cert-input"
                  />
                </div>
              </div>
            </div>
          </div>
          <el-button
            type="primary"
            size="small"
            @click="addCert"
            class="add-cert-btn"
          >
            <el-icon><Plus /></el-icon>
            添加额外证书
          </el-button>
          <div class="form-tip">当需要为同一个域名配置多个证书时，除了第一个证书通过上面的"证书内容"传递外，剩下的证书可以通过这里添加</div>
        </el-form-item>

        <!-- 客户端证书验证配置（仅服务端证书显示） -->
        <template v-if="form.type === 'server'">
          <el-divider>
            <span class="section-title">双向 TLS 验证（mTLS）(可选)</span>
          </el-divider>
          <el-alert
            type="info"
            :closable="false"
            style="margin-bottom: 16px;"
          >
            <template #title>
              <span style="font-size: 13px; font-weight: 500;">双向 TLS 验证说明</span>
            </template>
            <template #default>
              <div style="font-size: 12px; line-height: 1.6; margin-top: 4px;">
                当 APISIX 使用<strong>服务端证书</strong>时，可以启用双向 TLS（mTLS）验证，要求<strong>客户端在连接时也提供证书</strong>。
                这样可以确保只有持有有效证书的客户端才能访问，增强安全性。
              </div>
            </template>
          </el-alert>
          <div class="client-cert-section">
            <el-form-item label="CA 证书" prop="client.ca">
              <el-input
                v-model="form.client.ca"
                type="textarea"
                :rows="6"
                placeholder="请输入用于验证客户端证书的 CA 证书（PEM 格式，可选）"
              />
              <div class="form-tip">设置用于客户端证书校验的 CA 证书，需要 OpenResty 1.19 及以上版本</div>
            </el-form-item>
            <el-form-item label="证书校验深度" prop="client.depth">
              <el-input-number
                v-model="form.client.depth"
                :min="1"
                :max="10"
                placeholder="默认值为 1"
                style="width: 100%"
              />
              <div class="form-tip">设置客户端证书校验的深度，默认为 1</div>
            </el-form-item>
            <el-form-item label="跳过 MTLS 的 URI" prop="client.skip_mtls_uri_regex">
              <el-select
                v-model="form.client.skip_mtls_uri_regex"
                multiple
                filterable
                allow-create
                default-first-option
                :reserve-keyword="false"
                placeholder="输入正则表达式并按回车添加，如: /hello[0-9]+, /foobar"
                style="width: 100%"
              >
                <el-option
                  v-for="regex in form.client.skip_mtls_uri_regex"
                  :key="regex"
                  :label="regex"
                  :value="regex"
                />
              </el-select>
              <div class="form-tip">匹配这些 URI 的请求将绕过客户端证书检查（PCRE 正则表达式）</div>
            </el-form-item>
          </div>
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
import { Plus, Delete, Document, Key, Search } from '@element-plus/icons-vue'
import { sslApi } from '../utils/api'
import { formatTimestamp, getDialogWidth } from '../utils/format'
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
const dialogWidth = computed(() => getDialogWidth())
const sslList = ref([])
const dialogVisible = ref(false)
const dialogTitle = ref('添加证书')
const formRef = ref(null)
const sniInput = ref('')
const isEdit = ref(false)

// 过滤条件
const filterLabel = ref('')

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
  certs: [],
  keys: [],
  ssl_protocols: ['TLSv1.2', 'TLSv1.3'],
  status: 1,
  type: 'server',
  labels: {},
  client: {
    ca: '',
    depth: 1,
    skip_mtls_uri_regex: []
  }
})

const rules = {
  id: [{ required: true, message: '请输入证书 ID', trigger: 'blur' }],
  snis: [{ required: true, message: '请输入域名', trigger: 'change' }],
  cert: [{ required: true, message: '请输入证书内容', trigger: 'blur' }],
  key: [{ required: true, message: '请输入私钥内容', trigger: 'blur' }]
}

// 添加额外证书
const addCert = () => {
  if (!form.value.certs) {
    form.value.certs = []
  }
  if (!form.value.keys) {
    form.value.keys = []
  }
  form.value.certs.push('')
  form.value.keys.push('')
}

// 删除额外证书
const removeCert = (index) => {
  form.value.certs.splice(index, 1)
  form.value.keys.splice(index, 1)
}


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
    const response = await sslApi.list(params)
    const data = response.data
    if (data.list && data.list.length > 0) {
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

// 过滤
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
  dialogTitle.value = '添加证书'
  isEdit.value = false
  form.value = {
    id: '',
    snis: [],
    desc: '',
    cert: '',
    key: '',
    certs: [],
    keys: [],
    ssl_protocols: ['TLSv1.2', 'TLSv1.3'],
    status: 1,
    type: 'server',
    labels: {},
    client: {
      ca: '',
      depth: 1,
      skip_mtls_uri_regex: []
    }
  }
  dialogVisible.value = true
}

const handleEdit = (row) => {
  dialogTitle.value = '编辑证书'
  isEdit.value = true
  
  // 直接从列表数据中读取，因为 GET 接口可能不返回 key 等敏感字段
  const certs = row.certs || []
  const keys = row.keys || []
  const maxLen = Math.max(certs.length, keys.length)
  const pad = (arr, len) => {
    const a = [...(arr || [])]
    while (a.length < len) a.push('')
    return a
  }
  
  form.value = {
    id: row.id,
    snis: row.snis || [],
    desc: row.desc || '',
    cert: row.cert || '',
    key: row.key || '',
    certs: pad(certs, maxLen),
    keys: pad(keys, maxLen),
    ssl_protocols: row.ssl_protocols || ['TLSv1.2', 'TLSv1.3'],
    status: row.status !== undefined ? row.status : 1,
    type: row.type || 'server',
    labels: row.labels || {},
    client: {
      ca: row.client?.ca || '',
      depth: row.client?.depth !== undefined ? row.client.depth : 1,
      skip_mtls_uri_regex: row.client?.skip_mtls_uri_regex || []
    }
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
        type: form.value.type || 'server',
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
      
      // 添加标签
      if (form.value.labels && typeof form.value.labels === 'object' && Object.keys(form.value.labels).length > 0) {
        sslData.labels = form.value.labels
      }

      // 添加多个证书支持（过滤空值）
      const validCerts = (form.value.certs || []).filter(cert => cert && cert.trim())
      const validKeys = (form.value.keys || []).filter(key => key && key.trim())
      
      if (validCerts.length > 0) {
        sslData.certs = validCerts
        // 确保 keys 数组长度与 certs 一致
        if (validKeys.length !== validCerts.length) {
          ElMessage.warning('额外证书和私钥数量不匹配，请确保每个证书都有对应的私钥')
          return
        }
        sslData.keys = validKeys
      }

      // 添加客户端证书配置（仅服务端证书）
      if (form.value.type === 'server' && form.value.client) {
        const clientConfig = {}
        let hasClientConfig = false

        if (form.value.client.ca && form.value.client.ca.trim()) {
          clientConfig.ca = form.value.client.ca.trim()
          hasClientConfig = true
        }

        if (form.value.client.depth !== undefined && form.value.client.depth !== 1) {
          clientConfig.depth = form.value.client.depth
          hasClientConfig = true
        }

        if (form.value.client.skip_mtls_uri_regex && form.value.client.skip_mtls_uri_regex.length > 0) {
          clientConfig.skip_mtls_uri_regex = form.value.client.skip_mtls_uri_regex
          hasClientConfig = true
        }

        if (hasClientConfig) {
          sslData.client = clientConfig
        }
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

.filter-wrapper {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
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

.section-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

/* 多个证书配置样式 */
.cert-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 12px;
  width: 100%;
}

.cert-item {
  background: linear-gradient(to bottom, #ffffff, #f8f9fa);
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s ease;
  width: 100%;
  box-sizing: border-box;
}

.cert-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 12px rgba(64, 158, 255, 0.1);
  transform: translateY(-1px);
}

.cert-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
}

.cert-item-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cert-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cert-field-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #606266;
}

.cert-field-label .el-icon {
  font-size: 16px;
  color: #409eff;
}

.remove-btn {
  padding: 4px 10px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.remove-btn:hover {
  background-color: #fef0f0;
  color: #f56c6c;
}

.cert-input {
  width: 100%;
}

.cert-input :deep(.el-textarea__inner) {
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  width: 100%;
  min-width: 100%;
}

.add-cert-btn {
  margin-top: 8px;
  border-radius: 6px;
  padding: 8px 16px;
  transition: all 0.2s ease;
}

.add-cert-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}

/* 客户端证书配置区域 */
.client-cert-section {
  background: linear-gradient(to bottom, #ffffff, #fafbfc);
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 20px;
  margin-top: 8px;
  transition: all 0.2s ease;
}

.client-cert-section:hover {
  border-color: #409eff;
  box-shadow: 0 2px 12px rgba(64, 158, 255, 0.08);
}

/* 分隔线样式优化 */
:deep(.el-divider__text) {
  background-color: #fff;
  padding: 0 20px;
  font-weight: 500;
  color: #303133;
}

:deep(.el-divider) {
  margin: 24px 0;
}

/* 表单项间距优化 */
:deep(.el-form-item) {
  margin-bottom: 20px;
}

/* 确保表单项内容区域占满宽度 */
:deep(.el-form-item__content) {
  width: 100%;
}

/* 确保额外证书和私钥的表单项内容占满宽度 */
.cert-list + .add-cert-btn,
.cert-list + .form-tip {
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
