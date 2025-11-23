// FILE: src/components/EventRequestForm.tsx
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LocationSelector } from "@/components/LocationSelector";
import { useLocationDetection } from "@/hooks/useLocationDetection";
import { cn } from "@/lib/utils";
import { getCountryCode } from "@/lib/country-code-utils";
import { useAutoScrollOnInput } from "@/hooks/useAutoScrollOnInput";
import { Capacitor } from "@capacitor/core";

import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

export function EventRequestForm() {
  const { user } = useAuth();
  const { toast } = useToast();
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
  const [eventAddress, setEventAddress] = useState(""); // Separate field for venue address
  const [eventType, setEventType] = useState("");
  const [description, setDescription] = useState("");
  const [talentTypeNeeded, setTalentTypeNeeded] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Local state for selected location to override detected location
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
  // Talent types matching TalentOnboarding form (ACTS) + additional common types from HeroSection
  // Using lowercase values to match database format, but displaying with proper capitalization
  const talentTypes = [
    { value: "dj", label: "DJ" },
    { value: "band", label: "Band" },
    { value: "singer", label: "Singer" },
    { value: "saxophonist", label: "Saxophonist" },
    { value: "keyboardist", label: "Keyboardist" },
    { value: "drummer", label: "Drummer" },
    { value: "percussionist", label: "Percussionist" },
    { value: "guitarist", label: "Guitarist" },
    { value: "violinist", label: "Violinist" },
    { value: "pianist", label: "Pianist" },
    { value: "magician", label: "Magician" },
    { value: "gogo_dancer", label: "Gogo Dancer" },
    { value: "belly_dancer", label: "Belly Dancer" },
    { value: "other", label: "Other" },
  ];

  // Get current location for form validation and submission - prioritize manually selected location
  const currentLocation =
    selectedLocation || userLocation || detectedLocation || "Worldwide";

  const handleLocationChange = (location: string) => {
    setSelectedLocation(location);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) {
      toast({ title: "Authentication Required", variant: "destructive" });
      navigate("/auth", { state: { intent: "event-form", mode: "booker" } });
      return;
    }

    if (
      !bookerName ||
      !eventDate ||
      !currentLocation ||
      currentLocation === "Worldwide" ||
      !eventType ||
      !eventDuration ||
      !talentTypeNeeded
    ) {
      toast({
        title: "Missing Information",
        description:
          "Please fill out all required fields, including location and talent type.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: newRequest, error } = await supabase
        .from("event_requests")
        .insert({
          user_id: user.id,
          booker_email: user.email,
          booker_name: bookerName,
          booker_phone: bookerPhone,
          event_date: format(eventDate, "yyyy-MM-dd"),
          event_duration: parseInt(eventDuration, 10),
          event_location: currentLocation,
          event_type: eventType,
          description: eventAddress
            ? `${description}\n\nVenue: ${eventAddress}`
            : description,
          talent_type_needed: talentTypeNeeded.toLowerCase(),
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      toast({ title: "Request Submitted!" });
      navigate("/booker-dashboard");

      //
      // ▼▼▼ THIS IS THE FIX ▼▼▼
      // This is the new, correct, 2-step query
      //
      try {
        console.log("Form submitted. Now finding matching talents...");
        const lowerCaseAct = talentTypeNeeded.toLowerCase();

        // 1. Find all matching talent USER IDs from 'talent_profiles'
        const { data: matchingTalents, error: talentError } = await supabase
          .from("talent_profiles")
          .select("user_id") // 👈 Get the user_id
          .eq("act", lowerCaseAct)
          .eq("location", currentLocation);

        if (talentError) {
          console.error("Error finding talents:", talentError);
          throw new Error(`Error finding talents: ${talentError.message}`);
        }

        if (!matchingTalents || matchingTalents.length === 0) {
          console.log("No matching talents found for this event request.");
          return; // This is not an error, just no one to notify
        }

        // 2. Get the push tokens for those user IDs from 'profiles'
        const matchingUserIds = matchingTalents.map((t) => t.user_id);

        const { data: tokenData, error: tokenError } = await supabase
          .from("profiles")
          .select("id, push_token") // 'id' here IS the user_id
          .in("id", matchingUserIds) // 👈 Get all profiles for these IDs
          .not("push_token", "is", null); // 👈 Only those with a token

        if (tokenError) {
          console.error("Error fetching tokens:", tokenError);
          throw new Error(`Error fetching tokens: ${tokenError.message}`);
        }

        if (!tokenData || tokenData.length === 0) {
          console.log("Matching talents found, but none have push tokens.");
          return; // Not an error
        }

        console.log(
          `Found ${tokenData.length} matching talents with tokens. Sending notifications...`
        );

        // 3. Loop through each matching talent and send them a notification
        // Get the display label for the talent type
        const talentTypeLabel =
          talentTypes.find((t) => t.value === talentTypeNeeded)?.label ||
          talentTypeNeeded;

        for (const talent of tokenData) {
          const recipientUserId = talent.id;

          console.log(
            `Sending notification to talent user_id: ${recipientUserId}`
          );

          const { error: functionError } = await supabase.functions.invoke(
            "send-push-notification",
            {
              body: {
                userId: recipientUserId,
                title: "New Event Request!",
                body: `A new event request matches your profile: ${talentTypeLabel} in ${currentLocation}.`,
                url: `/talent-dashboard?eventRequestId=${newRequest.id}`,
                bookingId: newRequest.id,
                eventRequestId: newRequest.id,
              },
            }
          );

          if (functionError) {
            console.error(
              `Failed to send push notification to ${recipientUserId}:`,
              functionError
            );
          } else {
            console.log(
              `Push notification sent successfully to ${recipientUserId}`
            );
          }
        }
      } catch (e) {
        if (e instanceof Error) {
          // This only catches errors from the notification part
          // The user's form is already safely submitted.
          console.error("Error sending push notifications:", e.message);
        } else {
          console.error(
            "An unknown error occurred while sending notifications:",
            e
          );
        }
      }
      //
      // ▲▲▲ END OF NEW NOTIFICATION CODE ▲▲▲
      //
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast({
          title: "Submission Failed",
          description: err.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Submission Failed",
          description: "An unknown error occurred.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
          Selected:{" "}
          {currentLocation === "Worldwide"
            ? "Please select a country"
            : currentLocation}
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
        <Label htmlFor="talentTypeNeeded">Talent Type Needed *</Label>
        <Select
          value={talentTypeNeeded}
          onValueChange={(value) => {
            setTalentTypeNeeded(value);
            // Auto-close handled by Select component
          }}
        >
          <SelectTrigger id="talentTypeNeeded">
            <SelectValue placeholder="What kind of talent?" />
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

      <Button
        ref={submitButtonRef}
        type="submit"
        disabled={isSubmitting}
        className="w-full"
      >
        {isSubmitting ? "Submitting..." : "Send Event Request"}
      </Button>
    </form>
  );
}
