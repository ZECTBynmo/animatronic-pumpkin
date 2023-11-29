// src/App.js
import React from 'react'
import { GamepadListener, gamepad } from 'gamepad.js'

class App extends React.Component {
  constructor() {
    super()
    
    this.state = {
      recentEvent: 'none'
    }
  }

  componentDidMount() {
    const ws = new WebSocket('ws://localhost:4444')
    ws.onopen = () => {
      console.log('WebSocket connection opened.');
    };

    ws.onmessage = (event) => {
      console.log(`Received: ${event.data}`);
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed.');
    };

    const gamepad = new GamepadListener(/* options*/);

    gamepad.on('gamepad:button', this.streamEvent.bind(this))
    gamepad.on('gamepad:axis', this.streamEvent.bind(this))

    gamepad.on('gamepad:connected', event => {
      console.log("GAMEPAD CONNECTED", event)
      const {
          index, // Gamepad index: Number [0-3].
          gamepad, // Native Gamepad object.
      } = event.detail;
    })

    gamepad.start()

    this.setState({
      ws: ws,
      gamepad: gamepad
    })
  }

  streamEvent(event) {
    this.state.ws.send(JSON.stringify(event))
  }

  render() {
    return (
      <div>
        <h1>SPOOKY EYES!</h1>
        <b>Most Recent Event:</b>
        <p>{this.state.recentEvent}</p>
      </div>
    )
  }
}

export default App
