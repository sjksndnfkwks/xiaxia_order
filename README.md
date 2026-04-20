# 虾虾的626小食堂 🐾

史迪仔主题的微信小程序点菜系统，专属于虾虾。支持点菜、买零食、发消息、纪念日惊喜。

## 功能模块

| 模块 | 说明 |
|---|---|
| 🍽 点菜 | 美团双栏布局，左侧分类导航，右侧菜品列表，滚动同步高亮 |
| 🍬 买零食 | 3列网格，顶部分类筛选 |
| 🛒 购物车 | 菜品/零食分区展示，整体备注，一键提交订单 |
| 💬 消息 | 实时聊天，支持文字/表情/图片/视频/语音 |
| 👤 我的 | 历史订单查看，管理员入口 |
| 🎂 纪念日惊喜 | 特定日期自动弹出花束+信件弹窗，每天只弹一次 |
| ⚙️ 管理后台 | 菜品/零食/分类增删改，订单状态管理，点单分析排行，纪念日内容管理 |

## 技术栈

- **前端**：微信小程序原生（WXML / WXSS / JS）
- **后端**：微信云开发（云数据库 + 云存储 + 云函数 + 订阅消息）

## 目录结构

```
xiaxia_order/
├── app.js                    # 启动入口：云初始化、登录、购物车恢复、纪念日检查
├── app.json                  # tabBar 配置
├── app.wxss                  # 全局 CSS 变量（史迪仔深空主题）
│
├── pages/
│   ├── food/                 # 点菜页
│   ├── snacks/               # 零食页
│   ├── cart/                 # 购物车+下单
│   ├── chat/                 # 聊天
│   ├── profile/              # 我的
│   ├── order-detail/         # 订单详情
│   └── admin/
│       ├── admin-home/       # 管理后台首页
│       ├── admin-menu/       # 菜品/零食管理
│       ├── admin-orders/     # 订单管理
│       ├── admin-analytics/  # 点单分析
│       ├── admin-anniversaries/ # 纪念日管理
│       └── admin-categories/ # 分类管理
│
├── components/
│   ├── cart-bar/             # 底部购物车浮层
│   ├── food-item/            # 菜品行组件
│   ├── snack-item/           # 零食卡片组件
│   ├── note-popup/           # 备注弹窗
│   ├── anniversary-popup/    # 纪念日惊喜弹窗
│   └── chat-bubble/          # 聊天气泡
│
├── utils/
│   ├── cart-store.js         # 购物车状态管理（发布订阅）
│   ├── cloud.js              # 云 API 封装
│   ├── auth.js               # 登录/角色检测
│   ├── time.js               # 日期工具
│   └── constants.js          # 常量（云环境ID、模板ID等）
│
└── cloudfunctions/
    ├── login/                # 获取 openid，写 users，返回 isAdmin
    ├── sendOrderNotify/      # 下单后推送订阅消息给管理员
    ├── sendChatNotify/       # 发消息后推送给管理员
    └── getAnalytics/         # 点单数据统计（聚合查询）
```

## 云数据库集合

| 集合 | 说明 |
|---|---|
| `users` | 用户信息，isAdmin 标记 |
| `categories` | 菜品/零食分类（type: food\|snack） |
| `items` | 菜品/零食（type: food\|snack，available 上下架） |
| `orders` | 订单（status: pending\|confirmed\|done\|cancelled） |
| `messages` | 聊天消息 |
| `conversations` | 会话（记录最新消息、未读数） |
| `anniversaries` | 纪念日（date: MM-DD 每年重复，或 YYYY-MM-DD 特定年份） |
| `subscribe_tokens` | 订阅消息 token |

## 部署步骤

1. **注册小程序**：在 [mp.weixin.qq.com](https://mp.weixin.qq.com) 注册，获取 AppID，填入 `project.config.json`

2. **开通云开发**：在微信开发者工具中创建云开发环境，将环境 ID 填入 `utils/constants.js` 的 `CLOUD_ENV`

3. **设置管理员**：小程序登录一次后，在云控制台 `users` 集合中找到 openid，硬编码到所有云函数中（替换 `oHapF3TKIHD3JVk60hVXugsUpHGM`）

4. **创建数据库集合**：在云控制台手动创建上表中所有集合，权限设为「所有用户可读写」

5. **部署云函数**：右键 `cloudfunctions/` 下每个文件夹 → 上传并部署（云端安装依赖）

6. **申请订阅消息模板**：微信公众平台 → 订阅消息，申请下单通知和消息通知两个模板，将模板 ID 填入 `utils/constants.js`

7. **添加 tab 图标**：在 `assets/icons/` 中放入 8 张 tab 图标（正常/选中各4个），`assets/images/` 中放入史迪仔插图

## 主题设计

采用史迪仔深空主题色系：

- 主色 `#1B4FD8`（深海蓝）
- 深色背景 `#0D1F6E`（深空蓝）
- 星空青 `#00B4D8`
- 史迪仔粉 `#FF6B9D`

字体节奏参考 Claude 设计系统，从 `.title-xl`（48rpx/800）到 `.caption`（22rpx）共5级。
