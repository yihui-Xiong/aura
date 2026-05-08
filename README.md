# Aura

A daily color ritual web app. Type one word for the day, and Aura turns it into a luminous generative orb: part mood journal, part visual keepsake, part personal archive.

Aura is designed to feel closer to a ritual object than a productivity tool. It does not ask a long list of questions or reduce the day to a score. The word is the input. The aura is the response.

## Live Concept

Aura makes the invisible visible in a small, personal way:

- One word becomes a color form.
- The current date and time are mixed into the seed.
- The same word can look different on different days.
- Each generated orb can be saved, favorited, exported, or revisited later.

The result is a visual diary made from daily color impressions rather than long text entries.

## How It Works

The generation flow is:

```text
word + date + time -> deterministic seed -> mood category -> palette -> orb form
```

Aura hashes the typed word with the current date and time. That seed drives the color palette, orb type, size, sparkle pattern, and other rendering details. Known words are mapped through `words.json`; unknown words still generate a deterministic aura through the seeded mood system.

The app currently includes 660 keyword mappings across 8 mood categories.

## Visual Types

The main aura forms are:

1. **Soft blob** - bright center with a soft radial field.
2. **Dark core** - deep center with warmth radiating outward.
3. **Ringed orb** - concentric iridescent rings.
4. **Teardrop** - elongated, denser aura body.
5. **Wispy cloud** - layered translucent veils.
6. **Multi-mass** - several color bodies clustered together.
7. **Inner entity** - an outer haze with a distinct inner form.
8. **Two-cloud form** - paired luminous bodies with a shared field.

Sparkles appear on some generated auras as small dots or star-like marks around the main form.

## Current Features

- Word or short phrase input.
- Animated canvas aura generation.
- Daily journal storage.
- Calendar view with aura swatches on days that have entries.
- Inline day detail panel below the calendar.
- Swipe-left entry actions for favorite and delete.
- Detail panel for larger per-entry previews.
- Favorites view.
- Multiple local profiles.
- Import and export of journal data.
- PNG export with configurable background, size, word, date, and time.
- Mobile sharing through the device share sheet when supported.
- Optional Firebase sign-in and sync.
- Progressive Web App support for adding Aura to a phone home screen.

## Export Options

The image export modal supports:

- background presets: gray, white, black, blush, midnight, sage, transparent
- export sizes: 1x, 2x, 4x
- word label on or off
- date label on or off
- time label on or off

Exports are saved as PNG files.

## Data Storage

Guest and local profile data is stored in `localStorage`.

Important local keys:

```text
aura_profiles
aura_active_profile
aura_history_<profile-name>
```

Older single-profile data under `aura_history` is migrated into the newer profile-based structure.

Signed-in users can sync through Firebase Authentication and Cloud Firestore. Synced app state is stored at:

```text
users/{userId}/app/state
```

## Research Notes

Aura grew from a question about whether "energy of the day" content is scientific. The answer is mostly no, but the emotional need behind it is real: people often want a small language for noticing how a day feels.

Several research threads shaped the project:

- **Synesthesia and aura perception:** Some people who report seeing auras may experience emotional synesthesia, where perception of a person can trigger color associations.
- **Color and emotion:** Color-emotion research shows recurring associations between brightness, hue, and emotional valence, while also leaving room for cultural and personal meaning.
- **Introspection:** Direct "why do I feel this way?" prompts can lead to rumination. A single sideways prompt, like one word for today, can feel more honest and less clinical.

Visual references included atmospheric light installations, generative drawing tools, aura photography aesthetics, and digital color-field imagery.

## Design System

Aura uses a soft, frosted interface with muted blue-gray panels, luminous text, and translucent borders.

Core CSS variables:

```css
--bg: #9ea9b8;
--panel: rgba(216,228,235,0.84);
--ink: rgba(255,255,255,0.92);
--muted: rgba(255,255,255,0.70);
--soft: rgba(255,255,255,0.48);
--line: rgba(255,255,255,0.28);
--cal-ink: rgba(72,88,102,0.90);
--cal-muted: rgba(94,111,126,0.76);
```

The interface uses CSS gradients, `backdrop-filter`, soft shadows, and responsive layouts for mobile and desktop.

## Running Locally

From this folder:

```bash
python3 -m http.server 8080
```

Then open:

```text
http://127.0.0.1:8080/
```

Use a local server instead of opening `index.html` directly. Browser features such as service workers, sharing, Firebase auth, and import/export behave more reliably from `localhost` or `127.0.0.1`.

## Installing as an App

Aura is configured as a Progressive Web App.

On iPhone:

1. Open the hosted site in Safari.
2. Tap the Share button.
3. Tap **Add to Home Screen**.

On Android:

1. Open the hosted site in Chrome.
2. Open the browser menu.
3. Tap **Install app** or **Add to Home screen**.

PWA installation requires either `localhost`, `127.0.0.1`, or a deployed `https://` URL. It will not work from a `file://` URL.

## Firebase Setup

Aura can run in guest mode without Firebase sign-in. For cloud sync, configure Firebase Authentication and Firestore.

Recommended Authentication providers:

- Google
- Email/Password

Authorized domains should include:

```text
localhost
127.0.0.1
your deployed domain
```

Suggested Firestore rules:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/app/{docId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Project Structure

```text
index.html             Main app markup and modal structure
aura.css               Main styling and responsive layout
app.js                 App startup, generation trigger, service worker registration
orbs.js                Canvas aura rendering and seeded orb generation
journal.js             Profiles, journal entries, calendar, favorites, import/export
firebase.js            Firebase Authentication and Firestore sync
export.js              PNG export and mobile share logic
words.json             Word-to-mood mapping data
favicon.png            Browser favicon
icon-192.png           PWA icon
icon-512.png           PWA icon
manifest.json          PWA install metadata
sw.js                  Service worker for local asset caching
README.md              Project documentation
```

Local preview assets such as `icon-preview-ios-512.png` are not required by the app unless they are explicitly wired into `index.html` or `manifest.json`.

## Deployment

Aura is a static web app. It can be deployed to any static host:

- GitHub Pages
- Hostinger
- Netlify
- Vercel
- Firebase Hosting

For GitHub Pages:

1. Push the project to a GitHub repository.
2. Open the repository settings.
3. Go to **Pages**.
4. Choose **Deploy from a branch**.
5. Select `main` and `/ root`.
6. Save.

After deployment, add the hosted domain to Firebase Authentication authorized domains if you want sign-in and sync to work.

## Notes

Aura is not a diagnostic or therapeutic tool. It does not interpret users or make claims about their emotional state. It creates a daily visual artifact from a word, a time, and a generative color system.
