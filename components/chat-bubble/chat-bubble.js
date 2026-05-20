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
    voiceWidth: 160,
    imgStyle: ''
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

    // 按图片真实比例计算显示框，避免裁剪
    onImgLoad(e) {
      const { width, height } = e.detail
      if (!width || !height) return
      const maxW = 320, maxH = 320, minSide = 100
      const ratio = width / height
      let w = width, h = height
      if (w > maxW) { w = maxW; h = Math.round(w / ratio) }
      if (h > maxH) { h = maxH; w = Math.round(h * ratio) }
      w = Math.max(w, minSide)
      h = Math.max(h, minSide)
      this.setData({ imgStyle: `width:${Math.round(w)}rpx;height:${Math.round(h)}rpx;` })
    },

    openMerged() {
      if (this.properties.multiSelect) return
      this.triggerEvent('openmerged', { msg: this.properties.msg })
    },

    playVoice() {
      if (this.properties.multiSelect) return
      if (this.data.playing) return
      const url = this.properties.msg.mediaUrl
      if (!url) return

      const start = (src) => {
        this.setData({ playing: true })
        const audio = wx.createInnerAudioContext()
        this._audio = audio
        audio.src = src
        audio.play()
        audio.onEnded(() => { this.setData({ playing: false }); audio.destroy() })
        audio.onError(err => {
          console.error('voice play error', err)
          this.setData({ playing: false })
          audio.destroy()
          wx.showToast({ title: '语音播放失败', icon: 'none' })
        })
      }

      // InnerAudioContext 不支持 cloud:// 文件ID，需先换成 https 临时链接
      if (/^cloud:\/\//.test(url)) {
        wx.cloud.getTempFileURL({ fileList: [url] })
          .then(res => {
            const f = res.fileList && res.fileList[0]
            if (f && f.tempFileURL) start(f.tempFileURL)
            else wx.showToast({ title: '语音加载失败', icon: 'none' })
          })
          .catch(() => wx.showToast({ title: '语音加载失败', icon: 'none' }))
      } else {
        start(url)
      }
    }
  }
})
