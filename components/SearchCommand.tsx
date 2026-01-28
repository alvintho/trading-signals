'use client';

import {useState, useEffect, useCallback, useMemo} from 'react';
import {
    CommandDialog,
    CommandEmpty,
    CommandInput,
    CommandList,
} from "@/components/ui/command";
import {Button} from "@/components/ui/button";
import {Loader2, TrendingUp} from "lucide-react";
import Link from "next/link";
import {searchStocks} from "@/lib/actions/finnhub.actions";
import {useDebounce} from "@/components/hooks/useDebounce";
import WatchlistButton from "@/components/WatchlistButton";

export function SearchCommand({ renderAs = 'button', label = 'Add stock', initialStocks }: SearchCommandProps) {
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [stocks, setStocks] = useState<StockWithWatchlistStatus[]>(initialStocks);

    const isSearchMode = useMemo(() => !!searchTerm.trim(), [searchTerm]);
    const displayStocks = isSearchMode ? stocks : stocks?.slice(0, 10)

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setOpen((v) => !v);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    const handleSearch = useCallback(async () => {
        if (!isSearchMode) return setStocks(initialStocks);

        setIsLoading(true);

        try {
            const result = await searchStocks(searchTerm.trim())
            setStocks(result);

        } catch {
            setStocks([]);
        } finally {
            setIsLoading(false);
        }
    }, [searchTerm, setIsLoading, setStocks, initialStocks, isSearchMode]);

    const debouncedSearch = useDebounce(handleSearch, 300);

    useEffect(() => {
        debouncedSearch();
    }, [searchTerm, debouncedSearch]);

    const handleSelectStock = () => {
        setOpen(false);
        setSearchTerm("");
        setStocks(initialStocks);
    };

    const handleWatchlistChange = async (symbol: string, isAdded: boolean) => {
        setStocks(
            initialStocks?.map((stock) => stock.symbol === symbol ? { ...stock, isInWatchlist: isAdded} : stock) || []
        )
    }

    return (
        <>
            {renderAs === 'text' ? (
                <span onClick={() => setOpen(true)} className="search-text">
                    {label}
                </span>
            ): (
                <Button onClick={() => setOpen(true)} className="search-btn">
                    {label}
                </Button>
            )}
            <CommandDialog open={open} onOpenChange={setOpen} className="search-dialog">
                <div className="search-field">
                    <CommandInput value={searchTerm} onValueChange={setSearchTerm} placeholder="Search stocks..." className="search-input" />
                    {isLoading && <Loader2 className="search-loader" />}
                </div>
                <CommandList className="search-list" >
                    {isLoading ? (
                        <CommandEmpty className="search-list-empty">Loading stocks ...</CommandEmpty>
                    ): displayStocks?.length === 0 ? (
                        <div className="search-list-indicator">
                            {isSearchMode ? 'No results found' : 'No stocks available'}
                        </div>
                    ): (
                        <ul>
                            <div className="search-count">
                                {isSearchMode ? 'Search results' : 'Popular stocks'}
                                {` `}({displayStocks?.length || 0})
                            </div>
                            {displayStocks.map((stock) => (
                                <li key={stock.symbol} className="search-item">
                                    <Link
                                        href={`/stocks/${stock.symbol}`}
                                        onClick={handleSelectStock}
                                        className="search-item-link"
                                    >
                                        <TrendingUp className="h-4 w-4 text-gray-500" />
                                        <div className="flex-1">
                                            <div className="search-item-name">
                                                {stock.name}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                { stock.symbol } | { stock.exchange } | {stock.type}
                                            </div>
                                        </div>
                                        <WatchlistButton
                                            symbol={stock.symbol}
                                            company={stock.name}
                                            isInWatchlist={stock.isInWatchlist}
                                            onWatchlistChange={handleWatchlistChange}
                                            type='icon'
                                        />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </CommandList>
            </CommandDialog>
        </>
    );
}

export default SearchCommand;
