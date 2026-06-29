import { Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface SearchBarProps {
  value?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  onFilters?: () => void;
}

export function SearchBar({ value, onChange, placeholder, onFilters }: SearchBarProps) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-soft">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
        <Search className="h-4 w-4" />
      </div>
      <Input
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder ?? "Rechercher…"}
        className="h-10 border-0 bg-transparent text-base shadow-none focus-visible:ring-0"
      />
      {onFilters && (
        <Button variant="ghost" size="icon" aria-label="Filtres" onClick={onFilters}>
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}