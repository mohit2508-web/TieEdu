import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="shortcut icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <meta name="theme-color" content="#1F3A5F" />

        {/*
          No viewport tag here, on purpose. It used to live in this file, which put
          two `name="viewport"` tags on every page: Next's Pages Router seeds the
          head with its own via `defaultHead()`, and `next/document`'s `<Head>`
          does not dedupe the way `next/head` does. Which of the two a browser
          honours is not specified, so `viewport-fit=cover` was effectively a coin
          flip — and losing it silently zeroes every `env(safe-area-inset-*)`,
          which is the notch handling the whole shell depends on.

          The single tag now lives in `_app.tsx`, inside `next/head`, which
          dedupes `<meta>` by `name` and keeps ours over the default. See the
          comment there for the ordering that guarantees it.

          `apple-mobile-web-app-*` is what makes "Add to Home Screen" open in a
          standalone, chrome-less window with the status bar overlaid rather than a
          Safari address bar.
        */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="TieEdu" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />

        {/* Google Fonts Preconnect & Embed */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Outfit:wght@500;600;700;800;900&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body className="bg-[#FAFAF9] text-[#1A1A1A] antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
