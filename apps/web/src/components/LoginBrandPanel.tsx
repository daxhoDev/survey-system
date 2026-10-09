import isotype from "@/assets/brand/isotype-gradient.svg";

// Login brand panel (BRAND-23): Midnight 900 with low-opacity textures —
// signal gradient, glow and digital noise — the large isotype and the name.
// Fixed colors on purpose: it looks the same in both themes. Decorative only.
export default function LoginBrandPanel() {
  return (
    <aside
      aria-hidden="true"
      className="relative hidden overflow-hidden bg-midnight-900 lg:flex lg:items-center lg:justify-center"
    >
      <div className="absolute inset-0 bg-linear-135 from-midnight-900 via-midnight-800 to-turquoise-900 opacity-80" />
      <div className="absolute top-1/2 left-1/2 size-[36rem] -translate-1/2 rounded-full bg-turquoise-500/15 blur-3xl" />
      <div className="brand-noise absolute inset-0 opacity-[0.07] mix-blend-overlay" />

      <div className="relative flex flex-col items-center gap-8">
        <img src={isotype} alt="" className="w-56 xl:w-64" />
        <span className="font-heading text-display tracking-tight text-neutral-100">
          Sondix
        </span>
      </div>
    </aside>
  );
}
