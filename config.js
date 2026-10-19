// ===== Edit these details =====
window.WEDDING = {
  partner1: "Ashan",
  partner2: "Sanduni",
  tagline: "Together with their families, invite you to celebrate their wedding",
  start: "2027-06-12T17:00:00+02:00",     // ceremony start, with the couple's UTC offset
  hostZone: "Europe/Rome",               // the wedding's local time zone
  durationMinutes: 360,
  rsvpBy: "2027-04-30",
  venue: {
    name: "Villa del Balbianello",
    address: "Via Comoedia 5, 22016 Tremezzina, Lake Como, Italy",
    mapUrl: "",                           // optional Google Maps link; built from the address if empty
  },
  dressCode: "Black tie · a summer evening by the lake",
  whatsapp: "",                           // couple's number in international format, digits only, e.g. "94771234567"
  email: "",                              // fallback for RSVPs if there is no WhatsApp number
  story: "We met on a rainy afternoon in a bookshop and have been reading the same chapters ever since. " +
         "We can't wait to celebrate the next one with you.",
  programme: [                            // minutes after start
    { at: -30, title: "Benvenuti",     detail: "Welcome drinks on the lakeside terrace" },
    { at: 0,   title: "The Ceremony",  detail: "Vows in the villa gardens above the water" },
    { at: 60,  title: "Aperitivo",     detail: "Spritz, music and golden-hour photographs" },
    { at: 120, title: "La Cena",       detail: "Dinner beneath the loggia and the stars" },
    { at: 240, title: "Dancing",       detail: "Until the last boat home" },
  ],
};
// ==============================

window.SITE = {
  // Your Supabase project (Project Settings ▸ API). Run supabase.sql in it first.
  // Until these are set, replies go by WhatsApp / email and the admin page can't open.
  supabaseUrl: "https://fgcoqweebuiooqbsmrgs.supabase.co",                        // e.g. "https://abcdefghijkl.supabase.co"
  supabaseKey: "sb_publishable_v8fyLeCOGCSS-_snU-LP9g_aJNV5PCI",                        // the anon / publishable key (safe to be public)
  // The invitation's public address, used to build personal links. Leave empty
  // to use the address the admin page is opened from.
  siteUrl: "https://itsashan98.github.io/wedding-invite/",
};
