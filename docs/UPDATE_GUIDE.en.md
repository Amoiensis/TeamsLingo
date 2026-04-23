# TeamsLingo Update Guide

[中文](UPDATE_GUIDE.md) | English | [日本語](UPDATE_GUIDE.ja.md)

## Check for updates from the Settings page

The TeamsLingo settings page now includes a dedicated **Version updates** section:

- It checks GitHub Releases for the latest stable release.
- When a newer release is found, it shows the current version, the latest version, and direct links to the release notes and update guide.
- If the project release URL cannot be reached, the page shows that the update status cannot be confirmed.

> The official release page is: `https://github.com/Amoiensis/TeamsLingo/releases`

## How to update

1. Open the GitHub Releases page and review the latest stable release notes.
2. Download the release package, for example `TeamsLingo-vX.Y.Z.zip`.
3. Extract it to a local directory.
4. Open your browser's extensions page:
   - Edge: `edge://extensions/`
   - Chrome: `chrome://extensions/`
5. If you installed TeamsLingo as an unpacked extension:
   - click **Reload** on the extension card, or
   - load the newly extracted directory again.
6. Open the TeamsLingo settings page and confirm that the displayed version has been updated.

## Switching from a local development build to an official release

If you are currently loading a local development directory instead of a package from GitHub Releases:

1. Back up any local changes you want to keep.
2. Read the release notes to confirm that the official release contains the fixes or features you need.
3. Decide whether to keep using the local development build or reload the extension from the official release directory.

## What to review in release notes

- New translation providers or API compatibility changes
- Teams page structure compatibility updates
- Default setting changes
- Transcript export format changes
- Known issues and compatibility notes
