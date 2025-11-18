import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Star, MapPin, Search, Music, Crown, HelpCircle, Calendar } from "lucide-react";
import { countries, sortCountriesByProximity } from "@/lib/countries";
import { useLocationDetection } from "@/hooks/useLocationDetection";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Autoplay from "embla-carousel-autoplay";
import { Capacitor } from "@capacitor/core";
import { TalentCard } from "@/components/TalentCard";


const talentTypes = [
  { value: "all", label: "All Talent Types" },
  { value: "dj", label: "DJ" },
  { value: "singer", label: "Singer" },
  { value: "band", label: "Band" },
  { value: "saxophonist", label: "Saxophonist" },
  { value: "keyboardist", label: "Keyboardist" },
  { value: "drummer", label: "Drummer" },
  { value: "percussionist", label: "Percussionist" },
  { value: "guitarist", label: "Guitarist" },
  { value: "violinist", label: "Violinist" },
  { value: "magician", label: "Magician" },
  { value: "gogo_dancer", label: "Gogo Dancer" },
  { value: "belly_dancer", label: "Belly Dancer" },
  { value: "other", label: "Other" },
];

interface TalentProfile {
  id: string;
  artist_name: string;
  act: string;
  location?: string;
  picture_url?: string;
  is_pro_subscriber: boolean;
  rate_per_hour?: number;
  currency: string;
  music_genres: string[];
}

// Multilingual biography texts
const biographyTexts = [
  {
    language: "en",
    text: "Qtalent.live is the simplest way to find and book exceptional performers, artists, and creators for any occasion.",
    dir: "ltr",
  },
  {
    language: "ar",
    text: "Qtalent.live هو أبسط طريقة للعثور على فنانين استثنائيين وحجزهم لأي مناسبة.",
    dir: "rtl",
  },
  {
    language: "fr",
    text: "Qtalent.live est le moyen le plus simple de trouver et de réserver des artistes exceptionnels pour toute occasion.",
    dir: "ltr",
  },
];

