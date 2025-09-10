"use client";

import React, { useEffect, useRef, useState } from "react";

type Mode = "near_me" | "species" | "ai";

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
	const [mode, setMode] = useState<Mode>("near_me");
	const [input, setInput] = useState("");
	const [suggestions, setSuggestions] = useState<any[]>([]);
	const [loading, setLoading] = useState(false);
	const [selectedText, setSelectedText] = useState<string | null>(null);
	const [selectionLocked, setSelectionLocked] = useState(false);

	const sessionTokenRef = useRef<any>(null);
	const debounceRef = useRef<number | null>(null);
	// persist near_me input when switching away, restore when coming back
	const [savedNearMe, setSavedNearMe] = useState<{
		input: string;
		selectedText: string | null;
		selectionLocked: boolean;
	} | null>(null);
	const prevModeRef = useRef<Mode>(mode);

	useEffect(() => {
		if (mode !== "near_me") {
			setSuggestions([]);
			return;
		}

		if (selectionLocked) {
			setSuggestions([]);
			setLoading(false);
			return;
		}

		if (!input || input.trim().length === 0) {
			setSuggestions([]);
			setLoading(false);
			return;
		}

		setLoading(true);
		if (debounceRef.current) window.clearTimeout(debounceRef.current);
		debounceRef.current = window.setTimeout(() => {
			if (
				typeof window === "undefined" ||
				!(window as any).google ||
				!(window as any).google.maps ||
				!(window as any).google.maps.places
			) {
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
					{ input },
					(predictions: any, status: any) => {
						if (
							status ===
								(window as any).google.maps.places
									.PlacesServiceStatus.OK &&
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

		return () => {
			if (debounceRef.current) window.clearTimeout(debounceRef.current);
		};
	}, [input, mode]);

	// Handle mode transitions: save near_me state when leaving, restore on return.
	useEffect(() => {
		const prev = prevModeRef.current;
		if (prev === "near_me" && mode !== "near_me") {
			// leaving near_me: save and clear visible input for other modes
			setSavedNearMe({ input, selectedText, selectionLocked });
			setInput("");
			setSelectedText(null);
			setSelectionLocked(false);
			setSuggestions([]);
		}

		if (prev !== "near_me" && mode === "near_me") {
			// returning to near_me: restore saved state
			if (savedNearMe) {
				setInput(savedNearMe.input);
				setSelectedText(savedNearMe.selectedText);
				setSelectionLocked(savedNearMe.selectionLocked);
			}
		}

		prevModeRef.current = mode;
	}, [mode]);

	return (
		<div className="mb-3">
			<div className="d-flex gap-2 mb-2">
				<div className="btn-group" role="group">
					<button
						type="button"
						className={`btn ${
							mode === "near_me"
								? "btn-primary"
								: "btn-outline-primary"
						}`}
						onClick={() => setMode("near_me")}
					>
						Search near me
					</button>
					<button
						type="button"
						className={`btn ${
							mode === "species"
								? "btn-primary"
								: "btn-outline-primary"
						}`}
						onClick={() => setMode("species")}
					>
						Find species
					</button>
					<button
						type="button"
						className={`btn ${
							mode === "ai"
								? "btn-primary"
								: "btn-outline-primary"
						}`}
						onClick={() => setMode("ai")}
					>
						Ask AI
					</button>
				</div>
			</div>

			<div className="input-group">
				<input
					className="form-control"
					placeholder={
						mode === "near_me"
							? "Search address or place"
							: mode === "species"
							? "Search species name"
							: "Ask AI (question)"
					}
					value={input}
					onChange={(e) => {
						setInput(e.target.value);
						setSelectionLocked(false);
						setSuggestions([]);
						setSelectedText(null);
					}}
				/>
				{input !== "" && (
					<button
						type="button"
						className="btn btn-outline-secondary"
						onClick={() => {
							setInput("");
							setSuggestions([]);
							setSelectedText(null);
							setSelectionLocked(false);
						}}
						aria-label="Clear input"
					>
						Clear
					</button>
				)}
			</div>

			<div className="mt-2">
				{selectedText ? (
					<div>
						<strong>Selected:</strong> {selectedText}
					</div>
				) : null}

				{mode === "near_me" && (
					<div className="list-group mt-2">
						{loading && (
							<div className="text-muted small">Searching...</div>
						)}
						{!loading &&
							suggestions.length === 0 &&
							input.trim() !== "" &&
							!selectionLocked && (
								<div className="text-muted small">
									No results
								</div>
							)}

						{suggestions.map((s) => (
							<button
								key={s.place_id}
								type="button"
								className="list-group-item list-group-item-action"
								onClick={() => {
									const text =
										s.description ||
										s.structured_formatting?.main_text ||
										"";
									setSelectedText(text);
									setInput(text);
									setSuggestions([]);
									setSelectionLocked(true);
								}}
							>
								<div className="fw-bold">{s.description}</div>
								<div className="small text-muted">
									{s.structured_formatting?.secondary_text}
								</div>
							</button>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
