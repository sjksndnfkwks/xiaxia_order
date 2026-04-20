const { CLOUD_ENV } = require('./constants')

// 懒加载：每次调用时获取 db，确保 wx.cloud.init() 已执行
function getDB() {
  return wx.cloud.database({ env: CLOUD_ENV })
}

const col = name => getDB().collection(name)

const getCommand = () => getDB().command

function callFn(name, data) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({ name, data, success: r => resolve(r.result), fail: reject })
  })
}

function uploadFile(localPath, folder) {
  const ext = localPath.split('.').pop()
  const cloudPath = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
  return new Promise((resolve, reject) => {
    wx.cloud.uploadFile({
      cloudPath,
      filePath: localPath,
      success: r => resolve(r.fileID),
      fail: reject
    })
  })
}

async function getAll(collection, query) {
  const MAX = 20
  let result = []
  let skip = 0
  while (true) {
    const res = await col(collection).where(query).skip(skip).limit(MAX).get()
    result = result.concat(res.data)
    if (res.data.length < MAX) break
    skip += MAX
  }
  return result
}

// db 和 _ 也改为懒加载属性，兼容原有调用方式
Object.defineProperty(module.exports, 'db', { get: getDB })
Object.defineProperty(module.exports, '_', { get: getCommand })

module.exports.col = col
module.exports.callFn = callFn
module.exports.uploadFile = uploadFile
module.exports.getAll = getAll
