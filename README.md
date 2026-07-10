# Linkly Gym × NudgeKit

`linklygym` is an Expo fitness app that serves as a working implementation of the [NudgeKit React Native SDK](https://www.npmjs.com/package/nudgekit-react-native). It shows how a React Native app can load server-driven home-screen cards without shipping a new app build for each content change.

## What NudgeKit does here

The Home tab renders NudgeKit content before the normal gym dashboard:

```tsx
<NudgeKitProvider builderId={3} apiKey={apiKey} userId={userId}>
  <NudgeKitCards />
</NudgeKitProvider>
```

NudgeKit resolves the published journey on the server using the current user's properties, then the SDK renders the winning screen's cards in the app. Custom HTML/CSS cards render in a native WebView; carousel layout uses the padding configured in the NudgeKit builder.

## Journey demo

The Home screen includes a **Journey preview** toggle for testing the two branches configured in NudgeKit:

| Button state | Properties sent | Journey branch |
| --- | --- | --- |
| New user | `new_user: "new_user"`, `old_user: "new_user"` | New-user screen |
| Old user | `new_user: "old_user"`, `old_user: "old_user"` | Old-user screen |

The toggle calls `track()` to persist the properties and `refresh()` to request the newly resolved journey immediately. Updating both values prevents an old higher-priority branch property from continuing to match.

## NudgeKit configuration

The app's NudgeKit values are centralised in [src/api/linkly-config.ts](./src/api/linkly-config.ts):

- `NUDGEKIT_API_KEY` — publishable NudgeKit API key.
- `NUDGEKIT_BUILDER_ID` — journey owner / Builder ID.
- `NUDGEKIT_USER_ID` — stable user identifier; defaults to `demo-user`.

For a real app, keep the publishable key and builder ID in Expo public environment variables, and pass the authenticated user's stable ID to `NudgeKitProvider`.

```env
EXPO_PUBLIC_NUDGEKIT_API_KEY=lk_live_xxx
EXPO_PUBLIC_NUDGEKIT_BUILDER_ID=3
EXPO_PUBLIC_NUDGEKIT_USER_ID=user_123
```

## Important files

- [src/app/(tabs)/index.tsx](./src/app/(tabs)/index.tsx) — Home-screen provider, card renderer, and journey toggle.
- [src/api/linkly-config.ts](./src/api/linkly-config.ts) — NudgeKit connection values.
- [src/app/(tabs)/index.styles.ts](./src/app/(tabs)/index.styles.ts) — NudgeKit card and toggle layout.

## Run locally

```sh
npm install
npx expo start
```

Open the iOS Simulator, Android Emulator, or Expo Go from the Expo terminal. The configured NudgeKit journey must be published when using a live API key.

## SDK behavior illustrated by this app

1. NudgeKit fetches the resolved home journey for `builderId` and `userId`.
2. The backend selects the first matching journey branch, otherwise the Default screen.
3. The SDK loads user properties and renders the returned widgets.
4. Calling `track()` updates properties; calling `refresh()` re-resolves the journey.
