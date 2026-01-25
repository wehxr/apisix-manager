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
          此插件通过并发连接数来限制请求速率。超过阈值的请求将根据配置被延迟或拒绝，从而确保可控的资源使用并防止过载。
          适用于需要控制并发连接数的场景，可以防止过多并发连接对服务器造成压力。
        </div>
      </template>
    </el-alert>
    <el-divider>配置</el-divider>
    <el-form-item label="开启插件">
      <el-switch :model-value="localEnabled" @update:model-value="handleEnableChange" />
    </el-form-item>
    <template v-if="localEnabled">
      <el-form-item label="最大并发连接数（conn）" required>
        <el-input-number
          :model-value="conn"
          @update:model-value="handleConnChange"
          :min="1"
          :max="100000"
          style="width: 100%"
        />
        <div class="form-tip">
          <p><strong>说明：</strong>允许的最大并发连接数（单位：个）。超过配置的限制且低于 conn + burst 的请求将被延迟。</p>
          <p><strong>单位：</strong>个（数量单位），表示同时存在的连接数量，不是每秒的连接数。</p>
          <p><strong>工作原理：</strong></p>
          <ul>
            <li>当并发连接数 ≤ conn 时：请求立即处理，无延迟</li>
            <li>当并发连接数 > conn 但 ≤ (conn + burst) 时：超出 conn 的请求会被延迟处理</li>
            <li>当并发连接数 > (conn + burst) 时：超出突发容量的请求会被直接拒绝</li>
          </ul>
          <p><strong>示例：</strong>conn=5 表示最多允许同时存在 5 个并发连接，超过的请求会被延迟或拒绝。</p>
        </div>
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
          <p><strong>说明：</strong>允许延迟的过多并发连接数（单位：个）。超过限制的请求将被立即拒绝。</p>
          <p><strong>单位：</strong>个（数量单位），表示在 conn 基础上额外允许的并发连接数量。</p>
          <p><strong>工作原理：</strong></p>
          <ul>
            <li>当并发连接数 ≤ conn 时：请求正常处理，无延迟</li>
            <li>当并发连接数 > conn 但 ≤ (conn + burst) 时：超出 conn 的请求会被延迟处理</li>
            <li>当并发连接数 > (conn + burst) 时：超出突发容量的请求会被直接拒绝，返回拒绝状态码</li>
          </ul>
          <p><strong>示例：</strong>conn=5, burst=3 时：</p>
          <ul>
            <li>最多可处理 8 个并发连接（5 + 3）</li>
            <li>前 5 个连接立即处理（基础连接数）</li>
            <li>接下来的 3 个连接会被延迟处理（突发容量）</li>
            <li>超过 8 个的连接会被直接拒绝</li>
          </ul>
        </div>
      </el-form-item>
      <el-form-item label="默认连接延迟（default_conn_delay）（秒）" required>
        <el-input-number
          :model-value="defaultConnDelay"
          @update:model-value="handleDefaultConnDelayChange"
          :min="0.01"
          :max="3600"
          :step="0.1"
          style="width: 100%"
        />
        <div class="form-tip">
          <p><strong>说明：</strong>允许超过 conn + burst 的并发请求的处理延迟（秒），可根据 only_use_default_delay 设置动态调整。</p>
          <p><strong>工作原理：</strong></p>
          <ul>
            <li>当 only_use_default_delay 为 false 时：根据请求超出 conn 限制的程度按比例延迟请求。拥塞越严重，延迟就越大。</li>
            <li>当 only_use_default_delay 为 true 时：使用 default_conn_delay 延迟 burst 范围内的所有超额请求。</li>
          </ul>
          <p><strong>示例：</strong>conn=5, burst=3, default_conn_delay=1 时：</p>
          <ul>
            <li>如果 only_use_default_delay=false：6 个并发请求延迟 1 秒，7 个请求延迟 2 秒，8 个请求延迟 3 秒</li>
            <li>如果 only_use_default_delay=true：6、7 或 8 个并发请求都延迟 1 秒</li>
          </ul>
        </div>
      </el-form-item>
      <el-form-item label="仅使用默认延迟（only_use_default_delay）">
        <el-switch
          :model-value="onlyUseDefaultDelay"
          @update:model-value="handleOnlyUseDefaultDelayChange"
        />
        <div class="form-tip">
          <p><strong>说明：</strong>控制延迟计算方式。</p>
          <p><strong>关闭（false）：</strong></p>
          <ul>
            <li>根据请求超出 conn 限制的程度按比例延迟请求</li>
            <li>拥塞越严重，延迟就越大</li>
            <li>例如：conn=5, burst=3, default_conn_delay=1 时，6 个并发请求延迟 1 秒，7 个请求延迟 2 秒，8 个请求延迟 3 秒</li>
          </ul>
          <p><strong>开启（true）：</strong></p>
          <ul>
            <li>使用 default_conn_delay 延迟 burst 范围内的所有超额请求</li>
            <li>所有超额请求使用相同的延迟时间</li>
            <li>例如：conn=5, burst=3, default_conn_delay=1 时，6、7 或 8 个并发请求都延迟 1 秒</li>
          </ul>
        </div>
      </el-form-item>
      
      <el-divider>限制键配置</el-divider>
      <el-form-item label="限制键（key）">
        <el-input
          :model-value="key"
          @update:model-value="handleKeyChange"
          placeholder="如: $remote_addr $consumer_name"
        />
        <div class="key-description">
          <div class="description-content">
            <p><strong>说明：</strong>limit-conn 插件使用变量组合（var_combination）方式，按多个变量组合进行限流。</p>
            <p><strong>配置方式：</strong>填写一个或多个变量，用空格分隔，所有变量都需要以 <code>$</code> 开头。</p>
            <p><strong>常用变量：</strong></p>
            <ul>
              <li><code>$remote_addr</code> - 客户端 IP 地址</li>
              <li><code>$consumer_name</code> - 消费者名称</li>
              <li><code>$http_x_api_key</code> - 请求头中的 API 密钥（如 X-API-Key）</li>
              <li><code>$arg_api_key</code> - URL 参数中的 API 密钥（如 ?api_key=xxx）</li>
              <li><code>$http_user_agent</code> - 用户代理（User-Agent）</li>
            </ul>
            <p><strong>示例：</strong></p>
            <ul>
              <li><code>$remote_addr</code> - 按 IP 地址限流，每个 IP 独立计数</li>
              <li><code>$remote_addr $consumer_name</code> - 按「IP地址 + 消费者名称」组合限流，同一IP的同一消费者共享配额</li>
              <li><code>$http_x_api_key $remote_addr</code> - 按「API密钥 + IP地址」组合限流</li>
            </ul>
            <p><strong>工作原理：</strong>只有当所有变量的值都完全相同时，才会共享同一个计数器。例如，IP为 192.168.1.1 且消费者为 john 的请求，与 IP为 192.168.1.1 且消费者为 jane 的请求，会使用不同的计数器。</p>
          </div>
        </div>
      </el-form-item>

      <el-divider>基本配置</el-divider>
      <el-form-item label="拒绝状态码（rejection_code）">
        <el-input-number
          :model-value="rejectionCode"
          @update:model-value="handleRejectionCodeChange"
          :min="200"
          :max="599"
          style="width: 100%"
        />
        <div class="form-tip">
          <p><strong>说明：</strong>当请求超过配置的配额限制时，APISIX 会拒绝该请求并返回此 HTTP 状态码。</p>
          <p><strong>默认值：</strong>429 Unavailable）</p>
          <p><strong>常用值：</strong></p>
          <ul>
            <li><strong>429</strong> - Too Many Requests（推荐，语义更明确，表示请求过多）</li>
            <li><strong>503</strong> - Service Unavailable（默认值，表示服务不可用）</li>
            <li><strong>403</strong> - Forbidden（表示禁止访问）</li>
          </ul>
        </div>
      </el-form-item>
      <el-form-item label="拒绝消息（rejection_msg）">
        <el-input
          :model-value="rejectionMsg"
          @update:model-value="handleRejectionMsgChange"
          type="textarea"
          :rows="3"
          placeholder="请求被拒绝时返回的消息，例如：请求过于频繁，请稍后再试"
        />
        <div class="form-tip">
          <p><strong>说明：</strong>可选配置，当请求被限流拒绝时，会在响应体中返回此消息内容。</p>
          <p><strong>使用场景：</strong>用于向客户端返回友好的错误提示信息，帮助用户理解为什么请求被拒绝。</p>
          <p><strong>示例：</strong></p>
          <ul>
            <li><code>请求过于频繁，请稍后再试</code></li>
            <li><code>Rate limit exceeded. Please try again later.</code></li>
            <li><code>您已达到请求限制，请稍后再试</code></li>
          </ul>
          <p><strong>注意：</strong>如果不填写，APISIX 会返回默认的错误信息。</p>
        </div>
      </el-form-item>
      <el-form-item label="允许降级（allow_degradation）">
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
      <el-form-item label="策略（policy）">
        <el-radio-group :model-value="policy" @update:model-value="handlePolicyChange">
          <el-radio label="local">本地内存 (local)</el-radio>
          <el-radio label="redis">Redis (redis)</el-radio>
          <el-radio label="redis-cluster">Redis 集群 (redis-cluster)</el-radio>
        </el-radio-group>
        <div class="form-tip">速率限制计数器的策略</div>
      </el-form-item>

      <!-- Redis 配置 -->
      <template v-if="policy === 'redis'">
        <el-form-item label="Redis 主机（redis_host）" required>
          <el-input
            :model-value="redisHost"
            @update:model-value="handleRedisHostChange"
            placeholder="如: 192.168.1.100"
          />
        </el-form-item>
        <el-form-item label="Redis 端口（redis_port）">
          <el-input-number
            :model-value="redisPort"
            @update:model-value="handleRedisPortChange"
            :min="1"
            :max="65535"
            style="width: 100%"
          />
          <div class="form-tip">默认 6379</div>
        </el-form-item>
        <el-form-item label="Redis 用户名（redis_username）">
          <el-input
            :model-value="redisUsername"
            @update:model-value="handleRedisUsernameChange"
            placeholder="如果使用 Redis ACL，则为 Redis 的用户名"
          />
          <div class="form-tip">如果使用 Redis ACL，则为 Redis 的用户名。如果使用旧式身份验证方法 requirepass，则仅配置 redis_password</div>
        </el-form-item>
        <el-form-item label="Redis 密码（redis_password）">
          <el-input
            :model-value="redisPassword"
            @update:model-value="handleRedisPasswordChange"
            type="password"
            show-password
            placeholder="Redis 节点的密码"
          />
        </el-form-item>
        <el-form-item label="Redis SSL（redis_ssl）">
          <el-switch
            :model-value="redisSsl"
            @update:model-value="handleRedisSslChange"
          />
          <div class="form-tip">如果为 true，则使用 SSL 连接到 Redis</div>
        </el-form-item>
        <el-form-item label="Redis SSL 验证（redis_ssl_verify）">
          <el-switch
            :model-value="redisSslVerify"
            @update:model-value="handleRedisSslVerifyChange"
          />
          <div class="form-tip">如果为 true，则验证服务器 SSL 证书</div>
        </el-form-item>
        <el-form-item label="Redis 数据库（redis_database）">
          <el-input-number
            :model-value="redisDatabase"
            @update:model-value="handleRedisDatabaseChange"
            :min="0"
            style="width: 100%"
          />
          <div class="form-tip">Redis 中的数据库编号，默认 0</div>
        </el-form-item>
        <el-form-item label="Redis 超时（redis_timeout）（毫秒）">
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
        <el-form-item label="Redis 集群节点（redis_cluster_nodes）" required>
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
        <el-form-item label="Redis 集群名称（redis_cluster_name）">
          <el-input
            :model-value="redisClusterName"
            @update:model-value="handleRedisClusterNameChange"
            placeholder="Redis 集群名称"
          />
        </el-form-item>
        <el-form-item label="Redis 密码（redis_password）">
          <el-input
            :model-value="redisPassword"
            @update:model-value="handleRedisPasswordChange"
            type="password"
            show-password
            placeholder="Redis 节点的密码"
          />
        </el-form-item>
        <el-form-item label="Redis 超时（redis_timeout）（毫秒）">
          <el-input-number
            :model-value="redisTimeout"
            @update:model-value="handleRedisTimeoutChange"
            :min="1"
            style="width: 100%"
          />
          <div class="form-tip">Redis 超时值，单位：毫秒，默认 1000</div>
        </el-form-item>
        <el-form-item label="Redis 集群 SSL（redis_cluster_ssl）">
          <el-switch
            :model-value="redisClusterSsl"
            @update:model-value="handleRedisClusterSslChange"
          />
          <div class="form-tip">如果为 true，则使用 SSL 连接 Redis 集群</div>
        </el-form-item>
        <el-form-item label="Redis 集群 SSL 验证（redis_cluster_ssl_verify）">
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
import { usePluginConfig } from '../../composables/usePluginConfig'

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

