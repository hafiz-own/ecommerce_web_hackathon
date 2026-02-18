import { useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { getCategoryCounts, getProducts, type Product } from "@/lib/api/products";
import product1 from "@/assets/product-1_linen_blazer.jpg";
import product2 from "@/assets/product-2_white_sneakers.jpg";
import product3 from "@/assets/product-3_totte_bag.jpg";
import product4 from "@/assets/leather_belt.png";

const categoryImages: Record<string, string> = {
  Clothes: product1,
  Shoes: product2,
  Bags: product3,
  Accessories: product4,
};

const categoryOrder = ["Clothes", "Shoes", "Bags", "Accessories"];

const CategoriesSection = () => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const counts = await getCategoryCounts();
        setCategoryCounts(counts);
      } catch (error) {
        console.error("Error fetching category counts:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCounts();
  }, []);

  const categories = categoryOrder.map((name) => ({
    name,
    count: categoryCounts[name] || 0,
    image: categoryImages[name] || product1,
  }));

  return (
    <section className="py-12 lg:py-16 px-4 sm:px-6 lg:px-12 max-w-[1440px] mx-auto">
      {/* Section heading */}
      <div className="mb-8 scroll-reveal">
        <p className="font-body text-sm text-muted-foreground uppercase tracking-widest mb-2">Browse by</p>
        <h2
          className="font-display font-bold text-foreground"
          style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}
        >
          Categories
        </h2>
      </div>

      {/* Category list — full width with floating overlay image */}
      <div className="relative overflow-hidden">
        {/* Floating tilted preview — only on hover, contained within parent */}
        <div className="hidden lg:block absolute inset-0 z-10 pointer-events-none">
          {categories.map((cat, i) => (
            <div
              key={cat.name}
              className="absolute w-[200px] h-[260px] rounded-2xl overflow-hidden shadow-2xl transition-all duration-500 ease-out"
              style={{
                opacity: hoveredIdx === i ? 1 : 0,
                transform: hoveredIdx === i
                  ? `rotate(-6deg) scale(1)`
                  : `rotate(-6deg) scale(0.9)`,
                right: "40px",
                top: "50%",
                marginTop: "-130px",
              }}
            >
              <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>

        {/* Category rows */}
        {categories.map((cat, i) => (
          <Link
            to={`/shop?category=${encodeURIComponent(cat.name)}`}
            key={cat.name}
            className="group flex items-center justify-between py-5 lg:py-7 border-b border-border cursor-pointer scroll-reveal"
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <div className="flex items-center gap-4 sm:gap-6">
              <span className="font-display text-muted-foreground text-sm w-8">0{i + 1}</span>
              <h3
                className="font-display font-semibold text-foreground transition-colors group-hover:text-accent"
                style={{ fontSize: "clamp(1.3rem, 3vw, 2.5rem)" }}
              >
                {cat.name}
              </h3>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-body text-sm text-muted-foreground hidden sm:block">
                {loading ? "..." : `${cat.count} item${cat.count !== 1 ? "s" : ""}`}
              </span>
              <ArrowRight className="w-5 h-5 text-foreground transition-transform duration-300 group-hover:translate-x-2" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default CategoriesSection;
