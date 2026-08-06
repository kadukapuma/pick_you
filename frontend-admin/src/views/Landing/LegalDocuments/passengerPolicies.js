const links = [
    { label: 'Terms', to: '/passenger/terms-and-conditions' },
    { label: 'Privacy', to: '/passenger/privacy-policy' },
    { label: 'Payments', to: '/passenger/payment-policy' },
    { label: 'Refunds', to: '/passenger/cancellation-refund-policy' },
]

const shared = {
    audience: 'PickU Passenger',
    status: 'Draft — under review',
    updated: '28 July 2026',
    links,
    notice: {
        title: 'Pre-launch draft',
        text: 'This document describes the intended passenger service. Commercial rules, card processing and formal company details remain subject to approval before publication.',
    },
}

export const passengerTerms = {
    ...shared,
    path: '/passenger/terms-and-conditions',
    title: 'Terms and Conditions',
    summary: 'The rules that apply when passengers create an account, request a ride and use PickU passenger services.',
    sections: [
        {
            title: 'Eligibility and accounts',
            paragraphs: ['You must be at least 18 and legally capable of entering a contract. A minor may travel only under the responsibility of a parent or legal guardian where lawful.', 'Provide accurate account information, protect your device and OTPs, and promptly report suspected unauthorised access. Accounts may not be transferred or used fraudulently.'],
        },
        {
            title: "PickU's role",
            paragraphs: ['PickU provides technology that enables passengers to request transportation from eligible drivers or transport providers. Unless expressly stated otherwise, the driver or provider shown in the app performs the ride.', 'Ride availability is not guaranteed. A request may remain unmatched or be cancelled because of availability, location, safety, technical or operational conditions.'],
        },
        {
            title: 'Ride requests and passenger responsibilities',
            paragraphs: ['Before confirming, check the pickup, destination, vehicle category, estimated fare, payment method and any promotion.'],
            items: ['Be ready at the selected pickup point and provide accurate ride details.', 'Confirm the assigned vehicle and registration before boarding.', 'Use available seatbelts and comply with applicable law.', 'Treat drivers, other passengers and property respectfully.', 'Do not carry dangerous, prohibited or unlawful items.', 'Choose a suitable vehicle and pay the valid final fare and disclosed fees.'],
        },
        {
            title: 'Booking for another person',
            paragraphs: ['When Book for a friend is available, you must provide accurate information, have permission to share it and ensure the passenger knows relevant safety information. You remain responsible for charges made through your account unless PickU states otherwise.'],
        },
        {
            title: 'Fare estimates and final fares',
            paragraphs: ['Estimates may use route, distance, duration, vehicle category, demand and fare configuration. The final fare may change because of actual time or distance, waiting, route changes, tolls, taxes, promotions, disclosed cancellation fees or corrections.', 'Contact support with the ride reference and evidence if a fare appears incorrect.'],
        },
        {
            title: 'Payments',
            paragraphs: ['Available methods may include cash and, after activation, approved card methods. Cash is paid to the driver. Card entry and bank authentication will occur through an approved payment-provider form.', 'PickU does not ask passengers to send full card numbers, CVV or bank OTPs through the app, chat, telephone or email. See the Passenger Payment Policy.'],
        },
        {
            title: 'Cancellations and refunds',
            paragraphs: ['A passenger or driver may cancel where permitted. Any cancellation, waiting or no-show fee must be shown clearly before it applies. Fee reviews and refunds follow the Passenger Cancellation and Refund Policy.', 'Nothing in these terms removes consumer rights that cannot lawfully be excluded.'],
        },
        {
            title: 'Promotions and credits',
            paragraphs: ['Promotions may have eligibility, location, service, expiry and account restrictions. They may not be transferred, duplicated or obtained fraudulently. PickU Wallet is unavailable unless activated under separate published terms.'],
        },
        {
            title: 'Safety and communications',
            paragraphs: ['Verify the driver and vehicle before boarding. For an immediate emergency, contact the appropriate public emergency service first; an app safety feature is not a substitute for emergency services.', 'Passenger-driver communications must be used lawfully and primarily for the ride.'],
        },
        {
            title: 'Ratings, content and lost property',
            paragraphs: ['Ratings, reviews and support submissions must be honest, relevant and lawful. PickU may remove fraudulent, abusive or illegal content.', 'Passengers are responsible for their belongings. PickU may assist with a lost-item report but cannot guarantee recovery.'],
        },
        {
            title: 'Account restrictions',
            paragraphs: ['PickU may reasonably restrict or suspend an account while investigating safety, fraud, illegality, repeated non-payment, abuse or a material breach. Where appropriate and lawful, notice and a support channel will be provided.'],
        },
        {
            title: 'Availability and third parties',
            paragraphs: ['PickU may rely on drivers, mapping, communications, cloud, payment and app-store providers. We do not guarantee uninterrupted availability, a driver, arrival time or route, but will exercise legally required care.'],
        },
        {
            title: 'Liability and consumer rights',
            paragraphs: ['Nothing excludes liability, remedies or consumer rights that cannot lawfully be excluded under Sri Lankan law. Any limitation applies only to the maximum extent permitted by law.'],
        },
        {
            title: 'Complaints, changes and contact',
            paragraphs: ['Send a complaint with your account contact, ride reference, date, amount and evidence to support@pickyou.lk. These terms are governed by Sri Lankan law, without restricting access to a competent regulator, consumer process or court.', 'Material updates will be communicated through the app, website or another appropriate channel where required.'],
        },
    ],
}

