<template>
  <div>
    <el-alert
      title="插件说明"
      type="info"
      :closable="false"
      style="margin-bottom: 20px;"
    >
      <template #default>
        <div style="font-size: 13px; line-height: 1.8;">
          <p style="margin: 0 0 10px 0;"><strong>功能：</strong>此插件支持重写 APISIX 转发到上游服务的请求。您可以修改 HTTP 方法、URI 路径、Host 请求头和请求标头等。</p>
          <p style="margin: 0 0 10px 0;"><strong>常见使用场景：</strong></p>
          <ul style="margin: 0 0 10px 0; padding-left: 20px;">
            <li>将客户端请求的路径重写为上游服务的不同路径（如：客户端请求 <code>/api/v1/users</code>，转发到上游时改为 <code>/users</code>）</li>
            <li>修改请求的 HTTP 方法（如：将 GET 请求改为 POST）</li>
            <li>添加或修改请求头（如：添加 API 版本号、认证信息等）</li>
            <li>修改 Host 请求头（如：将请求转发到不同的虚拟主机）</li>
          </ul>
          <p style="margin: 0;"><strong>注意：</strong>URI 路径和正则表达式 URI 重写只需配置其中一个即可。如果同时配置，URI 路径优先级更高。</p>
        </div>
      </template>
    </el-alert>
    <el-form-item label="开启插件">
      <el-switch :model-value="localEnabled" @update:model-value="handleEnableChange" />
    </el-form-item>
    <template v-if="localEnabled">
      <el-divider>URI 重写</el-divider>
      <el-form-item label="重写方式">
        <el-radio-group :model-value="localUriRewriteType" @update:model-value="handleUriRewriteTypeChange">
          <el-radio label="uri">URI 路径（简单重写）</el-radio>
          <el-radio label="regex">正则表达式（灵活重写）</el-radio>
          <el-radio label="none">不重写 URI</el-radio>
        </el-radio-group>
        <div class="form-tip">
          <p style="margin: 0 0 5px 0;"><strong>URI 路径：</strong>适用于固定路径重写，支持 Nginx 变量</p>
          <p style="margin: 0;"><strong>正则表达式：</strong>适用于需要从原路径中提取部分内容并重新组合的场景</p>
        </div>
      </el-form-item>
      
      <template v-if="localUriRewriteType === 'uri'">
        <el-form-item label="URI 路径">
          <el-input
            :model-value="uri"
            @update:model-value="handleUriChange"
            placeholder="/new/path 或 /api/$arg_version/users"
          />
          <div class="form-tip">
            <p style="margin: 0 0 5px 0;"><strong>说明：</strong>直接将所有请求的路径重写为指定的新路径。适用于简单的路径映射。</p>
            <p style="margin: 0 0 5px 0;"><strong>支持 Nginx 变量：</strong>可以使用 <code>$arg_name</code>（URL 参数）、<code>$http_header_name</code>（请求头）等变量。</p>
            <p style="margin: 0 0 5px 0;"><strong>示例：</strong></p>
            <ul style="margin: 0; padding-left: 20px;">
              <li><code>/api/v2/users</code> - 所有请求都转发到 <code>/api/v2/users</code></li>
              <li><code>/users/$arg_id</code> - 转发到 <code>/users/123</code>（如果 URL 参数 id=123）</li>
              <li><code>/api/$http_x_api_version/users</code> - 使用请求头 X-Api-Version 的值作为版本号</li>
            </ul>
          </div>
        </el-form-item>
      </template>
      
      <template v-if="localUriRewriteType === 'regex'">
        <el-form-item label="正则表达式规则">
          <div class="regex-uri-block">
            <div
              v-for="(item, idx) in regexUriList"
              :key="idx"
              class="regex-uri-row"
            >
              <el-input
                :model-value="item.pattern"
                @update:model-value="(v) => updateRegexUri(idx, 'pattern', v)"
                placeholder="正则表达式，如: ^/api/v1/(.*)"
                class="regex-pattern"
              />
              <el-input
                :model-value="item.replacement"
                @update:model-value="(v) => updateRegexUri(idx, 'replacement', v)"
                placeholder="替换路径，如: /api/v2/$1"
                class="regex-replacement"
              />
              <el-button type="danger" link class="regex-delete" @click="removeRegexUri(idx)">删除</el-button>
            </div>
            <el-button type="primary" link class="add-regex-btn" @click="addRegexUri">+ 添加正则表达式规则</el-button>
          </div>
          <div class="form-tip">
            <p style="margin: 0 0 5px 0;"><strong>说明：</strong>使用正则表达式匹配客户端请求的 URI，然后使用捕获组重新组合成新的路径。适用于需要从原路径中提取部分内容的场景。</p>
            <p style="margin: 0 0 5px 0;"><strong>使用方法：</strong></p>
            <ul style="margin: 0 0 5px 0; padding-left: 20px;">
              <li>在<strong>正则表达式</strong>中使用 <code>(.*)</code> 或 <code>([^/]+)</code> 等捕获组</li>
              <li>在<strong>替换路径</strong>中使用 <code>$1</code>、<code>$2</code> 等引用捕获组</li>
              <li>可以添加多个规则，按顺序匹配，第一个匹配的规则生效</li>
            </ul>
            <p style="margin: 0 0 5px 0;"><strong>示例：</strong></p>
            <ul style="margin: 0; padding-left: 20px;">
              <li>正则：<code>^/api/v1/(.*)</code>，替换：<code>/api/v2/$1</code>
                <br/>效果：<code>/api/v1/users</code> → <code>/api/v2/users</code></li>
              <li>正则：<code>^/test/(.*)/(.*)</code>，替换：<code>/$1-$2</code>
                <br/>效果：<code>/test/user/agent</code> → <code>/user-agent</code></li>
              <li>正则：<code>^/old/(.*)</code>，替换：<code>/new/$1</code>
                <br/>效果：<code>/old/path/to/resource</code> → <code>/new/path/to/resource</code></li>
            </ul>
          </div>
        </el-form-item>
      </template>

      <el-divider>HTTP 方法重写</el-divider>
      <el-form-item label="HTTP 方法">
        <el-select
          :model-value="method"
          @update:model-value="handleMethodChange"
          placeholder="选择要重写的 HTTP 方法"
          style="width: 100%"
        >
          <el-option label="不修改（保持原方法）" value="" />
          <el-option label="GET" value="GET" />
          <el-option label="POST" value="POST" />
          <el-option label="PUT" value="PUT" />
          <el-option label="HEAD" value="HEAD" />
          <el-option label="DELETE" value="DELETE" />
          <el-option label="OPTIONS" value="OPTIONS" />
          <el-option label="MKCOL" value="MKCOL" />
          <el-option label="COPY" value="COPY" />
          <el-option label="MOVE" value="MOVE" />
          <el-option label="PROPFIND" value="PROPFIND" />
          <el-option label="LOCK" value="LOCK" />
          <el-option label="UNLOCK" value="UNLOCK" />
          <el-option label="PATCH" value="PATCH" />
          <el-option label="TRACE" value="TRACE" />
        </el-select>
        <div class="form-tip">
          <p style="margin: 0 0 5px 0;"><strong>说明：</strong>将客户端请求的 HTTP 方法重写为指定的方法。留空则不修改请求方法。</p>
          <p style="margin: 0 0 5px 0;"><strong>使用场景：</strong>当上游服务需要特定的 HTTP 方法，但客户端使用了不同的方法时。</p>
          <p style="margin: 0;"><strong>示例：</strong>客户端发送 GET 请求，但上游服务需要 POST 请求，可以在此选择 POST。</p>
        </div>
      </el-form-item>

      <el-divider>Host 请求头</el-divider>
      <el-form-item label="Host 请求头">
        <el-input
          :model-value="host"
          @update:model-value="handleHostChange"
          placeholder="example.com 或 api.example.com"
        />
        <div class="form-tip">
          <p style="margin: 0 0 5px 0;"><strong>说明：</strong>修改转发到上游服务时的 Host 请求头。这通常用于虚拟主机场景。</p>
          <p style="margin: 0 0 5px 0;"><strong>注意：</strong>必须使用此字段设置 Host，不能使用下面的"设置请求头"来设置 Host。</p>
          <p style="margin: 0;"><strong>示例：</strong>客户端请求的 Host 是 <code>gateway.example.com</code>，但上游服务需要 <code>api.example.com</code>，可以在此填写 <code>api.example.com</code>。</p>
        </div>
      </el-form-item>

      <el-divider>请求头操作</el-divider>
      <el-alert
        type="info"
        :closable="false"
        style="margin-bottom: 15px;"
      >
        <template #default>
          <div style="font-size: 12px;">
            <strong>三种操作的区别：</strong>
            <ul style="margin: 5px 0 0 0; padding-left: 20px;">
              <li><strong>添加请求头：</strong>如果请求中已有该头，会将新值追加到原值后面（用逗号分隔）</li>
              <li><strong>设置请求头：</strong>如果请求中已有该头，会用新值完全替换原值</li>
              <li><strong>删除请求头：</strong>从请求中完全移除指定的请求头</li>
            </ul>
          </div>
        </template>
      </el-alert>
      
      <el-form-item label="添加请求头（追加值）">
        <div class="headers-block">
          <div
            v-for="(h, idx) in headersAddList"
            :key="'add-' + idx"
            class="header-row"
          >
            <el-input
              :model-value="h.key"
              @update:model-value="(v) => updateHeaderAdd(idx, 'key', v)"
              placeholder="Header 名称，如: X-Api-Version"
              class="header-key"
            />
            <el-input
              :model-value="h.value"
              @update:model-value="(v) => updateHeaderAdd(idx, 'value', v)"
              placeholder="值，如: v1 或 $arg_version"
              class="header-value"
            />
            <el-button type="danger" link class="header-delete" @click="removeHeaderAdd(idx)">删除</el-button>
          </div>
          <el-button type="primary" link class="add-header-btn" @click="addHeaderAdd">+ 添加请求头</el-button>
        </div>
        <div class="form-tip">
          <p style="margin: 0 0 5px 0;"><strong>说明：</strong>向请求中添加新的请求头。如果请求中已存在该头，会将新值追加到原值后面（用逗号分隔）。</p>
          <p style="margin: 0 0 5px 0;"><strong>支持变量：</strong>可以使用 Nginx 变量，如 <code>$arg_name</code>（URL 参数）、<code>$http_header_name</code>（请求头）、<code>$1</code>（正则捕获组）等。</p>
          <p style="margin: 0 0 5px 0;"><strong>示例：</strong></p>
          <ul style="margin: 0; padding-left: 20px;">
            <li>Header: <code>X-Api-Version</code>，值: <code>v1</code> - 添加固定版本号</li>
            <li>Header: <code>X-User-Id</code>，值: <code>$arg_user_id</code> - 从 URL 参数中获取用户 ID</li>
            <li>Header: <code>X-Forwarded-For</code>，值: <code>$remote_addr</code> - 添加客户端 IP</li>
          </ul>
        </div>
      </el-form-item>
      
      <el-form-item label="设置请求头（覆盖值）">
        <div class="headers-block">
          <div
            v-for="(h, idx) in headersSetList"
            :key="'set-' + idx"
            class="header-row"
          >
            <el-input
              :model-value="h.key"
              @update:model-value="(v) => updateHeaderSet(idx, 'key', v)"
              placeholder="Header 名称，如: X-Api-Version"
              class="header-key"
            />
            <el-input
              :model-value="h.value"
              @update:model-value="(v) => updateHeaderSet(idx, 'value', v)"
              placeholder="值，如: v2 或 $consumer_name"
              class="header-value"
            />
            <el-button type="danger" link class="header-delete" @click="removeHeaderSet(idx)">删除</el-button>
          </div>
          <el-button type="primary" link class="add-header-btn" @click="addHeaderSet">+ 添加请求头</el-button>
        </div>
        <div class="form-tip">
          <p style="margin: 0 0 5px 0;"><strong>说明：</strong>设置请求头的值。如果请求中已存在该头，会用新值完全覆盖原值（不会追加）。</p>
          <p style="margin: 0 0 5px 0;"><strong>示例：</strong></p>
          <ul style="margin: 0; padding-left: 20px;">
            <li>Header: <code>X-Api-Version</code>，值: <code>v2</code> - 强制使用 v2 版本，覆盖客户端传递的值</li>
            <li>Header: <code>X-Consumer-Name</code>，值: <code>$consumer_name</code> - 添加消费者名称</li>
            <li>Header: <code>User-Agent</code>，值: <code>APISIX-Gateway</code> - 修改 User-Agent</li>
          </ul>
        </div>
      </el-form-item>
      
      <el-form-item label="删除请求头">
        <div class="headers-block">
          <div
            v-for="(h, idx) in headersRemoveList"
            :key="'remove-' + idx"
            class="header-row"
          >
            <el-input
              :model-value="h.name"
              @update:model-value="(v) => updateHeaderRemove(idx, 'name', v)"
              placeholder="Header 名称，如: User-Agent"
              class="header-key"
            />
            <el-button type="danger" link class="header-delete" @click="removeHeaderRemove(idx)">删除</el-button>
          </div>
          <el-button type="primary" link class="add-header-btn" @click="addHeaderRemove">+ 添加请求头</el-button>
        </div>
        <div class="form-tip">
          <p style="margin: 0 0 5px 0;"><strong>说明：</strong>从请求中完全移除指定的请求头，上游服务将不会收到该请求头。</p>
          <p style="margin: 0 0 5px 0;"><strong>使用场景：</strong></p>
          <ul style="margin: 0 0 5px 0; padding-left: 20px;">
            <li>移除敏感信息（如认证密钥），避免泄露给上游服务</li>
            <li>移除不必要的请求头，减少请求大小</li>
            <li>移除可能干扰上游服务的请求头</li>
          </ul>
          <p style="margin: 0;"><strong>示例：</strong>删除 <code>User-Agent</code>、<code>Apikey</code>、<code>Authorization</code> 等。</p>
        </div>
      </el-form-item>

      <el-divider>高级配置</el-divider>
      <el-form-item label="使用原始请求 URI（不安全）">
        <el-switch
          :model-value="useRealRequestUriUnsafe"
          @update:model-value="handleUseRealRequestUriUnsafeChange"
        />
        <div class="form-tip">
          <p style="margin: 0 0 5px 0;"><strong>说明：</strong>如果启用，将绕过 URI 规范化处理，直接使用客户端发送的原始请求 URI（包括查询参数、特殊字符等）。</p>
          <p style="margin: 0 0 5px 0;"><strong>URI 规范化是什么：</strong>正常情况下，APISIX 会对 URI 进行规范化处理，例如：</p>
          <ul style="margin: 0 0 5px 0; padding-left: 20px;">
            <li>将多个斜杠合并为单个斜杠：<code>//path</code> → <code>/path</code></li>
            <li>解码 URL 编码的字符：<code>%20</code> → 空格</li>
            <li>移除路径中的 <code>.</code> 和 <code>..</code> 等相对路径符号</li>
            <li>标准化查询参数的格式</li>
          </ul>
          <p style="margin: 0; color: #e6a23c;"><strong>建议：</strong>除非确实需要，否则不要启用此选项。如果必须启用，请确保上游服务有足够的安全防护。</p>
        </div>
      </el-form-item>
    </template>
  </div>
