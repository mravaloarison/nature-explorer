import { NextResponse } from "next/server";

const FIVE_MILES_IN_METERS = 5 * 1609.344; // 8046.72 meters

function pickComponent(components: any[] | undefined, type: string) {
	if (!components) return undefined;
	const c = components.find((comp) => Array.isArray(comp.types) && comp.types.includes(type));
	return c ? c.long_name : undefined;
}

export async function GET(req: Request) {
	try {
		const url = new URL(req.url);
		const input = url.searchParams.get("input") || "";
		if (!input || input.trim().length === 0) {
			return NextResponse.json({ error: "Missing 'input' query parameter" }, { status: 400 });
		}

		const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
		if (!apiKey) {
			return NextResponse.json({ error: "Missing Google Maps API key (set GOOGLE_MAPS_API_KEY)" }, { status: 500 });
		}

		// Call Place Autocomplete to get predictions
		const autocompleteUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
			input
		)}&key=${encodeURIComponent(apiKey)}&types=address&language=en`;

		const acRes = await fetch(autocompleteUrl);
		const acJson = await acRes.json();

		if (acJson.status !== "OK" && acJson.status !== "ZERO_RESULTS") {
			return NextResponse.json({ error: "Places Autocomplete error", details: acJson }, { status: 502 });
		}

		const predictions = Array.isArray(acJson.predictions) ? acJson.predictions : [];

		// For each prediction, get place details (geometry + address components)
		const results = await Promise.all(
			predictions.map(async (p: any) => {
				const placeId = p.place_id;
				const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
					placeId
				)}&key=${encodeURIComponent(apiKey)}&fields=name,formatted_address,address_component,geometry`;

				try {
					const dRes = await fetch(detailsUrl);
					const dJson = await dRes.json();
					if (dJson.status !== "OK") {
						return null;
					}

					const detail = dJson.result;
					const components = detail.address_components;
					const street_number = pickComponent(components, "street_number");
					const route = pickComponent(components, "route");
					const locality = pickComponent(components, "locality") || pickComponent(components, "postal_town") || pickComponent(components, "sublocality");
					const admin = pickComponent(components, "administrative_area_level_1");
					const postal = pickComponent(components, "postal_code");

					const street = [street_number, route].filter(Boolean).join(" ");

					const display_full = street
						? `${street}, ${locality || ""}${admin ? ", " + admin : ""}${postal ? ", " + postal : ""}`
						: detail.formatted_address;

					const display_short = [locality, admin, postal].filter(Boolean).join(", ");

					const location = detail.geometry?.location || null;

					return {
						place_id: placeId,
						name: detail.name || null,
						formatted_address: detail.formatted_address || null,
						display_short: display_short || null,
						display_full: display_full || null,
						location,
						radius_m: FIVE_MILES_IN_METERS,
						radius_miles: 5,
					};
				} catch (err) {
					return null;
				}
			})
		);

		const filtered = results.filter(Boolean);

		return NextResponse.json({ results: filtered });
	} catch (err: any) {
		return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
	}
}

