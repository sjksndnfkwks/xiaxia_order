const app = getApp()
const { col, db, _ } = require('../../utils/cloud')
const { requireLogin } = require('../../utils/auth-guard')

Page({
  data: {
    loading: true,
    items: [],
    categories: [],
    categoryNames: [],
    isAdmin: false,

    showForm: false,
    mode: 'addItem',   // addItem / itemView / editItem / addWant / editWant
    formTitle: '添加想吃的',
    editingId: null,
    canEditItem: false,
    canDelete: false,
    form: { name: '', categoryIndex: 0, level: '' }
  },

  async onLoad() {
    await app.waitLogin()
    this.setData({ isAdmin: app.globalData.isAdmin })
    await this._loadCategories()
    this._load()
  },

  async _loadCategories() {
    try {
      const res = await col('categories').orderBy('createdAt', 'asc').get()
      this.setData({
        categories: res.data,
        categoryNames: res.data.map(c => c.name)
      })
    } catch (e) { console.error(e) }
  },

  async _load() {
    this.setData({ loading: true })
    try {
      const res = await col('wishlist').limit(100).get()
      const myOpenid = app.globalData.openid
      const catMap = {}
      this.data.categories.forEach(c => { catMap[c._id] = c })

      const items = res.data.map(it => {
        const wants = Array.isArray(it.wants) ? it.wants : []
        const total = wants.reduce((s, w) => s + (Number(w.level) || 0), 0)
        const topWants = wants.slice(0, 3).map(w => ({ openid: w.openid, avatar: w.avatar || '' }))
        const extraCount = Math.max(0, wants.length - 3)
        const myWant = wants.find(w => w.openid === myOpenid)
        const cat = catMap[it.categoryId]
        return {
          ...it,
          totalLevel: total,
          topWants,
          extraCount,
          myLevel: myWant ? myWant.level : null,
          categoryName: cat ? cat.name : ''
        }
      })
      items.sort((a, b) => b.totalLevel - a.totalLevel)
      const max = items.reduce((m, it) => Math.max(m, it.totalLevel), 0) || 1
      items.forEach(it => { it.barPct = Math.min(100, Math.round(it.totalLevel / max * 100)) })

      this.setData({ items, loading: false })
    } catch (e) {
      console.error(e)
      this.setData({ loading: false })
    }
  },

  noop() {},

  // 新增条目
  async addItem() {
    if (!(await requireLogin('添加想吃清单需要登录后才能使用，是否立即登录？'))) return
    this.setData({
      showForm: true,
      mode: 'addItem',
      formTitle: '添加想吃的',
      editingId: null,
      canEditItem: false,
      canDelete: false,
      form: { name: '', categoryIndex: 0, level: '' }
    })
  },

  // 点击已有条目
  async openItem(e) {
    if (!(await requireLogin('给想吃清单打分需要登录后才能使用，是否立即登录？'))) return
    const item = e.currentTarget.dataset.item
    const myOpenid = app.globalData.openid
    const isCreator = item.creatorId === myOpenid
    const myLevel = item.myLevel !== null && item.myLevel !== undefined ? String(item.myLevel) : ''
    // 找分类索引
    const catIdx = this.data.categories.findIndex(c => c._id === item.categoryId)
    this.setData({
      showForm: true,
      mode: 'itemView',
      formTitle: isCreator ? '编辑' : (myLevel ? '更新想吃程度' : '加入清单'),
      editingId: item._id,
      canEditItem: isCreator,
      canDelete: isCreator,
      form: {
        name: item.name,
        categoryIndex: catIdx < 0 ? 0 : catIdx,
        level: myLevel
      },
      _currentItem: item
    })
  },

  switchToEditItem() {
    this.setData({ mode: 'editItem', formTitle: '编辑条目' })
  },

  onInput(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ [`form.${key}`]: e.detail.value })
  },

  onCategoryChange(e) {
    this.setData({ 'form.categoryIndex': Number(e.detail.value) })
  },

  closeForm() {
    this.setData({ showForm: false })
  },

  async saveItem() {
    const { form, mode, editingId, categories } = this.data
    const myOpenid = app.globalData.openid
    const userInfo = app.globalData.userInfo || {}
    const categoryId = categories[form.categoryIndex] ? categories[form.categoryIndex]._id : ''

    const level = Number(form.level)
    if (!form.level || isNaN(level) || level < 0) {
      wx.showToast({ title: '请输入有效数字', icon: 'none' }); return
    }

    wx.showLoading({ title: '保存中...' })
    try {
      if (mode === 'addItem') {
        const name = form.name.trim()
        if (!name) { wx.hideLoading(); wx.showToast({ title: '请填写名称', icon: 'none' }); return }
        await col('wishlist').add({
          data: {
            name,
            categoryId,
            creatorId: myOpenid,
            creatorName: userInfo.nickName || '',
            creatorAvatar: userInfo.avatarUrl || '',
            wants: [{
              openid: myOpenid,
              nickname: userInfo.nickName || '',
              avatar: userInfo.avatarUrl || '',
              level,
              updatedAt: new Date()
            }],
            createdAt: db.serverDate(),
            updatedAt: db.serverDate()
          }
        })
      } else if (mode === 'editItem') {
        const name = form.name.trim()
        if (!name) { wx.hideLoading(); wx.showToast({ title: '请填写名称', icon: 'none' }); return }
        // 更新名称和分类，同时更新自己的 want
        const itemRes = await col('wishlist').doc(editingId).get()
        const wants = Array.isArray(itemRes.data.wants) ? itemRes.data.wants : []
        const idx = wants.findIndex(w => w.openid === myOpenid)
        const myWant = {
          openid: myOpenid, nickname: userInfo.nickName || '',
          avatar: userInfo.avatarUrl || '', level, updatedAt: new Date()
        }
        if (idx >= 0) wants[idx] = myWant
        else wants.push(myWant)
        await col('wishlist').doc(editingId).update({
          data: { name, categoryId, wants, updatedAt: db.serverDate() }
        })
      } else {
        // itemView: 添加/更新自己的 want
        const itemRes = await col('wishlist').doc(editingId).get()
        const wants = Array.isArray(itemRes.data.wants) ? itemRes.data.wants : []
        const idx = wants.findIndex(w => w.openid === myOpenid)
        const myWant = {
          openid: myOpenid, nickname: userInfo.nickName || '',
          avatar: userInfo.avatarUrl || '', level, updatedAt: new Date()
        }
        if (idx >= 0) wants[idx] = myWant
        else wants.push(myWant)
        await col('wishlist').doc(editingId).update({
          data: { wants, updatedAt: db.serverDate() }
        })
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

  deleteItem() {
    const id = this.data.editingId
    if (!id) return
    wx.showModal({
      title: '删除',
      content: '确认删除这条想吃的？（仅创建者可删）',
      success: async res => {
        if (!res.confirm) return
        try {
          await col('wishlist').doc(id).remove()
          this.setData({ showForm: false })
          this._load()
        } catch (e) {
          wx.showToast({ title: '删除失败，可能无权限', icon: 'none' })
        }
      }
    })
  },

  async promoteToMenu() {
    if (!this.data.isAdmin) return
    const item = this.data._currentItem
    if (!item) return
    const categories = this.data.categories
    const cat = categories.find(c => c._id === item.categoryId)
    wx.showModal({
      title: '加到菜单',
      content: `将「${item.name}」加为${cat ? cat.type === 'snack' ? '零食' : '菜品' : '菜品'}，分类：${cat ? cat.name : '无'}`,
      success: async res => {
        if (!res.confirm) return
        try {
          await col('items').add({
            data: {
              name: item.name,
              description: '',
              imageUrl: '',
              categoryId: item.categoryId || '',
              type: cat ? cat.type : 'food',
              available: true,
              sort: 0,
              soldCount: 0,
              createdAt: db.serverDate()
            }
          })
          wx.showToast({ title: '已加到菜单', icon: 'success' })
          this.setData({ showForm: false })
        } catch (e) {
          console.error(e)
          wx.showToast({ title: '添加失败', icon: 'none' })
        }
      }
    })
  }
})
