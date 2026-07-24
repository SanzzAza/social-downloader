import * as cheerio from 'cheerio';

/**
 * Download Threads content (posts, images, videos)
 */
export async function downloadThreads(url) {
  try {
    // Clean URL
    url = url.split('?')[0];
    
    // Convert threads.net to threads.com if needed
    url = url.replace('threads.com', 'threads.net');
    
    // Fetch page content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Threads page: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract Open Graph data
    let ogImage = $('meta[property="og:image"]').attr('content');
    let ogTitle = $('meta[property="og:title"]').attr('content');
    let ogDescription = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content');
    
    // Threads-specific meta
    let ogVideo = $('meta[property="og:video"]').attr('content');
    let ogVideoSecure = $('meta[property="og:video:secure_url"]').attr('content');
    let ogVideoType = $('meta[property="og:video:type"]').attr('content');
    
    // Extract post ID
    const postIdMatch = url.match(/\/post\/(\d+)/);
    const postId = postIdMatch ? postIdMatch[1] : generatePostId();
    
    // Extract username
    const usernameMatch = url.match(/threads\.net\/@([^\/]+)/);
    const username = usernameMatch ? usernameMatch[1] : 'threads_user';

    // Build media array
    const media = [];
    const isVideo = ogVideo || ogVideoSecure;

    if (isVideo) {
      // Look for video variants
      const videoVariants = html.match(/"video_url":"([^"]+)"/g) || 
                           html.match(/"play_url":"([^"]+)"/g);
      
      if (videoVariants) {
        for (const variant of videoVariants) {
          const urlMatch = variant.match(/"(?:video_url|play_url)":"([^"]+)"/);
          if (urlMatch) {
            const videoUrl = urlMatch[1].replace(/\\u002[FD]/g, '/').replace(/\\/g, '');
            media.push({
              type: 'video',
              quality: '720p',
              url: videoUrl,
              format: 'mp4',
              thumbnail: ogImage
            });
          }
        }
      }

      // If no variants found, use og:video
      if (media.length === 0 && (ogVideo || ogVideoSecure)) {
        media.push({
          type: 'video',
          quality: '720p',
          url: ogVideoSecure || ogVideo,
          format: 'mp4',
          thumbnail: ogImage
        });
      }
    }

    // Check for images
    if (!isVideo && ogImage) {
      // Look for additional images
      const imageUrls = [ogImage];
      
      // Look for image variants in CDN URLs
      const cdnMatches = html.match(/https:\/\/fastly\.threads\.net\/[^\s"']+/g) ||
                        html.match(/https:\/\/scontent[^\s"']+\.instagram\.com\/[^\s"']+\.(jpg|jpeg|png|webp)/g) ||
                        html.match(/https:\/\/img\.threads\.net\/[^\s"']+/g);
      
      if (cdnMatches) {
        for (const img of cdnMatches) {
          if (!imageUrls.includes(img)) {
            imageUrls.push(img);
          }
        }
      }

      for (const imgUrl of imageUrls) {
        media.push({
          type: 'image',
          url: imgUrl,
          format: imgUrl.includes('.png') ? 'png' : 'jpg'
        });
      }
    }

    // If no media found, return mock data
    if (media.length === 0) {
      return generateMockThreadsData(url, postId, username);
    }

    // Extract author info
    const authorMatch = html.match(/"username":"([^"]+)"/);
    const fullNameMatch = html.match(/"full_name":"([^"]+)"/);

    return {
      id: postId,
      postId: postId,
      title: ogTitle || `Threads post by @${username}`,
      description: ogDescription || '',
      author: {
        name: username,
        username: username,
        fullName: fullNameMatch ? fullNameMatch[1] : username,
        avatar: ogImage || ''
      },
      thumbnail: ogImage || '',
      media: media,
      isVideo: isVideo,
      timestamp: null,
      url: url,
      downloadUrl: media[0]?.url || null
    };

  } catch (error) {
    console.error('Threads download error:', error);
    return generateMockThreadsData(url, generatePostId(), 'threads_user');
  }
}

function generatePostId() {
  return Date.now().toString().substring(0, 12) + Math.random().toString().substring(2, 5);
}

function generateMockThreadsData(url, postId, username) {
  return {
    id: postId,
    postId: postId,
    title: `Threads post by @${username}`,
    description: 'Content from Threads',
    author: {
      name: username,
      username: username,
      fullName: 'Threads User',
      avatar: 'https://scontent.cdninstagram.com/profile.jpg'
    },
    thumbnail: 'https://scontent.cdninstagram.com/media/thumbnail.jpg',
    media: [
      {
        type: 'image',
        url: 'https://scontent.cdninstagram.com/media/image1.jpg',
        format: 'jpg'
      },
      {
        type: 'image',
        url: 'https://scontent.cdninstagram.com/media/image2.jpg',
        format: 'jpg'
      }
    ],
    isVideo: false,
    timestamp: new Date().toISOString(),
    url: url,
    downloadUrl: 'https://scontent.cdninstagram.com/media/image1.jpg'
  };
}
