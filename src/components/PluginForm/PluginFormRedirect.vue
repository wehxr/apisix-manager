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
          <p style="margin: 0 0 8px 0;">
            <strong>功能说明：</strong>此插件用于将请求重定向到另一个 URI。支持三种重定向方式：
          </p>
          <ul style="margin: 0 0 8px 0; padding-left: 20px;">
            <li><strong>URI 重定向：</strong>将请求重定向到指定的 URI，支持相对路径和绝对 URL</li>
            <li><strong>正则表达式重定向：</strong>使用正则表达式匹配请求 URI，然后重定向到模板替换后的 URI</li>
            <li><strong>HTTP 转 HTTPS：</strong>自动将 HTTP 请求重定向到 HTTPS（使用 301 永久重定向）</li>
          </ul>
          <p style="margin: 0; color: #e6a23c;">
            <strong>⚠️ 重要提示：</strong>三种重定向方式只能选择其中一种，不能同时配置。
          </p>
        </div>
      </template>
    </el-alert>
    <el-form-item label="开启插件">
      <el-switch :model-value="enabled" @update:model-value="handleEnableChange" />
    </el-form-item>
    <template v-if="enabled">
      <el-form-item label="重定向类型">
        <el-radio-group :model-value="redirectType" @update:model-value="handleRedirectTypeChange">
          <el-radio label="uri">URI 重定向</el-radio>
          <el-radio label="regex_uri">正则表达式重定向</el-radio>
          <el-radio label="http_to_https">HTTP 转 HTTPS</el-radio>
        </el-radio-group>
      </el-form-item>

      <!-- URI 重定向 -->
      <template v-if="redirectType === 'uri'">
        <el-form-item label="重定向 URI" required>
          <el-input
            :model-value="uri"
            @update:model-value="handleUriChange"
            placeholder="如: /test/default.html 或 https://example.com/new-path"
          />
          <div class="form-tip">
            <p style="margin: 0 0 5px 0;"><strong>说明：</strong>重定向的目标 URI，支持以下格式：</p>
            <ul style="margin: 0; padding-left: 20px; color: #606266;">
              <li><strong>相对路径：</strong>/test/index.html、/new/path</li>
              <li><strong>绝对 URL：</strong>https://example.com/foo/bar</li>
              <li><strong>使用 NGINX 变量：</strong>$uri/index.html、${uri}/index.html（变量不存在时会被视为空）</li>
            </ul>
            <p style="margin: 5px 0 0 0; color: #909399;">
              <strong>示例：</strong>访问 /old 时重定向到 /new，填写 <code style="background: #f5f7fa; padding: 2px 4px; border-radius: 2px;">/new</code>
            </p>
          </div>
        </el-form-item>
      </template>

      <!-- 正则表达式重定向 -->
      <template v-if="redirectType === 'regex_uri'">
        <el-form-item label="正则表达式" required>
          <el-input
            :model-value="regexUriPattern"
            @update:model-value="handleRegexPatternChange"
            placeholder="如: ^/iresty/(.*)/(.*)/(.*)$"
          />
          <div class="form-tip">
            <p style="margin: 0 0 5px 0;"><strong>说明：</strong>用于匹配客户端请求 URI 的正则表达式，使用括号 () 可以创建捕获组。</p>
            <p style="margin: 0; color: #909399;">
              <strong>示例：</strong>匹配 <code style="background: #f5f7fa; padding: 2px 4px; border-radius: 2px;">^/api/v1/(.*)$</code> 可以捕获 /api/v1/ 后面的所有内容
            </p>
          </div>
        </el-form-item>
        <el-form-item label="替换模板" required>
          <el-input
            :model-value="regexUriTemplate"
            @update:model-value="handleRegexTemplateChange"
            placeholder="如: /$1-$2-$3 或 /api/v2/$1"
          />
          <div class="form-tip">
            <p style="margin: 0 0 5px 0;"><strong>说明：</strong>匹配成功后重定向的 URI 模板，使用 $1, $2, $3... 引用正则表达式中的捕获组。</p>
            <p style="margin: 0 0 5px 0; color: #909399;">
              <strong>示例：</strong>
            </p>
            <ul style="margin: 0; padding-left: 20px; color: #606266;">
              <li>正则：<code style="background: #f5f7fa; padding: 2px 4px; border-radius: 2px;">^/iresty/(.*)/(.*)/(.*)$</code></li>
              <li>模板：<code style="background: #f5f7fa; padding: 2px 4px; border-radius: 2px;">/$1-$2-$3</code></li>
              <li>结果：访问 <code style="background: #f5f7fa; padding: 2px 4px; border-radius: 2px;">/iresty/a/b/c</code> 会重定向到 <code style="background: #f5f7fa; padding: 2px 4px; border-radius: 2px;">/a-b-c</code></li>
            </ul>
            <p style="margin: 5px 0 0 0; color: #e6a23c;">
              <strong>注意：</strong>如果正则表达式不匹配，请求将正常转发到上游服务，不会重定向。
            </p>
          </div>
        </el-form-item>
      </template>

      <!-- HTTP 转 HTTPS -->
      <template v-if="redirectType === 'http_to_https'">
        <el-alert
          type="success"
          :closable="false"
          style="margin-bottom: 10px;"
        >
          <template #default>
            <div style="font-size: 13px; line-height: 1.6;">
              <p style="margin: 0 0 5px 0;"><strong>功能说明：</strong></p>
              <p style="margin: 0 0 5px 0;">当请求是 HTTP 协议时，自动重定向到相同 URI 的 HTTPS 地址，使用 301 永久重定向状态码。</p>
              <p style="margin: 0; color: #909399;">
                <strong>端口选择：</strong>HTTPS 端口将按优先级从配置文件中读取，或使用默认的 443 端口。
              </p>
            </div>
          </template>
        </el-alert>
      </template>

      <el-form-item label="HTTP 状态码" v-if="redirectType !== 'http_to_https'">
        <el-select
          :model-value="retCode"
          @update:model-value="handleCodeChange"
          style="width: 100%"
        >
          <el-option label="301 - 永久重定向" :value="301" />
          <el-option label="302 - 临时重定向（默认）" :value="302" />
          <el-option label="307 - 临时重定向（保持方法）" :value="307" />
          <el-option label="308 - 永久重定向（保持方法）" :value="308" />
        </el-select>
        <div class="form-tip">
          <p style="margin: 0 0 5px 0;"><strong>说明：</strong>HTTP 响应状态码，用于告诉浏览器如何处理重定向。</p>
          <ul style="margin: 0; padding-left: 20px; color: #606266;">
            <li><strong>301：</strong>永久重定向，浏览器会缓存，适合域名迁移、URL 永久变更</li>
            <li><strong>302：</strong>临时重定向，浏览器不缓存，适合临时跳转、A/B 测试</li>
            <li><strong>307/308：</strong>保持原始 HTTP 方法（POST 请求重定向后仍为 POST）</li>
          </ul>
        </div>
      </el-form-item>

      <el-form-item label="编码 URI" v-if="redirectType !== 'http_to_https'">
        <el-switch
          :model-value="encodeUri"
          @update:model-value="handleEncodeUriChange"
        />
        <div class="form-tip">
          <p style="margin: 0;"><strong>说明：</strong>开启后，重定向的 Location Header 中的 URI 会按照 RFC3986 标准进行 URL 编码。</p>
          <p style="margin: 5px 0 0 0; color: #909399;">
            <strong>使用场景：</strong>当重定向 URI 包含特殊字符（如中文、空格等）时，建议开启此选项以确保浏览器正确解析。
          </p>
        </div>
      </el-form-item>

      <el-form-item label="追加查询字符串" v-if="redirectType !== 'http_to_https'">
        <el-switch
          :model-value="appendQueryString"
          @update:model-value="handleAppendQueryStringChange"
        />
        <div class="form-tip">
          <p style="margin: 0 0 5px 0;"><strong>说明：</strong>开启后，会将原始请求 URL 中的查询参数（?key=value）追加到重定向的 Location Header 中。</p>
          <p style="margin: 0; color: #e6a23c;">
            <strong>⚠️ 注意事项：</strong>
          </p>
          <ul style="margin: 0; padding-left: 20px; color: #606266;">
            <li>如果重定向 URI 中已包含查询字符串，原始查询参数会使用 &amp; 连接</li>
            <li>如果重定向 URI 使用了 NGINX 变量（如 $request_uri），可能已包含查询参数，请勿重复开启</li>
            <li><strong>示例：</strong>访问 <code style="background: #f5f7fa; padding: 2px 4px; border-radius: 2px;">/old?id=123</code> 重定向到 <code style="background: #f5f7fa; padding: 2px 4px; border-radius: 2px;">/new</code>，开启后会变成 <code style="background: #f5f7fa; padding: 2px 4px; border-radius: 2px;">/new?id=123</code></li>
          </ul>
        </div>
      </el-form-item>
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
const uri = computed(() => config.value.uri || '')
const regexUri = computed(() => config.value.regex_uri || [])
const httpToHttps = computed(() => config.value.http_to_https || false)
const retCode = computed(() => {
  if (config.value.http_to_https) return 301
  return config.value.ret_code || 302
})
const encodeUri = computed(() => config.value.encode_uri || false)
const appendQueryString = computed(() => config.value.append_query_string || false)

