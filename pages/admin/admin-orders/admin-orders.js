const app = getApp()
const { callFn } = require('../../../utils/cloud')
const { formatOrderTime } = require('../../../utils/time')
const { ORDER_STATUS_TEXT } = require('../../../utils/constants')

Page({
  data: {
    loading: true,
    orders: [],
    activeFilter: '',
    expandedId: null,
    statusText: ORDER_STATUS_TEXT,
    filters: [
      { val: '', label: '全部' },
      { val: 'done', label: '已完成' },
      { val: 'confirmed', label: '已确认' },
      { val: 'cancelled', label: '已取消' }
    ]
  },

  async onLoad() {
    await app.waitLogin()
    if (!app.globalData.isAdmin) { wx.navigateBack(); return }
    this._loadOrders()
  },

  onShow() {
    if (app.globalData.isAdmin) this._loadOrders()
  },

  async _loadOrders() {
    this.setData({ loading: true })
    const { activeFilter } = this.data
    try {
      const res = await callFn('adminOrders', { action: 'list', status: activeFilter })
      const list = (res && res.orders) || []
      const orders = list.map(o => ({
        ...o,
        createdAtStr: o.createdAt ? formatOrderTime(o.createdAt) : ''
      }))
      this.setData({ orders, loading: false })
    } catch (e) {
      console.error(e)
      this.setData({ loading: false })
    }
  },

  setFilter(e) {
    const val = e.currentTarget.dataset.val
    this.setData({ activeFilter: val, expandedId: null })
    this._loadOrders()
  },

  toggleExpand(e) {
    const id = e.currentTarget.dataset.id
    this.setData({ expandedId: this.data.expandedId === id ? null : id })
  },

  async _updateStatus(id, status) {
    await callFn('adminOrders', { action: 'updateStatus', orderId: id, newStatus: status })
    this._loadOrders()
  },

  confirmOrder(e) { this._updateStatus(e.currentTarget.dataset.id, 'confirmed') },
  doneOrder(e) { this._updateStatus(e.currentTarget.dataset.id, 'done') },

  cancelOrder(e) {
    wx.showModal({
      title: '确认取消',
      content: '确定要取消这个订单吗？',
      success: res => {
        if (res.confirm) this._updateStatus(e.currentTarget.dataset.id, 'cancelled')
      }
    })
  }
})