</template>

<script setup>
import { ref, watch, computed, nextTick } from 'vue'
import { isPluginEnabled, setPluginEnabled } from '@/utils/plugin'
import { usePluginConfig } from '@/composables/usePluginConfig'

const props = defineProps({
  modelValue: { type: Object, default: () => ({}) },
  resourceType: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])

// 使用 composable 加载和管理 Plugin Config
const { config, updateConfig } = usePluginConfig(props, emit)

const enabled = computed(() => isPluginEnabled(config.value))
const uri = computed(() => config.value.uri || '')
const method = computed(() => config.value.method || '')
const regexUri = computed(() => {
  const regexUriValue = config.value.regex_uri
  if (!Array.isArray(regexUriValue) || regexUriValue.length === 0) return []
  // regex_uri 是数组，格式为 ["pattern", "replacement", "pattern2", "replacement2", ...]
  // 需要转换为对象数组
  const result = []
  for (let i = 0; i < regexUriValue.length; i += 2) {
    if (i + 1 < regexUriValue.length) {
      result.push({
        pattern: regexUriValue[i] || '',
        replacement: regexUriValue[i + 1] || ''
      })
    }
  }
  return result
})

// 计算 URI 重写类型：'uri' | 'regex' | 'none'
const uriRewriteType = computed(() => {
  if (uri.value) return 'uri'
  if (regexUri.value.length > 0) return 'regex'
  return 'none'
})

