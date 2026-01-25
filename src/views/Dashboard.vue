<template>
  <div class="dashboard-page">
    <!-- 统计卡片 -->
    <el-row :gutter="20" style="margin-bottom: 20px;">
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
}

.stat-card {
  margin-bottom: 0;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
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
}

.stat-value {
  font-size: 32px;
  font-weight: 600;
  color: #303133;
  line-height: 1;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .stat-icon {
    width: 48px;
    height: 48px;
    font-size: 24px;
  }

  .stat-value {
    font-size: 24px;
  }

  .stat-label {
    font-size: 12px;
  }

  .stat-content {
    gap: 12px;
  }
}

@media (max-width: 480px) {
  .stat-icon {
    width: 40px;
    height: 40px;
    font-size: 20px;
  }

  .stat-value {
    font-size: 20px;
  }
}
</style>
