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

    <!-- 最近的路由 -->
    <el-card>
      <template #header>
        <div class="card-header">
          <span>最近的路由</span>
          <el-button type="text" @click="$router.push('/route')">查看全部</el-button>
        </div>
      </template>
      <el-table :data="recentRoutes" v-loading="loading" style="width: 100%">
        <el-table-column prop="id" label="ID" width="180" show-overflow-tooltip />
        <el-table-column prop="name" label="名称" width="150" />
        <el-table-column prop="uris" label="路径" min-width="150">
          <template #default="{ row }">
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <el-tag
                v-for="uri in (row.uris || []).slice(0, 2)"
                :key="uri"
                size="small"
                style="width: fit-content;"
              >
                {{ uri }}
              </el-tag>
              <span v-if="!row.uris || row.uris.length === 0" style="color: #909399">-</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="hosts" label="域名" min-width="180">
          <template #default="{ row }">
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <el-tag
                v-for="host in (row.hosts || []).slice(0, 2)"
                :key="host"
                type="info"
                size="small"
                style="width: fit-content;"
              >
                {{ host }}
              </el-tag>
              <span v-if="!row.hosts || row.hosts.length === 0" style="color: #909399">全部</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
              {{ row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="update_time" label="更新时间" width="180">
          <template #default="{ row }">
            <span>{{ formatTimestamp(row.update_time) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="$router.push({ path: '/route', query: { edit: row.id } })">查看</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Connection, Monitor, User, Lock } from '@element-plus/icons-vue'
import { routeApi, upstreamApi, consumerApi, sslApi } from '../utils/api'
import { formatTimestamp } from '../utils/format'

const loading = ref(false)
const stats = ref({
  routes: 0,
  upstreams: 0,
  consumers: 0,
  ssl: 0
})
const recentRoutes = ref([])

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

    // 获取最近的路由（获取前10条，然后取前5条按更新时间排序）
    const routesRes = await routeApi.list({ page: 1, page_size: 10 })
    const routeData = routesRes.data
    if (routeData?.list && Array.isArray(routeData.list)) {
      recentRoutes.value = routeData.list
        .map(item => {
          const value = item.value || item
          return {
            ...value,
            id: value.id || item.key || item.id,
            create_time: value.create_time || item.create_time,
            update_time: value.update_time || item.update_time
          }
        })
        .filter(item => item.id) // 过滤掉无效数据
        .sort((a, b) => (b.update_time || 0) - (a.update_time || 0))
        .slice(0, 5)
    } else {
      recentRoutes.value = []
    }
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

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 16px;
  font-weight: 600;
}

:deep(.el-card__body) {
  padding: 20px;
}
</style>
