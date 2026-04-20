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
    inputBarHeight: 60,
    safeBottom: 0
  },

  _watcher: null,
  _recorder: null,
  _recorderPath: '',
  _recorderDuration: 0,

  async onLoad() {
    await app.waitLogin()
    const { openid, userInfo } = app.globalData
    this.setData({
      myOpenid: openid,
      myAvatar: userInfo?.avatarUrl || ''
    })
    this._startWatch()

    // 获取安全区域
    const sysInfo = wx.getSystemInfoSync()
    this.setData({ safeBottom: sysInfo.safeArea ? sysInfo.screenHeight - sysInfo.safeArea.bottom : 0 })
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
          this.setData({ messages: snapshot.docs }, () => {
            this.setData({ scrollId: 'msg-bottom' })
          })
        },
        onError: err => {
          console.error('watch error', err)
          // 1秒后重连
          setTimeout(() => this._startWatch(), 1000)
        }
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
      ...data
    }

    await db.collection('messages').add({ data: msgData })

    // 更新会话
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

    // 推送通知
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
    this.setData({ inputText: '' })
    this._sendMsg({ type: 'text', content: text })
  },

  sendEmoji(e) {
    const emoji = e.currentTarget.dataset.emoji
    this._sendMsg({ type: 'emoji', content: emoji })
    this.setData({ showEmoji: false })
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
    this._recorderDuration = 0
    rm.start({ format: 'aac', duration: 60000 })
    rm.onStart(() => {
      this.setData({ recording: true })
    })
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
  }
})
