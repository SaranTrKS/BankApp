/**
 * Every bilingual label on the kiosk, in one place so a Telugu speaker can review
 * them together. The Telugu text is a first draft and has NOT been reviewed yet —
 * see docs/kiosk.md. Keep banking terms simple; English stays the main language.
 */
export interface Bilingual {
  en: string;
  te: string;
}

export const KIOSK_TEXT = {
  welcome: { en: 'Welcome', te: 'స్వాగతం' },
  tagline: { en: 'Your future, assured', te: 'మీ భవిష్యత్తుకు భరోసా' },
  touchToBegin: { en: 'Touch the screen to begin', te: 'ప్రారంభించడానికి స్క్రీన్‌ను తాకండి' },
  howCanWeHelp: { en: 'How can we help you today?', te: 'మేము మీకు ఎలా సహాయపడగలం?' },
  deposits: { en: 'Deposits', te: 'డిపాజిట్లు' },
  loans: { en: 'Loans', te: 'రుణాలు' },
  children: { en: "Children's Savings", te: 'పిల్లల పొదుపు' },
  branches: { en: 'Our Branches', te: 'మా శాఖలు' },
  callback: { en: 'Request a call back', te: 'మేము మీకు కాల్ చేస్తాము' },
  phone: { en: 'Continue on your phone', te: 'మీ ఫోన్‌లో కొనసాగించండి' },
  about: { en: 'About the bank', te: 'బ్యాంకు గురించి' },
  back: { en: 'Back', te: 'వెనుకకు' },
  home: { en: 'Home', te: 'హోమ్' },
  interested: { en: "I'm interested — call me", te: 'నాకు ఆసక్తి ఉంది — కాల్ చేయండి' },
  youWillGet: { en: 'You will get', te: 'మీకు లభించేది' },
  yourName: { en: 'Your name', te: 'మీ పేరు' },
  mobile: { en: 'Mobile number', te: 'మొబైల్ నంబర్' },
  consent: {
    en: 'I agree that DCCB-VZM may call me on this number about my enquiry.',
    te: 'నా విచారణ గురించి DCCB-VZM ఈ నంబర్‌కు కాల్ చేయడానికి నేను అంగీకరిస్తున్నాను.',
  },
  send: { en: 'Send request', te: 'అభ్యర్థన పంపండి' },
  thankYou: { en: "Thank you! We'll call you soon.", te: 'ధన్యవాదాలు! మేము త్వరలో మీకు కాల్ చేస్తాము.' },
  stillThere: { en: 'Are you still there?', te: 'మీరు ఇంకా ఉన్నారా?' },
  continue: { en: 'Yes, continue', te: 'అవును, కొనసాగించు' },
  scanToOpen: { en: 'Scan with your phone camera', te: 'మీ ఫోన్ కెమెరాతో స్కాన్ చేయండి' },
} satisfies Record<string, Bilingual>;
