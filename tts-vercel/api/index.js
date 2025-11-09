const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Lame = require('node-lame');

const app = express();
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/tts', async (req, res) => {
  try {
    const { text, voice = 'Kore' } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text required' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-tts' });
    const result = await model.generateContent({
      contents: [{ parts: [{ text }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
        },
      },
    });

    const audioData = result.response.candidates[0].content.parts[0].inlineData.data;
    const pcmBuffer = Buffer.from(audioData, 'base64');

    const encoder = new Lame.Encoder({
      channels: 1,
      sampleRate: 24000,
      bitDepth: 16,
      bitrate: 128,
    });

    const mp3Buffer = encoder.encode(pcmBuffer);

    const format = req.query.format || 'stream';
    if (format === 'base64') {
      const mp3Base64 = mp3Buffer.toString('base64');
      res.json({ audio: mp3Base64, format: 'mp3' });
    } else {
      res.set('Content-Type', 'audio/mp3');
      res.set('Content-Disposition', 'attachment; filename="tts-audio.mp3"');
      res.send(mp3Buffer);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/', (req, res) => {
  res.json({ message: 'TTS API ready! POST to /tts with { "text": "..." }' });
});

module.exports = app;  // CommonJS export
