const { col } = require('../../utils/cloud')
const { formatOrderTime } = require('../../utils/time')
const { ORDER_STATUS_TEXT } = require('../../utils/constants')

Page({
  data: {
    loading: true,
    order: null,
    statusText: ORDER_STATUS_TEXT
  },

  async onLoad(options) {
    const { id } = options
    if (!id) { wx.navigateBack(); return }
    try {
      const res = await col('orders').doc(id).get()
      const order = res.data
      order.createdAtStr = order.createdAt ? formatOrderTime(order.createdAt) : ''
      this.setData({ order, loading: false })
    } catch (e) {
      console.error('load order error', e)
      wx.showToast({ title: '加载失败', icon: 'none' })
      this.setData({ loading: false })
    }
  }
})