// 判断当前重定向类型
const redirectType = computed(() => {
  if (httpToHttps.value) {
    return 'http_to_https'
  } else if (regexUri.value && Array.isArray(regexUri.value) && regexUri.value.length > 0) {
    return 'regex_uri'
  } else {
    return 'uri'
  }
})

// 正则表达式相关
const regexUriPattern = computed(() => {
  if (regexUri.value && Array.isArray(regexUri.value) && regexUri.value.length > 0) {
    return regexUri.value[0] || ''
  }
  return ''
})

const regexUriTemplate = computed(() => {
  if (regexUri.value && Array.isArray(regexUri.value) && regexUri.value.length > 1) {
    return regexUri.value[1] || ''
  }
  return ''
})

function buildRedirectConfig() {
  const base = { ret_code: 302, encode_uri: false, append_query_string: false }
  if (httpToHttps.value) {
    base.http_to_https = true
    base.ret_code = 301
  } else if (regexUri.value?.length) {
    base.regex_uri = regexUri.value
    base.http_to_https = false
    base.ret_code = retCode.value || 302
    base.encode_uri = encodeUri.value || false
    base.append_query_string = appendQueryString.value || false
  } else {
    base.uri = uri.value || ''
    base.http_to_https = false
    base.ret_code = retCode.value || 302
    base.encode_uri = encodeUri.value || false
    base.append_query_string = appendQueryString.value || false
  }
  return base
}

