const app = getApp()
const { callFn } = require('../../../utils/cloud')

Page({
  data: {
    loading: true,
    foodRanking: [],
    snackRanking: []
  },

  async onLoad() {
    await app.waitLogin()
    if (!app.globalData.isAdmin) { wx.navigateBack(); return }
    this._load()
  },

  async _load() {
    try {
      const res = await callFn('getAnalytics', {})
      if (!res.success) throw new Error(res.error)

      const addPct = (list) => {
        const max = list[0]?.totalQty || 1
        return list.map(item => ({ ...item, pct: Math.round((item.totalQty / max) * 100) }))
      }

      this.setData({
        foodRanking: addPct(res.foodRanking || []),
        snackRanking: addPct(res.snackRanking || []),
        loading: false
      })
    } catch (e) {
      console.error('analytics error', e)
      this.setData({ loading: false })
    }
  }
})
