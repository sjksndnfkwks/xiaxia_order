const app = getApp()
const { col } = require('../../utils/cloud')
const { formatOrderTime } = require('../../utils/time')
const { ORDER_STATUS_TEXT } = require('../../utils/constants')

Page({
  data: {
    userInfo: {},
    isAdmin: false,
    orders: [],
    loadingOrders: true,
    statusText: ORDER_STATUS_TEXT
  },

  async onLoad() {
    await app.waitLogin()
    this.setData({
      userInfo: app.globalData.userInfo || {},
      isAdmin: app.globalData.isAdmin
    })
    this._loadOrders()
  },

  onShow() {
    this.setData({
      userInfo: app.globalData.userInfo || {},
      isAdmin: app.globalData.isAdmin
    })
  },

  async _loadOrders() {
    const openid = app.globalData.openid
    if (!openid) { this.setData({ loadingOrders: false }); return }
    try {
      const res = await col('orders')
        .where({ userId: openid })
        .orderBy('createdAt', 'desc')
        .limit(30)
        .get()
      const orders = res.data.map(o => ({
        ...o,
        createdAtStr: o.createdAt ? formatOrderTime(o.createdAt) : ''
      }))
      this.setData({ orders, loadingOrders: false })
    } catch (e) {
      console.error('load orders error', e)
      this.setData({ loadingOrders: false })
    }
  },

  async updateProfile() {
    try {
      const res = await new Promise((resolve, reject) => {
        wx.getUserProfile({ desc: '用于显示你的头像和昵称', success: resolve, fail: reject })
      })
      const { nickName, avatarUrl } = res.userInfo
      app.globalData.userInfo = { ...app.globalData.userInfo, nickName, avatarUrl }
      this.setData({ userInfo: app.globalData.userInfo })

      const db = wx.cloud.database()
      const openid = app.globalData.openid
      db.collection('users').where({ openid }).update({ data: { nickName, avatarUrl } })
    } catch (e) {
      // 用户取消
    }
  },

  goOrderDetail(e) {
    wx.navigateTo({ url: `/pages/order-detail/order-detail?id=${e.currentTarget.dataset.id}` })
  },

  goChat() {
    wx.switchTab({ url: '/pages/chat/chat' })
  },

  goAdmin() {
    wx.navigateTo({ url: '/pages/admin/admin-home/admin-home' })
  }
})
