const app = getApp()
const { db, uploadFile, callFn } = require('../../utils/cloud')
const { EMOJI_LIST } = require('../../utils/constants')

Page({
  data: {
    messages: [],
    myOpenid: '',
    myAvatar: '',
    adminAvatar: '/assets/images/stitch-banner.png',
    inputText: '',
    voiceMode: false,
    recording: false,
    showEmoji: false,
    showExtra: false,
    scrollId: 'msg-bottom',
    emojiList: EMOJI_LIST,
    quotingMsg: null,
    multiSelect: false,
    selectedIds: [],
    // 长按菜单
    menuShow: false,
    menuX: 0,
    menuY: 0,
    menuMsg: null,
    menuCanCopy: false,
    // 合并详情
    mergedDetail: null
  },

  _watcher: null,
  _recorder: null,
  _cancelled: false,

  async onLoad() {
    await app.waitLogin()
    const { openid, userInfo } = app.globalData
    this.setData({
      myOpenid: openid,
      myAvatar: userInfo?.avatarUrl || ''
    })
    this._startWatch()
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2, hidden: false })
    }
    const latestAvatar = app.globalData.userInfo?.avatarUrl || ''
    if (latestAvatar !== this.data.myAvatar) {
      this.setData({ myAvatar: latestAvatar })
    }
    if (!this._watcher && app.globalData.openid) {
      this._startWatch()
    }
  },

  onHide() {
    this._closeWatch()
  },

  onUnload() {
    this._closeWatch()
  },

  _startWatch() {
    const openid = app.globalData.openid
    const conversationId = `conv_${openid}`

    this._watcher = db.collection('messages')
      .where({ conversationId })
      .orderBy('createdAt', 'asc')
      .watch({
        onChange: snapshot => {
          const ids = this.data.selectedIds
          const msgs = this._processMessages(snapshot.docs).map(m => ({
            ...m, selected: ids.indexOf(m._id) !== -1
          }))
          this.setData({ messages: msgs }, () => {
            this.setData({ scrollId: 'msg-bottom' })
          })
        },
        onError: err => {
          console.error('watch error', err)
          setTimeout(() => this._startWatch(), 1000)
        }
      })
  },

  _extractTime(createdAt) {
    if (!createdAt) return 0
    if (createdAt instanceof Date) return createdAt.getTime()
    if (typeof createdAt === 'object' && createdAt.$date) return createdAt.$date
    const d = new Date(createdAt)
    return isNaN(d.getTime()) ? 0 : d.getTime()
  },

  // 给消息加 showTime 标记：首条或距前条 > 5 分钟时显示时间
  _processMessages(docs) {
    const { formatChatTime } = require('../../utils/time')
    const FIVE_MIN = 5 * 60 * 1000
    let prevTime = 0
    return docs.map((m, i) => {
      const t = this._extractTime(m.createdAt)
      const showTime = i === 0 || (t > 0 && t - prevTime > FIVE_MIN)
      if (t > 0) prevTime = t
      const processed = {
        ...m,
        showTime,
        timeLabel: showTime ? formatChatTime(m.createdAt) : ''
      }
      if (m.type === 'merged' && Array.isArray(m.mergedItems)) {
        processed.mergedPreview = m.mergedItems.slice(0, 3).map((it, idx) => ({ ...it, idx }))
      }
      return processed
    })
  },

  _closeWatch() {
    if (this._watcher) {
      this._watcher.close()
      this._watcher = null
    }
  },

  onInput(e) {
    this.setData({ inputText: e.detail.value, showEmoji: false, showExtra: false })
  },

  async _sendMsg(data) {
    const openid = app.globalData.openid
    const conversationId = `conv_${openid}`

    const msgData = {
      conversationId,
      senderId: openid,
      senderRole: app.globalData.isAdmin ? 'admin' : 'user',
      createdAt: db.serverDate(),
      recalled: false,
      ...data
    }

    await db.collection('messages').add({ data: msgData })

    const preview = data.type === 'text' ? data.content : `[${data.type}]`
    db.collection('conversations').doc(conversationId).set({
      data: {
        userId: openid,
        lastMessage: preview,
        lastMessageAt: db.serverDate(),
        unreadByAdmin: db.command.inc(1),
        createdAt: db.serverDate()
      }
    }).catch(() => {})

    if (!app.globalData.isAdmin) {
      callFn('sendChatNotify', {
        messagePreview: preview.substring(0, 20),
        senderName: app.globalData.userInfo?.nickName || '虾虾'
      }).catch(() => {})
    }
  },

  sendText() {
    const text = this.data.inputText.trim()
    if (!text) return
    const msgData = { type: 'text', content: text }
    if (this.data.quotingMsg) {
      msgData.quotedMsg = {
        _id: this.data.quotingMsg._id,
        content: this.data.quotingMsg.content || '',
        type: this.data.quotingMsg.type,
        senderId: this.data.quotingMsg.senderId
      }
    }
    this.setData({ inputText: '', quotingMsg: null })
    this._sendMsg(msgData)
  },

  // 表情插入输入框（不关闭面板）
  insertEmoji(e) {
    const emoji = e.currentTarget.dataset.emoji
    this.setData({ inputText: this.data.inputText + emoji })
  },

  // 退格删除最后一个字符
  deleteLastChar() {
    const text = this.data.inputText
    if (!text) return
    // 正确处理 emoji（多字节字符）
    const arr = [...text]
    arr.pop()
    this.setData({ inputText: arr.join('') })
  },

  closePanels() {
    this.setData({ showEmoji: false, showExtra: false })
  },

  clearQuote() {
    this.setData({ quotingMsg: null })
  },

  async sendImage() {
    this.setData({ showExtra: false })
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: async res => {
        const path = res.tempFiles[0].tempFilePath
        wx.showLoading({ title: '发送中...' })
        try {
          const fileID = await uploadFile(path, 'chat')
          await this._sendMsg({ type: 'image', mediaUrl: fileID, content: '[图片]' })
        } finally {
          wx.hideLoading()
        }
      }
    })
  },

  async sendVideo() {
    this.setData({ showExtra: false })
    wx.chooseMedia({
      count: 1,
      mediaType: ['video'],
      maxDuration: 60,
      success: async res => {
        const path = res.tempFiles[0].tempFilePath
        wx.showLoading({ title: '发送中...' })
        try {
          const fileID = await uploadFile(path, 'chat')
          await this._sendMsg({ type: 'video', mediaUrl: fileID, content: '[视频]' })
        } finally {
          wx.hideLoading()
        }
      }
    })
  },

  toggleVoice() {
    this.setData({ voiceMode: !this.data.voiceMode, showEmoji: false, showExtra: false })
  },

  toggleEmoji() {
    this.setData({ showEmoji: !this.data.showEmoji, showExtra: false })
  },

  toggleExtra() {
    this.setData({ showExtra: !this.data.showExtra, showEmoji: false })
  },

  startRecord() {
    const rm = wx.getRecorderManager()
    this._recorder = rm
    rm.start({ format: 'aac', duration: 60000 })
    rm.onStart(() => this.setData({ recording: true }))
    rm.onStop(async res => {
      this.setData({ recording: false })
      if (this._cancelled || !res.tempFilePath) return
      wx.showLoading({ title: '发送中...' })
      try {
        const fileID = await uploadFile(res.tempFilePath, 'chat')
        await this._sendMsg({
          type: 'voice',
          mediaUrl: fileID,
          content: '[语音]',
          duration: Math.round(res.duration / 1000)
        })
      } finally {
        wx.hideLoading()
      }
    })
    this._cancelled = false
  },

  stopRecord() {
    if (this._recorder) {
      this._cancelled = false
      this._recorder.stop()
    }
  },

  cancelRecord() {
    if (this._recorder) {
      this._cancelled = true
      this._recorder.stop()
      this.setData({ recording: false })
    }
  },

  // ── 长按浮层菜单 ──
  noop() {},

  onBubbleLongPress(e) {
    const { msg, x, y } = e.detail
    if (!msg || msg.recalled) return
    // 菜单大小约 220x180，根据点击位置自适应
    const winInfo = wx.getWindowInfo ? wx.getWindowInfo() : { windowWidth: 375, windowHeight: 667 }
    const menuW = 160
    const menuH = 200
    let menuX = Math.min(Math.max(8, x - menuW / 2), winInfo.windowWidth - menuW - 8)
    let menuY = y - menuH - 10
    if (menuY < 60) menuY = y + 20
    const canCopy = msg.type === 'text' || msg.type === 'emoji'
    this.setData({
      menuShow: true, menuX, menuY, menuMsg: msg, menuCanCopy: canCopy,
      showEmoji: false, showExtra: false
    })
  },

  closeMenu() {
    this.setData({ menuShow: false, menuMsg: null })
  },

  menuCopy() {
    const msg = this.data.menuMsg
    if (msg && msg.content) wx.setClipboardData({ data: msg.content })
    this.closeMenu()
  },

  menuQuote() {
    this.setData({ quotingMsg: this.data.menuMsg })
    this.closeMenu()
  },

  menuMultiSelect() {
    const msg = this.data.menuMsg
    this.closeMenu()
    if (msg) this._enterMultiSelect(msg._id)
  },

  menuDelete() {
    const msg = this.data.menuMsg
    this.closeMenu()
    if (msg) this._deleteMessage(msg._id)
  },

  // ── 合并消息 ──
  mergeSelected() {
    const ids = this.data.selectedIds
    if (ids.length < 2) return
    const msgs = this.data.messages.filter(m => ids.indexOf(m._id) !== -1)
    const items = msgs.map(m => ({
      senderName: m.senderId === this.data.myOpenid ? '我' : '对方',
      content: m.content || `[${m.type}]`,
      type: m.type
    }))
    this._sendMsg({ type: 'merged', content: `[合并消息 ${items.length}条]`, mergedItems: items })
    this.setData({ multiSelect: false, selectedIds: [] })
  },

  onOpenMerged(e) {
    const msg = e.detail.msg
    if (msg && msg.type === 'merged' && msg.mergedItems) {
      this.setData({ mergedDetail: { items: msg.mergedItems } })
    }
  },

  closeMergedDetail() {
    this.setData({ mergedDetail: null })
  },

  // ── 多选：tap 气泡 ──
  onBubbleSelect(e) {
    const { msgId } = e.detail
    const ids = [...this.data.selectedIds]
    const idx = ids.indexOf(msgId)
    if (idx === -1) ids.push(msgId)
    else ids.splice(idx, 1)
    this.setData({
      selectedIds: ids,
      messages: this.data.messages.map(m => ({ ...m, selected: ids.indexOf(m._id) !== -1 }))
    })
  },

  _enterMultiSelect(firstId) {
    const ids = firstId ? [firstId] : []
    this.setData({
      multiSelect: true,
      selectedIds: ids,
      messages: this.data.messages.map(m => ({ ...m, selected: ids.indexOf(m._id) !== -1 })),
      showEmoji: false,
      showExtra: false
    })
  },

  exitMultiSelect() {
    this.setData({
      multiSelect: false,
      selectedIds: [],
      messages: this.data.messages.map(m => ({ ...m, selected: false }))
    })
  },

  deleteSelected() {
    if (this.data.selectedIds.length === 0) return
    wx.showModal({
      title: '确认删除',
      content: `删除选中的 ${this.data.selectedIds.length} 条消息？`,
      success: res => {
        if (!res.confirm) return
        const ids = [...this.data.selectedIds]
        ids.forEach(id => {
          db.collection('messages').doc(id).remove().catch(() => {})
        })
        const messages = this._processMessages(this.data.messages.filter(m => ids.indexOf(m._id) === -1))
        this.setData({ messages, multiSelect: false, selectedIds: [] })
      }
    })
  },

  _recallMessage(msg) {
    db.collection('messages').doc(msg._id).update({
      data: { recalled: true }
    }).then(() => {
      const messages = this.data.messages.map(m =>
        m._id === msg._id ? { ...m, recalled: true } : m
      )
      this.setData({ messages })
    }).catch(() => {
      wx.showToast({ title: '撤回失败', icon: 'none' })
    })
  },

  _deleteMessage(msgId) {
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复',
      success: res => {
        if (!res.confirm) return
        db.collection('messages').doc(msgId).remove().catch(() => {})
        const messages = this._processMessages(this.data.messages.filter(m => m._id !== msgId))
        this.setData({ messages })
      }
    })
  }
})
