const cartStore = require('../../utils/cart-store')

Component({
  properties: {
    item: { type: Object, value: {} }
  },

  data: {
    quantity: 0,
    note: '',
    previewing: false
  },

  lifetimes: {
    attached() {
      this._sync()
      this._unsubscribe = cartStore.subscribe(() => this._sync())
    },
    detached() {
      if (this._unsubscribe) this._unsubscribe()
    }
  },

  methods: {
    _sync() {
      const itemId = this.properties.item._id
      const quantity = cartStore.getQuantity(itemId)
      const cartItem = cartStore.getItems().find(i => i.itemId === itemId)
      this.setData({ quantity, note: cartItem ? cartItem.note : '' })
    },

    onPlus() {
      const { item } = this.properties
      cartStore.addItem({
        itemId: item._id,
        name: item.name,
        imageUrl: item.imageUrl,
        type: 'food'
      })
    },

    onMinus() {
      cartStore.removeItem(this.properties.item._id)
    },

    previewImg() {
      if (!this.properties.item.imageUrl) return
      this.setData({ previewing: true })
    },

    closePreview() {
      this.setData({ previewing: false })
    },

    _stopPropagation() {},

    editNote() {
      const itemId = this.properties.item._id
      const current = cartStore.getItems().find(i => i.itemId === itemId)
      this.triggerEvent('editnote', {
        itemId,
        name: this.properties.item.name,
        note: current ? current.note : ''
      })
    }
  }
})
