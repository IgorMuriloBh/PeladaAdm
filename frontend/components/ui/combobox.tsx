"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronsUpDown, Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OpcaoCombo { value: string; label: string }

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * Combobox com busca: mostra a lista e vai filtrando conforme o texto digitado.
 * Substitui o Select quando há muitos nomes para achar.
 */
export function ComboBusca({
  value, onChange, options,
  placeholder = "Selecionar...",
  buscaPlaceholder = "Buscar...",
  vazio = "Nada encontrado",
  disabled = false,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: OpcaoCombo[];
  placeholder?: string;
  buscaPlaceholder?: string;
  vazio?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selecionado = options.find(o => o.value === value);
  const filtradas = useMemo(() => {
    const t = norm(q.trim());
    if (!t) return options;
    return options.filter(o => norm(o.label).includes(t));
  }, [q, options]);

  useEffect(() => {
    if (!aberto) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false); };
    document.addEventListener("mousedown", onDoc);
    const t = setTimeout(() => inputRef.current?.focus(), 10);
    return () => { document.removeEventListener("mousedown", onDoc); clearTimeout(t); };
  }, [aberto]);

  function escolher(v: string) { onChange(v); setAberto(false); setQ(""); }

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setAberto(a => !a)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm",
          "focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed",
          !selecionado && "text-slate-400"
        )}
      >
        <span className="truncate">{selecionado ? selecionado.label : placeholder}</span>
        <ChevronsUpDown className="w-4 h-4 text-slate-400 shrink-0" />
      </button>

      {aberto && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg overflow-hidden">
          <div className="relative border-b border-slate-100">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              ref={inputRef}
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Escape") setAberto(false);
                if (e.key === "Enter" && filtradas[0]) { e.preventDefault(); escolher(filtradas[0].value); }
              }}
              placeholder={buscaPlaceholder}
              className="w-full pl-9 pr-3 py-2.5 text-sm focus:outline-none"
            />
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {filtradas.length === 0 ? (
              <p className="px-3 py-3 text-sm text-slate-400 text-center">{vazio}</p>
            ) : (
              filtradas.map(o => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => escolher(o.value)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 transition-colors",
                    o.value === value ? "text-green-700 font-medium" : "text-slate-700"
                  )}
                >
                  <Check className={cn("w-4 h-4 shrink-0", o.value === value ? "opacity-100 text-green-600" : "opacity-0")} />
                  <span className="truncate">{o.label}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
