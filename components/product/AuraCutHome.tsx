import { Github, Sparkles } from "lucide-react";

import { TransformationCard } from "./TransformationCard";

export function AuraCutHome() {
  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(255,255,255,0.11),transparent_28%),linear-gradient(180deg,rgba(3,7,18,0.2),rgba(3,7,18,0.95)_78%)]" />
        <div className="noise-overlay absolute inset-0 opacity-[0.34]" />
      </div>

      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <a href="#" className="group flex items-center gap-3" aria-label="AuraCut home">
          <span className="grid h-10 w-10 place-items-center rounded-lg border border-white/12 bg-white/[0.06] text-sm font-semibold text-cyan-100 shadow-[0_0_34px_rgba(34,211,238,0.14)] backdrop-blur-xl transition group-hover:border-cyan-200/30">
            AC
          </span>
          <span className="font-serif text-xl font-semibold tracking-normal text-white">AuraCut</span>
        </a>

        <div className="flex items-center gap-2">
          <a
            href="#studio"
            className="hidden min-h-10 items-center rounded-full border border-white/10 bg-white/[0.05] px-4 text-sm font-medium text-white/72 backdrop-blur-xl transition hover:border-cyan-200/28 hover:text-white sm:inline-flex"
          >
            Tool
          </a>
          <a
            href="#"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/72 backdrop-blur-xl transition hover:border-cyan-200/28 hover:text-white"
            aria-label="GitHub repository"
            title="GitHub"
          >
            <Github className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </nav>

      <section className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-7xl flex-col items-center justify-center px-4 pb-14 pt-12 text-center sm:px-6 lg:px-8">
        <div className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-3 text-xs font-medium text-cyan-100/82 shadow-[0_0_44px_rgba(34,211,238,0.08)] backdrop-blur-xl">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          AI image transformation in one frame
        </div>

        <h1 className="mt-8 font-serif text-7xl font-semibold leading-none tracking-normal text-white sm:text-8xl lg:text-[10rem]">AuraCut</h1>
        <p className="mt-5 text-xl font-medium tracking-normal text-white/72 sm:text-2xl">Remove. Flip. Share.</p>

        <div className="mt-10">
          <a href="#studio" className="star-button group inline-flex min-h-14 items-center gap-2 rounded-full p-px text-sm font-semibold text-white">
            <span className="inline-flex min-h-[3.35rem] items-center gap-2 rounded-full bg-slate-950/88 px-7 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] transition group-hover:bg-slate-950">
              <Sparkles className="h-4 w-4 text-cyan-100" aria-hidden="true" />
              Start
            </span>
          </a>
        </div>
      </section>

      <TransformationCard />
    </main>
  );
}
