/*
 * MIT License
 * Copyright (c) 2020 Carlos Henrique Reche
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/**
 * MatrixMonitor
 * 
 * Creates the digital rain from The Matrix movies.
 * 
 * @url https://github.com/carlosreche/matrix-monitor
 * @author Carlos Henrique Reche
 */

 // private fields
const _containerId = Symbol('MatrixMonitor._containerId')
const _options = Symbol('MatrixMonitor._options')
const _deferred = Symbol('MatrixMonitor._deferred')
const _monitor = Symbol('MatrixMonitor._context')
const _initialize = Symbol('MatrixMonitor._initialize')
const _defer = Symbol('MatrixMonitor._defer')
const _start = Symbol('MatrixMonitor._start')
const _pause = Symbol('MatrixMonitor._pause')
const _resume = Symbol('MatrixMonitor._resume')
const _stop = Symbol('MatrixMonitor._stop')
const _draw = Symbol('MatrixMonitor._draw')

const random = (from, to) => Math.floor((Math.random() * (to - from)) + from)

export default class MatrixMonitor {

  static DEFAULT_OPTIONS = {
    alphabet: 'ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍｦｲｸｺｿﾁﾄﾉﾌﾔﾖﾙﾚﾛﾝﾘｸコソヤ日012345789Z:・."=*+-<>¦╌',
    initialDelay:       1000,
    mainLoopInterval:  10000,
    mainLoopDuration:   null, // null for infinity
    minCharStartDelay:   500,
    maxCharStartDelay: 10000,
    minCharProgression:  200,
    maxCharProgression:  800,
    fadingDuration:     2000,
    paddingTop: 10,
    paddingLeft: 10,
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
    fontColor: '#91F490',
    fontSize: 20,
    fontFamily: 'Courier New',
    fontWeight: 'bold',
    fadedFontColor: '#01A400',
    fadedOpacity: 0.5,
    cellWidth: 15,
    cellHeight: 20,
    horizontalSpacing: 8,
    verticalSpacing: 5
  }

  constructor(containerId, options = {}) {
    this[_containerId] = containerId
    this[_options]     = {...MatrixMonitor.DEFAULT_OPTIONS, ...options}
    this[_deferred]    = []

    this[_monitor] = {
      isInitialized: false,
      container: null,
      columns: [],
      cells: [],
      topCells: [],
      mainLoop: null,
      createDroplet: null,
      timers: {
        mainLoopInterval: null,
        mainLoopDuration: null,
        start: null,
        pause: null,
        resume: null,
        stop: null
      },
      reset() {
        this.isInitialized = false
        this.container = null
        this.columns = []
        this.cells = []
        this.topCells = []
        this.timers = {
          mainLoopInterval: null,
          mainLoopDuration: null,
          start: null,
          pause: null,
          resume: null,
          stop: null
        }
      },
      addColumn(htmlElement) {
        const monitor = this
        const columnIndex = this.columns.length

        const column = {
          htmlElement,
          index: columnIndex,
          cells: [],
          topCell: null,
          * [Symbol.iterator]() {
            for (const cell of this.cells) {
              yield cell
            }
          },

          addCell(cellHtmlElement) {
            const col = this
            const rowIndex = col.cells.length

            const cell = {
              htmlElement: cellHtmlElement,
              rowIndex,
              columnIndex,
              get nextCell() {
                return col.cells[rowIndex + 1]
              },
              * getNextCells() {
                let nextCell = this.nextCell
                do {
                  yield nextCell
                  nextCell = nextCell.nextCell
                } while (nextCell)
              },
              update: {
                timer: null,
                function: null,
                delay: null,
                progression: null,
                nextChar: null,
                isUpdated: false
              }
            }
            col.cells.push(cell)
            monitor.cells.push(cell)
            if (rowIndex === 0) {
              col.topCell = cell
              monitor.topCells.push(cell)
            }
            return cell
          }
        }

        this.columns.push(column)
        return column
      }
    }

    window.addEventListener('load', event => this[_initialize]())
  }

  [_defer](method, ...args) {
    if (this[_monitor].isInitialized && (this[_deferred].length === 0)) {
      this[method](...args)
    } else {
      this[_deferred].push({method, args})
    }
  }

