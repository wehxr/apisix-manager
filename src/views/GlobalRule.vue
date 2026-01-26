<template>
  <div class="global-rule-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>全局规则</span>
          <el-button type="primary" @click="handleEdit" class="create-btn">
            <el-icon><Setting /></el-icon>
            <span class="btn-text">配置全局插件</span>
          </el-button>
        </div>
      </template>

      <el-alert
        title="全局规则说明"
        type="info"
        :closable="false"
        style="margin-bottom: 20px;"
      >
        <template #default>
          <div style="font-size: 13px; line-height: 1.6;">
            全局规则用于配置全局运行的插件，设置为全局规则的插件将在所有路由级别的插件之前优先运行。
            支持的全局插件：<strong>{{ availablePluginsText }}</strong>
          </div>
        </template>
      </el-alert>

      <div v-if="globalRule" class="global-rule-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="规则 ID" :span="2">{{ globalRule.id }}</el-descriptions-item>
          <el-descriptions-item label="已启用插件" :span="2">
            <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
              <el-tag
                v-for="key in enabledPlugins"
                :key="key"
                size="small"
                type="primary"
                closable
                @close="handleDisablePlugin(key)"
              >
                {{ getPluginName(key) }}
              </el-tag>
              <el-dropdown @command="(command) => handleConfigPlugin(command)" trigger="click" v-if="availablePlugins.length > 0">
                <el-button size="small" type="primary" plain>
                  添加插件<el-icon class="el-icon--right"><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item 
                      v-for="pluginKey in availablePlugins" 
                      :key="pluginKey" 
                      :command="pluginKey"
                      :disabled="enabledPlugins.includes(pluginKey)"
                    >
                      {{ PLUGIN_NAMES[pluginKey] }}
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              <span v-if="enabledPlugins.length === 0 && availablePlugins.length === 0" style="color: #909399">暂无启用的插件</span>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间" :span="1">
            {{ formatTimestamp(globalRule.create_time) }}
          </el-descriptions-item>
          <el-descriptions-item label="更新时间" :span="1">
            {{ formatTimestamp(globalRule.update_time) }}
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <el-empty v-else description="暂无全局规则，点击上方按钮创建" />
    </el-card>

    <!-- 编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      title="配置全局插件"
      :width="dialogWidth"
      @close="resetForm"
    >
      <el-form :model="form" label-width="140px" ref="formRef">
        <template v-for="pluginKey in availablePlugins" :key="pluginKey">
          <el-divider>{{ PLUGIN_NAMES[pluginKey] }}</el-divider>
          <component
            v-if="getPluginComponent(pluginKey)"
            :is="getPluginComponent(pluginKey)"
            :model-value="form"
            @update:model-value="handleFormUpdate"
          />
        </template>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 插件配置对话框 -->
    <PluginDialog
      v-model="pluginDialogVisible"
      resource-type="global_rule"
      :resource-id="globalRule?.id || ''"
      :plugin-type="currentPluginType"
      :initial-config="{ plugins: globalRule?.plugins || {} }"
      @saved="handlePluginSaved"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Setting, ArrowDown } from '@element-plus/icons-vue'
import { globalRuleApi } from '@/utils/api'
import { formatTimestamp, getDialogWidth } from '@/utils/format'
import { isPluginEnabled, getPluginName, PLUGIN_NAMES, RESOURCE_TYPES, getPluginsByResourceType } from '@/utils/plugin'
import { generateId } from '@/utils/id'
import PluginDialog from '@/components/PluginDialog.vue'
import PluginFormRealIp from '@/components/PluginForm/PluginFormRealIp.vue'
import PluginFormRequestId from '@/components/PluginForm/PluginFormRequestId.vue'
import PluginFormCors from '@/components/PluginForm/PluginFormCors.vue'

const loading = ref(false)
const globalRule = ref(null)
const dialogVisible = ref(false)
const formRef = ref(null)
const form = ref({
  id: '',
  plugins: {}
})

const dialogWidth = computed(() => getDialogWidth())

// 获取可用于 global_rule 的插件列表
const availablePlugins = computed(() => {
  return getPluginsByResourceType(RESOURCE_TYPES.GLOBAL_RULE)
})

