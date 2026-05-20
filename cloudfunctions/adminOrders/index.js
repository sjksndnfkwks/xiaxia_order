const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const ADMIN_OPENID = 'oHapF3TKIHD3JVk60hVXugsUpHGM'

// 管理员订单管理：服务端运行，绕过数据库安全规则，可读/改所有用户的订单
// action: 'list' | 'stats' | 'updateStatus'
exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  if (OPENID !== ADMIN_OPENID) {
    return { success: false, reason: 'not_admin' }
  }

  const { action, status, orderId, newStatus } = event

  try {
    if (action === 'updateStatus') {
      if (!orderId || !newStatus) return { success: false, reason: 'bad_params' }
      await db.collection('orders').doc(orderId).update({
        data: { status: newStatus, adminSeen: true, updatedAt: db.serverDate() }
      })
      return { success: true }
    }

    if (action === 'stats') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const [todayRes, unseenRes] = await Promise.all([
        db.collection('orders').where({ createdAt: _.gte(today) }).count(),
        db.collection('orders').where({ adminSeen: _.neq(true) }).count()
      ])
      return { success: true, todayCount: todayRes.total, unseenCount: unseenRes.total }
    }

    // 默认 list：返回全部订单（可按状态过滤）
    let query = db.collection('orders')
    if (status) query = query.where({ status })
    const res = await query.orderBy('createdAt', 'desc').limit(100).get()
    return { success: true, orders: res.data }
  } catch (err) {
    console.error('adminOrders error', err)
    return { success: false, error: err.message }
  }
}
