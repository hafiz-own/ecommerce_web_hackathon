import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import TestimonialLifestyle from "@/components/TestimonialLifestyle";
import CategoriesSection from "@/components/CategoriesSection";
import ProductGrid from "@/components/ProductGrid";
import NewStylesSection from "@/components/NewStylesSection";
import { StaggerTestimonials } from "@/components/ui/stagger-testimonials";
import InstagramFeed from "@/components/InstagramFeed";
import Footer from "@/components/Footer";
import LoadingScreen from "@/components/LoadingScreen";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const Index = () => {
  useScrollReveal();

  return (
    <div className="min-h-screen bg-background">
      <LoadingScreen />
      <Navbar />
      <main>
        <HeroSection />
        <TestimonialLifestyle />
        <CategoriesSection />
        <ProductGrid />
        <NewStylesSection />

        {/* Testimonials */}
        <section className="py-12 lg:py-16 px-4 sm:px-6 lg:px-12 max-w-[1440px] mx-auto">
          <h2 className="font-display font-bold text-foreground text-center mb-10" style={{ fontSize: "clamp(1.75rem, 3vw, 2.5rem)" }}>
            Happy Voices
          </h2>
          <StaggerTestimonials />
        </section>

        <InstagramFeed />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
