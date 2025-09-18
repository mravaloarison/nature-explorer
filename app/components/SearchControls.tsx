"use client";

import React, { useState, useRef, useEffect } from "react";
import FilterModal from "./FilterModal";

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
	const [speciesSuggestions, setSpeciesSuggestions] = useState<any[]>([]);
	const [speciesLoading, setSpeciesLoading] = useState(false);
	const sessionTokenRef = useRef<any>(null);
	const debounceRef = useRef<number | null>(null);
	const speciesDebounceRef = useRef<number | null>(null);

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

	const [filtersOpen, setFiltersOpen] = useState(false);
	const [appliedFilters, setAppliedFilters] = useState<{
		categories: string[];
		dateFrom?: string | null;
		dateTo?: string | null;
	}>({ categories: [], dateFrom: null, dateTo: null });
	const filterAnchorRef = useRef<HTMLDivElement | null>(null);

	// compute a simple filter count: number of categories + 1 if dateFrom/dateTo set
	const filterCount =
		(appliedFilters?.categories?.length ?? 0) +
		(appliedFilters?.dateFrom || appliedFilters?.dateTo ? 1 : 0);

	function handleFilterClick() {
		setFiltersOpen((s) => !s);
	}

	function handleApplyFilters(filters: {
		categories: string[];
		dateFrom?: string | null;
		dateTo?: string | null;
	}) {
		setAppliedFilters(filters);
		setFiltersOpen(false);
		console.log("Applied filters", filters);
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

	async function onSpeciesInputChange(v: string) {
		setSpecies(v);
		setSpeciesSuggestions([]);
		if (speciesDebounceRef.current)
			window.clearTimeout(speciesDebounceRef.current);
		if (!v || v.trim().length === 0) {
			setSpeciesLoading(false);
			return;
		}

		setSpeciesLoading(true);
		speciesDebounceRef.current = window.setTimeout(async () => {
			try {
				const res = await fetch(
					`/api/inaturalist/autocomplete/species?q=${encodeURIComponent(
						v
					)}`
				);
				if (!res.ok) {
					setSpeciesSuggestions([]);
					setSpeciesLoading(false);
					return;
				}
				const data = await res.json();
				setSpeciesSuggestions(Array.isArray(data) ? data : []);
			} catch (e) {
				console.error(e);
				setSpeciesSuggestions([]);
			} finally {
				setSpeciesLoading(false);
			}
		}, 300);
	}

	function selectSpecies(s: any) {
		// prefer common name if available, else scientific name
		const label = s.common_name ?? s.scientific_name ?? "";
		setSpecies(label);
		setSpeciesSuggestions([]);
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
						style={{ width: "100%", paddingRight: 40 }}
					/>

					{location !== "" && (
						<button
							type="button"
							aria-label="Clear location"
							title="Clear"
							className="btn btn-sm btn"
							onClick={() => {
								setLocation("");
								setSuggestions([]);
								setSelectedPlace(null);
								setLoading(false);
							}}
							style={{
								position: "absolute",
								right: 6,
								top: "50%",
								transform: "translateY(-50%)",
								zIndex: 2100,
								padding: "0.15rem 0.4rem",
							}}
						>
							<i className="bi bi-x-lg"></i>
						</button>
					)}

					{suggestions.length > 0 && (
						<div
							className="list-group position-absolute"
							style={{
								zIndex: 2000,
								left: 0,
								right: 0,
								width: "100%",
								marginTop: 8,
								maxHeight: "40vh",
								overflowY: "auto",
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

				<div style={{ flex: 1, minWidth: 0, position: "relative" }}>
					<input
						className="form-control form-control-md"
						placeholder="Species (e.g., Quercus robur)"
						value={species}
						onChange={(e) => onSpeciesInputChange(e.target.value)}
						style={{ width: "100%", paddingRight: 40 }}
					/>

					{species !== "" && (
						<button
							type="button"
							aria-label="Clear species"
							title="Clear"
							className="btn btn-sm btn"
							onClick={() => {
								setSpecies("");
								setSpeciesSuggestions([]);
								setSpeciesLoading(false);
							}}
							style={{
								position: "absolute",
								right: 6,
								top: "50%",
								transform: "translateY(-50%)",
								zIndex: 2100,
								padding: "0.15rem 0.4rem",
							}}
						>
							<i className="bi bi-x-lg"></i>
						</button>
					)}

					{speciesSuggestions.length > 0 && (
						<div
							className="list-group position-absolute"
							style={{
								zIndex: 2000,
								left: 0,
								right: 0,
								width: "100%",
								marginTop: 8,
								maxHeight: "40vh",
								overflowY: "auto",
							}}
						>
							{speciesSuggestions.map((s) => (
								<button
									key={s.taxon_id}
									type="button"
									className="list-group-item list-group-item-action d-flex align-items-center"
									onClick={() => selectSpecies(s)}
								>
									{s.image ? (
										<img
											src={s.image}
											alt={s.scientific_name}
											style={{
												width: 48,
												height: 48,
												objectFit: "cover",
												borderRadius: 4,
												marginRight: 8,
											}}
										/>
									) : null}
									<div>
										<div className="fw-bold">
											{s.common_name ?? s.scientific_name}
										</div>
										<div className="small text-muted">
											{s.scientific_name}
										</div>
									</div>
								</button>
							))}
						</div>
					)}
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

			<div ref={filterAnchorRef}>
				<button
					type="button"
					className="btn btn-outline-secondary btn-md d-flex align-items-center text-nowrap position-relative"
					onClick={handleFilterClick}
					aria-label="Filters"
					title="Filters"
				>
					<i className="bi bi-filter"></i>
					<span className="ms-2">Filters</span>
					{filterCount > 0 && (
						<span
							className="badge bg-danger"
							style={{
								position: "absolute",
								top: -6,
								right: -6,
								fontSize: 11,
							}}
						>
							{filterCount}
						</span>
					)}
				</button>
				{/* Filter modal anchored to this button */}
				<FilterModal
					open={filtersOpen}
					onClose={() => setFiltersOpen(false)}
					anchorRef={filterAnchorRef}
					onApply={handleApplyFilters}
					onClear={() => {
						setAppliedFilters({
							categories: [],
							dateFrom: null,
							dateTo: null,
						});
						setFiltersOpen(false);
					}}
					initial={appliedFilters}
				/>
			</div>
		</div>
	);
}