// 从 plugins 中提取 limit-conn 配置
const limitConnPlugin = computed(() => plugins.value['limit-conn'] || {})

// 计算 enabled 状态
const enabled = computed(() => isPluginEnabled(limitConnPlugin.value))

// 计算各个字段
const conn = computed(() => {
  return limitConnPlugin.value.conn !== undefined ? limitConnPlugin.value.conn : 1
})

const burst = computed(() => {
  return limitConnPlugin.value.burst !== undefined ? limitConnPlugin.value.burst : 0
})

const defaultConnDelay = computed(() => {
  return limitConnPlugin.value.default_conn_delay !== undefined ? limitConnPlugin.value.default_conn_delay : 1
})

const onlyUseDefaultDelay = computed(() => {
  return limitConnPlugin.value.only_use_default_delay !== undefined ? limitConnPlugin.value.only_use_default_delay : false
})

// key_type 固定为 'var_combination'，不在表单上显示
const keyType = computed(() => 'var_combination')

const key = computed(() => {
  return limitConnPlugin.value.key !== undefined ? limitConnPlugin.value.key : '$remote_addr'
})

const rejectionCode = computed(() => {
  // 兼容旧配置中的 rejection_code，但优先使用 rejected_code
  return limitConnPlugin.value.rejection_code !== undefined 
    ? limitConnPlugin.value.rejection_code 
    : (limitConnPlugin.value.rejected_code !== undefined ? limitConnPlugin.value.rejected_code : 429)
})

