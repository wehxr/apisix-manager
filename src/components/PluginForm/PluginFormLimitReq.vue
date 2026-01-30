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
      <el-switch :model-value="enabled" @update:model-value="handleEnableChange" />
    </el-form-item>
    <template v-if="enabled">
      <el-form-item label="请求速率（rate）（req/s）" required>
        <el-input-number
          :model-value="rate"
          @update:model-value="handleRateChange"
          :min="0.01"
          :max="10000"
          :step="0.1"
          style="width: 100%"
        />
        <div class="form-tip">
          <p><strong>说明：</strong>每秒允许处理的最大请求数（基础速率）。这是漏桶算法的核心参数。</p>
          <p><strong>工作原理：</strong></p>
          <ul>
            <li>当请求速率 ≤ rate 时：请求立即处理，无延迟</li>
            <li>当请求速率 > rate 但 ≤ (rate + burst) 时：超出 rate 的请求会被延迟处理，放入漏桶中排队</li>
            <li>当请求速率 > (rate + burst) 时：超出突发容量的请求会被直接拒绝</li>
          </ul>
          <p><strong>示例：</strong>rate=10 表示每秒最多处理 10 个请求，超过的请求会被延迟或拒绝。</p>
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
          <p><strong>说明：</strong>突发容量用于控制允许超过基础速率（rate）的请求数量，这些请求会被延迟处理而不是立即拒绝。</p>
          <p><strong>工作原理：</strong></p>
          <ul>
            <li>当请求速率 ≤ rate 时：请求正常处理，无延迟</li>
            <li>当请求速率 > rate 但 ≤ (rate + burst) 时：超出 rate 的请求会被延迟处理，放入漏桶中排队等待</li>
            <li>当请求速率 > (rate + burst) 时：超出突发容量的请求会被直接拒绝，返回拒绝状态码</li>
          </ul>
          <p><strong>示例：</strong>rate=10, burst=5 时：</p>
          <ul>
            <li>每秒最多可处理 15 个请求（10 + 5）</li>
            <li>前 10 个请求立即处理（基础速率）</li>
            <li>接下来的 5 个请求会被延迟处理（突发容量）</li>
            <li>超过 15 个的请求会被直接拒绝</li>
          </ul>
          <p><strong>建议：</strong>burst 通常设置为 rate 的 1-2 倍，既能应对突发流量，又不会对后端造成过大压力。</p>
        </div>
      </el-form-item>
      
      <el-divider>限制键配置</el-divider>
      <el-form-item label="限制键（key）" required>
        <el-input
          :model-value="key"
          @update:model-value="handleKeyChange"
          placeholder="如: $remote_addr $consumer_name"
        />
        <div class="key-description">
          <div class="description-content">
            <p><strong>说明：</strong>limit-req 插件使用变量组合（var_combination）方式，按多个变量组合进行限流。</p>
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
      <el-form-item label="无延迟模式">
        <el-switch
          :model-value="nodelay"
          @update:model-value="handleNodelayChange"
        />
        <div class="form-tip">
          <p><strong>说明：</strong>控制突发容量（burst）内的请求处理方式。</p>
          <p><strong>关闭（false）：</strong></p>
          <ul>
            <li>超过基础速率但在突发容量内的请求会被延迟处理</li>
            <li>流量更平滑，对后端压力更均匀</li>
            <li>响应可能略有延迟，但能更好地保护后端服务</li>
          </ul>
          <p><strong>开启（true）：</strong></p>
          <ul>
            <li>突发容量内的请求立即处理，不延迟</li>
            <li>可以更快响应突发流量，用户体验更好</li>
            <li>可能对后端造成瞬时压力，需要确保后端能承受</li>
          </ul>
          <p><strong>建议：</strong>对于需要快速响应的 API，建议开启；对于需要保护后端的场景，建议关闭。</p>
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
        <div class="form-tip">
          <p><strong>说明：</strong>当请求超过配置的速率限制（超过 rate + burst）时，APISIX 会拒绝该请求并返回此 HTTP 状态码。</p>
          <p><strong>默认值：</strong>429（Too Many Requests）</p>
          <p><strong>常用值：</strong></p>
          <ul>
            <li><strong>429</strong> - Too Many Requests（推荐，语义更明确，表示请求过多）</li>
            <li><strong>503</strong> - Service Unavailable（表示服务不可用）</li>
            <li><strong>403</strong> - Forbidden（表示禁止访问）</li>
          </ul>
        </div>
      </el-form-item>
      <el-form-item label="拒绝消息">
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
      <el-form-item label="响应头包含配额信息">
        <el-switch
          :model-value="showLimitQuotaHeader"
          @update:model-value="handleShowLimitQuotaHeaderChange"
        />
        <div class="form-tip">
          <p><strong>说明：</strong>控制是否在响应头中包含速率限制相关的信息。</p>
          <p><strong>开启后（true）：</strong>响应头会包含以下字段：</p>
          <ul>
            <li><code>X-RateLimit-Limit</code> - 总配额（rate + burst）</li>
            <li><code>X-RateLimit-Remaining</code> - 剩余配额</li>
          </ul>
          <p><strong>关闭后（false）：</strong>响应头中不包含速率限制信息。</p>
          <p><strong>使用场景：</strong>客户端可以通过这些响应头了解当前的速率限制状态，便于实现更好的用户体验和错误处理。</p>
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
import { computed } from 'vue'
import { isPluginEnabled, setPluginEnabled } from '@/utils/plugin'
import { usePluginConfig } from '@/composables/usePluginConfig'

