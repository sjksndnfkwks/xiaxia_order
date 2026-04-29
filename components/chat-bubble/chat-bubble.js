const { formatChatTime } = require('../../utils/time')

Component({
  properties: {
    msg: { type: Object, value: {} },
    isSelf: { type: Boolean, value: false },
    avatarUrl: { type: String, value: '' },
    multiSelect: { type: Boolean, value: false },
    selected: { type: Boolean, value: false }
  },

  data: {
    timeStr: '',
    playing: false,
    voiceWidth: 160
  },

  observers: {
    'msg': function(msg) {
      if (!msg) return
      const patch = {}
      if (msg.createdAt) patch.timeStr = formatChatTime(msg.createdAt)
      if (msg.type === 'voice') {
        const dur = Math.max(1, Math.min(60, Number(msg.duration) || 1))
        patch.voiceWidth = Math.round(96 + dur * 8)
      }
      if (Object.keys(patch).length) this.setData(patch)
    }
  },

  methods: {
    onHoldStart(e) {
      if (this.properties.multiSelect) return
      if (this.properties.msg.recalled) return
      const touch = e.touches && e.touches[0]
      const x = touch ? touch.clientX : 0
      const y = touch ? touch.clientY : 0
      this._holdFired = false
      this._holdTimer = setTimeout(() => {
        this._holdFired = true
        this.triggerEvent('longpress', {
          msg: this.properties.msg,
          isSelf: this.properties.isSelf,
          x, y
        })
      }, 380)
    },

    onHoldEnd() {
      if (this._holdTimer) {
        clearTimeout(this._holdTimer)
        this._holdTimer = null
      }
    },

    onTap() {
      if (this._holdFired) { this._holdFired = false; return }
      if (this.properties.multiSelect) {
        this.triggerEvent('select', { msgId: this.properties.msg._id })
      }
    },

    previewImg() {
      if (this.properties.multiSelect) return
      const url = this.properties.msg.mediaUrl
      if (!url) return
      wx.previewImage({ urls: [url], current: url })
    },

    openMerged() {
      if (this.properties.multiSelect) return
      this.triggerEvent('openmerged', { msg: this.properties.msg })
    },

    playVoice() {
      if (this.properties.multiSelect) return
      const url = this.properties.msg.mediaUrl
      if (!url) return
      this.setData({ playing: true })
      const audio = wx.createInnerAudioContext()
      audio.src = url
      audio.play()
      audio.onEnded(() => this.setData({ playing: false }))
      audio.onError(() => this.setData({ playing: false }))
    }
  }
})