const host = computed(() => config.value.host || '')
const headers = computed(() => config.value.headers || {})

const headersAdd = computed(() => {
  const add = headers.value.add || {}
  return Object.keys(add).map(key => ({
    key,
    value: add[key] || ''
  }))
})

const headersSet = computed(() => {
  const set = headers.value.set || {}
  return Object.keys(set).map(key => ({
    key,
    value: set[key] || ''
  }))
})

const headersRemove = computed(() => {
  return headers.value.remove || []
})

const useRealRequestUriUnsafe = computed(() => config.value.use_real_request_uri_unsafe || false)

// 内部状态
const localEnabled = ref(enabled.value)
const localUriRewriteType = ref('none')
const regexUriList = ref([])
const headersAddList = ref([])
const headersSetList = ref([])
const headersRemoveList = ref([])
// 标志：标记用户是否正在手动切换重写方式，防止 watch 覆盖用户选择
const isUserSwitchingType = ref(false)

// 计算 URI 重写类型（用于显示）
const computedUriRewriteType = computed(() => {
  if (uri.value) return 'uri'
  if (regexUri.value.length > 0) return 'regex'
  return 'none'
})

// 监听 props 变化，更新内部状态
watch([enabled, uri, regexUri, headersAdd, headersSet, headersRemove], ([newEnabled, newUri, newRegexUri, newHeadersAdd, newHeadersSet, newHeadersRemove]) => {
  localEnabled.value = newEnabled
  
  // 如果用户正在手动切换类型，不更新类型，避免覆盖用户选择
  if (!isUserSwitchingType.value) {
    // 更新 URI 重写类型（只在从外部数据加载时更新，用户手动切换时不覆盖）
    const newType = newUri ? 'uri' : (Array.isArray(newRegexUri) && newRegexUri.length > 0 ? 'regex' : 'none')
    // 只有当类型确实改变时才更新，避免用户选择被覆盖
    if (localUriRewriteType.value !== newType) {
      localUriRewriteType.value = newType
    }
  }
  
  if (Array.isArray(newRegexUri)) {
    regexUriList.value = newRegexUri.length > 0 ? [...newRegexUri] : []
  }
  if (Array.isArray(newHeadersAdd)) {
    headersAddList.value = newHeadersAdd.length > 0 ? [...newHeadersAdd] : []
  }
  if (Array.isArray(newHeadersSet)) {
    headersSetList.value = newHeadersSet.length > 0 ? [...newHeadersSet] : []
  }
  if (Array.isArray(newHeadersRemove)) {
    // 将字符串数组转换为对象数组
    headersRemoveList.value = newHeadersRemove.length > 0 
      ? newHeadersRemove.map(name => ({ name: name || '' }))
      : []
  }
}, { immediate: true })

