import { createContext, useContext, useState, ReactNode, useCallback } from "react";

export type SortField = "price" | "name" | "created_at" | "default";
export type SortOrder = "asc" | "desc";

export interface FilterState {
  category: string | null;
  sortBy: SortField;
  sortOrder: SortOrder;
  minPrice: number | null;
  maxPrice: number | null;
  searchQuery: string;
}

interface FilterContextType {
  filters: FilterState;
  setCategory: (category: string | null) => void;
  setSort: (field: SortField, order?: SortOrder) => void;
  setPriceRange: (min: number | null, max: number | null) => void;
  setSearchQuery: (query: string) => void;
  applyFilter: (filterType: string, value: any) => void;
  resetFilters: () => void;
}

const FilterContext = createContext<FilterContextType | null>(null);

export const useFilter = () => {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useFilter must be used within FilterProvider");
  return ctx;
};

const defaultFilters: FilterState = {
  category: null,
  sortBy: "default",
  sortOrder: "desc",
  minPrice: null,
  maxPrice: null,
  searchQuery: "",
};

export const FilterProvider = ({ children }: { children: ReactNode }) => {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  const setCategory = useCallback((category: string | null) => {
    setFilters((prev) => ({ ...prev, category }));
  }, []);

  const setSort = useCallback((field: SortField, order: SortOrder = "asc") => {
    setFilters((prev) => ({ ...prev, sortBy: field, sortOrder: order }));
  }, []);

  const setPriceRange = useCallback(
    (min: number | null, max: number | null) => {
      setFilters((prev) => ({ ...prev, minPrice: min, maxPrice: max }));
    },
    []
  );

  const setSearchQuery = useCallback((query: string) => {
    setFilters((prev) => ({ ...prev, searchQuery: query }));
  }, []);

  const applyFilter = useCallback((filterType: string, value: any) => {
    switch (filterType) {
      case "sort_by_price":
        setSort("price", value === "asc" ? "asc" : "desc");
        break;
      case "sort_by_name":
        setSort("name", value === "asc" ? "asc" : "desc");
        break;
      case "filter_by_category":
        setCategory(value);
        break;
      case "filter_by_price_range":
        if (value.min !== undefined) setPriceRange(value.min, filters.maxPrice);
        if (value.max !== undefined) setPriceRange(filters.minPrice, value.max);
        break;
      case "search":
        setSearchQuery(value);
        break;
      default:
        console.warn(`Unknown filter type: ${filterType}`);
    }
  }, [setSort, setCategory, setPriceRange, setSearchQuery, filters]);

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  return (
    <FilterContext.Provider
      value={{
        filters,
        setCategory,
        setSort,
        setPriceRange,
        setSearchQuery,
        applyFilter,
        resetFilters,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
};
