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
  subcategory: string;
  description: string;
};

function inferDescription(path: string): string {
  if (path.startsWith("color.semantic.text")) return "Color semántico para jerarquía textual y legibilidad.";
  if (path.startsWith("color.semantic.background")) return "Color de fondo para canvas, superficies y acciones.";
  if (path.startsWith("color.semantic.border")) return "Borde para separación, énfasis y foco accesible.";
  if (path.startsWith("color.semantic.icon")) return "Color de iconografía por jerarquía o estado.";
  if (path.startsWith("text.display") || path.startsWith("text.heading")) return "Escala tipográfica para titulares y bloques de alto impacto.";
  if (path.startsWith("text.body") || path.startsWith("text.label")) return "Escala tipográfica para lectura funcional en dashboard.";
  if (path.startsWith("space.")) return "Sistema de espaciado para layout, gaps y padding consistente.";
  if (path.startsWith("radius.")) return "Sistema de radios para identidad visual y consistencia de componentes.";
  if (path.startsWith("elevation.")) return "Nivel de profundidad para capas, cards y overlays.";
  if (path.startsWith("motion.")) return "Token de duración o easing del sistema motion.";
  if (path.startsWith("component.")) return "Token composicional reusable para componentes UI.";
  return "Token base del sistema de diseño.";
}

function flattenTokens(input: JsonValue, prefix = "", bucket: TokenRow[] = []): TokenRow[] {
  if (input === null || input === undefined) return bucket;

  if (typeof input !== "object" || Array.isArray(input)) {
    const path = prefix.replace(/^\./, "");
    const segments = path.split(".");
    bucket.push({
      path,
      value: String(input),
      category: segments[0] || "general",
      subcategory: segments[1] || "base",
      description: inferDescription(path),
    });
    return bucket;
  }

  Object.entries(input as JsonObject).forEach(([key, value]) => {
    flattenTokens(value, `${prefix}.${key}`, bucket);
  });

  return bucket;
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
  const isPxToken =
    path.startsWith("space.") ||
    path.startsWith("radius.") ||
    path.endsWith("font-size") ||
    path.endsWith("line-height");

  if (!Number.isNaN(numeric) && isPxToken) return `${numeric}px · ${pxToRem(numeric)}`;
  if (!Number.isNaN(numeric) && path.includes("duration")) return `${numeric}ms`;
  return value;
}

function resolvePrimitiveReference(value: string): string {
  const match = value.match(/^\{(.+)\}$/);
  return match ? match[1] : "direct";
}

function isRenderableColor(value: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value) || /^rgba?\(/.test(value);
}

function Swatch({ value }: { value: string }) {
  if (!isRenderableColor(value)) return <span className="text-[11px] text-[#8793a3]">n/a</span>;
  return <div className="h-8 w-12 rounded-md border border-white/10" style={{ background: value }} />;
}

