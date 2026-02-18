import { useEffect } from "react";
import { motion, stagger, useAnimate } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import Floating, { FloatingElement } from "@/components/ui/parallax-floating";

import hero1 from "@/assets/hero-1.jpg";
import hero2 from "@/assets/hero-2.jpg";
import hero3 from "@/assets/hero-3.jpg";
import hero4 from "@/assets/hero-4.jpg";
import hero5 from "@/assets/hero-5.jpg";

const HeroSection = () => {
  const [scope, animate] = useAnimate();

  useEffect(() => {
    animate(
      "img",
      { opacity: [0, 1] },
      { duration: 0.5, delay: stagger(0.15) }
    );
  }, []);

  return (
    <section className="relative pt-24 pb-8 overflow-hidden">
      <Floating className="w-full min-h-[85vh] md:min-h-[90vh]" sensitivity={0.8} easingFactor={0.04}>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none px-4">
          <div className="scroll-reveal text-center">
            <h1
              className="font-display font-extrabold text-foreground leading-[1.05] tracking-tight"
              style={{ fontSize: "clamp(2.5rem, 6vw, 5.5rem)" }}
            >
              Elevate Your Style
              <br />
              With <span className="italic font-accent font-normal">Bold</span> Fashion
            </h1>
            <div className="mt-6 pointer-events-auto">
              <Link to="/shop" className="bg-foreground text-primary-foreground font-display font-semibold rounded-full px-8 py-3 text-sm hover:-translate-y-0.5 hover:shadow-xl transition-all duration-300 inline-flex items-center gap-2">
                Explore Collections <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Floating images */}
        <div ref={scope} className="w-full h-full">
          {/* Top left */}
          <FloatingElement depth={0.5} className="top-[5%] left-[2%] md:left-[5%]">
            <motion.img
              src={hero1}
              alt="Fashion editorial"
              className="w-28 h-36 md:w-44 md:h-56 object-cover rounded-2xl lg:rounded-3xl shadow-lg opacity-0"
            />
          </FloatingElement>

          {/* Top right */}
          <FloatingElement depth={1} className="top-[8%] right-[2%] md:right-[8%]">
            <motion.img
              src={hero2}
              alt="Fashion editorial"
              className="w-24 h-32 md:w-40 md:h-52 object-cover rounded-2xl lg:rounded-3xl shadow-lg opacity-0"
            />
          </FloatingElement>

          {/* Middle left */}
          <FloatingElement depth={2} className="top-[45%] left-[3%] md:left-[8%]">
            <motion.img
              src={hero3}
              alt="Fashion editorial"
              className="w-32 h-24 md:w-52 md:h-36 object-cover rounded-2xl lg:rounded-3xl shadow-lg opacity-0"
            />
          </FloatingElement>

          {/* Middle right */}
          <FloatingElement depth={1.5} className="top-[40%] right-[2%] md:right-[5%]">
            <motion.img
              src={hero4}
              alt="Fashion editorial"
              className="w-28 h-36 md:w-48 md:h-60 object-cover rounded-2xl lg:rounded-3xl shadow-lg opacity-0"
            />
          </FloatingElement>

          {/* Bottom center */}
          <FloatingElement depth={0.8} className="bottom-[5%] left-1/2 -translate-x-1/2">
            <motion.img
              src={hero5}
              alt="Fashion editorial"
              className="w-40 h-24 md:w-64 md:h-36 object-cover rounded-2xl lg:rounded-3xl shadow-lg opacity-0"
            />
          </FloatingElement>
        </div>
      </Floating>
    </section>
  );
};

export default HeroSection;
