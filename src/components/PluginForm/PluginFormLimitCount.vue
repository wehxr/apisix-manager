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
          此插件使用固定窗口算法，通过给定时间间隔内的请求数量来限制请求速率。超过配置配额的请求将被拒绝。
          适用于需要精确控制请求数量的场景，可以防止短时间内大量请求对服务器造成冲击。
        </div>
      </template>
    </el-alert>
    <el-divider>配置</el-divider>
    <el-form-item label="开启插件">
      <el-switch :model-value="enabled" @update:model-value="handleEnableChange" />
    </el-form-item>
    <template v-if="enabled">
      <el-form-item label="请求数量（count）" required>
        <el-input-number
          :model-value="count"
          @update:model-value="handleCountChange"
          :min="1"
          :max="100000"
          style="width: 100%"
        />
        <div class="form-tip">给定时间间隔内允许的最大请求数</div>
      </el-form-item>
      <el-form-item label="时间窗口（time_window）（秒）" required>
        <el-input-number
          :model-value="timeWindow"
          @update:model-value="handleTimeWindowChange"
          :min="1"
          :max="86400"
          style="width: 100%"
        />
        <div class="form-tip">速率限制 count 对应的时间间隔（以秒为单位）</div>
      </el-form-item>
      
      <el-divider>限制键配置</el-divider>
      <el-form-item label="键类型（key_type）">
        <el-radio-group :model-value="keyType" @update:model-value="handleKeyTypeChange">
          <el-radio label="var_combination">变量组合 (var_combination)</el-radio>
          <el-radio label="constant">常量 (constant)</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="键类型说明" class="key-type-desc-item">
        <div class="key-type-description">
          <div class="description-item">
            <div class="description-title">
              <el-icon><Connection /></el-icon>
              <strong>var_combination（变量组合）</strong>
            </div>
            <div class="description-content">
              <p><strong>用途：</strong>按多个变量组合进行限流，适用于需要同时考虑多个维度的场景。</p>
              <p><strong>配置方式：</strong>在「限制键（key）」中填写多个变量，用空格分隔，所有变量都需要以 <code>$</code> 开头。</p>
              <p><strong>示例：</strong></p>
              <ul>
                <li><code>$remote_addr $consumer_name</code> - 按「IP地址 + 消费者名称」组合限流，同一IP的同一消费者共享配额</li>
                <li><code>$http_x_api_key $remote_addr</code> - 按「API密钥 + IP地址」组合限流</li>
                <li><code>$remote_addr $http_user_agent</code> - 按「IP地址 + 用户代理」组合限流</li>
              </ul>
              <p><strong>工作原理：</strong>只有当所有变量的值都完全相同时，才会共享同一个计数器。例如，IP为 192.168.1.1 且消费者为 john 的请求，与 IP为 192.168.1.1 且消费者为 jane 的请求，会使用不同的计数器。</p>
            </div>
          </div>
          <div class="description-item">
            <div class="description-title">
              <el-icon><Lock /></el-icon>
              <strong>constant（常量）</strong>
            </div>
            <div class="description-content">
              <p><strong>用途：</strong>实现全局限流，所有请求共享同一个计数器，无论请求来源如何。</p>
              <p><strong>配置方式：</strong>在「限制键（key）」中任意填写一个固定的字符串作为计数器的标识名称。这个字符串不会从请求中提取，只是给计数器起个名字。</p>
              <p><strong>示例：</strong></p>
              <ul>
                <li><code>global_limit</code> - 全局限流</li>
                <li><code>api_limit</code> - API总限流</li>
                <li><code>my_service_limit</code> - 服务总限流</li>
              </ul>
              <p><strong>工作原理：</strong>所有请求都使用这个相同的 key，因此它们共享同一个计数器。例如，如果配置 count=1000，那么所有请求加起来在时间窗口内最多只能有 1000 次请求，无论这些请求来自哪个IP、哪个消费者。</p>
              <p><strong>适用场景：</strong>保护整个API服务，防止总请求量过大对后端造成压力。常用于：</p>
              <ul>
                <li>保护后端服务总容量</li>
                <li>实现API级别的全局配额</li>
                <li>防止分布式攻击（所有来源共享配额）</li>
              </ul>
            </div>
          </div>
        </div>
      </el-form-item>
      <el-form-item label="限制键（key）">
        <el-input
          :model-value="key"
          @update:model-value="handleKeyChange"
          :placeholder="getKeyPlaceholder()"
        />
        <div class="form-tip">{{ getKeyTip() }}</div>
      </el-form-item>

      <el-divider>基本配置</el-divider>
      <el-form-item label="拒绝状态码（rejected_code）">
        <el-input-number
          :model-value="rejectionCode"
          @update:model-value="handleRejectionCodeChange"
          :min="200"
          :max="599"
          style="width: 100%"
        />
        <div class="form-tip">
          <p><strong>说明：</strong>当请求超过配置的配额限制时，APISIX 会拒绝该请求并返回此 HTTP 状态码。</p>
          <p><strong>默认值：</strong>429 Too Many Requests</p>
          <p><strong>常用值：</strong></p>
          <ul>
            <li><strong>429</strong> - Too Many Requests（推荐，语义更明确，表示请求过多）</li>
            <li><strong>503</strong> - Service Unavailable（默认值，表示服务不可用）</li>
            <li><strong>403</strong> - Forbidden（表示禁止访问）</li>
          </ul>
        </div>
      </el-form-item>
      <el-form-item label="拒绝消息（rejected_msg）">
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
      <el-form-item label="显示限制配额头（show_limit_quota_header）">
        <el-switch
          :model-value="showLimitQuotaHeader"
          @update:model-value="handleShowLimitQuotaHeaderChange"
        />
        <div class="form-tip">
          如果为 true，则在响应标头中包含 X-RateLimit-Limit（总配额）、X-RateLimit-Remaining（剩余配额）和 X-RateLimit-Reset（计数器重置的剩余秒数）
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
      <el-form-item label="分组（group）">
        <el-input
          :model-value="group"
          @update:model-value="handleGroupChange"
          placeholder="插件的 group ID"
        />
        <div class="form-tip">插件的 group ID，以便同一 group 的路由可以共享相同的速率限制计数器</div>
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
import { computed } from 'vue'
import { Connection, Lock } from '@element-plus/icons-vue'
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
const count = computed(() => {
  return config.value.count !== undefined ? config.value.count : 1
})

