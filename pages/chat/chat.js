const app = getApp()
const { db, uploadFile, callFn } = require('../../utils/cloud')
const { EMOJI_LIST } = require('../../utils/constants')
const { formatChatTime } = require('../../utils/time')

Page({
  data: {
    messages: [],
    myOpenid: '',
    myAvatar: '',
    adminAvatar: '/assets/images/stitch-banner.png',
    peerAvatar: '/assets/images/stitch-banner.png',
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
    menuShow: false,
    menuX: 0,
    menuY: 0,
    menuMsg: null,
    menuCanCopy: false,
    mergedDetail: null,
    showFullscreenBtn: false,
    fullscreenEdit: false,
    fullscreenInput: '',
    recordMode: 'send',
    // 管理员侧边栏
    isAdmin: false,
    sidebarOpen: false,
    contacts: [],
    currentUserId: '',
    currentContact: null,
    // 备注编辑
    remarkEditing: null,
    remarkInput: ''
  },

  _watcher: null,
  _recorder: null,
  _cancelled: false,
  _textBtnRect: null,
  _sendBtnRect: null,
  _siManager: null,
  _siResultText: '',

  async onLoad() {
    await app.waitLogin()
    const { openid, userInfo, isAdmin } = app.globalData
    this.setData({
      myOpenid: openid,
      myAvatar: userInfo?.avatarUrl || '',
      isAdmin: !!isAdmin,
      sidebarOpen: !!isAdmin
    })
    if (isAdmin) {
      await this._loadContacts()
    } else {
      this.setData({
        currentUserId: openid,
        peerAvatar: this.data.adminAvatar
      })
      this._startWatch()
    }
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2, hidden: false })
    }
    const latestAvatar = app.globalData.userInfo?.avatarUrl || ''
    if (latestAvatar !== this.data.myAvatar) {
      this.setData({ myAvatar: latestAvatar })
    }
    if (app.globalData.isAdmin) {
      this._loadContacts()
      if (this.data.currentUserId && !this._watcher) this._startWatch()
    } else if (!this._watcher && app.globalData.openid) {
      this._startWatch()
    }
  },

  onHide() { this._closeWatch() },
  onUnload() { this._closeWatch() },

  // ── 联系人列表（管理员） ──
  async _loadContacts() {
    try {
      const res = await db.collection('conversations').orderBy('lastMessageAt', 'desc').limit(100).get()
      const convs = res.data || []
      const userIds = [...new Set(convs.map(c => c.userId).filter(Boolean))]
      let userMap = {}
      if (userIds.length) {
        // 分批查询 users（云数据库 in 限制）
        const chunks = []
        for (let i = 0; i < userIds.length; i += 20) chunks.push(userIds.slice(i, i + 20))
        const results = await Promise.all(
          chunks.map(ids => db.collection('users').where({ _openid: db.command.in(ids) }).get())
        )
        results.forEach(r => (r.data || []).forEach(u => { userMap[u._openid] = u }))
      }
      const contacts = convs.map(c => {
        const u = userMap[c.userId] || {}
        return {
          userId: c.userId,
          convId: c._id,
          nickName: u.nickName || '微信用户',
          avatarUrl: u.avatarUrl || '/assets/images/stitch-wave.png',
          remark: c.adminRemark || '',
          displayName: c.adminRemark || u.nickName || '微信用户',
          lastMessage: c.lastMessage || '',
          lastTimeStr: c.lastMessageAt ? formatChatTime(c.lastMessageAt) : '',
          unread: c.unreadByAdmin || 0
        }
      })
      const patch = { contacts }
      // 如果当前选中的联系人已存在，更新 currentContact
      if (this.data.currentUserId) {
        const cur = contacts.find(x => x.userId === this.data.currentUserId)
        if (cur) {
          patch.currentContact = cur
          patch.peerAvatar = cur.avatarUrl
        }
      }
      this.setData(patch)
    } catch (e) {
      console.error('load contacts error', e)
    }
  },

  toggleSidebar() {
    const next = !this.data.sidebarOpen
    this.setData({ sidebarOpen: next })
    if (next) this._loadContacts()
  },

  selectContact(e) {
    const userId = e.currentTarget.dataset.id
    if (!userId || userId === this.data.currentUserId) {
      this.setData({ sidebarOpen: false })
      return
    }
    const contact = this.data.contacts.find(c => c.userId === userId)
    this._closeWatch()
    this.setData({
      currentUserId: userId,
      currentContact: contact || null,
      peerAvatar: contact?.avatarUrl || this.data.adminAvatar,
      messages: [],
      sidebarOpen: false,
      multiSelect: false,
      selectedIds: []
    })
    this._startWatch()
    // 清除该联系人未读
    db.collection('conversations').doc(`conv_${userId}`).update({
      data: { unreadByAdmin: 0 }
    }).catch(() => {})
    const idx = this.data.contacts.findIndex(c => c.userId === userId)
    if (idx >= 0) {
      const updated = [...this.data.contacts]
      updated[idx] = { ...updated[idx], unread: 0 }
      this.setData({ contacts: updated })
    }
  },

  // ── 备注编辑 ──
  startEditRemark(e) {
    const userId = e.currentTarget.dataset.id
    const c = this.data.contacts.find(x => x.userId === userId)
    if (!c) return
    this.setData({ remarkEditing: c, remarkInput: c.remark || '' })
  },

  onRemarkInput(e) { this.setData({ remarkInput: e.detail.value }) },

  cancelEditRemark() { this.setData({ remarkEditing: null, remarkInput: '' }) },

  async saveRemark() {
    const c = this.data.remarkEditing
    if (!c) return
    const remark = (this.data.remarkInput || '').trim()
    try {
      await db.collection('conversations').doc(c.convId).update({ data: { adminRemark: remark } })
      const contacts = this.data.contacts.map(x => x.userId === c.userId
        ? { ...x, remark, displayName: remark || x.nickName }
        : x)
      const patch = { contacts, remarkEditing: null, remarkInput: '' }
      if (this.data.currentUserId === c.userId) {
        patch.currentContact = contacts.find(x => x.userId === c.userId)
      }
      this.setData(patch)
      wx.showToast({ title: '已保存', icon: 'success' })
    } catch (err) {
      console.error('save remark', err)
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  _startWatch() {
    const isAdmin = app.globalData.isAdmin
    let conversationId
    if (isAdmin) {
      if (!this.data.currentUserId) return
      conversationId = `conv_${this.data.currentUserId}`
    } else {
      conversationId = `conv_${app.globalData.openid}`
    }

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
          if (app.globalData.isAdmin) this._loadContacts()
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

  _processMessages(docs) {
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

  onLineChange(e) {
    const lines = (e.detail && e.detail.lineCount) || 0
    const should = lines >= 7
    if (should !== this.data.showFullscreenBtn) {
      this.setData({ showFullscreenBtn: should })
    }
  },

  openFullscreenEdit() {
    this.setData({
      fullscreenEdit: true,
      fullscreenInput: this.data.inputText,
      showEmoji: false,
      showExtra: false
    })
  },

  onFullscreenInput(e) {
    this.setData({ fullscreenInput: e.detail.value })
  },

  cancelFullscreenEdit() {
    this.setData({
      inputText: this.data.fullscreenInput,
      fullscreenEdit: false,
      fullscreenInput: ''
    })
  },

  sendFromFullscreen() {
    const text = (this.data.fullscreenInput || '').trim()
    this.setData({ fullscreenEdit: false, fullscreenInput: '', inputText: text })
    if (text) this.sendText()
  },

  async _sendMsg(data) {
    const isAdmin = app.globalData.isAdmin
    const myOpenid = app.globalData.openid
    const targetUserId = isAdmin ? this.data.currentUserId : myOpenid
    if (!targetUserId) {
      wx.showToast({ title: '请先选择联系人', icon: 'none' })
      return
    }
    const conversationId = `conv_${targetUserId}`

    const msgData = {
      conversationId,
      senderId: myOpenid,
      senderRole: isAdmin ? 'admin' : 'user',
      createdAt: db.serverDate(),
      recalled: false,
      ...data
    }

    await db.collection('messages').add({ data: msgData })

    const preview = data.type === 'text' ? data.content : `[${data.type}]`
    const convData = {
      userId: targetUserId,
      lastMessage: preview,
      lastMessageAt: db.serverDate(),
      createdAt: db.serverDate()
    }
    if (!isAdmin) convData.unreadByAdmin = db.command.inc(1)
    db.collection('conversations').doc(conversationId).set({ data: convData }).catch(() => {})

    if (!isAdmin) {
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

  insertEmoji(e) {
    const emoji = e.currentTarget.dataset.emoji
    this.setData({ inputText: this.data.inputText + emoji })
  },

  deleteLastChar() {
    const text = this.data.inputText
    if (!text) return
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

  _getSiManager() {
    if (this._siManager) return this._siManager
    try {
      const plugin = requirePlugin('WechatSI')
      const mgr = plugin.getRecordRecognitionManager()
      mgr.onRecognize(res => {
        this._siResultText = res.result || this._siResultText
      })
      mgr.onStop(res => {
        this._siResultText = res.result || this._siResultText
        this._handleRecordStop({ tempFilePath: res.tempFilePath, duration: res.duration })
      })
      mgr.onError(() => {
        this._siResultText = ''
        wx.hideLoading()
        this.setData({ recording: false, recordMode: 'send' })
      })
      this._siManager = mgr
      return mgr
    } catch (e) {
      return null
    }
  },

  startRecord() {
    this._cancelled = false
    this._siResultText = ''
    this.setData({ recordMode: 'send' })

    const si = this._getSiManager()
    if (si) {
      this._recorder = { _isSi: true, stop: () => si.stop() }
      si.start({ duration: 60000, lang: 'zh_CN' })
      this.setData({ recording: true })
    } else {
      const rm = wx.getRecorderManager()
      this._recorder = rm
      rm.start({ format: 'aac', duration: 60000 })
      rm.onStart(() => this.setData({ recording: true }))
      rm.onStop(res => {
        this._handleRecordStop({ tempFilePath: res.tempFilePath, duration: res.duration })
      })
    }

    setTimeout(() => {
      const q = wx.createSelectorQuery().in(this)
      q.select('.record-action-text').boundingClientRect()
      q.select('.record-action-send').boundingClientRect()
      q.exec(rects => {
        this._textBtnRect = rects[0]
        this._sendBtnRect = rects[1]
      })
    }, 80)
  },

  onRecordMove(e) {
    if (!this.data.recording) return
    const t = e.touches && e.touches[0]
    if (!t) return
    const x = t.clientX, y = t.clientY
    const inRect = (r) => r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
    let mode = 'send'
    if (inRect(this._textBtnRect)) mode = 'text'
    else if (inRect(this._sendBtnRect)) mode = 'send'
    if (mode !== this.data.recordMode) this.setData({ recordMode: mode })
  },

  stopRecord(e) {
    if (!this._recorder) return
    // 用松手时的坐标兜底判断模式（PC 端 touchmove 不一定连续触发）
    const t = e && e.changedTouches && e.changedTouches[0]
    if (t) {
      const inRect = (r) => r && t.clientX >= r.left && t.clientX <= r.right && t.clientY >= r.top && t.clientY <= r.bottom
      if (inRect(this._textBtnRect)) this.setData({ recordMode: 'text' })
      else if (inRect(this._sendBtnRect)) this.setData({ recordMode: 'send' })
    }
    this._cancelled = false
    this._recorder.stop()
  },

  cancelRecord() {
    if (!this._recorder) return
    this._cancelled = true
    this._recorder.stop()
    this.setData({ recording: false, recordMode: 'send' })
  },

  async _handleRecordStop(res) {
    const mode = this.data.recordMode
    this.setData({ recording: false, recordMode: 'send' })
    if (this._cancelled || !res || !res.tempFilePath) return

    if (mode === 'text') {
      const text = (this._siResultText || '').trim()
      if (text) {
        this.setData({ inputText: (this.data.inputText || '') + text })
      } else {
        wx.showToast({
          title: this._siManager ? '未识别到内容' : '请先开通同声传译插件',
          icon: 'none'
        })
      }
      return
    }

    wx.showLoading({ title: '发送中...' })
    try {
      const fileID = await uploadFile(res.tempFilePath, 'chat')
      await this._sendMsg({
        type: 'voice',
        mediaUrl: fileID,
        content: '[语音]',
        duration: Math.round((res.duration || 1000) / 1000)
      })
    } finally {
      wx.hideLoading()
    }
  },

  noop() {},

  onBubbleLongPress(e) {
    const { msg, x, y } = e.detail
    if (!msg || msg.recalled) return
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
