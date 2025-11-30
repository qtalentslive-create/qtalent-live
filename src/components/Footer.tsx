import { Button } from "@/components/ui/button";
import { Facebook, Instagram, Linkedin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { openSocialLink } from "@/utils/externalLinks";
import { Capacitor } from "@capacitor/core";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

export function Footer() {
  const navigate = useNavigate();
  const isNativeApp = Capacitor.isNativePlatform();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();

  const handleSocialClick = (url: string) => {
    openSocialLink(url);
  };

  // Native app or mobile web footer - compact and minimal, integrated with page
  // Match Capacitor app appearance on mobile web
  if (isNativeApp || isMobile) {
    return (
      <footer className="bg-background safe-bottom native-footer">
        <div className="container mx-auto px-4 py-2.5">
          <div className="flex flex-col gap-1 native-footer-content text-center">
            <button
              onClick={() => navigate("/terms-of-service")}
              className="footer-link text-[12px] text-muted-foreground hover:text-foreground transition-colors font-semibold"
            >
              Terms of Service
            </button>
            <span className="text-[10px] text-muted-foreground/60 whitespace-nowrap">
              © 2024 Qtalent.live
            </span>
          </div>
        </div>
      </footer>
    );
  }

  // Web footer - Full version
  return (
    <footer className="bg-background border-t border-border/40 safe-bottom">
      <div className="container mx-auto px-4 pt-16">
        <div className="flex flex-col items-center text-center space-y-6">
          {/* Brand Section */}
          <div className="space-y-4 max-w-2xl">
            <div className="text-2xl font-bold text-foreground">Qtalent.live</div>
            <p className="text-muted-foreground">
              The simplest way to connect with exceptional live talent for your events. Book verified performers and
              creators worldwide.
            </p>
            <div className="flex justify-center space-x-3">
              <Button variant="ghost" size="sm" onClick={() => handleSocialClick("https://www.facebook.com/qtalentlive")}>
                <Facebook className="h-4 w-4" />
              </Button>

              <Button variant="ghost" size="sm" onClick={() => handleSocialClick("https://www.instagram.com/qtalent.live/")}>
                <Instagram className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleSocialClick("https://www.linkedin.com/in/qtalentlive/")}>
                <Linkedin className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 w-full space-y-6">
          {!isNativeApp && (
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Qtalent App (Android)
              </p>
              <button
                type="button"
                onClick={() =>
                  toast({
                    title: "Coming soon",
                    description: "Android app download will be available shortly.",
                  })
                }
                className="rounded-2xl border border-border/60 bg-card/70 hover:bg-card transition-colors shadow-sm px-4 py-2 flex items-center gap-3"
              >
                <img
                  src="/get-it-on-google-play-B0192/get-it-on-google-play.png"
                  alt="Get it on Google Play"
                  className="h-10 w-auto"
                />
              </button>
            </div>
          )}
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-muted-foreground text-sm text-center md:text-left">
              © {currentYear} Qtalent.live. All rights reserved.
            </div>
            <nav className="flex space-x-6 text-sm">
              <button
                onClick={() => navigate("/terms-of-service")}
                className="footer-link text-muted-foreground hover:text-foreground transition-colors"
              >
                Terms of Service
              </button>
            </nav>
          </div>
          {isNativeApp && (
            <div className="text-center text-xs text-muted-foreground">
              <button
                onClick={() => navigate("/terms-of-service")}
                className="footer-link text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
              >
                Terms of Service
              </button>
              <div className="text-muted-foreground/70 mt-1">
                © {currentYear} Qtalent.live
              </div>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