// 初始化时设置正确的类型
watch(computedUriRewriteType, (newType) => {
  // 如果用户正在手动切换类型，不更新类型，避免覆盖用户选择
  if (!isUserSwitchingType.value && localUriRewriteType.value === 'none' && newType !== 'none') {
    localUriRewriteType.value = newType
  }
}, { immediate: true })

watch(localEnabled, (newEnabled) => {
  let cfg
  if (newEnabled) {
    cfg = buildPluginConfig()
    if (Object.keys(cfg).length === 0) cfg = { _placeholder: true }
    setPluginEnabled(cfg, true)
  } else {
    cfg = { ...config.value }
    setPluginEnabled(cfg, false)
  }
  updateConfig(cfg)
})

function buildPluginConfig(overrides = {}) {
  const base = {}
  
  // URI 重写：根据 localUriRewriteType 决定使用哪个
  const currentType = localUriRewriteType.value
  
  if (currentType === 'uri') {
    // 使用 URI 路径
    const uriValue = overrides.uri !== undefined ? overrides.uri : uri.value
    if (uriValue) {
      base.uri = uriValue
    }
    // 不包含 regex_uri
  } else if (currentType === 'regex') {
    // 使用正则表达式
    // 构建 regex_uri 数组
    const regexUriArray = []
    regexUriList.value.forEach(item => {
      if (item.pattern && item.replacement) {
        regexUriArray.push(item.pattern, item.replacement)
      }
    })
    if (regexUriArray.length > 0) {
      base.regex_uri = regexUriArray
    }
    // 不包含 uri
  }
  // else: none 类型，都不包含
  
  if (method.value) base.method = method.value
  
  if (host.value) base.host = host.value
  
  // 构建 headers
  const headersObj = {}
  
  // headers.add
  const addObj = {}
  headersAddList.value.forEach(item => {
    if (item.key && item.key.trim()) {
      addObj[item.key.trim()] = item.value || ''
    }
  })
  if (Object.keys(addObj).length > 0) {
    headersObj.add = addObj
  }
  
  // headers.set
  const setObj = {}
  headersSetList.value.forEach(item => {
    if (item.key && item.key.trim()) {
      setObj[item.key.trim()] = item.value || ''
    }
  })
  if (Object.keys(setObj).length > 0) {
    headersObj.set = setObj
  }
  
  // headers.remove
  const removeArray = headersRemoveList.value
    .map(item => item.name ? item.name.trim() : '')
    .filter(name => name)
  if (removeArray.length > 0) {
    headersObj.remove = removeArray
  }
  
  if (Object.keys(headersObj).length > 0) {
    base.headers = headersObj
  }
  
  const result = { ...base, ...overrides }
  
  // use_real_request_uri_unsafe 处理：如果 overrides 中有，使用 overrides 的值；否则使用当前值
  if (overrides.use_real_request_uri_unsafe !== undefined) {
    if (overrides.use_real_request_uri_unsafe) {
      result.use_real_request_uri_unsafe = true
    } else {
      // 如果明确设置为 false，删除该字段
      delete result.use_real_request_uri_unsafe
    }
  } else if (useRealRequestUriUnsafe.value) {
    result.use_real_request_uri_unsafe = true
  }
  
  // 如果有实际配置，移除占位符字段
  if (Object.keys(result).length > 0 && result._placeholder) {
    delete result._placeholder
  }
  
  return result
}

