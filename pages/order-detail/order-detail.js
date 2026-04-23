const { col } = require('../../utils/cloud')
const { formatOrderTime } = require('../../utils/time')
const { ORDER_STATUS_TEXT } = require('../../utils/constants')

Page({
  data: {
    loading: true,
    order: null,
    foodItems: [],
    snackItems: [],
    editNote: '',
    saving: false,
    statusText: ORDER_STATUS_TEXT
  },

  async onLoad(options) {
    const { id } = options
    if (!id) { wx.navigateBack(); return }
    try {
      const res = await col('orders').doc(id).get()
      const order = res.data
      order.createdAtStr = order.createdAt ? formatOrderTime(order.createdAt) : ''
      this.setData({
        order,
        foodItems: (order.foodItems || []).map(i => ({ ...i })),
        snackItems: (order.snackItems || []).map(i => ({ ...i })),
        editNote: order.overallNote || '',
        loading: false
      })
    } catch (e) {
      console.error('load order error', e)
      wx.showToast({ title: '加载失败', icon: 'none' })
      this.setData({ loading: false })
    }
  },

  onNoteInput(e) {
    this.setData({ editNote: e.detail.value })
  },

  plus(e) {
    const { type, index } = e.currentTarget.dataset
    const key = type === 'food' ? 'foodItems' : 'snackItems'
    const items = [...this.data[key]]
    items[index] = { ...items[index], quantity: items[index].quantity + 1 }
    this.setData({ [key]: items })
  },

  minus(e) {
    const { type, index } = e.currentTarget.dataset
    const key = type === 'food' ? 'foodItems' : 'snackItems'
    const items = [...this.data[key]]
    if (items[index].quantity <= 1) {
      wx.showModal({
        title: '移除商品',
        content: `确认移除「${items[index].name}」？`,
        success: res => {
          if (!res.confirm) return
          items.splice(index, 1)
          this.setData({ [key]: items })
        }
      })
    } else {
      items[index] = { ...items[index], quantity: items[index].quantity - 1 }
      this.setData({ [key]: items })
    }
  },

  async saveChanges() {
    if (this.data.saving) return
    const { foodItems, snackItems, editNote, order } = this.data
    if (foodItems.length === 0 && snackItems.length === 0) {
      wx.showToast({ title: '订单不能为空', icon: 'none' }); return
    }
    this.setData({ saving: true })
    try {
      const totalFoodCount = foodItems.reduce((s, i) => s + i.quantity, 0)
      const totalSnackCount = snackItems.reduce((s, i) => s + i.quantity, 0)
      await col('orders').doc(order._id).update({
        data: { foodItems, snackItems, totalFoodCount, totalSnackCount, overallNote: editNote.trim() }
      })
      wx.showToast({ title: '已保存', icon: 'success' })
    } catch (e) {
      wx.showToast({ title: '保存失败', icon: 'none' })
    } finally {
      this.setData({ saving: false })
    }
  },

  cancelOrder() {
    wx.showModal({
      title: '取消订单',
      content: '确认取消这个订单吗？',
      success: async res => {
        if (!res.confirm) return
        try {
          await col('orders').doc(this.data.order._id).update({ data: { status: 'cancelled' } })
          this.setData({ order: { ...this.data.order, status: 'cancelled' } })
          wx.showToast({ title: '订单已取消', icon: 'success' })
        } catch (e) {
          wx.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    })
  }
})
