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
├── admin.html          # Admin panel (questions & weeks)
├── login.html          # Login page
├── register.html       # Registration page
├── profile.html        # User profile page
├── css/
│   └── style.css       # Complete design system + admin styles
├── js/
│   ├── main.js         # Interactivity, animations, auth
│   └── admin.js        # Admin panel CRUD logic
├── supabase-migration.sql  # DB schema for admin & quiz system
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
- [x] Admin Panel — Question bank & week builder (role-gated)

## Admin Panel (Phase 1)

The admin panel at `admin.html` provides a dashboard for policymakers and admins to manage quiz content.

**Roles:**
- **Super Admin** — Full access including user role management
- **Policymaker** — Can create/edit questions and assemble weekly quizzes
- **User** — Default role for regular users (no admin access)

**Setup:**
1. Run `supabase-migration.sql` in the Supabase SQL Editor to create the required tables
2. Manually set a user's role to `admin` or `policymaker` in Supabase:
   ```sql
   UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';
   ```
3. Navigate to `admin.html` after logging in with that account

**Tabs:**
- **Dashboard** — Overview stats (total questions, active questions, weeks, published weeks)
- **Questions** — Full CRUD for quiz questions with category/topic tagging
- **Weeks** — Assemble weekly quizzes by selecting 10 questions from the bank, set timer
- **Access** — (Admins only) Manage user roles: promote/demote policymakers

## Next Steps

- **Quiz Page (Phase 2)** — Wire quiz.html to pull questions from Supabase, submit attempts
- **Leaderboard (Phase 3)** — Replace mock data with real rankings from quiz_attempts
- Migrate to Next.js with TypeScript
- Add real chatbot integration (OpenAI/WhatsApp API)
