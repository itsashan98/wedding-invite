(() => {
  const W = window.WEDDING;
  const $ = (id) => document.getElementById(id);
  const start = new Date(W.start);
  const end = new Date(start.getTime() + W.durationMinutes * 60000);
  const names = `${W.partner1} & ${W.partner2}`;

  document.title = `${names} · Wedding Invitation`;
  $("tagline").textContent = W.tagline;
  $("p1").textContent = W.partner1;
  $("p2").textContent = W.partner2;
  $("sign").textContent = names;
  $("monogram").textContent = `${W.partner1[0]}·${W.partner2[0]}`;
  $("story-text").textContent = W.story;

  // Date and time in the wedding's own time zone
  const fmt = (d, opts) => d.toLocaleString(undefined, opts);
  $("date-long").textContent = fmt(start, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: W.hostZone });
  $("local-time").textContent = `${fmt(start, { hour: "numeric", minute: "2-digit", timeZone: W.hostZone })} · ${W.venue.name}`;

  // Countdown
  const tick = () => {
    let s = Math.max(0, Math.floor((start - Date.now()) / 1000));
    if (s === 0) {
      $("countdown").innerHTML = Date.now() < end
        ? "<p class='note'>We're celebrating right now!</p>"
        : "<p class='note'>Thank you for celebrating with us.</p>";
      return clearInterval(timer);
    }
    $("cd-d").textContent = Math.floor(s / 86400); s %= 86400;
    $("cd-h").textContent = Math.floor(s / 3600);  s %= 3600;
    $("cd-m").textContent = Math.floor(s / 60);
    $("cd-s").textContent = s % 60;
  };
  const timer = setInterval(tick, 1000);
  tick();

  // Programme
  const tl = $("timeline");
  W.programme.forEach((p) => {
    const t = new Date(start.getTime() + p.at * 60000);
    const li = document.createElement("li");
    li.innerHTML = `<time></time><div><strong></strong><span></span></div>`;
    li.querySelector("time").textContent = fmt(t, { hour: "numeric", minute: "2-digit", timeZone: W.hostZone });
    li.querySelector("time").dateTime = t.toISOString();
    li.querySelector("strong").textContent = p.title;
    li.querySelector("span").textContent = p.detail;
    tl.appendChild(li);
  });

  // Venue
  const mapUrl = W.venue.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(W.venue.name + ", " + W.venue.address)}`;
  $("venue-name").textContent = W.venue.name;
  $("venue-address").textContent = W.venue.address;
  $("map-btn").href = mapUrl;
  if (W.dressCode) $("dress-code").textContent = `Dress code: ${W.dressCode}`;
  else $("dress-code").hidden = true;

  // RSVP: saved to the couple's guest list (Supabase) when it is connected,
  // otherwise sent as a pre-filled WhatsApp message or email.
  const B = window.Backend;
  let token = new URLSearchParams(location.search).get("g") || "";
  try { if (!token) token = localStorage.getItem("invite.token") || ""; } catch {}

  const status = (msg) => { $("rsvp-status").textContent = msg; };
  const thanks = (answer) => answer === "no"
    ? "Thank you for letting us know. You'll be missed!"
    : "Thank you! We can't wait to celebrate with you.";

  // A personal link (?g=token) greets the guest and brings back any earlier reply.
  if (B.ready && token) {
    B.guest(token).then((guest) => {
      if (!guest) return;
      if (guest.name) {
        $("greeting").textContent = `Dear ${guest.name},`;
        $("greeting").hidden = false;
        $("r-name").value = guest.name;
      }
      if (guest.answer) {
        $("r-count").value = guest.count || 1;
        $("r-msg").value = guest.message || "";
        document.querySelector(`input[name=answer][value=${guest.answer === "no" ? "no" : "yes"}]`).checked = true;
        $("r-send").textContent = "Update reply";
        status(`We have your reply. ${thanks(guest.answer)}`);
      }
    }).catch(() => {});
  }

  $("rsvp-by").textContent = `Please reply by ${fmt(new Date(W.rsvpBy + "T12:00:00"), { day: "numeric", month: "long", year: "numeric" })}`;
  $("rsvp-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const reply = {
      name: String(f.get("name")).trim(),
      answer: f.get("answer"),
      count: Number(f.get("guests")) || 1,
      message: String(f.get("message") || "").trim(),
    };

    if (B.ready) {
      $("r-send").disabled = true;
      status("Sending…");
      try {
        token = await B.rsvp({ token, ...reply });
        try { localStorage.setItem("invite.token", token); } catch {}
        $("r-send").textContent = "Update reply";
        status(thanks(reply.answer));
      } catch {
        status("Sorry, that didn't go through. Please try again.");
      } finally {
        $("r-send").disabled = false;
      }
      return;
    }

    const lines = [
      `RSVP for ${names}'s wedding`,
      `Name: ${reply.name}`,
      `Reply: ${reply.answer === "no" ? "Regretfully declines" : "Joyfully accepts"}`,
      `Guests: ${reply.answer === "no" ? 0 : reply.count}`,
    ];
    if (reply.message) lines.push(`Note: ${reply.message}`);
    const text = lines.join("\n");

    let url;
    if (W.whatsapp) url = `https://wa.me/${W.whatsapp}?text=${encodeURIComponent(text)}`;
    else if (W.email) url = `mailto:${W.email}?subject=${encodeURIComponent(`RSVP: ${reply.name}`)}&body=${encodeURIComponent(text)}`;

    if (url) {
      window.open(url, "_blank", "noopener");
      status("Thank you! Just press send in the window that opened.");
    } else {
      status("RSVPs open soon. The couple hasn't added a contact yet.");
    }
  });

  // Add to calendar (.ics download)
  $("add-cal").addEventListener("click", () => {
    const stamp = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Wedding Invite//EN",
      "BEGIN:VEVENT",
      `UID:${stamp(start)}-${W.partner1}-${W.partner2}@wedding`,
      `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(end)}`,
      `SUMMARY:${names}'s Wedding`,
      `LOCATION:${(W.venue.name + ", " + W.venue.address).replace(/([,;\\])/g, "\\$1")}`,
      `URL:${mapUrl}`,
      "END:VEVENT", "END:VCALENDAR",
    ].join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    a.download = `${W.partner1}-${W.partner2}-wedding.ics`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  // Scroll story: as the guest scrolls through the opening, the lake rises into
  // view, the sun sets, night falls and the chapters take turns on stage.
  const story = $("story-scroll");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const ease = (v) => v * v * (3 - 2 * v);
  const span = (p, a, b) => ease(clamp((p - a) / (b - a)));
  const chapters = [...story.querySelectorAll(".chapter")];
  const windows = [[-1, 0, .2, .3], [.3, .4, .54, .62], [.7, .8, 2, 3]];   // fade in, full, fade out, gone

  const stars = $("stars");
  for (let i = 0; i < 90; i++) {
    const st = document.createElement("i");
    st.style.left = Math.random() * 100 + "%";
    st.style.top = Math.random() * 100 + "%";
    st.style.animationDelay = Math.random() * 3 + "s";
    if (Math.random() < .2) st.style.width = st.style.height = "3px";
    stars.appendChild(st);
  }

  const set = (vars) => Object.entries(vars).forEach(([k, v]) => story.style.setProperty("--" + k, v.toFixed(4)));
  const render = () => {
    const total = story.offsetHeight - innerHeight;
    const p = clamp(-story.getBoundingClientRect().top / (total || 1));
    set({
      p, rise: span(p, 0, .3), sun: span(p, .3, .75),
      dusk: span(p, .34, .6), night: span(p, .6, .88),
    });
    chapters.forEach((ch, i) => {
      const [a, b, c, d] = windows[i];
      const o = Math.min(span(p, a, b), 1 - span(p, c, d));
      ch.style.opacity = o.toFixed(3);
      ch.style.transform = `translateY(${((1 - o) * (p < b ? 30 : -30)).toFixed(1)}px)`;
    });
  };
  if (reduced) {
    set({ p: 0, rise: 1, sun: 0, dusk: 0, night: 0 });
  } else {
    let queued = false;
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; render(); });
    };
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    render();
  }

  // Storybook pages: each card tilts up into place as it scrolls into view
  document.querySelectorAll(".timeline li").forEach((li, i) => li.style.setProperty("--i", i));
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
  }), { threshold: 0.15 });
  document.querySelectorAll(".card").forEach((c) => io.observe(c));

  // Falling petals
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const box = document.querySelector(".petals");
    const drop = () => {
      const p = document.createElement("div");
      p.className = "petal";
      const dur = 8 + Math.random() * 7;
      p.style.left = Math.random() * 100 + "vw";
      p.style.animationDuration = dur + "s";
      p.style.setProperty("--drift", (Math.random() * 200 - 100) + "px");
      p.style.setProperty("--spin", (Math.random() * 720 - 360) + "deg");
      p.style.transform = `scale(${0.6 + Math.random() * 0.7})`;
      box.appendChild(p);
      setTimeout(() => p.remove(), dur * 1000);
    };
    setInterval(drop, 1400);
  }
})();
