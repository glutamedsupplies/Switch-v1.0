(() => {
  "use strict";

  /**
   * Super Admin country identity helpers.
   * Maps phone dial codes (accounts.country_code) → ISO name + flag for SA identification.
   * Mirrors lib/data/country_dial_codes.dart (PH first).
   */
  const COUNTRY_DIAL_CODES = Object.freeze([
    Object.freeze({ iso2: "PH", name: "Philippines", dialCode: "+63", flag: "🇵🇭" }),
    Object.freeze({ iso2: "US", name: "United States", dialCode: "+1", flag: "🇺🇸" }),
    Object.freeze({ iso2: "CA", name: "Canada", dialCode: "+1", flag: "🇨🇦" }),
    Object.freeze({ iso2: "GB", name: "United Kingdom", dialCode: "+44", flag: "🇬🇧" }),
    Object.freeze({ iso2: "AU", name: "Australia", dialCode: "+61", flag: "🇦🇺" }),
    Object.freeze({ iso2: "NZ", name: "New Zealand", dialCode: "+64", flag: "🇳🇿" }),
    Object.freeze({ iso2: "SG", name: "Singapore", dialCode: "+65", flag: "🇸🇬" }),
    Object.freeze({ iso2: "MY", name: "Malaysia", dialCode: "+60", flag: "🇲🇾" }),
    Object.freeze({ iso2: "ID", name: "Indonesia", dialCode: "+62", flag: "🇮🇩" }),
    Object.freeze({ iso2: "TH", name: "Thailand", dialCode: "+66", flag: "🇹🇭" }),
    Object.freeze({ iso2: "VN", name: "Vietnam", dialCode: "+84", flag: "🇻🇳" }),
    Object.freeze({ iso2: "JP", name: "Japan", dialCode: "+81", flag: "🇯🇵" }),
    Object.freeze({ iso2: "KR", name: "South Korea", dialCode: "+82", flag: "🇰🇷" }),
    Object.freeze({ iso2: "CN", name: "China", dialCode: "+86", flag: "🇨🇳" }),
    Object.freeze({ iso2: "HK", name: "Hong Kong", dialCode: "+852", flag: "🇭🇰" }),
    Object.freeze({ iso2: "TW", name: "Taiwan", dialCode: "+886", flag: "🇹🇼" }),
    Object.freeze({ iso2: "IN", name: "India", dialCode: "+91", flag: "🇮🇳" }),
    Object.freeze({ iso2: "PK", name: "Pakistan", dialCode: "+92", flag: "🇵🇰" }),
    Object.freeze({ iso2: "BD", name: "Bangladesh", dialCode: "+880", flag: "🇧🇩" }),
    Object.freeze({ iso2: "AE", name: "United Arab Emirates", dialCode: "+971", flag: "🇦🇪" }),
    Object.freeze({ iso2: "SA", name: "Saudi Arabia", dialCode: "+966", flag: "🇸🇦" }),
    Object.freeze({ iso2: "QA", name: "Qatar", dialCode: "+974", flag: "🇶🇦" }),
    Object.freeze({ iso2: "KW", name: "Kuwait", dialCode: "+965", flag: "🇰🇼" }),
    Object.freeze({ iso2: "BH", name: "Bahrain", dialCode: "+973", flag: "🇧🇭" }),
    Object.freeze({ iso2: "OM", name: "Oman", dialCode: "+968", flag: "🇴🇲" }),
    Object.freeze({ iso2: "EG", name: "Egypt", dialCode: "+20", flag: "🇪🇬" }),
    Object.freeze({ iso2: "ZA", name: "South Africa", dialCode: "+27", flag: "🇿🇦" }),
    Object.freeze({ iso2: "NG", name: "Nigeria", dialCode: "+234", flag: "🇳🇬" }),
    Object.freeze({ iso2: "KE", name: "Kenya", dialCode: "+254", flag: "🇰🇪" }),
    Object.freeze({ iso2: "GH", name: "Ghana", dialCode: "+233", flag: "🇬🇭" }),
    Object.freeze({ iso2: "DE", name: "Germany", dialCode: "+49", flag: "🇩🇪" }),
    Object.freeze({ iso2: "FR", name: "France", dialCode: "+33", flag: "🇫🇷" }),
    Object.freeze({ iso2: "IT", name: "Italy", dialCode: "+39", flag: "🇮🇹" }),
    Object.freeze({ iso2: "ES", name: "Spain", dialCode: "+34", flag: "🇪🇸" }),
    Object.freeze({ iso2: "PT", name: "Portugal", dialCode: "+351", flag: "🇵🇹" }),
    Object.freeze({ iso2: "NL", name: "Netherlands", dialCode: "+31", flag: "🇳🇱" }),
    Object.freeze({ iso2: "BE", name: "Belgium", dialCode: "+32", flag: "🇧🇪" }),
    Object.freeze({ iso2: "CH", name: "Switzerland", dialCode: "+41", flag: "🇨🇭" }),
    Object.freeze({ iso2: "AT", name: "Austria", dialCode: "+43", flag: "🇦🇹" }),
    Object.freeze({ iso2: "SE", name: "Sweden", dialCode: "+46", flag: "🇸🇪" }),
    Object.freeze({ iso2: "NO", name: "Norway", dialCode: "+47", flag: "🇳🇴" }),
    Object.freeze({ iso2: "DK", name: "Denmark", dialCode: "+45", flag: "🇩🇰" }),
    Object.freeze({ iso2: "FI", name: "Finland", dialCode: "+358", flag: "🇫🇮" }),
    Object.freeze({ iso2: "IE", name: "Ireland", dialCode: "+353", flag: "🇮🇪" }),
    Object.freeze({ iso2: "PL", name: "Poland", dialCode: "+48", flag: "🇵🇱" }),
    Object.freeze({ iso2: "CZ", name: "Czech Republic", dialCode: "+420", flag: "🇨🇿" }),
    Object.freeze({ iso2: "RO", name: "Romania", dialCode: "+40", flag: "🇷🇴" }),
    Object.freeze({ iso2: "GR", name: "Greece", dialCode: "+30", flag: "🇬🇷" }),
    Object.freeze({ iso2: "TR", name: "Turkey", dialCode: "+90", flag: "🇹🇷" }),
    Object.freeze({ iso2: "RU", name: "Russia", dialCode: "+7", flag: "🇷🇺" }),
    Object.freeze({ iso2: "UA", name: "Ukraine", dialCode: "+380", flag: "🇺🇦" }),
    Object.freeze({ iso2: "BR", name: "Brazil", dialCode: "+55", flag: "🇧🇷" }),
    Object.freeze({ iso2: "MX", name: "Mexico", dialCode: "+52", flag: "🇲🇽" }),
    Object.freeze({ iso2: "AR", name: "Argentina", dialCode: "+54", flag: "🇦🇷" }),
    Object.freeze({ iso2: "CL", name: "Chile", dialCode: "+56", flag: "🇨🇱" }),
    Object.freeze({ iso2: "CO", name: "Colombia", dialCode: "+57", flag: "🇨🇴" }),
    Object.freeze({ iso2: "PE", name: "Peru", dialCode: "+51", flag: "🇵🇪" }),
    Object.freeze({ iso2: "IL", name: "Israel", dialCode: "+972", flag: "🇮🇱" }),
    Object.freeze({ iso2: "JO", name: "Jordan", dialCode: "+962", flag: "🇯🇴" }),
    Object.freeze({ iso2: "LB", name: "Lebanon", dialCode: "+961", flag: "🇱🇧" }),
    Object.freeze({ iso2: "KH", name: "Cambodia", dialCode: "+855", flag: "🇰🇭" }),
    Object.freeze({ iso2: "LA", name: "Laos", dialCode: "+856", flag: "🇱🇦" }),
    Object.freeze({ iso2: "MM", name: "Myanmar", dialCode: "+95", flag: "🇲🇲" }),
    Object.freeze({ iso2: "BN", name: "Brunei", dialCode: "+673", flag: "🇧🇳" }),
    Object.freeze({ iso2: "MO", name: "Macau", dialCode: "+853", flag: "🇲🇴" }),
  ]);

  const PHILIPPINES = COUNTRY_DIAL_CODES[0];

  function normalizeDialCode(value) {
    const digits = String(value ?? "").replace(/\D/g, "");
    return digits ? `+${digits}` : "+63";
  }

  function resolveCountryFromDialCode(value) {
    const dial = normalizeDialCode(value);
    const matches = COUNTRY_DIAL_CODES.filter((entry) => entry.dialCode === dial);
    if (!matches.length) {
      return {
        iso2: "",
        name: `Country ${dial}`,
        dialCode: dial,
        flag: "🌐",
        ambiguous: false,
        known: false,
      };
    }
    if (matches.length === 1) {
      return { ...matches[0], ambiguous: false, known: true };
    }
    // Shared dial codes (e.g. +1 US/CA): keep primary match, mark ambiguous.
    return {
      ...matches[0],
      name: matches.map((entry) => entry.name).join(" / "),
      ambiguous: true,
      known: true,
      aliases: matches,
    };
  }

  function resolveCountryFromRecord(record) {
    const dial =
      record?.countryCode ??
      record?.country_code ??
      record?.phoneCountryCode ??
      record?.dialCode ??
      record?.address?.countryCode ??
      "+63";
    const resolved = resolveCountryFromDialCode(dial);
    const explicitName = String(
      record?.countryName ??
        record?.country ??
        record?.address?.country ??
        "",
    )
      .replace(/\s+/g, " ")
      .trim();
    if (explicitName && !resolved.known) {
      return {
        ...resolved,
        name: explicitName,
      };
    }
    return resolved;
  }

  function formatCountryTableLabel(country) {
    const entry = country && typeof country === "object" ? country : resolveCountryFromDialCode(country);
    if (!entry) return "—";
    return String(entry.name || "").trim() || entry.dialCode || "—";
  }

  function formatCountryFullLabel(country) {
    const entry = country && typeof country === "object" ? country : resolveCountryFromDialCode(country);
    if (!entry) return "—";
    return String(entry.name || "").trim() || entry.dialCode || "—";
  }

  function formatCountrySearchText(country) {
    const entry = country && typeof country === "object" ? country : resolveCountryFromDialCode(country);
    if (!entry) return "";
    return [entry.name, entry.iso2, entry.dialCode, entry.flag]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  }

  function getCountryFlagUrl(iso2, size = "w40") {
    const code = String(iso2 || "").trim().toLowerCase();
    if (!/^[a-z]{2}$/.test(code)) {
      return "";
    }
    const normalizedSize = String(size || "w40").trim() || "w40";
    return `https://flagcdn.com/${encodeURIComponent(normalizedSize)}/${encodeURIComponent(code)}.png`;
  }

  function createCountryFlagElement(country, options = {}) {
    const entry = country && typeof country === "object" ? country : resolveCountryFromDialCode(country);
    const size = options.size || "w40";
    const className = options.className || "sa-country-flag";
    const iso2 = String(entry?.iso2 || "").trim().toUpperCase();
    const url = getCountryFlagUrl(iso2, size);
    if (url) {
      const image = document.createElement("img");
      image.className = className;
      image.src = url;
      image.alt = "";
      image.width = options.width || 20;
      image.height = options.height || 15;
      image.loading = "lazy";
      image.decoding = "async";
      image.setAttribute("aria-hidden", "true");
      image.title = formatCountryFullLabel(entry);
      image.addEventListener("error", () => {
        image.replaceWith(createCountryFlagFallback(entry, className));
      }, { once: true });
      return image;
    }
    return createCountryFlagFallback(entry, className);
  }

  function createCountryFlagFallback(country, className = "sa-country-flag") {
    const entry = country && typeof country === "object" ? country : resolveCountryFromDialCode(country);
    const fallback = document.createElement("span");
    fallback.className = `${className} is-fallback`;
    fallback.textContent = entry?.flag || "🌐";
    fallback.setAttribute("aria-hidden", "true");
    return fallback;
  }

  window.SuperAdminCountries = Object.freeze({
    all: COUNTRY_DIAL_CODES,
    philippines: PHILIPPINES,
    normalizeDialCode,
    resolveCountryFromDialCode,
    resolveCountryFromRecord,
    formatCountryTableLabel,
    formatCountryFullLabel,
    formatCountrySearchText,
    getCountryFlagUrl,
    createCountryFlagElement,
  });
})();