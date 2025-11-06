import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import Script from 'next/script';
import { Paytone_One } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });
const paytoneOne = Paytone_One({ 
  weight: '400',
  subsets: ['latin'],
  variable: '--font-paytone'
});

export const metadata: Metadata = {
  metadataBase: new URL('https://libertystaking.com'),
  title: {
    default: 'Liberty Finance - DeFi Staking Platform | Earn up to 17% APR',
    template: '%s | Liberty Finance'
  },
  description: 'Stake INRT tokens and earn up to 17% APR with Liberty Finance. Multi-level referral rewards, secure smart contracts, and transparent DeFi staking platform.',
  keywords: ['DeFi', 'staking', 'INRT token', 'cryptocurrency', 'blockchain', 'passive income', 'APR', 'referral rewards', 'smart contracts', 'Web3'],
  authors: [{ name: 'Liberty Finance Team' }],
  creator: 'Liberty Finance',
  publisher: 'Liberty Finance',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://libertystaking.com',
    title: 'Liberty Finance - DeFi Staking Platform',
    description: 'Stake INRT tokens and earn up to 17% APR with multi-level referral rewards.',
    siteName: 'Liberty Finance',
    images: [
      {
        url: '/images/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Liberty Finance DeFi Staking Platform',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Liberty Finance - DeFi Staking Platform',
    description: 'Stake INRT tokens and earn up to 17% APR',
    creator: '@libertyfinance',
    images: ['/images/twitter-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.className} ${paytoneOne.variable}`}>
      <head>
        {/* Google Analytics */}
        <Script
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
        />
        <Script
          id="google-analytics"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}', {
                page_path: window.location.pathname,
              });
            `,
          }}
        />
        
        {/* Google AdSense (if using) */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXX"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />

        {/* Structured Data - Organization */}
        <Script
          id="structured-data-org"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Liberty Finance',
              url: 'https://libertystaking.com',
              logo: 'https://libertystaking.com/images/logo.png',
              description: 'DeFi staking platform for INRT tokens',
              sameAs: [
                'https://twitter.com/libertyfinance',
                'https://t.me/libertyfinance',
                'https://github.com/libertyfinance',
              ],
            }),
          }}
        />

        {/* Structured Data - WebSite */}
        <Script
          id="structured-data-website"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'Liberty Finance',
              url: 'https://libertystaking.com',
              potentialAction: {
                '@type': 'SearchAction',
                target: 'https://libertystaking.com/search?q={search_term_string}',
                'query-input': 'required name=search_term_string',
              },
            }),
          }}
        />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
