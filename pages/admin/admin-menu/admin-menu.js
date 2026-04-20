const app = getApp()
const { col, db, uploadFile } = require('../../../utils/cloud')

Page({
  data: {
    activeTab: 'food',
    loading: true,
    items: [],
    categories: [],
    catNames: [],
    catIndex: 0,
    showForm: false,
    editingId: null,
    form: { name: '', description: '', imageUrl: '', categoryId: '', available: true }
  },

  async onLoad() {
    await app.waitLogin()
    if (!app.globalData.isAdmin) { wx.navigateBack(); return }
    this._loadAll()
  },

  async _loadAll() {
    this.setData({ loading: true })
    const { activeTab } = this.data
    const [itemRes, catRes] = await Promise.all([
      col('items').where({ type: activeTab }).orderBy('sort', 'asc').get(),
      col('categories').where({ type: activeTab }).orderBy('sort', 'asc').get()
    ])
    const categories = catRes.data
    this.setData({
      items: itemRes.data,
      categories,
      catNames: categories.map(c => `${c.icon} ${c.name}`),
      loading: false
    })
  },

  switchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab })
    this._loadAll()
  },

  addItem() {
    this.setData({
      showForm: true,
      editingId: null,
      form: { name: '', description: '', imageUrl: '', categoryId: '', available: true },
      catIndex: 0
    })
  },

  editItem(e) {
    const item = e.currentTarget.dataset.item
    const { categories } = this.data
    const catIndex = categories.findIndex(c => c._id === item.categoryId)
    this.setData({
      showForm: true,
      editingId: item._id,
      form: {
        name: item.name,
        description: item.description || '',
        imageUrl: item.imageUrl || '',
        categoryId: item.categoryId,
        available: item.available
      },
      catIndex: catIndex >= 0 ? catIndex : 0
    })
  },

  closeForm() {
    this.setData({ showForm: false })
  },

  onFormInput(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ [`form.${key}`]: e.detail.value })
  },

  onCatChange(e) {
    const idx = parseInt(e.detail.value)
    const cat = this.data.categories[idx]
    this.setData({ catIndex: idx, 'form.categoryId': cat ? cat._id : '' })
  },

  async uploadImg() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: async res => {
        const path = res.tempFiles[0].tempFilePath
        wx.showLoading({ title: '上传中...' })
        try {
          const fileID = await uploadFile(path, 'items')
          this.setData({ 'form.imageUrl': fileID })
        } finally {
          wx.hideLoading()
        }
      }
    })
  },

  async saveItem() {
    const { form, activeTab, editingId, categories, catIndex } = this.data
    if (!form.name.trim()) {
      wx.showToast({ title: '请填写名称', icon: 'none' }); return
    }
    const catId = form.categoryId || (categories[catIndex] ? categories[catIndex]._id : '')
    const data = {
      name: form.name.trim(),
      description: form.description.trim(),
      imageUrl: form.imageUrl,
      categoryId: catId,
      type: activeTab,
      available: true,
      updatedAt: db.serverDate()
    }
    wx.showLoading({ title: '保存中...' })
    try {
      if (editingId) {
        await col('items').doc(editingId).update({ data })
      } else {
        await col('items').add({ data: { ...data, sort: 99, soldCount: 0, createdAt: db.serverDate() } })
      }
      this.setData({ showForm: false })
      this._loadAll()
    } catch (e) {
      wx.showToast({ title: '保存失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  async toggleAvailable(e) {
    const { id, val } = e.currentTarget.dataset
    await col('items').doc(id).update({ data: { available: !val } })
    this._loadAll()
  },

  async deleteItem(e) {
    const { id } = e.currentTarget.dataset
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复',
      success: async res => {
        if (!res.confirm) return
        await col('items').doc(id).remove()
        this._loadAll()
      }
    })
  }
})
