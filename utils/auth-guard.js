// 统一登录拦截：未登录时弹窗询问是否登录，确认则触发微信登录
// 用法：if (!(await requireLogin())) return
function requireLogin(message) {
  const app = getApp()
  if (app.globalData.openid) return Promise.resolve(true)
  return new Promise(resolve => {
    wx.showModal({
      title: '需要登录',
      content: message || '该功能需要登录后才能使用，是否立即登录？',
      confirmText: '登录',
      success: res => {
        if (!res.confirm) { resolve(false); return }
        wx.showLoading({ title: '登录中', mask: true })
        app.relogin().then(() => {
          wx.hideLoading()
          resolve(!!app.globalData.openid)
        }).catch(() => {
          wx.hideLoading()
          wx.showToast({ title: '登录失败', icon: 'none' })
          resolve(false)
        })
      },
      fail: () => resolve(false)
    })
  })
}

module.exports = { requireLogin }
