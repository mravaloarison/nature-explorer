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
	fullScreen = false,
}: {
	locations: Location[];
	center?: Location;
	zoom?: number;
	circleCenter?: Location | null;
	circleRadiusM?: number | null;
	fullScreen?: boolean;
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
					disableDefaultUI: true,
					clickableIcons: false,
					streetViewControl: false,
					fullscreenControl: false,
					mapTypeControl: false,
					zoomControl: false,
				});

				// cleanup previous overlays
				markersRef.current.forEach((m) => {
					try {
						if (!m) return;
						if ((m as any).object) {
							const wrapper = m as any;
							if (Array.isArray(wrapper.listeners)) {
								wrapper.listeners.forEach(
									(lst: any) =>
										lst &&
										typeof lst.remove === "function" &&
										lst.remove()
								);
							}
							if (
								wrapper.object &&
								typeof wrapper.object.setMap === "function"
							)
								wrapper.object.setMap(null);
							return;
						}
						if (typeof (m as any).setMap === "function")
							(m as any).setMap(null);
					} catch (e) {
						// ignore
					}
				});
				markersRef.current = [];

				// render explicit markers (if any)
				locations.forEach((loc) => {
					const marker = new google.maps.Marker({
						position: { lat: loc.lat, lng: loc.lng },
						map,
						title: loc.title,
					});
					markersRef.current.push(marker);
				});

				if (locations.length > 1) {
					const bounds = new google.maps.LatLngBounds();
					locations.forEach((l) =>
						bounds.extend(new google.maps.LatLng(l.lat, l.lng))
					);
					map.fitBounds(bounds);
				}

				// Draw an editable rectangle if requested
				if (circleCenter && circleRadiusM) {
					const metersToLat = (m: number) => m / 111000;
					const metersToLng = (m: number, lat: number) =>
						m / (111000 * Math.cos((lat * Math.PI) / 180));

					const latDelta = metersToLat(circleRadiusM);
					const lngDelta = metersToLng(
						circleRadiusM,
						circleCenter.lat
					);

					const sw = new google.maps.LatLng(
						circleCenter.lat - latDelta,
						circleCenter.lng - lngDelta
					);
					const ne = new google.maps.LatLng(
						circleCenter.lat + latDelta,
						circleCenter.lng + lngDelta
					);
					const bounds = new google.maps.LatLngBounds(sw, ne);

					const rectangle = new google.maps.Rectangle({
						bounds,
						editable: true,
						draggable: true,
						strokeColor: "#3388ff",
						strokeOpacity: 0.8,
						strokeWeight: 2,
						fillColor: "#3388ff",
						fillOpacity: 0.12,
						map,
					});

					const logBounds = () => {
						try {
							const b = rectangle.getBounds();
							if (!b) return;
							const ne = b.getNorthEast();
							const sw = b.getSouthWest();
							console.log("Rectangle bounds:", {
								north: ne.lat(),
								east: ne.lng(),
								south: sw.lat(),
								west: sw.lng(),
							});
						} catch (e) {
							console.error(e);
						}
					};

					const bListener = rectangle.addListener(
						"bounds_changed",
						() => logBounds()
					);
					const dListener = rectangle.addListener("dragend", () =>
						logBounds()
					);

					markersRef.current.push({
						object: rectangle,
						listeners: [bListener, dListener],
					});

					try {
						map.fitBounds(bounds);
					} catch (e) {
						console.warn("fitBounds failed", e);
						map.panTo({
							lat: circleCenter.lat,
							lng: circleCenter.lng,
						});
					}

					logBounds();
				}
			})
			.catch((err) => console.error(err));

		return () => {
			mounted = false;
			markersRef.current.forEach((m) => {
				try {
					if (!m) return;
					if ((m as any).object) {
						const wrapper = m as any;
						if (Array.isArray(wrapper.listeners)) {
							wrapper.listeners.forEach(
								(lst: any) =>
									lst &&
									typeof lst.remove === "function" &&
									lst.remove()
							);
						}
						if (
							wrapper.object &&
							typeof wrapper.object.setMap === "function"
						)
							wrapper.object.setMap(null);
						return;
					}
					if (typeof (m as any).setMap === "function")
						(m as any).setMap(null);
				} catch (e) {
					// ignore
				}
			});
			markersRef.current = [];
		};
	}, [locations, center, zoom]);

	return (
		<div style={{ position: "relative" }}>
			{!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
				<div className="alert alert-warning">
					Missing <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> — set
					it in your environment to load the interactive map.
				</div>
			) : null}

			{/* overlay: show first location title if available */}
			{locations && locations[0] && locations[0].title ? (
				<div
					style={{
						position: "absolute",
						top: 10,
						left: 10,
						zIndex: 2000,
						background: "rgba(255,255,255,0.9)",
						padding: "6px 10px",
						borderRadius: 6,
						boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
					}}
				>
					<strong>{locations[0].title}</strong>
				</div>
			) : null}

			<div
				ref={mapRef}
				style={{ width: "100%", height: fullScreen ? "100vh" : 500 }}
			/>
		</div>
	);
}
