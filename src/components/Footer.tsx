import { ArrowRight } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-foreground text-primary-foreground">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 py-12 lg:py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 mb-16">
          {/* Brand */}
          <div className="lg:col-span-1">
            <h3 className="font-display text-2xl font-bold mb-4">TrendZone</h3>
            <p className="font-body text-sm text-primary-foreground/60 leading-relaxed max-w-xs">
              Bold fashion for the modern individual. Elevate your style with curated collections designed to inspire confidence.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-display font-semibold text-sm uppercase tracking-widest mb-6 text-primary-foreground/40">Shop</h4>
            <ul className="space-y-3">
              {["New Arrivals", "Best Sellers", "Sale", "Collections"].map((l) => (
                <li key={l}><a href="#" className="font-body text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">{l}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-display font-semibold text-sm uppercase tracking-widest mb-6 text-primary-foreground/40">Company</h4>
            <ul className="space-y-3">
              {["About Us", "Careers", "Press", "Sustainability"].map((l) => (
                <li key={l}><a href="#" className="font-body text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">{l}</a></li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="font-display font-semibold text-sm uppercase tracking-widest mb-6 text-primary-foreground/40">Newsletter</h4>
            <p className="font-body text-sm text-primary-foreground/60 mb-4">Get the latest updates on new collections and exclusive offers.</p>
            <div className="flex">
              <input
                type="email"
                placeholder="Your email"
                className="flex-1 bg-primary-foreground/10 border border-primary-foreground/20 rounded-l-full px-5 py-3 text-sm font-body text-primary-foreground placeholder:text-primary-foreground/40 focus:outline-none focus:border-primary-foreground/50"
              />
              <button className="bg-accent text-accent-foreground rounded-r-full px-5 py-3 hover:opacity-90 transition-opacity" aria-label="Subscribe">
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-primary-foreground/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="font-body text-xs text-primary-foreground/40">© 2026 TrendZone. All rights reserved.</p>
          <div className="flex gap-6">
            {["Twitter", "Instagram", "Pinterest"].map((s) => (
              <a key={s} href="#" className="font-body text-xs text-primary-foreground/40 hover:text-primary-foreground transition-colors">{s}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
