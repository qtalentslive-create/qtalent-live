// HTML email template generators
interface BookingEmailData {
  recipientName: string;
  eventType: string;
  eventDate: string;
  eventLocation: string;
  bookerName: string;
  talentName?: string;
  bookingStatus: string;
  bookingId: string;
  appUrl: string;
  isForTalent: boolean;
  showFullDetails?: boolean;
  bookerEmail?: string;
  bookerPhone?: string;
  description?: string;
  eventDuration?: number;
  budget?: number;
  budgetCurrency?: string;
  eventAddress?: string;
}

interface MessageEmailData {
  recipientName: string;
  senderName: string;
  eventType: string;
  eventDate: string;
  messagePreview: string;
  bookingId?: string;
  eventRequestId?: string;
  appUrl: string;
  isFromTalent?: boolean;
  isFromAdmin?: boolean;
}

interface PaymentEmailData {
  recipientName: string;
  eventType: string;
  eventDate: string;
  totalAmount: string;
  currency: string;
  bookingId: string;
  appUrl: string;
  isForTalent: boolean;
  talentEarnings?: string;
  platformCommission?: string;
}

export function generateBookingEmailHtml(data: BookingEmailData): string {
  const getSubject = () => {
    switch (data.bookingStatus) {
      case 'pending':
        return data.isForTalent ? 'New Booking Request' : 'Booking Request Submitted';
      case 'approved':
        return 'Booking Approved';
      case 'declined':
        return 'Booking Declined';
      case 'completed':
        return 'Booking Completed';
      default:
        return 'Booking Update';
    }
  };

  const getMessage = () => {
    const eventDetails = `${data.eventType} event on ${data.eventDate} at ${data.eventLocation}`;
    
    switch (data.bookingStatus) {
      case 'pending':
        return data.isForTalent 
          ? `You have received a new booking request from ${data.bookerName} for a ${eventDetails}.`
          : `Your booking request for a ${eventDetails} has been submitted and is awaiting approval.`;
      case 'approved':
        return data.isForTalent
          ? `You have approved the booking request from ${data.bookerName} for a ${eventDetails}.`
          : `Great news! Your booking request for a ${eventDetails} has been approved by ${data.talentName}.`;
      case 'declined':
        return data.isForTalent
          ? `You have declined the booking request from ${data.bookerName} for a ${eventDetails}.`
          : `Your booking request for a ${eventDetails} has been declined by ${data.talentName}.`;
      case 'completed':
        return `The booking for a ${eventDetails} has been completed successfully.`;
      default:
        return `There has been an update to your booking for a ${eventDetails}.`;
    }
  };

  const getActionText = () => {
    if (data.bookingStatus === 'pending' && data.isForTalent) {
      return 'Review Booking Request';
    }
    return 'View Booking Details';
  };

  const eventDetailsHtml = `
    <strong>Type:</strong> ${data.eventType}<br/>
    <strong>Date:</strong> ${data.eventDate}<br/>
    <strong>Location:</strong> ${data.eventLocation}<br/>
    ${data.eventDuration ? `<strong>Duration:</strong> ${data.eventDuration} hours<br/>` : ''}
  `;

  const clientDetailsHtml = data.isForTalent ? `
    <strong>Client:</strong> ${data.bookerName}<br/>
    ${data.showFullDetails && data.bookerEmail ? `<strong>Client Email:</strong> ${data.bookerEmail}<br/>` : ''}
    ${data.showFullDetails && data.bookerPhone ? `<strong>Client Phone:</strong> ${data.bookerPhone}<br/>` : ''}
    ${data.showFullDetails && data.eventAddress ? `<strong>Full Address:</strong> ${data.eventAddress}<br/>` : ''}
    ${data.showFullDetails && data.budget ? `<strong>Budget:</strong> ${data.budget} ${data.budgetCurrency || 'USD'}<br/>` : ''}
    ${data.showFullDetails && data.description ? `<strong>Description:</strong> ${data.description}<br/>` : ''}
    
    ${!data.showFullDetails ? `
      <div style="color: #007ee6; font-size: 14px; font-style: italic; margin: 12px 0 0 0; padding: 12px; background-color: #e3f2fd; border-radius: 6px; border: 1px solid #bbdefb;">
        <strong>📧 Upgrade to Pro</strong> to see client contact details, budget, and full event description.
      </div>
    ` : ''}
  ` : `
    <strong>Booker:</strong> ${data.bookerName}<br/>
    ${data.talentName ? `<strong>Talent:</strong> ${data.talentName}<br/>` : ''}
    ${data.eventAddress ? `<strong>Full Address:</strong> ${data.eventAddress}<br/>` : ''}
    ${data.budget ? `<strong>Budget:</strong> ${data.budget} ${data.budgetCurrency || 'USD'}<br/>` : ''}
    ${data.description ? `<strong>Description:</strong> ${data.description}<br/>` : ''}
  `;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen-Sans,Ubuntu,Cantarell,'Helvetica Neue',sans-serif; background-color: #ffffff;">
  <div style="margin: 0 auto; padding: 20px 0 48px; max-width: 560px;">
    <h1 style="color: #333; font-size: 24px; font-weight: bold; margin: 40px 0; padding: 0;">${getSubject()}</h1>
    <p style="color: #333; font-size: 16px; line-height: 26px; margin: 16px 0;">Hi ${data.recipientName},</p>
    <p style="color: #333; font-size: 16px; line-height: 26px; margin: 16px 0;">${getMessage()}</p>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="${data.appUrl}/talent-dashboard" style="background-color: #007ee6; border-radius: 8px; color: #fff; font-size: 16px; font-weight: bold; text-decoration: none; text-align: center; display: inline-block; padding: 12px 24px;">
        ${getActionText()}
      </a>
    </div>

    <div style="margin: 24px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef;">
      <p style="color: #333; font-size: 16px; font-weight: bold; margin: 0 0 12px 0;">Event Details:</p>
      <div style="color: #666; font-size: 14px; line-height: 22px; margin: 0;">
        ${eventDetailsHtml}
        ${clientDetailsHtml}
      </div>
    </div>

    <p style="color: #898989; font-size: 12px; line-height: 22px; margin-top: 32px;">
      Best regards,<br/>
      The Qtalent.live Team
    </p>
  </div>
</body>
</html>`;
}

export function generateMessageEmailHtml(data: MessageEmailData): string {
  const isEventRequest = !!data.eventRequestId;
  const dashboardUrl = data.eventRequestId 
    ? `${data.appUrl}/booker-dashboard?chat=${data.eventRequestId}`
    : data.bookingId
    ? `${data.appUrl}/${data.isFromTalent ? 'booker' : 'talent'}-dashboard?chat=${data.bookingId}`
    : `${data.appUrl}/dashboard`;
  
  const messageContext = isEventRequest 
    ? `your ${data.eventType} event request`
    : data.eventDate 
    ? `your ${data.eventType} event on ${data.eventDate}`
    : `your ${data.eventType} event`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen-Sans,Ubuntu,Cantarell,'Helvetica Neue',sans-serif; background-color: #ffffff;">
  <div style="margin: 0 auto; padding: 20px 0 48px; max-width: 560px;">
    <h1 style="color: #333; font-size: 24px; font-weight: bold; margin: 40px 0; padding: 0;">New Message</h1>
    <p style="color: #333; font-size: 16px; line-height: 26px; margin: 16px 0;">Hi ${data.recipientName},</p>
    <p style="color: #333; font-size: 16px; line-height: 26px; margin: 16px 0;">
      You have received a new message from ${data.senderName}${data.isFromAdmin ? ' (QTalent Team)' : ''} regarding ${messageContext}.
    </p>
    
    <div style="margin: 24px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef;">
      <p style="color: #333; font-size: 16px; font-weight: bold; margin: 0 0 12px 0;">Message Preview:</p>
      <p style="color: #666; font-size: 14px; line-height: 22px; margin: 0; font-style: italic; white-space: pre-wrap;">
        "${data.messagePreview}"
      </p>
    </div>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${dashboardUrl}" style="background-color: #007ee6; border-radius: 8px; color: #fff; font-size: 16px; font-weight: bold; text-decoration: none; text-align: center; display: inline-block; padding: 12px 24px;">
        Reply to Message
      </a>
    </div>

    <p style="color: #898989; font-size: 12px; line-height: 22px; margin-top: 32px;">
      Best regards,<br/>
      The Qtalent.live Team
    </p>
  </div>
</body>
</html>`;
}

