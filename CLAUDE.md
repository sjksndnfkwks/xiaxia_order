# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

WeChat mini-program (微信小程序) "虾虾的626小食堂" — personal food-ordering app. Native WXML/WXSS/JS on the frontend, WeChat Cloud (wx.cloud) for all backend. No npm build step and no traditional test runner: development happens inside 微信开发者工具 (WeChat Developer Tools).

## Running and deploying

Development is driven by the WeChat IDE, not a CLI. Key workflows:

- **Compile / reload**: toolbar "编译" button (or Ctrl+B). This re-bundles the mini-program and reloads the simulator.
- **Clear storage between runs**: "清缓存 → 清除全部缓存". Needed when testing things that persist in `wx.setStorageSync` (e.g. anniversary/announcement "already shown today" flags, cart).
- **Upload a cloud function**: right-click the folder under `cloudfunctions/` → "上传并部署：云端安装依赖". Code in `cloudfunctions/<name>/index.js` does NOT take effect until uploaded. After changing any cloud function you must re-upload.
- **Cloud console**: toolbar "云开发" → lets you view/edit database collections, storage files, and cloud-function logs. First-time setup requires manually creating any missing collection here (or the first `.add()` will create it lazily).
- **Cloud storage image ACL**: by default uploaded images require auth token to load; in the cloud console set storage permission to "所有用户可读，仅创建者及管理员可写" or image URLs will return 403 in `<image>` tags.

## Architecture overview

### Login and admin gate

`app.js` → `_doLogin()` calls the `login` cloud function on every app start. The cloud function (`cloudfunctions/login/index.js`) compares `cloud.getWXContext().OPENID` against a **hardcoded** `ADMIN_OPENID` constant at the top of that file — this is the single source of truth for admin identity. `app.globalData.isAdmin` is set from that result. Pages gate admin-only UI with `app.globalData.isAdmin` and admin-only pages `wx.navigateBack()` in `onLoad` when it's false.

Any new cloud function that needs admin verification should re-check `OPENID === ADMIN_OPENID` server-side — don't trust a client-sent flag.

Pages that need the login to have completed before rendering call `await app.waitLogin()` in `onLoad`. `waitLogin()` is a promise that resolves immediately if login is done, otherwise queues a callback. Use it — do not read `app.globalData.openid` in `onLoad` without awaiting.

### Cloud data access

`utils/cloud.js` exports `col(name)` / `db` / `_` (command) as **lazy getters** that call `wx.cloud.database()` each time. This is intentional: `wx.cloud.init()` runs in `app.js onLaunch`, and module-level `const db = wx.cloud.database()` would resolve before init. Always go through `utils/cloud.js`, not `wx.cloud.database()` at module scope.

### Shopping cart

`utils/cart-store.js` is a singleton pub/sub store. Pages subscribe in `onLoad` (keep the returned unsubscribe, call it in `onUnload`). State is mirrored to `wx.setStorageSync('cart', ...)` and restored by `cartStore.restore()` in `app.js onLaunch`. Food and snacks share the same cart; rows are distinguished by `type: 'food' | 'snack'`.

### Custom tabBar

`app.json` sets `"custom": true` and the bar lives in `custom-tab-bar/`. Each tab page must set the right selected index AND `hidden: false` in `onShow`:

```js
onShow() {
  if (typeof this.getTabBar === 'function' && this.getTabBar()) {
    this.getTabBar().setData({ selected: <0-3>, hidden: false })
  }
}
```

Forgetting `hidden: false` causes the tabBar to vanish after navigating between certain pages. Setting `selected` without this boilerplate leaves the wrong tab highlighted.

### Chat page

Uses `db.collection('messages').watch()` with a `conversationId = conv_<openid>` convention. The watcher is torn down in `onHide`/`onUnload` AND restarted in `onShow` (`if (!this._watcher)`) — if you only start it in `onLoad`, switching tabs once kills real-time updates permanently.

Messages are mutated client-side (`_processMessages`) to add `showTime`/`timeLabel` (5-minute gap separator), `selected` (for multi-select — see below), and `mergedPreview` (for merged-message bubbles). The watcher's `onChange` must re-apply `selected` from `selectedIds` or multi-select state is lost when new messages arrive.

