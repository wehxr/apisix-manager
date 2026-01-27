<template>
  <div>
    <el-alert
      title="插件说明"
      type="info"
      :closable="false"
      style="margin-bottom: 20px;"
    >
      <template #default>
        <div style="font-size: 13px; line-height: 1.6;">
          此插件用于将日志数据存储到指定位置的文件中。可以将指定路由的日志发送到指定位置，方便你在本地统计各个路由的请求和响应数据。
          支持以 JSON 格式保存日志数据，可以获取 APISIX 变量和 NGINX 变量。
        </div>
      </template>
    </el-alert>
    <el-form-item label="开启插件">
      <el-switch :model-value="localEnabled" @update:model-value="handleEnableChange" />
    </el-form-item>
    <template v-if="localEnabled">
      <el-form-item label="文件路径" required>
        <el-input
          :model-value="path"
          @update:model-value="handlePathChange"
          placeholder="如: logs/file.log"
        />
        <div class="form-tip">自定义输出文件路径，例如：logs/file.log</div>
      </el-form-item>
      
      <el-divider>日志格式配置</el-divider>
      <el-form-item label="自定义日志格式">
        <div class="log-format-editor">
          <div v-if="logFormatEntries.length" class="format-entries">
            <div
              v-for="(entry, idx) in logFormatEntries"
              :key="idx"
              class="format-entry"
            >
              <el-input
                :model-value="entry.key"
                @update:model-value="(v) => updateLogFormatKey(idx, v)"
                @blur="handleLogFormatBlur"
                placeholder="键名"
                class="format-key"
                clearable
              />
              <span class="format-separator">:</span>
              <el-input
                :model-value="entry.value"
                @update:model-value="(v) => updateLogFormatValue(idx, v)"
                @blur="handleLogFormatBlur"
                placeholder="值（支持 $ 开头的变量，如: $host, $remote_addr）"
                class="format-value"
                clearable
              />
              <el-button
                type="danger"
                link
                :icon="Delete"
                class="format-remove"
                @click="removeLogFormatEntry(idx)"
              />
            </div>
          </div>
          <div v-else class="format-empty">
            暂无格式配置，点击下方按钮添加或使用默认格式
          </div>
          <div class="format-actions">
            <el-button type="primary" link :icon="Plus" class="format-add-btn" @click="addLogFormatEntry">
              添加格式字段
            </el-button>
            <el-button type="info" link class="format-default-btn" @click="applyDefaultFormat">
              使用默认格式
            </el-button>
          </div>
        </div>
        <div class="form-tip">
          以 JSON 格式的键值对来声明日志格式。对于值部分，仅支持字符串。如果是以 $ 开头，则表明是要获取 APISIX 变量或 NGINX 内置变量。
          <br />示例：host: $host, client_ip: $remote_addr, @timestamp: $time_iso8601
          <br /><strong>注意：</strong>
          <ul style="margin: 5px 0; padding-left: 20px;">
            <li><strong>空值处理：</strong>如果变量值为空（如 query_string 没有查询参数），APISIX 默认不会输出该字段。</li>
          </ul>
        </div>
      </el-form-item>

      <el-divider>请求体配置</el-divider>
      <el-form-item label="包含请求体">
        <el-switch
          :model-value="includeReqBody"
          @update:model-value="handleIncludeReqBodyChange"
        />
        <div class="form-tip">当设置为 true 时，日志中将包含请求体。如果请求体太大而无法在内存中保存，则由于 Nginx 的限制，无法记录请求体。</div>
      </el-form-item>
      <el-form-item v-if="includeReqBody" label="请求体过滤表达式">
        <el-input
          :model-value="includeReqBodyExprInput"
          @update:model-value="handleIncludeReqBodyExprInput"
          @blur="handleIncludeReqBodyExprBlur"
          type="textarea"
          :rows="3"
          placeholder='输入 JSON 格式的表达式数组，如: [["arg_name","==","jack"]]'
        />
        <div class="form-tip">当 include_req_body 属性设置为 true 时的过滤器。只有当此处设置的表达式求值为 true 时，才会记录请求体。使用 lua-resty-expr 语法。</div>
      </el-form-item>

      <el-divider>响应体配置</el-divider>
      <el-form-item label="包含响应体">
        <el-switch
          :model-value="includeRespBody"
          @update:model-value="handleIncludeRespBodyChange"
        />
        <div class="form-tip">当设置为 true 时，生成的文件包含响应体。</div>
      </el-form-item>
      <el-form-item v-if="includeRespBody" label="响应体过滤表达式">
        <el-input
          :model-value="includeRespBodyExprInput"
          @update:model-value="handleIncludeRespBodyExprInput"
          @blur="handleIncludeRespBodyExprBlur"
          type="textarea"
          :rows="3"
          placeholder='输入 JSON 格式的表达式数组，如: [["arg_name","==","jack"]]'
        />
        <div class="form-tip">当 include_resp_body 属性设置为 true 时，使用该属性并基于 lua-resty-expr 进行过滤。如果存在，则仅在表达式计算结果为 true 时记录响应。</div>
      </el-form-item>

      <el-divider>匹配规则</el-divider>
      <el-form-item label="匹配规则">
        <el-input
          :model-value="matchInput"
          @update:model-value="handleMatchInput"
          @blur="handleMatchBlur"
          type="textarea"
          :rows="4"
          placeholder='输入 JSON 格式的匹配规则数组，如: [[["arg_name","==","jack"]]]'
        />
        <div class="form-tip">
          当设置了这个选项后，只有匹配规则的日志才会被记录。match 是一个表达式列表，具体请参考 lua-resty-expr。
          <br />示例：[[["arg_name","==","jack"]]] 表示只有当查询参数 name 等于 jack 时才记录日志。
        </div>
      </el-form-item>
    </template>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { Plus, Delete } from '@element-plus/icons-vue'
