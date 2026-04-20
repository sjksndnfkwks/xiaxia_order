const { getAnniversaryShownKey } = require('../../utils/time')

Component({
  properties: {
    show: { type: Boolean, value: false },
    anniversary: { type: Object, value: null }
  },

  data: {
    entered: false
  },

  observers: {
    'show': function(show) {
      if (show) {
        // 延迟一帧触发入场动画
        setTimeout(() => this.setData({ entered: true }), 50)
      } else {
        this.setData({ entered: false })
      }
    }
  },

  methods: {
    onClose() {
      const ann = this.properties.anniversary
      if (ann) {
        // 标记今天已弹过
        const key = getAnniversaryShownKey(ann.date)
        wx.setStorageSync(key, true)
      }
      this.setData({ entered: false })
      setTimeout(() => this.triggerEvent('close'), 400)
    },

    previewFlower() {
      const ann = this.properties.anniversary
      if (!ann || !ann.flowerImageUrl) return
      wx.previewImage({
        urls: [ann.flowerImageUrl],
        current: ann.flowerImageUrl
      })
    }
  }
})
