.admin-biometric-wrench.is-open svg {
  transform: rotate(90deg);
}

.admin-biometric-hero__status > [hidden] {
  display: none !important;
}

.admin-biometric-firmware-lock-note {
  margin: 0 0 14px;
  padding: 12px 14px;
  border: 1px solid rgba(217, 119, 6, 0.35);
  border-radius: 10px;
  background: rgba(251, 191, 36, 0.12);
  color: #92400e;
  font-size: 0.92rem;
  line-height: 1.45;
}

.admin-biometric-firmware-lock-note[hidden] {
  display: none !important;
}

.admin-biometric-settings.is-firmware-locked .admin-biometric-card:not(.admin-biometric-card--firmware),
.admin-biometric-settings.is-firmware-locked .admin-biometric-customization-grid,
.admin-biometric-settings.is-firmware-locked .admin-biometric-console,
.admin-biometric-settings.is-firmware-locked .admin-biometric-footer {
  opacity: 0.48;
  pointer-events: none;
  user-select: none;
  filter: grayscale(0.15);
}