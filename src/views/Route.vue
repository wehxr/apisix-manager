<template>
  <div class="route-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>路由管理</span>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            创建路由
          </el-button>
        </div>
      </template>

      <el-table :data="routeList" v-loading="loading" style="width: 100%">
        <el-table-column prop="id" label="ID" width="180" show-overflow-tooltip />
        <el-table-column prop="name" label="名称" width="150" />
        <el-table-column prop="uris" label="路径" min-width="150">
          <template #default="{ row }">
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <el-tag
                v-for="uri in (row.uris || [])"
                :key="uri"
                size="small"
                style="width: fit-content;"
              >
                {{ uri }}
              </el-tag>
              <span v-if="!row.uris || row.uris.length === 0" style="color: #909399">-</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="hosts" label="域名" min-width="180">
          <template #default="{ row }">
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <el-tag
                v-for="host in (row.hosts || [])"
                :key="host"
                type="info"
                size="small"
                style="width: fit-content;"
              >
                {{ host }}
              </el-tag>
              <span v-if="!row.hosts || row.hosts.length === 0" style="color: #909399">全部</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="methods" label="HTTP 方法" width="180">
          <template #default="{ row }">
            <div style="display: flex; flex-wrap: wrap; gap: 4px;">
              <el-tag
                v-for="method in (row.methods || [])"
                :key="method"
                size="small"
                type="primary"
              >
                {{ method }}
              </el-tag>
              <span v-if="!row.methods || row.methods.length === 0" style="color: #909399">全部</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="upstream_id" label="上游服务" width="200">
          <template #default="{ row }">
            <span v-if="row.upstream_id">
              {{ getUpstreamName(row.upstream_id) || row.upstream_id }}
            </span>
            <span v-else style="color: #909399">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
              {{ row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="plugins" label="插件" min-width="200">
          <template #default="{ row }">
            <div style="display: flex; flex-wrap: wrap; gap: 4px;">
              <el-tag
                v-if="row.plugins?.['basic-auth']"
                type="success"
                size="small"
              >
                Basic Auth
              </el-tag>
              <el-tag
                v-if="row.plugins?.['ip-restriction']"
                type="warning"
                size="small"
              >
                IP 限制
              </el-tag>
              <el-tag
                v-if="row.plugins?.['cors']"
                type="info"
                size="small"
              >
                CORS
              </el-tag>
              <span v-if="!row.plugins || Object.keys(row.plugins).length === 0" style="color: #909399">-</span>
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
        <el-table-column prop="priority" label="优先级" width="80" v-if="false" />
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
      width="900px"
      @close="resetForm"
    >
      <el-form :model="form" label-width="140px" ref="formRef" :rules="rules">
        <el-tabs v-model="activeTab" type="border-card">
          <!-- 基础配置 -->
          <el-tab-pane label="基础配置" name="basic">
            <el-divider>基本信息</el-divider>
            <el-form-item label="名称" prop="name">
              <el-input v-model="form.name" placeholder="请输入路由名称" />
            </el-form-item>

            <el-form-item label="状态" prop="status">
              <el-radio-group v-model="form.status">
                <el-radio :label="1">启用</el-radio>
                <el-radio :label="0">禁用</el-radio>
              </el-radio-group>
            </el-form-item>

            <el-form-item label="描述" prop="desc">
              <el-input
                v-model="form.desc"
                type="textarea"
                :rows="3"
                placeholder="请输入描述信息（可选）"
              />
            </el-form-item>

            <el-form-item label="WebSocket 支持" prop="enable_websocket">
              <el-switch v-model="form.enable_websocket" />
            </el-form-item>

            <el-form-item label="优先级" prop="priority">
              <el-input-number
                v-model="form.priority"
                :min="0"
                :max="10000"
                style="width: 100%"
              />
              <div class="form-tip">路由匹配优先级，数值越大优先级越高，默认 0</div>
            </el-form-item>

            <el-divider>匹配条件</el-divider>

            <el-form-item label="路径 (URIs)" prop="uris">
              <el-select
                v-model="form.uris"
                multiple
                filterable
                allow-create
                default-first-option
                placeholder="输入路径后按回车添加，支持通配符"
                style="width: 100%"
              >
                <el-option
                  v-for="uri in form.uris"
                  :key="uri"
                  :label="uri"
                  :value="uri"
                />
              </el-select>
              <div class="form-tip">支持多个路径，输入后按回车添加，支持通配符（如 /api/*）</div>
            </el-form-item>

            <el-form-item label="匹配域名" prop="hosts">
              <el-select
                v-model="form.hosts"
                multiple
                filterable
                allow-create
                default-first-option
                placeholder="输入域名后按回车添加，支持通配符"
                style="width: 100%"
              >
                <el-option
                  v-for="host in form.hosts"
                  :key="host"
                  :label="host"
                  :value="host"
                />
              </el-select>
              <div class="form-tip">必填，支持多个域名，输入后按回车添加，支持通配符（如 *.example.com）</div>
            </el-form-item>
            <el-form-item label="HTTP 方法" prop="methods">
              <el-checkbox-group v-model="form.methods">
                <el-checkbox label="GET">GET</el-checkbox>
                <el-checkbox label="POST">POST</el-checkbox>
                <el-checkbox label="PUT">PUT</el-checkbox>
                <el-checkbox label="DELETE">DELETE</el-checkbox>
                <el-checkbox label="PATCH">PATCH</el-checkbox>
                <el-checkbox label="HEAD">HEAD</el-checkbox>
                <el-checkbox label="OPTIONS">OPTIONS</el-checkbox>
                <el-checkbox label="CONNECT">CONNECT</el-checkbox>
                <el-checkbox label="TRACE">TRACE</el-checkbox>
              </el-checkbox-group>
              <div class="form-tip">至少选择一个 HTTP 方法</div>
            </el-form-item>


          </el-tab-pane>

          <!-- 上游服务 -->
          <el-tab-pane label="上游服务" name="timeout">

            <el-divider>上游服务</el-divider>

            <el-form-item label="上游服务" prop="upstream_id">
              <el-select
                v-model="form.upstream_id"
                filterable
                placeholder="请选择上游服务"
                style="width: 100%"
              >
                <el-option
                  v-for="upstream in upstreamList"
                  :key="upstream.id"
                  :label="`${upstream.name || '未命名'} - ${upstream.id}`"
                  :value="upstream.id"
                />
              </el-select>
            </el-form-item>

            <el-divider>超时配置</el-divider>

            <el-form-item label="连接超时" prop="timeout.connect">
              <el-input-number
                v-model="form.timeout.connect"
                :min="1"
                :max="600"
                :step="1"
                style="width: 100%"
              />
              <div class="form-tip">单位：秒，默认 3 秒</div>
            </el-form-item>
            <el-form-item label="发送超时" prop="timeout.send">
              <el-input-number
                v-model="form.timeout.send"
                :min="1"
                :max="600"
                :step="1"
                style="width: 100%"
              />
              <div class="form-tip">单位：秒，默认 3 秒</div>
            </el-form-item>
            <el-form-item label="读取超时" prop="timeout.read">
              <el-input-number
                v-model="form.timeout.read"
                :min="1"
                :max="600"
                :step="1"
                style="width: 100%"
              />
              <div class="form-tip">单位：秒，默认 3 秒</div>
            </el-form-item>
          </el-tab-pane>

          <!-- 安全配置 -->
          <el-tab-pane label="安全配置" name="plugins">
            <el-divider>身份认证</el-divider>
            <el-form-item label="启用 Basic Auth">
              <el-switch v-model="enableBasicAuth" />
            </el-form-item>
            <template v-if="enableBasicAuth">
              <el-form-item label="消费者">
                <el-select
                  v-model="form.basicAuthConsumer"
                  filterable
                  placeholder="请选择消费者"
                  style="width: 100%"
                >
                  <el-option
                    v-for="consumer in consumerList"
                    :key="consumer.username"
                    :label="consumer.username"
                    :value="consumer.username"
                  />
                </el-select>
                <div class="form-tip">只有选中的消费者可以访问此路由</div>
              </el-form-item>
            </template>

            <el-divider>IP 访问限制</el-divider>
            <el-form-item label="启用 IP 限制">
              <el-switch v-model="enableIpRestriction" />
            </el-form-item>
            <template v-if="enableIpRestriction">
              <el-form-item label="限制类型">
                <el-radio-group v-model="ipRestrictionType">
                  <el-radio label="whitelist">白名单（仅允许）</el-radio>
                  <el-radio label="blacklist">黑名单（禁止）</el-radio>
                </el-radio-group>
              </el-form-item>
              <el-form-item label="IP 列表">
                <el-input
                  v-model="ipListInput"
                  type="textarea"
                  :rows="4"
                  placeholder="每行一个 IP 或 CIDR，如:&#10;192.168.1.1&#10;10.0.0.0/8"
                  @blur="handleIpListInput"
                />
                <div class="form-tip">每行一个 IP 地址或 CIDR 网段</div>
              </el-form-item>
            </template>

            <el-divider>跨域配置</el-divider>
            <el-form-item label="启用 CORS">
              <el-switch v-model="enableCors" />
            </el-form-item>
            <template v-if="enableCors">
              <el-form-item label="允许的源">
                <el-input
                  v-model="corsOriginsInput"
                  placeholder="多个源用逗号分隔，如: https://example.com, https://*.example.com"
                  @blur="handleCorsOriginsInput"
                />
                <div class="form-tip">留空表示允许所有源（使用 *），多个源用逗号分隔</div>
              </el-form-item>
              <el-form-item label="允许的方法">
                <el-checkbox-group v-model="corsMethods">
                  <el-checkbox label="GET">GET</el-checkbox>
                  <el-checkbox label="POST">POST</el-checkbox>
                  <el-checkbox label="PUT">PUT</el-checkbox>
                  <el-checkbox label="DELETE">DELETE</el-checkbox>
                  <el-checkbox label="OPTIONS">OPTIONS</el-checkbox>
                  <el-checkbox label="PATCH">PATCH</el-checkbox>
                  <el-checkbox label="HEAD">HEAD</el-checkbox>
                  <el-checkbox label="CONNECT">CONNECT</el-checkbox>
                  <el-checkbox label="TRACE">TRACE</el-checkbox>
                </el-checkbox-group>
                <div class="form-tip">至少选择一个 HTTP 方法</div>
              </el-form-item>
              <el-form-item label="允许的请求头">
                <el-input
                  v-model="corsAllowHeadersInput"
                  placeholder="多个请求头用逗号分隔，如: Content-Type, Authorization"
                  @blur="handleCorsInput"
                />
                <div class="form-tip">留空表示允许所有请求头（使用 *），多个请求头用逗号分隔</div>
              </el-form-item>
              <el-form-item label="暴露的响应头">
                <el-input
                  v-model="corsExposeHeadersInput"
                  placeholder="多个响应头用逗号分隔，如: Content-Length, X-Custom-Header"
                  @blur="handleCorsInput"
                />
                <div class="form-tip">可选，多个响应头用逗号分隔，留空则不设置</div>
              </el-form-item>
              <el-form-item label="缓存时间">
                <el-input-number
                  v-model="corsMaxAge"
                  :min="-1"
                  :max="86400"
                  style="width: 100%"
                  @change="handleCorsInput"
                />
                <div class="form-tip">单位：秒，浏览器缓存 CORS 结果的最大时间，-1 表示不缓存，默认 5 秒</div>
              </el-form-item>
              <el-form-item label="允许凭据">
                <el-switch v-model="corsAllowCredential" @change="handleCorsInput" />
                <div class="form-tip">是否允许跨域请求携带凭据（如 Cookie），开启后不能在其他属性中使用 *</div>
              </el-form-item>
            </template>
          </el-tab-pane>
        </el-tabs>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { routeApi, upstreamApi, consumerApi } from '../utils/api'
import { formatTimestamp } from '../utils/format'

const loading = ref(false)
const routeList = ref([])
const upstreamList = ref([])
const consumerList = ref([])
const dialogVisible = ref(false)
const dialogTitle = ref('创建路由')
const formRef = ref(null)
const activeTab = ref('basic')

// 分页配置
const pagination = ref({
  page: 1,
  pageSize: 10,
  total: 0
})

const ipListInput = ref('')
const corsOriginsInput = ref('')
const corsMethods = ref(['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'])
const corsAllowHeadersInput = ref('')
const corsExposeHeadersInput = ref('')
const corsMaxAge = ref(5)
const corsAllowCredential = ref(false)

const enableBasicAuth = ref(false)
const enableIpRestriction = ref(false)
const enableCors = ref(false)
const ipRestrictionType = ref('whitelist')
const form = ref({
  id: '',
  name: '',
  uris: [],
  hosts: [],
  methods: [],
  priority: 0,
  upstream_id: '',
  desc: '',
  plugins: {}
})

// 生成随机 ID
const generateRandomId = () => {
  return 'route_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9)
}

// 根据 upstream_id 获取上游服务名称
const getUpstreamName = (upstreamId) => {
  const upstream = upstreamList.value.find(item => item.id === upstreamId)
  return upstream?.name || ''
}

const rules = {
  name: [
    { required: true, message: '请输入路由名称', trigger: 'blur' }
  ],
  uris: [{ required: true, message: '请输入路径', trigger: 'blur' }],
  hosts: [
    {
      validator: (rule, value, callback) => {
        if (!value || value.length === 0) {
          callback(new Error('请输入至少一个域名'))
        } else {
          callback()
        }
      },
      trigger: 'change'
    }
  ],
  upstream_id: [{ required: true, message: '请选择上游服务', trigger: 'blur' }],
  methods: [
    {
      validator: (rule, value, callback) => {
        if (!value || value.length === 0) {
          callback(new Error('至少选择一个 HTTP 方法'))
        } else {
          callback()
        }
      },
      trigger: 'change'
    }
  ]
}

const handleUriInput = () => {
  if (uriInput.value) {
    form.value.uris = uriInput.value.split(',').map(s => s.trim()).filter(s => s)
  } else {
    form.value.uris = []
  }
}

const handleHostsInput = () => {
  if (hostsInput.value) {
    form.value.hosts = hostsInput.value.split(',').map(s => s.trim()).filter(s => s)
  } else {
    form.value.hosts = []
  }
}

const handleIpListInput = () => {
  if (ipListInput.value && enableIpRestriction.value) {
    const ips = ipListInput.value.split('\n').map(s => s.trim()).filter(s => s)
    if (ips.length > 0) {
      if (!form.value.plugins['ip-restriction']) {
        form.value.plugins['ip-restriction'] = {}
      }
      if (ipRestrictionType.value === 'whitelist') {
        form.value.plugins['ip-restriction'].whitelist = ips
        delete form.value.plugins['ip-restriction'].blacklist
      } else {
        form.value.plugins['ip-restriction'].blacklist = ips
        delete form.value.plugins['ip-restriction'].whitelist
      }
    }
  } else if (!enableIpRestriction.value) {
    // 如果禁用了 IP 限制，删除插件配置
    if (form.value.plugins['ip-restriction']) {
      delete form.value.plugins['ip-restriction']
    }
  }
}

const handleCorsInput = () => {
  if (enableCors.value) {
    if (!form.value.plugins.cors) {
      form.value.plugins.cors = {}
    }
    
    // 当 allow_credential 为 true 时，不能使用 *
    const isCredentialEnabled = corsAllowCredential.value
    
    // allow_origins - 字符串，多个值用逗号分隔
    if (corsOriginsInput.value && corsOriginsInput.value.trim()) {
      form.value.plugins.cors.allow_origins = corsOriginsInput.value.trim()
    } else {
      // 如果 allow_credential 为 true，不能使用 *，必须显式指定
      if (isCredentialEnabled) {
        // 不设置，让验证逻辑处理
        delete form.value.plugins.cors.allow_origins
      } else {
        form.value.plugins.cors.allow_origins = '*'
      }
    }
    
    // allow_methods - 字符串，用逗号分隔
    if (corsMethods.value && corsMethods.value.length > 0) {
      form.value.plugins.cors.allow_methods = corsMethods.value.join(',')
    } else {
      // 如果 allow_credential 为 true，不能使用 *，必须显式指定
      if (isCredentialEnabled) {
        // 不设置，让验证逻辑处理
        delete form.value.plugins.cors.allow_methods
      } else {
        form.value.plugins.cors.allow_methods = '*'
      }
    }
    
    // allow_headers - 字符串，多个值用逗号分隔
    if (corsAllowHeadersInput.value && corsAllowHeadersInput.value.trim()) {
      form.value.plugins.cors.allow_headers = corsAllowHeadersInput.value.trim()
    } else {
      // 如果 allow_credential 为 true，不能使用 *，必须显式指定
      if (isCredentialEnabled) {
        // 不设置，让验证逻辑处理
        delete form.value.plugins.cors.allow_headers
      } else {
        form.value.plugins.cors.allow_headers = '*'
      }
    }
    
    // expose_headers - 字符串，多个值用逗号分隔（可选）
    if (corsExposeHeadersInput.value && corsExposeHeadersInput.value.trim()) {
      form.value.plugins.cors.expose_headers = corsExposeHeadersInput.value.trim()
    } else {
      // 如果为空，删除该字段
      delete form.value.plugins.cors.expose_headers
    }
    
    // max_age - 整数，单位秒
    if (corsMaxAge.value !== undefined && corsMaxAge.value !== null) {
      form.value.plugins.cors.max_age = corsMaxAge.value
    } else {
      form.value.plugins.cors.max_age = 5
    }
    
    // allow_credential - 布尔值，必须显式设置
    form.value.plugins.cors.allow_credential = corsAllowCredential.value || false
  } else {
    // 如果禁用了 CORS，删除插件配置
    if (form.value.plugins.cors) {
      delete form.value.plugins.cors
    }
  }
}

const handleCorsOriginsInput = () => {
  handleCorsInput()
}

const loadData = async () => {
  loading.value = true
  try {
    const [routeRes, upstreamRes, consumerRes] = await Promise.all([
      routeApi.list({
        page: pagination.value.page,
        page_size: pagination.value.pageSize
      }),
      upstreamApi.list(),
      consumerApi.list()
    ])

    // 处理路由列表
    const routeData = routeRes.data
    if (routeData.list) {
      routeList.value = routeData.list.map(item => ({
        ...item.value,
        id: item.value.id || item.key,
        create_time: item.value.create_time || item.create_time,
        update_time: item.value.update_time || item.update_time || 0
      }))
      pagination.value.total = routeData.total || 0
    } else {
      routeList.value = []
      pagination.value.total = 0
    }

    // 处理上游列表
    const upstreamData = upstreamRes.data
    if (upstreamData.list) {
      upstreamList.value = upstreamData.list.map(item => ({
        ...item.value,
        id: item.value.id || item.key
      }))
    } else {
      upstreamList.value = []
    }

    // 处理消费者列表
    const consumerData = consumerRes.data
    if (consumerData.list) {
      consumerList.value = consumerData.list.map(item => ({
        ...item.value,
        username: item.value.username || item.key
      }))
    } else {
      consumerList.value = []
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
  dialogTitle.value = '创建路由'
  form.value = {
    id: generateRandomId(),
    name: '',
    uris: [],
    hosts: [],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'CONNECT', 'TRACE'],
    priority: 0,
    status: 1,
    enable_websocket: false,
  timeout: {
    connect: 3,
    send: 3,
    read: 3
  },
    upstream_id: '',
    desc: '',
    plugins: {}
  }
  ipListInput.value = ''
  corsOriginsInput.value = ''
  corsMethods.value = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD']
  corsAllowHeadersInput.value = ''
  corsExposeHeadersInput.value = ''
  corsMaxAge.value = 5
  corsAllowCredential.value = false
  enableBasicAuth.value = false
  enableIpRestriction.value = false
  enableCors.value = false
  ipRestrictionType.value = 'whitelist'
  form.value.basicAuthConsumer = ''
  activeTab.value = 'basic'
  dialogVisible.value = true
}

const handleEdit = (row) => {
  dialogTitle.value = '编辑路由'
  form.value = {
    id: row.id,
    name: row.name || '',
    uris: row.uris || [],
    hosts: row.hosts || [],
    methods: row.methods || [],
    priority: row.priority !== undefined ? row.priority : 0,
    status: row.status !== undefined ? row.status : 1,
    enable_websocket: row.enable_websocket || false,
    timeout: row.timeout || {
      connect: 3,
      send: 3,
      read: 3
    },
    upstream_id: row.upstream_id || '',
    desc: row.desc || '',
    plugins: row.plugins || {}
  }
  
  // 处理 Basic Auth
  enableBasicAuth.value = !!(row.plugins?.['basic-auth'])
  if (enableBasicAuth.value) {
    // 如果配置了 consumer-restriction，获取限制的消费者
    if (row.plugins?.['consumer-restriction']?.whitelist) {
      form.value.basicAuthConsumer = row.plugins['consumer-restriction'].whitelist[0] || ''
    } else {
      form.value.basicAuthConsumer = ''
    }
  }

  // 处理 IP 限制
  enableIpRestriction.value = !!(row.plugins?.['ip-restriction'])
  if (enableIpRestriction.value) {
    const ipRestriction = row.plugins['ip-restriction']
    if (ipRestriction.whitelist) {
      ipRestrictionType.value = 'whitelist'
      ipListInput.value = ipRestriction.whitelist.join('\n')
    } else if (ipRestriction.blacklist) {
      ipRestrictionType.value = 'blacklist'
      ipListInput.value = ipRestriction.blacklist.join('\n')
    }
  }

  // 处理 CORS
  enableCors.value = !!(row.plugins?.['cors'])
  if (enableCors.value) {
    const cors = row.plugins.cors
    if (cors.allow_origins && cors.allow_origins !== '*') {
      corsOriginsInput.value = Array.isArray(cors.allow_origins)
        ? cors.allow_origins.join(', ')
        : cors.allow_origins
    } else {
      corsOriginsInput.value = ''
    }
    // CORS 的 allow_methods 可能是字符串（逗号分隔）或数组
    if (cors.allow_methods) {
      if (typeof cors.allow_methods === 'string') {
        corsMethods.value = cors.allow_methods.split(',').map(s => s.trim()).filter(s => s)
      } else if (Array.isArray(cors.allow_methods)) {
        corsMethods.value = cors.allow_methods
      }
    } else {
      corsMethods.value = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD']
    }
  }

  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (!valid) return

    if (form.value.uris.length === 0) {
      ElMessage.warning('请输入至少一个路径')
      return
    }

    if (!form.value.hosts || form.value.hosts.length === 0) {
      ElMessage.warning('请输入至少一个域名')
      return
    }

    try {
      const routeData = {
        id: form.value.id,
        name: form.value.name,
        uris: form.value.uris,
        hosts: form.value.hosts,
        upstream_id: form.value.upstream_id,
        desc: form.value.desc || undefined,
        plugins: {}
      }

      // 配置 HTTP 方法（至少选择一个）
      if (form.value.methods && form.value.methods.length > 0) {
        routeData.methods = form.value.methods
      } else {
        ElMessage.warning('至少选择一个 HTTP 方法')
        return
      }

      // 配置优先级
      if (form.value.priority !== undefined && form.value.priority !== 0) {
        routeData.priority = form.value.priority
      }

      // 配置状态
      if (form.value.status !== undefined) {
        routeData.status = form.value.status
      }

      // 配置 WebSocket
      if (form.value.enable_websocket) {
        routeData.enable_websocket = true
      }

      // 配置超时（默认启用，有默认值）
      routeData.timeout = {
        connect: form.value.timeout?.connect || 3,
        send: form.value.timeout?.send || 3,
        read: form.value.timeout?.read || 3
      }

      // 配置 Basic Auth
      if (enableBasicAuth.value) {
        // Basic Auth 插件配置
        routeData.plugins['basic-auth'] = {}
        
        // 如果指定了特定消费者，使用 consumer-restriction 插件限制
        if (form.value.basicAuthConsumer) {
          routeData.plugins['consumer-restriction'] = {
            whitelist: [form.value.basicAuthConsumer]
          }
        }
      }

      // 配置 IP 限制
      if (enableIpRestriction.value) {
        handleIpListInput()
        if (!ipListInput.value.trim()) {
          ElMessage.warning('启用 IP 限制时必须输入 IP 列表')
          return
        }
        // 确保 IP 限制插件配置已添加到 routeData
        if (form.value.plugins['ip-restriction']) {
          routeData.plugins['ip-restriction'] = form.value.plugins['ip-restriction']
        }
      }

      // 配置 CORS
      if (enableCors.value) {
        // 确保 CORS 配置正确（在提交前再次处理，确保最新值被保存）
        handleCorsInput()
        
        // 验证：当 allow_credential 为 true 时，不能使用 *
        if (corsAllowCredential.value) {
          const cors = form.value.plugins.cors
          if (cors.allow_origins === '*' || cors.allow_methods === '*' || cors.allow_headers === '*') {
            ElMessage.error('当"允许凭据"开启时，不能在其他选项中使用 *，请显式指定具体值')
            return
          }
          if (!corsOriginsInput.value || !corsOriginsInput.value.trim()) {
            ElMessage.error('当"允许凭据"开启时，必须显式指定"允许的源"')
            return
          }
          if (!corsMethods.value || corsMethods.value.length === 0) {
            ElMessage.error('当"允许凭据"开启时，必须至少选择一个 HTTP 方法')
            return
          }
        }
        
        // 确保 CORS 配置已添加到 routeData
        if (form.value.plugins.cors && Object.keys(form.value.plugins.cors).length > 0) {
          routeData.plugins.cors = { ...form.value.plugins.cors }
        } else {
          // 如果配置为空，使用默认配置
          routeData.plugins.cors = {}
        }
      } else {
        // 如果禁用了 CORS，确保删除插件配置
        if (form.value.plugins.cors) {
          delete form.value.plugins.cors
        }
      }

      // 清理空的插件配置
      if (Object.keys(routeData.plugins).length === 0) {
        delete routeData.plugins
      }

      if (dialogTitle.value === '创建路由') {
        await routeApi.create(form.value.id, routeData)
        ElMessage.success('创建成功')
      } else {
        await routeApi.update(form.value.id, routeData)
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
    await ElMessageBox.confirm('确定要删除这个路由吗？', '提示', {
      type: 'warning'
    })
    await routeApi.delete(row.id)
    ElMessage.success('删除成功')
    loadData()
  } catch (error) {
    // 错误消息已由拦截器自动显示（用户取消操作除外）
  }
}

const resetForm = () => {
  formRef.value?.resetFields()
  ipListInput.value = ''
  corsOriginsInput.value = ''
  corsMethods.value = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD']
  corsAllowHeadersInput.value = ''
  corsExposeHeadersInput.value = ''
  corsMaxAge.value = 5
  corsAllowCredential.value = false
  enableBasicAuth.value = false
  enableIpRestriction.value = false
  enableCors.value = false
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.route-page {
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
