// EXAMPLE: BookingForm with Ionic Components
// This shows how to convert to native look
// Copy patterns from here to your actual BookingForm.tsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonIcon,
  IonSpinner,
} from "@ionic/react";
import { close, calendar, location } from "ionicons/icons";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

// This is just an EXAMPLE - showing the structure
// Replace your BookingForm with this pattern

export function BookingFormIonicExample({
  isOpen,
  onClose,
  talentName,
}: {
  isOpen: boolean;
  onClose: () => void;
  talentName: string;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bookerName, setBookerName] = useState(user?.user_metadata?.name || "");
  const [eventType, setEventType] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Book {talentName}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>
              <IonIcon icon={close} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <form
          onSubmit={(e) => {
            e.preventDefault(); /* handle submit */
          }}
        >
          {/* Native-looking input */}
          <IonItem>
            <IonLabel position="stacked">Your Name *</IonLabel>
            <IonInput
              value={bookerName}
              onIonInput={(e) => setBookerName(e.detail.value!)}
              placeholder="Enter your name"
              required
            />
          </IonItem>

          {/* Native-looking select */}
          <IonItem>
            <IonLabel position="stacked">Event Type *</IonLabel>
            <IonSelect
              value={eventType}
              onIonChange={(e) => setEventType(e.detail.value)}
              placeholder="Select event type"
            >
              <IonSelectOption value="wedding">Wedding</IonSelectOption>
              <IonSelectOption value="birthday">Birthday</IonSelectOption>
              <IonSelectOption value="corporate">Corporate</IonSelectOption>
            </IonSelect>
          </IonItem>

          {/* Native-looking textarea */}
          <IonItem>
            <IonLabel position="stacked">Description</IonLabel>
            <IonTextarea
              value=""
              onIonInput={(e) => {}}
              rows={4}
              placeholder="Tell us about your event..."
            />
          </IonItem>

          {/* Native-looking button */}
          <IonButton
            expand="block"
            type="submit"
            disabled={isSubmitting}
            className="ion-margin-top"
          >
            {isSubmitting ? (
              <>
                <IonSpinner name="crescent" />
                Submitting...
              </>
            ) : (
              "Send Booking Request"
            )}
          </IonButton>
        </form>
      </IonContent>
    </IonModal>
  );
}
