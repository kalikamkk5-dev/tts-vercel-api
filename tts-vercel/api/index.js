import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Lame from 'node-lame';

const app = express();
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/tts', async (req, res) => {
  try {
    const { text, voice = 'Kore' } = req.body;  // voice اختیاری
    if (!text) {
      return res.status(400).json({ error: 'Text required' });
    }

    // تولید PCM از Gemini
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
    const pcmBuffer = Buffer.from(audioData, 'base64');  // Raw PCM: 16-bit, 24kHz, mono

    // تبدیل به MP3
    const encoder = new Lame.Encoder({
      channels: 1,        // mono
      sampleRate: 24000,  // 24kHz
      bitDepth: 16,       // 16-bit
      bitrate: 128,       // kbps (کیفیت متوسط، حجم کم)
    });

    const mp3Buffer = encoder.encode(pcmBuffer);

    // سوئیچ بر اساس ?format=base64 (default: stream)
    const format = req.query.format || 'stream';
    if (format === 'base64') {
      const mp3Base64 = mp3Buffer.toString('base64');
      res.json({ audio: mp3Base64, format: 'mp3' });
    } else {
      res.set('Content-Type', 'audio/mp3');
      res.set('Content-Disposition', 'attachment; filename="tts-audio.mp3"');
      res.send(mp3Buffer);  // Stream binary MP3
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'TTS API ready! POST to /tts with { "text": "..." }' });
});

export default app;  // Vercel این رو wrap می‌کنه