const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const ADMIN_OPENID = process.env.ADMIN_OPENID || 'oHapF3TKIHD3JVk60hVXugsUpHGM'
// 在微信公众平台申请的订单通知模板ID（订单受理通知）
const ORDER_TEMPLATE_ID = process.env.ORDER_TEMPLATE_ID || 'o5FygjH70JJ-atVo0quL7ttEcDF6ENZz_YbcNo27HNk'

// 北京时间 YYYY-MM-DD HH:mm:ss
function beijingNow() {
  const d = new Date(Date.now() + 8 * 3600 * 1000)
  const p = n => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { orderNo, content, overallNote } = event

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
    // 字段编号对应「订单受理通知」模板：
    // character_string1=订单号 thing3=订单内容 time4=下单时间 thing5=备注
    await cloud.openapi.subscribeMessage.send({
      touser: ADMIN_OPENID,
      templateId: ORDER_TEMPLATE_ID,
      page: 'pages/admin/admin-orders/admin-orders',
      data: {
        character_string1: { value: String(orderNo || '').substring(0, 32) },
        thing3: { value: (content || '若干').substring(0, 20) },
        time4: { value: beijingNow() },
        thing5: { value: (overallNote || '无').substring(0, 20) }
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
