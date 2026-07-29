export default async function handler(req, res) {
  const { text, voice } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  // Default voice to Jessie (en_us_001) if not provided
  const selectedVoice = voice || 'en_us_001';

  try {
    const response = await fetch('https://tiktok-tts.weilnet.workers.dev/api/generation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        voice: selectedVoice,
      }),
    });

    const data = await response.json();

    if (data.success) {
      // The API returns base64 encoded audio
      res.status(200).json({ 
        success: true, 
        data: data.data // This is the base64 string
      });
    } else {
      res.status(500).json({ error: data.error || 'Failed to generate speech' });
    }
  } catch (error) {
    console.error('TTS Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
