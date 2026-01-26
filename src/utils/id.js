/**
 * 生成随机 ID
 * @param {string} prefix - ID 前缀，如 'route', 'upstream', 'global_rule' 等
 * @returns {string} 生成的随机 ID
 */
export function generateId(prefix = 'id') {
  return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9)
}
