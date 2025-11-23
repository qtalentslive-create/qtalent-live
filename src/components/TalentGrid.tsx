import { useMemo, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Music, Filter, X, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLocationDetection } from "@/hooks/useLocationDetection";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Capacitor } from "@capacitor/core";
import { TalentCard } from "@/components/TalentCard";

interface TalentProfile {
  id: string;
  artist_name: string;
  act: string;
  gender?: string;
  age: string;
  location?: string;
  rate_per_hour?: number;
  currency: string;
  music_genres: string[];
  custom_genre?: string;
  picture_url?: string;
  soundcloud_link?: string;
  youtube_link?: string;
  biography: string;
  nationality: string;
  created_at: string;
  is_pro_subscriber?: boolean;
  subscription_started_at?: string;
}

// Single optimized query function
const fetchTalents = async (): Promise<TalentProfile[]> => {
  console.log("🔄 Fetching talents...");

  const { data, error } = await supabase
    .from("talent_profiles")
    .select("*")
    .order("is_pro_subscriber", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ Error fetching talents:", error);
    throw error;
  }

  console.log("✅ Talents fetched:", data.length);
  return data as TalentProfile[];
};

export function TalentGrid() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { userLocation } = useLocationDetection();
  const queryClient = useQueryClient();

  const activeFilters = useMemo(
    () => ({
      location: searchParams.get("location") || "",
      date: searchParams.get("date") || "",
      type: searchParams.get("type") || "",
    }),
    [searchParams]
  );

  // Check if any filters are active - MUST be a strict boolean
  const hasActiveFilters = Boolean(
    (activeFilters.location && activeFilters.location !== "all") ||
      (activeFilters.type && activeFilters.type !== "all")
  );

  // React Query with conditional fetching - ONLY fetch when filters are active
  const {
    data: talents = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["talents", activeFilters.location, activeFilters.type],
    queryFn: fetchTalents,
    enabled: hasActiveFilters, // Now guaranteed to be a boolean
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });

  // Real-time subscription with debounce - only subscribe when we have active filters
  useEffect(() => {
    if (!hasActiveFilters) return; // Don't subscribe if no filters

    let debounceTimer: NodeJS.Timeout;

    const channel = supabase
      .channel("talent-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "talent_profiles",
        },
        () => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            console.log("🔄 Real-time update, invalidating cache...");
            queryClient.invalidateQueries({ queryKey: ["talents"] });
          }, 500); // 500ms debounce
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [queryClient, hasActiveFilters]);

  // Memoized filtering
  const filteredTalents = useMemo(() => {
    if (!hasActiveFilters || talents.length === 0) return [];

    let filtered = [...talents];

    if (activeFilters.location && activeFilters.location !== "all") {
      const locationQuery = activeFilters.location.toLowerCase();
      filtered = filtered.filter((talent) => {
        const talentLocation = talent.location?.toLowerCase() || "";
        return talentLocation.includes(locationQuery);
      });
    }

    if (activeFilters.type && activeFilters.type !== "all") {
      filtered = filtered.filter(
        (talent) =>
          talent.act.toLowerCase() === activeFilters.type.toLowerCase()
      );
    }

    return filtered;
  }, [talents, activeFilters, hasActiveFilters]);

  const clearFilters = () => {
    navigate("/");
    setTimeout(() => {
      document.getElementById("talents")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  };

  const scrollToSearch = () => {
    // Navigate to home page first if not already there
    if (window.location.pathname !== "/") {
      navigate("/");
      // Wait for navigation to complete
      setTimeout(() => {
        scrollToSearchForm();
      }, 400);
      return;
    }

    // If already on home page, scroll immediately
    scrollToSearchForm();
  };

  const scrollContainersToTop = () => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    const containers: (Window | HTMLElement | null)[] = [
      window,
      document.documentElement,
      document.body,
      document.querySelector("main") as HTMLElement | null,
      document.querySelector(".ptr") as HTMLElement | null,
      document.querySelector(".ptr__children") as HTMLElement | null,
    ];

    const scrollTop = (target: Window | HTMLElement | null) => {
      if (!target) return;
      if ("scrollTo" in target) {
        (target as Window).scrollTo({ top: 0, behavior: "smooth" });
      } else {
        (target as HTMLElement).scrollTop = 0;
      }
    };

    containers.forEach(scrollTop);
    setTimeout(() => containers.forEach(scrollTop), 150);
  };

  const scrollToSearchForm = () => {
    // Try multiple times to find the element (in case DOM isn't ready)
    const attemptScroll = (attempts = 0) => {
      const searchForm = document.getElementById("hero-search-form");

      if (searchForm) {
        const isNativeApp = Capacitor.isNativePlatform();

        // Use scrollIntoView for reliable scrolling
        searchForm.scrollIntoView({
          behavior: "smooth",
          block: "start",
          inline: "nearest",
        });

        // After scroll starts, drive every scroll container to the very top
        setTimeout(() => {
          scrollContainersToTop();
        }, 100);

        // Add highlight animation class
        searchForm.classList.add("search-form-highlight");

        // Remove highlight after animation completes
        setTimeout(() => {
          searchForm.classList.remove("search-form-highlight");
        }, 2000);
      } else if (attempts < 5) {
        // Retry if element not found (DOM might not be ready)
        setTimeout(() => attemptScroll(attempts + 1), 100);
      } else {
        // Final fallback: scroll to top
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      }
    };

    attemptScroll();
  };

  const isNativeApp = Capacitor.isNativePlatform();

  // Show "no filters" state when no filters are active
  if (!hasActiveFilters) {
    return (
      <section
        id="talents"
        className="py-20 bg-gradient-to-b from-background to-muted/30 w-full max-w-full overflow-x-hidden"
      >
        <div className="container mx-auto px-4 w-full max-w-full">
          <div className="text-center py-20">
            {/* Only show large search icon on desktop website (not mobile web, not native app) */}
            {!isNativeApp && (
              <div className="hidden md:flex w-32 h-32 bg-gradient-to-br from-accent/20 to-accent/10 rounded-full items-center justify-center mx-auto mb-8">
                <Search className="h-16 w-16 text-accent" />
              </div>
            )}
            <h2 className="text-3xl font-bold mb-4">Discover Talents</h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
              Use the search filters above to find talented performers for your
              event. Browse by location, talent type, or both to discover
              amazing artists.
            </p>
            <Button onClick={scrollToSearch} className="hero-button" size="lg">
              <Search className="h-4 w-4 mr-2" />
              Start Searching
            </Button>
          </div>
        </div>
      </section>
    );
  }

  // Loading state (only shown when filters are active)
  if (isLoading) {
    return (
      <section
        id="talents"
        className="py-20 bg-gradient-to-b from-background to-muted/30"
      >
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-accent/10 px-4 py-2 rounded-full mb-6">
              <div className="h-2 w-2 bg-accent rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-accent">
                Discovering Talents
              </span>
            </div>
            <h2 className="text-4xl font-bold mb-6">
              Loading Amazing Talent...
            </h2>
            <p className="text-muted-foreground text-lg">
              Finding the perfect performers for your event
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-muted/50 rounded-2xl h-80 backdrop-blur-sm"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Error state
  if (error) {
    return (
      <section id="talents" className="py-20">
        <div className="container mx-auto px-4 text-center">
          <p className="text-destructive mb-4">Failed to load talents</p>
          <Button
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: ["talents"] })
            }
          >
            Retry
          </Button>
        </div>
      </section>
    );
  }

  // Main content with filtered results
  return (
    <section
      id="talents"
      className="py-20 bg-gradient-to-b from-background to-muted/30 w-full max-w-full overflow-x-hidden"
    >
      <div className="container mx-auto px-4 w-full max-w-full">
        <div className="text-center mb-16 w-full max-w-full">
          <div className="inline-flex items-center gap-2 bg-accent/10 px-4 py-2 rounded-full mb-6">
            <div className="h-2 w-2 bg-accent rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-accent">
              Search Results
            </span>
          </div>
          <h2 className="text-4xl font-bold mb-6">
            {userLocation && userLocation !== "Worldwide"
              ? `Discover Talents in ${userLocation}`
              : "Discover Exceptional Talents"}
          </h2>
          {userLocation && userLocation !== "Worldwide" && (
            <p className="text-center text-muted-foreground mb-4">
              📍 Showing local talent first •{" "}
              <span className="text-xs">Change location in header</span>
            </p>
          )}
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Talented performers ready to make your event unforgettable
          </p>
        </div>

        {/* Active Filters Display */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-4 mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>Active filters:</span>
          </div>

          {activeFilters.location && activeFilters.location !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Location: {activeFilters.location}
            </Badge>
          )}

          {activeFilters.type && activeFilters.type !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Type:{" "}
              {activeFilters.type.charAt(0).toUpperCase() +
                activeFilters.type.slice(1)}
            </Badge>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3 mr-1" />
            Clear all
          </Button>
        </div>

        {filteredTalents.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-32 h-32 bg-gradient-to-br from-accent/20 to-accent/10 rounded-full flex items-center justify-center mx-auto mb-8">
              <Music className="h-16 w-16 text-accent" />
            </div>
            <h3 className="text-2xl font-bold mb-4">No talents found</h3>
            <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
              Try adjusting your search criteria to discover more amazing
              performers
            </p>
            <Button onClick={clearFilters} className="hero-button">
              Clear Filters & Try Again
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
            {filteredTalents.map((talent, index) => (
              <div
                key={talent.id}
                className="animate-fadeIn w-full max-w-full"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <TalentCard talent={talent} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
