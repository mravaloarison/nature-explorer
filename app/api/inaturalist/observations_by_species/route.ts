import { NextRequest, NextResponse } from 'next/server';
export async function GET(req: NextRequest) {
  const url = new URL("https://api.inaturalist.org/v1/observations");
  const params = req.nextUrl.searchParams;

  const taxonId = params.get("taxon_id");
  const verifiable = params.get("verifiable") || "true";
  const page = params.get("page") || "1";
  const order = params.get("order") || "desc";
  const orderBy = params.get("order_by") || "observed_on";
  const perPage = params.get("per_page") || "200";

  const nelat = params.get("nelat");
  const nelng = params.get("nelng");
  const swlat = params.get("swlat");
  const swlng = params.get("swlng");

  const d1 = params.get("d1");
  const d2 = params.get("d2");

  if (taxonId) url.searchParams.set("taxon_id", taxonId);
  url.searchParams.set("verifiable", verifiable);
  url.searchParams.set("page", page);
  url.searchParams.set("order", order);
  url.searchParams.set("order_by", orderBy);
  url.searchParams.set("per_page", perPage);

  if (nelat) url.searchParams.set("nelat", nelat);
  if (nelng) url.searchParams.set("nelng", nelng);
  if (swlat) url.searchParams.set("swlat", swlat);
  if (swlng) url.searchParams.set("swlng", swlng);

  if (d1) url.searchParams.set("d1", d1);
  if (d2) url.searchParams.set("d2", d2);

  try {
    const res = await fetch(url.toString());
    const data = await res.json();

    const observations = data.results.map((obs: any) => {
      return {
        observer: obs.user?.name ?? obs.user?.login ?? 'Unknown',
        observer_link: `https://www.inaturalist.org/people/${obs.user?.id}`,

        observed_on: obs.observed_on_details?.date || obs.observed_on,
        time_observed_at: obs.time_observed_at ?? null,

        location: obs.location ?? 'Unknown',
        place_guess: obs.place_guess ?? null,

        photos: obs.photos?.map((photo: any) => ({
          url: photo.url,
          attribution: photo.attribution || null,
        })),
      }
    })

    return NextResponse.json({
      total_results: data.total_results,
      page: data.page,
      per_page: data.per_page,
      observations
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch observations" }, { status: 500 });
  }
}
