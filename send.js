const WebSocket = require('ws'); // For WebSocket communication
const osc = require('osc'); // For OSC communication

// Connect to Social Stream Ninja
const ws = new WebSocket("wss://io.socialstream.ninja");

// OSC UDP Port Configuration
const oscPort = new osc.UDPPort({
    localAddress: "0.0.0.0",
    localPort: 57121,
    remoteAddress: "127.0.0.1",
    remotePort: 57120,
});

oscPort.open();

ws.onopen = () => {
    console.log("Connected to Social Stream Ninja WebSocket");

    // Join the session and channels
    ws.send(JSON.stringify({
        join: "KmGi8jcnjL", // Replace with your session ID
        in: 1, // Channel to receive messages
        out: 1, // Channel to send messages
    }));
};

ws.onmessage = (event) => {
    try {
        const message = JSON.parse(event.data);

        if (message.action === "sendChat") {
            console.log("Received chat message:", message);

            // Extract username and chat message
            const username = message.chatname; // Assuming `chatname` field holds the username
            const chatMessage = message.value; // Assuming `value` field holds the message content

            // Construct the OSC message
            const oscMessage = `/zoom/${username}/chat "${username}" "${chatMessage}"`;

            // Send OSC message to ZoomOSC
            oscPort.send({
                address: `/zoom/${username}/chat`,
                args: [
                    { type: "s", value: username },
                    { type: "s", value: chatMessage }
                ],
            });

            console.log(`Sent OSC message: ${oscMessage}`);
        }
    } catch (error) {
        console.error("Error processing message:", error);
    }
};

ws.onclose = () => {
    console.log("WebSocket connection closed");
};

ws.onerror = (error) => {
    console.error("WebSocket error:", error);
};