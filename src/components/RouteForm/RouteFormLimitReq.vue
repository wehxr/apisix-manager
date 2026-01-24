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
          此插件使用漏桶算法限制请求速率。超过速率的请求会被延迟处理，超过突发容量的请求会被拒绝。
          适用于需要平滑控制请求速率的场景，可以防止突发流量对服务器造成冲击。
        </div>
      </template>
    </el-alert>
    <el-divider>配置</el-divider>
    <el-form-item label="开启插件">
      <el-switch :model-value="localEnabled" @update:model-value="handleEnableChange" />
    </el-form-item>
    <template v-if="localEnabled">
      <el-form-item label="请求速率（rate）（req/s）" required>
        <el-input-number
          :model-value="rate"
          @update:model-value="handleRateChange"
          :min="0.01"
          :max="10000"
          :step="0.1"
          style="width: 100%"
        />
        <div class="form-tip">每秒允许的最大请求数，超过速率且低于突发的请求将被延迟</div>
      </el-form-item>
      <el-form-item label="突发容量（burst）" required>
        <el-input-number
          :model-value="burst"
          @update:model-value="handleBurstChange"
          :min="0"
          :max="10000"
          style="width: 100%"
        />
        <div class="form-tip">
          突发容量（burst）用于控制允许超过基础速率的请求数量。工作原理：<br/>
          • 当请求速率 ≤ 基础速率（rate）时：请求正常处理，无延迟<br/>
          • 当请求速率 > 基础速率但 ≤ (rate + burst) 时：超出部分的请求会被延迟处理，放入漏桶中排队<br/>
          • 当请求速率 > (rate + burst) 时：超出突发容量的请求会被直接拒绝<br/>
          例如：rate=10, burst=5 时，每秒最多可处理 15 个请求，其中前 10 个立即处理，后 5 个延迟处理，超过 15 个则拒绝
        </div>
      </el-form-item>
      
      <el-divider>限制键配置</el-divider>
      <el-form-item label="限制键" required>
        <el-input
          :model-value="key"
          @update:model-value="handleKeyChange"
          placeholder="如: $remote_addr $consumer_name"
        />
        <div class="form-tip">可以是一个变量或多个变量的组合，所有变量都应该以美元符号 ($) 为前缀，如: $remote_addr $consumer_name</div>
      </el-form-item>

      <el-divider>基本配置</el-divider>
      <el-form-item label="无延迟模式">
        <el-switch
          :model-value="nodelay"
          @update:model-value="handleNodelayChange"
        />
        <div class="form-tip">
          控制突发容量内的请求处理方式。关闭（false）：超过速率但在突发容量内的请求会被延迟处理，平滑控制流量；开启（true）：突发容量内的请求立即处理，不延迟。
          开启后可以更快响应突发流量，但可能对后端造成瞬时压力；关闭后流量更平滑，但响应可能略有延迟。
        </div>
      </el-form-item>
      <el-form-item label="拒绝状态码">
        <el-input-number
          :model-value="rejectionCode"
          @update:model-value="handleRejectionCodeChange"
          :min="200"
          :max="599"
          style="width: 100%"
        />
        <div class="form-tip">请求因超出阈值而被拒绝时返回的 HTTP 状态代码，默认 429</div>
      </el-form-item>
      <el-form-item label="拒绝消息">
        <el-input
          :model-value="rejectionMsg"
          @update:model-value="handleRejectionMsgChange"
          placeholder="请求被拒绝时返回的消息"
        />
        <div class="form-tip">可选，请求因超出阈值而被拒绝时返回的响应主体</div>
      </el-form-item>
      <el-form-item label="显示限制配额头">
        <el-switch
          :model-value="showLimitQuotaHeader"
          @update:model-value="handleShowLimitQuotaHeaderChange"
        />
        <div class="form-tip">
          如果为 true，则在响应标头中包含 X-RateLimit-Limit 和 X-RateLimit-Remaining
        </div>
      </el-form-item>
      <el-form-item label="允许降级">
        <el-switch
          :model-value="allowDegradation"
          @update:model-value="handleAllowDegradationChange"
        />
        <div class="form-tip">
          当插件或其依赖项（如 Redis）出现故障时的降级策略。开启（true）：插件不可用时，请求会绕过限流直接转发到后端，保证服务可用性，但失去限流保护；
          关闭（false）：插件不可用时直接拒绝请求，保证限流策略的严格性，但可能影响服务可用性。建议生产环境开启以保证高可用。
        </div>
      </el-form-item>

      <el-divider>存储策略</el-divider>
      <el-form-item label="策略">
        <el-radio-group :model-value="policy" @update:model-value="handlePolicyChange">
          <el-radio label="local">本地内存 (local)</el-radio>
          <el-radio label="redis">Redis (redis)</el-radio>
          <el-radio label="redis-cluster">Redis 集群 (redis-cluster)</el-radio>
        </el-radio-group>
        <div class="form-tip">速率限制计数器的策略</div>
      </el-form-item>

      <!-- Redis 配置 -->
      <template v-if="policy === 'redis'">
        <el-form-item label="Redis 主机" required>
          <el-input
            :model-value="redisHost"
            @update:model-value="handleRedisHostChange"
            placeholder="如: 192.168.1.100"
          />
        </el-form-item>
        <el-form-item label="Redis 端口">
          <el-input-number
            :model-value="redisPort"
            @update:model-value="handleRedisPortChange"
            :min="1"
            :max="65535"
            style="width: 100%"
          />
          <div class="form-tip">默认 6379</div>
        </el-form-item>
        <el-form-item label="Redis 用户名">
          <el-input
            :model-value="redisUsername"
            @update:model-value="handleRedisUsernameChange"
            placeholder="如果使用 Redis ACL，则为 Redis 的用户名"
          />
        </el-form-item>
        <el-form-item label="Redis 密码">
          <el-input
            :model-value="redisPassword"
            @update:model-value="handleRedisPasswordChange"
            type="password"
            show-password
            placeholder="Redis 节点的密码"
          />
        </el-form-item>
        <el-form-item label="Redis SSL">
          <el-switch
            :model-value="redisSsl"
            @update:model-value="handleRedisSslChange"
          />
          <div class="form-tip">如果为 true，则使用 SSL 连接到 Redis</div>
        </el-form-item>
        <el-form-item label="Redis SSL 验证">
          <el-switch
            :model-value="redisSslVerify"
            @update:model-value="handleRedisSslVerifyChange"
          />
          <div class="form-tip">如果为 true，则验证服务器 SSL 证书</div>
        </el-form-item>
        <el-form-item label="Redis 数据库">
          <el-input-number
            :model-value="redisDatabase"
            @update:model-value="handleRedisDatabaseChange"
            :min="0"
            style="width: 100%"
          />
          <div class="form-tip">Redis 中的数据库编号，默认 0</div>
        </el-form-item>
        <el-form-item label="Redis 超时（毫秒）">
          <el-input-number
            :model-value="redisTimeout"
            @update:model-value="handleRedisTimeoutChange"
            :min="1"
            style="width: 100%"
          />
          <div class="form-tip">Redis 超时值，单位：毫秒，默认 1000</div>
        </el-form-item>
      </template>

      <!-- Redis Cluster 配置 -->
      <template v-if="policy === 'redis-cluster'">
        <el-form-item label="Redis 集群节点" required>
          <el-select
            :model-value="redisClusterNodes"
            @update:model-value="handleRedisClusterNodesChange"
            multiple
            filterable
            allow-create
            default-first-option
            placeholder="输入节点地址后按回车添加，如: 192.168.1.100:6379"
            style="width: 100%"
          >
            <el-option
              v-for="node in redisClusterNodes"
              :key="node"
              :label="node"
              :value="node"
            />
          </el-select>
          <div class="form-tip">具有至少两个地址的 Redis 群集节点列表</div>
        </el-form-item>
        <el-form-item label="Redis 集群名称">
          <el-input
            :model-value="redisClusterName"
            @update:model-value="handleRedisClusterNameChange"
            placeholder="Redis 集群名称"
          />
        </el-form-item>
        <el-form-item label="Redis 密码">
          <el-input
            :model-value="redisPassword"
            @update:model-value="handleRedisPasswordChange"
            type="password"
            show-password
            placeholder="Redis 节点的密码"
          />
        </el-form-item>
        <el-form-item label="Redis 超时（毫秒）">
          <el-input-number
            :model-value="redisTimeout"
            @update:model-value="handleRedisTimeoutChange"
            :min="1"
            style="width: 100%"
          />
          <div class="form-tip">Redis 超时值，单位：毫秒，默认 1000</div>
        </el-form-item>
        <el-form-item label="Redis 集群 SSL">
          <el-switch
            :model-value="redisClusterSsl"
            @update:model-value="handleRedisClusterSslChange"
          />
          <div class="form-tip">如果为 true，则使用 SSL 连接 Redis 集群</div>
        </el-form-item>
        <el-form-item label="Redis 集群 SSL 验证">
          <el-switch
            :model-value="redisClusterSslVerify"
            @update:model-value="handleRedisClusterSslVerifyChange"
          />
          <div class="form-tip">如果为 true，则验证服务器 SSL 证书</div>
        </el-form-item>
      </template>
    </template>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { isPluginEnabled, setPluginEnabled } from '../../utils/plugin'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      plugins: {}
    })
  }
})

