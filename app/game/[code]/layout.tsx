import type { Metadata } from "next";

type Props = {
  params: { code: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const code = params.code;
  
  // Get the base URL - Netlify provides URL env var automatically
  // Also check for NEXT_PUBLIC_SITE_URL which can be set in Netlify dashboard
  let baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.URL;
  
  // Ensure URL has protocol
  if (baseUrl && !baseUrl.startsWith("http")) {
    baseUrl = `https://${baseUrl}`;
  }
  
  // Fallback - user should set NEXT_PUBLIC_SITE_URL in Netlify environment variables
  if (!baseUrl) {
    baseUrl = "https://your-site.netlify.app"; // TODO: Replace with your actual Netlify site URL
  }
  
  const ogImageUrl = `${baseUrl}/.netlify/functions/og?code=${code}`;

  return {
    title: `Join Game ${code} - TriviYay!`,
    description: `Join trivia game ${code} on TriviYay!`,
    openGraph: {
      title: `Join Game ${code}`,
      description: `Join trivia game ${code} on TriviYay!`,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `Game code: ${code}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `Join Game ${code}`,
      description: `Join trivia game ${code} on TriviYay!`,
      images: [ogImageUrl],
    },
  };
}

export default function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