// 可用插件的文本描述
const availablePluginsText = computed(() => {
  return availablePlugins.value.map(key => `${PLUGIN_NAMES[key]}`).join('、')
})

const enabledPlugins = computed(() => {
  if (!globalRule.value || !globalRule.value.plugins) return []
  const plugins = globalRule.value.plugins
  // 显示所有启用的插件（不限制类型）
  return Object.keys(plugins).filter(key => {
    const plugin = plugins[key]
    return isPluginEnabled(plugin, key, plugins)
  })
})

// 插件配置对话框相关
const pluginDialogVisible = ref(false)
const currentPluginType = ref('')
const currentPluginConfigId = ref(null)

const loadData = async () => {
  loading.value = true
  try {
    const response = await globalRuleApi.list()
    const data = response.data
    if (data.list && data.list.length > 0) {
      // 取第一个全局规则（通常只有一个）
      const rule = data.list[0]
      globalRule.value = {
        ...rule.value,
        id: rule.value.id || rule.key?.split('/').pop() || generateId('global_rule')
      }
    } else {
      globalRule.value = null
    }
  } catch (error) {
    console.error('加载全局规则失败:', error)
    globalRule.value = null
  } finally {
    loading.value = false
  }
}

// 获取插件组件（统一使用 PluginForm 组件，支持所有资源类型）
const getPluginComponent = (pluginKey) => {
  const components = {
    'real-ip': PluginFormRealIp,
    'request-id': PluginFormRequestId,
    'cors': PluginFormCors
  }
  // 如果组件不存在，返回 null
  return components[pluginKey] || null
}

// 配置单个插件
const handleConfigPlugin = (pluginType) => {
  currentPluginType.value = pluginType
  pluginDialogVisible.value = true
}

// 禁用插件
const handleDisablePlugin = async (pluginKey) => {
  try {
    if (!globalRule.value) return
    
    const plugins = { ...globalRule.value.plugins }
    if (plugins[pluginKey]) {
      // 设置插件为禁用状态
      plugins[pluginKey] = {
        ...plugins[pluginKey],
        _meta: {
          disable: true
        }
      }
      
      const ruleData = { plugins }
      await globalRuleApi.update(globalRule.value.id, ruleData)
      ElMessage.success('插件已禁用')
      await loadData()
    }
  } catch (error) {
    console.error('禁用插件失败:', error)
    // 错误消息已由拦截器自动显示
  }
}

// 处理插件保存成功
const handlePluginSaved = () => {
  loadData()
}

const handleEdit = () => {
  if (globalRule.value) {
    form.value = {
      id: globalRule.value.id || generateId('global_rule'),
      plugins: globalRule.value.plugins || {}
    }
  } else {
    form.value = {
      id: generateId('global_rule'),
      plugins: {}
    }
  }
  dialogVisible.value = true
}

const handleFormUpdate = (newForm) => {
  form.value = { ...form.value, ...newForm }
}

const handleSubmit = async () => {
  try {
    const ruleData = {
      plugins: {}
    }

    // 只保留支持 global_rule 的插件
    const formPlugins = form.value.plugins || {}
    
    availablePlugins.value.forEach(key => {
      if (formPlugins[key]) {
        const plugin = formPlugins[key]
        // 只添加已启用的插件
        if (isPluginEnabled(plugin, key, formPlugins)) {
          ruleData.plugins[key] = plugin
        }
      }
    })

    if (globalRule.value) {
      await globalRuleApi.update(form.value.id, ruleData)
      ElMessage.success('更新全局规则成功')
    } else {
      await globalRuleApi.create(form.value.id, ruleData)
      ElMessage.success('创建全局规则成功')
    }
    
    dialogVisible.value = false
    await loadData()
  } catch (error) {
    console.error('保存全局规则失败:', error)
    // 错误消息已由拦截器自动显示
  }
}

const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields()
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.global-rule-page {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.create-btn {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-text {
  margin-left: 4px;
}

.global-rule-content {
  margin-top: 20px;
}

@media (max-width: 768px) {
  .btn-text {
    display: none;
  }
}
</style>
