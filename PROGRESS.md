# 史迪仔小程序 开发进度

## 第1步：基础层文件 ✅
- [x] project.config.json — 项目配置（记得填入你的AppID）
- [x] app.json — Tab导航配置（点菜/零食/消息/我的）
- [x] app.wxss — 全局样式变量（史迪仔蓝色主题）
- [x] app.js — 入口：云开发初始化、登录、购物车恢复、纪念日检查
- [x] utils/constants.js — 全局常量（云环境ID、模板ID、订单状态、表情列表）
- [x] utils/time.js — 日期工具函数（格式化、纪念日匹配、订单号生成）
- [x] utils/auth.js — 登录/角色检测
- [x] utils/cart-store.js — 购物车状态管理（发布订阅、持久化）
- [x] utils/cloud.js — 云API封装（上传文件、批量查询）

## 第2步：云函数 ✅
- [x] cloudfunctions/login/ — 登录+isAdmin验证（对比ADMIN_OPENID环境变量）
- [x] cloudfunctions/sendOrderNotify/ — 下单推送（消费subscribe_tokens）
- [x] cloudfunctions/sendChatNotify/ — 消息推送
- [x] cloudfunctions/getAnalytics/ — 点单数据统计（聚合查询，分food/snack返回排行）

## 第3步：自定义组件 ✅
- [x] components/cart-bar/ — 底部购物车浮层（订阅cart-store变化自动更新）
- [x] components/food-item/ — 菜品行（美团风格，带加减+备注入口）
- [x] components/snack-item/ — 零食卡片（网格，加减+备注入口）
- [x] components/note-popup/ — 备注弹窗（底部sheet，50字限制）
- [x] components/anniversary-popup/ — 纪念日惊喜弹窗（花束+信件+入场动画）
- [x] components/chat-bubble/ — 聊天气泡（文字/图片/视频/语音，自/他方向）

## 第4步：用户页面 ✅
- [x] pages/food/ — 点菜（双栏分类导航+滚动同步高亮+纪念日弹窗触发）
- [x] pages/snacks/ — 零食（顶部分类筛选+3列网格）
- [x] pages/cart/ — 购物车+下单（菜品/零食分区+整体备注+订阅消息请求）
- [x] pages/chat/ — 聊天（watch实时监听+文字/表情/图片/视频/语音）
- [x] pages/profile/ — 我的（历史订单+管理员入口）
- [x] pages/order-detail/ — 订单详情（状态+整体备注+分区展示）

## 第5步：管理后台页面 ✅
- [x] pages/admin/admin-home/ — 后台首页（待处理订单/今日订单/未读消息数据卡）
- [x] pages/admin/admin-menu/ — 菜品/零食管理（Tab切换+增删改+图片上传+上下架）
- [x] pages/admin/admin-orders/ — 订单管理（状态筛选+展开详情+确认/完成/取消操作）
- [x] pages/admin/admin-analytics/ — 用户喜好分析（调用云函数+flex柱状图排行）
- [x] pages/admin/admin-anniversaries/ — 纪念日管理（列表+增删改+图片上传+信件编辑）
- [x] pages/admin/admin-categories/ — 分类管理（food/snack Tab切换+增删改，createdAt排序）

## 第6步：全局 UI 大改版 ✅（史迪仔深空主题 + Claude 字体节奏）

### 设计系统重建（app.wxss）
- 新增深空色系变量：`--c-bg-deep: #0D1F6E`、`--grad-deep`（深蓝→主蓝→星空青）
- Claude 字体节奏：`.title-xl`（48rpx/800）→ `.title-lg` → `.title-md` → `.title-sm`、`.body-*`、`.caption`
- 新增 `.page-banner` 类（渐变横幅+爪印装饰 ::after）
- 阴影分三级：`--shadow-card` / `--shadow-float` / `--shadow-btn`

### app.json
- 导航栏背景色改为 `#0D1F6E`
- tabBar 底色改为 `#0D1F6E`，选中色改为 `#6B9FFF`（深空蓝调）

### 全部页面/组件 WXSS（18 个文件）
| 文件 | 核心变化 |
|---|---|
| `food.wxss` | 侧边栏用 `--c-bg-deep` 黑蓝，激活项白色对比 |
| `snacks.wxss` | 分类 pill 改深蓝底+半透明白色，激活用 `--c-primary-light` |
| `food-item.wxss` | + 按钮渐变蓝+投影；备注标签改粉色系 |
| `snack-item.wxss` | 同上；`box-sizing: border-box` 修复 |
| `cart-bar.wxss` | 整体改 `--c-bg-deep`；提交按钮粉色渐变+投影 |
| `cart.wxss` | 全面换变量；禁用态改用 `--c-border` |
| `profile.wxml+wxss` | header 改为纯 `--grad-deep` 渐变（去掉图片）；新增 `content-area` 上浮白卡区 |
| `chat.wxss` | 输入框/面板全换变量；发送按钮渐变 |
| `note-popup.wxss` | 遮罩改深蓝半透明；确认按钮渐变 |
| `anniversary-popup.wxss` | 花束区用 `--grad-deep`；关闭按钮粉色渐变 |
| `admin-home.wxss` | banner 改 `--grad-deep`+爪印装饰；统计卡片 `--shadow-float` |
| `admin-menu.wxss` | 操作按钮改品牌色系（蓝/青/粉）；表单弹窗深蓝遮罩 |
| `admin-orders.wxss` | 筛选条深蓝底；备注区改粉色系；操作按钮渐变 |
| `admin-analytics.wxss` | 进度条改 `--grad-primary`；零食进度条粉色渐变 |
| `admin-anniversaries.wxss` | 全面换变量；FAB 改粉色渐变 |
| `admin-categories.wxss` | 操作按钮改品牌色系；弹窗换深蓝遮罩 |
| `chat-bubble.wxss` | 自己的气泡改 `--grad-primary` |
| `order-detail.wxss` | 状态卡片改 `--grad-deep`；备注区改粉色系 |

---

## 🎉 全部完成！

**所有文件均已生成完毕。**

## 下一步操作（你需要手动完成）

1. **填写 AppID**：打开 `project.config.json`，将 `"YOUR_APPID_HERE"` 替换为你在 [mp.weixin.qq.com](https://mp.weixin.qq.com) 注册的小程序AppID

2. **创建云开发环境**：在微信开发者工具中开启云开发，创建环境后将ID填入 `utils/constants.js` 的 `CLOUD_ENV`

3. **设置管理员openid**：登录一次小程序后在云控制台的users集合里找到自己的openid，填入各云函数的环境变量 `ADMIN_OPENID`（在微信云开发控制台 → 云函数 → login → 配置 → 环境变量）

4. **创建数据库集合**：在云控制台手动创建以下集合：
   - `users` / `categories` / `items` / `orders` / `messages` / `conversations` / `anniversaries` / `subscribe_tokens`

5. **部署云函数**：在开发者工具中右键每个 `cloudfunctions/` 下的文件夹 → "上传并部署（云端安装依赖）"

6. **申请订阅消息模板**：微信公众平台 → 功能 → 订阅消息 → 选模板，填入 `utils/constants.js` 的模板ID（审核需1-3天）

7. **添加tab图标**：在 `assets/icons/` 中放入8张tab图标（正常/选中各4个，建议从史迪仔素材包中获取），以及 `assets/images/` 中的背景图

8. **添加初始分类数据**：在云控制台 `categories` 集合中插入初始分类（如：主食、小炒、炖品用于food；薯片、糖果、饮料用于snack）
