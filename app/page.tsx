"use client";

import { useState } from "react";
import MapClient from "./components/MapClient";
import SearchControls from "./components/SearchControls";

export default function Home() {
	const [locations, setLocations] = useState<any[]>([]);
	const [circle, setCircle] = useState<{
		center: { lat: number; lng: number } | null;
		radius: number | null;
	}>({ center: null, radius: null });

	return (
		<div className="container py-4">
			<h1 className="mb-3 text-center">Nature Explorer</h1>

			<SearchControls
				onSelectLocation={(p) => {
					if (p.location) {
						setLocations([
							{
								lat: p.location.lat,
								lng: p.location.lng,
								title: p.name || p.formatted_address,
							},
						]);
						setCircle({
							center: p.location,
							radius: p.radius_m || 8046.72,
						});
					}
				}}
			/>

			<div className="mt-4">
				<MapClient
					locations={locations}
					circleCenter={circle.center}
					circleRadiusM={circle.radius}
				/>
			</div>
		</div>
	);
}