export function HeroSection() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { detectedLocation, userLocation } = useLocationDetection();
  const isNativeApp = Capacitor.isNativePlatform(); // <-- ADD THIS LINE
  const heroCarouselAutoplay = useRef(
    Autoplay({
      delay: isNativeApp ? 2600 : 3200,
      stopOnInteraction: false,
      stopOnMouseEnter: true,
    }) as any
  );
  const [searchFilters, setSearchFilters] = useState({
    location: "",
    talentType: "all",
  });
  const [featuredTalents, setFeaturedTalents] = useState<TalentProfile[]>([]);
  const [currentBiographyIndex, setCurrentBiographyIndex] = useState(0);

  // Sort countries by proximity to user's location
  const sortedCountries = sortCountriesByProximity(detectedLocation || userLocation, countries);

  useEffect(() => {
    fetchFeaturedTalents();
  }, []);

  // Auto-rotate biography text every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBiographyIndex((prev) => (prev + 1) % biographyTexts.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const fetchFeaturedTalents = async () => {
    try {
      const { data, error } = await supabase
        .from("talent_profiles")
        .select(
          `
          id, artist_name, act, location, picture_url, is_pro_subscriber,
          rate_per_hour, currency, music_genres
        `,
        )
        .eq("is_pro_subscriber", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching featured talents:", error);
        return;
      }

      setFeaturedTalents(data || []);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchFilters.location && searchFilters.location !== "all") {
      params.set("location", searchFilters.location);
    }
    if (searchFilters.talentType && searchFilters.talentType !== "all") {
      params.set("type", searchFilters.talentType);
    }

    const newUrl = params.toString() ? `/?${params.toString()}#talents` : "/#talents";

    navigate(newUrl);

    const hasFilters = searchFilters.location !== "all" || searchFilters.talentType !== "all";
    if (hasFilters) {
      setTimeout(() => {
        document.getElementById("talents")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    }
  };

  return (
    <section className={`relative min-h-screen flex items-center justify-center ${isNativeApp ? 'pt-4' : 'pt-24'} pb-16 w-full max-w-full overflow-x-hidden`}>
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-brand-primary/5" />

      <div className="container mx-auto px-4 relative z-10 w-full max-w-full">
        <div className={`grid ${isNativeApp ? 'lg:grid-cols-1 gap-8' : 'lg:grid-cols-2 gap-12'} items-center w-full`}>
          {/* Left Content */}
          <div className={`${isNativeApp ? 'space-y-5' : 'space-y-8'} animate-fadeIn w-full max-w-full overflow-x-hidden`}>
            <div className={isNativeApp ? 'space-y-3' : 'space-y-4 sm:space-y-6'}>
              <div className={isNativeApp ? 'text-accent font-medium text-sm uppercase tracking-wide text-center' : 'text-accent font-medium text-base sm:text-lg'}>
                Connect with live talent
              </div>

              <h1 className={isNativeApp ? 'text-3xl font-bold leading-tight text-center px-2' : 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight'}>
                Book <span className="text-accent">live talents</span> for your event
              </h1>

              <div className={`relative ${isNativeApp ? 'min-h-[3rem]' : 'min-h-[4rem]'} flex items-center ${isNativeApp ? 'justify-center px-4' : 'justify-start'}`}>
                <p
                  key={currentBiographyIndex}
                  className={`${isNativeApp ? 'text-sm text-center text-muted-foreground/90 max-w-lg' : 'text-base sm:text-lg max-w-lg text-muted-foreground'} leading-relaxed animate-fade-in`}
                  dir={biographyTexts[currentBiographyIndex].dir}
                  style={{
                    textAlign: biographyTexts[currentBiographyIndex].dir === "rtl" ? "right" : "left",
                  }}
                >
                  {biographyTexts[currentBiographyIndex].text}
                </p>
              </div>
            </div>

            {/* Search Form */}
            <Card 
              id="hero-search-form"
              className={`${isNativeApp ? 'p-5 border border-border/30 shadow-sm bg-card/80 backdrop-blur-sm' : 'p-4 sm:p-6 md:p-8 glass-card border border-border/50 shadow-elevated'} w-full max-w-full overflow-hidden`}
            >
              <div className={`grid ${isNativeApp ? 'grid-cols-1 gap-4' : 'grid-cols-1 md:grid-cols-3 gap-4 md:gap-6'} w-full`}>
                <div className={`${isNativeApp ? 'space-y-2' : 'space-y-1.5'} w-full`}>
                  <label className={`${isNativeApp ? 'text-[11px] font-medium text-muted-foreground block mb-2' : 'text-xs sm:text-sm font-semibold text-foreground uppercase tracking-wide'}`}>
                    {isNativeApp ? 'Location' : 'WHERE'}
                  </label>
                  <div className="relative w-full">
                    <MapPin className={`absolute ${isNativeApp ? 'left-3 h-4 w-4' : 'left-3 sm:left-4 h-4 w-4 sm:h-5 sm:w-5'} top-1/2 -translate-y-1/2 text-muted-foreground z-[11] pointer-events-none`} style={{ left: isNativeApp ? '0.75rem' : '0.75rem' }} />
                    <Select
                      value={searchFilters.location}
                      onValueChange={(value) => setSearchFilters((prev) => ({ ...prev, location: value }))}
                    >
                      <SelectTrigger 
                        className={`${isNativeApp ? 'h-10 text-sm bg-background border-border/40' : 'h-11 sm:h-12 bg-background/50 border-border/50 hover:border-accent/50 text-sm sm:text-base'} transition-colors w-full search-select-trigger`}
                        style={{
                          paddingLeft: isNativeApp ? '2.75rem' : '2.875rem',
                          paddingRight: '2rem'
                        }}
                      >
                        <SelectValue placeholder="Select location" className="search-select-value" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        <SelectItem value="all">All Countries</SelectItem>
                        {sortedCountries.map((country) => (
                          <SelectItem key={country.code} value={country.name}>
                            {country.flag} {country.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className={`${isNativeApp ? 'space-y-2' : 'space-y-1.5'} w-full`}>
                  <label className={`${isNativeApp ? 'text-[11px] font-medium text-muted-foreground block mb-2' : 'text-xs sm:text-sm font-semibold text-foreground uppercase tracking-wide'}`}>
                    {isNativeApp ? 'Talent Type' : 'TALENT TYPE'}
                  </label>
                  <div className="relative w-full">
                    <Music className={`absolute ${isNativeApp ? 'left-3 h-4 w-4' : 'left-3 sm:left-4 h-4 w-4 sm:h-5 sm:w-5'} top-1/2 -translate-y-1/2 text-muted-foreground z-[11] pointer-events-none`} style={{ left: isNativeApp ? '0.75rem' : '0.75rem' }} />
                    <Select
                      value={searchFilters.talentType}
                      onValueChange={(value) => setSearchFilters((prev) => ({ ...prev, talentType: value }))}
                    >
                      <SelectTrigger 
                        className={`${isNativeApp ? 'h-10 text-sm bg-background border-border/40' : 'h-11 sm:h-12 bg-background/50 border-border/50 hover:border-accent/50 text-sm sm:text-base'} transition-colors w-full search-select-trigger`}
                        style={{
                          paddingLeft: isNativeApp ? '2.75rem' : '2.875rem',
                          paddingRight: '2rem'
                        }}
                      >
                        <SelectValue placeholder="What kind of talent?" className="search-select-value" />
                      </SelectTrigger>
                      <SelectContent>
                        {talentTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className={`flex ${isNativeApp ? 'items-end' : 'items-end'} w-full`}>
                  <Button
                    className={`w-full ${isNativeApp ? 'h-10 bg-primary text-primary-foreground font-semibold text-sm shadow-sm' : 'h-11 sm:h-12 bg-primary text-primary-foreground font-bold text-sm sm:text-base shadow-minimal hover:shadow-elevated'} transition-all duration-300 hover:bg-primary/90 ${isNativeApp ? 'rounded-lg' : 'rounded-xl hover:scale-[1.02]'}`}
                    onClick={handleSearch}
                  >
                    {!isNativeApp && <Search className="h-4 w-4 sm:h-5 sm:w-5 mr-2 flex-shrink-0" />}
                    <span className="truncate">Explore</span>
                  </Button>
                </div>
              </div>
            </Card>

            {/* Social Proof */}
            <div className={`flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm w-full ${isNativeApp ? 'px-2' : ''}`}>
              <div className="flex items-center space-x-2">
                <div className="flex -space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-3 w-3 sm:h-4 sm:w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <span className="text-muted-foreground text-center sm:text-left">
                  <strong className="text-foreground">4.9/5</strong> from 2,340+ bookings
                </span>
              </div>
              <div className="h-4 w-px bg-border hidden sm:block"></div>
              <div className="text-muted-foreground text-center sm:text-left">
                <strong className="text-foreground">500+</strong> professional artists
              </div>
            </div>

            {/* Search Status Message */}
            {(searchFilters.location !== "all" && searchFilters.location) ||
            (searchFilters.talentType !== "all" && searchFilters.talentType) ? (
              <div className={`mt-3 ${isNativeApp ? 'p-2.5 bg-primary/5 border border-primary/20 rounded-lg' : 'p-3 bg-accent/10 border border-accent/20 rounded-lg'} w-full max-w-full`}>
                <div className={`${isNativeApp ? 'text-xs text-primary font-medium' : 'text-sm text-accent font-medium'}`}>
                  🎯 {isNativeApp ? 'Search results below' : 'Your search will show results below in the talent section'}
                </div>
                {!isNativeApp && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Looking for{" "}
                    {searchFilters.talentType !== "all" && searchFilters.talentType ? (
                      <span className="font-medium">{searchFilters.talentType}s</span>
                    ) : (
                      <span className="font-medium">all talent types</span>
                    )}
                    {searchFilters.location !== "all" && searchFilters.location && (
                      <span>
                        {" "}
                        in <span className="font-medium">{searchFilters.location}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Right Content - Pro Artists Carousel */}
          <div className={`${isNativeApp ? 'space-y-4 mt-8' : 'space-y-6'} w-full max-w-full overflow-x-hidden`}>
            <div className={`text-center ${isNativeApp ? 'space-y-2' : 'space-y-2'}`}>
              <div className="flex items-center justify-center gap-2">
                <Crown className={`${isNativeApp ? 'h-5 w-5' : 'h-6 w-6'} text-brand-warning`} />
                <h3 className={`${isNativeApp ? 'text-lg' : 'text-xl'} font-bold text-foreground`}>Featured Pro Artists</h3>
              </div>
              <p className={`${isNativeApp ? 'text-xs' : 'text-sm'} text-muted-foreground`}>Premium verified talents with unlimited bookings</p>
            </div>

            {featuredTalents.length > 0 ? (
              <div
                className="w-full max-w-full overflow-hidden relative"
                onMouseEnter={() => heroCarouselAutoplay.current?.stop()}
                onMouseLeave={() => heroCarouselAutoplay.current?.reset()}
              >
                <Carousel
                  opts={{
                    align: "start",
                    loop: true,
                  }}
                  plugins={[heroCarouselAutoplay.current]}
                  className="w-full max-w-full"
                >
                  <CarouselContent className="-ml-2 md:-ml-4">
                    {(
                      featuredTalents.length > (isNativeApp ? 4 : 6)
                        ? [...featuredTalents, ...featuredTalents]
                        : featuredTalents
                    ).map((talent, index) => (
                      <CarouselItem
                        key={`${talent.id}-${index}`}
                        className="pl-2 md:pl-4 basis-[85%] sm:basis-1/2 xl:basis-1/3"
                      >
                        <TalentCard
                          className="h-full"
                          talent={{
                            id: talent.id,
                            artist_name: talent.artist_name,
                            act: talent.act,
                            location: talent.location,
                            picture_url: talent.picture_url,
                            music_genres: talent.music_genres,
                            rate_per_hour: talent.rate_per_hour,
                            currency: talent.currency,
                            is_pro_subscriber: talent.is_pro_subscriber,
                          }}
                        />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="hidden md:flex" />
                  <CarouselNext className="hidden md:flex" />
                </Carousel>
                <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-background via-background/60 to-transparent" />
                <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background via-background/60 to-transparent" />
              </div>
            ) : (
              // Loading state
              <div className="space-y-4 w-full max-w-full">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="animate-pulse w-full">
                    <Card className="p-4 glass-card h-32 bg-muted/50 w-full"></Card>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Booker Help Section */}
        <div className={`${isNativeApp ? 'mt-12' : 'mt-24'} text-center ${isNativeApp ? 'space-y-6' : 'space-y-8'} w-full max-w-full`}>
          <div className={`${isNativeApp ? 'space-y-3' : 'space-y-4'} w-full max-w-full`}>
            <div className={`inline-flex items-center justify-center ${isNativeApp ? 'p-2.5' : 'p-3'} bg-accent/10 rounded-full mb-4`}>
              <HelpCircle className={isNativeApp ? 'h-6 w-6 text-accent' : 'h-8 w-8 text-accent'} />
            </div>
            <h2 className={isNativeApp ? 'text-xl font-bold' : 'text-2xl sm:text-3xl md:text-4xl font-bold'}>Need help finding the perfect talents?</h2>
            <p className={`text-muted-foreground ${isNativeApp ? 'text-sm max-w-full' : 'text-base sm:text-lg max-w-2xl mx-auto'} leading-relaxed`}>
              Our expert team personally curates recommendations based on your event type, budget, and style
              preferences. Get matched with verified performers in 24 hours.
            </p>
          </div>

          <div className={`flex ${isNativeApp ? 'flex-col gap-3' : 'flex-col sm:flex-row gap-4'} items-center justify-center w-full max-w-full`}>
            <Button
              size="lg"
              className="hero-button px-6 sm:px-8 py-4 text-sm sm:text-base font-semibold w-full sm:w-auto max-w-full"
              onClick={() => {
                if (user) {
                  navigate("/your-event");
                } else {
                  navigate("/auth", { state: { intent: "event-form", mode: "booker" } });
                }
              }}
            >
              {user ? "Get Personalized Recommendations" : "Start Free Consultation"}
            </Button>

            {!user && (
              <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                No account needed • Free consultation • 2 min setup
              </div>
            )}
          </div>
         {!isNativeApp && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-4xl mx-auto w-full px-4">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center p-2 bg-accent/10 rounded-full">
                <Search className="h-5 w-5 text-accent" />
              </div>
              <h3 className="font-semibold">Tell us your needs</h3>
              <p className="text-sm text-muted-foreground">Share your event details and preferences with us</p>
            </div>
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center p-2 bg-accent/10 rounded-full">
                <Star className="h-5 w-5 text-accent" />
              </div>
              <h3 className="font-semibold">Get matched</h3>
              <p className="text-sm text-muted-foreground">Receive curated talent recommendations within 24h</p>
            </div>
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center p-2 bg-accent/10 rounded-full">
                <Calendar className="h-5 w-5 text-accent" />
              </div>
              <h3 className="font-semibold">Book & celebrate</h3>
              <p className="text-sm text-muted-foreground">Connect directly and create unforgettable experiences</p>
            </div>
          </div>)}
        </div>
      </div>
    </section>
  );
}

