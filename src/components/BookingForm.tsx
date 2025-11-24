// FILE: src/components/BookingForm.tsx
// REVERTED TO SHADCN COMPONENTS

import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEmailNotifications } from "@/hooks/useEmailNotifications";
import { LocationSelector } from "@/components/LocationSelector";
import { useLocationDetection } from "@/hooks/useLocationDetection";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getCountryCode } from "@/lib/country-code-utils";
import { useAutoScrollOnInput } from "@/hooks/useAutoScrollOnInput";
import { Capacitor } from "@capacitor/core";

import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

interface BookingFormProps {
  talentId: string;
  talentName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function BookingForm({
  talentId,
  talentName,
  onClose,
  onSuccess,
}: BookingFormProps) {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { sendBookingEmails } = useEmailNotifications();
  const navigate = useNavigate();

  // Use location detection hook for consistent location handling
  const { userLocation, detectedLocation } = useLocationDetection();

  // Refs for auto-scroll functionality
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Auto-scroll when inputs are focused - enabled for Capacitor native apps
  useAutoScrollOnInput({
    submitButtonRef: submitButtonRef,
    formRef: formRef,
    enabled: Capacitor.isNativePlatform(),
    scrollDelay: Capacitor.isNativePlatform() ? 400 : 300,
    bottomOffset: Capacitor.isNativePlatform() ? 120 : 100,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookerName, setBookerName] = useState(user?.user_metadata?.name || "");
  const [bookerPhone, setBookerPhone] = useState<string | undefined>();
  const [eventDate, setEventDate] = useState<Date>();
  const [eventDuration, setEventDuration] = useState("");
  const [eventAddress, setEventAddress] = useState("");
  const [eventType, setEventType] = useState("");
  const [description, setDescription] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Local state for manually selected location - overrides detection
  const [selectedLocation, setSelectedLocation] = useState<string>("");

  const eventTypes = [
    "wedding",
    "birthday",
    "corporate",
    "opening",
    "club",
    "school",
    "festival",
    "private party",
    "other",
  ];

  // Prioritize manually selected location over auto-detected
  const currentLocation =
    selectedLocation || userLocation || detectedLocation || "Worldwide";

  const handleLocationChange = (location: string) => {
    setSelectedLocation(location);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to book talent.",
        variant: "destructive",
      });
      return;
    }
    if (
      !bookerName ||
      !eventDate ||
      !currentLocation ||
      currentLocation === "Worldwide" ||
      !eventType ||
      !eventDuration
    ) {
      toast({
        title: "Missing Information",
        description:
          "Please fill out all required fields and select a specific location.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const bookingData = {
        user_id: user.id,
        talent_id: talentId,
        booker_name: bookerName,
        booker_email: user.email,
        booker_phone: bookerPhone,
        event_date: format(eventDate, "yyyy-MM-dd"),
        event_duration: parseInt(eventDuration, 10),
        event_location: currentLocation, // Use standardized country name
        event_address: eventAddress, // Store venue address separately
        event_type: eventType,
        description: eventAddress
          ? `${description}\n\nVenue: ${eventAddress}`
          : description,
        status: "pending",
      };

      const { data, error } = await supabase
        .from("bookings")
        .insert(bookingData)
        .select()
        .single();
      if (error) throw error;

      await sendBookingEmails({ ...data, talent_name: talentName });

      try {
        // 1. GET THE TALENT'S USER_ID (THE FIX)
        const { data: profile, error: profileError } = await supabase
          .from("talent_profiles")
          .select("user_id") // Get the 'user_id' column
          .eq("id", talentId) // Where the profile ID matches the talentId
          .single();

        if (profileError) {
          throw new Error(
            `Could not find talent profile: ${profileError.message}`
          );
        }

        const talentUserId = profile.user_id; // This is the ID we need

        // 2. NOW CALL THE FUNCTION WITH THE *CORRECT* ID
        const { error: functionError } = await supabase.functions.invoke(
          "send-push-notification",
          {
            body: {
              userId: talentUserId, // 👈 USE THE CORRECT ID
              title: "New Booking Request!",
              body: `You have a new request from ${bookerName}.`,
              url: `/talent-dashboard?bookingId=${data.id}`,
              bookingId: data.id,
            },
          }
        );

        if (functionError) {
          console.error("Failed to send push notification:", functionError);
        } else {
        }
      } catch (e) {
        if (e instanceof Error) {
          console.error(
            "Error invoking push notification function:",
            e.message
          );
        } else {
          console.error("Error invoking push notification function:", e);
        }
      }

      toast({ title: "Booking Submitted!" });
      onSuccess();
      onClose();
    } catch (err) {
      if (err instanceof Error) {
        toast({
          title: "Booking Failed",
          description: err.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Booking Failed",
          description: "An unknown error occurred.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book {talentName}</DialogTitle>
          <DialogDescription>
            Fill out the form below to request a booking.
          </DialogDescription>
        </DialogHeader>

        {authLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : !user ? (
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">Authentication Required</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Please sign in or create an account to book this talent.
              </p>
              <Button
                onClick={() => navigate("/auth?mode=booker&intent=booking")}
                className="w-full"
              >
                Sign In / Sign Up
              </Button>
            </div>
          </div>
        ) : (
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bookerName">Your Name *</Label>
              <Input
                id="bookerName"
                value={bookerName}
                onChange={(e) => setBookerName(e.target.value)}
                placeholder="Enter your name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bookerPhone">Phone Number</Label>
              <div className="phone-input-wrapper">
                <PhoneInput
                  placeholder="Enter phone number"
                  value={bookerPhone}
                  onChange={setBookerPhone}
                  defaultCountry={getCountryCode(currentLocation) as any}
                  international
                  className="phone-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="eventType">Event Type *</Label>
              <Select 
                value={eventType} 
                onValueChange={(value) => {
                  setEventType(value);
                  // Auto-close handled by Select component
                }}
              >
                <SelectTrigger id="eventType">
                  <SelectValue placeholder="Select an event type" />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Event Date *</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !eventDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {eventDate ? format(eventDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={eventDate}
                    onSelect={(date) => {
                      setEventDate(date);
                      setCalendarOpen(false); // Auto-close on selection
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Event Location *</Label>
              <LocationSelector onLocationChange={handleLocationChange} />
              <p className="text-sm text-muted-foreground">
                Selected: {currentLocation === "Worldwide" ? "Please select a country" : currentLocation}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="eventAddress">Venue Address (Optional)</Label>
              <Input
                id="eventAddress"
                value={eventAddress}
                onChange={(e) => setEventAddress(e.target.value)}
                placeholder="Enter specific venue name or address"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="eventDuration">Event Duration (hours) *</Label>
              <Input
                id="eventDuration"
                type="number"
                value={eventDuration}
                onChange={(e) => setEventDuration(e.target.value)}
                placeholder="e.g., 3"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Event Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell us more about your event..."
                rows={4}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? "Submitting..." : "Send Booking Request"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
