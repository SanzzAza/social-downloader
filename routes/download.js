import express from 'express';
import { downloadTikTok } from '../services/tiktok.js';
import { downloadInstagram } from '../services/instagram.js';
import { downloadFacebook } from '../services/facebook.js';
import { downloadTwitter } from '../services/twitter.js';
import { downloadThreads } from '../services/threads.js';

const router = express.Router();

// Platform detection patterns
const platformPatterns = {
  tiktok: /tiktok\.com|vm\.tiktok\.com/i,
  instagram: /instagram\.com/i,
  facebook: /facebook\.com|fb\.watch/i,
  twitter: /twitter\.com|x\.com/i,
  threads: /threads\.net|threads\.com/i
};

// Detect platform from URL
function detectPlatform(url) {
  for (const [platform, pattern] of Object.entries(platformPatterns)) {
    if (pattern.test(url)) {
      return platform;
    }
  }
  return null;
}

// Validate URL format
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

// POST /api/download - Main download endpoint
router.post('/download', async (req, res) => {
  try {
    const { url, platform: platformParam } = req.body;

    // Validate URL
    if (!url) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_URL',
          message: 'URL is required'
        }
      });
    }

    if (!isValidUrl(url)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_URL',
          message: 'The provided URL is not a valid URL format'
        }
      });
    }

    // Detect or use provided platform
    let platform = platformParam?.toLowerCase();
    
    if (!platform) {
      platform = detectPlatform(url);
      
      if (!platform) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'UNKNOWN_PLATFORM',
            message: 'Could not detect platform from URL. Please specify the platform parameter.',
            supported: ['tiktok', 'instagram', 'facebook', 'twitter', 'threads']
          }
        });
      }
    }

    // Validate platform
    const supportedPlatforms = ['tiktok', 'instagram', 'facebook', 'twitter', 'threads'];
    if (!supportedPlatforms.includes(platform)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'UNSUPPORTED_PLATFORM',
          message: `Platform "${platform}" is not supported`,
          supported: supportedPlatforms
        }
      });
    }

    // Route to appropriate downloader
    let result;
    
    switch (platform) {
      case 'tiktok':
        result = await downloadTikTok(url);
        break;
      case 'instagram':
        result = await downloadInstagram(url);
        break;
      case 'facebook':
        result = await downloadFacebook(url);
        break;
      case 'twitter':
        result = await downloadTwitter(url);
        break;
      case 'threads':
        result = await downloadThreads(url);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: {
            code: 'UNSUPPORTED_PLATFORM',
            message: 'This platform is not supported yet'
          }
        });
    }

    // Return success response
    return res.json({
      success: true,
      platform: platform,
      timestamp: new Date().toISOString(),
      data: result
    });

  } catch (error) {
    console.error('Download error:', error);
    
    return res.status(500).json({
      success: false,
      error: {
        code: 'DOWNLOAD_FAILED',
        message: error.message || 'Failed to download content'
      }
    });
  }
});

// GET /api/platforms - List supported platforms
router.get('/platforms', (req, res) => {
  res.json({
    success: true,
    platforms: [
      {
        name: 'TikTok',
        slug: 'tiktok',
        patterns: ['tiktok.com', 'vm.tiktok.com'],
        features: ['Video', 'No Watermark Option']
      },
      {
        name: 'Instagram',
        slug: 'instagram',
        patterns: ['instagram.com'],
        features: ['Reels', 'Posts', 'Stories', 'IGTV']
      },
      {
        name: 'Facebook',
        slug: 'facebook',
        patterns: ['facebook.com', 'fb.watch'],
        features: ['Videos', 'Public Posts']
      },
      {
        name: 'Twitter/X',
        slug: 'twitter',
        patterns: ['twitter.com', 'x.com'],
        features: ['Videos', 'Images', 'GIFs']
      },
      {
        name: 'Threads',
        slug: 'threads',
        patterns: ['threads.net', 'threads.com'],
        features: ['Posts', 'Images', 'Videos']
      }
    ]
  });
});

export default router;
