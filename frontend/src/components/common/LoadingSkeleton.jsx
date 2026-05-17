const LoadingSkeleton = ({ rows = 5 }) => {
    return (
        <div className="space-y-3 animate-pulse">
            {/* Table Header Skeleton */}
            <div className="grid grid-cols-6 gap-4 bg-slate-100 p-4 rounded-lg">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-4 bg-slate-200 rounded"></div>
                ))}
            </div>

            {/* Table Rows Skeleton */}
            {[...Array(rows)].map((_, rowIndex) => (
                <div key={rowIndex} className="grid grid-cols-6 gap-4 bg-white border border-slate-200 p-4 rounded-lg">
                    {[...Array(6)].map((_, colIndex) => (
                        <div
                            key={colIndex}
                            className="h-4 bg-slate-100 rounded"
                            style={{ width: `${Math.random() * 40 + 60}%` }}
                        ></div>
                    ))}
                </div>
            ))}
        </div>
    );
};

export default LoadingSkeleton;
