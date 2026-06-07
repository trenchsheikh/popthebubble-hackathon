import Link from "next/link";
import { Sparkles, UtensilsCrossed } from "lucide-react";

export default function HomePage() {
  return (
    <main className="landing">
      <header className="landing-top">
        <span className="landing-brand">
          <Sparkles size={18} /> Bubble
        </span>
        <Link href="/login" className="primary-button landing-signin">
          Sign in as a Restaurant
        </Link>
      </header>

      <section className="landing-hero">
        <p className="eyebrow">Interactive QR menus that remember your guests</p>
        <h1>Your menu, alive.</h1>
        <p className="landing-sub">
          Snap your menu, we read every dish, and your guests get a memory-aware menu with allergy-safe
          recommendations — and a way to keep the night going after dinner.
        </p>
        <div className="landing-cta">
          <Link href="/login" className="primary-button">
            Sign in as a Restaurant
          </Link>
          <Link href="/r/hinoki?table=12" className="ghost-button">
            <UtensilsCrossed size={16} /> View the demo menu
          </Link>
        </div>
      </section>
    </main>
  );
}
