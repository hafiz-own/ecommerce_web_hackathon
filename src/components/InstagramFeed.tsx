import hero1 from "@/assets/hero-1.jpg";
import hero2 from "@/assets/hero-2.jpg";
import hero3 from "@/assets/hero-3.jpg";
import hero4 from "@/assets/hero-4.jpg";
import hero5 from "@/assets/hero-5.jpg";
import gallery3 from "@/assets/gallery-3.jpg";

const images = [hero1, hero2, hero3, hero4, hero5, gallery3];

const InstagramFeed = () => {
  return (
    <section className="py-12 lg:py-16 px-4 sm:px-6 lg:px-12 max-w-[1440px] mx-auto">
      <div className="text-center mb-12 scroll-reveal">
        <p className="font-body text-sm text-muted-foreground uppercase tracking-widest mb-2">Follow us on Instagram</p>
        <h2 className="font-display font-bold text-foreground text-3xl lg:text-4xl">@TrendZone</h2>
      </div>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 lg:gap-4 scroll-reveal">
        {images.map((src, i) => (
          <div key={i} className="rounded-2xl overflow-hidden aspect-square group cursor-pointer">
            <img src={src} alt={`Instagram post ${i + 1}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
          </div>
        ))}
      </div>
    </section>
  );
};

export default InstagramFeed;
