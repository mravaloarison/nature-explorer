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
		<div style={{ height: "100vh", width: "100%", position: "relative" }}>
			{/* overlay header */}
			<header
				style={{
					position: "absolute",
					top: 0,
					left: "50%",
					transform: "translateX(-50%)",
					zIndex: 3000,
					maxWidth: 980,
					width: "100%",
					display: "flex",
					alignItems: "center",
					gap: 12,
					background: "rgba(255,255,255,0.92)",
					padding: "10px 12px",
					borderRadius: "0 0 8px 8px",
					boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
				}}
			>
				<h1 style={{ margin: 0, fontSize: 20 }}>Explore Nature</h1>
				<div style={{ flex: 1 }}>
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
				</div>
			</header>

			<MapClient
				locations={locations}
				circleCenter={circle.center}
				circleRadiusM={circle.radius}
				fullScreen
			/>
		</div>
	);
}
