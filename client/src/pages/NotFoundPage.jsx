import { Link } from "react-router-dom";
import { ArrowLeft, Compass } from "lucide-react";

export default function NotFoundPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#9ad17b]/20 bg-[#9ad17b]/10 text-[#9ad17b]"><Compass /></div>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.22em] text-[#9ad17b]">404 · Route not found</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">This workspace doesn't exist.</h1>
        <p className="mt-4 max-w-lg text-sm leading-6 text-white/50">The requested BizLift route is unavailable. Return to the workspace portal and continue from a valid environment.</p>
        <Link to="/" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#9ad17b] px-5 py-3 text-sm font-bold text-black transition hover:-translate-y-0.5 hover:brightness-105"><ArrowLeft size={16}/> Back to BizLift</Link>
      </div>
    </main>
  );
}
