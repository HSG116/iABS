# Truth or Lie Game - Quick Start Guide

## 🎯 Quick Overview
An interactive streaming game where the streamer sees secret content and makes a claim about it, while the audience votes via chat whether the streamer is telling the truth or lying.

---

## 🚀 Quick Start

### For Streamers:
1. Click "صادق أو كاذب" from the game menu
2. Set timer duration (15/30/45/60 seconds)
3. Click "Start New Round"
4. Make your claim about the secret content
5. Wait for votes
6. Reveal the truth!

### For Viewers:
Type in chat:
- `!صادق` or `!1` or `!truth` = Vote Truth
- `!كذاب` or `!2` or `!lie` = Vote Lie

---

## 📺 OBS Setup

### Browser Source URL:
```
http://localhost:5173/?obs=true&view=TRUTH_OR_LIE
```

### Recommended Settings:
- **Width**: 1920px
- **Height**: 1080px
- **FPS**: 30
- **Custom CSS**: None needed
- **Shutdown when not visible**: ✓
- **Refresh when scene becomes active**: ✓

---

## 🎨 Features

### Streamer Dashboard (Private):
- ✅ Secret content display (images/facts)
- ✅ Timer settings (15/30/45/60s)
- ✅ Live voting statistics
- ✅ Real-time vote progress bars
- ✅ Sound effects toggle
- ✅ Chat connection status

### OBS Overlay (Public):
- ✅ Animated circular countdown timer
- ✅ Real-time vote progress (Blue vs Red)
- ✅ Full-screen result reveal animations
- ✅ Winner count display
- ✅ Transparent background

---

## 🎵 Sound Effects
- ✅ Vote registered
- ✅ Countdown tick (last 5 seconds)
- ✅ Round start
- ✅ Result reveal

Toggle sound with 🔊 button in top-right corner.

---

## 🏆 Scoring System
- **Winners**: Players who voted for the correct answer
- **Points**: 10 points per correct vote
- **Auto-saved** to leaderboard

---

## 🎨 Design Aesthetics
- **Dark Mode**: Purple-Black-Green gradient
- **Neon Colors**: 
  - Truth (Blue): `#3b82f6`
  - Lie (Red): `#ef4444`
- **Smooth Animations**: Fade, zoom, slide effects
- **Modern UI**: Glassmorphism, gradients, shadows

---

## 📡 Technical Stack
- **Frontend**: React + TypeScript
- **Chat**: Pusher.js (Kick.com integration)
- **Images**: Pexels API
- **Database**: Supabase
- **Styling**: TailwindCSS + Custom CSS
- **Icons**: Lucide React

---

## 🔧 Advanced Configuration

### Random Content Sources:
1. **Pexels API** (8 categories):
   - Nature, Animals, Abstract, Technology
   - Food, Space, Ocean, Mountains
2. **Weird Facts** (10 Arabic facts as fallback)

### Vote Prevention:
- Duplicate votes blocked automatically
- Banned users filtered out
- One vote per user per round

---

## 📊 Live Statistics
- Total votes count
- Truth percentage
- Lie percentage
- Recent voters list
- Winner count

---

## 🐛 Troubleshooting

**Votes not appearing?**
- Check chat connection (green indicator)
- Verify correct chat commands
- Check browser console for errors

**Images not loading?**
- Check internet connection
- System auto-falls back to weird facts

**Sound not working?**
- Click 🔊 button to enable
- Allow autoplay in browser settings
- Check system volume

---

## 📝 File Structure
```
components/
└── TruthOrLie.tsx      # Main game component
services/
├── chatService.ts      # Kick chat integration
└── supabase.ts         # Database service
types.ts                # TypeScript definitions
App.tsx                 # Main app routing
```

---

## 🎯 Pro Tips for Streamers
1. Be creative with your claims
2. Engage with live vote stats
3. Try different timer durations
4. Build suspense before revealing
5. Have fun with it!

---

## 📄 License
Part of iABS Interactive Games Hub

**Version**: 1.0.0  
**Last Updated**: February 2026  
**Developer**: Antigravity AI

---

For detailed Arabic documentation, see: `TRUTH_OR_LIE_GUIDE.md`