const emit = defineEmits(['update:modelValue'])

// 从 plugins 中提取 limit-req 配置
const limitReqPlugin = computed(() => props.modelValue.plugins?.['limit-req'] || {})

// 计算 enabled 状态
const enabled = computed(() => isPluginEnabled(limitReqPlugin.value))

// 计算各个字段
const rate = computed(() => {
  return limitReqPlugin.value.rate || 1
})

const burst = computed(() => {
  return limitReqPlugin.value.burst !== undefined ? limitReqPlugin.value.burst : 0
})

// key_type 固定为 'var_combination'
const keyType = computed(() => 'var_combination')

const key = computed(() => {
  return limitReqPlugin.value.key || '$remote_addr'
})

const nodelay = computed(() => {
  return limitReqPlugin.value.nodelay !== undefined ? limitReqPlugin.value.nodelay : false
})

const rejectionCode = computed(() => {
  return limitReqPlugin.value.rejection_code !== undefined ? limitReqPlugin.value.rejection_code : 429
})

const rejectionMsg = computed(() => {
  return limitReqPlugin.value.rejection_msg || '请求过于频繁，请稍后再试'
})

const showLimitQuotaHeader = computed(() => {
  return limitReqPlugin.value.show_limit_quota_header !== undefined ? limitReqPlugin.value.show_limit_quota_header : true
})