import { isPluginEnabled, setPluginEnabled } from '@/utils/plugin'
import { usePluginConfig } from '@/composables/usePluginConfig'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      plugin_config_id: null
    })
  }
})

const emit = defineEmits(['update:modelValue'])

// 使用 composable 加载和管理 Plugin Config
const { plugins, updatePlugins } = usePluginConfig(props, emit)

// 从 plugins 中提取 file-logger 配置
const fileLoggerPlugin = computed(() => plugins.value['file-logger'] || {})

// 计算 enabled 状态
const enabled = computed(() => isPluginEnabled(fileLoggerPlugin.value))

// 计算各个字段
const path = computed(() => {
  return fileLoggerPlugin.value.path || ''
})

const logFormat = computed(() => {
  return fileLoggerPlugin.value.log_format || {}
})

const includeReqBody = computed(() => {
  return fileLoggerPlugin.value.include_req_body !== undefined ? fileLoggerPlugin.value.include_req_body : false
})

const includeReqBodyExpr = computed(() => {
  return fileLoggerPlugin.value.include_req_body_expr || null
})

const includeRespBody = computed(() => {
  return fileLoggerPlugin.value.include_resp_body !== undefined ? fileLoggerPlugin.value.include_resp_body : false
})

const includeRespBodyExpr = computed(() => {
  return fileLoggerPlugin.value.include_resp_body_expr || null
})

const match = computed(() => {
  return fileLoggerPlugin.value.match || null
})

// 默认日志格式
const DEFAULT_LOG_FORMAT = {
  'timestamp': '$time_iso8601',
  'remote_addr': '$remote_addr',
  'upstream_addr': '$upstream_addr',
  'balancer_ip': '$balancer_ip',
  'balancer_port': '$balancer_port',
  'request_id': '$request_id',
  'request_time': '$request_time',
  'upstream_response_time': '$upstream_response_time',
  'scheme': '$scheme',
  'request_method': '$request_method',
  'request_uri': '$request_uri',
  'request_length': '$request_length',
  'body_bytes_sent': '$body_bytes_sent',
  'http_user_agent': '$http_user_agent',
  'http_host': '$http_host',
  'http_referer': '$http_referer',
  'status': '$status',
  'upstream_status': '$upstream_status',
  'route_id': '$route_id',
  'route_name': '$route_name',
  'service_id': '$service_id',
  'service_name': '$service_name'
}

// 内部状态
const localEnabled = ref(enabled.value)
const logFormatEntries = ref([])
const includeReqBodyExprInput = ref('')
const includeRespBodyExprInput = ref('')
const matchInput = ref('')

