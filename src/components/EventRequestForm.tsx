// FILE: src/components/EventRequestForm.tsx
// Mobile-optimized with full-screen pickers for Capacitor

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
import { CalendarIcon, ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LocationSelector } from "@/components/LocationSelector";
import { useLocationDetection } from "@/hooks/useLocationDetection";
import { cn } from "@/lib/utils";
import { getCountryCode } from "@/lib/country-code-utils";
import { useAutoScrollOnInput } from "@/hooks/useAutoScrollOnInput";
import { Capacitor } from "@capacitor/core";
import { TALENT_ACT_OPTIONS } from "@/constants/talentActs";

// Mobile components
import {
  MobileSelect,
  MobileDatePicker,
  MobileLocationPicker,
  MobileInput,
  MobileTextarea,
  MobileFormField,
} from "@/components/mobile";

import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

// Moved constants outside component to prevent recreation
const EVENT_TYPES = [
  { value: "wedding", label: "Wedding" },
  { value: "birthday", label: "Birthday" },
  { value: "corporate", label: "Corporate" },
  { value: "opening", label: "Opening" },
  { value: "club", label: "Club" },
  { value: "school", label: "School" },
  { value: "festival", label: "Festival" },
  { value: "private party", label: "Private Party" },
  { value: "other", label: "Other" },
];

// Convert TALENT_ACT_OPTIONS to MobileSelect format
const TALENT_TYPE_OPTIONS = TALENT_ACT_OPTIONS.map((opt) => ({
  value: opt.value,
  label: opt.label,
}));

// Props interface for form fields
interface EventFormFieldsProps {
  bookerName: string;
  setBookerName: (value: string) => void;
  bookerPhone: string | undefined;
  setBookerPhone: (value: string | undefined) => void;
  eventType: string;
  setEventType: (value: string) => void;
  eventDate: Date | undefined;
  setEventDate: (date: Date | undefined) => void;
  calendarOpen: boolean;
  setCalendarOpen: (open: boolean) => void;
  currentLocation: string;
  onLocationChange: (location: string) => void;
  eventAddress: string;
  setEventAddress: (value: string) => void;
  eventDuration: string;
  setEventDuration: (value: string) => void;
  talentTypeNeeded: string;
  setTalentTypeNeeded: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
}