  [_initialize]() {
    const monitor = this[_monitor]
    monitor.reset()
    const container = document.getElementById(this[_containerId])
    if (!container) {
      throw new Error(`Cannot find element (id: ${this[_containerId]})`)
    }
    monitor.container = container
    while (container.lastChild) {
      container.remove(container.lastChild)
    }

    let {
      alphabet,
      minCharStartDelay,
      maxCharStartDelay,
      minCharProgression,
      maxCharProgression,
      fadingDuration,
      width,
      height,
      paddingLeft,
      paddingTop,
      backgroundColor,
      fontColor,
      fadedFontColor,
      fadedOpacity,
      fontSize,
      fontFamily,
      fontWeight,
      cellWidth,
      cellHeight,
      horizontalSpacing,
      verticalSpacing
    } = this[_options]

    paddingTop = parseInt(paddingTop)
    paddingLeft = parseInt(paddingLeft)
    cellWidth = parseInt(cellWidth)
    cellHeight = parseInt(cellHeight)
    horizontalSpacing = parseInt(horizontalSpacing)
    verticalSpacing = parseInt(verticalSpacing)

    const alphabetLenght = alphabet.length
    const lastIndexOnRandom = alphabetLenght - 0.000001
    const getRandomChar = (except = null) => {
      const index = random(0, lastIndexOnRandom)
      let char = alphabet[index]
      if (except && (except === char)) {
        char = index !== 0 ? alphabet[0] : alphabet[1]
      }
      return char
    }

    Object.assign(container.style, {
      userSelect: 'none',
      position: 'relative',
      top: '0',
      left: '0',
      zIndex: '-1',
      overflow: 'hidden',
      display: 'flex',
      margin: '0',
      padding: '0',
      width: width + (typeof width === 'number' ? 'px' : ''),
      height: height + (typeof height === 'number' ? 'px' : ''),
      backgroundColor,
      color: fontColor,
      fontSize: fontSize + (typeof fontSize === 'number' ? 'px' : ''),
      fontFamily,
      fontWeight,
      textAlign: 'center'
    })

    width = container.clientWidth
    for (let x = paddingLeft; x < width; x += cellWidth + horizontalSpacing) {
      const divColumn = document.createElement('div')
      container.append(divColumn)
      Object.assign(divColumn.style, {
        position: 'absolute',
        top: paddingTop + 'px',
        left: x + 'px',
        width: cellWidth + 'px',
        height: 'calc(100% + ' + cellHeight + 'px)',
      })

      const column = monitor.addColumn(divColumn)

      height = divColumn.clientHeight
      for (let y = 0; y < height; y += cellHeight + verticalSpacing) {
        const divCell = document.createElement('div')
        divColumn.append(divCell)
        Object.assign(divCell.style, {
          position: 'absolute',
          top: y + 'px',
          left: '0',
          width: '100%',
          height: cellHeight + 'px',
          transitionTimingFunction: 'ease-out'
        })

        column.addCell(divCell)
      }
    }

    monitor.mainLoop = (mainLoopOptions = {}) => {
      let {
        clearScreen = false,
        charTable = [],
        ignoreColumns = []
      } = mainLoopOptions
      const charTableByColumn = []
      const tableLength = charTable.length
      if (!clearScreen && (tableLength > 0)) {
        for (let i = 0; i < tableLength; i++) {
          const row = charTable[i]
          if (!Array.isArray(row)) {
            continue
          }
          const rowLength = row.length
          for (let j = 0; j < rowLength; j++) {
            let column = charTableByColumn[j]
            if (!column) {
              column = charTableByColumn[j] = []
            }
            column[i] = row[j]
          }
        }
      }

      for (let i = 0, length = monitor.topCells.length; i < length; i++) {
        if (ignoreColumns.includes(i)) {
          continue
        }
        const topCell = monitor.topCells[i]
        const delay = random(minCharStartDelay, maxCharStartDelay)
        topCell.update.timer = setTimeout(monitor.createDroplet, delay,
          topCell, {clearScreen, charList: charTableByColumn[i]})
      }
    }
    
    monitor.createDroplet = (topCell, dropletOptions = {}) => {
      let {
        clearScreen = false,
        charList = []
      } = dropletOptions
      let progression = random(minCharProgression, maxCharProgression)
      let delay = 0
      let previousChar = null

      for (let cell = topCell, i = 0; cell; cell = cell.nextCell, i++) {
        let char
        if (clearScreen) {
          char = ''
        } else {
          char = charList[i]
          if (!char && (char !== '')) {
            char = getRandomChar(previousChar)
          }
        }
        previousChar = char

        const updateFunction = () => {
          const htmlElement = cell.htmlElement
          const style = htmlElement.style
          style.transitionDelay = '0ms'
          style.transitionDuration = '100ms'
          style.color = fontColor
          htmlElement.innerText = char
          cell.update.isUpdated = true
          style.opacity = 1
          // timeout needed to browser create CSS animation between opacities
          setTimeout(
            () => {
              style.transitionDelay = '100ms'
              style.transitionDuration = fadingDuration + 'ms'
              style.color = fadedFontColor
              style.opacity = fadedOpacity
            },
            200
          )
        }
        clearTimeout(cell.update.timer)
        const timer = setTimeout(updateFunction, delay)
        Object.assign(cell.update, {
          timer,
          function: updateFunction,
          delay,
          progression,
          nextChar: char,
          isUpdated: false
        })
        delay += progression
      }
    }

    monitor.isInitialized = true

    while (this[_deferred][0]) {
      const deferred = this[_deferred].shift()
      this[deferred.method](...deferred.args)
    }
  }

