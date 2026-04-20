const { formatChatTime } = require('../../utils/time')

Component({
  properties: {
    msg: { type: Object, value: {} },
    isSelf: { type: Boolean, value: false },
    avatarUrl: { type: String, value: '' }
  },

  data: {
    timeStr: '',
    playing: false
  },

  observers: {
    'msg': function(msg) {
      if (msg && msg.createdAt) {
        this.setData({ timeStr: formatChatTime(msg.createdAt) })
      }
    }
  },

  methods: {
    previewImg() {
      const url = this.properties.msg.mediaUrl
      if (!url) return
      wx.previewImage({ urls: [url], current: url })
    },

    playVoice() {
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
