'use client';

import { useEffect } from 'react';

interface AdSenseProps {
  /**
   * AdSense ad slot ID (e.g., "1234567890")
   * Get this from your AdSense account after creating an ad unit
   */
  adSlot?: string;
  /**
   * Ad format (e.g., "auto", "rectangle", "horizontal", "vertical")
   */
  format?: string;
  /**
   * Ad style (e.g., "display:block")
   */
  style?: React.CSSProperties;
  /**
   * Ad size (e.g., "728x90", "300x250")
   */
  adFormat?: string;
  /**
   * Whether the ad is responsive
   */
  responsive?: boolean;
  /**
   * FullWidth responsive ad
   */
  fullWidthResponsive?: boolean;
}

/**
 * Google AdSense component for displaying ads
 * 
 * Usage:
 * <AdSense adSlot="1234567890" format="auto" responsive />
 * 
 * Note: You need to create ad units in your AdSense account and get the ad slot ID
 */
export default function AdSense({
  adSlot,
  format = 'auto',
  style = { display: 'block' },
  adFormat,
  responsive = true,
  fullWidthResponsive = false,
}: AdSenseProps) {
  useEffect(() => {
    try {
      // Push ad to adsbygoogle array
      if (typeof window !== 'undefined' && (window as any).adsbygoogle) {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      }
    } catch (err) {
      console.error('AdSense error:', err);
    }
  }, []);

  // If no adSlot is provided, return null (you need to create ad units in AdSense)
  if (!adSlot) {
    return null;
  }

  return (
    <ins
      className="adsbygoogle"
      style={style}
      data-ad-client="ca-pub-5460760645764983"
      data-ad-slot={adSlot}
      data-ad-format={adFormat || (responsive ? 'auto' : undefined)}
      data-full-width-responsive={fullWidthResponsive ? 'true' : undefined}
    />
  );
}