const rejectionMsg = computed(() => {
  // 兼容旧配置中的 rejection_msg，但优先使用 rejected_msg
  return limitConnPlugin.value.rejection_msg !== undefined 
    ? limitConnPlugin.value.rejection_msg 
    : (limitConnPlugin.value.rejection_msg !== undefined ? limitConnPlugin.value.rejection_msg : '请求过于频繁，请稍后再试')
})

const allowDegradation = computed(() => {
  return limitConnPlugin.value.allow_degradation !== undefined ? limitConnPlugin.value.allow_degradation : false
})

const policy = computed(() => {
  return limitConnPlugin.value.policy || 'local'
})

const redisHost = computed(() => {
  return limitConnPlugin.value.redis_host || ''
})

const redisPort = computed(() => {
  return limitConnPlugin.value.redis_port !== undefined ? limitConnPlugin.value.redis_port : 6379
})

const redisUsername = computed(() => {
  return limitConnPlugin.value.redis_username || ''
})

const redisPassword = computed(() => {
  return limitConnPlugin.value.redis_password || ''
})

const redisSsl = computed(() => {
  return limitConnPlugin.value.redis_ssl !== undefined ? limitConnPlugin.value.redis_ssl : false
})

const redisSslVerify = computed(() => {
  return limitConnPlugin.value.redis_ssl_verify !== undefined ? limitConnPlugin.value.redis_ssl_verify : false
})

