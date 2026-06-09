const micBtn = document.getElementById("mic-btn");
const statusText = document.getElementById("status");
const transcriptDiv = document.getElementById("transcript");

let ws;
let audioContext;
let processor;
let localStream;

const server = "elixir"; // Change to "node" to test against Node.js proxy instead of Elixir/Phoenix

micBtn.addEventListener("click", async () => {
  if (ws) {
    stopStreaming();
    return;
  }

  try {
    statusText.innerText = "Authenticating with app backend...";

    // 1. Hit your own Node.js server, NOT the proxy
    const tokenResponse = await fetch(
      "http://localhost:3000/api/session-init",
      { method: "POST" },
    );
    if (!tokenResponse.ok) throw new Error("Backend authentication failed");

    const { token } = await tokenResponse.json();

    statusText.innerText = "Connecting to secure voxon stream...";

    // 2. Connect the WebSocket directly to Voxon using the token
    // (Change localhost:4000 to your fly.dev URL when deploying)
    ws = new WebSocket(`ws://localhost:4000/stream/websocket?token=${token}`);

    ws.onopen = async () => {
      statusText.innerText = "Connected! Listening...";
      micBtn.innerText = "Stop Streaming";

      await startAudioRecording();
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("Mistral Event:", data);

      // Mistral uses transcription.text.delta or transcription.segment
      if (data.type === "transcription.text.delta") {
        transcriptDiv.innerText += data.delta?.text || data.text || "";
      } else if (data.type === "transcription.segment") {
        // Some models push full segments instead of deltas
        transcriptDiv.innerText +=
          "\n" + (data.segment?.text || data.text || "");
      } else if (data.type === "error") {
        console.error("Mistral returned an error:", data);
      }
    };

    ws.onclose = () => {
      stopStreaming();
    };
  } catch (err) {
    console.error(err);
    statusText.innerText = `Error: ${err.message}`;
  }
});

async function startAudioRecording() {
  localStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: false,
  });
  audioContext = new (window.AudioContext || window.webkitAudioContext)({
    sampleRate: 16000,
  });

  const source = audioContext.createMediaStreamSource(localStream);
  processor = audioContext.createScriptProcessor(4096, 1, 1);

  source.connect(processor);
  processor.connect(audioContext.destination);

  processor.onaudioprocess = (e) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const inputData = e.inputBuffer.getChannelData(0);
    // Quick local conversion from Float32 to Int16 Int Array
    const pcmData = new Int16Array(inputData.length);
    for (let i = 0; i < inputData.length; i++) {
      pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7fff;
    }

    // Convert byte buffer to base64 string
    const base64Audio = btoa(
      String.fromCharCode(...new Uint8Array(pcmData.buffer)),
    );

    // Package frame into Mistral input_audio.append schema
    ws.send(
      JSON.stringify({
        type: "input_audio.append",
        audio: base64Audio,
      }),
    );
  };
  statusText.innerText = "Streaming Mic Live to Mistral!";
}

function stopStreaming() {
  statusText.innerText = "Disconnected";
  micBtn.innerText = "Start Streaming Mic";

  if (processor) processor.disconnect();
  if (audioContext) audioContext.close();
  if (localStream) localStream.getTracks().forEach((track) => track.stop());
  if (ws) {
    ws.close();
    ws = null;
  }
}
