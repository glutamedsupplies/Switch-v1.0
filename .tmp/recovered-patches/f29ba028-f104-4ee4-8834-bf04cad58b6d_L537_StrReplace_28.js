@keyframes admin-biometric-firmware-snackbar-indeterminate {
  from { transform: translateX(-12%); }
  to { transform: translateX(72%); }
}

.admin-biometric-firmware-updated-overlay {
  position: fixed;
  inset: 0;
  z-index: 12060;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.42);
  opacity: 0;
  pointer-events: none;
  transition: opacity 180ms ease;
}

.admin-biometric-firmware-updated-overlay.is-open {
  opacity: 1;
  pointer-events: auto;
}

.admin-biometric-firmware-updated-overlay[hidden] {
  display: none !important;
}

.admin-biometric-firmware-updated-modal {
  width: min(360px, 100%);
  padding: 28px 24px 24px;
  border-radius: 16px;
  background: #ffffff;
  color: #0f172a;
  text-align: center;
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.22);
  transform: translateY(12px) scale(0.98);
  transition: transform 180ms ease;
}

.admin-biometric-firmware-updated-overlay.is-open .admin-biometric-firmware-updated-modal {
  transform: translateY(0) scale(1);
}

.admin-biometric-firmware-updated-modal__icon {
  display: inline-grid;
  place-items: center;
  width: 56px;
  height: 56px;
  margin: 0 auto 14px;
  border-radius: 999px;
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
}

.admin-biometric-firmware-updated-modal__icon svg {
  width: 28px;
  height: 28px;
}

.admin-biometric-firmware-updated-modal h2 {
  margin: 0 0 8px;
  font: 700 20px/1.25 "Segoe UI", sans-serif;
  color: #0f172a;
}

.admin-biometric-firmware-updated-modal p {
  margin: 0;
  font: 400 14px/1.45 "Segoe UI", sans-serif;
  color: #475569;
}

.admin-biometric-button.is-primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}