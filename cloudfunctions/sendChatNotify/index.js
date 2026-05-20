const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const ADMIN_OPENID = process.env.ADMIN_OPENID || 'oHapF3TKIHD3JVk60hVXugsUpHGM'
const CHAT_TEMPLATE_ID = process.env.CHAT_TEMPLATE_ID || 'vHFVvCN3I76SvvyL2_hlsLjkACQNtoc9iTGwiTUrVdo'

exports.main = async (event, context) => {
  const { messagePreview, senderName } = event

  // 查询可用token
  const tokenRes = await db.collection('subscribe_tokens')
    .where({ openid: ADMIN_OPENID, templateId: CHAT_TEMPLATE_ID, used: false })
    .limit(1)
    .get()

  if (tokenRes.data.length === 0) {
    return { success: false, reason: 'no_token' }
  }

  const token = tokenRes.data[0]

  try {
    await cloud.openapi.subscribeMessage.send({
      touser: ADMIN_OPENID,
      templateId: CHAT_TEMPLATE_ID,
      page: 'pages/admin/admin-home/admin-home',
      data: {
        thing1: { value: (senderName || '新朋友').substring(0, 20) },
        thing2: { value: (messagePreview || '发来了一条消息').substring(0, 20) }
      }
    })

    await db.collection('subscribe_tokens').doc(token._id).update({
      data: { used: true, usedAt: db.serverDate() }
    })

    return { success: true }
  } catch (err) {
    console.error('sendChatNotify error', err)
    return { success: false, error: err.message }
  }
}