function handleEnableChange(value) {
  const cfg = value ? buildRedirectConfig() : { ...config.value }
  setPluginEnabled(cfg, value)
  updateConfig(cfg)
}

const handleRedirectTypeChange = (value) => {
  const cfg = { ret_code: 302, encode_uri: false, append_query_string: false }
  if (value === 'uri') {
    cfg.uri = uri.value || ''
    cfg.ret_code = retCode.value || 302
    cfg.encode_uri = encodeUri.value || false
    cfg.append_query_string = appendQueryString.value || false
  } else if (value === 'regex_uri') {
    cfg.regex_uri = regexUri.value?.length > 0 ? regexUri.value : ['', '']
    cfg.ret_code = retCode.value || 302
    cfg.encode_uri = encodeUri.value || false
    cfg.append_query_string = appendQueryString.value || false
  } else if (value === 'http_to_https') {
    cfg.http_to_https = true
    cfg.ret_code = 301
  }
  setPluginEnabled(cfg, enabled.value)
  updateConfig(cfg)
}

const handleUriChange = (value) => {
  const cfg = { ...config.value, uri: value }
  delete cfg.regex_uri
  delete cfg.http_to_https
  setPluginEnabled(cfg, enabled.value)
  updateConfig(cfg)
}

const handleRegexPatternChange = (value) => {
  const currentRegexUri = regexUri.value || []
  const cfg = { ...config.value, regex_uri: [value, currentRegexUri[1] || ''] }
  delete cfg.uri
  delete cfg.http_to_https
  setPluginEnabled(cfg, enabled.value)
  updateConfig(cfg)
}

const handleRegexTemplateChange = (value) => {
  const currentRegexUri = regexUri.value || []
  const cfg = { ...config.value, regex_uri: [currentRegexUri[0] || '', value] }
  delete cfg.uri
  delete cfg.http_to_https
  setPluginEnabled(cfg, enabled.value)
  updateConfig(cfg)
}

const handleCodeChange = (value) => {
  const cfg = { ...config.value, ret_code: value }
  setPluginEnabled(cfg, enabled.value)
  updateConfig(cfg)
}

const handleEncodeUriChange = (value) => {
  const cfg = { ...config.value, encode_uri: value }
  setPluginEnabled(cfg, enabled.value)
  updateConfig(cfg)
}

const handleAppendQueryStringChange = (value) => {
  const cfg = { ...config.value, append_query_string: value }
  if (value) delete cfg.http_to_https
  setPluginEnabled(cfg, enabled.value)
  updateConfig(cfg)
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