// 初始化 log_format 条目
const initLogFormatEntries = () => {
  const format = logFormat.value
  if (format && typeof format === 'object' && Object.keys(format).length > 0) {
    logFormatEntries.value = Object.keys(format).map(key => ({
      key,
      value: format[key]
    }))
  } else {
    // 如果没有配置，使用默认格式
    logFormatEntries.value = Object.keys(DEFAULT_LOG_FORMAT).map(key => ({
      key,
      value: DEFAULT_LOG_FORMAT[key]
    }))
  }
}

// 初始化表达式输入
const initExprInputs = () => {
  try {
    includeReqBodyExprInput.value = includeReqBodyExpr.value
      ? JSON.stringify(includeReqBodyExpr.value, null, 2)
      : ''
    includeRespBodyExprInput.value = includeRespBodyExpr.value
      ? JSON.stringify(includeRespBodyExpr.value, null, 2)
      : ''
    matchInput.value = match.value
      ? JSON.stringify(match.value, null, 2)
      : ''
  } catch (error) {
    console.warn('解析表达式失败:', error)
    includeReqBodyExprInput.value = ''
    includeRespBodyExprInput.value = ''
    matchInput.value = ''
  }
}

// 监听 props 变化，更新内部状态
watch([enabled, path, logFormat, includeReqBody, includeReqBodyExpr, includeRespBody, includeRespBodyExpr, match], 
  ([newEnabled, newPath, newLogFormat, newIncludeReqBody, newIncludeReqBodyExpr, newIncludeRespBody, newIncludeRespBodyExpr, newMatch]) => {
    localEnabled.value = newEnabled
    initLogFormatEntries()
    initExprInputs()
  }, { immediate: true })

// 监听内部状态变化，更新到父组件
watch(localEnabled, (newEnabled) => {
  const currentPlugins = { ...plugins.value }
  
  if (newEnabled) {
    currentPlugins['file-logger'] = {
      path: path.value || 'logs/file.log'
    }
    
    // 确保 logFormatEntries 已初始化（首次启用时可能为空）
    if (logFormatEntries.value.length === 0) {
      initLogFormatEntries()
    }
    
    // 添加 log_format（如果没有配置，使用默认格式）
    let format = {}
    if (logFormatEntries.value.length > 0) {
      logFormatEntries.value.forEach(entry => {
        if (entry.key && entry.key.trim()) {
          format[entry.key.trim()] = entry.value || ''
        }
      })
    }
    
    // 如果格式为空，或者当前配置的格式字段数量少于默认格式，使用默认格式
    const currentFormatKeys = Object.keys(format)
    const defaultFormatKeys = Object.keys(DEFAULT_LOG_FORMAT)
    if (currentFormatKeys.length === 0 || currentFormatKeys.length < defaultFormatKeys.length) {
      // 合并：保留用户自定义的字段，补充默认格式中缺失的字段
      const mergedFormat = { ...DEFAULT_LOG_FORMAT }
      // 如果用户有自定义字段，保留它们
      currentFormatKeys.forEach(key => {
        if (format[key]) {
          mergedFormat[key] = format[key]
        }
      })
      format = mergedFormat
      // 同时更新 logFormatEntries，以便界面显示
      logFormatEntries.value = Object.keys(format).map(key => ({
        key,
        value: format[key]
      }))
    }
    
    // 始终保存 log_format（确保默认格式被保存）
    if (Object.keys(format).length > 0) {
      currentPlugins['file-logger'].log_format = format
    }
    
    // 添加 include_req_body
    if (includeReqBody.value) {
      currentPlugins['file-logger'].include_req_body = true
      
      // 添加 include_req_body_expr
      if (includeReqBodyExprInput.value && includeReqBodyExprInput.value.trim()) {
        try {
          const expr = JSON.parse(includeReqBodyExprInput.value.trim())
          if (Array.isArray(expr)) {
            currentPlugins['file-logger'].include_req_body_expr = expr
          }
        } catch (error) {
          console.warn('解析 include_req_body_expr 失败:', error)
        }
      }
    }
    
    // 添加 include_resp_body
    if (includeRespBody.value) {
      currentPlugins['file-logger'].include_resp_body = true
      
      // 添加 include_resp_body_expr
      if (includeRespBodyExprInput.value && includeRespBodyExprInput.value.trim()) {
        try {
          const expr = JSON.parse(includeRespBodyExprInput.value.trim())
          if (Array.isArray(expr)) {
            currentPlugins['file-logger'].include_resp_body_expr = expr
          }
        } catch (error) {
          console.warn('解析 include_resp_body_expr 失败:', error)
        }
      }
    }
    
    // 添加 match
    if (matchInput.value && matchInput.value.trim()) {
      try {
        const matchExpr = JSON.parse(matchInput.value.trim())
        if (Array.isArray(matchExpr)) {
          currentPlugins['file-logger'].match = matchExpr
        }
      } catch (error) {
        console.warn('解析 match 失败:', error)
      }
    }
    
    setPluginEnabled(currentPlugins['file-logger'], true)
  } else {
    currentPlugins['file-logger'] = currentPlugins['file-logger'] || {}
    setPluginEnabled(currentPlugins['file-logger'], false)
  }
  
  updatePlugins(currentPlugins)
})

