.admin-biometric-firmware-updated-overlay {
  z-index: 12060;
}

.admin-biometric-firmware-updated-overlay.validation-modal-overlay {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.24);
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
}

.admin-biometric-firmware-updated-modal.validation-modal--success {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-areas: "icon" "body";
  justify-items: center;
  width: min(370px, calc(100vw - 32px));
  max-width: none;
  min-height: 220px;
  padding: 26px 22px 22px;
  border: 1px solid #eef2f7;
  border-radius: 8px;
  background: #ffffff;
  text-align: center;
  box-shadow: 0 22px 55px rgba(15, 23, 42, 0.18);
}

.admin-biometric-firmware-updated-modal.validation-modal--success .validation-modal__top {
  grid-area: icon;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  margin: 0 auto;
}

.admin-biometric-firmware-updated-modal.validation-modal--success .validation-modal__body {
  grid-area: body;
  width: 100%;
  margin-top: 0;
  text-align: center;
}

.admin-biometric-firmware-updated-modal.validation-modal--success .validation-modal__icon,
.admin-biometric-firmware-updated-modal.validation-modal--success .product-validation-lottie-check,
.admin-biometric-firmware-updated-modal.validation-modal--success [data-biometric-firmware-updated-lottie] {
  display: block;
  width: 72px;
  height: 72px;
  margin: 0 auto;
}

.admin-biometric-firmware-updated-modal.validation-modal--success .validation-modal__icon {
  color: var(--success, #2f7d4f);
}

.admin-biometric-firmware-updated-modal.validation-modal--success .validation-modal__title {
  margin: 0;
  color: #111827;
  font-size: 22px;
  font-weight: 500;
  line-height: 1.2;
  text-align: center;
}

.admin-biometric-firmware-updated-modal.validation-modal--success .validation-modal__copy {
  margin: 8px 0 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.5;
  text-align: center;
}