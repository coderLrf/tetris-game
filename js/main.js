// 设置行和列
let row = 18, col = 12
// 步长
let step = 40
// 下落的速度，单位为毫秒
let fallSpeed = 600
// 增加游戏难度的间隔时间，单位为毫秒
let intervalTime = 10000
// 空置数量
let vacantNum = 1
// 游戏的时间
let gameTime = 0
// 当前模型
let currentModel = {}
// 下一个模型
let nextModel = {}

// TODO 游戏模式，(invisible -> 隐形模式)，(lock -> 锁定模式)，(master -> 大师模式)，（upgrade -> 升级模式）
let gameMode = ''

// 标记16宫格位置
let currentX = col / 2 - 2, currentY = -1
// 记录了所有块元素的位置
let fixedBlocks = {}
// 定义一个标记，用来判断是否能够下落方块
let flag = true

// 下落定时器
let inter = null
// 游戏定时器
let gameInter = null
// 难度定时器
let diffInter = null

// 获取页面app元素
const appEl = document.querySelector('#app')
// 获取底部元素
const bottomEl = document.querySelector('#bottom')
// 获取active元素
const activeEl = document.querySelector('#active')
// 获取preview元素
const previewEl = document.querySelector('#preview')
// 获取trash元素
const trashEl = document.querySelector('#trash')
// next元素
const nextEl = document.querySelector('#next')
// score元素
const scoreEl = document.querySelector('#score')
// 时间元素
const timeEl = document.querySelector('#time')

// 创建模型
function createModel() {
  if (isGameOver()) {
    clearInterval(inter)
    clearInterval(gameInter)
    clearInterval(diffInter)
    return alert('游戏结束')
  }

  // 当前模型，采用下一个模型
  currentModel = clone(nextModel)

  // 重新创建下一个模型
  createNextModel()

  // 创建预览模型
  createPreviewModel()

  // 重置16宫格位置
  // TODO 后面可以考虑一下给一个随机的范围值
  currentX = col / 2 - 2
  currentY = -1

  for (let key in currentModel) {
    const newDiv = document.createElement('div')
    newDiv.className = 'active_model'
    trashEl.append(newDiv)
  }

  // 给方块定位
  locationBlock()

  // TODO 自动下落
  autoDown()
}

// 创建下一个元素
function createNextModel() {
  // 删除上一个模型
  const nextModelList = document.querySelectorAll('.next_model')
  for (let next of nextModelList) {
    nextEl.removeChild(next)
  }
  // 采用随机模型的方法
  const index = Math.floor(Math.random() * MODELS.length)
  // 克隆一个新元素出来
  nextModel = MODELS[index]
  if (gameMode === 'lock') {
    // 克隆一个对象
    let cloneModel = clone(nextModel)
    // 随机旋转次数（1 - 3）
    let index = Math.floor(Math.random() * 3)
    for (let i = 0; i < index; i++) {
      // 旋转后的行 = 旋转前的列
      // 旋转后的列 = 3 - 旋转前的行
      for (let key in cloneModel) {
        let model = cloneModel[key]
        let temp = model.row
        model.row = model.col
        model.col = 3 - temp
      }
    }
    // 接收了这次旋转
    nextModel = cloneModel
  }
  // 对下一个元素进行定位
  for (let key in nextModel) {
    const newNext = document.createElement('div')
    newNext.className = 'next_model'
    newNext.style.top = nextModel[key].row * step + 'px'
    newNext.style.left = nextModel[key].col * step + 'px'
    nextEl.appendChild(newNext)
  }
}

// 创建预览模型
function createPreviewModel() {
  const list = document.querySelectorAll('.preview_model')
  for (let node of list) {
    previewEl.removeChild(node)
  }
  for (let key in currentModel) {
    const newPre = document.createElement('div')
    newPre.className = 'preview_model'
    previewEl.appendChild(newPre)
  }
}

// 给方块元素定位
function locationBlock() {
  // 判定越界行为
  checkCrossBorder()
  const blockList = document.querySelectorAll('.active_model')
  const preList = document.querySelectorAll('.preview_model')
  let x = currentX
  let y = currentY
  // 条件：( y + 1 ) 越界 + (y + 1) 碰撞
  while (!isCheckCrossBorder(x, y + 1, currentModel) && !isMeet(x, y + 1, currentModel)) {
    y++
  }

  for (let i = blockList.length - 1; i >= 0; i--) {
    // 找到每一个模块对应的数据
    let model = currentModel[i]
    blockList[i].style.top = (model.row + currentY) * step + 'px'
    blockList[i].style.left = (model.col + x) * step + 'px'

    // 给预览元素定位
    preList[i].style.left = (model.col + x) * step + 'px'
    preList[i].style.top = (model.row + y) * step + 'px'
  }
}