export function generatePaymentEmailHtml(data: PaymentEmailData): string {
  const subject = data.isForTalent ? 'Payment Received' : 'Payment Processed';
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen-Sans,Ubuntu,Cantarell,'Helvetica Neue',sans-serif; background-color: #ffffff;">
  <div style="margin: 0 auto; padding: 20px 0 48px; max-width: 560px;">
    <h1 style="color: #333; font-size: 24px; font-weight: bold; margin: 40px 0; padding: 0;">${subject}</h1>
    <p style="color: #333; font-size: 16px; line-height: 26px; margin: 16px 0;">Hi ${data.recipientName},</p>
    <p style="color: #333; font-size: 16px; line-height: 26px; margin: 16px 0;">
      ${data.isForTalent 
        ? `Great news! Payment has been processed for your ${data.eventType} event on ${data.eventDate}.`
        : `Your payment for the ${data.eventType} event on ${data.eventDate} has been processed successfully.`
      }
    </p>
    
    <div style="margin: 24px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef;">
      <p style="color: #333; font-size: 16px; font-weight: bold; margin: 0 0 12px 0;">Payment Details:</p>
      <div style="color: #666; font-size: 14px; line-height: 22px; margin: 0;">
        <p><strong>Total Amount:</strong> ${data.currency} ${data.totalAmount}</p>
        ${data.isForTalent && data.talentEarnings ? `
          <p><strong>Your Earnings:</strong> ${data.currency} ${data.talentEarnings}</p>
          ${data.platformCommission ? `<p><strong>Platform Fee:</strong> ${data.currency} ${data.platformCommission}</p>` : ''}
        ` : ''}
        <p><strong>Event:</strong> ${data.eventType}</p>
        <p><strong>Date:</strong> ${data.eventDate}</p>
      </div>
    </div>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${data.appUrl}/talent-dashboard" style="background-color: #28a745; border-radius: 8px; color: #fff; font-size: 16px; font-weight: bold; text-decoration: none; text-align: center; display: inline-block; padding: 12px 24px;">
        View Payment Details
      </a>
    </div>

    <p style="color: #898989; font-size: 12px; line-height: 22px; margin-top: 32px;">
      Best regards,<br/>
      The Qtalent.live Team
    </p>
  </div>
</body>
</html>`;
}

export function generateBroadcastEmailHtml(data: { recipientName: string; message: string; recipientType: string; appUrl: string }): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen-Sans,Ubuntu,Cantarell,'Helvetica Neue',sans-serif; background-color: #ffffff;">
  <div style="margin: 0 auto; padding: 20px 0 48px; max-width: 560px;">
    <h1 style="color: #333; font-size: 24px; font-weight: bold; margin: 40px 0; padding: 0;">Important Announcement from Qtalent</h1>
    <p style="color: #333; font-size: 16px; line-height: 26px; margin: 16px 0;">Hi ${data.recipientName},</p>
    
    <div style="margin: 24px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef;">
      <p style="color: #333; font-size: 16px; line-height: 26px; margin: 0;">${data.message}</p>
    </div>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${data.appUrl}" style="background-color: #007ee6; border-radius: 8px; color: #fff; font-size: 16px; font-weight: bold; text-decoration: none; text-align: center; display: inline-block; padding: 12px 24px;">
        Visit Qtalent
      </a>
    </div>

    <p style="color: #898989; font-size: 12px; line-height: 22px; margin-top: 32px;">
      Best regards,<br/>
      The Qtalent Team
    </p>
  </div>
</body>
</html>`;
}

