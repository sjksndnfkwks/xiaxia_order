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

  deleteOrder(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    const target = this.data.orders.find(o => o._id === id)
    const wasActive = target && target.status !== 'cancelled'
    wx.showModal({
      title: '删除订单',
      content: wasActive ? '删除将同时取消该订单，确认吗？' : '确认删除该订单吗？',
      confirmText: '删除',
      confirmColor: '#E64545',
      success: res => {
        if (!res.confirm) return
        const db = wx.cloud.database()
        const pre = wasActive
          ? col('orders').doc(id).update({ data: { status: 'cancelled', updatedAt: db.serverDate() } })
          : Promise.resolve()
        pre
          .then(() => col('orders').doc(id).remove())
          .then(() => {
            const orders = this.data.orders.filter(o => o._id !== id)
            this.setData({ orders })
            wx.showToast({ title: wasActive ? '已取消并删除' : '已删除', icon: 'success' })
          })
          .catch(err => {
            console.error('删除订单失败', err)
            wx.showToast({ title: '删除失败', icon: 'none' })
          })
      }
    })
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
