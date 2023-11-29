const http = require('http')
const path = require('path')
const express = require('express')
const WebSocket = require('ws')
const {SerialPort} = require('serialport')
const { clearInterval } = require('timers')

const app = express();
const port = process.env.PORT || 4444

const server = http.createServer(app)
const wss = new WebSocket.Server({server})

let recentEvents = {
  'gamepad:axis/0/0': {event: {detail: {value: 0}}},  // Left Horizontal
  'gamepad:axis/0/1': {event: {detail: {value: 0}}},  // Left Vertical
  'gamepad:button/0/6': {event: {detail: {value: 0}}},  // Left Vertical
  'gamepad:button/0/7': {event: {detail: {value: 0}}},  // Left Vertical
  lights: {
    red: 255,
    green: 40,
    blue: 60,
  }
}

function clampNumber(num, min, max) {
  return Math.min(Math.max(num, min), max);
}

let squintCount = 0
let openWideCount = 0
let currentVertical = 0
let currentHorizontal = 0

const MAX_OPEN_WIDE_COUNT = 15
const MAX_SQUINT_COUNT = 20

const updatePositions = async () => {
  
  let shouldBlink = Math.random() > 0.95
  let shouldOpenWide = Math.random() > 0.98
  let shouldSquint = Math.random() > 0.99
  let shouldWink = Math.random() > 0.97

  let shouldMove = Math.random() > 0.8
  let shouldLookStraight = Math.random() > 0.8

  if (openWideCount > 0 && openWideCount < MAX_OPEN_WIDE_COUNT) {
    shouldWink = false
    shouldMove = false
    shouldBlink = false
    shouldOpenWide = true
  } else if (openWideCount > MAX_OPEN_WIDE_COUNT) {
    openWideCount = 0
  }

  if (squintCount > 0 && squintCount < MAX_SQUINT_COUNT) {
    shouldWink = false
    shouldBlink = false
    shouldSquint = true
  } else if (squintCount > MAX_SQUINT_COUNT) {
    squintCount = 0
  }  
  
  if (shouldLookStraight) {
    console.log("LOOKING STRAIGHT")

    currentVertical = 0
    currentHorizontal = 0

    // recentEvents['gamepad:axis/0/0'] = {event: {detail: {value: 0}}}
    // recentEvents['gamepad:axis/0/1'] = {event: {detail: {value: 0}}}
  } else {
    const randomVertical = 0.5 * Math.random() - 0.25
    const randomHorizontal = 0.5 * Math.random() - 0.25

    currentVertical = clampNumber(currentVertical + randomVertical, -.8, .8)
    currentHorizontal = clampNumber(currentHorizontal + randomHorizontal, -.8, .8)

    console.log("SETTING RANDOM VALUE", randomHorizontal)
  }

  if (shouldMove) {
    recentEvents['gamepad:axis/0/0'] = {event: {detail: {value: currentVertical}}}
    recentEvents['gamepad:axis/0/1'] = {event: {detail: {value: currentHorizontal}}}
  }

  recentEvents.lights = {red: 255, green: 117, blue: 24}

  if (shouldBlink) {
    console.log("BLINKING")
    recentEvents['gamepad:button/0/6'] = {event: {detail: {value: 1}}}
    recentEvents['gamepad:button/0/7'] = {event: {detail: {value: 1}}}
  } else if (shouldOpenWide) {
    recentEvents.lights = {red: 255, green: 0, blue: 0}
    recentEvents['gamepad:button/0/6'] = {event: {detail: {value: -1}}}
    recentEvents['gamepad:button/0/7'] = {event: {detail: {value: -1}}}
    openWideCount += 1
    console.log("OPEN WIDE", openWideCount)
  } else if (shouldSquint) {
    recentEvents.lights = {red: 0, green: 0, blue: 255}
    recentEvents['gamepad:button/0/6'] = {event: {detail: {value: 0.5}}}
    recentEvents['gamepad:button/0/7'] = {event: {detail: {value: 0.5}}}
    squintCount += 1
  } else if (shouldWink) {
    console.log("SQUINTING")
    const winkLeftEye = Math.random() > 0.5
    if (winkLeftEye) {
      recentEvents['gamepad:button/0/6'] = {event: {detail: {value: 1}}}
      recentEvents['gamepad:button/0/7'] = {event: {detail: {value: 0}}}
    } else {
      recentEvents['gamepad:button/0/6'] = {event: {detail: {value: 0}}}
      recentEvents['gamepad:button/0/7'] = {event: {detail: {value: 1}}}
    }
  } else {
    recentEvents['gamepad:button/0/6'] = {event: {detail: {value: 0}}}
    recentEvents['gamepad:button/0/7'] = {event: {detail: {value: 0}}}
  }

  const nextUpdate = Math.random() * 100
  nextUpdateTimout = setTimeout(updatePositions, nextUpdate)
}

let nextUpdateTimout = setTimeout(updatePositions, Math.random())

wss.on('connection', (ws) => {
  console.log('WebSocket client connected.');

  // Handle messages from WebSocket clients
  ws.on('message', (message) => {
    // console.log(`Received: ${message}`);
    const event = JSON.parse(message.toString())
    const eventKey = `${event.type}/${event.detail.index}/${event.detail.axis === undefined ? event.detail.button : event.detail.axis}`
    // console.log("GOT EVENT", eventKey)
    recentEvents[eventKey] = {time: new Date().getTime, event: event}
  })

  // Handle WebSocket client disconnect
  ws.on('close', () => {
    console.log('WebSocket client disconnected.')
  })
})

app.use(express.static(path.join(__dirname, 'public')))

app.get('/status', (req, res) => {
  res.json({ok: true})
})

app.get('/positions', (req, res) => {
  // console.log("GET POSITIONS", JSON.stringify(recentEvents, null, 2))
  res.json(recentEvents)
})

server.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`)
})