export function generateAdminEmailHtml(data: {
  eventType: string;
  notificationType: string;
  bookerName: string;
  talentName: string;
  eventDate: string;
  eventLocation: string;
  amount: string;
  currency: string;
  bookingId: string;
  talentId: string;
  appUrl: string;
}): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen-Sans,Ubuntu,Cantarell,'Helvetica Neue',sans-serif; background-color: #ffffff;">
  <div style="margin: 0 auto; padding: 20px 0 48px; max-width: 560px;">
    <h1 style="color: #333; font-size: 24px; font-weight: bold; margin: 40px 0; padding: 0;">Admin Notification: ${data.notificationType}</h1>
    <p style="color: #333; font-size: 16px; line-height: 26px; margin: 16px 0;">Admin notification for ${data.eventType} event.</p>
    
    <div style="margin: 24px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef;">
      <p style="color: #333; font-size: 16px; font-weight: bold; margin: 0 0 12px 0;">Event Details:</p>
      <div style="color: #666; font-size: 14px; line-height: 22px; margin: 0;">
        <p><strong>Type:</strong> ${data.eventType}</p>
        <p><strong>Date:</strong> ${data.eventDate}</p>
        <p><strong>Location:</strong> ${data.eventLocation}</p>
        <p><strong>Booker:</strong> ${data.bookerName}</p>
        <p><strong>Talent:</strong> ${data.talentName}</p>
        ${data.amount ? `<p><strong>Amount:</strong> ${data.currency} ${data.amount}</p>` : ''}
        <p><strong>Booking ID:</strong> ${data.bookingId}</p>
      </div>
    </div>

    <p style="color: #898989; font-size: 12px; line-height: 22px; margin-top: 32px;">
      Admin notification from Qtalent.live
    </p>
  </div>