// 对垃圾行进行定位
function locationTrash() {
  // 所有方块升一行
  topLine()
  const trashList = document.querySelectorAll('.trash_model')
  let line = row - 1
  for (let i = 0; i < trashList.length; i++) {
    let col = parseInt(trashList[i].getAttribute('col'))
    trashList[i].removeAttribute('col')
    trashList[i].className = 'fixed_model'
    trashList[i].style.top = line * step + 'px'
    trashList[i].style.left = col * step + 'px'
    fixedBlocks[line + '_' + col] = trashList[i]
  }
}

// 检测越界行为
function checkCrossBorder() {
  // 当块元素超出了边界只有，让16宫格后退一步
  for (let key in currentModel) {
    let blockModel = currentModel[key]
    // 左侧
    if (blockModel.col + currentX < 0) {
      currentX++
    }
    // 右侧
    if (blockModel.col + currentX >= col) {
      currentX--
    }
    // 下侧
    if (blockModel.row + currentY >= row) {
      currentY--
      // 固定模型在底部
      fixedModel()
    }
  }
}

// 判断是否越界
function isCheckCrossBorder(x, y, checkModel) {
  for (let key in checkModel) {
    let blockModel = checkModel[key]
    // 左侧，右侧，下侧
    if (blockModel.col + x < 0 || blockModel.col + x >= col || blockModel.row + y >= row) {
      return true
    }
  }
  return false
}

// 将模型固定在底部
function fixedModel() {
  const activeList = document.querySelectorAll('.active_model')
  // 循环遍历
  for (let i = activeList.length - 1; i >= 0; i--) {
    activeList[i].className = 'fixed_model'
    if (gameMode === 'invisible') {
      activeList[i].classList.add('invisible_model')
    }
    let model = currentModel[i]
    // // 添加到已固定的模型列表
    fixedBlocks[(model.row + currentY) + '_' + (model.col + currentX)] = activeList[i]
  }
  // 重置标记
  flag = false

  // 判断是否铺满，删除铺满行
  isRemoveLine()

  // 创建新的模型
  createModel()
}

// 判断是否铺满一行，删除铺满行
function isRemoveLine() {
  const removeList = []

  for (let i = 0; i < row; i++) {
    // 用来标记是否铺满
    let flag = true
    for (let j = col - 1; j >= 0; j--) {
      if (!fixedBlocks[i + '_' + j]) {
        flag = false
        break
      }
    }
    if (flag) { // 如果有铺满行
      removeList.push(i)
    }
  }
  // 循环删除
  for (let row of removeList) {
    removeLine(row)
  }

  // TODO 记录得分
  recordScore(removeList.length)
}

// 删除一行
function removeLine(row) {
  for (let j = col - 1; j >= 0; j--) {
    let key = row + '_' + j
    trashEl.removeChild(fixedBlocks[key])
    // 清理数据
    fixedBlocks[key] = null
  }

  // 让上一层下落
  downLine(row)
}

// 方块下落
function downLine(line) {
  for (let i = line - 1; i >= 0; i--) {
    for (let j = col - 1; j >= 0; j--) {
      if (fixedBlocks[i + '_' + j]) {
        // 存在方块
        fixedBlocks[(i + 1 + '_' + j)] = fixedBlocks[i + '_' + j]
        fixedBlocks[(i + 1 + '_' + j)].style.top = (i + 1) * step + 'px'
        // 逻辑处理
        fixedBlocks[i + '_' + j] = null
      }
    }
  }
}

// 方块提升
function topLine() {
  for (let i = 0; i < row; i++) {
    for (let j = 0; j < col; j++) {
      if (fixedBlocks[i + '_' + j]) {
        // 存在方块
        fixedBlocks[(i - 1 + '_' + j)] = fixedBlocks[i + '_' + j]
        fixedBlocks[(i - 1 + '_' + j)].style.top = (i - 1) * step + 'px'
        // 逻辑处理
        fixedBlocks[i + '_' + j] = null
      }
    }
  }
}

// 增加垃圾行
function appendTrashLine() {
  if (isGameOver()) {
    clearInterval(inter)
    clearInterval(gameInter)
    clearInterval(diffInter)
    return alert('游戏结束')
  }
  // 随机{vacantNum}列不命中，不重复
  let vacantList = []
  for (let i = 0; i < vacantNum; i++) {
    let c = Math.floor(Math.random() * col)
    while (vacantList.includes(c)) {
      c = Math.floor(Math.random() * col)
    }
    vacantList.push(c)
  }
  for (let i = 0; i < col; i++) {
    if (vacantList.includes(i)) {
      continue
    }
    const newTrash = document.createElement('div')
    newTrash.className = 'trash_model'
    newTrash.style.top = row * step + 'px'
    newTrash.style.left = i * step + 'px'
    newTrash.setAttribute('col', i.toString())
    trashEl.appendChild(newTrash)
  }
  // 对垃圾行进行定位
  locationTrash()

  // 重新给方块元素进行定位
  locationBlock()
  // 没一百秒增加一个数量
  if (gameTime % 100 === 0) {
    vacantNum++
    if (vacantNum >= col - 5) { // 轮询
      vacantNum = 1
    }
  }
}

