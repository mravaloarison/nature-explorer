import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const placeId = req.nextUrl.searchParams.get('place_id');
  const pageParam = req.nextUrl.searchParams.get('page');
  const order = req.nextUrl.searchParams.get('order') || 'desc';
  const orderBy = req.nextUrl.searchParams.get('order_by') || 'observed_on';
  const endemic = req.nextUrl.searchParams.get('endemic') === 'true';
  const threatened = req.nextUrl.searchParams.get('threatened') === 'true';
  const native = req.nextUrl.searchParams.get('native') === 'true';
  const iconicTaxa = req.nextUrl.searchParams.get('iconic_taxa'); 
  const page = parseInt(pageParam || '1', 10);
  const perPage = req.nextUrl.searchParams.get('per_page') || '200';


  if (!placeId) {
    return NextResponse.json({ error: 'place_id is required' }, { status: 400 });
  }

  try {
    const url = new URL('https://api.inaturalist.org/v1/observations');
    url.searchParams.set('verifiable', 'true');
    if (placeId) url.searchParams.set('place_id', placeId);
    url.searchParams.set('order', order);
    url.searchParams.set('order_by', orderBy);
    url.searchParams.set('per_page', perPage);
    url.searchParams.set('page', String(page));

    if (endemic) url.searchParams.set('endemic', 'true');
    if (threatened) url.searchParams.set('threatened', 'true');
    if (native) url.searchParams.set('native', 'true');
    if (iconicTaxa) url.searchParams.set('iconic_taxa', iconicTaxa);

    const obsRes = await fetch(url);
    const obsData = await obsRes.json();

    const observations = obsData.results.map((obs: any) => ({
      observer: obs.user?.name_autocomplete || obs.user?.login || 'Unknown',
      observer_link: `https://www.inaturalist.org/people/${obs.user?.id}`,

      observed_on: obs.observed_on_details?.date || obs.observed_on,
      time_observed_at: obs.time_observed_at ?? null,
      
      location: obs.location ?? 'Unknown',
      place_guess: obs.place_guess ?? null,

      photos: obs.photos?.map((photo: any) => ({
        url: photo.url,
        attribution: photo.attribution ?? null
      })) ?? [],

      taxon: obs.taxon ? {
        id: obs.taxon.id,
        scientific_name: obs.taxon.name,
        common_name: obs.taxon.preferred_common_name ?? null,
      } : null
    }));

    return NextResponse.json({
      total_results: obsData.total_results,
      page: obsData.page,
      per_page: obsData.per_page,
      observations
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch location observations' }, { status: 500 });
  }
}
