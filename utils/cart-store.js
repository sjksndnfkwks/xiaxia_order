const CART_KEY = 'xiaxia_cart'

// 购物车状态存储在模块内部，不依赖 getApp()
let _items = []
const _listeners = []

function subscribe(fn) {
  _listeners.push(fn)
  return () => {
    const idx = _listeners.indexOf(fn)
    if (idx > -1) _listeners.splice(idx, 1)
  }
}

function _notify() {
  _listeners.forEach(fn => fn(_items))
}

function getItems() {
  return _items
}

function getSummary() {
  const foodCount = _items.filter(i => i.type === 'food').reduce((s, i) => s + i.quantity, 0)
  const snackCount = _items.filter(i => i.type === 'snack').reduce((s, i) => s + i.quantity, 0)
  return { foodCount, snackCount, totalCount: foodCount + snackCount }
}

function addItem(item) {
  const idx = _items.findIndex(i => i.itemId === item.itemId)
  if (idx > -1) {
    _items[idx].quantity += 1
  } else {
    _items.push({ ...item, quantity: 1, note: '' })
  }
  _save()
}

function removeItem(itemId) {
  const idx = _items.findIndex(i => i.itemId === itemId)
  if (idx === -1) return
  _items[idx].quantity -= 1
  if (_items[idx].quantity <= 0) _items.splice(idx, 1)
  _save()
}

function setNote(itemId, note) {
  const idx = _items.findIndex(i => i.itemId === itemId)
  if (idx > -1) {
    _items[idx].note = note
    _save()
  }
}

function getQuantity(itemId) {
  const item = _items.find(i => i.itemId === itemId)
  return item ? item.quantity : 0
}

function clear() {
  _items = []
  _save()
}

function restore() {
  try {
    _items = wx.getStorageSync(CART_KEY) || []
  } catch (e) {
    _items = []
  }
}

function _save() {
  try { wx.setStorageSync(CART_KEY, _items) } catch (e) {}
  _notify()
}

module.exports = { subscribe, getItems, getSummary, addItem, removeItem, setNote, getQuantity, clear, restore }
