const app = getApp()
const { col, db, uploadFile } = require('../../../utils/cloud')

Page({
  data: {
    loading: true,
    anniversaries: [],
    showForm: false,
    editingId: null,
    dateType: 'yearly',      // 'yearly' | 'once'
    pickerDateFull: '',      // picker组件显示用（YYYY-MM-DD）
    form: {
      date: '',
      title: '',
      letterContent: '',
      flowerImageUrl: '',
      active: true
    }
  },

  async onLoad() {
    await app.waitLogin()
    if (!app.globalData.isAdmin) { wx.navigateBack(); return }
    this._load()
  },

  async _load() {
    this.setData({ loading: true })
    const res = await col('anniversaries').orderBy('createdAt', 'desc').get()
    this.setData({ anniversaries: res.data, loading: false })
  },

  addAnn() {
    this.setData({
      showForm: true,
      editingId: null,
      dateType: 'yearly',
      pickerDateFull: '',
      form: { date: '', title: '', letterTo: '', letterContent: '', letterFrom: '', flowerImageUrl: '', active: true }
    })
  },

  editAnn(e) {
    const item = e.currentTarget.dataset.item
    const isYearly = item.date.length === 5 // MM-DD
    this.setData({
      showForm: true,
      editingId: item._id,
      dateType: isYearly ? 'yearly' : 'once',
      pickerDateFull: isYearly ? `2000-${item.date}` : item.date,
      form: {
        date: item.date,
        title: item.title,
        letterTo: item.letterTo || '',
        letterContent: item.letterContent || '',
        letterFrom: item.letterFrom || '',
        flowerImageUrl: item.flowerImageUrl || '',
        active: item.active
      }
    })
  },

  closeForm() {
    this.setData({ showForm: false })
  },

  setDateType(e) {
    this.setData({ dateType: e.currentTarget.dataset.type, 'form.date': '' })
  },

  onMonthDayChange(e) {
    // picker返回YYYY-MM-DD，只取MM-DD部分
    const full = e.detail.value
    const mmdd = full.slice(5) // "MM-DD"
    this.setData({ pickerDateFull: full, 'form.date': mmdd })
  },

  onFullDateChange(e) {
    this.setData({ pickerDateFull: e.detail.value, 'form.date': e.detail.value })
  },

  onInput(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ [`form.${key}`]: e.detail.value })
  },

  async uploadImg() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: async res => {
        const path = res.tempFiles[0].tempFilePath
        wx.showLoading({ title: '上传中...' })
        try {
          const fileID = await uploadFile(path, 'anniversaries')
          this.setData({ 'form.flowerImageUrl': fileID })
        } finally {
          wx.hideLoading()
        }
      }
    })
  },

  async saveAnn() {
    const { form, editingId } = this.data
    if (!form.date) { wx.showToast({ title: '请选择日期', icon: 'none' }); return }
    if (!form.title.trim()) { wx.showToast({ title: '请填写标题', icon: 'none' }); return }

    const data = {
      date: form.date,
      title: form.title.trim(),
      letterTo: form.letterTo.trim(),
      letterContent: form.letterContent.trim(),
      letterFrom: form.letterFrom.trim(),
      flowerImageUrl: form.flowerImageUrl,
      active: true,
      updatedAt: db.serverDate()
    }

    wx.showLoading({ title: '保存中...' })
    try {
      if (editingId) {
        await col('anniversaries').doc(editingId).update({ data })
      } else {
        await col('anniversaries').add({ data: { ...data, createdAt: db.serverDate() } })
      }
      this.setData({ showForm: false })
      this._load()
    } catch (e) {
      wx.showToast({ title: '保存失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  async toggleActive(e) {
    const { id, val } = e.currentTarget.dataset
    await col('anniversaries').doc(id).update({ data: { active: !val } })
    this._load()
  },

  async deleteAnn(e) {
    const { id } = e.currentTarget.dataset
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复',
      success: async res => {
        if (!res.confirm) return
        await col('anniversaries').doc(id).remove()
        this._load()
      }
    })
  }
})
