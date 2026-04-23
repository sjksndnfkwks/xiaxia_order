const { col } = require('../../utils/cloud')
const { formatDateFull } = require('../../utils/time')

Page({
  data: { loading: true, list: [] },

  async onLoad() {
    this.setData({ loading: true })
    try {
      const res = await col('announcements').orderBy('publishDate', 'desc').limit(50).get()
      const list = res.data.map(a => ({
        ...a,
        publishDateStr: a.publishDate || (a.createdAt ? formatDateFull(new Date(a.createdAt.$date || a.createdAt)) : '')
      }))
      this.setData({ list, loading: false })
    } catch (e) {
      console.error(e)
      this.setData({ loading: false })
    }
  },

  previewImg(e) {
    const url = e.currentTarget.dataset.url
    if (url) wx.previewImage({ urls: [url], current: url })
  }
})
