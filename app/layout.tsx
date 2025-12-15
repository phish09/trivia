import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TriviYay!",
  description: "Create or join exciting trivia games made by you and your friends!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Brand colors excluding primary: secondary, tertiary, fourth, fifth, sixth
  const brandColors = ['#ba348d', '#f05274', '#ff865d', '#ffbf54', '#f9f871'];
  
  // Generate random positions and colors for floating shapes
  const shapes = [
    { type: 'triangle', color: brandColors[0], left: '5%', top: '10%', delay: '0s' },
    { type: 'square', color: brandColors[1], left: '85%', top: '15%', delay: '2s' },
    { type: 'x', color: brandColors[2], left: '10%', top: '60%', delay: '4s' },
    { type: 'circle', color: brandColors[3], left: '80%', top: '70%', delay: '1s' },
    { type: 'triangle', color: brandColors[4], left: '15%', top: '85%', delay: '3s' },
    { type: 'square', color: brandColors[0], left: '75%', top: '5%', delay: '5s' },
    { type: 'circle', color: brandColors[1], left: '50%', top: '25%', delay: '1.5s' },
    { type: 'x', color: brandColors[2], left: '90%', top: '50%', delay: '3.5s' },
    { type: 'triangle', color: brandColors[3], left: '25%', top: '40%', delay: '2.5s' },
    { type: 'square', color: brandColors[4], left: '60%', top: '80%', delay: '4.5s' },
    { type: 'circle', color: brandColors[0], left: '40%', top: '5%', delay: '0.5s' },
    { type: 'x', color: brandColors[1], left: '70%', top: '35%', delay: '2.2s' },
    { type: 'triangle', color: brandColors[2], left: '20%', top: '20%', delay: '1.2s' },
    { type: 'square', color: brandColors[3], left: '95%', top: '30%', delay: '3.2s' },
    { type: 'circle', color: brandColors[4], left: '8%', top: '45%', delay: '0.8s' },
    { type: 'x', color: brandColors[0], left: '65%', top: '10%', delay: '2.8s' },
    { type: 'triangle', color: brandColors[1], left: '30%', top: '65%', delay: '4.2s' },
    { type: 'square', color: brandColors[2], left: '55%', top: '90%', delay: '1.8s' },
    { type: 'circle', color: brandColors[3], left: '12%', top: '75%', delay: '3.8s' },
    { type: 'x', color: brandColors[4], left: '88%', top: '60%', delay: '0.3s' },
    { type: 'triangle', color: brandColors[0], left: '45%', top: '50%', delay: '2.3s' },
    { type: 'square', color: brandColors[1], left: '35%', top: '15%', delay: '4.8s' },
    { type: 'circle', color: brandColors[2], left: '72%', top: '45%', delay: '1.3s' },
    { type: 'x', color: brandColors[3], left: '18%', top: '30%', delay: '3.3s' },
    { type: 'triangle', color: brandColors[4], left: '82%', top: '85%', delay: '0.7s' },
    { type: 'square', color: brandColors[0], left: '50%', top: '70%', delay: '2.7s' },
    { type: 'circle', color: brandColors[1], left: '28%', top: '55%', delay: '4.7s' },
    { type: 'x', color: brandColors[2], left: '62%', top: '20%', delay: '1.7s' },
  ];

  return (
    <html lang="en" className="light">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-primary relative`}
      >
        {/* Floating Background Shapes */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          {shapes.map((shape, index) => {
            const animationClass = index % 3 === 0 ? 'animate-float' : index % 3 === 1 ? 'animate-float-slow' : 'animate-float-fast';
            const size = 40 + (index % 4) * 10; // Vary sizes between 40-70px
            const opacity = 0.2 + (index % 3) * 0.05; // Vary opacity between 0.2-0.3
            
            return (
              <div
                key={index}
                className={`absolute ${animationClass}`}
                style={{
                  left: shape.left,
                  top: shape.top,
                  width: `${size}px`,
                  height: `${size}px`,
                  opacity: opacity,
                  animationDelay: shape.delay,
                }}
              >
                {shape.type === 'triangle' && (
                  <svg width="100%" height="100%" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
                    <path d="M100 20 L180 170 L20 170 Z" fill="none" stroke={shape.color} strokeWidth="20" strokeLinejoin="round" />
                  </svg>
                )}
                {shape.type === 'square' && (
                  <svg width="100%" height="100%" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
                    <rect x="30" y="30" width="140" height="140" fill="none" stroke={shape.color} strokeWidth="20" rx="20" ry="20" />
                  </svg>
                )}
                {shape.type === 'x' && (
                  <svg width="100%" height="100%" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
                    <line x1="40" y1="40" x2="160" y2="160" stroke={shape.color} strokeWidth="20" strokeLinecap="round" />
                    <line x1="160" y1="40" x2="40" y2="160" stroke={shape.color} strokeWidth="20" strokeLinecap="round" />
                  </svg>
                )}
                {shape.type === 'circle' && (
                  <svg width="100%" height="100%" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
                    <circle cx="100" cy="100" r="70" fill="none" stroke={shape.color} strokeWidth="20" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Google tag (gtag.js) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-BZKD379TWB"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-BZKD379TWB');
          `}
        </Script>
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}
