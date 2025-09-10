import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
	const query = req.nextUrl.searchParams.get("q");
	if (!query) {
		return NextResponse.json(
			{ error: "Query is required" },
			{ status: 400 }
		);
	}

	try {
		const res = await fetch(
			`https://api.inaturalist.org/v1/search?q=${encodeURIComponent(
				query
			)}&sources=taxa`
		);
		const data = await res.json();

		const filtered = data.results
			.filter(
				(r: any) => r.type === "Taxon" && r.record?.rank !== "hybrid"
			)
			.map((r: any) => {
				const record = r.record;
				return {
					taxon_id: record.id,
					common_name: record.preferred_common_name ?? null,
					scientific_name: record.name,
					image: record.default_photo?.medium_url ?? null,
				};
			});

		return NextResponse.json(filtered);
	} catch (error) {
		console.error(error);
		return NextResponse.json(
			{ error: "Autocomplete fetch failed" },
			{ status: 500 }
		);
	}
}
