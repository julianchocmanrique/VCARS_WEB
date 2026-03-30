"use client";

import React, { useMemo, useState } from "react";
import valueTokens from "./tokens/value.tokens.json";
import lightTokens from "./tokens/light.tokens.json";
import darkTokens from "./tokens/dark.tokens.json";

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };

type TokenRow = {
  path: string;
  value: string;
  category: string;
  description: string;
};

const TOKEN_DESCRIPTIONS: Record<string, string> = {
  "color.semantic.text.primary.default": "Texto principal de lectura y encabezados críticos.",
  "color.semantic.background.canvas.default": "Fondo global de la aplicación.",
  "color.semantic.background.surface.base": "Superficie base para cards, tablas y contenedores.",
  "color.semantic.background.action.primary.default": "Acción principal para CTA, confirmación o avance.",
  "space.16": "Espaciado base para padding horizontal de inputs y botones.",
  "radius.md": "Radio estándar para controles interactivos.",
  "text.body.size-14.fontSize": "Tamaño de texto base para formularios y tablas."
};

function flattenTokens(input: JsonValue, prefix = "", bucket: TokenRow[] = []): TokenRow[] {
  if (input === null || input === undefined) return bucket;

  if (typeof input !== "object" || Array.isArray(input)) {
    const path = prefix.replace(/^\./, "");
    bucket.push({
      path,
      value: String(input),
      category: path.split(".")[0] || "general",
      description: TOKEN_DESCRIPTIONS[path] || inferDescription(path)
    });
    return bucket;
  }

  Object.entries(input as JsonObject).forEach(([key, value]) => {
    flattenTokens(value, `${prefix}.${key}`, bucket);
  });

  return bucket;
}

function inferDescription(path: string): string {
  if (path.startsWith("color.semantic.text")) return "Token semántico de color para contenido textual.";
  if (path.startsWith("color.semantic.background")) return "Token semántico de fondo para layout o componente.";
  if (path.startsWith("color.semantic.border")) return "Token de borde para separación o foco.";
  if (path.startsWith("text.")) return "Token tipográfico con tamaño, peso o interlineado.";
  if (path.startsWith("space.")) return "Token de espaciado para layout, gaps o padding.";
  if (path.startsWith("radius.")) return "Token de radio de borde.";
  if (path.startsWith("elevation.")) return "Token de sombra/elevación.";
  if (path.startsWith("motion.")) return "Token de duración o easing.";
  return "Token base del sistema.";
}

function getValueFromPath(obj: JsonObject, path: string): string {
  const result = path.split(".").reduce<JsonValue>((acc, key) => {
    if (acc && typeof acc === "object" && !Array.isArray(acc)) {
      return (acc as JsonObject)[key];
    }
    return undefined as unknown as JsonValue;
  }, obj);

  return result === undefined ? "—" : String(result);
}

function pxToRem(px: number): string {
  return `${(px / 16).toFixed(px % 16 === 0 ? 0 : 3)}rem`;
}

function formatTokenValue(path: string, value: string): string {
  const numeric = Number(value);
  if (!Number.isNaN(numeric) && (path.startsWith("space.") || path.startsWith("radius.") || path.endsWith("fontSize") || path.endsWith("lineHeight"))) {
    return `${numeric}px · ${pxToRem(numeric)}`;
  }
  if (!Number.isNaN(numeric) && path.includes("duration")) {
    return `${numeric}ms`;
  }
  return value;
}

function resolvePrimitiveReference(value: string): string {
  const match = value.match(/^\{(.+)\}$/);
  return match ? match[1] : "direct";
}

function Swatch({ value, path }: { value: string; path: string }) {
  if (path.startsWith("color.")) {
    return <div className="h-9 w-14 rounded-lg border border-white/10" style={{ background: value }} />;
  }

  if (path.startsWith("radius.")) {
    return <div className="h-10 w-14 border border-cyan-400/40 bg-slate-900" style={{ borderRadius: Number(value) }} />;
  }

  if (path.startsWith("space.")) {
    const width = Math.max(8, Math.min(56, Number(value)));
    return <div className="h-4 rounded-full bg-cyan-400/80" style={{ width }} />;
  }

  if (path.startsWith("elevation.")) {
    return <div className="h-10 w-16 rounded-xl bg-slate-900" style={{ boxShadow: value }} />;
  }

  if (path.startsWith("text.") && (path.endsWith("fontSize") || path.endsWith("lineHeight"))) {
    return <span className="text-slate-100">{value}</span>;
  }

  return <span className="text-slate-400">•</span>;
}

function Button({ variant = "primary", children }: { variant?: "primary" | "secondary"; children: React.ReactNode }) {
  const primary = variant === "primary";
  return (
    <button
      className={`inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition ${
        primary
          ? "bg-cyan-500 text-slate-950 hover:bg-cyan-400"
          : "border border-white/10 bg-slate-900 text-slate-50 hover:bg-slate-800"
      }`}
    >
      {children}
    </button>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl shadow-black/20">
      <div className="mb-4 text-sm font-semibold text-slate-200">{title}</div>
      {children}
    </div>
  );
}

