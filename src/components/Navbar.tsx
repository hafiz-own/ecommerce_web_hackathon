import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Search, ShoppingBag, Menu, X, User, LogOut } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useUserAuth } from "@/contexts/UserAuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navLinks = [
  { label: "Home", to: "/" },
  { label: "Shop", to: "/shop" },
  { label: "Contact", to: "/contact" },
];

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { count } = useCart();
  const { user, isAuthenticated, signOut } = useUserAuth();

  const focusShopSearch = () => {
    window.dispatchEvent(new CustomEvent('trendzone:focus-shop-search'));
  };

  const handleSearchClick = () => {
    if (location.pathname.startsWith('/shop')) {
      focusShopSearch();
      return;
    }
    navigate('/shop');
    // allow route render first
    setTimeout(() => focusShopSearch(), 0);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  // Get user display name or email
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "User";
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="max-w-[1440px] mx-auto flex items-center justify-between px-6 lg:px-12 h-20">
        <Link to="/" className="font-display text-2xl font-bold tracking-tight text-foreground">
          TrendZone
        </Link>

        <ul className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <li key={link.label}>
              <Link
                to={link.to}
                className="font-body text-sm font-medium text-foreground/80 hover:text-foreground transition-opacity duration-200"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-4">
          <button
            aria-label="Search"
            className="p-2 hover:opacity-60 transition-opacity"
            onClick={handleSearchClick}
          >
            <Search className="w-5 h-5" />
          </button>
          <Link to="/cart" aria-label="Cart" className="p-2 hover:opacity-60 transition-opacity relative">
            <ShoppingBag className="w-5 h-5" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center">
                {count}
              </span>
            )}
          </Link>
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="hidden md:flex items-center gap-2 font-display text-sm font-medium border-2 border-foreground rounded-full px-4 py-2 hover:bg-foreground hover:text-primary-foreground transition-colors duration-300">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="w-6 h-6 rounded-full" />
                ) : (
                  <User className="w-4 h-4" />
                )}
                <span className="max-w-[100px] truncate">{displayName}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem className="font-body text-sm">
                  <User className="w-4 h-4 mr-2" />
                  My Account
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/cart" className="font-body text-sm">
                    <ShoppingBag className="w-4 h-4 mr-2" />
                    My Orders
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="font-body text-sm text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/signin" className="hidden md:inline-flex font-display text-sm font-medium border-2 border-foreground rounded-full px-6 py-2 hover:bg-foreground hover:text-primary-foreground transition-colors duration-300">
              Sign In
            </Link>
          )}
          <button
            aria-label="Menu"
            className="md:hidden p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-background/95 backdrop-blur-xl border-t border-border px-6 pb-8 pt-4">
          <ul className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <li key={link.label}>
                <Link to={link.to} onClick={() => setMobileOpen(false)} className="font-display text-lg font-medium text-foreground">
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              {isAuthenticated ? (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2 px-2 py-2">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={displayName} className="w-8 h-8 rounded-full" />
                    ) : (
                      <User className="w-6 h-6" />
                    )}
                    <span className="font-display font-medium">{displayName}</span>
                  </div>
                  <button
                    onClick={() => {
                      handleSignOut();
                      setMobileOpen(false);
                    }}
                    className="font-display text-sm font-medium border-2 border-red-500 text-red-500 rounded-full px-6 py-2.5 w-full flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              ) : (
                <Link to="/signin" onClick={() => setMobileOpen(false)} className="mt-2 font-display text-sm font-medium border-2 border-foreground rounded-full px-6 py-2.5 w-full block text-center">
                  Sign In
                </Link>
              )}
            </li>
          </ul>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
