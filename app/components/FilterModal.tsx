"use client";

import React, { useEffect, useRef } from "react";

// DEFAULT_OPTIONS is intentionally simple and easy to edit — update or
// replace this array to add/remove/modify dropdown items.
export const DEFAULT_OPTIONS: Option[] = [
	{ id: "species", label: "Species", type: "checkbox" },
	{ id: "date_range", label: "Date range", type: "custom" },
	{ id: "quality", label: "Observation quality", type: "checkbox" },
];

type Option = {
	id: string;
	label: string;
	type?: "checkbox" | "custom";
};

export default function FilterModal({
	open,
	onClose,
	anchorRef,
	options = DEFAULT_OPTIONS,
}: {
	open: boolean;
	onClose: () => void;
	anchorRef?: React.RefObject<HTMLElement | null> | null;
	options?: Option[];
}) {
	const panelRef = useRef<HTMLDivElement | null>(null);

	// close when clicking outside
	useEffect(() => {
		if (!open) return;
		function onDoc(e: MouseEvent) {
			const panel = panelRef.current;
			const anchor = anchorRef?.current || null;
			if (!panel) return;
			if (
				e.target &&
				(panel.contains(e.target as Node) ||
					(anchor && anchor.contains(e.target as Node)))
			)
				return;
			// click outside
			onClose();
		}
		document.addEventListener("mousedown", onDoc);
		return () => document.removeEventListener("mousedown", onDoc);
	}, [open, onClose, anchorRef]);

	if (!open) return null;

	// Render as a bootstrap-like dropdown menu. It is intended to be placed
	// directly next to the toggle button inside a relatively positioned parent.
	return (
		<div
			ref={panelRef}
			className={`dropdown-menu p-3 show`}
			style={{
				position: "absolute",
				top: "100%",
				left: 0,
				minWidth: 260,
				zIndex: 1060,
				boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
				borderRadius: 8,
				maxHeight: "60vh",
				overflow: "auto",
			}}
		>
			<div className="d-flex justify-content-between align-items-center mb-2">
				<h6 className="m-0">Filters</h6>
				<button
					className="btn btn-sm btn-outline-secondary"
					onClick={onClose}
				>
					Close
				</button>
			</div>

			<div className="small text-muted mb-2">
				Quick filter options — edit the top of `FilterModal.tsx` to
				change these.
			</div>

			<div>
				{options.map((opt) => (
					<div key={opt.id} className="mb-2">
						{opt.type === "checkbox" ? (
							<div className="form-check">
								<input
									className="form-check-input"
									type="checkbox"
									id={opt.id}
								/>
								<label
									className="form-check-label"
									htmlFor={opt.id}
								>
									{opt.label}
								</label>
							</div>
						) : (
							<div>
								<label className="form-label">
									{opt.label}
								</label>
								<input
									className="form-control form-control-sm"
									placeholder="(configure later)"
								/>
							</div>
						)}
					</div>
				))}
			</div>
		</div>
	);
}
