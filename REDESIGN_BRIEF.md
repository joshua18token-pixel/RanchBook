# RanchBook Visual Redesign Brief

## Design Direction
Redesign all screens to be clean, modern, and premium — inspired by the TripGlide travel app aesthetic but with a western ranch identity.

## Color Palette (from logo)
- **Primary Black:** `#1A1A1A` (near-black, used for headers/nav)
- **Gold Accent:** `#C5A55A` (the gold from the logo — buttons, highlights, active states)
- **Background:** `#F5F5F0` (warm off-white, not stark white)
- **Card White:** `#FFFFFF` (clean white cards)
- **Text Primary:** `#1A1A1A`
- **Text Secondary:** `#6B6B6B`
- **Text Muted:** `#999999`
- **Success:** `#4CAF50`
- **Warning:** `#FFA000`
- **Danger:** `#D32F2F`
- **Status badges:** keep color-coded but use softer pill shapes

## Typography
- Large, bold headings (keep ranch-friendly / big text)
- Clean sans-serif (system default is fine)
- Good hierarchy: title > subtitle > body > caption

## Logo
- File: `assets/logo-ranchbook.jpg` — use on login screen and ranch select screen
- The logo is gold on black background — use it as a hero image or display the skull icon prominently

## Design Principles (from TripGlide inspiration)
1. **White space** — generous padding, don't crowd elements
2. **Card-based layout** — rounded corners (12-16px radius), subtle shadows
3. **Pill-shaped badges** — for statuses, roles, filters
4. **Clean search bar** — rounded with icon
5. **Minimal borders** — use shadows/elevation instead of borders
6. **Large touch targets** — this is a ranch app, users have dirty hands

## Screens to Redesign

### 1. LoginScreen (`src/screens/LoginScreen.tsx`)
- Dark header area with logo (the skull/brand mark from the image)
- Clean white card for the form
- Gold accent on primary buttons
- OAuth buttons styled cleanly
- Warm background

### 2. RanchSetupScreen (`src/screens/RanchSetupScreen.tsx`)
- Logo at top (smaller)
- Ranch cards with shadows, show ranch name large
- Role shown as subtle pill badge
- Clean create ranch section
- Invite cards styled nicely

### 3. HerdListScreen (`src/screens/HerdListScreen.tsx`)
- Dark header bar with gold accents
- Search bar: rounded, clean
- Cow cards: white cards with shadows, status as colored pill badge
- Tag numbers displayed prominently
- Export and Team buttons as clean icons in header
- Filter pills for status

### 4. AddCowScreen (`src/screens/AddCowScreen.tsx`)
- Clean form with sections
- Card-style grouped fields
- Gold accent on save button
- Tag section clean with pills
- Photo area with placeholder

### 5. CowDetailScreen (`src/screens/CowDetailScreen.tsx`)
- Hero photo area at top (if cow has photos)
- Clean card sections for each data group
- Inline editing stays but with cleaner styling
- Notes section with timestamp
- Medical watch with red accent pills

### 6. TeamScreen (`src/screens/TeamScreen.tsx`)
- Member cards with avatar placeholder (initials circle)
- Role dropdown badge
- Clean invite section

## Important Constraints
- DO NOT change any functionality, navigation, or data logic
- ONLY change styles, colors, layout, and visual components
- Keep all existing `Platform.OS === 'web'` checks
- Keep all existing button handlers and callbacks
- The app must work on BOTH web and mobile (React Native / Expo)
- Keep big touch targets — this is for ranchers with dirty hands
- Use `Image` from react-native to display the logo (require('../../assets/logo-ranchbook.jpg'))

## Files to modify
- `src/screens/LoginScreen.tsx`
- `src/screens/RanchSetupScreen.tsx`
- `src/screens/HerdListScreen.tsx`
- `src/screens/AddCowScreen.tsx`
- `src/screens/CowDetailScreen.tsx`
- `src/screens/TeamScreen.tsx`
- `App.tsx` (header styles only — headerStyle, headerTintColor)

## Header Style Update (App.tsx)
Change the header constants to:
```
const headerStyle = { backgroundColor: '#1A1A1A' };
const headerTintColor = '#C5A55A';
const headerTitleStyle = { fontWeight: 'bold', fontSize: 20, color: '#C5A55A' };
```
