# Quick Start: Using Ionic Components

## 🚀 Basic Setup Complete!

Ionic React is now integrated. Here's how to start using it:

## 📝 Step 1: Import Ionic Components

```tsx
import { 
  IonButton, 
  IonInput, 
  IonItem, 
  IonLabel,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonIcon
} from '@ionic/react';
import { send, close, checkmark } from 'ionicons/icons';
```

## 🎯 Step 2: Replace Form Inputs

### Before (Shadcn):
```tsx
<Input 
  id="name" 
  value={name} 
  onChange={(e) => setName(e.target.value)} 
/>
```

### After (Ionic - Native Look):
```tsx
<IonItem>
  <IonLabel position="stacked">Name</IonLabel>
  <IonInput 
    value={name} 
    onIonInput={(e) => setName(e.detail.value!)} 
    placeholder="Enter your name"
  />
</IonItem>
```

## 🔘 Step 3: Replace Buttons

### Before:
```tsx
<Button onClick={handleSubmit}>Submit</Button>
```

### After (Native Look):
```tsx
<IonButton expand="block" onClick={handleSubmit}>
  Submit
</IonButton>
```

## 💬 Step 4: Update Chat Component

Replace your chat input with:

```tsx
<IonItem>
  <IonInput
    value={message}
    onIonInput={(e) => setMessage(e.detail.value!)}
    placeholder="Type a message..."
  />
  <IonButton 
    slot="end" 
    fill="clear" 
    onClick={handleSend}
    disabled={!message.trim()}
  >
    <IonIcon icon={send} />
  </IonButton>
</IonItem>
```

## ✅ What You Get

- ✅ **Native iOS look** on iOS devices
- ✅ **Material Design** on Android
- ✅ **Readable text** - automatically optimized
- ✅ **Proper touch targets** - 44px minimum
- ✅ **Safe area support** - handles notches automatically
- ✅ **Smooth animations** - native feel

## 🎨 Button Variants

```tsx
// Full width button
<IonButton expand="block">Submit</IonButton>

// Outlined button
<IonButton fill="outline">Cancel</IonButton>

// Text button
<IonButton fill="clear">Skip</IonButton>

// Large button
<IonButton size="large">Get Started</IonButton>
```

## 📱 Form Example

```tsx
<IonItem>
  <IonLabel position="stacked">Email *</IonLabel>
  <IonInput 
    type="email"
    value={email}
    onIonInput={(e) => setEmail(e.detail.value!)}
    required
  />
</IonItem>

<IonItem>
  <IonLabel position="stacked">Event Type</IonLabel>
  <IonSelect 
    value={eventType}
    onIonChange={(e) => setEventType(e.detail.value)}
  >
    <IonSelectOption value="wedding">Wedding</IonSelectOption>
    <IonSelectOption value="birthday">Birthday</IonSelectOption>
  </IonSelect>
</IonItem>

<IonItem>
  <IonLabel position="stacked">Description</IonLabel>
  <IonTextarea
    value={description}
    onIonInput={(e) => setDescription(e.detail.value!)}
    rows={4}
  />
</IonItem>
```

## 🎯 Next: Convert Your Forms

1. Start with `BookingForm.tsx`
2. Then `EventRequestForm.tsx`
3. Finally `UniversalChat.tsx`

See `IONIC_SETUP_GUIDE.md` for detailed examples!

