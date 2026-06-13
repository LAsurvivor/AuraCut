"use client";

import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { ArrowRight, LockKeyhole, Sparkles } from "lucide-react";

type AccessGateProps = {
  children: ReactNode;
};

const ACCESS_KEY = "auracut-access-granted";
const PASSCODE = "uplane";

export function AccessGate({ children }: AccessGateProps) {
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    function readStoredAccess(): boolean {
      try {
        if (window.localStorage.getItem(ACCESS_KEY) === "true") {
          return true;
        }

        if (window.sessionStorage.getItem(ACCESS_KEY) === "true") {
          window.localStorage.setItem(ACCESS_KEY, "true");
          return true;
        }
      } catch (_error) {}

      return false;
    }

    setIsUnlocked(readStoredAccess());
    setIsReady(true);

    function handleStorage(event: StorageEvent) {
      if (event.key === ACCESS_KEY && event.newValue === "true") {
        setIsUnlocked(true);
      }
    }

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("access-gate-active", isReady && !isUnlocked);

    return () => {
      document.body.classList.remove("access-gate-active");
    };
  }, [isReady, isUnlocked]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (answer.trim().toLowerCase() !== PASSCODE) {
      setError("Incorrect answer");
      return;
    }

    try {
      window.localStorage.setItem(ACCESS_KEY, "true");
    } catch (_error) {}

    setError("");
    setIsUnlocked(true);
  }

  if (!isReady) {
    return <div className="min-h-screen bg-[#02030a]" />;
  }

  return (
    <>
      {!isUnlocked ? (
        <main className="access-lock-screen relative isolate flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 text-white sm:px-6">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.16),transparent_22rem),radial-gradient(circle_at_78%_18%,rgba(168,85,247,0.18),transparent_24rem),linear-gradient(180deg,#070a16,#02030a_58%,#05020d)]" />
          <div className="noise-overlay pointer-events-none absolute inset-0 -z-10 opacity-[0.3]" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300/10 blur-3xl" />

          <section className="cinema-panel relative w-full max-w-[30rem] overflow-hidden rounded-[2rem] px-6 py-7 shadow-[0_30px_120px_rgba(0,0,0,0.52)] sm:px-8 sm:py-8">
            <div className="pointer-events-none absolute -right-20 -top-24 h-52 w-52 rounded-full bg-violet-400/16 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 -left-20 h-56 w-56 rounded-full bg-cyan-300/14 blur-3xl" />

            <div className="relative">
              <div className="mb-8 flex items-center justify-between">
                <p className="font-serif text-2xl font-semibold tracking-normal text-white">AuraCut</p>
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.055] text-cyan-100 shadow-[0_0_44px_rgba(34,211,238,0.14)]">
                  <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>

              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-100/14 bg-cyan-100/[0.055] px-3 py-1 text-xs font-semibold text-cyan-100/80">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  Private preview
                </div>
                <h1 className="font-serif text-3xl font-semibold leading-tight tracking-normal text-white sm:text-4xl">
                  Which company are you?
                </h1>
              </div>

              <form className="mt-8" onSubmit={handleSubmit}>
                <label htmlFor="access-answer" className="sr-only">
                  Company answer
                </label>
                <div className="rounded-full border border-white/10 bg-black/20 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition focus-within:border-cyan-200/36 focus-within:bg-black/26 focus-within:shadow-[0_0_50px_rgba(34,211,238,0.12),inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <div className="flex items-center gap-2">
                    <input
                      id="access-answer"
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      value={answer}
                      onChange={(event) => {
                        setAnswer(event.target.value);
                        setError("");
                      }}
                      placeholder="Answer"
                      className="min-h-12 min-w-0 flex-1 bg-transparent px-5 text-sm font-medium text-white outline-none placeholder:text-white/32"
                    />
                    <button
                      type="submit"
                      className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-slate-950 shadow-[0_0_42px_rgba(103,232,249,0.2)] transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-100"
                      aria-label="Unlock AuraCut"
                    >
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 min-h-5 text-center text-sm font-medium text-rose-200/86" aria-live="polite">
                  {error}
                </div>
              </form>
            </div>
          </section>
        </main>
      ) : null}

      <div className={!isUnlocked ? "access-protected-content-locked" : undefined}>{children}</div>
    </>
  );
}
