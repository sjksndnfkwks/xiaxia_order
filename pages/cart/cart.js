const app = getApp()
const cartStore = require('../../utils/cart-store')
const { col, callFn } = require('../../utils/cloud')
const { genOrderNo } = require('../../utils/time')
const { ORDER_TEMPLATE_ID } = require('../../utils/constants')
const { requireLogin } = require('../../utils/auth-guard')

Page({
  data: {
    cartItems: [],
    foodItems: [],
    snackItems: [],
    foodCount: 0,
    snackCount: 0,
    totalCount: 0,
    overallNote: '',
    submitting: false,
    notePopup: { show: false, itemId: '', itemName: '', note: '' }
  },

  onLoad() {
    this._sync()
    this._unsubscribe = cartStore.subscribe(() => this._sync())
  },

  onUnload() {
    if (this._unsubscribe) this._unsubscribe()
  },

  _sync() {
    const items = cartStore.getItems()
    const foodItems = items.filter(i => i.type === 'food')
    const snackItems = items.filter(i => i.type === 'snack')
    const foodCount = foodItems.reduce((s, i) => s + i.quantity, 0)
    const snackCount = snackItems.reduce((s, i) => s + i.quantity, 0)
    this.setData({ cartItems: items, foodItems, snackItems, foodCount, snackCount, totalCount: foodCount + snackCount })
  },

  plus(e) {
    const item = e.currentTarget.dataset.item
    cartStore.addItem({ itemId: item.itemId, name: item.name, imageUrl: item.imageUrl, type: item.type })
  },

  minus(e) {
    cartStore.removeItem(e.currentTarget.dataset.id)
  },

  editNote(e) {
    const { id, name, note } = e.currentTarget.dataset
    this.setData({ notePopup: { show: true, itemId: id, itemName: name, note } })
  },

  onNoteClose() {
    this.setData({ 'notePopup.show': false })
    this._sync()
  },

  onOverallNoteInput(e) {
    this.setData({ overallNote: e.detail.value })
  },

  goFood() {
    wx.switchTab({ url: '/pages/food/food' })
  },

  async submitOrder() {
    if (this.data.submitting) return
    const { foodItems, snackItems, totalCount, overallNote } = this.data
    if (totalCount === 0) return

    if (!(await requireLogin('下单需要登录后才能使用，是否立即登录？'))) return

    // 请求订阅权限（必须在tap事件内调用）
    await this._requestSubscribe()

    this.setData({ submitting: true })

    try {
      const db = wx.cloud.database()
      const openid = app.globalData.openid
      const orderNo = genOrderNo()

      const ui = app.globalData.userInfo || {}
      const orderData = {
        orderNo,
        userId: openid,
        userNickName: ui.nickName || '',
        userAvatarUrl: ui.avatarUrl || '',
        status: 'done',
        overallNote: overallNote.trim(),
        foodItems: foodItems.map(i => ({
          itemId: i.itemId,
          name: i.name,
          imageUrl: i.imageUrl,
          quantity: i.quantity,
          note: i.note || ''
        })),
        snackItems: snackItems.map(i => ({
          itemId: i.itemId,
          name: i.name,
          imageUrl: i.imageUrl,
          quantity: i.quantity,
          note: i.note || ''
        })),
        totalFoodCount: foodItems.reduce((s, i) => s + i.quantity, 0),
        totalSnackCount: snackItems.reduce((s, i) => s + i.quantity, 0),
        adminSeen: false,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      }

      const res = await db.collection('orders').add({ data: orderData })
      const orderId = res._id

      // 更新菜品soldCount
      this._updateSoldCount(foodItems.concat(snackItems))

      // 推送通知给管理员
      callFn('sendOrderNotify', { orderNo, totalCount, overallNote: overallNote.trim() })
        .catch(e => console.warn('notify failed', e))

      // 清空购物车
      cartStore.clear()

      wx.showToast({ title: '下单成功！', icon: 'success', duration: 1500 })
      setTimeout(() => wx.switchTab({ url: '/pages/food/food' }), 1500)
    } catch (e) {
      console.error('submit order error', e)
      wx.showToast({ title: '下单失败，请重试', icon: 'none' })
      this.setData({ submitting: false })
    }
  },

  _requestSubscribe() {
    return new Promise(resolve => {
      const tmplIds = [ORDER_TEMPLATE_ID].filter(id => id && !id.startsWith('YOUR_'))
      if (tmplIds.length === 0) { resolve(); return }
      wx.requestSubscribeMessage({
        tmplIds,
        complete: () => resolve()
      })
    })
  },

  _updateSoldCount(items) {
    const db = wx.cloud.database()
    items.forEach(i => {
      db.collection('items').where({ _id: i.itemId }).update({
        data: { soldCount: db.command.inc(i.quantity) }
      }).catch(() => {})
    })
  }
})
