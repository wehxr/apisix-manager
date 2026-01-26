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
            当前支持的全局插件：<strong>real-ip</strong>（真实 IP 提取）、<strong>request-id</strong>（请求 ID 生成）。
          </div>
        </template>
      </el-alert>

      <div v-if="globalRule" class="global-rule-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="规则 ID" :span="2">{{ globalRule.id }}</el-descriptions-item>
          <el-descriptions-item label="已启用插件" :span="2">
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
              <el-tag
                v-for="key in enabledPlugins"
                :key="key"
                size="small"
                type="primary"
              >
                {{ getPluginName(key) }}
              </el-tag>
              <span v-if="enabledPlugins.length === 0" style="color: #909399">暂无启用的插件</span>
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
        <el-divider>Real IP 插件</el-divider>
        <GlobalRuleRealIp
          :model-value="form"
          @update:model-value="handleFormUpdate"
        />

        <el-divider>Request ID 插件</el-divider>
        <GlobalRuleRequestId
          :model-value="form"
          @update:model-value="handleFormUpdate"
        />
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
import { ElMessage } from 'element-plus'
import { Setting } from '@element-plus/icons-vue'
import { globalRuleApi } from '../utils/api'
import { formatTimestamp, getDialogWidth } from '../utils/format'
import { isPluginEnabled, getPluginName } from '../utils/plugin'
import { generateId } from '../utils/id'
import GlobalRuleRealIp from '../components/GlobalRule/GlobalRuleRealIp.vue'
import GlobalRuleRequestId from '../components/GlobalRule/GlobalRuleRequestId.vue'

const loading = ref(false)
const globalRule = ref(null)
const dialogVisible = ref(false)
const formRef = ref(null)
const form = ref({
  id: '',
  plugins: {}
})

const dialogWidth = computed(() => getDialogWidth())

const enabledPlugins = computed(() => {
  if (!globalRule.value || !globalRule.value.plugins) return []
  const plugins = globalRule.value.plugins
  // 只显示 real-ip 和 request-id 插件
  const allowedPlugins = ['real-ip', 'request-id']
  return Object.keys(plugins).filter(key => {
    if (!allowedPlugins.includes(key)) return false
    const plugin = plugins[key]
    return isPluginEnabled(plugin, key, plugins)
  })
})

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

const handleEdit = () => {
  if (globalRule.value) {
    // 只加载 real-ip 和 request-id 插件
    const allowedPlugins = ['real-ip', 'request-id']
    const existingPlugins = globalRule.value.plugins || {}
    const filteredPlugins = {}
    
    allowedPlugins.forEach(key => {
      if (existingPlugins[key]) {
        filteredPlugins[key] = existingPlugins[key]
      }
    })
    
    form.value = {
      id: globalRule.value.id || generateId('global_rule'),
      plugins: filteredPlugins
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

    // 只保留 real-ip 和 request-id 插件
    const allowedPlugins = ['real-ip', 'request-id']
    const formPlugins = form.value.plugins || {}
    
    allowedPlugins.forEach(key => {
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
