<template>
  <el-form :model="form" label-width="140px" ref="formRef" :rules="rules">
    <!-- 步骤条 -->
    <el-steps :active="currentStep" finish-status="success" align-center style="margin-bottom: 30px;">
      <el-step title="基本信息" description="配置路由基本信息" />
      <el-step title="匹配规则" description="配置路由匹配条件" />
      <el-step title="上游服务" description="选择上游服务" />
    </el-steps>

    <!-- 步骤内容 -->
    <div class="step-content">
      <!-- 步骤 1: 基本信息 -->
      <div v-show="currentStep === 0">
        <el-form-item label="名称" prop="name">
          <el-input :model-value="form.name" @update:model-value="updateField('name', $event)" placeholder="请输入路由名称" />
        </el-form-item>

        <el-form-item label="状态" prop="status">
          <el-radio-group :model-value="form.status" @update:model-value="updateField('status', $event)">
            <el-radio :label="1">启用</el-radio>
            <el-radio :label="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="描述" prop="desc">
          <el-input
            :model-value="form.desc"
            @update:model-value="updateField('desc', $event)"
            type="textarea"
            :rows="3"
            placeholder="请输入描述信息（可选）"
          />
        </el-form-item>

        <el-form-item label="WebSocket 支持" prop="enable_websocket">
          <el-switch :model-value="form.enable_websocket" @update:model-value="updateField('enable_websocket', $event)" />
        </el-form-item>

        <el-form-item label="优先级" prop="priority">
          <el-input-number
            :model-value="form.priority"
            @update:model-value="updateField('priority', $event)"
            :min="0"
            :max="10000"
            style="width: 100%"
          />
          <div class="form-tip">路由匹配优先级，数值越大优先级越高，默认 0</div>
        </el-form-item>

        <el-form-item label="标签" prop="labels">
          <LabelsInput
            :model-value="form.labels || {}"
            @update:model-value="updateField('labels', $event)"
          />
          <div class="form-tip">可选，用于标记和分类路由</div>
        </el-form-item>
      </div>

      <!-- 步骤 2: 匹配规则 -->
      <div v-show="currentStep === 1">
        <el-form-item label="路径 (URIs)" prop="uris">
          <el-select
            :model-value="form.uris"
            @update:model-value="updateField('uris', $event)"
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
          <div class="form-tip">HTTP 请求路径， 支持多个路径。如 /foo/index.html，支持请求路径前缀 /foo/*。/* 代表所有路径</div>
        </el-form-item>

        <el-form-item label="匹配域名" prop="hosts" required>
          <el-select
            :model-value="form.hosts"
            @update:model-value="updateField('hosts', $event)"
            multiple
            filterable
            allow-create
            default-first-option
            placeholder="请求域名，支持多个域名。如 example.com, *.example.com"
            style="width: 100%"
          >
            <el-option
              v-for="host in form.hosts"
              :key="host"
              :label="host"
              :value="host"
            />
          </el-select>
          <div class="form-tip">支持多个域名，输入后按回车添加，支持通配符（如 *.example.com）</div>
        </el-form-item>

        <el-form-item label="HTTP 方法" prop="methods">
          <el-checkbox-group :model-value="form.methods" @update:model-value="updateField('methods', $event)">
            <el-checkbox v-for="method in HTTP_METHODS" :key="method" :label="method">
              {{ method }}
            </el-checkbox>
          </el-checkbox-group>
          <div class="form-tip">至少选择一个 HTTP 方法，支持多个方法。如 GET, POST, PUT, DELETE</div>
        </el-form-item>

        <el-divider>高级匹配规则 (vars)</el-divider>
        <el-form-item label="变量匹配规则">
          <div style="width: 100%">
            <el-table :data="varsList" border style="width: 100%" size="small">
              <el-table-column prop="var" label="变量名" width="200">
                <template #default="{ row }">
                  <el-input
                    v-model="row.var"
                    placeholder="如: arg_name, cookie_token"
                    size="small"
                    @input="handleVarsChange"
                  />
                </template>
              </el-table-column>
              <el-table-column prop="negate" label="取反" width="80">
                <template #default="{ row }">
                  <el-switch
                    v-model="row.negate"
                    size="small"
                    @change="handleVarsChange"
                  />
                </template>
              </el-table-column>
              <el-table-column prop="operator" label="操作符" width="150">
                <template #default="{ row }">
                  <el-select 
                    v-model="row.operator" 
                    placeholder="选择操作符" 
                    size="small" 
                    style="width: 100%"
                    @change="handleOperatorChange(row)"
                  >
                    <el-option label="等于(==)" value="==" />
                    <el-option label="不等于(~=)" value="~=" />
                    <el-option label="大于(>)" value=">" />
                    <el-option label="小于(<)" value="<" />
                    <el-option label="大于等于(>=)" value=">=" />
                    <el-option label="小于等于(<=)" value="<=" />
                    <el-option label="正则匹配(~~)" value="~~" />
                    <el-option label="正则匹配(不区分大小写)(~*)" value="~*" />
                    <el-option label="包含(has)" value="has" />
                    <el-option label="IN(in)" value="in" />
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column prop="val" label="值" min-width="200">
                <template #default="{ row }">
                  <el-select
                    v-if="row.operator === 'in' || row.operator === 'not in'"
                    v-model="row.val"
                    multiple
                    filterable
                    allow-create
                    default-first-option
                    placeholder="输入值后按回车添加，支持多个值"
                    size="small"
                    style="width: 100%"
                    @change="handleVarsChange"
                  >
                    <el-option
                      v-for="(item, idx) in (Array.isArray(row.val) ? row.val : [])"
                      :key="idx"
                      :label="item"
                      :value="item"
                    />
                  </el-select>
                  <el-input
                    v-else
                    v-model="row.val"
                    placeholder="匹配的值"
                    size="small"
                    @input="handleVarsChange"
                  />
                </template>
              </el-table-column>
              <el-table-column label="操作" width="80" fixed="right">
                <template #default="{ row, $index }">
                  <el-button
                    type="danger"
                    size="small"
                    :icon="Delete"
                    @click="removeVarRule($index)"
                    link
                  />
                </template>
              </el-table-column>
            </el-table>
            <el-button
              type="primary"
              size="small"
              :icon="Plus"
              @click.stop="addVarRule"
              style="margin-top: 10px; z-index: 10; position: relative;"
            >
              添加规则
            </el-button>
            <div class="form-tip">
              支持的变量可以是如下内容：
              <br />
              请求参数：请求 URL 中的 Query 部分， 如 arg_name（name）
              <br />
              请求头字段：请求头中的 Header 部分， 如 user-agent（请求头）
              <br />
              Cookie 字段：请求中的 Cookie 部分， 如 cookie_token（token）
              <br />
              nginx 内置变量：如 request_uri, host, remote_addr, scheme 等等                  
            </div>
          </div>
        </el-form-item>
      </div>

      <!-- 步骤 3: 上游服务 -->
      <div v-show="currentStep === 2">
        <el-form-item label="上游服务" prop="upstream_id">
          <el-select
            :model-value="form.upstream_id"
            @update:model-value="updateField('upstream_id', $event)"
            filterable
            placeholder="请选择上游服务"
            style="width: 100%"
          >
            <el-option
              v-for="upstream in upstreamList"
              :key="upstream.id"
              :label="`${upstream.name || '未命名'}`"
              :value="upstream.id"
            />
          </el-select>
        </el-form-item>

        <el-divider>超时配置</el-divider>
        <el-form-item label="连接超时" prop="timeout.connect">
          <el-input-number
            :model-value="form.timeout?.connect"
            @update:model-value="updateTimeout('connect', $event)"
            :min="1"
            :max="600"
            :step="1"
            style="width: 100%"
          />
          <div class="form-tip">单位：秒，默认 3 秒</div>
        </el-form-item>
        <el-form-item label="发送超时" prop="timeout.send">
          <el-input-number
            :model-value="form.timeout?.send"
            @update:model-value="updateTimeout('send', $event)"
            :min="1"
            :max="600"
            :step="1"
            style="width: 100%"
          />
          <div class="form-tip">单位：秒，默认 3 秒</div>
        </el-form-item>
        <el-form-item label="读取超时" prop="timeout.read">
          <el-input-number
            :model-value="form.timeout?.read"
            @update:model-value="updateTimeout('read', $event)"
            :min="1"
            :max="600"
            :step="1"
            style="width: 100%"
          />
          <div class="form-tip">单位：秒，默认 3 秒</div>
        </el-form-item>
      </div>
    </div>

    <!-- 步骤导航按钮 -->
    <div class="step-actions">
      <el-button v-if="currentStep > 0" @click="prevStep">上一步</el-button>
      <el-button v-if="currentStep < 2" type="primary" @click="nextStep">下一步</el-button>
      <el-button v-if="currentStep === 2" type="primary" @click="handleSubmit">确认</el-button>
    </div>
  </el-form>
</template>

<script setup>
import { ref, onMounted, watch, defineExpose, nextTick } from 'vue'
import { Plus, Delete } from '@element-plus/icons-vue'
import { upstreamApi } from '../../utils/api'
import LabelsInput from '../LabelsInput.vue'

// 直接传入路由数据结构（APISIX 路由结构）
const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:modelValue', 'submit'])

const formRef = ref(null)
const currentStep = ref(0)
const form = ref({ ...props.modelValue })
const upstreamList = ref([])
const varsList = ref([])
const isSyncing = ref(false)

// HTTP 方法列表
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'CONNECT', 'TRACE']

// 表单验证规则
const rules = {
  name: [
    { required: true, message: '请输入路由名称', trigger: 'blur' }
  ],
  uris: [{ required: true, message: '请输入路径', trigger: 'blur' }],
  hosts: [
    { required: true, message: '请输入至少一个域名', trigger: 'change' }
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

// 加载上游服务列表
const loadUpstreamList = async () => {
  try {
    const upstreamRes = await upstreamApi.list()
    const upstreamData = upstreamRes.data
    if (upstreamData?.list) {
      upstreamList.value = upstreamData.list.map(item => {
        const value = item.value || {}
        let id = value.id
        if (!id && item.key) {
          id = item.key.split('/').pop()
        }
        return { ...value, id: id || item.key }
      })
    }
  } catch (error) {
    upstreamList.value = []
  }
}

// 组件挂载时加载上游列表
onMounted(() => {
  loadUpstreamList()
})

const updateField = (field, value) => {
  form.value[field] = value
  emit('update:modelValue', { ...form.value })
}

const updateTimeout = (field, value) => {
  form.value.timeout = form.value.timeout || {}
  form.value.timeout[field] = value
  emit('update:modelValue', { ...form.value })
}

// vars 相关函数
const parseVarsToUIFormat = (vars) => {
  if (!vars || !Array.isArray(vars) || vars.length === 0) {
    return []
  }
  
  return vars.map(v => {
    if (!Array.isArray(v) || v.length < 3) {
      return null
    }
    
    let varName, negate = false, operator, val
    
    if (v.length === 4 && v[1] === '!') {
      varName = v[0]
      negate = true
      operator = v[2]
      val = v[3]
    } else {
      varName = v[0]
      operator = v[1]
      val = v[2]
    }
    
    if (operator === 'in' && !Array.isArray(val)) {
      return { var: varName || '', negate, operator: operator || '==', val: val ? [String(val)] : [] }
    }
    return { var: varName || '', negate, operator: operator || '==', val: val !== undefined && val !== null ? val : '' }
  }).filter(v => v && v.var)
}

const syncVarsToForm = () => {
  try {
    isSyncing.value = true
    
    const validVars = varsList.value
      .filter(v => {
        if (!v?.var || !v?.operator) return false
        if (v.operator === 'in') {
          return Array.isArray(v.val) && v.val.length > 0
        }
        return v.val !== undefined && v.val !== null && v.val !== '' && String(v.val).trim() !== ''
      })
      .map(v => {
        let val = v.val
        if (v.operator === 'in') {
          val = Array.isArray(v.val) ? v.val : []
        } else if (['>', '<', '>=', '<='].includes(v.operator)) {
          const numVal = Number(val)
          if (!isNaN(numVal) && String(val).trim() !== '') {
            val = numVal
          }
        }
        return v.negate ? [v.var, '!', v.operator, val] : [v.var, v.operator, val]
      })
    
    const result = validVars.length > 0 ? validVars : undefined
    updateField('vars', result)
    
    nextTick(() => {
      isSyncing.value = false
    })
  } catch (error) {
    console.error('Error syncing vars:', error)
    isSyncing.value = false
  }
}

const addVarRule = () => {
  varsList.value = [
    ...varsList.value,
    { var: '', negate: false, operator: '==', val: '' }
  ]
}

const removeVarRule = (index) => {
  varsList.value.splice(index, 1)
  syncVarsToForm()
}

const handleOperatorChange = (row) => {
  if (row.operator === 'in' || row.operator === 'not in') {
    row.val = Array.isArray(row.val) ? row.val : (row.val ? [String(row.val)] : [])
  } else {
    row.val = Array.isArray(row.val) ? (row.val[0] || '') : row.val
  }
  syncVarsToForm()
}

const handleVarsChange = () => {
  syncVarsToForm()
}

const initVarsList = () => {
  try {
    varsList.value = parseVarsToUIFormat(form.value?.vars)
  } catch (error) {
    console.error('Error initializing varsList:', error)
    varsList.value = []
  }
}

initVarsList()

// 暴露 validate 方法给父组件
const validate = (callback) => {
  return formRef.value?.validate(callback)
}

// 暴露 resetFields 方法给父组件
const resetFields = () => {
  formRef.value?.resetFields()
  currentStep.value = 0 // 重置步骤
}

defineExpose({
  validate,
  resetFields
})

watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    form.value = { ...newVal }
    if (!isSyncing.value) {
      const incompleteRules = varsList.value.filter(v => 
        !v?.var || !v?.operator || 
        (v.val === undefined || v.val === null || v.val === '' || (typeof v.val === 'string' && v.val.trim() === ''))
      )
      const completedVarsList = parseVarsToUIFormat(newVal.vars)
      varsList.value = [...completedVarsList, ...incompleteRules]
    }
  }
}, { deep: true, immediate: false })

// 步骤导航
const nextStep = async () => {
  // 验证当前步骤
  if (currentStep.value === 0) {
    // 验证基本信息
    try {
      await formRef.value.validateField('name')
      await formRef.value.validateField('status')
    } catch (error) {
      return
    }
  } else if (currentStep.value === 1) {
    // 验证匹配规则
    try {
      await formRef.value.validateField('uris')
      await formRef.value.validateField('hosts')
      await formRef.value.validateField('methods')
    } catch (error) {
      return
    }
  }
  
  if (currentStep.value < 2) {
    currentStep.value++
  }
}

const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

// 提交表单
const handleSubmit = async () => {
  // 使用完整的表单验证
  if (!formRef.value) return
  
  try {
    const valid = await formRef.value.validate()
    if (!valid) {
      // 验证失败，跳转到第一个有错误的步骤
      const fields = formRef.value?.fields || {}
      if (fields.name?.validateMessage || fields.status?.validateMessage) {
        currentStep.value = 0
      } else if (fields.uris?.validateMessage || 
                 fields.hosts?.validateMessage || 
                 fields.methods?.validateMessage) {
        currentStep.value = 1
      } else if (fields.upstream_id?.validateMessage) {
        currentStep.value = 2
      }
      return
    }
    
    // 验证通过，触发父组件的提交事件
    emit('submit')
  } catch (error) {
    // validate 方法在验证失败时会抛出错误，这是正常的
    // 跳转到第一个有错误的步骤
    const fields = formRef.value?.fields || {}
    if (fields.name?.validateMessage || fields.status?.validateMessage) {
      currentStep.value = 0
    } else if (fields.uris?.validateMessage || 
               fields.hosts?.validateMessage || 
               fields.methods?.validateMessage) {
      currentStep.value = 1
    } else if (fields.upstream_id?.validateMessage) {
      currentStep.value = 2
    }
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
}

.step-content {
  min-height: 400px;
  padding: 20px 0;
  background: #fafafa;
  border-radius: 8px;
  padding: 30px;
}

.step-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}

:deep(.el-steps) {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}
</style>