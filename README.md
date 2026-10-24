# TabGroup Marker

TabGroup Marker is a lightweight browser extension that lets you effortlessly label and organize tab groups with custom categories.

## Features

- Manage the list of categories
- Assign category color and emoji as an icon
- Apply category to the tab group
- Automatically create a new tab group and add a tab to it
- Apply category using 1-9 keys from extension popup menu
- Apply category using global shortcut without opening the popup menu
- See list of tab groups per category
- Ungroup and delete tab groups

## Development

```sh
npm install
npm run dev:chrome     # watch build -> dist/chrome (load unpacked)
npm run dev:firefox    # watch build -> dist/firefox
npm run start:firefox  # launch Firefox with dist/firefox (separate terminal)
```

After a rebuild, reload the extension in the browser (`web-ext run` reloads Firefox automatically).

## Manifests

`src/manifest/manifest.json` holds common fields. `manifest.chrome.json` and `manifest.firefox.json` are merged on top: objects merge recursively, arrays concatenate, scalars are overridden. The version always comes from `package.json`.

## Quality

`npm run lint`, `npm run typecheck`, `npm run format:check`.

## Packaging and release

`npm run package` writes `artifacts/<name>-<version>-{chrome,firefox,sources}.zip`. The sources zip uses `git archive HEAD`, so it requires at least one commit.

Release: bump `version` in `package.json`, then push a matching tag (`git tag v0.1.0 && git push --tags`). The release workflow builds, creates a GitHub Release with the zips, and publishes to the stores when these secrets exist:

- Chrome Web Store: `CWS_EXTENSION_ID`, `CWS_CLIENT_ID`, `CWS_CLIENT_SECRET`, `CWS_REFRESH_TOKEN`
- Firefox AMO: `AMO_JWT_ISSUER`, `AMO_JWT_SECRET`
