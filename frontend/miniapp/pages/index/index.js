// index.js
Page({
  data: {
    containerNo: '',
    recentSearches: [],
    notifications: []
  },

  onLoad() {
    this.loadRecentSearches()
    this.loadNotifications()
  },

  onInputChange(e) {
    this.setData({
      containerNo: e.detail.value
    })
  },

  onSearch() {
    const { containerNo } = this.data
    if (!containerNo) {
      wx.showToast({
        title: '请输入箱号',
        icon: 'none'
      })
      return
    }

    // 保存搜索记录
    this.saveSearch(containerNo)

    // 跳转到查询结果页
    wx.navigateTo({
      url: `/pages/tracking/tracking?containerNo=${containerNo}`
    })
  },

  onScan() {
    wx.scanCode({
      success: (res) => {
        this.setData({
          containerNo: res.result
        })
        this.onSearch()
      }
    })
  },

  saveSearch(containerNo) {
    let recentSearches = wx.getStorageSync('recentSearches') || []
    recentSearches = recentSearches.filter(item => item !== containerNo)
    recentSearches.unshift(containerNo)
    if (recentSearches.length > 10) {
      recentSearches = recentSearches.slice(0, 10)
    }
    wx.setStorageSync('recentSearches', recentSearches)
    this.setData({ recentSearches })
  },

  loadRecentSearches() {
    const recentSearches = wx.getStorageSync('recentSearches') || []
    this.setData({ recentSearches })
  },

  loadNotifications() {
    // 加载通知列表
    this.setData({
      notifications: [
        { id: 1, title: '货物状态更新', content: '您的集装箱 MSCU1234567 已离港', time: '10分钟前' },
        { id: 2, title: '新账单', content: '您有一笔新的账单待确认', time: '2小时前' }
      ]
    })
  },

  onRecentSearchTap(e) {
    const containerNo = e.currentTarget.dataset.value
    this.setData({ containerNo })
    this.onSearch()
  }
})
