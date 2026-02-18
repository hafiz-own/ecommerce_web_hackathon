import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Mail, Phone, MapPin, Send } from "lucide-react";

const Contact = () => {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-28 pb-16 px-4 sm:px-6 lg:px-12 max-w-[1440px] mx-auto">
        <div className="text-center mb-16">
          <h1 className="font-display font-bold text-foreground" style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)" }}>
            Get In Touch
          </h1>
          <p className="font-body text-muted-foreground mt-4 max-w-lg mx-auto">
            Have a question or feedback? We'd love to hear from you.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Contact Info */}
          <div className="space-y-10">
            <div>
              <h2 className="font-display font-semibold text-foreground text-xl mb-6">Contact Information</h2>
              <div className="space-y-6">
                {[
                  { icon: Mail, label: "Email", value: "hello@trendzone.com" },
                  { icon: Phone, label: "Phone", value: "+1 (555) 123-4567" },
                  { icon: MapPin, label: "Address", value: "123 Fashion Ave, New York, NY 10001" },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center shrink-0">
                      <item.icon className="w-5 h-5 text-foreground" />
                    </div>
                    <div>
                      <p className="font-display text-sm font-medium text-muted-foreground">{item.label}</p>
                      <p className="font-body text-foreground mt-0.5">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl bg-foreground text-primary-foreground p-10">
              <h3 className="font-display font-bold text-xl mb-3">Visit Our Store</h3>
              <p className="font-body text-primary-foreground/70 text-sm leading-relaxed">
                Come visit us at our flagship store in New York. We're open Monday to Saturday, 10am to 8pm.
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div>
            {submitted ? (
              <div className="rounded-3xl bg-secondary p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-6">
                  <Send className="w-7 h-7 text-accent" />
                </div>
                <h3 className="font-display font-bold text-foreground text-xl mb-2">Message Sent!</h3>
                <p className="font-body text-muted-foreground">We'll get back to you within 24 hours.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="font-display text-sm font-medium text-foreground block mb-2">Name</label>
                    <input
                      type="text"
                      required
                      maxLength={100}
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="font-display text-sm font-medium text-foreground block mb-2">Email</label>
                    <input
                      type="email"
                      required
                      maxLength={255}
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-display text-sm font-medium text-foreground block mb-2">Subject</label>
                  <input
                    type="text"
                    required
                    maxLength={200}
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="How can we help?"
                  />
                </div>
                <div>
                  <label className="font-display text-sm font-medium text-foreground block mb-2">Message</label>
                  <textarea
                    required
                    maxLength={1000}
                    rows={5}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                    placeholder="Tell us more..."
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-foreground text-primary-foreground font-display font-semibold rounded-full py-3.5 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300"
                >
                  Send Message
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;
