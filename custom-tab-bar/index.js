Component({
  data: {
    selected: 0,
    hidden: false,
    list: [
      { pagePath: '/pages/food/food', text: '点菜', emoji: '🍽', activeEmoji: '🍽' },
      { pagePath: '/pages/snacks/snacks', text: '零食', emoji: '🍬', activeEmoji: '🍬' },
      { pagePath: '/pages/chat/chat', text: '消息', emoji: '💬', activeEmoji: '💬' },
      { pagePath: '/pages/profile/profile', text: '我的', emoji: '👤', activeEmoji: '👤' }
    ]
  },
  methods: {
    switchTab(e) {
      const path = e.currentTarget.dataset.path
      wx.switchTab({ url: path })
    }
  }
})
