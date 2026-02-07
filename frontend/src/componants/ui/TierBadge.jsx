import React from 'react';

const getTier = (points) => {
    const p = points || 0;
    if (p >= 1500) return { name: 'PLATINUM', classes: 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-cyan-400' };
    if (p >= 800) return { name: 'GOLD', classes: 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white border-amber-400' };
    if (p >= 200) return { name: 'SILVER', classes: 'bg-gradient-to-r from-slate-400 to-slate-500 text-white border-slate-400' };
    return { name: 'BRONZE', classes: 'bg-gradient-to-r from-orange-400 to-red-500 text-white border-orange-400' };
};

export default function TierBadge({ points, className = '' }) {
    const { name, classes } = getTier(points);

    return (
        <span
            className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-bold border shadow-sm tracking-wider ${classes} ${className}`}
            title={`${points} Points`}
        >
            {name} <span className="mx-1 opacity-75">|</span> {points}
        </span>
    );
}