function Button({ variant = "primary", children }: { variant?: "primary" | "secondary" | "ghost"; children: React.ReactNode }) {
  const styles: Record<string, string> = {
    primary: "border border-transparent bg-[#ea223d] text-white hover:bg-[#ff5f77]",
    secondary: "border border-[rgba(174,184,196,0.28)] bg-[#2e3849] text-[#f4f6f8] hover:bg-[#455165]",
    ghost: "border border-[rgba(174,184,196,0.2)] bg-transparent text-[#cfd6df] hover:bg-white/5",
  };

  return <button className={`h-11 rounded-xl px-4 text-sm font-semibold transition ${styles[variant]}`}>{children}</button>;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[rgba(174,184,196,0.18)] bg-[linear-gradient(170deg,#1c2431,#111722)] p-5 shadow-[0_16px_34px_rgba(9,13,20,0.34)]">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#69b7f5]">{title}</p>
      {children}
    </div>
  );
}

function Input({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <label className="grid gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#aeb8c4]">{label}</span>
      <input
        placeholder={placeholder}
        className="h-11 rounded-xl border border-[rgba(174,184,196,0.22)] bg-[#111722] px-3 text-sm text-[#f4f6f8] placeholder:text-[#627085] outline-none focus:border-[#69b7f5]"
      />
    </label>
  );
}

export default function DesignSystemPortal() {
  const tokenRows = useMemo(() => flattenTokens(valueTokens as JsonObject), []);
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeSubcategory, setActiveSubcategory] = useState("all");

  const categories = useMemo(() => ["all", ...Array.from(new Set(tokenRows.map((row) => row.category)))], [tokenRows]);
  const subcategories = useMemo(() => {
    const rows = activeCategory === "all" ? tokenRows : tokenRows.filter((row) => row.category === activeCategory);
    return ["all", ...Array.from(new Set(rows.map((row) => row.subcategory)))];
  }, [activeCategory, tokenRows]);

  const visibleRows = useMemo(
    () =>
      tokenRows.filter(
        (row) =>
          (activeCategory === "all" || row.category === activeCategory) &&
          (activeSubcategory === "all" || row.subcategory === activeSubcategory),
      ),
    [activeCategory, activeSubcategory, tokenRows],
  );

  const semanticDark = darkTokens as JsonObject;
  const semanticLight = lightTokens as JsonObject;

  return (
    <div className="min-h-screen bg-[#090d14] text-[#f4f6f8]">
      <div className="grid min-h-screen grid-cols-12">
        <aside className="col-span-12 border-b border-[rgba(174,184,196,0.16)] bg-[rgba(9,13,20,0.95)] p-5 backdrop-blur lg:col-span-3 lg:border-b-0 lg:border-r">
          <div className="sticky top-0 space-y-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#69b7f5]">vcars design language</p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight">Design System Portal</h1>
              <p className="mt-2 text-sm text-[#aeb8c4]">Color, typography, spacing, radius, elevation y motion conectados a JSON tokens.</p>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8793a3]">categoría</p>
              {categories.map((category) => {
                const selected = activeCategory === category;
                return (
                  <button
                    key={category}
                    onClick={() => {
                      setActiveCategory(category);
                      setActiveSubcategory("all");
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
                      selected ? "bg-[rgba(234,34,61,0.18)] text-[#ffe1e4]" : "text-[#cfd6df] hover:bg-white/5"
                    }`}
                  >
                    <span className="capitalize">{category}</span>
                    <span className="text-[11px] text-[#8793a3]">{category === "all" ? tokenRows.length : tokenRows.filter((row) => row.category === category).length}</span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8793a3]">subcategoría</p>
              <div className="flex flex-wrap gap-2">
                {subcategories.map((sub) => (
                  <button
                    key={sub}
                    onClick={() => setActiveSubcategory(sub)}
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      activeSubcategory === sub
                        ? "border-[rgba(105,183,245,0.5)] bg-[rgba(31,95,159,0.25)] text-[#dff1ff]"
                        : "border-[rgba(174,184,196,0.2)] bg-transparent text-[#aeb8c4] hover:bg-white/5"
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <main className="col-span-12 p-5 lg:col-span-9 lg:p-8">
          <section className="grid gap-4 xl:grid-cols-4">
            <Card title="Token source of truth">
              <p className="text-sm leading-6 text-[#cfd6df]">El portal usa `value.tokens.json`, `light.tokens.json` y `dark.tokens.json` como base única para auditoría.</p>
            </Card>
            <Card title="Brand DNA">
              <div className="flex gap-2">
                <Swatch value="#1f5f9f" />
                <Swatch value="#69b7f5" />
                <Swatch value="#ea223d" />
                <Swatch value="#2e3849" />
              </div>
              <p className="mt-3 text-sm text-[#aeb8c4]">Azul técnico + rojo de alto contraste para un SaaS automotriz premium.</p>
            </Card>
            <Card title="Typography">
              <p className="text-sm leading-6 text-[#cfd6df]">Line-height en enteros, escala clara para dashboards de operación y formularios extensos.</p>
            </Card>
            <Card title="Motion tokens">
              <p className="text-sm leading-6 text-[#cfd6df]">Micro 120-180ms, componentes 220-260ms, transiciones mayores 360-450ms.</p>
            </Card>
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-[1.75fr_1fr]">
            <Card title="Token Explorer">
              <div className="overflow-hidden rounded-2xl border border-[rgba(174,184,196,0.16)]">
                <div className="grid grid-cols-[2.2fr_1fr_1fr] border-b border-[rgba(174,184,196,0.14)] bg-[rgba(255,255,255,0.03)] text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8793a3]">
                  <div className="p-3">Token & info</div>
                  <div className="p-3">Light mode</div>
                  <div className="p-3">Dark mode</div>
                </div>

                <div className="max-h-[72vh] overflow-auto">
                  {visibleRows.map((row) => {
                    const lightValue = getValueFromPath(semanticLight, row.path);
                    const darkValue = getValueFromPath(semanticDark, row.path);
                    const previewColor = isRenderableColor(lightValue) ? lightValue : isRenderableColor(darkValue) ? darkValue : row.value;

                    return (
                      <div key={row.path} className="grid grid-cols-[2.2fr_1fr_1fr] border-b border-[rgba(174,184,196,0.08)] text-sm">
                        <div className="flex items-start gap-3 p-3">
                          <Swatch value={previewColor} />
                          <div className="min-w-0">
                            <p className="truncate font-mono text-[11px] text-[#69b7f5]">{row.path}</p>
                            <p className="mt-1 text-[#f4f6f8]">{formatTokenValue(row.path, row.value)}</p>
                            <p className="mt-1 text-xs leading-5 text-[#aeb8c4]">{row.description}</p>
                            <p className="mt-1 text-[11px] text-[#627085]">Primitive: {resolvePrimitiveReference(row.value)}</p>
                          </div>
                        </div>
                        <div className="p-3 text-[#cfd6df]">{formatTokenValue(row.path, lightValue)}</div>
                        <div className="p-3 text-[#cfd6df]">{formatTokenValue(row.path, darkValue === "—" ? row.value : darkValue)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>

            <div className="space-y-6">
              <Card title="Live Buttons">
                <div className="flex flex-wrap gap-3">
                  <Button variant="primary">Guardar orden</Button>
                  <Button variant="secondary">Ver detalle</Button>
                  <Button variant="ghost">Cancelar</Button>
                </div>
              </Card>

              <Card title="Live Inputs">
                <div className="space-y-3">
                  <Input label="Placa" placeholder="BCD246" />
                  <Input label="Diagnóstico" placeholder="Ruido en suspensión delantera" />
                </div>
              </Card>

              <Card title="Live Feedback">
                <div className="space-y-2">
                  <div className="rounded-xl border border-[rgba(34,197,94,0.38)] bg-[rgba(34,197,94,0.14)] p-3 text-sm text-[#86efac]">Orden actualizada con éxito.</div>
                  <div className="rounded-xl border border-[rgba(234,34,61,0.45)] bg-[rgba(234,34,61,0.16)] p-3 text-sm text-[#ffbcc5]">Falta autorización del cliente.</div>
                </div>
              </Card>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
