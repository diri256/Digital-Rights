# DIRI - Digital Rights Platform

A youth-focused digital rights and internet governance platform.

## Project Structure

```
diri-website/
├── index.html          # Home page
├── learn.html          # Learning cards page
├── updates.html        # Current updates page
├── quiz.html           # Weekly quiz page
├── leaderboard.html    # Leaderboard page
├── chatbot.html        # Mr. DIRI chatbot page
├── login.html          # Login page
├── register.html       # Registration page
├── css/
│   └── style.css       # Complete design system
├── js/
│   └── main.js         # Interactivity & animations
└── assets/
    ├── logo.png        # Full DIRI wordmark (transparent)
    ├── logo-white.png  # Full DIRI wordmark (navy bg version)
    └── icon.png        # App icon
```

## Brand Colors

| Color        | Hex       | Usage                 |
|-------------|-----------|-----------------------|
| Primary Navy | `#0B3D91` | Headings, buttons     |
| Accent Teal  | `#11B8B8` | Highlights, accents   |
| Dark Text    | `#1F2937` | Body text             |
| Light BG     | `#F5F9FC` | Card backgrounds      |
| White        | `#FFFFFF` | Main background       |

## Getting Started

Simply open `index.html` in any browser. No build step required.

## Pages Completed

- [x] Home — Hero, features, updates preview, CTA
- [x] Learn — Topic cards grid with filters and search
- [x] Updates — Digital rights news feed with categories
- [x] Weekly Quiz — Quiz interface with timer and progress
- [x] Leaderboard — Rankings table with podium view
- [x] Mr. DIRI Chatbot — Interactive chat interface
- [x] Login — Authentication form
- [x] Register — Registration form

## Next Steps (Framework Upgrade)

- Migrate to Next.js with TypeScript
- Add backend API (Node.js/PHP Laravel)
- Connect to database (PostgreSQL/MySQL)
- Implement authentication (Clerk/Auth.js)
- Add real chatbot integration (OpenAI/WhatsApp API)
- Add admin panel for content management
