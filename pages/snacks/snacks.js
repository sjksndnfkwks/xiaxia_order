const app = getApp()
const { col } = require('../../utils/cloud')

Page({
  data: {
    loading: true,
    categories: [],
    allItems: [],
    filteredItems: [],
    activeCat: '',
    notePopup: { show: false, itemId: '', itemName: '', note: '' }
  },

  async onLoad() {
    await app.waitLogin()
    this._loadData()
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1, hidden: false })
    }
  },

  async _loadData() {
    try {
      const [catRes, itemRes] = await Promise.all([
        col('categories').where({ type: 'snack' }).orderBy('createdAt', 'asc').get(),
        col('items').where({ type: 'snack', available: true }).orderBy('sort', 'asc').get()
      ])
      const categories = catRes.data
      const allItems = itemRes.data
      this.setData({ categories, allItems, filteredItems: allItems, loading: false })
    } catch (e) {
      console.error('load snacks error', e)
      wx.showToast({ title: '加载失败: ' + (e.message || e.errMsg || '未知错误'), icon: 'none', duration: 4000 })
      this.setData({ loading: false })
    }
  },

  filterByCategory(e) {
    const id = e.currentTarget.dataset.id
    const { allItems } = this.data
    const filteredItems = id ? allItems.filter(i => i.categoryId === id) : allItems
    this.setData({ activeCat: id, filteredItems })
  },

  onEditNote(e) {
    const { itemId, name, note } = e.detail
    this.setData({ notePopup: { show: true, itemId, itemName: name, note } })
  },

  onNoteClose() {
    this.setData({ 'notePopup.show': false })
  }
})