  setOptions(options) {
    Object.assign(this[_options], options)
  }

  start(options = {}) {
    this[_defer](_start, options)
  }
  [_start](options = {}) {
    let {
      initialDelay,
      mainLoopInterval,
      mainLoopDuration
    } = this[_options]
    if (options) {
      if (options.delay) {
        initialDelay = options.delay
      }
      if (options.duration) {
        mainLoopDuration = options.duration
      }
    }

    const monitor = this[_monitor]
    const timers = monitor.timers

    clearTimeout(timers.start)
    const startFunction = () => {
      clearInterval(timers.mainLoopInterval)
      monitor.mainLoop()
      timers.mainLoopInterval = setInterval(monitor.mainLoop, mainLoopInterval)
    }
    if (initialDelay > 0) {
      timers.start = setTimeout(startFunction, initialDelay)
    } else {
      startFunction()
    }
    if (typeof mainLoopDuration === 'number') {
      this[_stop]({delay: mainLoopDuration + initialDelay})
    }
  }

  pause(options = {}) {
    this[_defer](_pause, options)
  }
  [_pause](options = {}) {
    const {
      delay = 0,
      onlyTopCells = false,
      allAtOnce = false,
      minPauseDelay = 0,
      maxPauseDelay = 1000
    } = options
    const monitor = this[_monitor]
    const timers = monitor.timers

    const cellsToPause = onlyTopCells ? monitor.topCells : monitor.cells
    const pauseAtOnce = () => {
      for (const cell of cellsToPause) {
        clearTimeout(cell.update.timer)
      }
    }
    clearTimeout(timers.pause)
    timers.pause = setTimeout(
      () => {
        clearInterval(timers.mainLoopInterval)
        if (allAtOnce) {
          pauseAtOnce()
        } else {
          for (const cell of cellsToPause) {
            const cellDelay = random(minPauseDelay, maxPauseDelay)
            setTimeout(clearTimeout, cellDelay, cell.update.timer)
          }
          // needed this second one to make sure all cells will be paused
          setTimeout(pauseAtOnce, maxPauseDelay)
        }
      },
      delay
    )
  }

  resume(options = {}) {
    this[_defer](_resume, options)
  }
  [_resume](options = {}) {
    const {
      delay = 0,
      onlyTopCells = false
    } = options
    const monitor = this[_monitor]
    const timers = monitor.timers

    clearTimeout(timers.resume)
    const resumeFunction = () => {
      this[_start]()
      if (!onlyTopCells) {
        for (const topCell of monitor.topCells) {
          let cellDelay = 0
          for (let cell = topCell; cell; cell = cell.nextCell) {
            const update = cell.update
            if (update.isUpdated || !update.function) {
              continue
            }
            update.timer = setTimeout(update.function, cellDelay)
            cellDelay += update.progression
          }
        }
      }
    }
    if (delay > 0) {
      timers.resume = setTimeout(resumeFunction, delay)
    } else {
      resumeFunction()
    }
  }

  stop(options = {}) {
    this[_defer](_stop, options)
  }
  [_stop](options = {}) {
    let {
      delay = 0,
      clearScreen = false
    } = options
    const monitor = this[_monitor]
    const timers = monitor.timers
    clearTimeout(timers.stop)

    const stopFunction = () => {
      clearInterval(timers.mainLoopInterval)
      for (const cell of monitor.cells) {
        clearTimeout(cell.update.timer)
      }
      if (clearScreen) {
        for (const topCell of monitor.topCells) {
          const dropletDelay = random(200, 2000)
          setTimeout(monitor.createDroplet, dropletDelay, topCell,
            {clearScreen: true})
        }
      }
    }
    if (delay > 0) {
      timers.stop = setTimeout(stopFunction, delay)
    } else {
      stopFunction()
    }
  }

