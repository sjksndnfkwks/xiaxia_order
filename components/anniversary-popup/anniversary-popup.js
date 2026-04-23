const { getAnniversaryShownKey } = require('../../utils/time')

Component({
  properties: {
    show: { type: Boolean, value: false },
    anniversary: { type: Object, value: null }
  },

  data: {
    entered: false,
    letterLines: []
  },

  observers: {
    'show': function(show) {
      if (show) {
        setTimeout(() => this.setData({ entered: true }), 50)
        const ann = this.properties.anniversary
        if (ann && ann.letterContent) {
          this.setData({ letterLines: ann.letterContent.split('\n') })
        }
      } else {
        this.setData({ entered: false })
      }
    }
  },

  methods: {
    onClose() {
      const ann = this.properties.anniversary
      if (ann) {
        wx.setStorageSync(getAnniversaryShownKey(ann.date), true)
      }
      this.setData({ entered: false })
      setTimeout(() => this.triggerEvent('close'), 400)
    },

    previewFlower() {
      const ann = this.properties.anniversary
      if (!ann || !ann.flowerImageUrl) return
      wx.previewImage({ urls: [ann.flowerImageUrl], current: ann.flowerImageUrl })
    }
  }
})
