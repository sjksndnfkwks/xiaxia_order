const app = getApp()

/**
 * 静默登录：调用login云函数获取openid和isAdmin
 * 结果存储在 app.globalData
 */
function login() {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'login',
      success: res => {
        const { openid, isAdmin, userInfo } = res.result
        app.globalData.openid = openid
        app.globalData.isAdmin = isAdmin
        app.globalData.userInfo = userInfo
        resolve({ openid, isAdmin, userInfo })
      },
      fail: err => {
        console.error('login failed', err)
        reject(err)
      }
    })
  })
}

/**
 * 获取用户头像昵称（需用户点击触发，使用 getUserProfile）
 */
function getUserProfile() {
  return new Promise((resolve, reject) => {
    wx.getUserProfile({
      desc: '用于展示你的头像和昵称',
      success: res => {
        const { nickName, avatarUrl } = res.userInfo
        const openid = app.globalData.openid
        // 更新数据库中的用户信息
        const db = wx.cloud.database()
        db.collection('users').where({ openid }).update({
          data: { nickName, avatarUrl }
        })
        app.globalData.userInfo = { ...app.globalData.userInfo, nickName, avatarUrl }
        resolve(res.userInfo)
      },
      fail: reject
    })
  })
}

/**
 * 检查当前用户是否为管理员（从globalData读取，已由云函数验证）
 */
function isAdmin() {
  return app.globalData.isAdmin === true
}

/**
 * 获取当前用户openid
 */
function getOpenid() {
  return app.globalData.openid
}

module.exports = { login, getUserProfile, isAdmin, getOpenid }
