// 插件相关的工具函数

// 导入插件资源配置
import pluginResourcesConfig from '../config/plugin.json'

// 插件名称翻译映射（从 JSON 配置生成）
export const PLUGIN_NAMES = Object.keys(pluginResourcesConfig).reduce((acc, key) => {
  acc[key] = pluginResourcesConfig[key].name
  return acc
}, {})

// 插件与资源的关联定义（从 JSON 配置生成）
export const PLUGIN_RESOURCE_MAP = Object.keys(pluginResourcesConfig).reduce((acc, key) => {
  acc[key] = pluginResourcesConfig[key].resources || []
  return acc
}, {})

// 获取指定资源类型可用的插件列表
export function getPluginsByResourceType(resourceType) {
  return Object.keys(PLUGIN_RESOURCE_MAP).filter(pluginKey => 
    PLUGIN_RESOURCE_MAP[pluginKey].includes(resourceType)
  )
}

// 检查插件是否可用于指定资源类型
export function isPluginAvailableForResource(pluginKey, resourceType) {
  const availablePlugins = PLUGIN_RESOURCE_MAP[pluginKey]
  return availablePlugins ? availablePlugins.includes(resourceType) : false
}

// 获取插件的中文名称
export function getPluginName(pluginKey) {
  return PLUGIN_NAMES[pluginKey] || pluginKey
}

// 检查插件是否启用（检查 _meta.disable）
// pluginConfig: 插件配置对象
export function isPluginEnabled(pluginConfig) {
  // 规则：
  // 1. 插件内容为空，插件没有启用
  // 2. 插件内容不为空，_meta.disable 字段不存在，插件被启用
  // 3. 插件内容不为空，_meta.disable 字段存在，这个字段的值为 false 插件被启用
  // 4. 插件内容不为空，_meta.disable 字段存在，这个字段的值为 true 插件没有启用
  
  // 插件内容为空（null、undefined 或空对象）
  if (!pluginConfig) return false
  
  const keys = Object.keys(pluginConfig)
  // 空对象 {} 表示未配置
  if (keys.length === 0) return false
  
  // 如果只有 _meta 字段，需要检查 _meta 的内容
  if (keys.length === 1 && keys[0] === '_meta') {
    const meta = pluginConfig._meta || {}
    const metaKeys = Object.keys(meta)
    // 如果 _meta 为空，视为未配置
    if (metaKeys.length === 0) return false
    // 如果 _meta 只有 disable 字段
    if (metaKeys.length === 1 && meta.disable !== undefined) {
      return meta.disable === false
    }
    // 如果 _meta 有内容且 disable 字段存在
    if (meta.disable !== undefined) {
      return meta.disable === false
    }
    // 如果 _meta 有内容但没有 disable 字段，视为启用
    return true
  }
  
  // 插件内容不为空，检查 _meta.disable
  if (pluginConfig._meta?.disable !== undefined) {
    return pluginConfig._meta.disable === false
  }
  
  // 插件内容不为空，_meta.disable 字段不存在，插件被启用
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
    // 启用插件：直接设置 disable 为 false（兼容原来删除字段的方法）
    // 如果 _meta 只有 disable 字段，则删除整个 _meta；否则设置 disable 为 false
    if (Object.keys(pluginConfig._meta).length === 1 && pluginConfig._meta.disable !== undefined) {
      // 如果 _meta 只有 disable 字段，删除整个 _meta（兼容原来的方法）
      delete pluginConfig._meta
    } else {
      // 否则直接设置 disable 为 false
      pluginConfig._meta.disable = false
      // 如果 _meta 为空对象，删除它
      if (Object.keys(pluginConfig._meta).length === 0) {
        delete pluginConfig._meta
      }
    }
  } else {
    // 禁用插件：设置 _meta.disable 为 true
    pluginConfig._meta.disable = true
  }
  return pluginConfig
}