const redisDatabase = computed(() => {
  return limitConnPlugin.value.redis_database !== undefined ? limitConnPlugin.value.redis_database : 0
})

const redisTimeout = computed(() => {
  return limitConnPlugin.value.redis_timeout !== undefined ? limitConnPlugin.value.redis_timeout : 1000
})

const redisClusterNodes = computed(() => {
  return Array.isArray(limitConnPlugin.value.redis_cluster_nodes) 
    ? limitConnPlugin.value.redis_cluster_nodes 
    : []
})

const redisClusterName = computed(() => {
  return limitConnPlugin.value.redis_cluster_name || ''
})

const redisClusterSsl = computed(() => {
  return limitConnPlugin.value.redis_cluster_ssl !== undefined ? limitConnPlugin.value.redis_cluster_ssl : false
})

const redisClusterSslVerify = computed(() => {
  return limitConnPlugin.value.redis_cluster_ssl_verify !== undefined ? limitConnPlugin.value.redis_cluster_ssl_verify : false
})

// 内部状态
const localEnabled = ref(enabled.value)

// 监听 props 变化，更新内部状态
watch(enabled, (newEnabled) => {
  localEnabled.value = newEnabled
}, { immediate: true })

// 监听内部状态变化，更新到父组件
watch(localEnabled, (newEnabled) => {
  const currentPlugins = { ...plugins.value }
  
  if (newEnabled) {
    currentPlugins['limit-conn'] = {
      conn: conn.value > 0 ? conn.value : 1,
      burst: burst.value,
      default_conn_delay: defaultConnDelay.value > 0 ? defaultConnDelay.value : 1,
      only_use_default_delay: onlyUseDefaultDelay.value,
      key_type: 'var_combination', // 固定为 var_combination
      key: key.value,
      rejection_code: rejectionCode.value,
      allow_degradation: allowDegradation.value,
      policy: policy.value
    }
    
    if (rejectionMsg.value) {
      currentPlugins['limit-conn'].rejection_msg = rejectionMsg.value
    }
    
    // Redis 配置
    if (policy.value === 'redis') {
      if (redisHost.value) currentPlugins['limit-conn'].redis_host = redisHost.value
      if (redisPort.value) currentPlugins['limit-conn'].redis_port = redisPort.value
      if (redisUsername.value) currentPlugins['limit-conn'].redis_username = redisUsername.value
      if (redisPassword.value) currentPlugins['limit-conn'].redis_password = redisPassword.value
      if (redisSsl.value !== undefined) currentPlugins['limit-conn'].redis_ssl = redisSsl.value
      if (redisSslVerify.value !== undefined) currentPlugins['limit-conn'].redis_ssl_verify = redisSslVerify.value
      if (redisDatabase.value !== undefined) currentPlugins['limit-conn'].redis_database = redisDatabase.value
      if (redisTimeout.value !== undefined) currentPlugins['limit-conn'].redis_timeout = redisTimeout.value
    }
    
    // Redis Cluster 配置
    if (policy.value === 'redis-cluster') {
      if (redisClusterNodes.value.length > 0) currentPlugins['limit-conn'].redis_cluster_nodes = redisClusterNodes.value
      if (redisClusterName.value) currentPlugins['limit-conn'].redis_cluster_name = redisClusterName.value
      if (redisPassword.value) currentPlugins['limit-conn'].redis_password = redisPassword.value
      if (redisTimeout.value !== undefined) currentPlugins['limit-conn'].redis_timeout = redisTimeout.value
      if (redisClusterSsl.value !== undefined) currentPlugins['limit-conn'].redis_cluster_ssl = redisClusterSsl.value
      if (redisClusterSslVerify.value !== undefined) currentPlugins['limit-conn'].redis_cluster_ssl_verify = redisClusterSslVerify.value
    }
    
    setPluginEnabled(currentPlugins['limit-conn'], true)
  } else {
    currentPlugins['limit-conn'] = currentPlugins['limit-conn'] || {}
    setPluginEnabled(currentPlugins['limit-conn'], false)
  }
  
  updatePlugins(currentPlugins)
})

