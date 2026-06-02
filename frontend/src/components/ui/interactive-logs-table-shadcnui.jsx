import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Filter, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const SAMPLE_LOGS = [
  {
    id: "1",
    badge: { label: "info", className: "bg-blue-500/10 text-blue-400 capitalize" },
    meta: "14:32:45",
    primary: "api-gateway",
    summary: "Request processed successfully",
    status: { label: "200", className: "text-green-400" },
    detail: "245ms",
    tags: ["api", "success"],
    details: [{ label: "Message", value: "Request processed successfully" }],
    filters: { level: "info", service: "api-gateway", status: "200" },
    searchText: "api-gateway Request processed successfully",
  },
  {
    id: "2",
    badge: { label: "warning", className: "bg-yellow-500/10 text-yellow-400 capitalize" },
    meta: "14:32:42",
    primary: "cache-service",
    summary: "Cache miss ratio exceeds threshold",
    status: { label: "warning", className: "text-yellow-400" },
    detail: "1.2s",
    tags: ["cache", "performance"],
    details: [{ label: "Message", value: "Cache miss ratio exceeds threshold" }],
    filters: { level: "warning", service: "cache-service", status: "warning" },
    searchText: "cache-service Cache miss",
  },
];

const FILTER_KEYS = ["level", "service", "status"];

function emptyFilters() {
  return { level: [], service: [], status: [] };
}

function ListRow({ item, expanded, onToggle }) {
  return (
    <>
      <motion.button
        type="button"
        onClick={onToggle}
        className="w-full p-5 text-left transition-colors hover:bg-muted/50 active:bg-muted/70"
      >
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0"
          >
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </motion.div>

          <Badge
            variant="secondary"
            className={cn("flex-shrink-0", item.badge?.className)}
            style={item.badge?.style}
          >
            {item.badge?.label}
          </Badge>

          {item.meta && (
            <span className="w-16 flex-shrink-0 font-mono text-xs text-muted-foreground sm:w-20">
              {item.meta}
            </span>
          )}

          <span className="min-w-max flex-shrink-0 text-base font-medium text-foreground">
            {item.primary}
          </span>

          <p className="min-w-[8rem] flex-1 truncate text-sm text-muted-foreground">
            {item.summary}
          </p>

          <span
            className={cn(
              "flex-shrink-0 font-mono text-base font-semibold",
              item.status?.className ?? "text-muted-foreground",
            )}
          >
            {item.status?.label}
          </span>

          {item.detail && (
            <span className="w-24 flex-shrink-0 text-right font-mono text-sm text-muted-foreground sm:w-28">
              {item.detail}
            </span>
          )}
        </div>
      </motion.button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border bg-muted/30"
          >
            <div className="space-y-4 p-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Resumo
                </p>
                <p className="rounded bg-background/80 p-3 font-mono text-sm text-foreground">
                  {item.summary}
                </p>
              </div>

              {item.details?.length > 0 && (
                <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                  {item.details.map((field) => (
                    <div key={field.label}>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {field.label}
                      </p>
                      <p className="font-mono text-foreground">{field.value}</p>
                    </div>
                  ))}
                </div>
              )}

              {item.tags?.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Tags
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {item.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function FilterPanel({ filters, onChange, items, filterLabels }) {
  const options = useMemo(() => {
    const result = { level: new Set(), service: new Set(), status: new Set() };
    items.forEach((item) => {
      FILTER_KEYS.forEach((key) => {
        const value = item.filters?.[key];
        if (value) result[key].add(value);
      });
    });
    return {
      level: Array.from(result.level),
      service: Array.from(result.service),
      status: Array.from(result.status),
    };
  }, [items]);

  const toggleFilter = (category, value) => {
    const current = filters[category];
    const updated = current.includes(value)
      ? current.filter((entry) => entry !== value)
      : [...current, value];
    onChange({ ...filters, [category]: updated });
  };

  const clearAll = () => onChange(emptyFilters());
  const hasActiveFilters = FILTER_KEYS.some((key) => filters[key].length > 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ delay: 0.05 }}
      className="flex h-full flex-col space-y-6 overflow-y-auto bg-card/95 p-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Filtros</h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="h-6 text-xs">
            Limpar
          </Button>
        )}
      </div>

      {FILTER_KEYS.map((key) => {
        const values = options[key];
        if (!values.length) return null;
        const label = filterLabels?.[key] ?? key;

        return (
          <div key={key} className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <div className="space-y-2">
              {values.map((value) => {
                const selected = filters[key].includes(value);
                return (
                  <motion.button
                    key={value}
                    type="button"
                    whileHover={{ x: 2 }}
                    onClick={() => toggleFilter(key, value)}
                    aria-pressed={selected}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                      selected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40 hover:bg-muted/40",
                    )}
                  >
                    <span className="truncate text-left">{value}</span>
                    {selected && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                  </motion.button>
                );
              })}
            </div>
          </div>
        );
      })}
    </motion.div>
  );
}

