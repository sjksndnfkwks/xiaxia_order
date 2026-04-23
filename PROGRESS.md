# 开发进度

> 这是一份时间轴，最新在最上。`README.md` 是功能总览，`CLAUDE.md` 是给 Claude Code 的工程笔记。

## 当前版本功能

### 核心流程
- 登录 / 角色（管理员 ADMIN_OPENID 硬编码于 login 云函数）
- 点菜（双栏）、零食（网格）、购物车、下单
- 订单详情：支持加减商品、改备注、取消
- 聊天：文字/表情/图片/视频/语音、引用、长按菜单（复制/引用/多选/删除）、多选合并
- 用户资料：`open-type="chooseAvatar"` 换头像 + `type="nickname"` 改昵称（已替换掉废弃的 `wx.getUserProfile`）

### 内容系统
- **纪念日**：管理员配置标题 / 日期（MM-DD 或 YYYY-MM-DD）/ 背景图 / To / 正文 / From，用户进入点菜页首次当天自动弹出信纸样式弹窗
- **公告**：管理员发布带图公告，用户首次打开弹最新一条，可在"我的 → 公告"查看历史
- **想吃清单**：所有用户共享的排行榜，任何人添加条目并打分，其他人可独立打分，显示前 3 位头像叠层和 `+N`，管理员可一键加到菜单

### UI
- MotherDuck 风配色（navy `#1D1B3B` + yellow `#FFD85A` + teal `#5EE2D3` + cream bg `#FDFBF5`）
- 自定义 tabBar，去掉表情图标改成文字 + 黄色小圆点指示器
- 统一系统字体栈，移除装饰性 emoji

## 迭代记录

### 第 N+M 次：想吃清单 v2 + 公告
- `pages/wishlist/`：从单用户本地清单升级为所有人共享的排行榜，带分类、多人打分、头像叠层
- `pages/admin/admin-announcements/`：公告管理页 CRUD
- `pages/announcements/`：用户查看公告历史
- `components/announcement-popup/`：自动弹窗组件
- `app.js _checkAnnouncement`：登录后拉最新公告，用「globalData + getCurrentPages 双路径」触发 food 页弹窗，避开 food.onShow vs 云请求的 race

### 第 N+L 次：聊天长按菜单
- 改用 `bindtouchstart` + 380ms 定时器替代 `bindlongpress`（PC 上文字选中会抢占）
- 移除 `user-select`
- 浮层菜单在点击位置附近弹出，选项：复制 / 引用 / 多选 / 删除
- 引用样式改为灰底白字，贴在新消息气泡下方
- 多选改为「合并」语义：打包成 type=merged 的新消息，原消息保留，点击合并气泡弹详情

### 第 N+K 次：订单流简化
- 下单直接 `status: done`，跳过「待确认」「已确认」步骤
- 订单详情页增加 +/− 改数量、改备注、取消订单
- "pending" 的显示文字从"待确认"改为"已下单"

### 第 N+J 次：头像/昵称修复
- 停用 `wx.getUserProfile`（lib 3.x 已废弃，返回"微信用户"+灰色默认头像，还有频率限制）
- 头像：`<button open-type="chooseAvatar" bindchooseavatar>`
- 昵称：`<input type="nickname" bindchange>`（`bindblur` 在微信建议列表选择时不触发）
- 云函数 `login` 新用户数据补上 `_openid` 字段，避免客户端 where 查询被安全规则拦截

### 第 N+I 次：UI 统一与 emoji 清理
- 全局字体换成系统栈 `-apple-system, PingFang SC, ...`
- 给所有组件根加 `font-family: inherit` 防止默认值覆盖
- 去掉所有装饰性 emoji（保留用户自己输入的）
- 阴影值整体调暗（0 1rpx 3rpx rgba 类）
- tabBar 图标改为纯文字 + 黄色圆点指示器

### 第 N 次之前：基础版本（见初始 commit）
- 所有核心页面、组件、云函数、主题系统初版
- 详细条目保留在 git 历史的 `3adf49a` commit 里

## 已知待办

- 订阅消息模板 ID 仍是 `YOUR_*_TEMPLATE_ID` 占位符，未申请
- `assets/icons/` 下的 tab 图标路径已不再被 tabBar 使用（已改为文字 + 圆点），可以清理
- 订单详情页的"保存修改"操作目前没有走云函数鉴权，所有字段都从客户端写入 orders，如果未来有多用户场景需要收紧权限