export const passengerPrivacy = {
    ...shared,
    path: '/passenger/privacy-policy',
    title: 'Privacy Policy',
    summary: 'How PickU handles passenger account, location, trip, payment and support information.',
    sections: [
        {
            title: 'Who this policy covers',
            paragraphs: ['This policy applies when passengers use the PickU passenger app, website, support services and related ride services. Final legal-company and privacy-controller details will be added before launch.'],
        },
        {
            title: 'Data we collect',
            items: ['Account and profile data, including name, mobile number, email and a chosen profile image.', 'Foreground location, pickup, destination, route, saved places, ride notes and trip timestamps.', 'Vehicle choice, assigned driver, fare, promotion, cancellation and ride-history information.', 'Chosen payment method, masked card details, provider reference, status, refund and receipt information.', 'Support, complaint, safety, lost-item, rating and review information.', 'Device, app, push-token, security, crash and server-log information.'],
        },
        {
            title: 'Device permissions',
            paragraphs: ['Location supports pickup, routing, fare estimates and active rides. Camera or photos are used only when a passenger chooses a feature that requires them. Notifications provide ride, payment, safety and support updates.'],
            note: 'PickU does not claim contacts or continuous background-location access unless those features are implemented, required and separately disclosed.',
        },
        {
            title: 'How we use data',
            items: ['Create and secure accounts.', 'Estimate fares, match drivers, provide navigation and track trips.', 'Enable passenger-driver communication.', 'Record cash payments and, when enabled, provider-hosted card payments.', 'Provide receipts, refunds, customer support, safety and lost-item assistance.', 'Prevent fraud and improve reliability, accessibility and performance.', 'Meet accounting, tax, regulatory and legal duties.'],
        },
        {
            title: 'How we share data',
            paragraphs: ['Necessary information may be shared with assigned drivers or fleets, approved payment providers, mapping and routing providers, cloud and communications vendors, advisers, insurers, authorities or emergency services where lawful.', 'Service providers must use data only for authorised purposes. PickU does not sell passenger personal data.'],
        },
        {
            title: 'International processing and retention',
            paragraphs: ['Where an approved provider processes data outside Sri Lanka, PickU will assess the transfer and apply safeguards required by law.', 'Data is kept only as long as needed for the service, legal duties, safety, fraud prevention and disputes. A category-specific retention schedule will be approved before production publication.'],
        },
        {
            title: 'Security and card information',
            paragraphs: ['PickU uses proportionate safeguards such as access control, encrypted transport, authentication, monitoring and vendor controls.', 'Card entry and bank authentication should occur only on an approved provider-hosted form. PickU does not store full card numbers, CVV or bank OTPs in the passenger app.'],
        },
        {
            title: 'Your choices and rights',
            paragraphs: ['Subject to applicable law, passengers may request access, correction, deletion, restriction, objection or withdrawal of consent. Identity may be verified before a request is completed.', 'Permissions can be changed in device settings, although some features may then be unavailable. Privacy requests may be sent to support@pickyou.lk until a dedicated privacy address is published.'],
        },
        {
            title: 'Children, automated decisions and updates',
            paragraphs: ['The service is not intended for an unaccompanied minor. PickU may use automated signals for fare calculation, matching, fraud detection and safety, with legally required safeguards.', 'Material policy changes will be notified through the app, website or another appropriate channel.'],
        },
    ],
}