function emitPluginConfig(overrides = {}) {
  let cfg = buildPluginConfig(overrides)
  if (Object.keys(cfg).length === 0 && enabled.value) cfg._placeholder = true
  setPluginEnabled(cfg, enabled.value)
  updateConfig(cfg)
}

const handleEnableChange = (value) => {
  localEnabled.value = value
}

const handleUriRewriteTypeChange = (value) => {
  isUserSwitchingType.value = true
  localUriRewriteType.value = value
  const cfg = { ...config.value }
  if (value === 'uri') {
    regexUriList.value = []
    delete cfg.regex_uri
    if (!uri.value) delete cfg.uri
  } else if (value === 'regex') {
    delete cfg.uri
    if (regexUriList.value.length === 0) regexUriList.value.push({ pattern: '', replacement: '' })
  } else {
    regexUriList.value = []
    delete cfg.uri
    delete cfg.regex_uri
  }
  setPluginEnabled(cfg, enabled.value)
  updateConfig(cfg)
  nextTick(() => { isUserSwitchingType.value = false })
}

const handleUriChange = (value) => {
  emitPluginConfig({ uri: value || undefined })
}

const handleMethodChange = (value) => {
  emitPluginConfig({ method: value || undefined })
}

const handleHostChange = (value) => {
  emitPluginConfig({ host: value || undefined })
}

