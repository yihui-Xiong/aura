# Aura

Aura is a personal mood-journaling web app that turns a word or short phrase into a generative visual orb. Users can save daily entries, mark favorites, browse their journal history, export images, and optionally sync their data across devices with Firebase.

## What It Does

- Generates a unique orb from the user's current word, date, and time.
- Saves entries into a private journal.
- Shows previous entries in a calendar-style journal view.
- Lets users favorite meaningful entries.
- Exports the generated orb as a PNG image.
- Supports mobile sharing through the device share sheet.
- Supports multiple local profiles.
- Supports Google sign-in, email sign-in, and guest mode.
- Syncs signed-in user data across devices using Firebase Authentication and Cloud Firestore.

## Why This Project Exists

Aura is designed as a quiet reflective tool. Instead of writing a full journal entry every time, a user can enter one word that captures their current mood, thought, or moment. The app turns that word into a visual memory and stores it as part of a private personal archive.

## Tech Stack

- HTML
- CSS
- JavaScript
- Canvas API
- Firebase Authentication
- Cloud Firestore
- Firebase CDN compat SDKs

This project does not require a build step.

## Running Locally

From the project folder:

```bash
python3 -m http.server 8080
```

Then open:

```text
http://127.0.0.1:8080/
```

Using a local server is recommended because browser features such as Firebase auth, file import/export, and sharing work more reliably than opening `index.html` directly.

## Installing as an App

Aura is configured as a Progressive Web App.

From a browser, open the local or deployed URL, then use the browser install option:

- Chrome/Edge desktop: install icon in the address bar.
- Android Chrome: Add to Home screen or Install app.
- iPhone/iPad Safari: Share button, then Add to Home Screen.

Service workers and install prompts require `http://localhost`, `http://127.0.0.1`, or a deployed `https://` site. They do not work from a direct `file://` URL.

## Firebase Setup

Aura uses Firebase for cross-device sync. The app can still run in guest mode without Firebase sign-in, but signed-in users need Firebase Authentication and Firestore enabled.

### Authentication Providers

In the Firebase Console, enable the sign-in providers you want to support:

- Google
- Email/Password
- Anonymous, if you want Firebase-managed guest accounts

For local development, make sure your Firebase Authentication authorized domains include:

```text
localhost
127.0.0.1
```

For a deployed site, also add the hosted domain.

### Firestore Data Path

Synced app data is stored at:

```text
users/{userId}/app/state
```

### Firestore Security Rules

Use rules like this so each signed-in user can only read and write their own app data:

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
index.html      Main app markup and modal structure
aura.css        Main styling and responsive layout
app.js          App startup and orb generation flow
orbs.js         Generative orb rendering logic
journal.js      Profiles, journal entries, favorites, import/export data
firebase.js     Firebase Authentication and Firestore sync
export.js       PNG export and mobile share logic
words.json      Word-to-mood mapping data
favicon.png     App icon
icon-192.png    PWA icon
icon-512.png    PWA icon
manifest.json   PWA install metadata
sw.js           Service worker for local asset caching
```

## Exporting Images

The image export tool lets users choose:

- background color
- export size
- whether to show the word
- whether to show the date
- whether to show the time

On mobile browsers that support file sharing, the `share` button opens the device share sheet with the generated PNG. If sharing is not supported, the app falls back to downloading the image.

## Data and Privacy

Guest data is stored locally in the browser. Signed-in data is synced to the user's Firebase document in Cloud Firestore. Each user's cloud data should be protected by Firestore security rules so only that authenticated user can access it.

Deleting a profile removes that profile's journal data from the app state. Signing out does not automatically delete cloud data unless the user chooses the delete-data sign-out option.

## Deployment

Aura is a static web app, so it can be deployed to any static host, including:

- Firebase Hosting
- GitHub Pages
- Netlify
- Vercel

After deployment, add the deployed domain to Firebase Authentication authorized domains so Google and email sign-in work on the hosted site.
