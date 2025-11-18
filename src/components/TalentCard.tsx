import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Music, Mic, User } from "lucide-react";
import { ProBadge } from "@/components/ProBadge";
import { cn } from "@/lib/utils";

export interface TalentCardTalent {
  id: string;
  artist_name: string;
  act: string;
  location?: string;
  music_genres?: string[];
  custom_genre?: string;
  picture_url?: string;
  rate_per_hour?: number;
  currency?: string;
  is_pro_subscriber?: boolean;
}

interface TalentCardProps {
  talent: TalentCardTalent;
  showViewButton?: boolean;
  className?: string;
  onViewProfile?: () => void;
}

export function TalentCard({
  talent,
  className,
  showViewButton = true,
  onViewProfile,
}: TalentCardProps) {
  const navigate = useNavigate();

  const handleProfileClick = () => {
    navigate(`/talent/${talent.id}`);
  };

  const getActIcon = (act: string) => {
    switch (act.toLowerCase()) {
      case "dj":
      case "band":
      case "saxophonist":
      case "keyboardist":
      case "drummer":
      case "percussionist":
        return <Music className="h-4 w-4" />;
      case "singer":
        return <Mic className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const formatAct = (act: string) => {
    if (act.toLowerCase() === "dj") return "DJ";
    return act.charAt(0).toUpperCase() + act.slice(1);
  };

  const getCurrencySymbol = (currency?: string) => {
    if (!currency) return "";
    const symbols: Record<string, string> = {
      USD: "$",
      EUR: "€",
      GBP: "£",
      AED: "د.إ",
      SAR: "ر.س",
      QAR: "ر.ق",
      KWD: "د.ك",
      BHD: ".د.ب",
      OMR: "ر.ع.",
      JOD: "د.ا",
      LBP: "ل.ل",
      EGP: "ج.م",
    };
    return symbols[currency] || currency;
  };

  return (
    <Card
      className={cn(
        "group overflow-hidden bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl shadow-card hover:shadow-elevated transition-all duration-500 hover:scale-[1.02] hover:border-accent/30 cursor-pointer flex flex-col h-full",
        className
      )}
      onClick={handleProfileClick}
    >
      <div className="relative">
        <div className="aspect-[4/3] overflow-hidden bg-gradient-to-br from-muted/50 to-muted">
          <img
            src={talent.picture_url || "/placeholder.svg"}
            alt={talent.artist_name}
            className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </div>

        <div className="absolute top-4 left-4 flex items-center space-x-2 bg-black/70 backdrop-blur-sm rounded-full px-3 py-1.5 text-white">
          {getActIcon(talent.act)}
          <Badge variant="outline" className="text-xs font-bold bg-primary/10 border-primary/30 text-primary">
            {formatAct(talent.act)}
          </Badge>
        </div>

        {showViewButton && (
          <div className="absolute inset-x-4 bottom-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
            <Button
              size="sm"
              className="w-full bg-white/90 hover:bg-white text-black font-medium backdrop-blur-sm"
              onClick={(e) => {
                e.stopPropagation();
                onViewProfile ? onViewProfile() : handleProfileClick();
              }}
            >
              View Profile
            </Button>
          </div>
        )}
      </div>

      <div className="p-6 space-y-4 flex-1 flex flex-col">
        <div>
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-bold text-lg text-foreground group-hover:text-accent transition-colors duration-300 line-clamp-2 pr-2">
              {talent.artist_name}
            </h3>
            {talent.is_pro_subscriber && <ProBadge size="sm" className="ml-2 flex-shrink-0" />}
          </div>
          <div className="flex items-center space-x-2 text-muted-foreground">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm truncate">{talent.location || "Location TBD"}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {talent.music_genres &&
            talent.music_genres.slice(0, 3).map((genre) => (
              <Badge key={genre} variant="secondary" className="text-xs font-medium">
                {genre}
              </Badge>
            ))}
          {talent.custom_genre && (
            <Badge variant="secondary" className="text-xs font-medium">
              {talent.custom_genre}
            </Badge>
          )}
          {talent.music_genres && talent.music_genres.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{talent.music_genres.length - 3} more
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/50 mt-auto">
          {!talent.is_pro_subscriber && (
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded-full">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-400">New</span>
              </div>
            </div>
          )}

          <div className="text-right min-w-[110px]">
            {talent.rate_per_hour ? (
              <>
                <div className="text-lg font-bold text-accent">
                  {getCurrencySymbol(talent.currency)}
                  {talent.rate_per_hour}
                </div>
                <div className="text-xs text-muted-foreground">per hour</div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">Contact for rates</div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

