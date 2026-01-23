# APISIX 管理平台

一个基于 Vue3 的 APISIX 管理界面，简化 APISIX 的配置和管理。

## 功能特性

- ✅ SSL 证书管理
- ✅ 消费者管理（支持 Basic Auth 认证）
- ✅ 上游服务器管理
- ✅ 路由管理（支持消费者限制和 IP 访问限制）
- ✅ 系统设置（APISIX 地址和 Admin Key 配置）

## 技术栈

- Vue 3
- Element Plus
- Vue Router
- Axios
- Vite

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

应用将在 `http://localhost:3000` 启动

### 构建生产版本

```bash
npm run build
```

构建后的文件在 `dist` 目录中，可以部署到任何静态文件服务器。

### 首次配置

1. 启动应用后，会自动跳转到设置页面
2. 配置 APISIX 地址：`http://127.0.0.1:9180`
3. 配置 Admin Key：`edd1c9f034335f136f87ad84b625c8f1`
4. 点击"测试连接"验证配置
5. 点击"保存配置"保存设置

## 使用说明

### 首次使用

1. 首次打开页面时，如果没有配置 Admin Key，会自动跳转到设置页面
2. 在设置页面配置：
   - APISIX 地址（默认：`http://127.0.0.1:9180`）
   - Admin Key（用于访问 APISIX Admin API）
3. 点击"测试连接"验证配置是否正确
4. 点击"保存配置"保存设置

### SSL 证书管理

- 添加 SSL 证书，支持配置多个域名（SNI）
- 支持 PEM 格式的证书和私钥
- 可以编辑和删除已添加的证书

### 消费者管理

- 创建消费者，支持配置 Basic Auth 认证
- 为消费者设置用户名和密码
- 消费者可用于路由的访问控制

### 上游服务器管理

- 配置上游服务器节点
- 支持多个节点和权重配置
- 支持多种负载均衡类型：
  - 轮询 (roundrobin)
  - 一致性哈希 (chash)
  - 最少连接 (least_conn)

### 路由管理

- 创建路由规则，支持多个 URI 路径
- 关联上游服务器
- 支持插件配置：
  - **Basic Auth**：限制只有特定消费者可以访问
  - **IP 限制**：支持白名单和黑名单，可配置 IP 地址或 CIDR 网段
  - **CORS**：配置跨域访问

## 配置说明

所有配置都保存在浏览器的 localStorage 中，包括：
- APISIX 地址
- Admin Key

## 测试环境

- APISIX 地址：`http://127.0.0.1:9180`
- Admin Key：`edd1c9f034335f136f87ad84b625c8f1`

## 注意事项

- 这是一个纯前端应用，直接调用 APISIX Admin API
- 确保 APISIX 已启用 Admin API 并配置了正确的 Admin Key
- 确保浏览器可以访问 APISIX 服务（注意跨域问题）

## 参考文档

- [APISIX Admin API 文档](https://apisix.apache.org/docs/apisix/admin-api/)
- [Basic Auth 插件](https://apisix.apache.org/zh/docs/apisix/plugins/basic-auth/)
- [IP 限制插件](https://apisix.apache.org/zh/docs/apisix/plugins/ip-restriction/)
- [CORS 插件](https://apisix.apache.org/zh/docs/apisix/plugins/cors/)