const timeWindow = computed(() => {
  return config.value.time_window !== undefined ? config.value.time_window : 60
})

const keyType = computed(() => {
  const t = config.value.key_type
  return t === 'var_combination' || t === 'constant' ? t : 'var_combination'
})

const key = computed(() => {
  return config.value.key !== undefined ? config.value.key : '$remote_addr'
})

const rejectionCode = computed(() => {
  // 兼容旧配置中的 rejection_code，但优先使用 rejected_code
  return config.value.rejected_code !== undefined 
    ? config.value.rejected_code 
    : (config.value.rejection_code !== undefined ? config.value.rejection_code : 429)
})

const rejectionMsg = computed(() => {
  // 兼容旧配置中的 rejection_msg，但优先使用 rejected_msg
  return config.value.rejected_msg !== undefined 
    ? config.value.rejected_msg 
    : (config.value.rejection_msg !== undefined ? config.value.rejection_msg : '请求过于频繁，请稍后再试')
})

const showLimitQuotaHeader = computed(() => {
  return config.value.show_limit_quota_header !== undefined ? config.value.show_limit_quota_header : true
})

const allowDegradation = computed(() => {
  return config.value.allow_degradation !== undefined ? config.value.allow_degradation : false
})

const group = computed(() => {
  return config.value.group || ''
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

const getKeyPlaceholder = () =>
  keyType.value === 'var_combination'
    ? '如: $remote_addr $consumer_name'
    : '任意填一个字符串即可，如: global_limit、api_limit、my_service'

const getKeyTip = () =>
  keyType.value === 'var_combination'
    ? '多个变量组合，用空格分隔，所有变量都需要 $ 前缀。例：$remote_addr $consumer_name（按IP+消费者组合限流）'
    : '常量模式下，key 不取自请求，是你自己起的「计数器名字」。填任意字符串即可，如 global_limit、api_limit。所有请求共用该 key，共享同一计数器（全局限流）。'

function buildLimitCountConfig() {
  const cfg = {
    count: count.value > 0 ? count.value : 1,
    time_window: timeWindow.value > 0 ? timeWindow.value : 60,
    key_type: keyType.value,
    key: key.value,
    rejected_code: rejectionCode.value,
    show_limit_quota_header: showLimitQuotaHeader.value,
    allow_degradation: allowDegradation.value,
    policy: policy.value
  }
  if (rejectionMsg.value) cfg.rejected_msg = rejectionMsg.value
  if (group.value) cfg.group = group.value
  if (policy.value === 'redis') {
    if (redisHost.value) cfg.redis_host = redisHost.value
    if (redisPort.value) cfg.redis_port = redisPort.value
    if (redisUsername.value) cfg.redis_username = redisUsername.value
    if (redisPassword.value) cfg.redis_password = redisPassword.value
    if (redisSsl !== undefined) cfg.redis_ssl = redisSsl.value
    if (redisSslVerify !== undefined) cfg.redis_ssl_verify = redisSslVerify.value
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
  const cfg = value ? buildLimitCountConfig() : { ...config.value }
  setPluginEnabled(cfg, value)
  updateConfig(cfg)
}

const updatePlugin = (updates) => {
  const cfg = { ...config.value, ...updates }
  setPluginEnabled(cfg, enabled.value)
  updateConfig(cfg)
}

const handleCountChange = (value) => {
  updatePlugin({ count: value > 0 ? value : 1 })
}

const handleTimeWindowChange = (value) => {
  updatePlugin({ time_window: value > 0 ? value : 60 })
}

const handleKeyTypeChange = (value) => {
  updatePlugin({ key_type: value })
}

const handleKeyChange = (value) => {
  updatePlugin({ key: value })
}

const handleRejectionCodeChange = (value) => {
  updatePlugin({ rejected_code: value })
}

const handleRejectionMsgChange = (value) => {
  if (value) updatePlugin({ rejected_msg: value })
  else {
    const cfg = { ...config.value }; delete cfg.rejected_msg
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

const handleGroupChange = (value) => {
  if (value) updatePlugin({ group: value })
  else {
    const cfg = { ...config.value }; delete cfg.group
    setPluginEnabled(cfg, enabled.value)
    updateConfig(cfg)
  }
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
  if (value) updatePlugin({ redis_username: value })
  else {
    const cfg = { ...config.value }; delete cfg.redis_username
    setPluginEnabled(cfg, enabled.value)
    updateConfig(cfg)
  }
}

const handleRedisPasswordChange = (value) => {
  if (value) updatePlugin({ redis_password: value })
  else {
    const cfg = { ...config.value }; delete cfg.redis_password
    setPluginEnabled(cfg, enabled.value)
    updateConfig(cfg)
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
  if (value) updatePlugin({ redis_cluster_name: value })
  else {
    const cfg = { ...config.value }; delete cfg.redis_cluster_name
    setPluginEnabled(cfg, enabled.value)
    updateConfig(cfg)
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

.key-type-desc-item :deep(.el-form-item__content) {
  flex-direction: column;
  align-items: stretch;
}

.key-type-description {
  margin-top: 12px;
  padding: 16px;
  background: linear-gradient(135deg, #f5f7fa 0%, #fafbfc 100%);
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.description-item {
  margin-bottom: 20px;
  padding: 16px;
  background: #ffffff;
  border-radius: 6px;
  border-left: 4px solid #409eff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.description-item:last-child {
  margin-bottom: 0;
  border-left-color: #67c23a;
}

.description-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 14px;
  color: #303133;
}

.description-title .el-icon {
  font-size: 18px;
  color: #409eff;
}

.description-item:last-child .description-title .el-icon {
  color: #67c23a;
}

.description-content {
  font-size: 13px;
  color: #606266;
  line-height: 1.8;
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
