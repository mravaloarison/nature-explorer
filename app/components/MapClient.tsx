"use client";

import React, { useEffect, useRef } from "react";

type Location = { lat: number; lng: number; title?: string };

declare global {
	interface Window {
		google?: any;
	}
}

const isScriptLoaded = () => typeof window !== "undefined" && !!window.google;

const loadScript = (src: string) =>
	new Promise<void>((resolve, reject) => {
		if (isScriptLoaded()) return resolve();
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

export default function MapClient({
	locations,
	center,
	zoom = 4,
	circleCenter = null,
	circleRadiusM = null,
}: {
	locations: Location[];
	center?: Location;
	zoom?: number;
	circleCenter?: Location | null;
	circleRadiusM?: number | null;
}) {
	const mapRef = useRef<HTMLDivElement | null>(null);
	const markersRef = useRef<any[]>([]);

	useEffect(() => {
		const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
		if (!apiKey) {
			console.warn(
				"Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY environment variable. Map will not load."
			);
			return;
		}

		const src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=weekly`;

		let mounted = true;

		loadScript(src)
			.then(() => {
				if (!mounted) return;
				if (!mapRef.current) return;
				const google = window.google;
				const mapCenter =
					center ||
					(locations && locations.length
						? locations[0]
						: { lat: 0, lng: 0 });
				const map = new google.maps.Map(mapRef.current, {
					center: mapCenter,
					zoom,
				});

				// clear any previous markers
				markersRef.current.forEach((m) => m.setMap(null));
				markersRef.current = [];

				locations.forEach((loc) => {
					const marker = new google.maps.Marker({
						position: { lat: loc.lat, lng: loc.lng },
						map,
						title: loc.title,
					});
					markersRef.current.push(marker);
				});

				// If many markers, fit to bounds
				if (locations.length > 1) {
					const bounds = new google.maps.LatLngBounds();
					locations.forEach((l) =>
						bounds.extend(new google.maps.LatLng(l.lat, l.lng))
					);
					map.fitBounds(bounds);
				}

				// Draw circle if requested
				if (circleCenter && circleRadiusM) {
					const circle = new google.maps.Circle({
						strokeColor: "#3388ff",
						strokeOpacity: 0.8,
						strokeWeight: 2,
						fillColor: "#3388ff",
						fillOpacity: 0.15,
						map,
						center: {
							lat: circleCenter.lat,
							lng: circleCenter.lng,
						},
						radius: circleRadiusM,
					});
					markersRef.current.push(circle);
				}
			})
			.catch((err) => console.error(err));

		return () => {
			mounted = false;
			markersRef.current.forEach((m) => {
				try {
					if (m && typeof m.setMap === "function") m.setMap(null);
				} catch (e) {
					// ignore
				}
			});
			markersRef.current = [];
		};
	}, [locations, center, zoom]);

	return (
		<div>
			{!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
				<div className="alert alert-warning">
					Missing <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> — set
					it in your environment to load the interactive map.
				</div>
			) : null}
			<div ref={mapRef} style={{ width: "100%", height: 500 }} />
		</div>
	);
}
