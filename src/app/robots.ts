import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/env';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Operational surfaces carry no public record and are never indexed.
        disallow: [
          '/admin',
          '/judging',
          '/judge',
          '/staff',
          '/portal',
          '/claim',
          '/sign-in',
          '/register',
          '/api/',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
