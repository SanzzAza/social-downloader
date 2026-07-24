/**
 * Social Downloader API - Frontend Application
 */

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

// Format JSON with syntax highlighting
function formatJSON(json) {
  if (typeof json === 'string') {
    try {
      json = JSON.parse(json);
    } catch (e) {
      return escapeHtml(json);
    }
  }
  
  const formatted = JSON.stringify(json, null, 2);
  return highlightedJSON(formatted);
}

// Syntax highlight JSON
function highlightedJSON(json) {
  return json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    function (match) {
      let cls = 'json-number';
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'json-key';
          // Remove the colon for display
          match = match.slice(0, -1) + '<span class="json-punct">:</span>';
        } else {
          cls = 'json-string';
        }
      } else if (/true|false/.test(match)) {
        cls = 'json-boolean';
      } else if (/null/.test(match)) {
        cls = 'json-null';
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Show response in viewer
function showResponse(data, isError = false) {
  const viewer = document.getElementById('responseContent');
  const borderColor = isError ? 'var(--error)' : 'var(--accent)';
  
  if (isError) {
    viewer.innerHTML = `<span class="json-error">${highlightedJSON(JSON.stringify(data, null, 2))}</span>`;
  } else {
    viewer.innerHTML = highlightedJSON(JSON.stringify(data, null, 2));
  }
  
  // Add error styling if needed
  if (isError) {
    document.querySelector('.response-viewer').style.borderLeft = `4px solid var(--error)`;
  } else {
    document.querySelector('.response-viewer').style.borderLeft = `4px solid var(--accent)`;
  }
}

// Show loading state
function setLoading(loading) {
  const form = document.getElementById('downloadForm');
  const submitBtn = document.getElementById('submitBtn');
  
  if (loading) {
    form.classList.add('loading');
    submitBtn.disabled = true;
    submitBtn.querySelector('.btn-text').textContent = 'Processing';
  } else {
    form.classList.remove('loading');
    submitBtn.disabled = false;
    submitBtn.querySelector('.btn-text').textContent = 'Download';
  }
}

// Update detected platform display
function updateDetectedPlatform(platform) {
  const info = document.getElementById('detectedInfo');
  const platformSpan = document.getElementById('detectedPlatform');
  const select = document.getElementById('platformSelect');
  
  if (platform) {
    info.style.display = 'flex';
    platformSpan.textContent = platform;
    platformSpan.className = `detected-platform platform-${platform}`;
  } else {
    info.style.display = 'none';
  }
}

// Copy to clipboard
async function copyToClipboard(text, button) {
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = 'Copied!';
    button.classList.add('copied');
    setTimeout(() => {
      button.textContent = 'Copy';
      button.classList.remove('copied');
    }, 2000);
  } catch (err) {
    console.error('Failed to copy:', err);
  }
}

// Copy code block
function copyCode(button) {
  const codeBlock = button.closest('.code-block');
  const code = codeBlock.querySelector('code').textContent;
  copyToClipboard(code, button);
}

// Copy full response
function copyResponse() {
  const content = document.getElementById('responseContent').textContent;
  const button = document.getElementById('copyResponse');
  copyToClipboard(content, button);
}

// Validate URL
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

// Main form submission handler
document.getElementById('downloadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const urlInput = document.getElementById('urlInput');
  const platformSelect = document.getElementById('platformSelect');
  const url = urlInput.value.trim();
  
  // Validate URL
  if (!url) {
    showResponse({
      success: false,
      error: {
        code: 'MISSING_URL',
        message: 'URL is required'
      }
    }, true);
    return;
  }
  
  if (!isValidUrl(url)) {
    showResponse({
      success: false,
      error: {
        code: 'INVALID_URL',
        message: 'The provided URL is not a valid URL format'
      }
    }, true);
    urlInput.parentElement.classList.add('error');
    return;
  }
  
  urlInput.parentElement.classList.remove('error');
  
  // Get platform (auto-detect or manual)
  let platform = platformSelect.value;
  
  if (!platform) {
    platform = detectPlatform(url);
    updateDetectedPlatform(platform);
    
    if (!platform) {
      showResponse({
        success: false,
        error: {
          code: 'UNKNOWN_PLATFORM',
          message: 'Could not detect platform from URL. Please specify the platform manually.',
          supported: ['tiktok', 'instagram', 'facebook', 'twitter', 'threads']
        }
      }, true);
      return;
    }
  }
  
  setLoading(true);
  
  try {
    const response = await fetch('/api/download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, platform })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showResponse(data, false);
    } else {
      showResponse(data, true);
    }
  } catch (error) {
    showResponse({
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: 'Failed to connect to the API server'
      }
    }, true);
  } finally {
    setLoading(false);
  }
});

// Auto-detect platform on URL input
document.getElementById('urlInput').addEventListener('input', (e) => {
  const url = e.target.value.trim();
  const platform = detectPlatform(url);
  updateDetectedPlatform(platform);
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  // Set default placeholder example
  const examples = [
    'https://www.tiktok.com/@user/video/7312345678901234567',
    'https://www.instagram.com/reel/DExample/',
    'https://www.facebook.com/watch/?v=123456789',
    'https://twitter.com/user/status/1234567890',
    'https://www.threads.net/@user/post/1234567890'
  ];
  
  const randomExample = examples[Math.floor(Math.random() * examples.length)];
  document.getElementById('urlInput').placeholder = randomExample;
});
