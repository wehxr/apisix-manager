<template>
  <div class="dashboard-page">
    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon" style="background-color: #409eff;">
              <el-icon><Connection /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.routes }}</div>
              <div class="stat-label">路由总数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon" style="background-color: #67c23a;">
              <el-icon><Monitor /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.upstreams }}</div>
              <div class="stat-label">上游服务</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon" style="background-color: #e6a23c;">
              <el-icon><User /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.consumers }}</div>
              <div class="stat-label">消费者</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon" style="background-color: #f56c6c;">
              <el-icon><Lock /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.ssl }}</div>
              <div class="stat-label">SSL 证书</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Connection, Monitor, User, Lock } from '@element-plus/icons-vue'
import { routeApi, upstreamApi, consumerApi, sslApi } from '../utils/api'

const loading = ref(false)
const stats = ref({
  routes: 0,
  upstreams: 0,
  consumers: 0,
  ssl: 0
})

const loadStats = async () => {
  loading.value = true
  try {
    // 获取统计数据（使用分页参数获取总数，page_size 最小为 10）
    const [routeRes, upstreamRes, consumerRes, sslRes] = await Promise.all([
      routeApi.list({ page: 1, page_size: 10 }),
      upstreamApi.list({ page: 1, page_size: 10 }),
      consumerApi.list({ page: 1, page_size: 10 }),
      sslApi.list({ page: 1, page_size: 10 })
    ])

    // 从响应中获取总数
    // APISIX v3 版本返回格式: { list: [...], total: number }
    stats.value.routes = routeRes.data?.total ?? (routeRes.data?.list?.length ?? 0)
    stats.value.upstreams = upstreamRes.data?.total ?? (upstreamRes.data?.list?.length ?? 0)
    stats.value.consumers = consumerRes.data?.total ?? (consumerRes.data?.list?.length ?? 0)
    stats.value.ssl = sslRes.data?.total ?? (sslRes.data?.list?.length ?? 0)
  } catch (error) {
    // 错误消息已由拦截器自动显示
    console.error('加载统计数据失败:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadStats()
})
</script>

<style scoped>
.dashboard-page {
  width: 100%;
  padding: 0;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  margin-bottom: 0;
  height: 100%;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 4px 0;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 28px;
  flex-shrink: 0;
}

.stat-info {
  flex: 1;
  text-align: right;
  min-width: 0;
}

.stat-value {
  font-size: 32px;
  font-weight: 600;
  color: #303133;
  line-height: 1;
  margin-bottom: 8px;
  word-break: break-all;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  white-space: nowrap;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .dashboard-page {
    padding: 0;
  }

  .stats-row {
    margin-bottom: 16px;
  }

  .stats-row :deep(.el-col) {
    margin-bottom: 12px;
  }

  .stat-card {
    margin-bottom: 0;
  }

  .stat-content {
    gap: 12px;
    padding: 8px 0;
  }

  .stat-icon {
    width: 48px;
    height: 48px;
    font-size: 24px;
  }

  .stat-value {
    font-size: 24px;
    margin-bottom: 6px;
  }

  .stat-label {
    font-size: 12px;
  }

  .stat-info {
    text-align: left;
  }
}

@media (max-width: 480px) {
  .stats-row {
    margin-bottom: 12px;
  }

  .stats-row :deep(.el-col) {
    margin-bottom: 10px;
  }

  .stats-row :deep(.el-row) {
    margin-left: -8px !important;
    margin-right: -8px !important;
  }

  .stats-row :deep(.el-col) {
    padding-left: 8px !important;
    padding-right: 8px !important;
  }

  .stat-content {
    gap: 10px;
    padding: 12px 0;
  }

  .stat-icon {
    width: 44px;
    height: 44px;
    font-size: 22px;
  }

  .stat-value {
    font-size: 22px;
    margin-bottom: 4px;
  }

  .stat-label {
    font-size: 11px;
  }
}
</style>