const handleEnableChange = (value) => {
  localEnabled.value = value
}

// 更新插件的辅助函数
const updatePlugin = (updates) => {
  const currentPlugins = { ...plugins.value }
  
  currentPlugins['limit-conn'] = {
    ...limitConnPlugin.value,
    ...updates,
    key_type: 'var_combination' // 确保 key_type 始终为 var_combination
  }
  setPluginEnabled(currentPlugins['limit-conn'], enabled.value)
  
  updatePlugins(currentPlugins)
}

const handleConnChange = (value) => {
  updatePlugin({ conn: value > 0 ? value : 1 })
}

const handleBurstChange = (value) => {
  updatePlugin({ burst: value })
}

const handleDefaultConnDelayChange = (value) => {
  updatePlugin({ default_conn_delay: value > 0 ? value : 1 })
}

const handleOnlyUseDefaultDelayChange = (value) => {
  updatePlugin({ only_use_default_delay: value })
}

const handleKeyChange = (value) => {
  updatePlugin({ key: value })
}

const handleRejectionCodeChange = (value) => {
  updatePlugin({ rejection_code: value })
}

const handleRejectionMsgChange = (value) => {
  if (value) {
    updatePlugin({ rejection_msg: value })
  } else {
    const currentPlugins = { ...plugins.value }
    currentPlugins['limit-conn'] = { ...limitConnPlugin.value }
    delete currentPlugins['limit-conn'].rejection_msg
    setPluginEnabled(currentPlugins['limit-conn'], enabled.value)
    updatePlugins(currentPlugins)
  }
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
  if (value) {
    updatePlugin({ redis_username: value })
  } else {
    const currentPlugins = { ...plugins.value }
    currentPlugins['limit-conn'] = { ...limitConnPlugin.value }
    delete currentPlugins['limit-conn'].redis_username
    setPluginEnabled(currentPlugins['limit-conn'], enabled.value)
    updatePlugins(currentPlugins)
  }
}

