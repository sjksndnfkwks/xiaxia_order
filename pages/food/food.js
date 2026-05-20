const app = getApp()
const { col } = require('../../utils/cloud')
const { getAnniversaryShownKey } = require('../../utils/time')

Page({
  data: {
    loading: true,
    categories: [],
    itemMap: {},
    displayItemMap: {},
    searchText: '',
    searchResultEmpty: false,
    activeCat: '',
    activeCatId: '',
    scrollTarget: '',

    // 备注弹窗
    notePopup: { show: false, itemId: '', itemName: '', note: '' },

    // 纪念日弹窗
    showAnniversary: false,
    todayAnniversary: null,

    // 公告弹窗
    showAnnouncement: false,
    todayAnnouncement: null
  },

  async onLoad() {
    await app.waitLogin()
    this._loadData()
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0, hidden: false })
    }
    // 检查是否有待显示的纪念日（每次进入首页时检查）
    const ann = app.globalData.todayAnniversary
    if (ann) {
      const key = getAnniversaryShownKey(ann.date)
      const shown = wx.getStorageSync(key)
      if (!shown) {
        this.setData({ showAnniversary: true, todayAnniversary: ann })
      }
    }
    // 公告
    const anb = app.globalData.todayAnnouncement
    if (anb) {
      const shownAnb = wx.getStorageSync('annShown_' + anb._id)
      if (!shownAnb && !this.data.showAnnouncement) {
        this.setData({ showAnnouncement: true, todayAnnouncement: anb })
      }
    }
  },

  onAnnouncementClose() {
    this.setData({ showAnnouncement: false })
  },

  async _loadData() {
    try {
      const [catRes, itemRes] = await Promise.all([
        col('categories').where({ type: 'food' }).orderBy('createdAt', 'asc').get(),
        col('items').where({ type: 'food', available: true }).orderBy('sort', 'asc').get()
      ])

      const categories = catRes.data
      const items = itemRes.data

      // 按分类分组
      const itemMap = {}
      categories.forEach(cat => { itemMap[cat._id] = [] })
      items.forEach(item => {
        if (itemMap[item.categoryId]) {
          itemMap[item.categoryId].push(item)
        }
      })

      const activeCat = categories.length > 0 ? categories[0]._id : ''
      this.setData({ categories, itemMap, displayItemMap: itemMap, activeCat, loading: false })

      // 缓存各section的位置（用于滚动同步）
      setTimeout(() => this._cacheSectionPositions(), 300)
    } catch (e) {
      console.error('load food data error', e)
      wx.showToast({ title: '加载失败: ' + (e.message || e.errMsg || '未知错误'), icon: 'none', duration: 4000 })
      this.setData({ loading: false })
    }
  },

  _sectionTops: [],

  _cacheSectionPositions() {
    const { categories } = this.data
    const ids = categories.map(cat => `#section-${cat._id}`)
    if (ids.length === 0) return

    const query = wx.createSelectorQuery()
    ids.forEach(id => query.select(id).boundingClientRect())
    query.exec(rects => {
      this._sectionTops = rects.map((r, i) => ({
        catId: categories[i]._id,
        top: r ? r.top : 0
      }))
    })
  },

  onFoodScroll(e) {
    // 点击索引触发的程序化滚动期间，不让滚动监听抢回高亮
    if (this._navLock) return
    const scrollTop = e.detail.scrollTop
    // 重新查询各section位置（相对于视口）
    const { categories } = this.data
    const query = wx.createSelectorQuery()
    categories.forEach(cat => query.select(`#section-${cat._id}`).boundingClientRect())
    query.exec(rects => {
      let activeCat = categories[0]?._id || ''
      for (let i = 0; i < rects.length; i++) {
        if (rects[i] && rects[i].top <= 80) {
          activeCat = categories[i]._id
        }
      }
      if (activeCat !== this.data.activeCat) {
        this.setData({ activeCat, activeCatId: `cat-nav-${activeCat}` })
      }
    })
  },

  scrollToCategory(e) {
    const id = e.currentTarget.dataset.id
    // 加锁：滚动动画期间屏蔽 onFoodScroll 的高亮重算，避免高亮被抢回旧分类
    this._navLock = true
    if (this._navLockTimer) clearTimeout(this._navLockTimer)
    this._navLockTimer = setTimeout(() => { this._navLock = false }, 500)
    this.setData({ activeCat: id, activeCatId: `cat-nav-${id}`, scrollTarget: `section-${id}` })
  },

  onSearch(e) {
    const text = (e.detail.value || '').trim()
    this.setData({ searchText: text })
    const { itemMap, categories } = this.data
    if (!text) {
      this.setData({ displayItemMap: itemMap, searchResultEmpty: false })
      return
    }
    const lower = text.toLowerCase()
    const filtered = {}
    let hasResult = false
    categories.forEach(cat => {
      filtered[cat._id] = (itemMap[cat._id] || []).filter(item =>
        item.name.toLowerCase().includes(lower) ||
        (item.description || '').toLowerCase().includes(lower)
      )
      if (filtered[cat._id].length > 0) hasResult = true
    })
    this.setData({ displayItemMap: filtered, searchResultEmpty: !hasResult })
  },

  onEditNote(e) {
    const { itemId, name, note } = e.detail
    this.setData({ notePopup: { show: true, itemId, itemName: name, note } })
  },

  onNoteClose() {
    this.setData({ 'notePopup.show': false })
  },

  onAnniversaryClose() {
    this.setData({ showAnniversary: false })
    // 清除globalData，避免再次触发
    app.globalData.todayAnniversary = null
  }
})
