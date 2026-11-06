# Qynect GitHub Pages

This folder is a ready-to-upload static Qynect site.

## Publish it

1. Create a GitHub repository.
2. Upload every file in this folder to the repository root.
3. Open **Settings > Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the `main` branch and the `/ (root)` folder, then save.
6. Wait for the Pages build to finish.

Your site will be at:

- `https://<username>.github.io/<repository>/`
- `https://<username>.github.io/<repository>/ios.html`

If the repository is named `<username>.github.io`, the site is at
`https://<username>.github.io/`.

## Add the Android APK

The download button opens the latest GitHub Release. Publish one release:

1. Open the repository's **Releases** page.
2. Choose **Draft a new release**.
3. Use tag `v1.2.1`.
4. Upload the signed APK, for example `Qynect-1.2.1-release.apk`.
5. Publish the release.

The current Android release is about 48.3 MB.

The APK is not stored in this folder, so it does not count against the normal
GitHub web upload limit.

## What is included

- `index.html` - public download page.
- `ios.html` - iPhone/iPad web pass.
- `static/` - QR scripts, Tailwind build, and icons.
- `manifest.webmanifest` - Add to Home Screen metadata.
- `.nojekyll` - keeps GitHub Pages from processing the folder with Jekyll.

## Important

- GitHub Pages is public. The iOS web pass contains the same QR signing secret
  that is already shipped inside the Android APK. Do not treat that secret as
  private.
- The admin dashboard, attendance scanner, SQLite database, roster, and Telegram
  poller are **not** part of GitHub Pages. They still run only on the Windows
  Qynect host.
- The iOS pass stores student details in Safari's local storage. It creates the
  QR in the browser and does not upload the details to GitHub.
- Use HTTPS. GitHub Pages provides HTTPS; iPhone Safari needs it for WebCrypto.
- The Android button derives the repository from the `github.io` address. If
  you use a custom domain, edit the `data-github-release` script in
  `index.html` and set the repository URL.