</body>
</html>`;
}

export function generateEventRequestConfirmationEmailHtml(data: {
  recipientName: string;
  eventData: any;
  appUrl: string;
}): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen-Sans,Ubuntu,Cantarell,'Helvetica Neue',sans-serif; background-color: #ffffff;">
  <div style="margin: 0 auto; padding: 20px 0 48px; max-width: 560px;">
    <h1 style="color: #333; font-size: 24px; font-weight: bold; margin: 40px 0; padding: 0;">Event Request Confirmation</h1>
    <p style="color: #333; font-size: 16px; line-height: 26px; margin: 16px 0;">Hi ${data.recipientName},</p>
    <p style="color: #333; font-size: 16px; line-height: 26px; margin: 16px 0;">
      Thank you for your event request! We have received the following details:
    </p>
    
    <div style="margin: 24px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef;">
      <p style="color: #333; font-size: 16px; font-weight: bold; margin: 0 0 12px 0;">Event Details:</p>
      <div style="color: #666; font-size: 14px; line-height: 22px; margin: 0;">
        ${data.eventData?.event_type ? `<p><strong>Type:</strong> ${data.eventData.event_type}</p>` : ''}
        ${data.eventData?.event_date ? `<p><strong>Date:</strong> ${data.eventData.event_date}</p>` : ''}
        ${data.eventData?.event_location ? `<p><strong>Location:</strong> ${data.eventData.event_location}</p>` : ''}
        ${data.eventData?.event_duration ? `<p><strong>Duration:</strong> ${data.eventData.event_duration} hours</p>` : ''}
        ${data.eventData?.description ? `<p><strong>Description:</strong> ${data.eventData.description}</p>` : ''}
      </div>
    </div>

    <p style="color: #333; font-size: 16px; line-height: 26px; margin: 16px 0;">
      We will review your request and get back to you within 24 hours with suitable talent options and pricing information.
    </p>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${data.appUrl}" style="background-color: #007ee6; border-radius: 8px; color: #fff; font-size: 16px; font-weight: bold; text-decoration: none; text-align: center; display: inline-block; padding: 12px 24px;">
        Visit Qtalent
      </a>
    </div>

    <p style="color: #898989; font-size: 12px; line-height: 22px; margin-top: 32px;">
      Best regards,<br/>
      The Qtalent Team
    </p>
  </div>
</body>
</html>`;
}

