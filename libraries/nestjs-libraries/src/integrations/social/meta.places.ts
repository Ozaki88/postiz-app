export interface MetaPlace {
  id: string;
  name: string;
  where: string;
}

// Facebook and Instagram tag a post's location with the id of a Facebook Page
// that has a physical location (a city, a shop, a park). Meta's Pages Search
// finds them; Pages without location data are dropped because Meta rejects
// them as a location. A bare number is taken as a Page id and looked up.
// The Graph version comes from the caller (facebook.provider owns it).
export async function searchMetaPlaces(
  version: string,
  token: string,
  q: string
): Promise<MetaPlace[]> {
  const query = (q || '').trim();
  if (!query) {
    return [];
  }
  const fields = 'id,name,location{city,state,country}';
  const url = /^\d{5,}$/.test(query)
    ? `https://graph.facebook.com/${version}/${query}?fields=${fields}&access_token=${token}`
    : `https://graph.facebook.com/${version}/pages/search?q=${encodeURIComponent(
        query
      )}&fields=${fields}&limit=25&access_token=${token}`;
  const res = await (await fetch(url)).json();
  if (res?.error) {
    throw new Error(res.error.message || 'Place search failed');
  }
  const pages = Array.isArray(res?.data) ? res.data : res?.id ? [res] : [];
  return pages
    .filter((p: any) => p?.location)
    .map((p: any) => ({
      id: String(p.id),
      name: p.name || '',
      where: [p.location.city, p.location.state, p.location.country]
        .filter(Boolean)
        .join(', '),
    }));
}
