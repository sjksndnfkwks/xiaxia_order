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
    this._refreshState()
    if (app.globalData.openid) this._loadOrders()
    else this.setData({ loadingOrders: false })
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3, hidden: false })
    }
    this._refreshState()
    if (app.globalData.openid) this._loadOrders()
  },

  _refreshState() {
    this.setData({
      loggedIn: !!app.globalData.openid,
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
  },

  logout() {
    wx.showModal({
      title: '退出账号',
      content: '退出后订单仍保留在云端，重新用同一微信号登录后会自动恢复。',
      confirmText: '退出',
      confirmColor: '#E64545',
      success: res => {
        if (!res.confirm) return
        // 只清账号身份相关；保留购物车、弹窗已读等本地状态
        // （只对当前会话生效，下次启动会再自动登录回微信账号）
        wx.removeStorageSync('testLogin')
        app.globalData.openid = null
        app.globalData.isAdmin = false
        app.globalData.userInfo = null
        this.setData({ loggedIn: false, userInfo: {}, isAdmin: false, orders: [], loadingOrders: false })
        wx.showToast({ title: '已退出', icon: 'success' })
      }
    })
  },

  showLoginSheet() {
    // 连点 5 次解锁测试账号入口（重置间隔 1.5s）
    const now = Date.now()
    if (!this._tapAt || now - this._tapAt > 1500) this._tapCount = 0
    this._tapCount = (this._tapCount || 0) + 1
    this._tapAt = now
    const showTest = this._tapCount >= 5
    if (showTest) this._tapCount = 0

    const itemList = showTest ? ['用微信账号登录', '用测试账号登录'] : ['用微信账号登录']
    wx.showActionSheet({
      itemList,
      success: res => {
        if (res.tapIndex === 0) this.loginWechat()
        else if (res.tapIndex === 1 && showTest) this.loginTest()
      }
    })
  },

  loginWechat() {
    wx.showLoading({ title: '登录中', mask: true })
    app.relogin().then(() => {
      wx.hideLoading()
      this._refreshState()
      this._loadOrders()
      wx.showToast({ title: '登录成功', icon: 'success' })
    }).catch(() => {
      wx.hideLoading()
      wx.showToast({ title: '登录失败', icon: 'none' })
    })
  },

  loginTest() {
    wx.setStorageSync('testLogin', true)
    wx.removeStorageSync('needLogin')
    app.applyTestLogin()
    this._refreshState()
    this._loadOrders()
    wx.showToast({ title: '已切换到测试账号', icon: 'success' })
  }
})
