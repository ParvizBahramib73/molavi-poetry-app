# Molavi Poetry App

A Persian-first poetry experience focused on reading and listening to the works of Molana Jalal al-Din Rumi.

## Product experience

- Browse Molana's works and poems.
- Read poem text in a right-to-left Persian interface.
- Listen to available recitations with synchronized verse highlighting.
- Switch between available recitations and control playback speed.
- Search poems and open a dedicated reading view.
- Save favorite poems and recent listening progress locally on the device.
- Create and share a visual quote card from the currently highlighted verse.
- Install the web app as a PWA. The app shell is cached for repeat visits and offline launch; live poem and audio requests still require a connection unless separately available on the device.

## Technology

- Angular 20 and TypeScript
- RxJS and the Ganjoor API
- Jasmine/Karma unit tests
- A lightweight custom service worker for the PWA shell
- GitHub Actions for test, production build, and GitHub Pages deployment

## Development

Requirements: Node.js 22 and npm.

```bash
npm ci
npm start
```

Open `http://localhost:4200/`.

## Tests and production build

```bash
npm run test:ci
npm run build
```

The CI workflow runs unit tests before the production build. Pushes to `main` deploy to GitHub Pages after both jobs succeed. Pull requests run the same verification and build jobs without deploying.

## PWA

The web manifest and service worker are served from `public/`. The service worker caches the application shell and same-origin static assets. It deliberately does not cache third-party recitation audio or Ganjoor API responses.

For local PWA testing, use `localhost`. For production, use the HTTPS GitHub Pages URL:

https://parvizbahramib73.github.io/molavi-poetry-app/

## Content and licensing

The app consumes data from Ganjoor. API availability does not automatically grant redistribution or commercial rights for every poem translation, recitation, recording, or artwork. Review the licence and attribution requirements for each content item before public distribution.

## Accessible and simple navigation

The browser app is designed for Persian-speaking users with different levels of comfort using a smartphone.

- Three always-visible, text-labeled navigation options: **شنیدن** (listen), **جست‌وجو** (search), and **کتابخانه من** (personal library).
- The player includes direct **انتخاب شعر** (choose a poem) and **خواندن متن** (read the full text) actions.
- Buttons display their purpose in text and use larger touch targets.
- Text can be enlarged from the player or the full-text reading page; the preference is stored locally.
- Deleting listening history requires an explicit second confirmation.
- Audio playback errors and lost connectivity are explained in Persian.

### Usability verification

Automated component tests cover the primary controls, persistence, keyboard verse selection, confirmation states, and touch-target layout. For moderated tests with real participants and the manual browser/accessibility checklist, see [the Persian usability study plan](docs/usability-test-plan-fa.md).

Passing automated tests **does not** establish that human usability sessions, screen-reader audits, 200% zoom tests, or real-device compatibility have been completed.


## Verse-first search

The Persian search page is designed for remembering only a few words rather than knowing a poem title.

- Type any short part of a verse; automatically search after a 600ms pause or press the visible Search button.
- Normalize common Persian/Arabic character and diacritic differences before searching.
- Show matching hemistiches and highlight the original words without injecting HTML.
- Use the lightweight Ganjoor verses endpoint for only the eight visible results at a time, with a maximum of two concurrent excerpt requests.
- Open the full poem at the matching verse when a reliable excerpt is available, or listen to the poem directly.
- Keep results accessible if snippet retrieval fails, and reveal additional results on demand.
- Unit tests cover search behaviour, Persian normalization, stale-request cancellation, excerpt selection, pagination, and linked verse highlighting.

API behaviour is verified in network-mocked tests; reliability and latency against Ganjoor's live servers still require field validation.

## Android test APK (Capacitor)

The first Android pilot uses pinned Capacitor 8.0.0 packages and bundles the Angular app into an installable debug APK. CI checks out the project, builds the web bundle with a root base href, generates the Android project and uploads an artifact named `Molavi-Android-Debug-APK`.

The Android build is separate from the GitHub Pages deployment. No production signing keys are present in the repository. The debug APK is **not** store-ready.

See [the Persian APK download, installation and real-device test plan](docs/android-apk-pilot-fa.md).
