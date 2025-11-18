import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { TalentCard } from "@/components/TalentCard";
import { Card } from "@/components/ui/card";

interface FeaturedTalent {
  id: string;
  artist_name: string;
  act: string;
  location?: string;
  picture_url?: string;
  music_genres: string[];
  rate_per_hour?: number;
  currency: string;
  is_pro_subscriber: boolean;
}

export function FeaturedProArtists() {
  const [featuredTalents, setFeaturedTalents] = useState<FeaturedTalent[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const isNativeApp = Capacitor.isNativePlatform();
  const autoplay = useRef(
    Autoplay({
      delay: isNativeApp ? 2600 : 3200,
      stopOnInteraction: false,
      stopOnMouseEnter: true,
    }) as any
  );

  useEffect(() => {
    fetchFeaturedTalents();
  }, []);

  const fetchFeaturedTalents = async () => {
    try {
      const { data, error } = await supabase
        .from("talent_profiles")
        .select(
          `
          id, artist_name, act, location, picture_url, music_genres, 
          rate_per_hour, currency, is_pro_subscriber
        `
        )
        .eq("is_pro_subscriber", true)
        .order("created_at", { ascending: false })
        .limit(6);

      if (error) {
        console.error("Error fetching featured talents:", error);
        return;
      }

      setFeaturedTalents(data || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="py-16 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-headline mb-4">Featured Pro Artists</h2>
            <p className="text-subhead">Loading premium talents...</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <Card className="h-64 bg-muted rounded-lg"></Card>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (featuredTalents.length === 0) {
    return null; // Don't show section if no Pro artists
  }

  return (
    <section className="py-16 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className={`text-center mb-12 ${isNativeApp ? "px-4" : ""}`}>
          <div className="flex items-center justify-center gap-2 mb-4">
            <Crown className="h-8 w-8 text-brand-warning" />
            <h2 className="text-headline">Featured Pro Artists</h2>
          </div>
          <p className="text-subhead max-w-2xl mx-auto">
            Discover our premium verified talents with unlimited booking
            requests and priority visibility
          </p>
        </div>

        <div
          className="w-full max-w-full relative"
          onMouseEnter={() => autoplay.current?.stop()}
          onMouseLeave={() => autoplay.current?.reset()}
        >
          <Carousel
            className="w-full max-w-full"
            opts={{
              align: "start",
              loop: true,
            }}
            plugins={[autoplay.current]}
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
          <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-secondary/30 to-transparent hidden md:block" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-secondary/30 to-transparent hidden md:block" />
        </div>

        <div className="text-center mt-8">
          <Button onClick={() => navigate("/")} className="hero-button">
            <Crown className="h-4 w-4 mr-2" />
            Become a Pro Artist
          </Button>
        </div>
      </div>
    </section>
  );
}
