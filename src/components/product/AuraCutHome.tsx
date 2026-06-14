import { Sparkles } from "lucide-react";

import { Aurora } from "./Aurora";
import { BorderGlow } from "./BorderGlow";
import { TransformationCard } from "./TransformationCard";
import { withBasePath } from "@/lib/paths";

const DEMO_IMAGE =
  withBasePath("/images/aura-hero-demo.jpg");
const DEMO_CUTOUT_IMAGE =
  withBasePath("/images/aura-hero-demo-cutout.png");

function HeroRemovalDemo() {
  return (
    <div className="hero-demo relative mx-auto aspect-square w-full max-w-[23rem] overflow-visible">
      <img
        src={DEMO_CUTOUT_IMAGE}
        alt=""
        className="absolute inset-0 h-full w-full rounded-[2rem] object-cover"
        style={{ filter: "drop-shadow(0 30px 52px rgba(0,0,0,0.34))" }}
      />
      <div className="hero-demo-before absolute inset-0 overflow-hidden rounded-[2rem]">
        <img src={DEMO_IMAGE} alt="" className="h-full w-full rounded-[2rem] object-cover" />
      </div>
      <div className="hero-demo-line absolute inset-y-0 w-px bg-cyan-100/80 shadow-[0_0_28px_rgba(103,232,249,0.65)]" />
    </div>
  );
}

export function AuraCutHome() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden text-white">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="aurora-fade absolute inset-x-0 top-0 h-[42rem] sm:h-[48rem] lg:h-[54rem]">
          <Aurora colorStops={["#7cff67", "#B497CF", "#5227FF"]} blend={0.5} amplitude={1} speed={0.5} />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.1),transparent_18rem),radial-gradient(circle_at_18%_58rem,rgba(34,211,238,0.08),transparent_18rem),radial-gradient(circle_at_82%_66rem,rgba(168,85,247,0.08),transparent_20rem),linear-gradient(180deg,rgba(3,7,18,0.04),rgba(3,7,18,0.68)_34rem,rgba(3,7,18,0.9)_100%)]" />
        <div className="noise-overlay absolute inset-0 opacity-[0.34]" />
      </div>

      <nav className="mx-auto flex w-full max-w-7xl items-center px-4 py-5 sm:px-6 lg:px-8">
        <a href="#" className="font-serif text-2xl font-semibold tracking-normal text-white" aria-label="AuraCut home">
          AuraCut
        </a>
      </nav>

      <section className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-7xl items-center gap-10 px-4 pb-14 pt-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <div className="text-center lg:text-left">
          <h1 className="max-w-3xl text-balance font-serif text-4xl font-semibold leading-[0.98] tracking-normal text-white sm:text-6xl lg:text-[4.45rem] xl:text-[4.8rem] 2xl:text-[5.4rem]">
            Cut clean, share instantly.
          </h1>
          <p className="mt-6 max-w-xl text-lg font-medium leading-8 tracking-normal text-white/66 sm:text-xl">
            AI background removal for free.
          </p>

          <div className="mt-10">
            <BorderGlow
              className="hero-start-glow"
              edgeSensitivity={22}
              glowColor="188 92 76"
              backgroundColor="#080915"
              borderRadius={999}
              glowRadius={36}
              glowIntensity={0.9}
              coneSpread={28}
              animated
              colors={["#c084fc", "#f472b6", "#38bdf8"]}
              fillOpacity={0.18}
            >
              <a
                href="#studio"
                className="group inline-flex min-h-[3.55rem] items-center gap-2 rounded-full bg-[#070a16]/96 px-8 text-sm font-semibold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] transition hover:bg-[#0b1020]"
              >
                <Sparkles className="h-4 w-4 text-cyan-100 transition group-hover:rotate-12" aria-hidden="true" />
                Start
              </a>
            </BorderGlow>
          </div>
        </div>

        <HeroRemovalDemo />
      </section>

      <TransformationCard />
    </main>
  );
}
