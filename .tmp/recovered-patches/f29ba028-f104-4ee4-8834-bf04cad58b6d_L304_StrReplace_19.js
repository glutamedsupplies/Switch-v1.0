.admin-biometric-card--firmware .admin-biometric-limit-note code {
  font: 10px/1.4 Consolas, "Courier New", monospace;
}

.admin-biometric-firmware-snackbar {
  position: fixed;
  right: max(18px, env(safe-area-inset-right));
  bottom: max(18px, env(safe-area-inset-bottom));
  z-index: 12040;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px 12px;
  width: min(430px, calc(100vw - 36px));
  padding: 14px 15px 0;
  border: 0;
  border-radius: 8px;
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.14);
  opacity: 0;
  transform: translateY(14px);
  pointer-events: none;
  overflow: hidden;
  transition:
    opacity 170ms ease,
    transform 170ms ease;
}

.admin-biometric-firmware-snackbar.is-visible {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.admin-biometric-firmware-snackbar__icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 999px;
  background: rgba(var(--accent-rgb, 21, 154, 177), 0.12);
  color: var(--accent, #159ab1);
}

.admin-biometric-firmware-snackbar__icon svg {
  width: 18px;
  height: 18px;
}

.admin-biometric-firmware-snackbar__copy {
  display: grid;
  gap: 3px;
  min-width: 0;
  padding-bottom: 14px;
}

.admin-biometric-firmware-snackbar__copy strong {
  font-size: 13px;
  line-height: 1.25;
}

.admin-biometric-firmware-snackbar__copy > span {
  color: #64748b;
  font-size: 11px;
  line-height: 1.45;
}

.admin-biometric-firmware-snackbar__progress {
  grid-column: 1 / -1;
  height: 4px;
  margin: 0 -15px;
  background: rgba(15, 23, 42, 0.08);
}

.admin-biometric-firmware-snackbar__progress-bar {
  display: block;
  width: 0;
  height: 100%;
  background: var(--accent, #159ab1);
  transition: width 180ms ease;
}

.admin-biometric-firmware-snackbar__progress-bar.is-indeterminate {
  width: 42% !important;
  animation: admin-biometric-firmware-snackbar-indeterminate 1.1s ease-in-out infinite alternate;
}

.admin-biometric-firmware-snackbar.is-success .admin-biometric-firmware-snackbar__progress-bar {
  background: #16a34a;
}

.admin-biometric-firmware-snackbar.is-error .admin-biometric-firmware-snackbar__progress-bar {
  background: #dc2626;
}

.admin-biometric-firmware-snackbar.is-error .admin-biometric-firmware-snackbar__icon {
  background: rgba(220, 38, 38, 0.12);
  color: #dc2626;
}

.admin-biometric-firmware-snackbar.is-success .admin-biometric-firmware-snackbar__icon {
  background: rgba(22, 163, 74, 0.12);
  color: #16a34a;
}

@keyframes admin-biometric-firmware-snackbar-indeterminate {
  from { transform: translateX(-8%); }
  to { transform: translateX(220%); }
}