const handleEnableChange = (value) => {
  localEnabled.value = value
}

const handlePathChange = (value) => {
  const currentPlugins = { ...plugins.value }
  
  currentPlugins['file-logger'] = {
    ...fileLoggerPlugin.value,
    path: value
  }
  setPluginEnabled(currentPlugins['file-logger'], localEnabled.value)
  
  updatePlugins(currentPlugins)
}

// log_format 相关方法
const addLogFormatEntry = () => {
  logFormatEntries.value.push({ key: '', value: '' })
}

const updateLogFormatKey = (idx, value) => {
  if (logFormatEntries.value[idx]) {
    logFormatEntries.value[idx].key = value
  }
}

const updateLogFormatValue = (idx, value) => {
  if (logFormatEntries.value[idx]) {
    logFormatEntries.value[idx].value = value
  }
}

const removeLogFormatEntry = (idx) => {
  logFormatEntries.value.splice(idx, 1)
  handleLogFormatBlur()
}

// 应用默认格式
const applyDefaultFormat = () => {
  logFormatEntries.value = Object.keys(DEFAULT_LOG_FORMAT).map(key => ({
    key,
    value: DEFAULT_LOG_FORMAT[key]
  }))
  handleLogFormatBlur()
}

const handleLogFormatBlur = () => {
  const currentPlugins = { ...plugins.value }
  
  if (localEnabled.value) {
    currentPlugins['file-logger'] = {
      ...fileLoggerPlugin.value,
      path: path.value || 'logs/file.log'
    }
    
    let format = {}
    logFormatEntries.value.forEach(entry => {
      if (entry.key && entry.key.trim()) {
        format[entry.key.trim()] = entry.value || ''
      }
    })
    
    // 如果格式为空，或者字段数量少于默认格式，使用默认格式
    const currentFormatKeys = Object.keys(format)
    const defaultFormatKeys = Object.keys(DEFAULT_LOG_FORMAT)
    if (currentFormatKeys.length === 0 || currentFormatKeys.length < defaultFormatKeys.length) {
      // 合并：保留用户自定义的字段，补充默认格式中缺失的字段
      const mergedFormat = { ...DEFAULT_LOG_FORMAT }
      currentFormatKeys.forEach(key => {
        if (format[key]) {
          mergedFormat[key] = format[key]
        }
      })
      format = mergedFormat
      // 更新界面显示
      logFormatEntries.value = Object.keys(format).map(key => ({
        key,
        value: format[key]
      }))
    }
    
    // 始终保存 log_format
    if (Object.keys(format).length > 0) {
      currentPlugins['file-logger'].log_format = format
    }
    
    setPluginEnabled(currentPlugins['file-logger'], true)
    updatePlugins(currentPlugins)
  }
}

// include_req_body 相关方法
const handleIncludeReqBodyChange = (value) => {
  const currentPlugins = { ...plugins.value }
  
  currentPlugins['file-logger'] = {
    ...fileLoggerPlugin.value,
    include_req_body: value
  }
  
  if (!value) {
    delete currentPlugins['file-logger'].include_req_body_expr
  }
  
  setPluginEnabled(currentPlugins['file-logger'], localEnabled.value)
  updatePlugins(currentPlugins)
}

const handleIncludeReqBodyExprInput = (value) => {
  includeReqBodyExprInput.value = value
}

