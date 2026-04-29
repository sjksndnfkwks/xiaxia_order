# repeat的食堂

个人向的微信小程序点菜系统。原生 WXML/WXSS/JS 前端 + 微信云开发后端，无独立服务器。

## 功能模块

| 模块 | 说明 |
|---|---|
| 点菜 | 双栏布局：左侧分类导航，右侧菜品列表，滚动联动高亮 |
| 零食 | 顶部分类筛选，3 列网格 |
| 购物车 | 菜品/零食分区 + 整体备注，一键下单 |
| 订单详情 | 订单下单后仍可改数量/备注，可取消；"我的"页订单旁显示下单人头像/昵称，单条可删除（活跃订单先取消再删除） |
| 消息 | 云开发实时聊天，文字/表情/图片/视频/语音；语音气泡用三道弧形波纹动画，气泡宽度按时长动态变化；长按菜单：复制/引用/多选/删除；多选可合并成一条转发气泡，引用消息以灰底白字附在原气泡下方 |
| 点菜图片预览 | 点击菜品图片，组件内放大并模糊背景（非全屏 previewImage） |
| 想吃清单 | 所有用户共享的排行榜，任何人可添加、给心仪的菜加「想吃程度」；排序按所有人打分之和；每条显示前 3 位参与者头像和 `+N` 叠层 |
| 公告 | 管理员可发布带图的公告；最新一条公告每个用户「首次打开时」自动弹出；历史公告可在"我的 → 公告"回看 |
| 纪念日 | 特定日期自动弹出背景图 + 信件（To / 正文 / From），每天只弹一次，用户可配置 |
| 我的 | 头像/昵称编辑、订单历史、想吃清单入口、公告入口、管理员入口 |
| 管理后台 | 分类、菜品/零食、订单、点单排行、纪念日、公告的 CRUD，以及从想吃清单「一键加到菜单」 |

## 技术栈

- 前端：微信小程序原生（WXML / WXSS / JS）
- 后端：微信云开发（云数据库 + 云存储 + 云函数 + 订阅消息）
- 自定义 tabBar（见 `custom-tab-bar/`）

## 目录结构

```
repeat-canteen/
├── app.js                    # 云开发初始化 + 登录 + 购物车恢复 + 纪念日/公告弹窗检查
├── app.json                  # 页面注册 + tabBar 配置（custom: true）
├── app.wxss                  # 全局 CSS 变量（MotherDuck 风配色）
│
├── custom-tab-bar/           # 自定义 tabBar 组件
│
├── pages/
│   ├── food/                 # 点菜
│   ├── snacks/               # 零食
│   ├── cart/                 # 购物车 + 下单
│   ├── order-detail/         # 订单详情（可改数量/取消）
│   ├── chat/                 # 聊天
│   ├── profile/              # 我的
│   ├── wishlist/             # 想吃清单（共享排行榜）
│   ├── announcements/        # 用户看公告（历史）
│   └── admin/
│       ├── admin-home/       # 管理后台首页
│       ├── admin-menu/       # 菜品/零食 CRUD
│       ├── admin-orders/     # 订单管理
│       ├── admin-analytics/  # 点单排行
│       ├── admin-anniversaries/ # 纪念日 CRUD
│       ├── admin-announcements/ # 公告 CRUD
│       └── admin-categories/ # 分类 CRUD
│
├── components/
│   ├── cart-bar/             # 底部购物车浮层（订阅 cart-store）
│   ├── food-item/            # 菜品行
│   ├── snack-item/           # 零食卡片
│   ├── note-popup/           # 备注弹窗
│   ├── chat-bubble/          # 聊天气泡（含长按菜单触发）
│   ├── anniversary-popup/    # 纪念日弹窗
│   └── announcement-popup/   # 公告弹窗
│
├── utils/
│   ├── cart-store.js         # 购物车状态（发布订阅 + 本地持久化）
│   ├── cloud.js              # wx.cloud 懒加载封装
│   ├── auth.js               # 登录/角色
│   ├── time.js               # 日期工具
│   └── constants.js          # 云环境 ID、订单状态、表情列表
│
└── cloudfunctions/
    ├── login/                # 获取 openid，写 users 集合，对比 ADMIN_OPENID 返回 isAdmin
    ├── sendOrderNotify/      # 下单后订阅消息推送
    ├── sendChatNotify/       # 收到新消息后订阅消息推送
    └── getAnalytics/         # 菜品/零食点单聚合排行
```

## 云数据库集合

| 集合 | 用途 |
|---|---|
| `users` | 用户档案（openid、nickName、avatarUrl、isAdmin） |
| `categories` | 分类（`type: food \| snack`） |
| `items` | 菜品/零食 |
| `orders` | 订单（`status: done \| cancelled` 为主，创建时即 done；含 `userNickName` / `userAvatarUrl` 快照） |
| `messages` | 聊天消息 |
| `conversations` | 会话元数据（最新消息、未读数） |
| `anniversaries` | 纪念日（`date` 可为 `MM-DD` 每年重复或 `YYYY-MM-DD` 特定年份） |
| `announcements` | 公告（`publishDate` + `title` + `content` + `imageUrl`） |
| `wishlist` | 想吃清单条目（含 `wants: [{openid, avatar, level}]`） |
| `subscribe_tokens` | 订阅消息 token（云函数消费） |

## 部署步骤

1. **注册小程序**：在 [mp.weixin.qq.com](https://mp.weixin.qq.com) 注册并拿到 AppID，填入 `project.config.json`
2. **开通云开发**：在微信开发者工具中创建云开发环境，将环境 ID 填入 `utils/constants.js` 的 `CLOUD_ENV`
3. **设置管理员**：小程序登录一次后在云控制台 `users` 集合找到 openid，替换 `cloudfunctions/login/index.js` 顶部的 `ADMIN_OPENID`
4. **创建数据库集合**：云控制台手动创建上表所有集合（或等第一次写入自动创建），权限按需设置。存储权限建议为「所有用户可读，仅创建者及管理员可写」，否则图片会返回 403
5. **部署云函数**：右键 `cloudfunctions/` 下每个文件夹 → 上传并部署
6. **申请订阅消息模板**（选做）：微信公众平台 → 订阅消息，申请下单和聊天两个模板，ID 填入 `utils/constants.js`
7. **放入 tab 图标**：`assets/icons/` 中 8 张图标（4 个 tab × 正常/选中）

## 开发注意

见 `CLAUDE.md`，里面记录了 WeChat 框架的若干坑（wxml 表达式不支持方法调用、`wx.getUserProfile` 已废弃、scroll-view 需要固定高度、云函数 `.add()` 不自动加 `_openid` 等）。
