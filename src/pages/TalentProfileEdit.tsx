// FILE: src/pages/TalentProfileEdit.tsx

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { countries, musicGenres, actTypes } from "@/lib/countries";
import { SimpleGalleryUpload } from "@/components/SimpleGalleryUpload";
import { SimpleAvatarUpload } from "@/components/SimpleAvatarUpload";
import {
  User,
  Save,
  ArrowLeft,
  Camera,
  Plus,
  X,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { ProFeatureWrapper } from "@/components/ProFeatureWrapper";
import { useProStatus } from "@/contexts/ProStatusContext";
import { useProfileSave } from "@/hooks/useProfileSave";
import { Header } from "@/components/Header";
import { Capacitor } from "@capacitor/core";
import { cn } from "@/lib/utils";

interface TalentProfile {
  id: string;
  artist_name: string;
  act: string;
  gender: string;
  age: string;
  location?: string;
  rate_per_hour?: number;
  currency: string;
  music_genres: string[];
  custom_genre?: string;
  picture_url?: string;
  gallery_images?: string[];
  soundcloud_link?: string;
  youtube_link?: string;
  biography: string;
  nationality: string;
  created_at: string;
  is_pro_subscriber?: boolean;
  subscription_started_at?: string;
}

const TalentProfileEdit = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isProUser, refreshProStatus } = useProStatus();
  const { saving, saveProfile } = useProfileSave();

  const [profile, setProfile] = useState<TalentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [customGenre, setCustomGenre] = useState("");
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaveStatus, setLastSaveStatus] = useState<
    "success" | "error" | null
  >(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchTalentProfile = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("talent_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
        return;
      }

      if (!data) {
        navigate("/talent-onboarding");
        return;
      }

      setProfile(data);
      setSelectedGenres(data.music_genres || []);
      setCustomGenre(data.custom_genre || "");
      setGalleryImages(data.gallery_images || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    // Refresh Pro status when page loads (ensures up-to-date status after payment)
    refreshProStatus();
    fetchTalentProfile();
  }, [user, navigate, fetchTalentProfile, refreshProStatus]);

  // Helper: append or replace a 't' timestamp query param to bust caches
  const appendCacheBuster = (url: string) => {
    try {
      const u = new URL(url);
      u.searchParams.set("t", String(Date.now()));
      return u.toString();
    } catch (err) {
      // Fallback for non-standard URLs — append or add
      return url.includes("?")
        ? `${url}&t=${Date.now()}`
        : `${url}?t=${Date.now()}`;
    }
  };

  const handleAvatarImageChange = (imageUrl: string | null) => {
    // Called by SimpleAvatarUpload when it provides a new image URL (if used)
    if (!profile) return;
    if (!imageUrl) {
      setProfile({ ...profile, picture_url: undefined });
      setHasUnsavedChanges(true);
      return;
    }
    const newUrl = appendCacheBuster(imageUrl);
    setProfile({ ...profile, picture_url: newUrl });
    // Mark unsaved — this allows user to explicitly save other profile fields if needed
    setHasUnsavedChanges(true);
  };

  const handleAvatarFileChange = async (file: File | null) => {
    if (!file || !user || !profile) return;

    setUploadingImage(true);

    try {
      const fileName = `${user.id}/profile.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("talent-pictures")
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from("talent-pictures")
        .getPublicUrl(fileName);

      const publicUrl = urlData?.publicUrl || "";
      // Add cache buster so browser fetches the fresh image immediately
      const newUrl = appendCacheBuster(publicUrl);

      const { error: updateError } = await supabase
        .from("talent_profiles")
        .update({ picture_url: newUrl })
        .eq("id", profile.id);

      if (updateError) {
        throw updateError;
      }

      // Update local state immediately with the cache-busted URL
      setProfile({ ...profile, picture_url: newUrl });
      // After a direct upload we can consider the picture saved — clear unsaved flag
      setHasUnsavedChanges(false);

      toast({
        title: "Success",
        description: "Profile picture updated successfully!",
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Error",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleGenreToggle = useCallback((genre: string) => {
    setSelectedGenres((prev) => {
      const newGenres = prev.includes(genre)
        ? prev.filter((g) => g !== genre)
        : [...prev, genre];
      setHasUnsavedChanges(true);
      setLastSaveStatus(null);
      return newGenres;
    });
  }, []);

  const handleFieldChange = useCallback(
    (field: string, value: string | number | undefined) => {
      if (!profile) return;

      setProfile((prev) => (prev ? { ...prev, [field]: value } : null));
      setHasUnsavedChanges(true);
      setLastSaveStatus(null);
    },
    [profile]
  );

  const saveChanges = useCallback(
    async (
      specificUpdates?: Record<
        string,
        string | number | string[] | null | undefined
      >
    ) => {
      if (!profile) return;

      // Validate and normalize act type to ensure it matches database enum
      let normalizedAct = profile.act;
      if (profile.act) {
        // Convert to lowercase and ensure it matches expected format
        const actLower = profile.act.toLowerCase().trim();
        // Map frontend act types to database enum values
        const actTypeMap: Record<string, string> = {
          "solo artist": "solo artist",
          band: "band",
          dj: "dj",
          producer: "producer",
          vocalist: "vocalist",
          instrumentalist: "instrumentalist",
          songwriter: "songwriter",
          composer: "composer",
          "sound engineer": "sound engineer",
          "music teacher": "music teacher",
          // Legacy values that might still exist
          saxophonist: "saxophonist",
          percussionist: "percussionist",
          singer: "singer",
          keyboardist: "keyboardist",
          drummer: "drummer",
        };

        if (actTypeMap[actLower]) {
          normalizedAct = actTypeMap[actLower];
        } else {
          console.warn(
            `Unknown act type: ${profile.act}, keeping original value`
          );
        }
      }

      const updates = specificUpdates || {
        act: normalizedAct,
        location: profile.location,
        nationality: profile.nationality,
        music_genres: [
          ...selectedGenres,
          ...(customGenre.trim() ? [customGenre.trim()] : []),
        ],
        custom_genre: customGenre.trim() || null,
        gallery_images: galleryImages,
        soundcloud_link: profile.soundcloud_link,
        youtube_link: profile.youtube_link,
        biography: profile.biography,
        rate_per_hour: profile.rate_per_hour,
      };

      await saveProfile({
        profileId: profile.id,
        updates,
        onSuccess: () => {
          setHasUnsavedChanges(false);
          setLastSaveStatus("success");
          // Only show toast for manual saves, not auto-saves
          if (!isAutoSaving) {
            toast({
              title: "Success",
              description: "Profile updated successfully!",
            });
          }
        },
        onError: () => {
          setLastSaveStatus("error");
        },
      });
    },
    [
      profile,
      selectedGenres,
      customGenre,
      galleryImages,
      saveProfile,
      toast,
      isAutoSaving,
    ]
  );

  // Auto-save effect: debounced save when there are unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges || !profile || saving) return;

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Set new timer for auto-save (1.5 seconds after last change)
    autoSaveTimerRef.current = setTimeout(async () => {
      setIsAutoSaving(true);
      try {
        await saveChanges();
      } catch (error) {
        console.error("Auto-save error:", error);
      } finally {
        setIsAutoSaving(false);
      }
    }, 1500); // 1.5 second debounce

    // Cleanup timer on unmount or when dependencies change
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [
    hasUnsavedChanges,
    profile,
    selectedGenres,
    customGenre,
    galleryImages,
    saving,
    saveChanges,
  ]);

  const handleGalleryChange = useCallback(
    async (newImages: string[]) => {
      setGalleryImages(newImages);
      setHasUnsavedChanges(true);

      // Auto-save gallery for Pro users only
      if (isProUser && profile) {
        await saveChanges({ gallery_images: newImages });
      }
    },
    [isProUser, profile, saveChanges]
  );

  const handleSaveProfile = async () => {
    await saveChanges();
    if (!saving) {
      // Only navigate if save was successful
      navigate("/talent-dashboard");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Profile not found</h1>
          <Button onClick={() => navigate("/talent-onboarding")}>
            Complete Your Profile
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Add Header component */}
      <Header />

      {/* Fix: Add proper padding-top for Capacitor to account for fixed header */}
      <div
        className={cn(
          "container mx-auto",
          Capacitor.isNativePlatform() ? "px-4 pt-20 pb-4" : "px-4 py-8"
        )}
      >
        {/* Back to Home Button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className={cn("mb-4", Capacitor.isNativePlatform() && "h-10 text-sm")}
        >
          <ArrowLeft
            className={cn(
              "mr-2",
              Capacitor.isNativePlatform() ? "h-4 w-4" : "h-4 w-4"
            )}
          />
          Back to Home
        </Button>
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
          <div>
            <h1
              className={cn(
                "font-bold gradient-text",
                Capacitor.isNativePlatform()
                  ? "text-lg"
                  : "text-2xl lg:text-3xl"
              )}
            >
              Edit Profile
            </h1>
            <p
              className={cn(
                "text-muted-foreground",
                Capacitor.isNativePlatform() ? "text-xs" : ""
              )}
            >
              Update your talent profile information
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {!Capacitor.isNativePlatform() && (
              <Button
                variant="outline"
                onClick={() => navigate("/talent-dashboard")}
                className="flex-shrink-0"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            )}

            {hasUnsavedChanges ? (
              <Button
                onClick={handleSaveProfile}
                disabled={saving || isAutoSaving}
                className={cn(
                  "flex-shrink-0 hero-button",
                  Capacitor.isNativePlatform() && "h-10 text-sm"
                )}
                variant="default"
              >
                {saving || isAutoSaving ? (
                  <>
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    {isAutoSaving ? "Auto-saving..." : "Saving..."}
                  </>
                ) : lastSaveStatus === "success" ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Saved
                  </>
                ) : lastSaveStatus === "error" ? (
                  <>
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Try Again
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            ) : (
              <span className="text-muted-foreground text-sm flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                {isAutoSaving ? "Auto-saving..." : "All Saved"}
              </span>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Profile Picture Card */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Camera className="h-5 w-5 mr-2" />
                Profile Picture
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SimpleAvatarUpload
                currentImage={profile.picture_url}
                onImageChange={handleAvatarImageChange}
                onFileChange={handleAvatarFileChange}
                disabled={uploadingImage}
              />
            </CardContent>
          </Card>

          {/* Photo Gallery Card */}
          <Card className="glass-card md:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Camera className="h-5 w-5 mr-2" />
                Photo Gallery
              </CardTitle>
              <CardDescription>
                Upload up to 5 additional photos to showcase your talent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProFeatureWrapper
                isProFeature={true}
                featureType="images"
                showProIcon={true}
              >
                <SimpleGalleryUpload
                  currentImages={galleryImages}
                  onImagesChange={handleGalleryChange}
                  maxImages={5}
                  disabled={false}
                />
              </ProFeatureWrapper>
            </CardContent>
          </Card>

          {/* Profile Info Card */}
          <Card className="glass-card md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Artist Name</Label>
                  <div className="p-2 bg-muted rounded">
                    {profile.artist_name}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">
                    Act Type (Talent Type)
                  </Label>
                  <Select
                    value={profile.act}
                    onValueChange={(value) => {
                      // Ensure the value is properly set - use the value as-is from SelectItem
                      handleFieldChange("act", value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your talent type" />
                    </SelectTrigger>
                    <SelectContent>
                      {actTypes.map((act) => (
                        <SelectItem key={act} value={act.toLowerCase()}>
                          {act}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Changes are saved automatically
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">
                    Talent Location (Where you're available)
                  </Label>
                  <Select
                    value={profile.location || ""}
                    onValueChange={(value) =>
                      handleFieldChange("location", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country.code} value={country.name}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium">Nationality</Label>
                  <Select
                    value={profile.nationality}
                    onValueChange={(value) =>
                      handleFieldChange("nationality", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country.code} value={country.name}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Rate per Hour</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Enter your rate"
                    value={profile.rate_per_hour || ""}
                    onChange={(e) =>
                      handleFieldChange(
                        "rate_per_hour",
                        parseFloat(e.target.value) || undefined
                      )
                    }
                  />
                  <Select
                    value={profile.currency}
                    onValueChange={(value) =>
                      handleFieldChange("currency", value)
                    }
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="AED">AED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium mb-3 block">
                  Music Genres
                </Label>
                <div className="space-y-4">
                  <div
                    className={cn(
                      "flex flex-wrap gap-2 sm:gap-3",
                      Capacitor.isNativePlatform() && "gap-2"
                    )}
                  >
                    {musicGenres.map((genre) => (
                      <button
                        key={genre}
                        type="button"
                        className={cn(
                          "genre-bubble",
                          selectedGenres.includes(genre) ? "selected" : "",
                          Capacitor.isNativePlatform() ? "text-xs" : "text-sm"
                        )}
                        onClick={() => handleGenreToggle(genre)}
                      >
                        {genre}
                      </button>
                    ))}
                  </div>

                  <div>
                    <Label className="text-xs font-medium">Custom Genre</Label>
                    <Input
                      placeholder="Add your own genre"
                      value={customGenre}
                      onChange={(e) => {
                        setCustomGenre(e.target.value);
                        setHasUnsavedChanges(true);
                        setLastSaveStatus(null);
                      }}
                    />
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {selectedGenres.map((genre) => (
                      <Badge
                        key={genre}
                        variant="secondary"
                        className="text-xs"
                      >
                        {genre}
                        <button
                          type="button"
                          onClick={() => handleGenreToggle(genre)}
                          className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                        >
                          <X className="h-2 w-2" />
                        </button>
                      </Badge>
                    ))}
                    {customGenre && (
                      <Badge variant="secondary" className="text-xs">
                        {customGenre}
                        <button
                          type="button"
                          onClick={() => setCustomGenre("")}
                          className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                        >
                          <X className="h-2 w-2" />
                        </button>
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Biography</Label>
                <Textarea
                  placeholder="Tell us about yourself and your talent..."
                  value={profile.biography}
                  onChange={(e) =>
                    handleFieldChange("biography", e.target.value)
                  }
                  rows={4}
                />
              </div>

              <ProFeatureWrapper
                isProFeature={true}
                featureType="links"
                showProIcon={true}
              >
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">
                      SoundCloud Link
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Add a link to your DJ mix set or music track (not your
                      profile page). Example: soundcloud.com/artist/track-name
                    </p>
                    <Input
                      placeholder="https://soundcloud.com/artist/your-mix-set"
                      value={profile.soundcloud_link || ""}
                      onChange={(e) =>
                        handleFieldChange("soundcloud_link", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">
                      YouTube Video Link
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Add a link to a specific video performance (not your
                      channel page). Example: youtube.com/watch?v=VIDEO_ID
                    </p>
                    <Input
                      placeholder="https://youtube.com/watch?v=VIDEO_ID"
                      value={profile.youtube_link || ""}
                      onChange={(e) =>
                        handleFieldChange("youtube_link", e.target.value)
                      }
                    />
                  </div>
                </div>
              </ProFeatureWrapper>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TalentProfileEdit;
