const colors = require('colors/safe');
const osc = require('osc');
const internalIp = require('internal-ip');
const WebSocket = require('ws'); // WebSocket client library

class InOSC {
    constructor(output) {
        this.port = 1240; // OSC listening port
        this.mps = 0; // Messages per second counter

        console.log(colors.cyan('Starting OSC receiver on port ' + this.port));

        // Setup the OSC UDP Port
        this._udpPort = new osc.UDPPort({
            localAddress: internalIp.v4.sync(),
            localPort: this.port,
            metadata: true
        });

        this._udpPort.on('error', function (error) {
            console.error(colors.red('OSC Error:'), error);
        });

        this._udpPort.open();

        // Setup WebSocket connection to Social Stream.Ninja
        const sessionID = "KmGi8jcnjL"; // Your Social Stream.Ninja session ID
        const inChannel = "default";    // Input channel
        const outChannel = "default";   // Output channel

        this.ws = new WebSocket(`wss://io.socialstream.ninja/join/${sessionID}/${inChannel}/${outChannel}`);

        this.ws.on('open', function () {
            console.log(colors.green('WebSocket connection established'));
        });

        this.ws.on('error', function (error) {
            console.error(colors.red('WebSocket Error:'), error);
        });

        // Handle incoming OSC messages
        this._udpPort.on('message', this.handleOSCMessage.bind(this));

        // Log messages per second
        setInterval(() => {
            if (this.mps > 0) console.log('Received ' + this.mps + ' messages');
            this.mps = 0;
        }, 1000);
    }

    // Translate OSC to WebSocket
    handleOSCMessage(oscMsg) {
        const args = oscMsg.args.map(arg => arg.value); // Extract OSC arguments
        let websocketMessage = null;

        // Map OSC messages to Social Stream.Ninja WebSocket commands
        if (oscMsg.address === '/zoom/userName/chat') {
            // Send a chat message to a specific user
            websocketMessage = {
                action: 'message',
                target: args[0],  // Target user (e.g., "John Doe")
                message: args[1] // Chat message (e.g., "Hello, John!")
            };
        } else if (oscMsg.address === '/zoom/chatAll') {
            // Send a chat message to everyone
            websocketMessage = {
                action: 'message',
                target: 'all',    // Target all participants
                message: args[0] // Chat message (e.g., "Good morning!")
            };
        } else if (oscMsg.address.startsWith('/zoomosc/user/chat')) {
            // Handle incoming chat messages from ZoomOSC
            console.log(colors.blue(`Chat received from ${args[1]}: ${args[4]}`));
        } else {
            console.log(colors.yellow(`Unhandled OSC address: ${oscMsg.address}`));
        }

        // Send the WebSocket message
        if (websocketMessage) {
            this.ws.send(JSON.stringify(websocketMessage), err => {
                if (err) console.error(colors.red('WebSocket Send Error:'), err);
            });
        }

        this.mps++; // Increment the message counter
    }
}

module.exports.InOSC = InOSC;

// Start the server
if (require.main === module) {
    const server = new InOSC();
}