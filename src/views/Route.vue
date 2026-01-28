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
          v-model="filterUri"
          placeholder="搜索路径"
          clearable
          style="width: 200px; margin-left: 12px;"
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
        <el-button @click="handleResetFilter" v-if="filterName || filterUri || filterLabel">
          重置
        </el-button>
      </div>

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
                  v-if="isPluginEnabled(plugin) && key !== 'basic-auth'"
                  size="small"
                >
                  {{ getPluginName(key) }}
                </el-tag>
              </template>
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
                      v-for="pluginKey in availablePlugins" 
                      :key="pluginKey" 
                      :command="pluginKey"
                    >
                      {{ PLUGIN_NAMES[pluginKey] }}
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
    <PluginDialog
      v-model="pluginDialogVisible"
      resource-type="route"
      :resource-id="currentRouteId"
      :plugin-type="currentPluginType"
      :initial-config="{ plugin_config_id: currentPluginConfigId }"
      @saved="handlePluginSaved"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, ArrowDown, Search } from '@element-plus/icons-vue'
import { routeApi, upstreamApi, pluginConfigApi } from '@/utils/api'
import { formatTimestamp, getDialogWidth } from '@/utils/format'
import { isPluginEnabled, getPluginName, PLUGIN_NAMES, getPluginsByResourceType } from '@/utils/plugin'
import { generateId } from '@/utils/id'
import RouteForm from '@/components/RouteForm.vue'
import PluginDialog from '@/components/PluginDialog.vue'

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
const routeList = ref([])
const upstreamList = ref([])
const dialogVisible = ref(false)
const dialogTitle = ref('创建路由')
const formRef = ref(null)
const pluginDialogVisible = ref(false)
const currentRouteId = ref('')
const currentPluginType = ref('')
const currentPluginConfigId = ref(null)

// 过滤条件
const filterName = ref('')
const filterUri = ref('')
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

// 获取可用于 route 类型的插件列表
const availablePlugins = computed(() => {
  return getPluginsByResourceType('route')
})



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
  // 先关闭对话框（如果已打开），确保状态重置
  if (pluginDialogVisible.value) {
    pluginDialogVisible.value = false
    await nextTick()
  }
  
  // 设置所有必要的值
  currentRouteId.value = row.id
  currentPluginConfigId.value = row.plugin_config_id || null
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
    const routeParams = {
      page: pagination.value.page,
      page_size: pagination.value.pageSize
    }
    if (filterName.value) {
      routeParams.name = filterName.value
    }
    if (filterUri.value) {
      routeParams.uri = filterUri.value
    }
    if (filterLabel.value) {
      routeParams.label = filterLabel.value
    }
    
    const [routeRes, upstreamRes] = await Promise.all([
      routeApi.list(routeParams),
      upstreamApi.list()
    ])

    // 处理路由列表
    const routeData = routeRes.data
    if (routeData.list && routeData.list.length > 0) {
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

// 处理过滤
const handleFilter = () => {
  pagination.value.page = 1
  loadData()
}

// 重置过滤
const handleResetFilter = () => {
  filterName.value = ''
  filterUri.value = ''
  filterLabel.value = ''
  pagination.value.page = 1
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
    gap: 12px;
  }

  .filter-wrapper .el-input {
    width: 100% !important;
    margin-left: 0 !important;
    margin-bottom: 0;
  }

  .filter-wrapper .el-button {
    width: 100%;
    margin-left: 0 !important;
    margin-top: 0;
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