  draw(asciiImage, options = {}) {
    this[_defer](_draw, asciiImage, options)
  }
  [_draw](asciiImage, options = {}) {
    let {
      delay         = 1000,
      duration      = 30000,
      marginTop     = 2,
      paddingTop    = 1,
      marginBottom  = 2,
      paddingBottom = 1,
      marginRight   = 2,
      paddingRight  = 1,
      marginLeft    = 2,
      paddingLeft   = 1,
      paddingChar   = ''
    } = options

    if (!Array.isArray(asciiImage)) {
      if (typeof asciiImage !== 'string') {
        throw new Error(
          'ASCII image must be a string or a multidimensional array of rows by columns')
      }
      asciiImage = asciiImage.split(/\n/g).map(row => row.split(''))
    } else if (!Array.isArray(asciiImage[0])) {
      throw new Error(
        'ASCII image must be a string or a multidimensional array of rows by columns')
    }
    const monitor = this[_monitor]

    const imageWidth = Math.max(...asciiImage.map(row => row.length))
    const imageHeight = asciiImage.length
    const totalWidth = marginLeft + paddingLeft + imageWidth
      + paddingRight + marginRight
    const imageData = []
    for (let i = 0; i < marginTop; i++) {
      const row = new Array(totalWidth).fill(null)
      imageData.push(row)
    }
    for (let i = 0; i < paddingTop; i++) {
      let row = new Array(marginLeft).fill(null)
      row = row.concat(
        new Array(paddingLeft + imageWidth + paddingRight).fill(paddingChar),
        new Array(marginRight).fill(null))
      imageData.push(row)
    }
    for (let i = 0; i < imageHeight; i++) {
      let row = new Array(marginLeft).fill(null)
        .concat(new Array(paddingLeft).fill(paddingChar))

      for (let j = 0; j < imageWidth; j++) {
        const char = asciiImage[i][j]
        row.push(char || paddingChar)
      }

      row = row.concat(new Array(paddingRight).fill(paddingChar),
        new Array(marginRight).fill(null))
      imageData.push(row)
    }
    for (let i = 0; i < paddingBottom; i++) {
      let row = new Array(marginLeft).fill(null)
      row = row.concat(
        new Array(paddingLeft + imageWidth + paddingRight).fill(paddingChar),
        new Array(marginRight).fill(null))
      imageData.push(row)
    }
    for (let i = 0; i < marginBottom; i++) {
      const row = new Array(totalWidth).fill(null)
      imageData.push(row)
    }

    setTimeout(
      () => {
        this.pause({delay: 0, onlyTopCells: true})
        this.resume({delay: delay + duration})
        setTimeout(monitor.mainLoop, 1500, {charTable: imageData})
      },
      delay
    )
  }


  // sources: https://ascii.co.uk/art and http://www.ascii-art.de/ascii/
  static Image = class MatrixMonitorImage {

    // artist: unknown
    static ALIEN = `.     .       .  .   . .   .   . .    +  .
    .     .  :     .    .. :. .___---------___.
         .  .   .    .  :.:. _".^ .^ ^.  '.. :"-_. .
      .  :       .  .  .:../:            . .^  :.:\\.
          .   . :: +. :.:/: .   .    .        . . .:\\
   .  :    .     . _ :::/:               .  ^ .  . .:\\
    .. . .   . - : :.:./.                        .  .:\\
    .      .     . :..|:                    .  .  ^. .:|
      .       . : : ..||        .                . . !:|
    .     . . . ::. ::\\(                           . :)/
   .   .     : . : .:.|. ######              .#######::|
    :.. .  :-  : .:  ::|.#######           ..########:|
   .  .  .  ..  .  .. :\\ ########          :######## :/
    .        .+ :: : -.:\\ ########       . ########.:/
      .  .+   . . . . :.:\\. #######       #######..:/
        :: . . . . ::.:..:.\\           .   .   ..:/
     .   .   .  .. :  -::::.\\.       | |     . .:/
        .  :  .  .  .-:.":.::.\\             ..:/
   .      -.   . . . .: .:::.:.\\.           .:/
  .   .   .  :      : ....::_:..:\\   ___.  :/
     .   .  .   .:. .. .  .: :.:.:\\       :/
       +   .   .   : . ::. :.:. .:.|\\  .:/|
       .         +   .  .  ...:: ..|  --.:|
  .      . . .   .  .  . ... :..:.."(  ..)"
   .   .       .      :  .   .: ::/  .  .::\\`


   static SKULL = `         _,.-------.,_
    ,;~'             '~;,
  ,;                     ;,
 ;                         ;
,'                         ',
,;                           ;,
; ;      .           .      ; ;
| ;   ______       ______   ; |
|  \`/~"     ~" . "~     "~\\'  |
|  ~  ,-~~~^~, | ,~^~~~-,  ~  |
|   |        }:{        |   |
|   l       / | \\       !   |
.~  (__,.--" .^. "--.,__)  ~.
|     ---;' / | \\ \`;---     |
 \\__.       \\/^\\/       .__/
  V| \                 / |V
   | |T~\___!___!___/~T| |
   | |\`IIII_I_I_I_IIII'| |
   |  \\,III I I I III,/  |
    \\   \`~~~~~~~~~~'    /
      \\   .       .   /
        \\.    ^    ./
          ^~~~^~~~^
                dcau (4/15/95)`
  }
}
