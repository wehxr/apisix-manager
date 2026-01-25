import axios from 'axios'
import { ElMessage } from 'element-plus'

// 获取存储的配置
export function getConfig() {
  try {
    const config = localStorage.getItem('apisix_config')
    if (config) {
      return JSON.parse(config)
    }
  } catch (error) {
    console.warn('读取配置失败:', error)
  }
  return {
    baseURL: 'http://127.0.0.1:9180',
    adminKey: ''
  }
}

// 保存配置
export function saveConfig(config) {
  localStorage.setItem('apisix_config', JSON.stringify(config))
}

// 创建 axios 实例
function createApiInstance() {
  const config = getConfig()
  const instance = axios.create({
    baseURL: config.baseURL || 'http://127.0.0.1:9180',
    headers: {
      'X-API-KEY': config.adminKey || ''
    }
  })

  instance.interceptors.response.use(
    response => response,
    error => {
      // 处理 401 未授权错误
      if (error.response?.status === 401) {
        // Admin key 无效，清除配置
        localStorage.removeItem('apisix_config')
        window.location.reload()
        return Promise.reject(error)
      }

      // 提取错误信息
      let errorMessage = '操作失败'
      if (error.response?.data) {
        // 优先显示 error_msg（APISIX 常用格式）
        if (error.response.data.error_msg) {
          errorMessage = error.response.data.error_msg
        }
        // 然后是 message
        else if (error.response.data.message) {
          errorMessage = error.response.data.message
        }
        // 再是 error
        else if (error.response.data.error) {
          errorMessage = error.response.data.error
        }
        // 最后尝试转换为字符串
        else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data
        }
      }
      // 如果没有 response.data，使用 error.message
      else if (error.message) {
        errorMessage = error.message
      }

      // 将提取的错误信息附加到 error 对象上，方便需要时使用
      error.apisixMessage = errorMessage

      // 自动显示错误消息（排除 401，因为已经处理了）
      ElMessage.error(errorMessage)

      return Promise.reject(error)
    }
  )

  return instance
}

const api = createApiInstance()

// 重新创建实例（当配置更新时）
export function refreshApiInstance() {
  const config = getConfig()
  api.defaults.baseURL = config.baseURL || 'http://127.0.0.1:9180'
  api.defaults.headers['X-API-KEY'] = config.adminKey || ''
}

// 提取 APISIX 错误信息（保留此函数以便需要自定义处理时使用）
// 注意：拦截器已经自动显示错误消息，此函数主要用于需要自定义错误处理的场景
export function getErrorMessage(error, defaultMessage = '操作失败') {
  // 如果错误对象已经有提取的消息，直接使用
  if (error.apisixMessage) {
    return error.apisixMessage
  }
  
  if (error.response?.data) {
    // 优先显示 error_msg（APISIX 常用格式）
    if (error.response.data.error_msg) {
      return error.response.data.error_msg
    }
    // 然后是 message
    if (error.response.data.message) {
      return error.response.data.message
    }
    // 再是 error
    if (error.response.data.error) {
      return error.response.data.error
    }
    // 最后尝试转换为字符串
    if (typeof error.response.data === 'string') {
      return error.response.data
    }
  }
  // 如果没有 response.data，使用 error.message
  if (error.message) {
    return error.message
  }
  return defaultMessage
}

export default api
