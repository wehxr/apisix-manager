<template>
  <div class="route-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>路由管理</span>
          <el-button type="primary" @click="handleAdd" class="create-btn">
            <el-icon><Plus /></el-icon>
            <span class="btn-text">创建路由</span>
          </el-button>
        </div>
      </template>

      <div class="table-wrapper">
        <el-table :data="routeList" v-loading="loading" style="width: 100%">
        <el-table-column prop="name" label="名称" width="150" />
        <el-table-column prop="uris" label="路径" min-width="150">
          <template #default="{ row }">
            <span v-if="!row.uris || row.uris.length === 0" style="color: #909399">-</span>
            <div v-else style="display: flex; flex-direction: column; gap: 4px;">
              <el-tag
                v-for="uri in (row.uris || [])"
                :key="uri"
                size="small"
                style="width: fit-content;"
              >
                {{ uri }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="hosts" label="域名" min-width="180">
          <template #default="{ row }">
            <span v-if="!row.hosts || row.hosts.length === 0" style="color: #909399">全部</span>
            <div v-else style="display: flex; flex-direction: column; gap: 4px;">
              <el-tag
                v-for="host in (row.hosts || [])"
                :key="host"
                size="small"
                style="width: fit-content;"
              >
                {{ host }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="methods" label="HTTP 方法" width="180">
          <template #default="{ row }">
            <div style="display: flex; flex-wrap: wrap; gap: 4px;">
              <el-tag
                v-if="!row.methods || row.methods.length === 0 || isAllMethodsSelected(row.methods)"
                size="small"
              >
                全部
              </el-tag>
              <el-tag
                v-else
                v-for="method in (row.methods || [])"
                :key="method"
                size="small"
                type="primary"
              >
                {{ method }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="upstream_id" label="上游服务" width="200">
          <template #default="{ row }">
            <el-tag size="small" v-if="row.upstream_id">
              {{ getUpstreamName(row.upstream_id) || row.upstream_id }}
              </el-tag>
            <span v-else style="color: #909399">-</span>
          </template>
        </el-table-column>

        <el-table-column prop="plugins" label="插件" min-width="250">
          <template #default="{ row }">
            <div style="display: flex; flex-wrap: wrap; gap: 4px;">
              <template v-if="row.plugins" v-for="(plugin, key) in row.plugins" :key="key">
                <el-tag
                  v-if="isPluginEnabled(plugin, key, row.plugins) && key !== 'consumer-restriction'"
                  size="small"
                >
                  {{ getPluginName(key) }}
                </el-tag>
              </template>
              <span v-if="!row.plugins || !Object.keys(row.plugins || {}).some(key => key !== 'consumer-restriction' && isPluginEnabled(row.plugins[key], key, row.plugins))" style="color: #909399">-</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'primary' : 'info'" size="small">
              {{ row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
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
        <el-table-column label="操作" width="220" fixed="right" class-name="action-column">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button size="small" @click="handleEdit(row)">编辑</el-button>
              <el-dropdown @command="(command) => handlePluginCommand(row, command)" trigger="click">
                <el-button size="small">
                  插件<el-icon class="el-icon--right"><arrow-down /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item 
                      v-for="(name, key) in PLUGIN_NAMES" 
                      :key="key" 
                      :command="key"
                    >
                      {{ name }}
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              <el-dropdown @command="(command) => handleActionCommand(row, command)" trigger="click">
                <el-button size="small">
                  更多<el-icon class="el-icon--right"><arrow-down /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="copy">复制</el-dropdown-item>
                    <el-dropdown-item 
                      :command="row.status === 1 ? 'disable' : 'enable'"
                      :style="row.status === 1 ? 'color:#e71414;' : ''"
                    >
                      {{ row.status === 1 ? '禁用' : '启用' }}
                    </el-dropdown-item>
                    <el-dropdown-item style="color:#e71414;" command="delete">删除</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
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

    <!-- 添加/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      :width="dialogWidth"
      @close="resetForm"
    >
      <RouteForm
        ref="formRef"
        :model-value="form"
        @update:model-value="handleFormUpdate"
        @submit="handleSubmit"
      />
    </el-dialog>

    <!-- 插件配置对话框 -->
    <el-dialog
      v-model="pluginDialogVisible"
      :title="pluginDialogTitle"
      :width="dialogWidth"
      @close="resetPluginForm"
    >
      <component
        v-if="currentPluginComponent"
        :is="currentPluginComponent"
        :model-value="currentPluginConfig"
        @update:model-value="handlePluginConfigUpdate"
      />
      <template #footer>
        <el-button @click="pluginDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSavePlugin">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, ArrowDown } from '@element-plus/icons-vue'
import { routeApi, upstreamApi, pluginConfigApi } from '../utils/api'
import { formatTimestamp, getDialogWidth } from '../utils/format'
import { isPluginEnabled, getPluginName, PLUGIN_NAMES } from '../utils/plugin'
import { generateId } from '../utils/id'

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
import RouteForm from '../components/RouteForm/RouteForm.vue'
import RouteFormBasicAuth from '../components/RouteForm/RouteFormBasicAuth.vue'
import RouteFormIpRestriction from '../components/RouteForm/RouteFormIpRestriction.vue'
import RouteFormCors from '../components/RouteForm/RouteFormCors.vue'
import RouteFormRealIp from '../components/RouteForm/RouteFormRealIp.vue'
import RouteFormRedirect from '../components/RouteForm/RouteFormRedirect.vue'
import RouteFormLimitReq from '../components/RouteForm/RouteFormLimitReq.vue'
import RouteFormLimitCount from '../components/RouteForm/RouteFormLimitCount.vue'
import RouteFormLimitConn from '../components/RouteForm/RouteFormLimitConn.vue'
import RouteFormProxyCache from '../components/RouteForm/RouteFormProxyCache.vue'
import RouteFormClientControl from '../components/RouteForm/RouteFormClientControl.vue'
import RouteFormUriBlocker from '../components/RouteForm/RouteFormUriBlocker.vue'
import RouteFormApiBreaker from '../components/RouteForm/RouteFormApiBreaker.vue'
import RouteFormGzip from '../components/RouteForm/RouteFormGzip.vue'
import RouteFormRequestId from '../components/RouteForm/RouteFormRequestId.vue'
import RouteFormProxyRewrite from '../components/RouteForm/RouteFormProxyRewrite.vue'

const loading = ref(false)
const routeList = ref([])
const upstreamList = ref([])
const dialogVisible = ref(false)
const dialogTitle = ref('创建路由')
const formRef = ref(null)
const pluginDialogVisible = ref(false)
const pluginDialogTitle = ref('配置插件')
const currentRouteId = ref('')
const currentPluginType = ref('')
const currentPluginConfig = ref({})
const currentPluginComponent = ref(null)

// 分页配置
const pagination = ref({
  page: 1,
  pageSize: 10,
  total: 0
})

const form = ref({
  id: '',
  name: '',
  uris: [],
  hosts: [],
  methods: [],
  priority: 0,
  upstream_id: '',
  desc: '',
  status: 1,
  enable_websocket: false,
  labels: {},
  timeout: {
    connect: 3,
    send: 3,
    read: 3
  }
})

// 根据 upstream_id 获取上游服务名称
const getUpstreamName = (upstreamId) => {
  const upstream = upstreamList.value.find(item => item.id === upstreamId)
  return upstream?.name || ''
}



// 处理表单更新
const handleFormUpdate = (value) => {
  form.value = { ...value }
}

// 处理操作下拉菜单命令
const handleActionCommand = (row, command) => {
  if (command === 'copy') {
    handleCopy(row)
  } else if (command === 'enable' || command === 'disable') {
    handleToggleStatus(row, command)
  } else if (command === 'delete') {
    handleDelete(row)
  }
}

// 处理插件下拉菜单命令
const handlePluginCommand = (row, command) => {
  handleConfigPlugin(row, command)
}

// 判断是否所有 HTTP 方法都被选中
const isAllMethodsSelected = (methods) => {
  if (!methods || methods.length === 0) return true
  const allMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'CONNECT', 'TRACE']
  return allMethods.every(method => methods.includes(method))
}

// 动态计算对话框宽度（根据屏幕宽度）
const dialogWidth = computed(() => getDialogWidth())

// 配置单个插件
const handleConfigPlugin = async (row, pluginType) => {
  // 先设置基本状态，确保对话框能打开
  currentRouteId.value = row.id
  currentPluginType.value = pluginType
  
  // 组件映射
  const pluginComponents = {
    'request-id': RouteFormRequestId,
    'basic-auth': RouteFormBasicAuth,
    'ip-restriction': RouteFormIpRestriction,
    'cors': RouteFormCors,
    'real-ip': RouteFormRealIp,
    'redirect': RouteFormRedirect,
    'limit-req': RouteFormLimitReq,
    'limit-count': RouteFormLimitCount,
    'limit-conn': RouteFormLimitConn,
    'proxy-cache': RouteFormProxyCache,
    'client-control': RouteFormClientControl,
    'uri-blocker': RouteFormUriBlocker,
    'api-breaker': RouteFormApiBreaker,
    'gzip': RouteFormGzip,
    'proxy-rewrite': RouteFormProxyRewrite
  }
  
  // 验证 pluginType 是否有效
  if (!pluginComponents[pluginType]) {
    ElMessage.warning(`未知的插件类型: ${pluginType}`)
    return
  }
  
  pluginDialogTitle.value = PLUGIN_NAMES[pluginType] || '配置插件'
  currentPluginComponent.value = pluginComponents[pluginType]
  
  // 直接从 row 对象获取 plugin_config_id（loadData 中已经加载了）
  let pluginConfigId = row.plugin_config_id || null
  
  // 先设置配置，确保对话框能立即打开
  currentPluginConfig.value = {
    plugin_config_id: pluginConfigId
  }
  
  // 如果没有 plugin_config_id，创建一个空的 Plugin Config
  if (!pluginConfigId) {
    try {
      pluginConfigId = generateId('plugin_config')
      await pluginConfigApi.create(pluginConfigId, {
        plugins: {}
      })
      
      // 更新路由，关联 plugin_config_id（只需要更新 plugin_config_id 字段）
      await routeApi.update(row.id, {
        plugin_config_id: pluginConfigId
      })
      
      // 更新 row 对象中的 plugin_config_id，避免下次还需要创建
      row.plugin_config_id = pluginConfigId
      
      // 更新配置
      currentPluginConfig.value = {
        plugin_config_id: pluginConfigId
      }
    } catch (error) {
      // 如果创建失败，仍然继续，但会传递 null
      console.warn('创建 Plugin Config 失败:', error)
      // 即使创建失败，也继续打开对话框
      currentPluginConfig.value = {
        plugin_config_id: null
      }
    }
  }
  
  // 确保对话框总是打开
  pluginDialogVisible.value = true
}

// 处理插件配置更新
const handlePluginConfigUpdate = (value) => {
  // 子组件会返回更新后的 plugins
  currentPluginConfig.value = {
    plugin_config_id: currentPluginConfig.value.plugin_config_id,
    plugins: value.plugins || {}
  }
}

// 统一的保存逻辑（使用 plugin_config_id）
const handleSavePlugin = async () => {
  try {
    // 获取当前路由信息
    const routeRes = await routeApi.get(currentRouteId.value)
    const routeData = routeRes.data?.value || routeRes.data || {}
    
    // 获取更新后的插件配置（子组件已经处理好了）
    const updatedPlugins = currentPluginConfig.value.plugins || {}
    
    // 特殊处理：proxy-cache 插件，清理空数组字段
    if (updatedPlugins['proxy-cache']) {
      const proxyCache = updatedPlugins['proxy-cache']
      if (Array.isArray(proxyCache.cache_bypass) && proxyCache.cache_bypass.length === 0) {
        delete proxyCache.cache_bypass
      }
      if (Array.isArray(proxyCache.no_cache) && proxyCache.no_cache.length === 0) {
        delete proxyCache.no_cache
      }
    }
    
    // 特殊处理：basic-auth 可能关联 consumer-restriction
    if (currentPluginType.value === 'basic-auth' && !updatedPlugins['consumer-restriction']) {
      delete updatedPlugins['consumer-restriction']
    }
    
    // 清理空插件配置
    const cleanedPlugins = {}
    Object.keys(updatedPlugins).forEach(pluginName => {
      const pluginConfig = updatedPlugins[pluginName]
      if (pluginConfig) {
        const keys = Object.keys(pluginConfig)
        // 特殊处理：basic-auth 即使为空对象也要保留
        if (pluginName === 'basic-auth') {
          cleanedPlugins[pluginName] = {}
          return
        }
        // 过滤掉只有 _meta.disable 的配置
        if (keys.length === 1 && keys[0] === '_meta' && pluginConfig._meta?.disable === true) {
          return
        }
        // 过滤掉空对象（除了 basic-auth）
        if (keys.length === 0) {
          return
        }
        cleanedPlugins[pluginName] = { ...pluginConfig }
      }
    })
    
    // 获取或创建 Plugin Config ID
    let pluginConfigId = currentPluginConfig.value.plugin_config_id || routeData.plugin_config_id
    
    if (!pluginConfigId) {
      pluginConfigId = generateId('plugin_config')
    }
    
    // 更新或创建 Plugin Config
    const pluginConfigData = { plugins: cleanedPlugins }
    
    try {
      await pluginConfigApi.get(pluginConfigId)
      await pluginConfigApi.update(pluginConfigId, pluginConfigData)
    } catch (error) {
      await pluginConfigApi.create(pluginConfigId, pluginConfigData)
    }
    
    // 更新路由的 plugin_config_id
    const allowedFields = ['id', 'name', 'uris', 'hosts', 'methods', 'priority', 'status', 
                           'enable_websocket', 'timeout', 'upstream_id', 'desc', 'vars', 'labels']
    const cleanRouteData = {}
    allowedFields.forEach(key => {
      if (routeData[key] !== undefined) {
        cleanRouteData[key] = routeData[key]
      }
    })
    cleanRouteData.plugin_config_id = pluginConfigId

    await routeApi.update(currentRouteId.value, cleanRouteData)
    ElMessage.success('插件配置更新成功')
    pluginDialogVisible.value = false
    loadData()
  } catch (error) {
    // 错误消息已由拦截器自动显示
  }
}

// 重置插件表单
const resetPluginForm = () => {
  currentPluginType.value = ''
  currentPluginConfig.value = {}
  currentPluginComponent.value = null
}

// 加载上游服务列表
const loadUpstreamList = async () => {
  try {
    const upstreamRes = await upstreamApi.list()
    const upstreamData = upstreamRes.data
    if (upstreamData.list) {
      upstreamList.value = upstreamData.list.map(item => {
        const value = item.value || {}
        let id = value.id
        if (!id && item.key) {
          // 从 key 中提取 ID，格式通常是 /apisix/upstreams/{id}
          const parts = item.key.split('/')
          id = parts[parts.length - 1]
        }
        return {
          ...value,
          id: id || item.key
        }
      })
    } else {
      upstreamList.value = []
    }
  } catch (error) {
    // 错误消息已由拦截器自动显示
    upstreamList.value = []
  }
}

const loadData = async () => {
  loading.value = true
  try {
    const [routeRes, upstreamRes] = await Promise.all([
      routeApi.list({
        page: pagination.value.page,
        page_size: pagination.value.pageSize
      }),
      upstreamApi.list()
    ])

    // 处理路由列表
    const routeData = routeRes.data
    if (routeData.list) {
      // 为每个路由加载 Plugin Config
      const routesWithPlugins = await Promise.all(
        routeData.list.map(async (item) => {
          const route = {
            ...item.value,
            id: item.value.id || item.key,
            create_time: item.value.create_time || item.create_time,
            update_time: item.value.update_time || item.update_time || 0,
            plugins: {}
          }
          
          // 如果有 plugin_config_id，加载 Plugin Config
          if (route.plugin_config_id) {
            try {
              const pluginConfigRes = await pluginConfigApi.get(route.plugin_config_id)
              const pluginConfigData = pluginConfigRes.data?.value || pluginConfigRes.data || {}
              route.plugins = pluginConfigData.plugins || {}
            } catch (error) {
              // 如果加载失败，保持 plugins 为空对象
            }
          }
          
          return route
        })
      )
      
      routeList.value = routesWithPlugins
      pagination.value.total = routeData.total || 0
    } else {
      routeList.value = []
      pagination.value.total = 0
    }

    // 处理上游列表
    const upstreamData = upstreamRes.data
    if (upstreamData.list) {
      upstreamList.value = upstreamData.list.map(item => {
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
      upstreamList.value = []
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

const handleAdd = async () => {
  dialogTitle.value = '创建路由'
  form.value = {
    id: generateId('route'),
    name: '',
    uris: [],
    hosts: [],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'CONNECT', 'TRACE'],
    priority: 0,
    status: 1,
    enable_websocket: false,
    labels: {},
    timeout: {
      connect: 3,
      send: 3,
      read: 3
    },
    upstream_id: '',
    desc: ''
  }
  
  // 确保上游服务列表已加载
  if (upstreamList.value.length === 0) {
    await loadUpstreamList()
  }
  
  // 重置表单和步骤
  formRef.value?.resetFields()
  
  dialogVisible.value = true
}

const handleEdit = async (row) => {
  dialogTitle.value = '编辑路由'
  // 获取路由详情
  try {
    const routeRes = await routeApi.get(row.id)
    const routeData = routeRes.data?.value || routeRes.data || {}
    
    form.value = {
      id: routeData.id || row.id,
      name: routeData.name || '',
      uris: routeData.uris || row.uris || [],
      hosts: routeData.hosts || row.hosts || [],
      methods: routeData.methods || row.methods || [],
      priority: routeData.priority !== undefined ? routeData.priority : (row.priority !== undefined ? row.priority : 0),
      status: routeData.status !== undefined ? routeData.status : (row.status !== undefined ? row.status : 1),
      enable_websocket: routeData.enable_websocket || row.enable_websocket || false,
      labels: routeData.labels || row.labels || {},
      timeout: routeData.timeout || row.timeout || {
        connect: 3,
        send: 3,
        read: 3
      },
      upstream_id: routeData.upstream_id || row.upstream_id || '',
      desc: routeData.desc || row.desc || '',
      vars: routeData.vars || row.vars || undefined
    }
  } catch (error) {
    // 如果获取详情失败，使用 row 数据
    form.value = {
      id: row.id,
      name: row.name || '',
      uris: row.uris || [],
      hosts: row.hosts || [],
      methods: row.methods || [],
      priority: row.priority !== undefined ? row.priority : 0,
      status: row.status !== undefined ? row.status : 1,
      enable_websocket: row.enable_websocket || false,
      labels: row.labels || {},
      timeout: row.timeout || {
        connect: 3,
        send: 3,
        read: 3
      },
      upstream_id: row.upstream_id || '',
      desc: row.desc || '',
      vars: row.vars || undefined
    }
  }
  
  // 确保上游服务列表已加载
  if (upstreamList.value.length === 0) {
    await loadUpstreamList()
  }
  
  // 重置表单和步骤（编辑时也重置到第一步）
  formRef.value?.resetFields()
  
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return
  
  // 子组件已经验证过表单，这里直接处理提交逻辑
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
        desc: form.value.desc || undefined
      }

      // 添加标签
      if (form.value.labels && Object.keys(form.value.labels).length > 0) {
        routeData.labels = form.value.labels
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

      // 配置 vars 高级匹配规则（如果存在）
      if (form.value.vars && Array.isArray(form.value.vars) && form.value.vars.length > 0) {
        routeData.vars = form.value.vars
      }
      
      // 如果是编辑模式，保留已有的 plugin_config_id
      if (dialogTitle.value === '编辑路由') {
        try {
          const currentRoute = await routeApi.get(form.value.id)
          const currentRouteData = currentRoute.data?.value || currentRoute.data || {}
          if (currentRouteData.plugin_config_id) {
            routeData.plugin_config_id = currentRouteData.plugin_config_id
          }
        } catch (error) {
          // 如果获取失败，忽略错误，继续创建
        }
      }

      if (dialogTitle.value === '创建路由') {
        await routeApi.create(form.value.id, routeData)
        
        // 创建路由后，默认创建一个空的 Plugin Config
        try {
          const pluginConfigId = generateId('plugin_config')
          await pluginConfigApi.create(pluginConfigId, {
            plugins: {}
          })
          
          // 更新路由，关联 plugin_config_id
          const updateRouteData = { ...routeData }
          updateRouteData.plugin_config_id = pluginConfigId
          await routeApi.update(form.value.id, updateRouteData)
        } catch (error) {
          // 如果创建 Plugin Config 失败，不影响路由创建，只记录错误
          console.warn('创建默认 Plugin Config 失败:', error)
        }
        
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
}

const handleCopy = async (row) => {
  try {
    // 获取路由详情
    const routeRes = await routeApi.get(row.id)
    const routeData = routeRes.data?.value || routeRes.data || {}
    
    // 生成新的路由ID
    const newRouteId = generateId('route')
    
    // 准备复制数据，移除禁止的字段
    const allowedFields = ['name', 'uris', 'hosts', 'methods', 'priority', 'status', 
                           'enable_websocket', 'timeout', 'upstream_id', 'desc', 'vars', 'labels']
    const copyData = {
      id: newRouteId
    }
    
    allowedFields.forEach(key => {
      if (routeData[key] !== undefined) {
        if (typeof routeData[key] === 'object' && routeData[key] !== null && !Array.isArray(routeData[key])) {
          copyData[key] = JSON.parse(JSON.stringify(routeData[key]))
        } else if (Array.isArray(routeData[key])) {
          copyData[key] = [...routeData[key]]
        } else {
          copyData[key] = routeData[key]
        }
      }
    })
    
    // 处理 plugin_config_id：如果有，创建新的 Plugin Config 并复制插件配置
    if (routeData.plugin_config_id) {
      try {
        const pluginConfigRes = await pluginConfigApi.get(routeData.plugin_config_id)
        const pluginConfigData = pluginConfigRes.data?.value || pluginConfigRes.data || {}
        const newPluginConfigId = generateId('plugin_config')
        await pluginConfigApi.create(newPluginConfigId, {
          plugins: pluginConfigData.plugins ? JSON.parse(JSON.stringify(pluginConfigData.plugins)) : {}
        })
        copyData.plugin_config_id = newPluginConfigId
      } catch (error) {
        // 如果获取 Plugin Config 失败，仍然创建一个空的 Plugin Config
        try {
          const newPluginConfigId = generateId('plugin_config')
          await pluginConfigApi.create(newPluginConfigId, {
            plugins: {}
          })
          copyData.plugin_config_id = newPluginConfigId
        } catch (createError) {
          // 如果创建也失败，忽略错误
        }
      }
    } else {
      // 如果原路由没有 plugin_config_id，创建一个空的 Plugin Config
      try {
        const newPluginConfigId = generateId('plugin_config')
        await pluginConfigApi.create(newPluginConfigId, {
          plugins: {}
        })
        copyData.plugin_config_id = newPluginConfigId
      } catch (error) {
        // 如果创建失败，忽略错误
      }
    }
    
    // 修改路由名称，添加"副本"后缀
    if (copyData.name) {
      copyData.name = copyData.name + ' - 副本'
    } else {
      copyData.name = '路由副本'
    }
    
    // 创建新路由
    await routeApi.create(newRouteId, copyData)
    ElMessage.success('复制成功')
    loadData()
  } catch (error) {
    // 如果获取详情失败，使用 row 数据
    try {
      const newRouteId = generateId('route')
      const copyData = {
        id: newRouteId,
        name: (row.name || '路由') + ' - 副本',
        uris: row.uris ? [...row.uris] : [],
        hosts: row.hosts ? [...row.hosts] : [],
        methods: row.methods ? [...row.methods] : [],
        priority: row.priority !== undefined ? row.priority : 0,
        status: row.status !== undefined ? row.status : 1,
        enable_websocket: row.enable_websocket || false,
        timeout: row.timeout ? { ...row.timeout } : {
          connect: 3,
          send: 3,
          read: 3
        },
        upstream_id: row.upstream_id || '',
        desc: row.desc || '',
        vars: row.vars ? JSON.parse(JSON.stringify(row.vars)) : undefined
      }
      
      // 处理 plugin_config_id：如果有，创建新的 Plugin Config
      if (row.plugin_config_id) {
        try {
          const pluginConfigRes = await pluginConfigApi.get(row.plugin_config_id)
          const pluginConfigData = pluginConfigRes.data?.value || pluginConfigRes.data || {}
          const newPluginConfigId = generateId('plugin_config')
          await pluginConfigApi.create(newPluginConfigId, {
            plugins: pluginConfigData.plugins ? JSON.parse(JSON.stringify(pluginConfigData.plugins)) : {}
          })
          copyData.plugin_config_id = newPluginConfigId
        } catch (error) {
          // 如果获取 Plugin Config 失败，仍然创建一个空的 Plugin Config
          try {
            const newPluginConfigId = generateId('plugin_config')
            await pluginConfigApi.create(newPluginConfigId, {
              plugins: {}
            })
            copyData.plugin_config_id = newPluginConfigId
          } catch (createError) {
            // 如果创建也失败，忽略错误
          }
        }
      } else {
        // 如果原路由没有 plugin_config_id，创建一个空的 Plugin Config
        try {
          const newPluginConfigId = generateId('plugin_config')
          await pluginConfigApi.create(newPluginConfigId, {
            plugins: {}
          })
          copyData.plugin_config_id = newPluginConfigId
        } catch (error) {
          // 如果创建失败，忽略错误
        }
      }
      
      await routeApi.create(newRouteId, copyData)
      ElMessage.success('复制成功')
      loadData()
    } catch (error2) {
      // 错误消息已由拦截器自动显示
    }
  }
}

// 切换路由状态（启用/禁用）
const handleToggleStatus = async (row, command) => {
  try {
    const newStatus = command === 'enable' ? 1 : 0
    const statusText = newStatus === 1 ? '启用' : '禁用'
    
    await ElMessageBox.confirm(
      `确定要${statusText}这个路由吗？`,
      '提示',
      {
        type: 'warning'
      }
    )
    
    // 获取路由详情，保留所有字段
    const routeRes = await routeApi.get(row.id)
    const routeData = routeRes.data?.value || routeRes.data || {}
    
    // 准备更新数据，保留所有允许的字段
    const allowedFields = ['id', 'name', 'uris', 'hosts', 'methods', 'priority', 'status', 
                           'enable_websocket', 'timeout', 'upstream_id', 'desc', 'vars', 'labels', 'plugin_config_id']
    const updateData = {}
    
    allowedFields.forEach(key => {
      if (routeData[key] !== undefined) {
        updateData[key] = routeData[key]
      }
    })
    
    // 更新状态
    updateData.status = newStatus
    
    // 更新路由
    await routeApi.update(row.id, updateData)
    ElMessage.success(`${statusText}成功`)
    loadData()
  } catch (error) {
    // 错误消息已由拦截器自动显示（用户取消操作除外）
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除这个路由吗？', '提示', {
      type: 'warning'
    })
    
    // 先获取路由的 plugin_config_id（用于后续删除）
    let pluginConfigId = row.plugin_config_id
    if (!pluginConfigId) {
      try {
        const routeRes = await routeApi.get(row.id)
        const routeData = routeRes.data?.value || routeRes.data || {}
        pluginConfigId = routeData.plugin_config_id
      } catch (error) {
        // 如果获取失败，继续删除路由
      }
    }
    
    // 先删除路由
    await routeApi.delete(row.id)
    
    // 如果路由删除成功，尝试删除关联的 plugin_config_id
    if (pluginConfigId) {
      try {
        // 尝试删除 plugin_config_id，接口会返回是否被其他路由使用的错误信息
        await pluginConfigApi.delete(pluginConfigId)
      } catch (error) {
        // 如果删除失败（比如被其他路由使用），拦截器会自动显示错误信息
        // 这里不阻止流程，因为路由已经删除成功了
      }
    }
    
    // 如果删除成功，显示成功消息并刷新列表
    ElMessage.success('删除成功')
    loadData()
  } catch (error) {
    // 错误消息已由拦截器自动显示（用户取消操作除外）
    // 如果删除路由失败，拦截器会自动显示错误信息
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
.route-page {
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

.action-buttons {
  display: flex;
  gap: 4px;
  align-items: center;
  flex-wrap: wrap;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
  display: block; 
  width: 100%;
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
  overflow-x: auto;
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

  :deep(.action-column) {
    min-width: 180px;
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