const handleIncludeReqBodyExprBlur = () => {
  const currentPlugins = { ...plugins.value }
  
  if (localEnabled.value && includeReqBody.value) {
    currentPlugins['file-logger'] = {
      ...fileLoggerPlugin.value,
      include_req_body: true
    }
    
    if (includeReqBodyExprInput.value && includeReqBodyExprInput.value.trim()) {
      try {
        const expr = JSON.parse(includeReqBodyExprInput.value.trim())
        if (Array.isArray(expr)) {
          currentPlugins['file-logger'].include_req_body_expr = expr
        } else {
          delete currentPlugins['file-logger'].include_req_body_expr
        }
      } catch (error) {
        console.warn('解析 include_req_body_expr 失败:', error)
        delete currentPlugins['file-logger'].include_req_body_expr
      }
    } else {
      delete currentPlugins['file-logger'].include_req_body_expr
    }
    
    setPluginEnabled(currentPlugins['file-logger'], true)
    updatePlugins(currentPlugins)
  }
}

// include_resp_body 相关方法
const handleIncludeRespBodyChange = (value) => {
  const currentPlugins = { ...plugins.value }
  
  currentPlugins['file-logger'] = {
    ...fileLoggerPlugin.value,
    include_resp_body: value
  }
  
  if (!value) {
    delete currentPlugins['file-logger'].include_resp_body_expr
  }
  
  setPluginEnabled(currentPlugins['file-logger'], localEnabled.value)
  updatePlugins(currentPlugins)
}

const handleIncludeRespBodyExprInput = (value) => {
  includeRespBodyExprInput.value = value
}

const handleIncludeRespBodyExprBlur = () => {
  const currentPlugins = { ...plugins.value }
  
  if (localEnabled.value && includeRespBody.value) {
    currentPlugins['file-logger'] = {
      ...fileLoggerPlugin.value,
      include_resp_body: true
    }
    
    if (includeRespBodyExprInput.value && includeRespBodyExprInput.value.trim()) {
      try {
        const expr = JSON.parse(includeRespBodyExprInput.value.trim())
        if (Array.isArray(expr)) {
          currentPlugins['file-logger'].include_resp_body_expr = expr
        } else {
          delete currentPlugins['file-logger'].include_resp_body_expr
        }
      } catch (error) {
        console.warn('解析 include_resp_body_expr 失败:', error)
        delete currentPlugins['file-logger'].include_resp_body_expr
      }
    } else {
      delete currentPlugins['file-logger'].include_resp_body_expr
    }
    
    setPluginEnabled(currentPlugins['file-logger'], true)
    updatePlugins(currentPlugins)
  }
}

// match 相关方法
const handleMatchInput = (value) => {
  matchInput.value = value
}

const handleMatchBlur = () => {
  const currentPlugins = { ...plugins.value }
  
  if (localEnabled.value) {
    currentPlugins['file-logger'] = {
      ...fileLoggerPlugin.value
    }
    
    if (matchInput.value && matchInput.value.trim()) {
      try {
        const matchExpr = JSON.parse(matchInput.value.trim())
        if (Array.isArray(matchExpr)) {
          currentPlugins['file-logger'].match = matchExpr
        } else {
          delete currentPlugins['file-logger'].match
        }
      } catch (error) {
        console.warn('解析 match 失败:', error)
        delete currentPlugins['file-logger'].match
      }
    } else {
      delete currentPlugins['file-logger'].match
    }
    
    setPluginEnabled(currentPlugins['file-logger'], true)
    updatePlugins(currentPlugins)
  }
}
</script>

<style scoped>
.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
  display: block;
  width: 100%;
  line-height: 1.6;
}

.log-format-editor {
  width: 100%;
  padding: 14px 16px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
  border: 1px solid var(--el-border-color-light);
}

.format-entries {
  margin-bottom: 4px;
}

.format-entry {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px dashed var(--el-border-color-lighter);
}

.format-entry:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.format-entry:first-child {
  padding-top: 0;
}

.format-key {
  flex: 0 0 150px;
}

.format-separator {
  flex-shrink: 0;
  color: var(--el-text-color-secondary);
  font-weight: 500;
}

.format-value {
  flex: 1;
  min-width: 0;
}

.format-remove {
  flex-shrink: 0;
  padding: 4px;
}

.format-empty {
  padding: 16px 0;
  font-size: 13px;
  color: var(--el-text-color-placeholder);
  text-align: center;
}

.format-actions {
  display: flex;
  gap: 12px;
  margin-top: 12px;
}

.format-add-btn,
.format-default-btn {
  padding-left: 0;
  font-size: 13px;
}
</style>