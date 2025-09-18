"use client";

import React, { useEffect, useRef, useState } from "react";

const ICONIC_TAXA = [
	"Mammalia",
	"Aves",
	"Reptilia",
	"Amphibia",
	"Actinopterygii",
	"Insecta",
	"Arachnida",
	"Plantae",
	"Fungi",
	"Protozoa",
	"Chromista",
];

export default function FilterModal({
	open,
	onClose,
	anchorRef,
	onApply,
	onClear,
	initial,
}: {
	open: boolean;
	onClose: () => void;
	anchorRef?: React.RefObject<HTMLElement | null> | null;
	onApply: (filters: {
		categories: string[];
		dateFrom?: string | null;
		dateTo?: string | null;
	}) => void;
	onClear?: () => void;
	initial?: {
		categories?: string[];
		dateFrom?: string | null;
		dateTo?: string | null;
	};
}) {
	const panelRef = useRef<HTMLDivElement | null>(null);
	const [categories, setCategories] = useState<string[]>(
		initial?.categories ?? []
	);
	const [dateFrom, setDateFrom] = useState<string | null>(
		initial?.dateFrom ?? null
	);
	const [dateTo, setDateTo] = useState<string | null>(
		initial?.dateTo ?? null
	);

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
			onClose();
		}
		document.addEventListener("mousedown", onDoc);
		return () => document.removeEventListener("mousedown", onDoc);
	}, [open, onClose, anchorRef]);

	useEffect(() => {
		if (open && initial) {
			setCategories(initial.categories ?? []);
			setDateFrom(initial.dateFrom ?? null);
			setDateTo(initial.dateTo ?? null);
		}
	}, [open, initial]);

	if (!open) return null;

	function toggleCategory(t: string) {
		setCategories((prev) =>
			prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
		);
	}

	function handleClear() {
		setCategories([]);
		setDateFrom(null);
		setDateTo(null);
		if (typeof onClear === "function") onClear();
	}

	function handleApply() {
		const payload = { categories, dateFrom, dateTo };
		try {
			console.log(JSON.stringify(payload));
		} catch (e) {
			console.log(payload);
		}
		onApply(payload);
		onClose();
	}

	return (
		<div
			ref={panelRef}
			className={`dropdown-menu show`}
			style={{
				position: "absolute",
				top: "93%",
				right: 0,
				maxWidth: 860,
				width: "100%",
				zIndex: 1060,
				boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
				background: "rgba(255,255,255,0.92)",
				borderRadius: "0 0 8px 8px",
				maxHeight: "70vh",
				overflow: "auto",
			}}
		>
			<div
				className="d-flex flex-column flex-md-row divide-y px-3"
				style={{ gap: 16 }}
			>
				<div className="mb-3" style={{ flex: 1, minWidth: 0 }}>
					<div className="fw-bold mb-1">Categories</div>
					<div className="small text-muted mb-2">
						Select one or more taxonomic categories
					</div>
					<div
						className=""
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(2, 1fr)",
							gap: 8,
						}}
					>
						{ICONIC_TAXA.map((t) => {
							const emojiMap: Record<string, string> = {
								Mammalia: "🦌",
								Aves: "🦅",
								Reptilia: "🦎",
								Amphibia: "🐸",
								Actinopterygii: "🐟",
								Insecta: "🪲",
								Arachnida: "🕷️",
								Plantae: "🌿",
								Fungi: "🍄",
								Protozoa: "🦠",
								Chromista: "🪸",
							};
							const emoji = emojiMap[t] ?? "🔍";
							return (
								<label
									key={t}
									className="d-flex align-items-center form-check"
									style={{ gap: 8, cursor: "pointer" }}
									htmlFor={`cat_${t}`}
								>
									<input
										className="form-check-input"
										type="checkbox"
										id={`cat_${t}`}
										checked={categories.includes(t)}
										onChange={() => toggleCategory(t)}
										style={{ marginRight: 6 }}
									/>
									<span style={{ fontSize: 18, width: 24 }}>
										{emoji}
									</span>
									<span>{t}</span>
								</label>
							);
						})}
					</div>
				</div>

				<div className="mb-3" style={{ flex: 1, minWidth: 0 }}>
					<div className="fw-bold mb-1">Date range</div>
					<div className="d-flex flex-column gap-2">
						<span className="small text-muted">From</span>
						<input
							className="form-control form-control-md"
							type="date"
							value={dateFrom ?? ""}
							onChange={(e) =>
								setDateFrom(e.target.value || null)
							}
						/>
						<span className="small text-muted">to</span>
						<input
							className="form-control form-control-md"
							type="date"
							value={dateTo ?? ""}
							onChange={(e) => setDateTo(e.target.value || null)}
						/>
					</div>
				</div>
			</div>

			<div className="d-flex justify-content-end mt-2 border-top pt-2 px-3 bg-light">
				<button
					className="btn btn-md btn-outline-secondary me-2"
					onClick={() => {
						handleClear();
						onClose();
					}}
				>
					<i className="bi bi-trash" /> Clear
				</button>
				<button
					className="btn btn-md btn-outline-success"
					onClick={handleApply}
				>
					<i className="bi bi-brush me-1" /> Apply
				</button>
			</div>
		</div>
	);
}
