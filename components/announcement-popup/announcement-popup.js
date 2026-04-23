Component({
  properties: {
    show: { type: Boolean, value: false },
    announcement: { type: Object, value: null }
  },
  data: { entered: false },
  observers: {
    'show': function(show) {
      if (show) setTimeout(() => this.setData({ entered: true }), 50)
      else this.setData({ entered: false })
    }
  },
  methods: {
    onClose() {
      const a = this.properties.announcement
      if (a && a._id) {
        wx.setStorageSync('annShown_' + a._id, true)
      }
      this.setData({ entered: false })
      setTimeout(() => this.triggerEvent('close'), 300)
    },
    noop() {},
    previewImg() {
      const url = this.properties.announcement && this.properties.announcement.imageUrl
      if (url) wx.previewImage({ urls: [url], current: url })
    }
  }
})
