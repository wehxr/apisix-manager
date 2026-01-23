<template>
  <div class="upstream-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>上游服务器管理</span>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            添加上游
          </el-button>
        </div>
      </template>

      <el-table :data="upstreamList" v-loading="loading" style="width: 100%">
        <el-table-column prop="id" label="ID" width="180" show-overflow-tooltip />
        <el-table-column prop="name" label="名称" width="200" />
        <el-table-column prop="nodes" label="节点" width="200" >
          <template #default="{ row }">
            <div v-if="row.nodes && Object.keys(row.nodes).length > 0">
              <div
                v-for="(weight, node) in row.nodes"
                :key="node"
                style="margin-bottom: 6px; line-height: 1.5;"
              >
                <el-tag size="small">
                  {{ node }} <span style="color: #909399; margin-left: 4px;">({{ weight }})</span>
                </el-tag>
              </div>
            </div>
            <span v-else style="color: #909399">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="负载均衡" width="130">
          <template #default="{ row }">
            <el-tag size="small" type="primary">
              {{ row.type === 'roundrobin' ? '轮询' : row.type === 'chash' ? '一致性哈希' : row.type === 'least_conn' ? '最少连接' : row.type || '轮询' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="scheme" label="协议类型" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.scheme" size="small" type="info">
              {{ row.scheme.toUpperCase() }}
            </el-tag>
            <span v-else style="color: #909399">默认</span>
          </template>
        </el-table-column>
        <el-table-column prop="retries" label="重试次数" width="100">
          <template #default="{ row }">
            <span>{{ row.retries !== undefined ? row.retries : 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="timeout" label="超时设置" width="180">
          <template #default="{ row }">
            <span v-if="row.timeout">
              {{ row.timeout.connect }}s / {{ row.timeout.send }}s / {{ row.timeout.read }}s
            </span>
            <span v-else style="color: #909399">默认</span>
          </template>
        </el-table-column>
        <el-table-column prop="checks" label="健康检测" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.checks?.active" type="success" size="small">已启用</el-tag>
            <span v-else style="color: #909399">未启用</span>
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
      width="1000px"
      @close="resetForm"
    >
      <el-form :model="form" label-width="140px" ref="formRef" :rules="rules">
        <el-tabs v-model="activeTab" type="border-card">
          <!-- 基础配置 -->
          <el-tab-pane label="基础配置" name="basic">
            <el-form-item label="名称" prop="name">
              <el-input v-model="form.name" placeholder="请输入上游服务名称" />
            </el-form-item>
            <el-form-item label="描述" prop="desc">
              <el-input
                v-model="form.desc"
                type="textarea"
                :rows="3"
                placeholder="请输入描述信息（可选）"
              />
            </el-form-item>
        <el-form-item label="负载均衡类型" prop="type">
          <el-select v-model="form.type" style="width: 100%">
            <el-option label="轮询 (roundrobin)" value="roundrobin" />
            <el-option label="一致性哈希 (chash)" value="chash" />
            <el-option label="最少连接 (least_conn)" value="least_conn" />
          </el-select>
        </el-form-item>
        <template v-if="form.type === 'chash'">
          <el-form-item label="哈希对象" prop="hash_on">
            <el-select v-model="form.hash_on" style="width: 100%" placeholder="选择哈希对象">
              <el-option label="变量 (vars)" value="vars" />
              <el-option label="请求头 (header)" value="header" />
              <el-option label="Cookie (cookie)" value="cookie" />
            </el-select>
            <div class="form-tip">选择哈希计算的对象类型</div>
          </el-form-item>
          <el-form-item label="哈希键" prop="key">
            <el-input
              v-model="form.key"
              placeholder="根据 hash_on 选择：vars 时输入变量名，header 时输入请求头名称，cookie 时输入 Cookie 名称"
            />
            <div class="form-tip">
              一致性哈希的键值，根据 hash_on 选择：
              <br />- vars: 变量名（如 remote_addr, $request_uri, $arg_id, $http_user_agent）
              <br />- header: 请求头名称（如 user-id, x-user-id）
              <br />- cookie: Cookie 名称（如 session_id, user_session）
            </div>
          </el-form-item>
        </template>
            <el-form-item label="标签" prop="labels">
              <el-input
                v-model="labelsInput"
                placeholder="多个标签用逗号分隔，如: env:prod,version:v1"
                @blur="handleLabelsInput"
              />
              <div class="form-tip">多个标签用逗号分隔，格式：key:value</div>
            </el-form-item>
          </el-tab-pane>

          <!-- 节点配置 -->
          <el-tab-pane label="节点配置" name="nodes">
            <el-form-item label="上游节点" prop="nodes" required>
              <el-table :data="nodeList" border style="width: 100%">
                <el-table-column label="节点地址" min-width="300">
                  <template #default="{ row, $index }">
                    <el-input
                      v-model="row.host"
                      placeholder="格式: 127.0.0.1:8080 或 domain.com:443"
                    />
                  </template>
                </el-table-column>
                <el-table-column label="权重" width="150">
                  <template #default="{ row }">
                    <el-input-number
                      v-model="row.weight"
                      :min="1"
                      :max="1000"
                      style="width: 100%"
                    />
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="100" fixed="right">
                  <template #default="{ $index }">
                    <el-button
                      type="danger"
                      :icon="Delete"
                      circle
                      size="small"
                      @click="removeNode($index)"
                      :disabled="nodeList.length <= 1"
                    />
                  </template>
                </el-table-column>
              </el-table>
              <el-button
                type="primary"
                :icon="Plus"
                @click="addNode"
                style="margin-top: 10px"
              >
                添加节点
              </el-button>
            </el-form-item>

            <el-divider>协议配置</el-divider>
            <el-form-item label="协议类型" prop="scheme">
              <el-select v-model="form.scheme" style="width: 100%" placeholder="选择协议类型（可选）">
                <el-option label="HTTP" value="http" />
                <el-option label="HTTPS" value="https" />
                <el-option label="GRPC" value="grpc" />
                <el-option label="GRPCS" value="grpcs" />
              </el-select>
              <div class="form-tip">上游服务的协议类型，不设置则使用默认协议</div>
            </el-form-item>

            <el-divider>Host 配置</el-divider>
            <el-form-item label="Host 传递方式" prop="pass_host">
              <el-select v-model="form.pass_host" style="width: 100%" placeholder="选择 Host 传递方式">
                <el-option label="传递原始 Host (pass)" value="pass" />
                <el-option label="使用节点地址 (node)" value="node" />
                <el-option label="使用自定义 Host (rewrite)" value="rewrite" />
              </el-select>
              <div class="form-tip">pass: 传递原始请求的 Host | node: 使用上游节点地址 | rewrite: 使用自定义 Host</div>
            </el-form-item>
            <el-form-item label="自定义 Host" prop="upstream_host" v-if="form.pass_host === 'rewrite'">
              <el-input
                v-model="form.upstream_host"
                placeholder="当 pass_host 为 rewrite 时，设置此值"
              />
              <div class="form-tip">仅在 pass_host 为 rewrite 时生效</div>
            </el-form-item>

            <el-divider>连接池配置</el-divider>
            <el-form-item label="连接池大小" prop="keepalive_pool.size">
              <el-input-number
                v-model="form.keepalive_pool.size"
                :min="1"
                :max="10000"
                style="width: 100%"
              />
              <div class="form-tip">连接池大小，默认 320</div>
            </el-form-item>
            <el-form-item label="空闲超时" prop="keepalive_pool.idle_timeout">
              <el-input-number
                v-model="form.keepalive_pool.idle_timeout"
                :min="1"
                :max="3600"
                style="width: 100%"
              />
              <div class="form-tip">单位：秒，连接池空闲超时时间，默认 60 秒</div>
            </el-form-item>
            <el-form-item label="最大请求数" prop="keepalive_pool.requests">
              <el-input-number
                v-model="form.keepalive_pool.requests"
                :min="1"
                :max="100000"
                style="width: 100%"
              />
              <div class="form-tip">连接池中每个连接的最大请求数，默认 1000</div>
            </el-form-item>
          </el-tab-pane>

          <!-- 超时配置 -->
          <el-tab-pane label="超时配置" name="timeout">
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
              <div class="form-tip">单位：秒，默认 6 秒</div>
            </el-form-item>
            <el-form-item label="读取超时" prop="timeout.read">
              <el-input-number
                v-model="form.timeout.read"
                :min="1"
                :max="600"
                :step="1"
                style="width: 100%"
              />
              <div class="form-tip">单位：秒，默认 6 秒</div>
            </el-form-item>
            <el-divider>重试配置</el-divider>
            <el-form-item label="重试次数" prop="retries">
              <el-input-number
                v-model="form.retries"
                :min="0"
                :max="10"
                style="width: 100%"
              />
              <div class="form-tip">请求失败时的重试次数，默认 0（不重试）</div>
            </el-form-item>
            <el-form-item label="重试超时" prop="retry_timeout">
              <el-input-number
                v-model="form.retry_timeout"
                :min="0"
                :max="60"
                :step="0.1"
                style="width: 100%"
              />
              <div class="form-tip">单位：秒，重试的超时时间，默认 6 秒</div>
            </el-form-item>
          </el-tab-pane>

          <!-- 主动健康检测 -->
          <el-tab-pane label="主动健康检测" name="healthcheck">
            <el-form-item label="启用健康检测">
              <el-switch v-model="enableHealthCheck" />
            </el-form-item>
            <template v-if="enableHealthCheck">
              <el-form-item label="检测类型" prop="checks.active.type">
                <el-select v-model="form.checks.active.type" style="width: 100%">
                  <el-option label="HTTP" value="http" />
                  <el-option label="HTTPS" value="https" />
                  <el-option label="TCP" value="tcp" />
                </el-select>
              </el-form-item>
              <el-form-item label="检测主机" prop="checks.active.host">
                <el-input
                  v-model="form.checks.active.host"
                  :placeholder="form.checks.active.type === 'tcp' ? '可选，TCP 检测的主机地址' : '可选，用于设置 HTTP 请求的 Host 头'"
                />
                <div class="form-tip">
                  <span v-if="form.checks.active.type === 'tcp'">TCP 检测的主机地址，留空则使用上游节点的主机名</span>
                  <span v-else>HTTP/HTTPS 检测时用于设置请求的 Host 头，留空则使用上游节点的主机名</span>
                </div>
              </el-form-item>
              <el-form-item label="检测端口" prop="checks.active.port" v-if="form.checks.active.type === 'tcp'">
                <el-input-number
                  v-model="form.checks.active.port"
                  :min="1"
                  :max="65535"
                  style="width: 100%"
                />
                <div class="form-tip">TCP 检测的端口号，范围：1-65535，不设置则使用上游节点的端口</div>
              </el-form-item>
              <el-form-item label="检测路径" prop="checks.active.http_path" v-if="form.checks.active.type === 'http' || form.checks.active.type === 'https'">
                <el-input
                  v-model="form.checks.active.http_path"
                  placeholder="/"
                />
                <div class="form-tip">HTTP/HTTPS 检测时的请求路径，默认: /</div>
              </el-form-item>
              <el-form-item label="超时时间" prop="checks.active.timeout">
                <el-input-number
                  v-model="form.checks.active.timeout"
                  :min="1"
                  :max="60"
                  style="width: 100%"
                />
                <div class="form-tip">单位：秒，默认 1 秒</div>
              </el-form-item>
              <el-divider>健康节点配置</el-divider>
              <el-form-item label="检测间隔" prop="checks.active.healthy.interval">
                <el-input-number
                  v-model="form.checks.active.healthy.interval"
                  :min="1"
                  :max="3600"
                  style="width: 100%"
                />
                <div class="form-tip">单位：秒，默认 1 秒</div>
              </el-form-item>
              <el-form-item label="健康状态码" prop="checks.active.healthy.http_statuses" v-if="form.checks.active.type === 'http' || form.checks.active.type === 'https'">
                <el-select
                  v-model="form.checks.active.healthy.http_statuses"
                  multiple
                  style="width: 100%"
                  placeholder="选择健康状态码"
                >
                  <el-option label="200" :value="200" />
                  <el-option label="201" :value="201" />
                  <el-option label="202" :value="202" />
                  <el-option label="204" :value="204" />
                  <el-option label="301" :value="301" />
                  <el-option label="302" :value="302" />
                </el-select>
                <div class="form-tip">默认: [200, 302]</div>
              </el-form-item>
              <el-form-item label="连续成功次数" prop="checks.active.healthy.successes">
                <el-input-number
                  v-model="form.checks.active.healthy.successes"
                  :min="1"
                  :max="254"
                  style="width: 100%"
                />
                <div class="form-tip">连续成功次数达到此值，节点被标记为健康，默认 2</div>
              </el-form-item>
              <el-divider>非健康节点配置</el-divider>
              <el-form-item label="检测间隔" prop="checks.active.unhealthy.interval">
                <el-input-number
                  v-model="form.checks.active.unhealthy.interval"
                  :min="1"
                  :max="3600"
                  style="width: 100%"
                />
                <div class="form-tip">单位：秒，默认 1 秒</div>
              </el-form-item>
              <el-form-item label="连续失败次数" prop="checks.active.unhealthy.http_failures">
                <el-input-number
                  v-model="form.checks.active.unhealthy.http_failures"
                  :min="1"
                  :max="254"
                  style="width: 100%"
                  v-if="form.checks.active.type === 'http' || form.checks.active.type === 'https'"
                />
                <el-input-number
                  v-model="form.checks.active.unhealthy.tcp_failures"
                  :min="1"
                  :max="254"
                  style="width: 100%"
                  v-if="form.checks.active.type === 'tcp'"
                />
                <div class="form-tip">连续失败次数达到此值，节点被标记为不健康，默认 3</div>
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
import { Plus, Delete } from '@element-plus/icons-vue'
import { upstreamApi } from '../utils/api'
import { formatTimestamp } from '../utils/format'

const loading = ref(false)
const upstreamList = ref([])
const dialogVisible = ref(false)
const dialogTitle = ref('添加上游')
const isEdit = ref(false)
const formRef = ref(null)
const nodeList = ref([{ host: '', weight: 100 }])
const activeTab = ref('basic')
const enableHealthCheck = ref(false)
const labelsInput = ref('')

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
  type: 'roundrobin',
  scheme: 'http',
  nodes: {},
  labels: {},
  timeout: {
    connect: 3,
    send: 6,
    read: 6
  },
  pass_host: 'pass',
  upstream_host: undefined,
  checks: {
    active: {
      type: 'http',
      http_path: '/',
      host: '',
      port: undefined,
      timeout: 1,
      healthy: {
        interval: 1,
        http_statuses: [200, 302],
        successes: 2
      },
      unhealthy: {
        interval: 1,
        http_failures: 3,
        tcp_failures: 3
      }
    }
  }
})

// 生成随机 ID
const generateRandomId = () => {
  return 'upstream_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9)
}

const rules = {
  name: [
    { required: true, message: '请输入上游服务名称', trigger: 'blur' }
  ],
  type: [{ required: true, message: '请选择负载均衡类型', trigger: 'blur' }]
}

const handleLabelsInput = () => {
  if (labelsInput.value) {
    const labels = {}
    labelsInput.value.split(',').forEach(item => {
      const [key, value] = item.trim().split(':')
      if (key && value) {
        labels[key.trim()] = value.trim()
      }
    })
    form.value.labels = Object.keys(labels).length > 0 ? labels : undefined
  } else {
    form.value.labels = undefined
  }
}

const loadData = async () => {
  loading.value = true
  try {
    const response = await upstreamApi.list({
      page: pagination.value.page,
      page_size: pagination.value.pageSize
    })
    const data = response.data
    if (data.list) {
      upstreamList.value = data.list.map(item => ({
        ...item.value,
        id: item.value.id || item.key,
        create_time: item.value.create_time || item.create_time,
        update_time: item.value.update_time || item.update_time || 0
      }))
      pagination.value.total = data.total || 0
    } else {
      upstreamList.value = []
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

const addNode = () => {
  nodeList.value.push({ host: '', weight: 100 })
}

const removeNode = (index) => {
  nodeList.value.splice(index, 1)
}

const handleAdd = () => {
  dialogTitle.value = '添加上游'
  isEdit.value = false
  form.value = {
    id: generateRandomId(),
    name: '',
    desc: '',
    type: 'roundrobin',
    scheme: 'http',
    nodes: {},
    labels: undefined,
    timeout: {
      connect: 3,
      send: 6,
      read: 6
    },
    pass_host: 'pass',
    upstream_host: undefined,
    hash_on: undefined,
    key: undefined,
    retries: 0,
    retry_timeout: 6,
    keepalive_pool: {
      size: 320,
      idle_timeout: 60,
      requests: 1000
    },
    checks: {
      active: {
        type: 'http',
        http_path: '/',
        host: '',
        port: undefined,
        timeout: 1,
        healthy: {
          interval: 1,
          http_statuses: [200, 302],
          successes: 2
        },
        unhealthy: {
          interval: 1,
          http_failures: 3,
          tcp_failures: 3
        }
      }
    }
  }
  nodeList.value = [{ host: '', weight: 100 }]
  labelsInput.value = ''
  enableHealthCheck.value = false
  activeTab.value = 'basic'
  dialogVisible.value = true
}

const handleEdit = (row) => {
  dialogTitle.value = '编辑上游'
  isEdit.value = true
  form.value = {
    id: row.id,
    name: row.name || '',
    desc: row.desc || '',
    type: row.type || 'roundrobin',
    scheme: row.scheme || 'http',
    nodes: row.nodes || {},
    labels: row.labels || {},
    timeout: row.timeout || {
      connect: 3,
      send: 6,
      read: 6
    },
    pass_host: row.pass_host || 'pass',
    upstream_host: row.upstream_host || undefined,
    hash_on: row.hash_on || undefined,
    key: row.key || undefined,
    retries: row.retries !== undefined ? row.retries : 0,
    retry_timeout: row.retry_timeout !== undefined ? row.retry_timeout : 6,
    keepalive_pool: row.keepalive_pool || {
      size: 320,
      idle_timeout: 60,
      requests: 1000
    },
    checks: row.checks || {
      active: {
        type: 'http',
        http_path: '/',
        host: '',
        timeout: 1,
        healthy: {
          interval: 1,
          http_statuses: [200, 302],
          successes: 2
        },
        unhealthy: {
          interval: 1,
          http_failures: 3,
          tcp_failures: 3
        }
      }
    }
  }
  
  // 转换 nodes 对象为数组
  nodeList.value = Object.entries(row.nodes || {}).map(([host, weight]) => ({
    host,
    weight: typeof weight === 'number' ? weight : 100
  }))
  
  if (nodeList.value.length === 0) {
    nodeList.value = [{ host: '', weight: 100 }]
  }

  // 处理标签
  if (row.labels && Object.keys(row.labels).length > 0) {
    labelsInput.value = Object.entries(row.labels)
      .map(([key, value]) => `${key}:${value}`)
      .join(', ')
  } else {
    labelsInput.value = ''
  }

  // 检查是否启用了健康检测
  enableHealthCheck.value = !!(row.checks?.active)
  
  // 加载健康检测配置
  if (row.checks?.active) {
    form.value.checks.active.type = row.checks.active.type || 'http'
    form.value.checks.active.timeout = row.checks.active.timeout || 1
    form.value.checks.active.http_path = row.checks.active.http_path || '/'
    form.value.checks.active.host = row.checks.active.host || ''
    form.value.checks.active.port = row.checks.active.port || undefined
    
    if (row.checks.active.healthy) {
      form.value.checks.active.healthy = {
        interval: row.checks.active.healthy.interval || 1,
        http_statuses: row.checks.active.healthy.http_statuses || [200, 302],
        successes: row.checks.active.healthy.successes || 2
      }
    } else {
      form.value.checks.active.healthy = {
        interval: 1,
        http_statuses: [200, 302],
        successes: 2
      }
    }
    
    if (row.checks.active.unhealthy) {
      form.value.checks.active.unhealthy = {
        interval: row.checks.active.unhealthy.interval || 1,
        http_failures: row.checks.active.unhealthy.http_failures || 3,
        tcp_failures: row.checks.active.unhealthy.tcp_failures || 3
      }
    } else {
      form.value.checks.active.unhealthy = {
        interval: 1,
        http_failures: 3,
        tcp_failures: 3
      }
    }
  } else {
    // 确保健康检测配置完整（默认值）
    if (!form.value.checks.active.healthy) {
      form.value.checks.active.healthy = {
        interval: 1,
        http_statuses: [200, 302],
        successes: 2
      }
    }
    if (!form.value.checks.active.unhealthy) {
      form.value.checks.active.unhealthy = {
        interval: 1,
        http_failures: 3,
        tcp_failures: 3
      }
    }
  }
  
  activeTab.value = 'basic'
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return
  
  // 先验证表单基本字段
  try {
    await formRef.value.validate()
  } catch (error) {
    // 表单验证失败，不继续执行
    return
  }

  // 验证节点配置
  const nodes = {}
  for (const node of nodeList.value) {
    if (!node.host || !node.host.trim()) {
      ElMessage.warning('请填写所有节点的地址')
      return
    }
    const host = node.host.trim()
    const weight = parseInt(node.weight) || 100
    if (weight < 1 || weight > 1000) {
      ElMessage.warning('节点权重必须在 1-1000 之间')
      return
    }
    nodes[host] = weight
  }

  if (Object.keys(nodes).length === 0) {
    ElMessage.warning('请至少添加一个节点')
    return
  }

  // 验证一致性哈希配置
  if (form.value.type === 'chash') {
    if (!form.value.hash_on) {
      ElMessage.warning('选择一致性哈希时，必须配置哈希对象 (hash_on)')
      return
    }
    if (!form.value.key || !form.value.key.trim()) {
      ElMessage.warning('选择一致性哈希时，必须配置哈希键 (key)')
      return
    }
  }

  try {
    const upstreamData = {
      id: form.value.id,
      name: form.value.name,
      desc: form.value.desc || undefined,
      type: form.value.type,
      nodes: nodes
    }

    // 添加协议类型
    if (form.value.scheme) {
      upstreamData.scheme = form.value.scheme
    }

    // 添加标签
    if (form.value.labels && Object.keys(form.value.labels).length > 0) {
      upstreamData.labels = form.value.labels
    }

      // 添加超时配置
      if (form.value.timeout) {
        upstreamData.timeout = form.value.timeout
      }

      // 添加重试配置
      if (form.value.retries !== undefined) {
        upstreamData.retries = form.value.retries
      }
      if (form.value.retry_timeout !== undefined) {
        upstreamData.retry_timeout = form.value.retry_timeout
      }

      // 添加一致性哈希配置
      if (form.value.type === 'chash') {
        if (form.value.hash_on) {
          upstreamData.hash_on = form.value.hash_on
        }
        if (form.value.key) {
          upstreamData.key = form.value.key
        }
      }

      // 添加 pass_host 和 upstream_host 配置
      if (form.value.pass_host) {
        upstreamData.pass_host = form.value.pass_host
      }
      if (form.value.pass_host === 'rewrite' && form.value.upstream_host) {
        upstreamData.upstream_host = form.value.upstream_host
      }

      // 添加连接池配置
      if (form.value.keepalive_pool) {
        upstreamData.keepalive_pool = {
          size: form.value.keepalive_pool.size || 320,
          idle_timeout: form.value.keepalive_pool.idle_timeout || 60,
          requests: form.value.keepalive_pool.requests || 1000
        }
      }

      // 添加健康检测配置（使用 checks 字段）
      if (enableHealthCheck.value) {
        const checksConfig = {
          active: {
            type: form.value.checks.active.type || 'http', // 添加检测类型
            timeout: form.value.checks.active.timeout || 1,
            healthy: {
              interval: form.value.checks.active.healthy.interval || 1,
              successes: form.value.checks.active.healthy.successes || 2
            },
            unhealthy: {
              interval: form.value.checks.active.unhealthy.interval || 1
            }
          }
        }

        // 通用配置：host（所有类型都支持）
        if (form.value.checks.active.host && form.value.checks.active.host.trim()) {
          checksConfig.active.host = form.value.checks.active.host.trim()
        }

        // HTTP/HTTPS 特定配置
        if (form.value.checks.active.type === 'http' || form.value.checks.active.type === 'https') {
          checksConfig.active.http_path = form.value.checks.active.http_path || '/'
          checksConfig.active.healthy.http_statuses = form.value.checks.active.healthy.http_statuses || [200, 302]
          checksConfig.active.unhealthy.http_failures = form.value.checks.active.unhealthy.http_failures || 3
        } else if (form.value.checks.active.type === 'tcp') {
          // TCP 特定配置
          if (form.value.checks.active.port) {
            checksConfig.active.port = form.value.checks.active.port
          }
          checksConfig.active.unhealthy.tcp_failures = form.value.checks.active.unhealthy.tcp_failures || 3
        }

        upstreamData.checks = checksConfig
      }

      if (dialogTitle.value === '添加上游') {
        await upstreamApi.create(form.value.id, upstreamData)
        ElMessage.success('添加成功')
      } else {
        await upstreamApi.update(form.value.id, upstreamData)
        ElMessage.success('更新成功')
      }
    dialogVisible.value = false
    loadData()
  } catch (error) {
    // 错误消息已由拦截器自动显示
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除这个上游吗？', '提示', {
      type: 'warning'
    })
    await upstreamApi.delete(row.id)
    ElMessage.success('删除成功')
    loadData()
  } catch (error) {
    // 错误消息已由拦截器自动显示
  }
}

const resetForm = () => {
  formRef.value?.resetFields()
  nodeList.value = [{ host: '', weight: 100 }]
  labelsInput.value = ''
  enableHealthCheck.value = false
  activeTab.value = 'basic'
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.upstream-page {
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

:deep(.el-tabs__content) {
  padding: 20px;
}

:deep(.el-form-item) {
  margin-bottom: 20px;
}
</style>