// Web form fields component (uses shadcn/Radix components)
const WebEventFormFields = ({
  bookerName,
  setBookerName,
  bookerPhone,
  setBookerPhone,
  eventType,
  setEventType,
  eventDate,
  setEventDate,
  calendarOpen,
  setCalendarOpen,
  currentLocation,
  onLocationChange,
  eventAddress,
  setEventAddress,
  eventDuration,
  setEventDuration,
  talentTypeNeeded,
  setTalentTypeNeeded,
  description,
  setDescription,
}: EventFormFieldsProps) => {
  return (
    <div className="space-y-4">
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
            defaultCountry={getCountryCode(currentLocation) as never}
            international
            className="phone-input"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="eventType">Event Type *</Label>
        <Select value={eventType} onValueChange={setEventType}>
          <SelectTrigger id="eventType">
            <SelectValue placeholder="Select an event type" />
          </SelectTrigger>
          <SelectContent>
            {EVENT_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
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
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={eventDate}
              onSelect={(date) => {
                setEventDate(date);
                setCalendarOpen(false);
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label>Event Location *</Label>
        <LocationSelector onLocationChange={onLocationChange} />
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
        <Select value={talentTypeNeeded} onValueChange={setTalentTypeNeeded}>
          <SelectTrigger id="talentTypeNeeded">
            <SelectValue placeholder="What kind of talent?" />
          </SelectTrigger>
          <SelectContent>
            {TALENT_ACT_OPTIONS.map((type) => (
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
    </div>
  );
};

// Mobile form fields component (uses full-screen pickers)
const MobileEventFormFields = ({
  bookerName,
  setBookerName,
  bookerPhone,
  setBookerPhone,
  eventType,
  setEventType,
  eventDate,
  setEventDate,
  currentLocation,
  onLocationChange,
  eventAddress,
  setEventAddress,
  eventDuration,
  setEventDuration,
  talentTypeNeeded,
  setTalentTypeNeeded,
  description,
  setDescription,
}: Omit<EventFormFieldsProps, "calendarOpen" | "setCalendarOpen">) => {
  return (
    <div>
      {/* Name */}
      <MobileFormField label="Your Name" required>
        <MobileInput
          id="bookerName"
          value={bookerName}
          onChange={(e) => setBookerName(e.target.value)}
          placeholder="Enter your name"
          required
        />
      </MobileFormField>

      {/* Phone */}
      <MobileFormField label="Phone Number">
        <div className="phone-input-wrapper-mobile">
          <PhoneInput
            placeholder="Enter phone number"
            value={bookerPhone}
            onChange={setBookerPhone}
            defaultCountry={getCountryCode(currentLocation) as never}
            international
            className="phone-input-mobile"
          />
        </div>
      </MobileFormField>

      {/* Event Type */}
      <MobileFormField label="Event Type" required>
        <MobileSelect
          value={eventType}
          options={EVENT_TYPES}
          onValueChange={setEventType}
          placeholder="Select an event type"
          label="Event Type"
        />
      </MobileFormField>

      {/* Event Date */}
      <MobileFormField label="Event Date" required>
        <MobileDatePicker
          value={eventDate}
          onChange={setEventDate}
          placeholder="Pick a date"
          label="Select Event Date"
        />
      </MobileFormField>

      {/* Location */}
      <MobileFormField label="Event Location" required>
        <MobileLocationPicker
          onLocationChange={onLocationChange}
          currentLocation={currentLocation}
        />
      </MobileFormField>

      {/* Venue Address */}
      <MobileFormField label="Venue Address (Optional)">
        <MobileInput
          id="eventAddress"
          value={eventAddress}
          onChange={(e) => setEventAddress(e.target.value)}
          placeholder="Enter specific venue name or address"
        />
      </MobileFormField>

      {/* Duration */}
      <MobileFormField label="Event Duration (hours)" required>
        <MobileInput
          id="eventDuration"
          type="number"
          value={eventDuration}
          onChange={(e) => setEventDuration(e.target.value)}
          placeholder="e.g., 3"
          required
          inputMode="numeric"
        />
      </MobileFormField>

      {/* Talent Type */}
      <MobileFormField label="Talent Type Needed" required>
        <MobileSelect
          value={talentTypeNeeded}
          options={TALENT_TYPE_OPTIONS}
          onValueChange={setTalentTypeNeeded}
          placeholder="What kind of talent?"
          label="Talent Type"
        />
      </MobileFormField>

      {/* Description */}
      <MobileFormField label="Event Description">
        <MobileTextarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Tell us more about your event..."
          rows={3}
        />
      </MobileFormField>
    </div>
  );
};

export function EventRequestForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Use location detection hook for consistent location handling
  const { userLocation, detectedLocation } = useLocationDetection();

  // Refs for auto-scroll functionality
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const isNative = Capacitor.isNativePlatform();

  // Auto-scroll when inputs are focused - enabled for Capacitor native apps
  useAutoScrollOnInput({
    submitButtonRef: submitButtonRef,
    formRef: formRef,
    enabled: isNative,
    scrollDelay: isNative ? 400 : 300,
    bottomOffset: isNative ? 120 : 100,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookerName, setBookerName] = useState(user?.user_metadata?.name || "");
  const [bookerPhone, setBookerPhone] = useState<string | undefined>();
  const [eventDate, setEventDate] = useState<Date>();
  const [eventDuration, setEventDuration] = useState("");
  const [eventAddress, setEventAddress] = useState("");
  const [eventType, setEventType] = useState("");
  const [description, setDescription] = useState("");
  const [talentTypeNeeded, setTalentTypeNeeded] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Local state for selected location to override detected location
  const [selectedLocation, setSelectedLocation] = useState<string>("");

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

      // Send push notifications to matching talents
      try {
        const lowerCaseAct = talentTypeNeeded.toLowerCase();

        // 1. Find all matching talent USER IDs from 'talent_profiles'
        const { data: matchingTalents, error: talentError } = await supabase
          .from("talent_profiles")
          .select("user_id")
          .eq("act", lowerCaseAct)
          .eq("location", currentLocation);

        if (talentError) {
          console.error("Error finding talents:", talentError);
          throw new Error(`Error finding talents: ${talentError.message}`);
        }

        if (!matchingTalents || matchingTalents.length === 0) {
          return;
        }

        // 2. Get the push tokens for those user IDs from 'profiles'
        const matchingUserIds = matchingTalents.map((t) => t.user_id);

        const { data: tokenData, error: tokenError } = await supabase
          .from("profiles")
          .select("id, push_token")
          .in("id", matchingUserIds)
          .not("push_token", "is", null);

        if (tokenError) {
          console.error("Error fetching tokens:", tokenError);
          throw new Error(`Error fetching tokens: ${tokenError.message}`);
        }

        if (!tokenData || tokenData.length === 0) {
          return;
        }

        // 3. Loop through each matching talent and send them a notification
        const talentTypeLabel =
          TALENT_ACT_OPTIONS.find((t) => t.value === talentTypeNeeded)?.label ||
          talentTypeNeeded;

        for (const talent of tokenData) {
          const recipientUserId = talent.id;

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
          }
        }
      } catch (e) {
        if (e instanceof Error) {
          console.error("Error sending push notifications:", e.message);
        } else {
          console.error(
            "An unknown error occurred while sending notifications:",
            e
          );
        }
      }
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

  // Shared props object for web form
  const webFormFieldsProps: EventFormFieldsProps = {
    bookerName,
    setBookerName,
    bookerPhone,
    setBookerPhone,
    eventType,
    setEventType,
    eventDate,
    setEventDate,
    calendarOpen,
    setCalendarOpen,
    currentLocation,
    onLocationChange: handleLocationChange,
    eventAddress,
    setEventAddress,
    eventDuration,
    setEventDuration,
    talentTypeNeeded,
    setTalentTypeNeeded,
    description,
    setDescription,
  };

  // Native Layout (Capacitor) - Full screen with mobile components
  if (isNative) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        {/* Header */}
        <div
          className="flex items-center px-5 py-4 border-b border-white/10 bg-background"
          style={{ paddingTop: "max(env(safe-area-inset-top), 16px)" }}
        >
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="font-semibold text-lg ml-2">Your Event</h2>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <form
            id="native-event-form"
            ref={formRef}
            onSubmit={handleSubmit}
            className="px-5 py-6"
          >
            <MobileEventFormFields
              bookerName={bookerName}
              setBookerName={setBookerName}
              bookerPhone={bookerPhone}
              setBookerPhone={setBookerPhone}
              eventType={eventType}
              setEventType={setEventType}
              eventDate={eventDate}
              setEventDate={setEventDate}
              currentLocation={currentLocation}
              onLocationChange={handleLocationChange}
              eventAddress={eventAddress}
              setEventAddress={setEventAddress}
              eventDuration={eventDuration}
              setEventDuration={setEventDuration}
              talentTypeNeeded={talentTypeNeeded}
              setTalentTypeNeeded={setTalentTypeNeeded}
              description={description}
              setDescription={setDescription}
            />
          </form>
          {/* Padding so content isn't hidden by the sticky button bar */}
          <div className="h-24" />
        </div>

        {/* Sticky Bottom Actions */}
        <div
          className="border-t border-white/10 px-5 py-4 bg-background"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 16px)" }}
        >
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 text-base rounded-xl"
            ref={submitButtonRef}
            form="native-event-form"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Send Event Request"
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Web Layout - inline form
  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      <WebEventFormFields {...webFormFieldsProps} />

      <Button
        ref={submitButtonRef}
        type="submit"
        disabled={isSubmitting}
        className="w-full"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting...
          </>
        ) : (
          "Send Event Request"
        )}
      </Button>
    </form>
  );
}
