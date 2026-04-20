const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const ADMIN_OPENID = process.env.ADMIN_OPENID || 'oHapF3TKIHD3JVk60hVXugsUpHGM'
// 在微信公众平台申请的订单通知模板ID
const ORDER_TEMPLATE_ID = process.env.ORDER_TEMPLATE_ID || 'YOUR_ORDER_TEMPLATE_ID'

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { orderNo, totalCount, overallNote } = event

  // 1. 查询管理员是否有可用的subscribe token
  const tokenRes = await db.collection('subscribe_tokens')
    .where({ openid: ADMIN_OPENID, templateId: ORDER_TEMPLATE_ID, used: false })
    .limit(1)
    .get()

  if (tokenRes.data.length === 0) {
    console.warn('No available subscribe token for admin')
    // 没有token也正常返回，不影响下单流程
    return { success: false, reason: 'no_token' }
  }

  const token = tokenRes.data[0]

  try {
    // 2. 发送订阅消息
    // 注意：data字段的key需要与你申请的模板字段完全一致
    await cloud.openapi.subscribeMessage.send({
      touser: ADMIN_OPENID,
      templateId: ORDER_TEMPLATE_ID,
      page: 'pages/admin/admin-orders/admin-orders',
      data: {
        thing1: { value: orderNo.substring(0, 20) },
        number2: { value: String(totalCount) },
        thing3: { value: (overallNote || '无备注').substring(0, 20) }
      }
    })

    // 3. 标记token已使用
    await db.collection('subscribe_tokens').doc(token._id).update({
      data: { used: true, usedAt: db.serverDate() }
    })

    return { success: true }
  } catch (err) {
    console.error('sendOrderNotify error', err)
    return { success: false, error: err.message }
  }
}