const allowDegradation = computed(() => {
  return limitReqPlugin.value.allow_degradation !== undefined ? limitReqPlugin.value.allow_degradation : true
})

const policy = computed(() => {
  return limitReqPlugin.value.policy || 'local'
})

const redisHost = computed(() => {
  return limitReqPlugin.value.redis_host || ''
})

const redisPort = computed(() => {
  return limitReqPlugin.value.redis_port !== undefined ? limitReqPlugin.value.redis_port : 6379
})

const redisUsername = computed(() => {
  return limitReqPlugin.value.redis_username || ''
})

const redisPassword = computed(() => {
  return limitReqPlugin.value.redis_password || ''
})

const redisSsl = computed(() => {
  return limitReqPlugin.value.redis_ssl !== undefined ? limitReqPlugin.value.redis_ssl : false
})

const redisSslVerify = computed(() => {
  return limitReqPlugin.value.redis_ssl_verify !== undefined ? limitReqPlugin.value.redis_ssl_verify : false
})

const redisDatabase = computed(() => {
  return limitReqPlugin.value.redis_database !== undefined ? limitReqPlugin.value.redis_database : 0
})

const redisTimeout = computed(() => {
  return limitReqPlugin.value.redis_timeout !== undefined ? limitReqPlugin.value.redis_timeout : 1000
})

const redisClusterNodes = computed(() => {
  return Array.isArray(limitReqPlugin.value.redis_cluster_nodes) 
    ? limitReqPlugin.value.redis_cluster_nodes 
    : []
})

const redisClusterName = computed(() => {
  return limitReqPlugin.value.redis_cluster_name || ''
})

const redisClusterSsl = computed(() => {
  return limitReqPlugin.value.redis_cluster_ssl !== undefined ? limitReqPlugin.value.redis_cluster_ssl : false
})

const redisClusterSslVerify = computed(() => {
  return limitReqPlugin.value.redis_cluster_ssl_verify !== undefined ? limitReqPlugin.value.redis_cluster_ssl_verify : false
})

// 内部状态
const localEnabled = ref(enabled.value)


// 监听 props 变化，更新内部状态
watch(enabled, (newEnabled) => {
  localEnabled.value = newEnabled
}, { immediate: true })

