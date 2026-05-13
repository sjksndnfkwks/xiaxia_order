const cartStore = require('../../utils/cart-store')

Component({
  properties: {
    show: { type: Boolean, value: false },
    itemId: { type: String, value: '' },
    itemName: { type: String, value: '' },
    note: { type: String, value: '' }
  },

  data: {
    noteValue: ''
  },

  observers: {
    'note': function(note) {
      this.setData({ noteValue: note || '' })
    },
    'show': function(show) {
      const pages = getCurrentPages()
      const page = pages[pages.length - 1]
      if (!page || typeof page.getTabBar !== 'function') return
      const tb = page.getTabBar()
      if (tb) tb.setData({ hidden: !!show })
    }
  },

  methods: {
    onInput(e) {
      this.setData({ noteValue: e.detail.value })
    },

    onConfirm() {
      const { itemId, noteValue } = { ...this.properties, ...this.data }
      cartStore.setNote(itemId, noteValue)
      this.triggerEvent('close')
    },

    onCancel() {
      this.triggerEvent('close')
    },

    onMaskTap() {
      this.triggerEvent('close')
    }
  }
})