/**
 * Tabela/lista interativa (baseada no componente de logs shadcn).
 * @param {object} props
 * @param {string} props.title
 * @param {string} [props.subtitle]
 * @param {Array} props.items
 * @param {string} [props.searchPlaceholder]
 * @param {string} [props.emptyMessage]
 * @param {Record<string,string>} [props.filterLabels]
 * @param {string} [props.className]
 */
export function InteractiveListTable({
  title,
  subtitle,
  items = [],
  searchPlaceholder = "Buscar…",
  emptyMessage = "Nenhum item corresponde aos filtros.",
  filterLabels,
  className,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(emptyFilters);

  const filteredItems = useMemo(() => {
    const lowerQuery = searchQuery.toLowerCase().trim();
    return items.filter((item) => {
      const haystack = (item.searchText ?? `${item.primary} ${item.summary}`).toLowerCase();
      const matchSearch = !lowerQuery || haystack.includes(lowerQuery);

      const matchLevel =
        filters.level.length === 0 || filters.level.includes(item.filters?.level);
      const matchService =
        filters.service.length === 0 || filters.service.includes(item.filters?.service);
      const matchStatus =
        filters.status.length === 0 || filters.status.includes(item.filters?.status);

      return matchSearch && matchLevel && matchService && matchStatus;
    });
  }, [filters, items, searchQuery]);

  const activeFilters = FILTER_KEYS.reduce((n, key) => n + filters[key].length, 0);
  const resolvedSubtitle =
    subtitle ?? `${filteredItems.length} de ${items.length} itens`;

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-border bg-card/90 shadow-sm backdrop-blur-md",
        className,
      )}
    >
      <div className="border-b border-border p-5 sm:p-6">
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground sm:text-2xl">{title}</h2>
            <p className="text-sm text-muted-foreground">{resolvedSubtitle}</p>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-9 bg-background/80 pl-9 text-sm"
              />
            </div>
            <Button
              variant={showFilters ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFilters((current) => !current)}
              className="relative shrink-0"
              aria-label="Alternar filtros"
            >
              <Filter className="h-4 w-4" />
              {activeFilters > 0 && (
                <Badge className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center border-0 bg-destructive p-0 text-xs text-destructive-foreground">
                  {activeFilters}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex min-h-[480px] max-h-[min(82vh,920px)] flex-1 overflow-hidden">
        <AnimatePresence initial={false}>
          {showFilters && (
            <motion.div
              key="filters"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="shrink-0 overflow-hidden border-r border-border"
            >
              <FilterPanel
                filters={filters}
                onChange={setFilters}
                items={items}
                filterLabels={filterLabels}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="min-w-0 flex-1 overflow-y-auto">
          <div className="divide-y divide-border">
            <AnimatePresence mode="popLayout">
              {filteredItems.length > 0 ? (
                filteredItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.3) }}
                  >
                    <ListRow
                      item={item}
                      expanded={expandedId === item.id}
                      onToggle={() =>
                        setExpandedId((current) =>
                          current === item.id ? null : item.id,
                        )
                      }
                    />
                  </motion.div>
                ))
              ) : (
                <motion.div
                  key="empty-state"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-12 text-center"
                >
                  <p className="text-muted-foreground">{emptyMessage}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Demo com dados de logs de exemplo (tela cheia). */
export function InteractiveLogsTable() {
  return (
    <main className="h-screen w-full bg-background">
      <InteractiveListTable
        title="Logs"
        items={SAMPLE_LOGS}
        searchPlaceholder="Buscar logs por mensagem ou serviço…"
        filterLabels={{
          level: "Nível",
          service: "Serviço",
          status: "Status",
        }}
        className="h-full rounded-none border-0"
      />
    </main>
  );
}
