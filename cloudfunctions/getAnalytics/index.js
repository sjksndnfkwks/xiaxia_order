const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const $ = db.command.aggregate

const ADMIN_OPENID = 'oHapF3TKIHD3JVk60hVXugsUpHGM'

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  if (OPENID !== ADMIN_OPENID) {
    return { success: false, error: 'unauthorized' }
  }

  try {
    // 统计菜品排行
    const foodRanking = await db.collection('orders')
      .aggregate()
      .match({ status: db.command.neq('cancelled') })
      .unwind('$foodItems')
      .group({
        _id: '$foodItems.itemId',
        name: $.first('$foodItems.name'),
        imageUrl: $.first('$foodItems.imageUrl'),
        totalQty: $.sum('$foodItems.quantity')
      })
      .sort({ totalQty: -1 })
      .limit(20)
      .end()

    // 统计零食排行
    const snackRanking = await db.collection('orders')
      .aggregate()
      .match({ status: db.command.neq('cancelled') })
      .unwind('$snackItems')
      .group({
        _id: '$snackItems.itemId',
        name: $.first('$snackItems.name'),
        imageUrl: $.first('$snackItems.imageUrl'),
        totalQty: $.sum('$snackItems.quantity')
      })
      .sort({ totalQty: -1 })
      .limit(20)
      .end()

    return {
      success: true,
      foodRanking: foodRanking.list,
      snackRanking: snackRanking.list
    }
  } catch (err) {
    console.error('getAnalytics error', err)
    return { success: false, error: err.message }
  }
}