const handleUseRealRequestUriUnsafeChange = (value) => {
  const cfg = { ...config.value }
  if (value) cfg.use_real_request_uri_unsafe = true
  else delete cfg.use_real_request_uri_unsafe
  setPluginEnabled(cfg, enabled.value)
  updateConfig(cfg)
}

// regex_uri 相关方法
const addRegexUri = () => {
  regexUriList.value.push({ pattern: '', replacement: '' })
}

const removeRegexUri = (idx) => {
  regexUriList.value.splice(idx, 1)
  emitPluginConfig()
}

const updateRegexUri = (idx, field, value) => {
  const list = regexUriList.value
  if (list[idx]) {
    list[idx] = { ...list[idx], [field]: value }
    emitPluginConfig()
  }
}

// headers.add 相关方法
const addHeaderAdd = () => {
  headersAddList.value.push({ key: '', value: '' })
}

const removeHeaderAdd = (idx) => {
  headersAddList.value.splice(idx, 1)
  emitPluginConfig()
}

const updateHeaderAdd = (idx, field, value) => {
  const list = headersAddList.value
  if (list[idx]) {
    list[idx] = { ...list[idx], [field]: value }
    emitPluginConfig()
  }
}

// headers.set 相关方法
const addHeaderSet = () => {
  headersSetList.value.push({ key: '', value: '' })
}

