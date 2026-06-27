(function initializePasswordToggles() {
  const toggleButtons = Array.from(document.querySelectorAll("[data-password-toggle]"));

  function getPasswordToggleIcon(isVisible) {
    if (isVisible) {
      return `
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 12C2 12 5.63636 5 12 5C18.3636 5 22 12 22 12C22 12 18.3636 19 12 19C5.63636 19 2 12 2 12Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="12" cy="12" r="3" stroke-width="2"/>
        </svg>
      `;
    }

    return `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 2L22 22" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M6.71277 6.7226C3.66479 8.79527 2 12 2 12C2 12 5.63636 19 12 19C14.0503 19 15.8174 18.2734 17.2711 17.2884M11 5.05822C11.3254 5.02013 11.6588 5 12 5C18.3636 5 22 12 22 12C22 12 21.3082 13.3317 20 14.8335" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M14 14.2362C13.4692 14.7112 12.7684 15.0001 12 15.0001C10.3431 15.0001 9 13.657 9 12.0001C9 11.1764 9.33193 10.4303 9.86932 9.88818" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
  }

  function syncPasswordToggle(button, input) {
    const isVisible = input.type === "text";
    button.innerHTML = getPasswordToggleIcon(isVisible);
    button.classList.toggle("is-visible", isVisible);
    button.setAttribute("aria-label", isVisible ? "Hide password" : "Show password");
    button.setAttribute("title", isVisible ? "Hide password" : "Show password");
    button.setAttribute("aria-pressed", isVisible ? "true" : "false");
  }

  toggleButtons.forEach((button) => {
    const targetId = String(button.getAttribute("data-password-toggle") || "").trim();
    const input = targetId
      ? document.getElementById(targetId)
      : button.parentElement?.querySelector('input[type="password"], input[type="text"]');

    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    syncPasswordToggle(button, input);

    button.addEventListener("click", () => {
      input.type = input.type === "password" ? "text" : "password";
      syncPasswordToggle(button, input);
      input.focus({ preventScroll: true });
      const valueLength = input.value.length;
      if (typeof input.setSelectionRange === "function") {
        input.setSelectionRange(valueLength, valueLength);
      }
    });
  });
})();