function Input({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-medium uppercase tracking-[0.08em] text-slate-400">{label}</span>
      <input
        placeholder={placeholder}
        className="h-12 rounded-xl border border-white/10 bg-slate-950 px-4 text-sm text-slate-50 outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-400"
      />
    </label>
  );
}

function Toast({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
      <div className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-400" />
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-50">{title}</p>
        <p className="text-sm text-slate-300">{description}</p>
      </div>
    </div>
  );
}

export default function DesignSystemPortal() {
  const [activeCategory, setActiveCategory] = useState("all");

  const tokenRows = useMemo(() => flattenTokens(valueTokens as JsonObject), []);
  const categories = useMemo(() => ["all", ...Array.from(new Set(tokenRows.map((row) => row.category)))], [tokenRows]);

  const visibleRows = tokenRows.filter((row) => activeCategory === "all" || row.category === activeCategory);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="grid min-h-screen grid-cols-12">
        <aside className="col-span-12 border-b border-white/10 bg-slate-950/95 p-6 backdrop-blur lg:col-span-3 lg:border-b-0 lg:border-r">
          <div className="sticky top-0 space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-400">VCARS</p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight">Design System Portal</h1>
              <p className="mt-2 text-sm text-slate-400">
                Fuente única de verdad para color, tipografía, spacing, radius, elevación y motion.
              </p>
            </div>

            <nav className="space-y-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
                    activeCategory === category
                      ? "bg-cyan-500/15 text-cyan-300"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className="capitalize">{category}</span>
                  <span className="text-xs text-slate-500">{category === "all" ? tokenRows.length : tokenRows.filter((row) => row.category === category).length}</span>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <main className="col-span-12 p-6 lg:col-span-9 lg:p-8">
          <section className="grid gap-4 xl:grid-cols-4">
            <Card title="Contexto de producto">
              <p className="text-sm leading-6 text-slate-300">
                Sistema inferido para un dashboard operativo de taller con flujo por etapas, permisos por rol y estética premium oscura.
              </p>
            </Card>
            <Card title="Light / Dark">
              <p className="text-sm leading-6 text-slate-300">
                Las tablas comparan el valor base contra la variante clara y la variante oscura para facilitar auditoría y QA visual.
              </p>
            </Card>
            <Card title="Tipografía">
              <p className="text-sm leading-6 text-slate-300">
                Los line-height se expresan en enteros y se muestran como píxeles y rem para mantener consistencia con el prompt.
              </p>
            </Card>
            <Card title="Componentes">
              <p className="text-sm leading-6 text-slate-300">
                Buttons, cards, inputs y toasts consumen spacing, radius y jerarquía tipográfica del sistema.
              </p>
            </Card>
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-[1.7fr_1fr]">
            <Card title="Token Explorer">
              <div className="overflow-hidden rounded-2xl border border-white/10">
                <div className="grid grid-cols-[2.2fr_1fr_1fr] border-b border-white/10 bg-white/5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
                  <div className="p-4">Token & Info</div>
                  <div className="p-4">Light Mode</div>
                  <div className="p-4">Dark Mode</div>
                </div>

                <div className="max-h-[70vh] overflow-auto">
                  {visibleRows.map((row) => {
                    const lightValue = getValueFromPath(lightTokens as JsonObject, row.path);
                    const darkValue = getValueFromPath(darkTokens as JsonObject, row.path);

                    return (
                      <div key={row.path} className="grid grid-cols-[2.2fr_1fr_1fr] border-b border-white/5 text-sm">
                        <div className="flex items-start gap-4 p-4">
                          <Swatch value={row.value} path={row.path} />
                          <div className="min-w-0">
                            <p className="truncate font-mono text-xs text-cyan-300">{row.path}</p>
                            <p className="mt-1 text-slate-200">{formatTokenValue(row.path, row.value)}</p>
                            <p className="mt-1 text-xs leading-5 text-slate-400">{row.description}</p>
                            <p className="mt-2 text-[11px] text-slate-500">Primitive: {resolvePrimitiveReference(row.value)}</p>
                          </div>
                        </div>
                        <div className="p-4 text-slate-300">{formatTokenValue(row.path, lightValue)}</div>
                        <div className="p-4 text-slate-300">{formatTokenValue(row.path, darkValue === "—" ? row.value : darkValue)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>

            <div className="space-y-6">
              <Card title="Buttons">
                <div className="flex flex-wrap gap-3">
                  <Button>Guardar orden</Button>
                  <Button variant="secondary">Ver detalle</Button>
                </div>
              </Card>

              <Card title="Inputs">
                <div className="space-y-4">
                  <Input label="Placa" placeholder="ABC123" />
                  <Input label="Falla reportada" placeholder="Ruido en suspensión delantera" />
                </div>
              </Card>

              <Card title="Toast">
                <Toast
                  title="Cotización publicada"
                  description="El cliente ya puede revisar valores, tiempos y aprobar o rechazar la orden."
                />
              </Card>

              <Card title="Stage Status">
                <div className="flex flex-wrap gap-2">
                  {["Recepción", "Diagnóstico", "Cotización", "Autorización", "Ejecución", "Entrega"].map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </Card>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
