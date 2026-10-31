import { createHmac } from 'crypto';

export interface MetaPlace {
  id: string;
  name: string;
  where: string;
}

export type MetaPlaceResult = MetaPlace[] | { error: string };

// Facebook and Instagram tag a post's location with the id of a Facebook Page
// that has a physical location (a city, a shop, a park). Meta's Pages Search
// finds them; Pages without location data are dropped because Meta rejects
// them as a location. A bare number is taken as a Page id, and a Facebook
// Page link or username is looked up directly.
// The Graph version comes from the caller (facebook.provider owns it).
//
// Pages Search is documented as "a User access token plus the app secret",
// so every call carries appsecret_proof when FACEBOOK_APP_SECRET is set.
// When Meta refuses every route, the reason is returned as { error } so the
// editor can show it (the dashboard function route swallows thrown errors).
export async function searchMetaPlaces(
  version: string,
  token: string,
  q: string
): Promise<MetaPlaceResult> {
  const query = (q || '').trim();
  if (!query) {
    return [];
  }

  const fields = 'id,name,location';
  const auth = authParams(token);
  const base = `https://graph.facebook.com/${version}`;

  // A Page id, or a Facebook Page link / username (facebook.com/NYCParks).
  const direct = directLookup(query);
  if (direct) {
    const url = `${base}/${encodeURIComponent(direct)}?fields=${fields}&${auth}`;
    const out = toPlaces(await graph(url), 'lookup');
    // Reading a Page the user does not manage is gated behind Meta's
    // "Page Public Metadata Access" feature (App Review). A pasted id is
    // still usable for tagging, so hand it back unverified instead of failing.
    if (!Array.isArray(out) && /^\d+$/.test(direct)) {
      console.warn('[placeSearch] unverified Page id', direct, out.error);
      return [
        {
          id: direct,
          name: `Facebook Page ${direct}`,
          where:
            'Not checked: Meta does not let this app read the Page. ' +
            'Posting works if the Page has a location.',
        },
      ];
    }
    return out;
  }

  const routes: Array<[string, string]> = [
    [
      'pages/search',
      `${base}/pages/search?q=${encodeURIComponent(
        query
      )}&fields=${fields}&limit=25&${auth}`,
    ],
    [
      'places',
      `${base}/search?type=place&q=${encodeURIComponent(
        query
      )}&fields=${fields}&limit=25&${auth}`,
    ],
  ];

  const errors: string[] = [];
  for (const [name, url] of routes) {
    const res = await graph(url);
    const out = toPlaces(res, name);
    if (Array.isArray(out)) {
      if (out.length) {
        return out;
      }
      continue; // this route answered but found nothing: try the next one
    }
    errors.push(out.error);
  }

  if (errors.length) {
    console.error('[placeSearch]', query, errors);
    return { error: errors.join(' | ') };
  }
  return [];
}

function authParams(token: string) {
  const secret = process.env.FACEBOOK_APP_SECRET;
  const proof = secret
    ? `&appsecret_proof=${createHmac('sha256', secret)
        .update(token)
        .digest('hex')}`
    : '';
  return `access_token=${token}${proof}`;
}

// "123456789" → "123456789"; "https://www.facebook.com/NYCParks/" or
// "facebook.com/NYCParks" → "NYCParks"; ".../pages/New-York/1084242791"
// → "1084242791"; anything else → undefined.
function directLookup(query: string): string | undefined {
  if (/^\d{5,}$/.test(query)) {
    return query;
  }
  const m = query.match(
    /^(?:https?:\/\/)?(?:[a-z]+\.)?facebook\.com\/(?:profile\.php\?id=(\d+)|pages\/[^/?#\s]+\/(\d+)|([^/?#\s]+))/i
  );
  if (m) {
    return m[1] || m[2] || m[3];
  }
  return undefined;
}

async function graph(url: string): Promise<any> {
  try {
    return await (await fetch(url)).json();
  } catch (e: any) {
    return { error: { message: e?.message || 'Meta did not answer' } };
  }
}

function toPlaces(res: any, route: string): MetaPlaceResult {
  if (res?.error) {
    const err = res.error;
    const code = err.code ? ` (code ${err.code})` : '';
    return { error: `${route}: ${err.message || 'Place search failed'}${code}` };
  }
  const pages = Array.isArray(res?.data) ? res.data : res?.id ? [res] : [];
  return pages
    .filter((p: any) => p?.location)
    .map((p: any) => ({
      id: String(p.id),
      name: p.name || '',
      where: [
        p.location.street,
        p.location.city,
        p.location.state,
        p.location.country,
      ]
        .filter(Boolean)
        .join(', '),
    }));
}
