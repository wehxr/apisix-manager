import api from './request'
export { getConfig, saveConfig, refreshApiInstance, getErrorMessage } from './request'

// SSL 证书管理
export const sslApi = {
  list: (params = {}) => {
    const queryParams = new URLSearchParams()
    if (params.page) queryParams.append('page', params.page)
    if (params.page_size) queryParams.append('page_size', params.page_size)
    const queryString = queryParams.toString()
    return api.get(`/apisix/admin/ssls${queryString ? '?' + queryString : ''}`)
  },
  get: (id) => api.get(`/apisix/admin/ssls/${id}`),
  create: (data) => api.put(`/apisix/admin/ssls/${data.id || Date.now()}`, data),
  update: (id, data) => api.put(`/apisix/admin/ssls/${id}`, data),
  delete: (id) => api.delete(`/apisix/admin/ssls/${id}`)
}

// 消费者管理
export const consumerApi = {
  list: (params = {}) => {
    const queryParams = new URLSearchParams()
    if (params.page) queryParams.append('page', params.page)
    if (params.page_size) queryParams.append('page_size', params.page_size)
    const queryString = queryParams.toString()
    return api.get(`/apisix/admin/consumers${queryString ? '?' + queryString : ''}`)
  },
  get: (username) => api.get(`/apisix/admin/consumers/${username}`),
  create: (username, data) => api.put(`/apisix/admin/consumers/${username}`, data),
  update: (username, data) => api.put(`/apisix/admin/consumers/${username}`, data),
  delete: (username) => api.delete(`/apisix/admin/consumers/${username}`)
}

// Consumer Group 管理
export const consumerGroupApi = {
  list: (params = {}) => {
    const queryParams = new URLSearchParams()
    if (params.page) queryParams.append('page', params.page)
    if (params.page_size) queryParams.append('page_size', params.page_size)
    const queryString = queryParams.toString()
    return api.get(`/apisix/admin/consumer_groups${queryString ? '?' + queryString : ''}`)
  },
  get: (id) => api.get(`/apisix/admin/consumer_groups/${id}`),
  create: (id, data) => api.put(`/apisix/admin/consumer_groups/${id}`, data),
  update: (id, data) => api.put(`/apisix/admin/consumer_groups/${id}`, data),
  delete: (id) => api.delete(`/apisix/admin/consumer_groups/${id}`)
}

// 上游服务器管理
export const upstreamApi = {
  list: (params = {}) => {
    const queryParams = new URLSearchParams()
    if (params.page) queryParams.append('page', params.page)
    if (params.page_size) queryParams.append('page_size', params.page_size)
    const queryString = queryParams.toString()
    return api.get(`/apisix/admin/upstreams${queryString ? '?' + queryString : ''}`)
  },
  get: (id) => api.get(`/apisix/admin/upstreams/${id}`),
  create: (id, data) => api.put(`/apisix/admin/upstreams/${id}`, data),
  update: (id, data) => api.put(`/apisix/admin/upstreams/${id}`, data),
  delete: (id) => api.delete(`/apisix/admin/upstreams/${id}`)
}

// 路由管理
export const routeApi = {
  list: (params = {}) => {
    const queryParams = new URLSearchParams()
    if (params.page) queryParams.append('page', params.page)
    if (params.page_size) queryParams.append('page_size', params.page_size)
    const queryString = queryParams.toString()
    return api.get(`/apisix/admin/routes${queryString ? '?' + queryString : ''}`)
  },
  get: (id) => api.get(`/apisix/admin/routes/${id}`),
  create: (id, data) => api.put(`/apisix/admin/routes/${id}`, data),
  update: (id, data) => api.put(`/apisix/admin/routes/${id}`, data),
  delete: (id) => api.delete(`/apisix/admin/routes/${id}`)
}

// Plugin Config 管理
export const pluginConfigApi = {
  list: (params = {}) => {
    const queryParams = new URLSearchParams()
    if (params.page) queryParams.append('page', params.page)
    if (params.page_size) queryParams.append('page_size', params.page_size)
    const queryString = queryParams.toString()
    return api.get(`/apisix/admin/plugin_configs${queryString ? '?' + queryString : ''}`)
  },
  get: (id) => api.get(`/apisix/admin/plugin_configs/${id}`),
  create: (id, data) => api.put(`/apisix/admin/plugin_configs/${id}`, data),
  update: (id, data) => api.put(`/apisix/admin/plugin_configs/${id}`, data),
  delete: (id) => api.delete(`/apisix/admin/plugin_configs/${id}`)
}

export default api
