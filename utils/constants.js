// 云开发环境ID，在微信开发者工具-云开发控制台查看
const CLOUD_ENV = 'cloud1-d8g3zvekkc85a5d79'

// 订阅消息模板ID（在微信公众平台申请后填入）
const ORDER_TEMPLATE_ID = 'o5FygjH70JJ-atVo0quL7ttEcDF6ENZz_YbcNo27HNk'
const CHAT_TEMPLATE_ID = 'vHFVvCN3I76SvvyL2_hlsLjkACQNtoc9iTGwiTUrVdo'

// 订单状态
const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  DONE: 'done',
  CANCELLED: 'cancelled'
}

const ORDER_STATUS_TEXT = {
  pending: '已下单',
  confirmed: '已确认',
  done: '已完成',
  cancelled: '已取消'
}

const ORDER_STATUS_CLASS = {
  pending: 'status-pending',
  confirmed: 'status-confirmed',
  done: 'status-done',
  cancelled: 'status-cancelled'
}

// 消息类型
const MSG_TYPE = {
  TEXT: 'text',
  IMAGE: 'image',
  VIDEO: 'video',
  VOICE: 'voice',
  EMOJI: 'emoji'
}

// 常用表情（史迪仔风格 + 通用）
const EMOJI_LIST = [
  '😊', '😍', '🥰', '😘', '💕', '💙', '💝', '🎀',
  '😋', '🤤', '😄', '🥺', '😭', '🥹', '😅', '😂',
  '🍔', '🍜', '🍣', '🍰', '🧋', '🍟', '🍕', '🥗',
  '👏', '🙏', '💪', '🤗', '👍', '❤️', '🌸', '✨',
  '🐶', '🐱', '🐼', '🐨', '🦄', '🌈', '⭐', '🎉'
]

module.exports = {
  CLOUD_ENV,
  ORDER_TEMPLATE_ID,
  CHAT_TEMPLATE_ID,
  ORDER_STATUS,
  ORDER_STATUS_TEXT,
  ORDER_STATUS_CLASS,
  MSG_TYPE,
  EMOJI_LIST
}