const removeHeaderSet = (idx) => {
  headersSetList.value.splice(idx, 1)
  emitPluginConfig()
}

const updateHeaderSet = (idx, field, value) => {
  const list = headersSetList.value
  if (list[idx]) {
    list[idx] = { ...list[idx], [field]: value }
    emitPluginConfig()
  }
}

// headers.remove 相关方法
const addHeaderRemove = () => {
  headersRemoveList.value.push({ name: '' })
}

const removeHeaderRemove = (idx) => {
  headersRemoveList.value.splice(idx, 1)
  emitPluginConfig()
}

const updateHeaderRemove = (idx, field, value) => {
  const list = headersRemoveList.value
  if (list[idx]) {
    list[idx] = { ...list[idx], [field]: value }
    emitPluginConfig()
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

.regex-uri-block {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.regex-uri-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.regex-pattern,
.regex-replacement {
  flex: 1;
  min-width: 0;
}

.regex-delete {
  flex-shrink: 0;
  padding-left: 4px;
}

.add-regex-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 8px 12px;
  text-align: center;
  border: 1px dashed #dcdfe6;
  border-radius: 4px;
  color: #606266;
}

.add-regex-btn:hover {
  border-color: #409eff;
  color: #409eff;
}

.headers-block {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.header-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-key,
.header-value {
  flex: 1;
  min-width: 0;
}

.header-delete {
  flex-shrink: 0;
  padding-left: 4px;
}

.add-header-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 8px 12px;
  text-align: center;
  border: 1px dashed #dcdfe6;
  border-radius: 4px;
  color: #606266;
}

.add-header-btn:hover {
  border-color: #409eff;
  color: #409eff;
}
</style>
