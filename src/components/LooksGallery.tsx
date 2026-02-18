import { ArrowRight } from "lucide-react";
import gallery1 from "@/assets/gallery-1.jpg";
import gallery2 from "@/assets/gallery-2.jpg";
import gallery3 from "@/assets/gallery-3.jpg";

const LooksGallery = () => {
  return (
    <section className="py-12 lg:py-16 px-4 sm:px-6 lg:px-12 max-w-[1440px] mx-auto">
      <div className="flex items-center justify-between mb-12 scroll-reveal">
        <h2 className="font-display font-bold text-foreground" style={{ fontSize: "clamp(1.75rem, 3vw, 2.5rem)" }}>
          Latest Looks
        </h2>
        <a href="#" className="font-display text-sm font-medium text-foreground flex items-center gap-2 hover:text-accent transition-colors">
          Full Gallery <ArrowRight className="w-4 h-4" />
        </a>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 scroll-reveal">
        {/* Large landscape */}
        <div className="col-span-2 rounded-3xl overflow-hidden aspect-[16/9] group">
          <img src={gallery1} alt="Street style lookbook" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        </div>
        {/* Tall portrait */}
        <div className="col-span-1 row-span-2 rounded-3xl overflow-hidden group">
          <img src={gallery2} alt="Accessories detail" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        </div>
        {/* Square */}
        <div className="col-span-1 rounded-3xl overflow-hidden aspect-square group">
          <img src={gallery3} alt="Styled editorial" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        </div>
        {/* Text card */}
        <div className="col-span-1 rounded-3xl bg-foreground text-primary-foreground flex flex-col justify-center p-8 lg:p-12 aspect-square">
          <p className="font-body text-sm text-primary-foreground/60 mb-4">02 — Lookbook</p>
          <h3 className="font-display font-bold text-xl lg:text-2xl leading-tight">
            Discover the season's most inspiring styled looks
          </h3>
        </div>
      </div>
    </section>
  );
};

export default LooksGallery;
