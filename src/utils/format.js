// 时间格式化工具函数
export function formatTimestamp(timestamp) {
  if (!timestamp) {
    return '-'
  }
  
  // 如果时间戳是秒级，转换为毫秒
  const ms = timestamp < 10000000000 ? timestamp * 1000 : timestamp
  
  const date = new Date(ms)
  
  // 格式化为: YYYY-MM-DD HH:mm:ss
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

// 计算对话框动态宽度
export function getDialogWidth() {
  if (typeof window === 'undefined') {
    return '65%'
  }
  const screenWidth = window.innerWidth
  if (screenWidth < 768) {
    return '95%' // 移动端
  } else if (screenWidth < 1024) {
    return '85%' // 平板
  } else if (screenWidth < 1440) {
    return '65%' // 小桌面
  } else {
    return '55%' // 大桌面
  }
}