export function generateAdminSupportMessageEmailHtml(data: {
  senderName: string;
  senderEmail: string;
  messagePreview: string;
  appUrl: string;
  event_request_id?: string;
  event_type?: string;
  event_date?: string;
  event_location?: string;
  event_duration?: number;
  description?: string;
  booker_phone?: string;
}): string {
  const hasEventRequest = !!(data.event_request_id || data.event_type);
  const replyUrl = hasEventRequest && data.event_request_id 
    ? `${data.appUrl}/admin/bookings?eventRequestId=${data.event_request_id}`
    : `${data.appUrl}/admin/direct-messages`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen-Sans,Ubuntu,Cantarell,'Helvetica Neue',sans-serif; background-color: #ffffff;">
  <div style="margin: 0 auto; padding: 20px 0 48px; max-width: 560px;">
    <h1 style="color: #333; font-size: 24px; font-weight: bold; margin: 40px 0; padding: 0;">${hasEventRequest ? '📅 New Event Request Message' : '🆘 New Support Message'}</h1>
    <p style="color: #333; font-size: 16px; line-height: 26px; margin: 16px 0;">Hi Admin,</p>
    <p style="color: #333; font-size: 16px; line-height: 26px; margin: 16px 0;">
      ${hasEventRequest 
        ? 'A booker has sent a new message regarding their event request and is waiting for your response.'
        : 'A user has sent a new support message and is waiting for your response.'
      }
    </p>
    
    <div style="margin: 24px 0; padding: 20px; background-color: #fff3cd; border-radius: 8px; border: 2px solid #ffc107;">
      <p style="color: #333; font-size: 16px; font-weight: bold; margin: 0 0 12px 0;">User Information:</p>
      <div style="color: #666; font-size: 14px; line-height: 22px; margin: 0;">
        <p><strong>Name:</strong> ${data.senderName}</p>
        <p><strong>Email:</strong> ${data.senderEmail}</p>
        ${data.booker_phone ? `<p><strong>Phone:</strong> ${data.booker_phone}</p>` : ''}
      </div>
    </div>

    ${hasEventRequest ? `
    <div style="margin: 24px 0; padding: 20px; background-color: #e7f3ff; border-radius: 8px; border: 2px solid #2196F3;">
      <p style="color: #333; font-size: 16px; font-weight: bold; margin: 0 0 12px 0;">Event Request Details:</p>
      <div style="color: #666; font-size: 14px; line-height: 22px; margin: 0;">
        ${data.event_type ? `<p><strong>Event Type:</strong> ${data.event_type}</p>` : ''}
        ${data.event_date ? `<p><strong>Event Date:</strong> ${data.event_date}</p>` : ''}
        ${data.event_location ? `<p><strong>Location:</strong> ${data.event_location}</p>` : ''}
        ${data.event_duration ? `<p><strong>Duration:</strong> ${data.event_duration} hours</p>` : ''}
        ${data.description ? `<p><strong>Description:</strong> ${data.description}</p>` : ''}
      </div>
    </div>
    ` : ''}

    <div style="margin: 24px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef;">
      <p style="color: #333; font-size: 16px; font-weight: bold; margin: 0 0 12px 0;">Message:</p>
      <p style="color: #666; font-size: 14px; line-height: 22px; margin: 0; font-style: italic; white-space: pre-wrap;">
        "${data.messagePreview}"
      </p>
    </div>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${replyUrl}" style="background-color: #dc3545; border-radius: 8px; color: #fff; font-size: 16px; font-weight: bold; text-decoration: none; text-align: center; display: inline-block; padding: 12px 24px;">
        ${hasEventRequest ? 'View Event Request & Reply' : 'Reply to User'}
      </a>
    </div>

    <p style="color: #898989; font-size: 12px; line-height: 22px; margin-top: 32px;">
      This is an automated notification from QTalents Support System
    </p>
  </div>
</body>
</html>`;
}