// 记录得分
function recordScore(line) {
  let score = 0 // 分值
  if (line >= 4) { // 消除4行得100分
    score = 100
  } else if (line >= 3) { // 消除3行得60分
    score = 60
  } else if (line >= 2) { // 消除2行得30分
    score = 30
  } else if (line >= 1) { // 消除1行的10分
    score = 10
  }
  if (score > 0) {
    scoreEl.innerHTML = parseInt(scoreEl.innerHTML) + score + ''
  }
}

// 自动下落
function autoDown() {
  if (inter) {
    clearInterval(inter)
  }
  inter = setInterval(() => {
    move(0, 1)
  }, fallSpeed)
}

// 旋转 元素
function rotate() {
  // 克隆一个对象
  let cloneModel = clone(currentModel)

  // 旋转后的行 = 旋转前的列
  // 旋转后的列 = 3 - 旋转前的行
  for (let key in cloneModel) {
    let model = cloneModel[key]
    let temp = model.row
    model.row = model.col
    model.col = 3 - temp
  }
  // 检测碰撞，检测是否可以旋转，没有碰撞则表示可以进行旋转
  if (!isMeet(currentX, currentY, cloneModel)) {
    // 接收了这次旋转
    currentModel = cloneModel
    // 重新定位
    locationBlock()
  }
}

// 移动方法
function move(x, y) {
  if (isMeet(currentX + x, currentY + y, currentModel)) {
    if (y !== 0) {
      // 固定在底部
      fixedModel()
    }
  } else {
    currentX += x
    currentY += y
    // 重新定位
    locationBlock()
  }
}

// 判断是否游戏结束，当第0行存在元素时，代表游戏结束
function isGameOver() {
  for (let i = 0; i < col; i++) {
    if (fixedBlocks['0_' + i]) {
      return true
    }
  }
  return false
}

// 检测碰撞事件
function isMeet(x, y, model) {
  for (let key in model) {
    let blockModel = model[key]
    if (fixedBlocks[(blockModel.row + y) + '_' + (blockModel.col + x)]) {
      // 已经存在元素
      return true
    }
  }
  return false
}

// 初始化游戏，开始游戏
function init() {

  // 大师模式
  if (gameMode === 'master') {
    fallSpeed = 100
  }

  // 初始化容器
  initContainer()

  // 初始化底部方块
  initBottomModel()

  // 创建下一个模型
  createNextModel()

  // 创建模型
  createModel()

  // 初始化事件
  document.addEventListener('keydown', keydown)

  gameInter = setInterval(() => {
    gameTime++
    timeEl.innerHTML = gameTime < 10 ? '0' + gameTime : gameTime
  }, 1000)

  // 定时提升难度，升一行
  diffInter = setInterval(appendTrashLine, intervalTime)
}

// 绑定事件
function keydown(e) {
  switch (e.keyCode) {
    case 37: // 左
      move(-1, 0)
      break
    case 38: // TODO 旋转
      if (gameMode !== 'lock') {
        rotate()
      }
      break
    case 39: // 右
      move(1, 0)
      break
    case 40: // 下
      move(0, 1)
      break
    case 32: // 空格
      do {
        move(0, 1)
      } while (flag)
      flag = true // 重置标记
      break
    default:
  }
}

// 初始化底部方块
function initBottomModel() {
  for (let i = 0; i < row; i++) {
    for (let j = 0; j < col; j++) {
      const newDiv = document.createElement('div')
      newDiv.className = 'bottom_model'
      newDiv.style.top = i * step + 'px'
      newDiv.style.left = j * step + 'px'
      bottomEl.appendChild(newDiv)
    }
  }
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const newDiv = document.createElement('div')
      newDiv.className = 'bottom_model'
      newDiv.style.top = i * step + 'px'
      newDiv.style.left = j * step + 'px'
      nextEl.appendChild(newDiv)
    }
  }
}

// 初始化容器
function initContainer() {
  let width = col * step
  let height = row * step

  appEl.style.width = width + 'px'
  appEl.style.height = height + 'px'

  let nextW = 4 * step
  let nextH = 4 * step
  nextEl.style.width = nextW + 'px'
  nextEl.style.height = nextH + 'px'
}

window.onload = function () {
  init()
}
