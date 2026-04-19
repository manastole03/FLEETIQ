import Link from "next/link";
import { ArrowRight, ShieldCheck, Truck } from "lucide-react";

export default function LoginPage() {
  return (
    <main className="app-bg min-h-screen text-white">
      <section className="mx-auto flex min-h-screen max-w-6xl items-center px-5 py-10 sm:px-8">
        <div className="w-full">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-[#26d69b] text-[#03120c]">
              <Truck className="h-7 w-7" />
            </div>
            <p className="mt-6 text-sm font-black uppercase text-[#26d69b]">
              FleetIQ Access
            </p>
            <h1 className="mt-3 text-5xl font-black leading-tight">
              Choose your operating role.
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[#8ea198]">
              Admin users manage the fleet command center. Drivers get a
              dedicated mobile workflow for trips, documents, HOS, and AI trip
              guidance.
            </p>
          </div>

          <div className="mx-auto mt-10 grid max-w-4xl gap-4 md:grid-cols-2">
            <RoleCard
              href="/login/admin"
              icon={ShieldCheck}
              title="Admin Login"
              text="Fleet owners, dispatchers, safety managers, and operations managers."
              cta="Continue as admin"
            />
            <RoleCard
              href="/login/driver"
              icon={Truck}
              title="Driver Login"
              text="Drivers viewing assigned loads, route guidance, documents, and trip status."
              cta="Continue as driver"
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function RoleCard({
  href,
  icon: Icon,
  title,
  text,
  cta,
}: {
  href: string;
  icon: typeof Truck;
  title: string;
  text: string;
  cta: string;
}) {
  return (
    <Link href={href} className="premium-card panel p-6">
      <Icon className="h-8 w-8 text-[#26d69b]" />
      <h2 className="mt-5 text-2xl font-black">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-[#8ea198]">{text}</p>
      <span className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#26d69b] px-4 py-3 text-sm font-black text-[#03120c]">
        {cta}
        <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
  );
}