Long-press menu on chat bubbles is implemented in `chat-bubble` component using a manual `bindtouchstart` + 380ms timer + `bindtouchmove/end/cancel` to clear it. `bindlongpress` was replaced because PC WeChat's text-selection behavior was stealing the gesture; `user-select` was also removed from bubble text for the same reason.

### Popup / "show once per day" pattern

Anniversary and announcement popups both live on the food page and follow the same pattern:

1. `app.js` queries the cloud collection after login completes and stores the matched record on `app.globalData.todayAnniversary` / `todayAnnouncement`.
2. Since the cloud query is async and may resolve **after** `food` page's `onShow`, `app.js` also calls `getCurrentPages()` to find an already-mounted food page and push the data via `setData`.
3. The food page's `onShow` also checks `globalData` (for the opposite race).
4. Dismissal writes a key to `wx.setStorageSync` (`anniversaryShown_<date>` / `annShown_<id>`); the popup checks this key before auto-showing.

When adding another "once per day" popup, reuse this dual-path trigger — neither `onShow` checking alone nor `app.js` pushing alone is sufficient because of the race.

### Order lifecycle

Orders are created with `status: 'done'` directly (no pending-approval step). Order detail page supports item-level qty +/−, note edit, and cancel (sets status to `cancelled`). Status constants and display text are in `utils/constants.js` (`ORDER_STATUS`, `ORDER_STATUS_TEXT`).

### Theme

`app.wxss` defines CSS variables (`--c-primary`, `--c-yellow`, etc.) in a MotherDuck-inspired palette (navy `#1D1B3B` + yellow `#FFD85A` + teal `#5EE2D3` + cream bg `#FDFBF5`). Prefer variables over hex literals in page-level wxss so theme tweaks propagate. The global font stack is set on `page` and re-applied via `view, text, ... { font-family: inherit }` to work around components not inheriting.

## WeChat mini-program gotchas encountered in this codebase

These have bitten us before — check them before debugging the obvious.

- **wxml expressions are restricted**: no method calls in template expressions. `{{arr.indexOf(x) !== -1}}` silently evaluates truthy for every row. Precompute boolean flags in JS and read plain fields in wxml.
- **`wx:for` + `wx:if` on the same element + `wx:key="index"`** triggers `FLOW_ALLOC_NODE_ID` rendering errors when the loop source changes. Precompute a filtered array and loop that instead, using a stable unique key.
- **`scroll-view` needs a fixed pixel height** (`height: Nrpx` or `height: 100vh`). `flex: 1` with no height does not scroll.
- **`<text>` ignores `width`**. Use `<view>` for anything that needs box sizing.
- **`wx.getUserProfile` is deprecated** (returns "微信用户" and a gray default avatar, rate-limited). Use `<button open-type="chooseAvatar" bindchooseavatar="...">` for avatar and `<input type="nickname" bindchange="...">` for nickname. Use `bindchange`, not `bindblur` — selecting a suggested nickname triggers `change`, not `blur`.
- **Cloud function `.add()` from server does not auto-set `_openid`**. If client-side code later does `where({ openid })` under default security rules, the update may be silently denied. When a cloud function creates a user doc, explicitly include `_openid: OPENID` in the data, or use `doc(_id).update()` (which bypasses the ownership filter under less strict rules).
- **Cloud DB serverDate returns `{$date: <ms>}`** not a Date. `new Date({$date: ms})` is NaN. Time helpers in `utils/time.js` handle both Date objects and `{$date}` wrappers; route all createdAt/updatedAt through them.
- **Custom components are `display: inline` at the outer wrapper** by default, which can cause unexpected widths. Widths/layouts must be set on the root element inside the component's wxml, or via `externalClasses`/host style rules.

## Ongoing source of truth

`README.md` has a high-level feature/deployment overview. `PROGRESS.md` is a historical dev log, not always current — treat it as background, not specification. When the live code disagrees with either, the code wins.
