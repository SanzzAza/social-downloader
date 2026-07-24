# Social Media Downloader API - Specification

## Concept & Vision

A brutalist-styled REST API downloader for social media platforms (TikTok, Instagram, Facebook, Twitter/X, Threads). The interface embraces raw, unpolished aesthetics with bold typography, stark contrasts, and thick borders—making it visually distinctive while remaining functional. The API returns clean JSON responses ready for integration.

## Design Language

### Aesthetic Direction
Neo-Brutalism: Bold, raw, unapologetic. Think 90s web meets modern brutalist design. High contrast, thick black borders, harsh shadows, and intentionally "ugly-beautiful" elements.

### Color Palette
- **Primary**: `#FF6B35` (Electric Orange)
- **Secondary**: `#1A1A2E` (Deep Navy)
- **Accent**: `#16C79A` (Brutal Green)
- **Background**: `#F7F7F7` (Off-White)
- **Surface**: `#FFFFFF` (Pure White)
- **Text Primary**: `#1A1A2E` (Deep Navy)
- **Text Secondary**: `#4A4A68` (Muted Navy)
- **Border**: `#1A1A2E` (Deep Navy)
- **Shadow**: `#1A1A2E` (Deep Navy)
- **Error**: `#E63946` (Brutal Red)
- **Success**: `#16C79A` (Brutal Green)

### Typography
- **Headings**: `Space Mono` (Google Fonts) - monospace, brutal
- **Body**: `IBM Plex Sans` (Google Fonts) - readable but with character
- **Code/API Response**: `JetBrains Mono` (Google Fonts) - developer-friendly

### Spatial System
- Base unit: 8px
- Border width: 3px (thick brutalist borders)
- Shadow: 6px offset (harsh brutalist shadow)
- Border radius: 0px (sharp corners)
- Card padding: 24px

### Motion Philosophy
- Minimal animations - brutalism favors static, bold presence
- Hover: translate(-4px, -4px) with shadow increase (pressing effect)
- Active: translate(0, 0) with shadow decrease (click feedback)
- Transitions: 150ms ease-out (snappy, not smooth)

### Visual Assets
- Platform icons: Simple SVG icons for each social platform
- Decorative: Geometric shapes, thick lines, grid patterns
- No gradients - flat, solid colors only

## Layout & Structure

### Page Structure
1. **Header**: Bold title with brutal styling, tagline
2. **API Documentation Section**: Shows available endpoints with examples
3. **Live Tester**: Form to test the API directly
4. **Response Preview**: Shows JSON response in code block
5. **Footer**: Simple credits

### Responsive Strategy
- Desktop: Two-column layout (docs + tester side by side)
- Tablet: Stacked single column
- Mobile: Full-width cards, smaller typography scale

## Features & Interactions

### Core Features

#### 1. REST API Endpoints
- `POST /api/download` - Main download endpoint
  - Request body: `{ "url": "https://...", "platform": "tiktok|instagram|facebook|twitter|threads" }`
  - Response: JSON with download links, metadata, thumbnails

#### 2. Supported Platforms
- **TikTok**: Video download (with/without watermark)
- **Instagram**: Reels, Posts, Stories, IGTV
- **Facebook**: Public videos
- **Twitter/X**: Videos and images
- **Threads**: Posts with media

#### 3. API Response Format
```json
{
  "success": true,
  "platform": "tiktok",
  "data": {
    "id": "unique-id",
    "title": "Video title",
    "author": {
      "name": "username",
      "avatar": "url"
    },
    "thumbnail": "url",
    "media": [
      {
        "type": "video",
        "quality": "1080p",
        "url": "download-url",
        "format": "mp4"
      }
    ],
    "duration": 30,
    "likes": 1000
  }
}
```

#### 4. Interactive API Tester
- URL input field
- Platform auto-detection or manual select
- Submit button
- JSON response display with syntax highlighting

### Error Handling
- Invalid URL format: 400 Bad Request
- Unsupported platform: 400 Bad Request  
- Download failed: 500 Internal Server Error
- Rate limiting: 429 Too Many Requests

## Component Inventory

### 1. Header Component
- Large brutal title with thick border
- Tagline in monospace
- States: Static only

### 2. Endpoint Card
- Platform icon
- Method badge (POST)
- Endpoint path
- Description
- States: Default, Hover (lift effect)

### 3. Code Block
- Syntax highlighted JSON
- Copy button
- States: Default, Hover (highlight), Copied (success feedback)

### 4. Input Field
- Thick border
- Label above
- Placeholder text
- States: Default, Focus (border color change), Error (red border)

### 5. Select Dropdown
- Platform selector with icons
- Thick border
- States: Default, Focus, Open

### 6. Button
- Primary: Orange background, white text
- Secondary: White background, dark text
- States: Default, Hover (lift), Active (press), Disabled (muted)

### 7. Response Viewer
- Dark background for contrast
- JSON syntax highlighting
- Scrollable
- States: Empty, Loading, Success, Error

## Technical Approach

### Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Frontend**: Vanilla HTML/CSS/JS (no framework needed)
- **Download Libraries**: 
  - ytdl-core (YouTube/Twitter)
  - tikwm-api or similar for TikTok
  - instagram-private-api or scraper for Instagram
  - facebook-downloader for Facebook
  - threads-api for Threads

### Project Structure
```
downloader-api/
├── server.js           # Express server
├── routes/
│   └── download.js     # Download routes
├── services/
│   ├── tiktok.js
│   ├── instagram.js
│   ├── facebook.js
│   ├── twitter.js
│   └── threads.js
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── package.json
└── SPEC.md
```

### API Design

#### POST /api/download
**Request:**
```json
{
  "url": "https://vm.tiktok.com/xxx",
  "platform": "tiktok"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "platform": "tiktok",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "id": "7312345678901234567",
    "title": "Amazing video",
    "author": {
      "name": "username",
      "uniqueId": "user123",
      "avatar": "https://..."
    },
    "thumbnail": "https://...",
    "media": [
      {
        "type": "video",
        "quality": "720p",
        "url": "https://...mp4",
        "format": "mp4"
      },
      {
        "type": "video",
        "quality": "480p",
        "url": "https://...mp4",
        "format": "mp4",
        "watermark": false
      }
    ],
    "duration": 15.5,
    "statistics": {
      "likes": 1234,
      "comments": 56,
      "shares": 78
    }
  }
}
```

**Error Response (400/500):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_URL",
    "message": "The provided URL is not a valid TikTok link"
  }
}
```

### Error Codes
- `INVALID_URL`: URL format is incorrect
- `UNSUPPORTED_PLATFORM`: Platform not supported
- `DOWNLOAD_FAILED`: Failed to fetch video data
- `RATE_LIMITED`: Too many requests
- `SERVER_ERROR`: Internal server error
