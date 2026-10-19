// ===== Edit these details =====
window.WEDDING = {
  partner1: "Amara",
  partner2: "Ravi",
  tagline: "Together with their families, invite you to celebrate their wedding",
  start: "2027-02-14T17:00:00+05:30",     // ceremony start, with the couple's UTC offset
  hostZone: "Asia/Colombo",               // the wedding's local time zone
  durationMinutes: 300,
  rsvpBy: "2027-01-31",
  venue: {
    name: "The Garden Pavilion",
    address: "123 Lake Road, Colombo 07, Sri Lanka",
    mapUrl: "",                           // optional Google Maps link; built from the address if empty
  },
  dressCode: "Garden formal, soft colours welcome",
  whatsapp: "",                           // couple's number in international format, digits only, e.g. "94771234567"
  email: "",                              // fallback for RSVPs if there is no WhatsApp number
  story: "We met on a rainy afternoon in a bookshop and have been reading the same chapters ever since. " +
         "We can't wait to celebrate the next one with you.",
  programme: [                            // minutes after start
    { at: -30, title: "Guests arrive",   detail: "Welcome drinks in the garden" },
    { at: 0,   title: "Ceremony",        detail: "Vows, rings and the first kiss" },
    { at: 60,  title: "Cocktail hour",   detail: "Photos, music and canapés" },
    { at: 120, title: "Dinner & toasts", detail: "Speeches from family and friends" },
    { at: 210, title: "First dance",     detail: "Then the dance floor is open" },
  ],
};
// ==============================

window.SITE = {
  // The Google Apps Script web app URL (see apps-script/Code.gs). Until it is set,
  // replies go by WhatsApp / email and the admin page can't open.
  scriptUrl: "",
  // The invitation's public address, used to build personal links. Leave empty
  // to use the address the admin page is opened from.
  siteUrl: "https://itsashan98.github.io/wedding-invite/",
};
