const { CLOUD_ENV } = require('./utils/constants')
const cartStore = require('./utils/cart-store')
const { findTodayAnniversary, getAnniversaryShownKey } = require('./utils/time')

App({
  globalData: {
    openid: null,
    isAdmin: false,
    userInfo: null,
    todayAnniversary: null,
    todayAnnouncement: null,
    loginReady: false,
    loginCallbacks: []
  },

  onLaunch() {
    // 1. 初始化云开发
    wx.cloud.init({
      env: 'cloud1-d8g3zvekkc85a5d79',
      traceUser: true
    })

    // 2. 恢复购物车
    cartStore.restore()

    // 3. 执行登录，登录完成后检查纪念日
    this._doLogin()
  },

  _doLogin() {
    wx.cloud.callFunction({
      name: 'login',
      success: res => {
        const { openid, isAdmin, userInfo } = res.result
        this.globalData.openid = openid
        this.globalData.isAdmin = isAdmin
        this.globalData.userInfo = userInfo

        // 通知所有等待登录的页面
        this.globalData.loginReady = true
        this.globalData.loginCallbacks.forEach(cb => cb({ openid, isAdmin }))
        this.globalData.loginCallbacks = []

        // 检查今日纪念日
        this._checkAnniversary()
        // 检查最新公告
        this._checkAnnouncement()

        // 管理员自动请求订阅消息权限
        if (isAdmin) {
          this._requestAdminSubscribe()
        }
      },
      fail: err => {
        console.error('login cloud function failed', err)
        // 仍然通知回调，避免页面永久等待
        this.globalData.loginReady = true
        this.globalData.loginCallbacks.forEach(cb => cb({}))
        this.globalData.loginCallbacks = []
      }
    })
  },

  /**
   * 等待登录完成（页面onLoad时调用）
   */
  waitLogin() {
    return new Promise(resolve => {
      if (this.globalData.loginReady) {
        resolve({
          openid: this.globalData.openid,
          isAdmin: this.globalData.isAdmin
        })
      } else {
        this.globalData.loginCallbacks.push(resolve)
      }
    })
  },

  _checkAnniversary() {
    const db = wx.cloud.database()
    db.collection('anniversaries').where({ active: true }).get({
      success: res => {
        const match = findTodayAnniversary(res.data)
        if (!match) return

        const key = getAnniversaryShownKey(match.date)
        const shown = wx.getStorageSync(key)
        if (shown) return

        this.globalData.todayAnniversary = match

        // 通知当前 food 页（如果已经在显示）
        const pages = getCurrentPages()
        const foodPage = pages.find(p => p.route === 'pages/food/food')
        if (foodPage) {
          foodPage.setData({ showAnniversary: true, todayAnniversary: match })
        }
      }
    })
  },

  _checkAnnouncement() {
    const db = wx.cloud.database()
    db.collection('announcements').orderBy('publishDate', 'desc').limit(1).get({
      success: res => {
        const latest = res.data[0]
        if (!latest) return
        const shown = wx.getStorageSync('annShown_' + latest._id)
        if (shown) return
        this.globalData.todayAnnouncement = latest
        const pages = getCurrentPages()
        const foodPage = pages.find(p => p.route === 'pages/food/food')
        if (foodPage) {
          foodPage.setData({ showAnnouncement: true, todayAnnouncement: latest })
        }
      }
    })
  },

  _requestAdminSubscribe() {
    const { ORDER_TEMPLATE_ID, CHAT_TEMPLATE_ID } = require('./utils/constants')
    const tmplIds = [ORDER_TEMPLATE_ID, CHAT_TEMPLATE_ID].filter(id => id && id !== 'YOUR_ORDER_TEMPLATE_ID' && id !== 'YOUR_CHAT_TEMPLATE_ID')
    if (tmplIds.length === 0) return

    wx.requestSubscribeMessage({
      tmplIds,
      success: res => {
        // 将授权结果存入云数据库（供云函数sendOrderNotify使用）
        const db = wx.cloud.database()
        const openid = this.globalData.openid
        const tokens = []
        tmplIds.forEach(id => {
          if (res[id] === 'accept') {
            tokens.push({ openid, templateId: id, used: false, grantedAt: db.serverDate() })
          }
        })
        if (tokens.length > 0) {
          tokens.forEach(token => {
            db.collection('subscribe_tokens').add({ data: token })
          })
        }
      }
    })
  }
})
