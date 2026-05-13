const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const ADMIN_OPENID = 'oHapF3TKIHD3JVk60hVXugsUpHGM'

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()

  // 云端测试时 OPENID 为空，直接返回
  if (!OPENID) {
    return { openid: '', isAdmin: false, userInfo: null, error: 'no openid (test env)' }
  }

  const isAdmin = ADMIN_OPENID !== '' && OPENID === ADMIN_OPENID
  const now = db.serverDate()

  try {
    const res = await db.collection('users').where({ openid: OPENID }).get()

    let userInfo
    if (res.data.length === 0) {
      await db.collection('users').add({
        data: {
          _openid: OPENID,
          openid: OPENID,
          nickName: '',
          avatarUrl: '',
          isAdmin,
          createdAt: now,
          lastActiveAt: now
        }
      })
      userInfo = { openid: OPENID, nickName: '', avatarUrl: '', isAdmin }
    } else {
      userInfo = res.data[0]
      const patch = { lastActiveAt: now, isAdmin }
      if (!userInfo._openid) patch._openid = OPENID
      await db.collection('users').doc(userInfo._id).update({ data: patch })
    }

    return { openid: OPENID, isAdmin, userInfo }
  } catch (err) {
    console.error('login error', err)
    return { openid: OPENID, isAdmin: false, userInfo: null, error: err.message }
  }
}
