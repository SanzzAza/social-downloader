export default async function handler(req, res) {
  const { prompt, width, height, seed, model } = req.query;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  // We can use pollinations.ai as a free, no-key provider
  // Format: https://pollinations.ai/p/{prompt}?width={width}&height={height}&seed={seed}&model={model}
  
  const encodedPrompt = encodeURIComponent(prompt);
  const w = width || 1024;
  const h = height || 1024;
  const s = seed || Math.floor(Math.random() * 1000000);

  // Updated URL format for pollinations.ai
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${w}&height=${h}&seed=${s}&nologo=true`;

  try {
    // We return the URL so the frontend can display it
    res.status(200).json({ 
      success: true, 
      imageUrl: imageUrl,
      seed: s
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate image' });
  }
}
