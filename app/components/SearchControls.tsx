"use client";

import React, { useState, useRef, useEffect } from "react";

export default function SearchControls({
	onSelectLocation,
}: {
	onSelectLocation: (payload: {
		place_id: string;
		name?: string | null;
		formatted_address?: string | null;
		location?: { lat: number; lng: number } | null;
		radius_m?: number | null;
	}) => void;
}) {
	const [species, setSpecies] = useState("");
	const [location, setLocation] = useState("");
	const [suggestions, setSuggestions] = useState<any[]>([]);
	const [loading, setLoading] = useState(false);
	const sessionTokenRef = useRef<any>(null);
	const debounceRef = useRef<number | null>(null);

	// Keep track of the selected place to optionally show in UI
	const [selectedPlace, setSelectedPlace] = useState<{
		place_id?: string;
		name?: string | null;
		formatted_address?: string | null;
		location?: { lat: number; lng: number } | null;
	} | null>(null);

	const scriptLoadedRef = useRef(false);

	const loadScript = (src: string) =>
		new Promise<void>((resolve, reject) => {
			if (typeof window !== "undefined" && (window as any).google)
				return resolve();
			const existing = document.querySelector(
				`script[src^="https://maps.googleapis.com/maps/api/js"]`
			);
			if (existing) {
				existing.addEventListener("load", () => resolve());
				existing.addEventListener("error", () =>
					reject(new Error("Google Maps failed to load"))
				);
				return;
			}
			const s = document.createElement("script");
			s.src = src;
			s.async = true;
			s.defer = true;
			s.addEventListener("load", () => resolve());
			s.addEventListener("error", () =>
				reject(new Error("Google Maps failed to load"))
			);
			document.head.appendChild(s);
		});

	useEffect(() => {
		const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
		if (!apiKey) return;
		const src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=weekly`;
		loadScript(src)
			.then(() => {
				scriptLoadedRef.current = true;
			})
			.catch(() => {
				scriptLoadedRef.current = false;
			});
	}, []);

	function handleSearch() {
		// Placeholder: trigger species+location search logic.
		console.log("Search", { species, location });
	}

	function handleAskAI() {
		// Placeholder: open AI question flow.
		console.log("Ask AI", { species, location });
	}

	function handleFilterClick() {
		// Placeholder for filter action (open modal or drawer).
		console.log("Filter clicked");
	}

	function selectPrediction(p: any) {
		// fetch place details
		if (!(window as any).google) return;
		const google = (window as any).google;
		const service = new google.maps.places.PlacesService(
			document.createElement("div")
		);
		service.getDetails(
			{
				placeId: p.place_id,
				fields: ["geometry", "name", "formatted_address"],
			},
			(details: any, status: any) => {
				if (
					status === google.maps.places.PlacesServiceStatus.OK &&
					details &&
					details.geometry &&
					details.geometry.location
				) {
					const lat = details.geometry.location.lat();
					const lng = details.geometry.location.lng();
					const payload = {
						place_id: p.place_id,
						name: details.name,
						formatted_address: details.formatted_address,
						location: { lat, lng },
					};
					setSelectedPlace(payload);
					setLocation(
						p.description || details.formatted_address || ""
					);
					setSuggestions([]);
					// bubble up to parent
					onSelectLocation(payload as any);
				}
			}
		);
	}

	function onLocationInputChange(v: string) {
		setLocation(v);
		setSelectedPlace(null);
		setSuggestions([]);
		if (debounceRef.current) window.clearTimeout(debounceRef.current);
		if (!v || v.trim().length === 0) {
			setLoading(false);
			return;
		}
		setLoading(true);
		debounceRef.current = window.setTimeout(() => {
			if (!(window as any).google || !scriptLoadedRef.current) {
				setLoading(false);
				setSuggestions([]);
				return;
			}
			try {
				const ga = (window as any).google.maps.places;
				if (!sessionTokenRef.current)
					sessionTokenRef.current = new ga.AutocompleteSessionToken();
				const service = new ga.AutocompleteService();
				service.getPlacePredictions(
					{ input: v },
					(predictions: any, status: any) => {
						if (
							status === ga.PlacesServiceStatus.OK &&
							Array.isArray(predictions)
						) {
							setSuggestions(
								predictions.map((p: any) => ({
									place_id: p.place_id,
									description: p.description,
									structured_formatting:
										p.structured_formatting,
								}))
							);
						} else {
							setSuggestions([]);
						}
						setLoading(false);
					}
				);
			} catch (e) {
				console.error(e);
				setLoading(false);
			}
		}, 300);
	}

	return (
		<div
			className="d-flex align-items-center gap-2"
			style={{ width: "100%" }}
		>
			<div className="d-flex gap-2" style={{ flex: 1 }}>
				<div style={{ flex: 1, minWidth: 0, position: "relative" }}>
					<input
						className="form-control form-control-md"
						placeholder="Location (address or place)"
						value={location}
						onChange={(e) => onLocationInputChange(e.target.value)}
					/>

					{suggestions.length > 0 && (
						<div
							className="list-group position-absolute"
							style={{
								zIndex: 2000,
								left: "50%",
								transform: "translateX(-50%)",
								width: "min(44vw, 440px)",
								marginTop: 8,
							}}
						>
							{suggestions.map((s) => (
								<button
									key={s.place_id}
									type="button"
									className="list-group-item list-group-item-action"
									onClick={() => selectPrediction(s)}
								>
									<div className="fw-bold">
										{s.description}
									</div>
									<div className="small text-muted">
										{
											s.structured_formatting
												?.secondary_text
										}
									</div>
								</button>
							))}
						</div>
					)}
				</div>

				<div style={{ flex: 1, minWidth: 0 }}>
					<input
						className="form-control form-control-md"
						placeholder="Species (e.g., Quercus robur)"
						value={species}
						onChange={(e) => setSpecies(e.target.value)}
					/>
				</div>
			</div>

			<button
				type="button"
				className="btn btn-outline-secondary btn-md"
				onClick={handleSearch}
			>
				<i className="bi bi-search-heart"></i>
			</button>

			<button
				type="button"
				className="btn btn-outline-success btn-md d-flex align-items-center text-nowrap"
				onClick={handleAskAI}
				aria-label="Ask AI"
				title="Ask AI"
			>
				<i className="bi bi-robot"></i>
				<span className="ms-2">Ask&nbsp;AI</span>
			</button>

			<button
				type="button"
				className="btn btn-outline-secondary btn-md d-flex align-items-center text-nowrap"
				onClick={handleFilterClick}
				aria-label="Filters"
				title="Filters"
			>
				<i className="bi bi-filter"></i>
				<span className="ms-2">Filters</span>
			</button>
		</div>
	);
}
