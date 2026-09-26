"use client";

import { FileText, Home, Menu, Search, UserRound, X } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";

type TopNavProps = {
  onOpenMenu?: () => void;
  onOpenProfile?: () => void;
};

function LogoMark() {
  return (
    <Link
      href="/"
      className="flex shrink-0 items-center gap-2 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ol-ink"
      aria-label="OutLinked home"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-ol-primary text-sm font-bold tracking-tight text-white">
        OL
      </span>
      <span className="hidden text-[22px] font-semibold tracking-tight text-ol-ink sm:inline">
        OutLinked
      </span>
    </Link>
  );
}

function NavIconLink({
  href,
  label,
  children,
  active,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex min-w-[64px] flex-col items-center gap-0.5 rounded-md px-2 py-1.5 transition-colors hover:bg-black/[0.04] ${
        active ? "text-ol-ink" : "text-ol-muted hover:text-ol-ink"
      }`}
    >
      <span className={active ? "text-ol-ink" : undefined}>{children}</span>
      <span className="hidden text-[11px] font-medium leading-none md:inline">
        {label}
      </span>
    </Link>
  );
}

export default function TopNav({ onOpenMenu, onOpenProfile }: TopNavProps) {
  const [query, setQuery] = useState("");

  function handleSearch(e: FormEvent) {
    e.preventDefault();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-ol-border bg-ol-surface">
      <div className="mx-auto flex h-nav max-w-shell items-center gap-3 px-3 sm:px-4">
        <button
          type="button"
          onClick={onOpenMenu}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ol-muted transition hover:bg-black/[0.04] hover:text-ol-ink lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" strokeWidth={1.75} />
        </button>

        <LogoMark />

        <form
          onSubmit={handleSearch}
          className="mx-auto hidden min-w-0 max-w-[280px] flex-1 md:block lg:max-w-[360px]"
          role="search"
        >
          <label htmlFor="global-search" className="sr-only">
            Search
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ol-faint"
              strokeWidth={1.75}
            />
            <input
              id="global-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="h-9 w-full rounded-md border-0 bg-neutral-100 py-2 pl-9 pr-3 text-sm text-ol-ink outline-none placeholder:text-ol-faint focus:ring-2 focus:ring-ol-ink/20"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-ol-faint hover:text-ol-ink"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </form>

        <nav
          className="ml-auto flex items-center gap-0.5 sm:gap-1"
          aria-label="Primary"
        >
          <NavIconLink href="/" label="Home" active>
            <Home className="h-5 w-5" strokeWidth={1.75} />
          </NavIconLink>
          <NavIconLink href="/terms" label="Rules">
            <FileText className="h-5 w-5" strokeWidth={1.75} />
          </NavIconLink>
          <button
            type="button"
            onClick={onOpenProfile}
            className="flex min-w-[64px] flex-col items-center gap-0.5 rounded-md px-2 py-1.5 text-ol-muted transition-colors hover:bg-black/[0.04] hover:text-ol-ink"
          >
            <UserRound className="h-5 w-5" strokeWidth={1.75} />
            <span className="hidden text-[11px] font-medium leading-none md:inline">
              Profile
            </span>
          </button>
        </nav>
      </div>
    </header>
  );
}
