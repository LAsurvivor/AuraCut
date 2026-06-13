import { TransformationCard } from "./TransformationCard";

const DEMO_IMAGE =
  "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=1200&q=88";

function HeroRemovalDemo() {
  return (
    <div className="hero-demo relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/72 shadow-[0_30px_120px_rgba(0,0,0,0.38),0_0_70px_rgba(34,211,238,0.08)] backdrop-blur-xl">
      <img src={DEMO_IMAGE} alt="" className="image-contain absolute inset-0 p-5 opacity-95" />
      <div className="checkerboard-dark absolute inset-0" />
      <img
        src={DEMO_IMAGE}
        alt=""
        className="image-contain absolute inset-0 p-5"
        style={{ clipPath: "ellipse(37% 48% at 51% 51%)", filter: "drop-shadow(0 28px 48px rgba(0,0,0,0.36))" }}
      />
      <div className="hero-demo-before absolute inset-0 bg-slate-950">
        <img src={DEMO_IMAGE} alt="" className="image-contain absolute inset-0 p-5" />
      </div>
      <div className="hero-demo-line absolute inset-y-5 w-px bg-cyan-100/80 shadow-[0_0_28px_rgba(103,232,249,0.65)]" />
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 rounded-full border border-white/10 bg-slate-950/58 px-3 py-2 text-[11px] font-medium text-white/72 backdrop-blur-xl">
        <span>Before</span>
        <span className="text-white/28">/</span>
        <span>After</span>
      </div>
    </div>
  );
}

export function AuraCutHome() {
  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(255,255,255,0.11),transparent_28%),linear-gradient(180deg,rgba(3,7,18,0.2),rgba(3,7,18,0.95)_78%)]" />
        <div className="noise-overlay absolute inset-0 opacity-[0.34]" />
      </div>

      <nav className="mx-auto flex w-full max-w-7xl items-center px-4 py-5 sm:px-6 lg:px-8">
        <a href="#" className="font-serif text-2xl font-semibold tracking-normal text-white" aria-label="AuraCut home">
          AuraCut
        </a>
      </nav>

      <section className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-7xl items-center gap-10 px-4 pb-14 pt-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div className="text-center lg:text-left">
          <h1 className="font-serif text-7xl font-semibold leading-none tracking-normal text-white sm:text-8xl lg:text-[9.5rem]">AuraCut</h1>
          <p className="mt-5 text-xl font-medium tracking-normal text-white/72 sm:text-2xl">Remove. Flip. Share.</p>

          <div className="mt-7 flex flex-wrap justify-center gap-2 lg:justify-start">
            {["Free", "100% removal", "Hosted result"].map((label) => (
              <span key={label} className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 text-xs font-medium text-white/64 backdrop-blur-xl">
                {label}
              </span>
            ))}
          </div>

          <div className="mt-10">
            <a href="#studio" className="aurora-button group inline-flex min-h-14 rounded-full p-px text-sm font-semibold text-white">
              <span className="inline-flex min-h-[3.35rem] items-center rounded-full bg-[#070a16]/94 px-9 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] transition group-hover:bg-[#090d1c]">
              Start
            </span>
          </a>
          </div>
        </div>

        <HeroRemovalDemo />
      </section>

      <TransformationCard />
    </main>
  );
}
