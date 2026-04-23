const app = getApp()
const { col, db } = require('../../../utils/cloud')
const { ORDER_TEMPLATE_ID, CHAT_TEMPLATE_ID } = require('../../../utils/constants')

Page({
  data: {
    pendingCount: 0,
    todayOrderCount: 0,
    unreadMsgCount: 0
  },

  async onLoad() {
    await app.waitLogin()
    // 服务端再次验证管理员身份
    if (!app.globalData.isAdmin) {
      wx.showToast({ title: '无权限', icon: 'none' })
      wx.navigateBack()
      return
    }
    this._loadStats()
  },

  onShow() {
    if (app.globalData.isAdmin) this._loadStats()
  },

  async _loadStats() {
    try {
      const _ = db.command
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const [pendingRes, todayRes, msgRes] = await Promise.all([
        col('orders').where({ status: 'pending' }).count(),
        col('orders').where({ createdAt: _.gte(today) }).count(),
        col('conversations').where({ unreadByAdmin: _.gt(0) }).get()
      ])

      const unreadMsgCount = msgRes.data.reduce((s, c) => s + (c.unreadByAdmin || 0), 0)
      this.setData({
        pendingCount: pendingRes.total,
        todayOrderCount: todayRes.total,
        unreadMsgCount
      })
    } catch (e) {
      console.error('load stats error', e)
    }
  },

  refreshSubscribe() {
    const tmplIds = [ORDER_TEMPLATE_ID, CHAT_TEMPLATE_ID].filter(id => id && !id.startsWith('YOUR_'))
    if (tmplIds.length === 0) {
      wx.showToast({ title: '请先配置模板ID', icon: 'none' })
      return
    }
    wx.requestSubscribeMessage({
      tmplIds,
      success: res => {
        const granted = tmplIds.filter(id => res[id] === 'accept').length
        wx.showToast({ title: `已授权 ${granted} 个模板`, icon: 'success' })
        // 存储token
        const openid = app.globalData.openid
        tmplIds.forEach(id => {
          if (res[id] === 'accept') {
            db.collection('subscribe_tokens').add({
              data: { openid, templateId: id, used: false, grantedAt: db.serverDate() }
            })
          }
        })
      }
    })
  },

  goCategories() { wx.navigateTo({ url: '/pages/admin/admin-categories/admin-categories' }) },
  goMenu() { wx.navigateTo({ url: '/pages/admin/admin-menu/admin-menu' }) },
  goOrders() { wx.navigateTo({ url: '/pages/admin/admin-orders/admin-orders' }) },
  goAnalytics() { wx.navigateTo({ url: '/pages/admin/admin-analytics/admin-analytics' }) },
  goAnniversaries() { wx.navigateTo({ url: '/pages/admin/admin-anniversaries/admin-anniversaries' }) },
  goAnnouncements() { wx.navigateTo({ url: '/pages/admin/admin-announcements/admin-announcements' }) },
  goChat() { wx.switchTab({ url: '/pages/chat/chat' }) }
})
