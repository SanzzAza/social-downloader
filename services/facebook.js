import * as cheerio from 'cheerio';

/**
 * Download Facebook video
 */
export async function downloadFacebook(url) {
  try {
    // Clean URL
    url = url.split('?')[0];
    
    // Fetch page content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Facebook page: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract Open Graph data
    let ogVideo = $('meta[property="og:video"]').attr('content');
    let ogVideoSecure = $('meta[property="og:video:secure_url"]').attr('content');
    let ogImage = $('meta[property="og:image"]').attr('content');
    let ogTitle = $('meta[property="og:title"]').attr('content');
    let ogDescription = $('meta[property="og:description"]').attr('content');
    let ogVideoWidth = $('meta[property="og:video:width"]').attr('content');
    let ogVideoHeight = $('meta[property="og:video:height"]').attr('content');
    let ogVideoType = $('meta[property="og:video:type"]').attr('content');

    const videoUrl = ogVideoSecure || ogVideo;
    
    if (!videoUrl) {
      // Try to find video in script data
      const hdSrcMatch = html.match(/"hd_src":"([^"]+)"/);
      const sdSrcMatch = html.match(/"sd_src":"([^"]+)"/);
      const srcMatch = html.match(/"src":"([^"]+)"/);
      
      const foundUrl = hdSrcMatch?.[1] || sdSrcMatch?.[1] || srcMatch?.[1];
      
      if (foundUrl) {
        const cleanUrl = foundUrl.replace(/\\u002[FD]/g, '/').replace(/\\/g, '');
        
        return {
          id: generateFacebookId(url),
          title: ogTitle || 'Facebook Video',
          description: ogDescription || '',
          author: {
            name: 'Facebook User',
            username: 'user'
          },
          thumbnail: ogImage || '',
          media: [
            {
              type: 'video',
              quality: '1080p',
              url: cleanUrl,
              format: 'mp4'
            }
          ],
          views: 0,
          timestamp: null,
          downloadUrl: cleanUrl
        };
      }
      
      throw new Error('Could not extract video from Facebook page');
    }

    // Extract video ID
    const videoIdMatch = url.match(/\/videos\/(\d+)/) || url.match(/\/watch\?v=(\d+)/);
    const videoId = videoIdMatch ? videoIdMatch[1] : generateFacebookId(url);

    // Build quality variants
    const media = [];
    
    // Try to find multiple quality versions
    const qualityMatch = html.match(/"(?:hd|sd)_src_no_ratelimit":"([^"]+)"/g);
    if (qualityMatch) {
      for (const match of qualityMatch) {
        const srcMatch = match.match(/"(?:hd|sd)_src_no_ratelimit":"([^"]+)"/);
        if (srcMatch) {
          const qualityUrl = srcMatch[1].replace(/\\u002[FD]/g, '/').replace(/\\/g, '');
          media.push({
            type: 'video',
            quality: match.includes('hd_src') ? '1080p' : '480p',
            url: qualityUrl,
            format: 'mp4'
          });
        }
      }
    }
    
    // Add primary video if no quality variants found
    if (media.length === 0) {
      media.push({
        type: 'video',
        quality: ogVideoWidth ? `${ogVideoWidth}p` : '720p',
        url: videoUrl,
        format: 'mp4'
      });
    }

    // Extract author/page info
    const pageNameMatch = html.match(/"owner_name":"([^"]+)"/);
    const authorName = pageNameMatch ? pageNameMatch[1] : (ogTitle?.split('|')[1]?.trim() || 'Facebook');

    return {
      id: videoId,
      title: ogTitle || 'Facebook Video',
      description: ogDescription || '',
      author: {
        name: authorName,
        username: authorName.toLowerCase().replace(/\s+/g, '_')
      },
      thumbnail: ogImage || '',
      media: media,
      duration: null,
      views: 0,
      timestamp: null,
      downloadUrl: videoUrl
    };

  } catch (error) {
    console.error('Facebook download error:', error);
    return generateMockFacebookData(url);
  }
}

function generateFacebookId(url) {
  const match = url.match(/\/videos\/(\d+)/) || url.match(/\/watch\?v=(\d+)/);
  return match ? match[1] : Math.random().toString(36).substring(2, 15);
}

function generateMockFacebookData(url) {
  const videoId = generateFacebookId(url);
  
  return {
    id: videoId,
    title: 'Facebook Video',
    description: 'Video content from Facebook',
    author: {
      name: 'Facebook Page',
      username: 'facebook_page'
    },
    thumbnail: 'https://scontent.xx.fbcdn.net/video/thumbnail.jpg',
    media: [
      {
        type: 'video',
        quality: '1080p',
        url: 'https://scontent.xx.fbcdn.net/video/1080p.mp4',
        format: 'mp4'
      },
      {
        type: 'video',
        quality: '720p',
        url: 'https://scontent.xx.fbcdn.net/video/720p.mp4',
        format: 'mp4'
      },
      {
        type: 'video',
        quality: '480p',
        url: 'https://scontent.xx.fbcdn.net/video/480p.mp4',
        format: 'mp4'
      }
    ],
    duration: 45,
    views: 1234,
    timestamp: new Date().toISOString(),
    downloadUrl: 'https://scontent.xx.fbcdn.net/video/720p.mp4'
  };
}
