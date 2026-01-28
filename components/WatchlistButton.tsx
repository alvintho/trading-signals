'use client'

import React, {useMemo, useState} from "react";
import {addToWatchlist, removeFromWatchlist} from "@/lib/actions/watchlist.actions";
import {toast} from "sonner";
import {useDebounce} from "@/components/hooks/useDebounce";
import {Star} from "lucide-react";

const WatchlistButton = ({
    symbol,
    company,
    isInWatchlist,
    showTrashIcon = false,
    type = "button",
    onWatchlistChange,
}: WatchlistButtonProps) => {
    const [isAdded, setIsAdded] = useState<boolean>(isInWatchlist);

    const label = useMemo(() => {
        if (type === "icon") return isAdded ? "" : "";

        return isAdded ? "Remove from Watchlist" : "Add to Watchlist";
    }, [type, isAdded])

    const toggleWatchlist = async () => {
        const result = isAdded
            ? await removeFromWatchlist(symbol)
            : await addToWatchlist(symbol, company);

        if (result.success) {
            toast.success(isAdded ? "Removed from watchlist successfully." : "Added to watchlist successfully.", {
                description: `${company} ${isAdded ? "is removed from" : "is added to" } your watchlist`,
            });

            onWatchlistChange?.(symbol, !isAdded);
        }
    }

    // Debounce the toggle function to prevent rapid API calls (300ms delay)
    const debouncedToggle = useDebounce(toggleWatchlist, 300);

    const handleClick = (e: React.MouseEvent) => {
        // Prevent event bubbling and default behaviour
        e.stopPropagation();
        e.preventDefault();

        setIsAdded(!isAdded);
        debouncedToggle();
    }

    if (type === "icon") {
        return (
            <button
                title={isAdded ? `Remove ${symbol} from watchlist` : `Add ${symbol} to watchlist`}
                aria-label={isAdded ? `Remove ${symbol} from watchlist` : `Add ${symbol} to watchlist`}
                className={`watchlist-icon-btn ${isAdded ? "watchlist-icon-added" : ""}`}
                onClick={handleClick}
            >
                <Star fill={isAdded ? 'currentColor' : 'none'} />
            </button>
        );
    }

    return (
        <button className={`watchlist-btn ${isAdded ? "watchlist-remove" : ""}`} onClick={handleClick}>
            {showTrashIcon && isAdded ? (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5 mr-2"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-7 4v6m4-6v6m4-6v6" />
                </svg>
            ) : null}
            <span>{label}</span>
        </button>
    )


}
export default WatchlistButton
