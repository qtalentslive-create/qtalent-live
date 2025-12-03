import React, { useState, useRef } from "react";
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
import { CalendarIcon, X, Loader2 } from "lucide-react";
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

// Moved constant outside component to prevent recreation
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

// Props interface for form fields
interface BookingFormFieldsProps {
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
  description: string;
  setDescription: (value: string) => void;
}

// Web form fields component (uses shadcn/Radix components)
const WebBookingFormFields = ({
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
  description,
  setDescription,
}: BookingFormFieldsProps) => {
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
          <SelectTrigger id="eventType" className="w-full">
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
const MobileBookingFormFields = ({
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
  description,
  setDescription,
}: Omit<BookingFormFieldsProps, "calendarOpen" | "setCalendarOpen">) => {
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
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Local state for manually selected location - overrides detection
  const [selectedLocation, setSelectedLocation] = useState<string>("");

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
        event_location: currentLocation,
        event_address: eventAddress,
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
        const { data: profile, error: profileError } = await supabase
          .from("talent_profiles")
          .select("user_id")
          .eq("id", talentId)
          .single();

        if (profileError) {
          throw new Error(
            `Could not find talent profile: ${profileError.message}`
          );
        }

        const talentUserId = profile.user_id;

        const { error: functionError } = await supabase.functions.invoke(
          "send-push-notification",
          {
            body: {
              userId: talentUserId,
              title: "New Booking Request!",
              body: `You have a new request from ${bookerName}.`,
              url: `/talent-dashboard?bookingId=${data.id}`,
              bookingId: data.id,
            },
          }
        );

        if (functionError) {
          console.error("Failed to send push notification:", functionError);
        }
      } catch (e) {
        console.error(
          "Error invoking push notification function:",
          e instanceof Error ? e.message : e
        );
      }

      toast({ title: "Booking Submitted!" });
      onSuccess();
      onClose();
    } catch (err) {
      toast({
        title: "Booking Failed",
        description:
          err instanceof Error ? err.message : "An unknown error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Shared props object for web form
  const webFormFieldsProps: BookingFormFieldsProps = {
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
    description,
    setDescription,
  };

  // Native Layout (Capacitor) - Full screen with mobile components
  if (isNative) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-background"
          style={{ paddingTop: "max(env(safe-area-inset-top), 16px)" }}
        >
          <h2 className="font-semibold text-lg truncate pr-2">
            Book {talentName}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -mr-2 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <form
            id="native-booking-form"
            ref={formRef}
            onSubmit={handleSubmit}
            className="px-5 py-6"
          >
            <MobileBookingFormFields
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
          <div className="flex gap-3 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 h-12 text-base rounded-xl border-white/20 bg-transparent hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 h-12 text-base rounded-xl"
              ref={submitButtonRef}
              form="native-booking-form"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Request Booking"
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Web Layout
  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
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
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
            <WebBookingFormFields {...webFormFieldsProps} />

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Booking Request"
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
