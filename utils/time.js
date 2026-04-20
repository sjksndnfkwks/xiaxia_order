/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatDateFull(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * 格式化日期为 MM-DD（用于每年重复的纪念日匹配）
 */
function formatDateMMDD(date) {
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${m}-${d}`
}

/**
 * 格式化时间为 HH:mm
 */
function formatTime(date) {
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

/**
 * 格式化时间戳为聊天显示时间
 * 今天显示 HH:mm，昨天显示"昨天 HH:mm"，更早显示 MM/DD HH:mm
 */
function formatChatTime(dateOrStr) {
  const date = dateOrStr instanceof Date ? dateOrStr : new Date(dateOrStr)
  const now = new Date()
  const todayStr = formatDateFull(now)
  const dateStr = formatDateFull(date)
  const timeStr = formatTime(date)

  if (dateStr === todayStr) return timeStr

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (dateStr === formatDateFull(yesterday)) return `昨天 ${timeStr}`

  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${m}/${d} ${timeStr}`
}

/**
 * 格式化订单时间：YYYY年MM月DD日 HH:mm
 */
function formatOrderTime(dateOrStr) {
  const date = dateOrStr instanceof Date ? dateOrStr : new Date(dateOrStr)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')
  return `${y}年${m}月${d}日 ${h}:${mi}`
}

/**
 * 生成订单号：XO + YYYYMMDD + 3位随机数
 */
function genOrderNo() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const r = String(Math.floor(Math.random() * 1000)).padStart(3, '0')
  return `XO${y}${m}${d}${r}`
}

/**
 * 检查纪念日：today是否匹配anniversaries列表中某条记录
 * date字段格式支持 "MM-DD"（每年重复）或 "YYYY-MM-DD"（特定日期）
 */
function findTodayAnniversary(anniversaries) {
  const today = new Date()
  const todayFull = formatDateFull(today)
  const todayMMDD = formatDateMMDD(today)
  return anniversaries.find(a => a.active && (a.date === todayMMDD || a.date === todayFull)) || null
}

/**
 * 纪念日去重key：今天只弹一次
 */
function getAnniversaryShownKey(date) {
  return `anniversaryShown_${date}`
}

module.exports = {
  formatDateFull,
  formatDateMMDD,
  formatTime,
  formatChatTime,
  formatOrderTime,
  genOrderNo,
  findTodayAnniversary,
  getAnniversaryShownKey
}
