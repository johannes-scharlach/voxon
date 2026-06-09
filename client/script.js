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

  if (server === "node") {
    statusText.innerText = "Connecting to Node proxy...";
    ws = new WebSocket("ws://localhost:8080");
  } else {
    statusText.innerText = "Connecting to Elixir...";
    ws = new WebSocket(`ws://localhost:4000/stream/websocket`);
  }

  ws.onopen = async () => {
    statusText.innerText = "Connected. Initializing session...";
    micBtn.innerText = "Stop Streaming";

    // We do not need to send session.create; Mistral will send session.created to us.
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
      transcriptDiv.innerText += "\n" + (data.segment?.text || data.text || "");
    } else if (data.type === "error") {
      console.error("Mistral returned an error:", data);
    }
  };

  ws.onclose = () => {
    stopStreaming();
  };
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