export const passengerPayment = {
    ...shared,
    path: '/passenger/payment-policy',
    title: 'Payment Policy',
    summary: 'Clear information about fares, cash payments and the planned secure card-payment flow.',
    sections: [
        {
            title: 'Current availability',
            items: ['Cash is currently available and is paid to the driver after the ride.', 'Card screens are a pre-launch preview; live card charging remains disabled until provider approval and production integration.', 'PickU Wallet is not currently available.'],
        },
        {
            title: 'Fare and currency',
            paragraphs: ['Fares are displayed in Sri Lankan rupees (LKR). The app may show an estimate before booking and a final fare after the trip. Applicable toll, waiting, cancellation, tax, adjustment or dynamic-pricing components must be disclosed.'],
        },
        {
            title: 'Cash payments',
            paragraphs: ['For a cash ride, the passenger pays the final amount directly to the driver. PickU may record the fare and cash status for the receipt, support and accounting.'],
        },
        {
            title: 'Secure card setup',
            paragraphs: ['After approval, Add card will open an approved bank or payment-provider hosted form. Bank authentication, such as 3-D Secure or OTP, occurs through that provider.', 'PickU should receive only a provider token and masked card details. Full card numbers, CVV and bank OTPs must not be stored by the passenger app or PickU backend.'],
        },
        {
            title: 'Card charging and confirmation',
            paragraphs: ['The final authorisation and charging design will be published after provider confirmation. Payment success must be verified by the PickU backend using a trusted provider response, not only a mobile redirect.'],
        },
        {
            title: 'Payment statuses',
            items: ['Processing or pending means confirmation is not final.', 'Paid means the provider and PickU backend confirmed payment.', 'Failed means payment was not confirmed.', 'Cancelled or timed out means the secure session did not complete.', 'Refund processing and refunded describe separate provider-confirmed refund stages.'],
        },
        {
            title: 'Failed payments, receipts and support',
            paragraphs: ['A failed payment does not cancel a completed ride. The passenger may retry an approved method, use another available option or contact support. Duplicate-charge safeguards must apply to retries.', 'Receipts identify the ride reference, final fare, method and status without exposing sensitive card data.'],
        },
    ],
}

export const passengerRefund = {
    ...shared,
    path: '/passenger/cancellation-refund-policy',
    title: 'Cancellation and Refund Policy',
    summary: 'How ride cancellations, fee reviews, card reversals and approved refunds are handled.',
    sections: [
        {
            title: 'Scope',
            paragraphs: ['This policy applies to passenger ride cancellations, cancellation fees, fare corrections, card-payment reversals and approved refunds. It forms part of the Passenger Terms and Conditions.'],
        },
        {
            title: 'Cancelling a ride',
            paragraphs: ['Passengers may cancel in the app before the ride begins. Any applicable fee must be shown before confirmation. Free-cancellation, waiting, no-show, scheduled-ride and return-trip rules will be published only after operational approval.'],
        },
        {
            title: 'When a fee may be waived',
            items: ['No eligible driver was available or assigned.', 'The driver made no reasonable progress or improperly asked the passenger to cancel.', 'Driver, vehicle or registration details did not match.', 'The driver arrived at a materially incorrect pickup point.', 'A credible safety issue, duplicate request or material PickU system error occurred.', 'Applicable law requires another result.'],
        },
        {
            title: 'Refund eligibility',
            items: ['A duplicate card charge or ride that was not provided.', 'An incorrect fare, toll, waiting or cancellation fee.', 'An approved adjustment or payment-processing error.', 'A suspected unauthorised transaction, subject to investigation and bank procedures.', 'Another refund required by law.'],
            note: 'General dissatisfaction does not automatically create a full-refund right, but PickU reviews service and safety complaints fairly.',
        },
        {
            title: 'Cash and card refunds',
            paragraphs: ['Cash cannot be electronically reversed. After investigation, PickU may arrange an appropriate lawful remedy.', 'An approved card refund is submitted to the original payment method. Provider and issuing-bank processing may continue after submission; a timing estimate will be published only after provider confirmation.'],
        },
        {
            title: 'Refund statuses',
            items: ['Requested: the request was received.', 'Under review: ride or payment evidence is being checked.', 'Processing: an approved refund was submitted to the provider.', 'Refunded: the provider confirmed the refund.', 'Failed: submission was unsuccessful and needs follow-up.'],
        },
        {
            title: 'Requesting a review',
            paragraphs: ['Contact support@pickyou.lk with the account mobile number, ride reference, date, amount, reason and relevant evidence. Service targets and reporting periods will be published after operational approval without limiting longer rights under law.'],
        },
        {
            title: 'Chargebacks and promotional credits',
            paragraphs: ['Contacting PickU first may resolve an issue faster but does not remove lawful bank or card-scheme rights. PickU will not recover the same amount through both a refund and chargeback.', 'A goodwill credit or promotion is not a cash refund and must be clearly identified.'],
        },
    ],
}