const props = defineProps({
  modelValue: { type: Object, default: () => ({}) },
  resourceType: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])
const { config, updateConfig } = usePluginConfig(props, emit)

const enabled = computed(() => isPluginEnabled(config.value))

// 计算各个字段
const rate = computed(() => {
  return config.value.rate || 1
})

const burst = computed(() => {
  return config.value.burst !== undefined ? config.value.burst : 0
})

// key_type 固定为 'var_combination'
const keyType = computed(() => 'var_combination')

const key = computed(() => {
  return config.value.key || '$remote_addr'
})

const nodelay = computed(() => {
  return config.value.nodelay !== undefined ? config.value.nodelay : false
})

const rejectionCode = computed(() => {
  // 兼容旧配置中的 rejection_code，但优先使用 rejected_code
  return config.value.rejected_code !== undefined 
    ? config.value.rejected_code 
    : (config.value.rejection_code !== undefined ? config.value.rejection_code : 429)
})

const rejectionMsg = computed(() => {
  // 兼容旧配置中的 rejection_msg，但优先使用 rejected_msg
  const msg = config.value.rejected_msg !== undefined 
    ? config.value.rejected_msg 
    : config.value.rejection_msg
  return msg !== undefined ? msg : ''
})

const showLimitQuotaHeader = computed(() => {
  return config.value.show_limit_quota_header !== undefined ? config.value.show_limit_quota_header : true
})

const allowDegradation = computed(() => {
  return config.value.allow_degradation !== undefined ? config.value.allow_degradation : true
})

const policy = computed(() => {
  return config.value.policy || 'local'
})

const redisHost = computed(() => {
  return config.value.redis_host || ''
})

const redisPort = computed(() => {
  return config.value.redis_port !== undefined ? config.value.redis_port : 6379
})

const redisUsername = computed(() => {
  return config.value.redis_username || ''
})

const redisPassword = computed(() => {
  return config.value.redis_password || ''
})

const redisSsl = computed(() => {
  return config.value.redis_ssl !== undefined ? config.value.redis_ssl : false
})

const redisSslVerify = computed(() => {
  return config.value.redis_ssl_verify !== undefined ? config.value.redis_ssl_verify : false
})

const redisDatabase = computed(() => {
  return config.value.redis_database !== undefined ? config.value.redis_database : 0
})

const redisTimeout = computed(() => {
  return config.value.redis_timeout !== undefined ? config.value.redis_timeout : 1000
})

const redisClusterNodes = computed(() => {
  return Array.isArray(config.value.redis_cluster_nodes) 
    ? config.value.redis_cluster_nodes 
    : []
})

const redisClusterName = computed(() => {
  return config.value.redis_cluster_name || ''
})

const redisClusterSsl = computed(() => {
  return config.value.redis_cluster_ssl !== undefined ? config.value.redis_cluster_ssl : false
})

const redisClusterSslVerify = computed(() => {
  return config.value.redis_cluster_ssl_verify !== undefined ? config.value.redis_cluster_ssl_verify : false
})

function buildLimitReqConfig() {
  const cfg = {
    rate: rate.value > 0 ? rate.value : 1,
    burst: burst.value,
    key_type: 'var_combination',
    key: key.value,
    nodelay: nodelay.value,
    rejected_code: rejectionCode.value,
    show_limit_quota_header: showLimitQuotaHeader.value,
    allow_degradation: allowDegradation.value,
    policy: policy.value
  }
  if (rejectionMsg.value) cfg.rejected_msg = rejectionMsg.value
  if (policy.value === 'redis') {
    if (redisHost.value) cfg.redis_host = redisHost.value
    if (redisPort.value) cfg.redis_port = redisPort.value
    if (redisUsername.value) cfg.redis_username = redisUsername.value
    if (redisPassword.value) cfg.redis_password = redisPassword.value
    if (redisSsl.value !== undefined) cfg.redis_ssl = redisSsl.value
    if (redisSslVerify.value !== undefined) cfg.redis_ssl_verify = redisSslVerify.value
    if (redisDatabase.value !== undefined) cfg.redis_database = redisDatabase.value
    if (redisTimeout.value !== undefined) cfg.redis_timeout = redisTimeout.value
  }
  if (policy.value === 'redis-cluster') {
    if (redisClusterNodes.value.length) cfg.redis_cluster_nodes = redisClusterNodes.value
    if (redisClusterName.value) cfg.redis_cluster_name = redisClusterName.value
    if (redisPassword.value) cfg.redis_password = redisPassword.value
    if (redisTimeout.value !== undefined) cfg.redis_timeout = redisTimeout.value
    if (redisClusterSsl.value !== undefined) cfg.redis_cluster_ssl = redisClusterSsl.value
    if (redisClusterSslVerify.value !== undefined) cfg.redis_cluster_ssl_verify = redisClusterSslVerify.value
  }
  return cfg
}

function handleEnableChange(value) {
  const cfg = value ? buildLimitReqConfig() : { ...config.value }
  setPluginEnabled(cfg, value)
  updateConfig(cfg)
}

function updatePlugin(updates) {
  const cfg = { ...config.value, ...updates, key_type: 'var_combination' }
  setPluginEnabled(cfg, enabled.value)
  updateConfig(cfg)
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
  updatePlugin({ rejected_code: value })
}

const handleRejectionMsgChange = (value) => {
  if (value) {
    updatePlugin({ rejected_msg: value })
  } else {
    const cfg = { ...config.value }
    delete cfg.rejected_msg
    setPluginEnabled(cfg, enabled.value)
    updateConfig(cfg)
  }
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