const handleRedisPasswordChange = (value) => {
  if (value) {
    updatePlugin({ redis_password: value })
  } else {
    const currentPlugins = { ...plugins.value }
    currentPlugins['limit-conn'] = { ...limitConnPlugin.value }
    delete currentPlugins['limit-conn'].redis_password
    setPluginEnabled(currentPlugins['limit-conn'], enabled.value)
    updatePlugins(currentPlugins)
  }
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
  if (value) {
    updatePlugin({ redis_cluster_name: value })
  } else {
    const currentPlugins = { ...plugins.value }
    currentPlugins['limit-conn'] = { ...limitConnPlugin.value }
    delete currentPlugins['limit-conn'].redis_cluster_name
    setPluginEnabled(currentPlugins['limit-conn'], enabled.value)
    updatePlugins(currentPlugins)
  }
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
  line-height: 1.6;
}

.form-tip p {
  margin: 8px 0;
}

.form-tip ul {
  margin: 8px 0;
  padding-left: 20px;
}

.form-tip li {
  margin: 4px 0;
}

.form-tip code {
  background-color: #f5f7fa;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 11px;
  color: #e6a23c;
}

.key-description {
  margin-top: 12px;
  padding: 16px;
  background: linear-gradient(135deg, #f5f7fa 0%, #fafbfc 100%);
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.description-content {
  font-size: 13px;
  color: #606266;
  line-height: 1.8;
  padding: 16px;
  background: #ffffff;
  border-radius: 6px;
  border-left: 4px solid #409eff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.description-content p {
  margin: 10px 0;
}

.description-content strong {
  color: #303133;
  font-weight: 600;
}

.description-content ul {
  margin: 10px 0;
  padding-left: 24px;
}

.description-content li {
  margin: 6px 0;
  position: relative;
}

.description-content code {
  background-color: #f0f2f5;
  padding: 3px 8px;
  border-radius: 4px;
  font-family: 'Courier New', 'Consolas', monospace;
  font-size: 12px;
  color: #e6a23c;
  border: 1px solid #e4e7ed;
}
</style>
