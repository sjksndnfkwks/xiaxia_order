const cartStore = require('../../utils/cart-store')

Component({
  data: {
    totalCount: 0,
    foodCount: 0,
    snackCount: 0
  },

  lifetimes: {
    attached() {
      this._updateFromStore()
      // 订阅购物车变化
      this._unsubscribe = cartStore.subscribe(() => {
        this._updateFromStore()
      })
    },
    detached() {
      if (this._unsubscribe) this._unsubscribe()
    }
  },

  methods: {
    _updateFromStore() {
      const summary = cartStore.getSummary()
      this.setData(summary)
    },

    goCart() {
      wx.navigateTo({ url: '/pages/cart/cart' })
    }
  }
})
