const app = getApp()
const { col, db, uploadFile } = require('../../../utils/cloud')
const { formatDateFull } = require('../../../utils/time')

Page({
  data: {
    loading: true,
    list: [],
    showForm: false,
    editingId: null,
    form: { title: '', publishDate: '', imageUrl: '', content: '' }
  },

  async onLoad() {
    await app.waitLogin()
    if (!app.globalData.isAdmin) { wx.navigateBack(); return }
    this._load()
  },

  async _load() {
    this.setData({ loading: true })
    try {
      const res = await col('announcements').orderBy('publishDate', 'desc').limit(100).get()
      const list = res.data.map(a => ({
        ...a,
        preview: (a.content || '').slice(0, 40) + ((a.content || '').length > 40 ? '…' : '')
      }))
      this.setData({ list, loading: false })
    } catch (e) {
      console.error(e)
      this.setData({ loading: false })
    }
  },

  addItem() {
    this.setData({
      showForm: true, editingId: null,
      form: { title: '', publishDate: formatDateFull(new Date()), imageUrl: '', content: '' }
    })
  },

  editItem(e) {
    const item = e.currentTarget.dataset.item
    this.setData({
      showForm: true, editingId: item._id,
      form: {
        title: item.title, publishDate: item.publishDate,
        imageUrl: item.imageUrl || '', content: item.content || ''
      }
    })
  },

  closeForm() { this.setData({ showForm: false }) },

  onInput(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ [`form.${key}`]: e.detail.value })
  },

  onDateChange(e) {
    this.setData({ 'form.publishDate': e.detail.value })
  },

  uploadImg() {
    wx.chooseMedia({
      count: 1, mediaType: ['image'],
      success: async res => {
        const path = res.tempFiles[0].tempFilePath
        wx.showLoading({ title: '上传中...' })
        try {
          const fileID = await uploadFile(path, 'announcements')
          this.setData({ 'form.imageUrl': fileID })
        } finally { wx.hideLoading() }
      }
    })
  },

  async saveItem() {
    const { form, editingId } = this.data
    if (!form.title.trim()) { wx.showToast({ title: '请填写标题', icon: 'none' }); return }
    if (!form.publishDate) { wx.showToast({ title: '请选择发表日期', icon: 'none' }); return }
    if (!form.content.trim()) { wx.showToast({ title: '请填写内容', icon: 'none' }); return }

    const data = {
      title: form.title.trim(),
      publishDate: form.publishDate,
      imageUrl: form.imageUrl,
      content: form.content.trim(),
      updatedAt: db.serverDate()
    }

    wx.showLoading({ title: '保存中...' })
    try {
      if (editingId) {
        await col('announcements').doc(editingId).update({ data })
      } else {
        await col('announcements').add({ data: { ...data, createdAt: db.serverDate() } })
      }
      this.setData({ showForm: false })
      this._load()
    } catch (e) {
      console.error(e)
      wx.showToast({ title: '保存失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  deleteItem(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除公告',
      content: '确认删除？',
      success: async res => {
        if (!res.confirm) return
        try {
          await col('announcements').doc(id).remove()
          this._load()
        } catch (e) {
          wx.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    })
  }
})
