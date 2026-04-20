const app = getApp()
const { col, db } = require('../../../utils/cloud')

Page({
  data: {
    activeTab: 'food',
    loading: true,
    categories: [],
    showForm: false,
    editingId: null,
    form: { icon: '', name: '' }
  },

  async onLoad() {
    await app.waitLogin()
    if (!app.globalData.isAdmin) { wx.navigateBack(); return }
    this._load()
  },

  async _load() {
    this.setData({ loading: true })
    const res = await col('categories')
      .where({ type: this.data.activeTab })
      .orderBy('createdAt', 'asc')
      .get()
    this.setData({ categories: res.data, loading: false })
  },

  switchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab })
    this._load()
  },

  addCat() {
    this.setData({ showForm: true, editingId: null, form: { icon: '', name: '' } })
  },

  editCat(e) {
    const item = e.currentTarget.dataset.item
    this.setData({
      showForm: true,
      editingId: item._id,
      form: { icon: item.icon, name: item.name }
    })
  },

  closeForm() { this.setData({ showForm: false }) },

  onInput(e) {
    const key = e.currentTarget.dataset.key
    const val = e.detail.value
    this.setData({ [`form.${key}`]: val })
  },

  async saveCat() {
    const { form, editingId, activeTab } = this.data
    if (!form.name.trim()) { wx.showToast({ title: '请填写名称', icon: 'none' }); return }
    if (!form.icon.trim()) { wx.showToast({ title: '请填写图标', icon: 'none' }); return }

    const data = { name: form.name.trim(), icon: form.icon.trim(), type: activeTab }
    wx.showLoading({ title: '保存中...' })
    try {
      if (editingId) {
        await col('categories').doc(editingId).update({ data })
      } else {
        await col('categories').add({ data: { ...data, createdAt: db.serverDate() } })
      }
      this.setData({ showForm: false })
      this._load()
    } catch (e) {
      wx.showToast({ title: '保存失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  deleteCat(e) {
    const { id, name } = e.currentTarget.dataset
    wx.showModal({
      title: '确认删除',
      content: `删除「${name}」分类？该分类下的菜品不会被删除，但会失去分类归属。`,
      success: async res => {
        if (!res.confirm) return
        await col('categories').doc(id).remove()
        this._load()
      }
    })
  }
})
