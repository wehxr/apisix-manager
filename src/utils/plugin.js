// 插件相关的工具函数

// 插件名称翻译映射
export const PLUGIN_NAMES = {
  'request-id': '请求ID',
  'basic-auth': '基本认证',
  'ip-restriction': 'IP 限制',
  'cors': '跨域配置',
  'real-ip': '真实IP透传',
  'redirect': '重定向',
  'limit-req': '请求限流',
  'proxy-cache': '代理缓存',
  'client-control': '限制请求体大小',
  'uri-blocker': 'URI拦截',
  'api-breaker': 'API熔断',
  'gzip': 'Gzip压缩'
}

// 获取插件的中文名称
export function getPluginName(pluginKey) {
  return PLUGIN_NAMES[pluginKey] || pluginKey
}

// 检查插件是否启用（检查 _meta.disable）
// pluginConfig: 插件配置对象
// pluginKey: 插件名称（可选，用于特殊处理）
// allPlugins: 所有插件对象（可选，用于检查关联插件）
export function isPluginEnabled(pluginConfig, pluginKey = null, allPlugins = null) {
  // basic-auth 插件的启用状态由 consumer-restriction 决定
  // 关闭基础认证时 consumer-restriction 设为 _meta.disable = true，此处需检查
  if (pluginKey === 'basic-auth' && allPlugins) {
    const consumerRestriction = allPlugins['consumer-restriction']
    if (!consumerRestriction) return false
    if (consumerRestriction._meta?.disable === true) return false
    const restrictionType = consumerRestriction.type || 'consumer_name'
    if (restrictionType === 'consumer_name' || restrictionType === 'consumer_group_id') {
      return true
    }
    return false
  }
  
  // 对于其他插件，需要插件对象存在
  if (!pluginConfig) return false
  
  // 如果 _meta.disable 为 true，则插件被禁用
  if (pluginConfig._meta?.disable === true) return false
  
  // 空对象 {} 表示未配置，不应视为启用（如首次打开 limit-count 等插件配置弹窗时）
  const keys = Object.keys(pluginConfig)
  if (keys.length === 0) return false
  
  // 如果只有 _meta 字段且 _meta 为空，也视为未配置
  if (keys.length === 1 && keys[0] === '_meta') {
    const metaKeys = Object.keys(pluginConfig._meta || {})
    if (metaKeys.length === 0) return false
  }
  
  // 插件存在且有实际配置且未禁用，则认为启用
  return true
}

// 设置插件的启用/禁用状态
export function setPluginEnabled(pluginConfig, enabled) {
  if (!pluginConfig) {
    pluginConfig = {}
  }
  if (!pluginConfig._meta) {
    pluginConfig._meta = {}
  }
  if (enabled) {
    // 启用插件：删除 disable 字段或设置为 false
    delete pluginConfig._meta.disable
    if (Object.keys(pluginConfig._meta).length === 0) {
      delete pluginConfig._meta
    }
  } else {
    // 禁用插件：设置 _meta.disable 为 true
    pluginConfig._meta.disable = true
  }
  return pluginConfig
}