// 监听内部状态变化，更新到父组件
watch(localEnabled, (newEnabled) => {
  const currentConfig = {
    plugins: { ...props.modelValue.plugins }
  }
  
  if (newEnabled) {
    currentConfig.plugins['limit-req'] = {
      rate: rate.value > 0 ? rate.value : 1, // 确保 rate 至少为 1
      burst: burst.value,
      key_type: 'var_combination', // 固定为 var_combination
      key: key.value,
      nodelay: nodelay.value,
      rejection_code: rejectionCode.value,
      rejection_msg: rejectionMsg.value,
      show_limit_quota_header: showLimitQuotaHeader.value,
      allow_degradation: allowDegradation.value,
      policy: policy.value
    }
    
    // Redis 配置
    if (policy.value === 'redis') {
      if (redisHost.value) currentConfig.plugins['limit-req'].redis_host = redisHost.value
      if (redisPort.value) currentConfig.plugins['limit-req'].redis_port = redisPort.value
      if (redisUsername.value) currentConfig.plugins['limit-req'].redis_username = redisUsername.value
      if (redisPassword.value) currentConfig.plugins['limit-req'].redis_password = redisPassword.value
      if (redisSsl.value !== undefined) currentConfig.plugins['limit-req'].redis_ssl = redisSsl.value
      if (redisSslVerify.value !== undefined) currentConfig.plugins['limit-req'].redis_ssl_verify = redisSslVerify.value
      if (redisDatabase.value !== undefined) currentConfig.plugins['limit-req'].redis_database = redisDatabase.value
      if (redisTimeout.value !== undefined) currentConfig.plugins['limit-req'].redis_timeout = redisTimeout.value
    }
    
    // Redis Cluster 配置
    if (policy.value === 'redis-cluster') {
      if (redisClusterNodes.value.length > 0) currentConfig.plugins['limit-req'].redis_cluster_nodes = redisClusterNodes.value
      if (redisClusterName.value) currentConfig.plugins['limit-req'].redis_cluster_name = redisClusterName.value
      if (redisPassword.value) currentConfig.plugins['limit-req'].redis_password = redisPassword.value
      if (redisTimeout.value !== undefined) currentConfig.plugins['limit-req'].redis_timeout = redisTimeout.value
      if (redisClusterSsl.value !== undefined) currentConfig.plugins['limit-req'].redis_cluster_ssl = redisClusterSsl.value
      if (redisClusterSslVerify.value !== undefined) currentConfig.plugins['limit-req'].redis_cluster_ssl_verify = redisClusterSslVerify.value
    }
    
    setPluginEnabled(currentConfig.plugins['limit-req'], true)
  } else {
    currentConfig.plugins['limit-req'] = currentConfig.plugins['limit-req'] || {}
    setPluginEnabled(currentConfig.plugins['limit-req'], false)
  }
  
  emit('update:modelValue', currentConfig)
})

const handleEnableChange = (value) => {
  localEnabled.value = value
}

// 更新插件的辅助函数
const updatePlugin = (updates) => {
  const currentConfig = {
    plugins: { ...props.modelValue.plugins }
  }
  
  currentConfig.plugins['limit-req'] = {
    ...limitReqPlugin.value,
    ...updates,
    key_type: 'var_combination' // 确保 key_type 始终为 var_combination
  }
  setPluginEnabled(currentConfig.plugins['limit-req'], enabled.value)
  
  emit('update:modelValue', currentConfig)
}

const handleRateChange = (value) => {
  updatePlugin({ rate: value > 0 ? value : 1 }) // 确保 rate 至少为 1
}

const handleBurstChange = (value) => {
  updatePlugin({ burst: value })
}

const handleKeyChange = (value) => {
  updatePlugin({ key: value })
}

const handleNodelayChange = (value) => {
  updatePlugin({ nodelay: value })
}

const handleRejectionCodeChange = (value) => {
  updatePlugin({ rejection_code: value })
}

const handleRejectionMsgChange = (value) => {
  updatePlugin({ rejection_msg: value })
}

const handleShowLimitQuotaHeaderChange = (value) => {
  updatePlugin({ show_limit_quota_header: value })
}

const handleAllowDegradationChange = (value) => {
  updatePlugin({ allow_degradation: value })
}

const handlePolicyChange = (value) => {
  updatePlugin({ policy: value })
}

const handleRedisHostChange = (value) => {
  updatePlugin({ redis_host: value })
}

const handleRedisPortChange = (value) => {
  updatePlugin({ redis_port: value })
}

const handleRedisUsernameChange = (value) => {
  updatePlugin({ redis_username: value })
}

const handleRedisPasswordChange = (value) => {
  updatePlugin({ redis_password: value })
}

const handleRedisSslChange = (value) => {
  updatePlugin({ redis_ssl: value })
}

const handleRedisSslVerifyChange = (value) => {
  updatePlugin({ redis_ssl_verify: value })
}

const handleRedisDatabaseChange = (value) => {
  updatePlugin({ redis_database: value })
}

const handleRedisTimeoutChange = (value) => {
  updatePlugin({ redis_timeout: value })
}

const handleRedisClusterNodesChange = (value) => {
  updatePlugin({ redis_cluster_nodes: value })
}

const handleRedisClusterNameChange = (value) => {
  updatePlugin({ redis_cluster_name: value })
}

const handleRedisClusterSslChange = (value) => {
  updatePlugin({ redis_cluster_ssl: value })
}

const handleRedisClusterSslVerifyChange = (value) => {
  updatePlugin({ redis_cluster_ssl_verify: value })
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
</style>
