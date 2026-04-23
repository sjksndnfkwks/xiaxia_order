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
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3, hidden: false })
    }
    this.setData({
      userInfo: app.globalData.userInfo || {},
      isAdmin: app.globalData.isAdmin
    })
    if (app.globalData.openid) {
      this._loadOrders()
    }
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

  onChooseAvatar(e) {
    const avatarUrl = e.detail.avatarUrl
    const userInfo = { ...app.globalData.userInfo, avatarUrl }
    app.globalData.userInfo = userInfo
    this.setData({ userInfo })
    this._saveUserField({ avatarUrl })
  },

  onNicknameBlur(e) {
    const nickName = (e.detail.value || '').trim()
    if (!nickName) return
    const userInfo = { ...app.globalData.userInfo, nickName }
    app.globalData.userInfo = userInfo
    this.setData({ userInfo })
    this._saveUserField({ nickName })
  },

  _saveUserField(fields) {
    const docId = app.globalData.userInfo?._id
    if (!docId) return
    wx.cloud.database().collection('users').doc(docId).update({ data: fields })
      .catch(err => console.error('保存用户信息失败', err))
  },

  goOrderDetail(e) {
    wx.navigateTo({ url: `/pages/order-detail/order-detail?id=${e.currentTarget.dataset.id}` })
  },

  goChat() {
    wx.switchTab({ url: '/pages/chat/chat' })
  },

  goWishlist() {
    wx.navigateTo({ url: '/pages/wishlist/wishlist' })
  },

  goAnnouncements() {
    wx.navigateTo({ url: '/pages/announcements/announcements' })
  },

  goAdmin() {
    wx.navigateTo({ url: '/pages/admin/admin-home/admin-home' })
  }
})
