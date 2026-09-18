(function () {
  const pendingAccessPath = "/employee_access_pending.html";
  const script =
    document.currentScript ||
    document.querySelector("script[data-employee-access-guard]");
  const pendingNavClass = "gms-employee-access-nav-pending";
  const pendingNavStyleId = "gms-employee-access-nav-pending-style";
  const employeeAccessUpdatedStorageKey = "gms-employee-access-updated-at";
  const employeeLeaveRequestsStorageKey = "gms-employee-leave-requests";
  const employeeLeaveRequestsChangedEventName = "gms-employee-leave-requests-changed";
  const liveChatNavBadgeRefreshIntervalMs = 5000;
  let liveChatUnreadCount = 0;
  let liveChatNavBadgeRefreshInFlight = false;
  let liveChatNavBadgeRefreshQueued = false;
  let liveChatNavBadgeSyncScheduled = false;
  const dashboardNavIconOutline = `
    <svg viewBox="0 -960 960 960" fill="none" aria-hidden="true">
      <path d="M510-600v-210q0-12.75 8.63-21.38Q527.25-840 540-840h270q12.75 0 21.38 8.62Q840-822.75 840-810v210q0 12.75-8.62 21.37Q822.75-570 810-570H540q-12.75 0-21.37-8.63Q510-587.25 510-600ZM120-480v-330q0-12.75 8.63-21.38Q137.25-840 150-840h270q12.75 0 21.38 8.62Q450-822.75 450-810v330q0 12.75-8.62 21.37Q432.75-450 420-450H150q-12.75 0-21.37-8.63Q120-467.25 120-480Zm390 330v-330q0-12.75 8.63-21.38Q527.25-510 540-510h270q12.75 0 21.38 8.62Q840-492.75 840-480v330q0 12.75-8.62 21.37Q822.75-120 810-120H540q-12.75 0-21.37-8.63Q510-137.25 510-150Zm-390 0v-210q0-12.75 8.63-21.38Q137.25-390 150-390h270q12.75 0 21.38 8.62Q450-372.75 450-360v210q0 12.75-8.62 21.37Q432.75-120 420-120H150q-12.75 0-21.37-8.63Q120-137.25 120-150Zm60-360h210v-270H180v270Zm390 330h210v-270H570v270Zm0-450h210v-150H570v150ZM180-180h210v-150H180v150Zm210-330Zm180-120Zm0 180ZM390-330Z" fill="currentColor"></path>
    </svg>`;
  const dashboardNavIconFilled = `
    <svg viewBox="0 -960 960 960" fill="none" aria-hidden="true">
      <path d="M540-570q-12.75 0-21.37-8.63Q510-587.25 510-600v-210q0-12.75 8.63-21.38Q527.25-840 540-840h270q12.75 0 21.38 8.62Q840-822.75 840-810v210q0 12.75-8.62 21.37Q822.75-570 810-570H540ZM150-450q-12.75 0-21.37-8.63Q120-467.25 120-480v-330q0-12.75 8.63-21.38Q137.25-840 150-840h270q12.75 0 21.38 8.62Q450-822.75 450-810v330q0 12.75-8.62 21.37Q432.75-450 420-450H150Zm390 330q-12.75 0-21.37-8.63Q510-137.25 510-150v-330q0-12.75 8.63-21.38Q527.25-510 540-510h270q12.75 0 21.38 8.62Q840-492.75 840-480v330q0 12.75-8.62 21.37Q822.75-120 810-120H540Zm-390 0q-12.75 0-21.37-8.63Q120-137.25 120-150v-210q0-12.75 8.63-21.38Q137.25-390 150-390h270q12.75 0 21.38 8.62Q450-372.75 450-360v210q0 12.75-8.62 21.37Q432.75-120 420-120H150Z" fill="currentColor"></path>
    </svg>`;
  const storeNavIconOutline = `
    <svg viewBox="0 -960 960 960" fill="none" aria-hidden="true">
      <path d="M160-120q-24 0-42-18t-18-42v-356q0-12 4.5-23t12.5-20l72-81v-120q0-24 18-42t42-18h462q24 0 42 18t18 42v120l72 81q8 9 12.5 20t4.5 23v356q0 24-18 42t-42 18H160Zm0-60h640v-356l-80-91v-153H240v153l-80 91v356Zm120-40h120v-190h160v190h120v-280H280v280Zm-58-340h516l-53-60H275l-53 60Zm18-120h480v-100H240v100Z" fill="currentColor"></path>
    </svg>`;
  const storeNavIconFilled = `
    <svg viewBox="0 -960 960 960" fill="none" aria-hidden="true">
      <path d="M160-120q-24 0-42-18t-18-42v-356q0-12 4.5-23t12.5-20l72-81v-120q0-24 18-42t42-18h462q24 0 42 18t18 42v120l72 81q8 9 12.5 20t4.5 23v356q0 24-18 42t-42 18H160Zm120-100h120v-190h160v190h120v-280H280v280Zm-58-340h516l-53-60H275l-53 60Zm18-120h480v-100H240v100Z" fill="currentColor"></path>
    </svg>`;
  const employeeDashboardNavIconOutline = `
    <svg viewBox="0 -960 960 960" fill="none" aria-hidden="true">
      <path d="M510-600v-210q0-12.75 8.63-21.38Q527.25-840 540-840h270q12.75 0 21.38 8.62Q840-822.75 840-810v210q0 12.75-8.62 21.37Q822.75-570 810-570H540q-12.75 0-21.37-8.63Q510-587.25 510-600ZM120-480v-330q0-12.75 8.63-21.38Q137.25-840 150-840h270q12.75 0 21.38 8.62Q450-822.75 450-810v330q0 12.75-8.62 21.37Q432.75-450 420-450H150q-12.75 0-21.37-8.63Q120-467.25 120-480Zm390 330v-330q0-12.75 8.63-21.38Q527.25-510 540-510h270q12.75 0 21.38 8.62Q840-492.75 840-480v330q0 12.75-8.62 21.37Q822.75-120 810-120H540q-12.75 0-21.37-8.63Q510-137.25 510-150Zm-390 0v-210q0-12.75 8.63-21.38Q137.25-390 150-390h270q12.75 0 21.38 8.62Q450-372.75 450-360v210q0 12.75-8.62 21.37Q432.75-120 420-120H150q-12.75 0-21.37-8.63Q120-137.25 120-150Zm60-360h210v-270H180v270Zm390 330h210v-270H570v270Zm0-450h210v-150H570v150ZM180-180h210v-150H180v150Zm210-330Zm180-120Zm0 180ZM390-330Z" fill="currentColor"></path>
    </svg>`;
  const employeeDashboardNavIconFilled = `
    <svg viewBox="0 -960 960 960" fill="none" aria-hidden="true">
      <path d="M540-570q-12.75 0-21.37-8.63Q510-587.25 510-600v-210q0-12.75 8.63-21.38Q527.25-840 540-840h270q12.75 0 21.38 8.62Q840-822.75 840-810v210q0 12.75-8.62 21.37Q822.75-570 810-570H540ZM150-450q-12.75 0-21.37-8.63Q120-467.25 120-480v-330q0-12.75 8.63-21.38Q137.25-840 150-840h270q12.75 0 21.38 8.62Q450-822.75 450-810v330q0 12.75-8.62 21.37Q432.75-450 420-450H150Zm390 330q-12.75 0-21.37-8.63Q510-137.25 510-150v-330q0-12.75 8.63-21.38Q527.25-510 540-510h270q12.75 0 21.38 8.62Q840-492.75 840-480v330q0 12.75-8.62 21.37Q822.75-120 810-120H540Zm-390 0q-12.75 0-21.37-8.63Q120-137.25 120-150v-210q0-12.75 8.63-21.38Q137.25-390 150-390h270q12.75 0 21.38 8.62Q450-372.75 450-360v210q0 12.75-8.62 21.37Q432.75-120 420-120H150Z" fill="currentColor"></path>
    </svg>`;
  const orderNavIconOutline = `
    <svg class="dashboard-nav__order-cart-outline" viewBox="0 -960 960 960" fill="none" aria-hidden="true">
      <path d="M236-102.21q-21-21.21-21-51T236.21-204q21.21-21 51-21T338-203.79q21 21.21 21 51T337.79-102q-21.21 21-51 21T236-102.21Zm400 0q-21-21.21-21-51T636.21-204q21.21-21 51-21T738-203.79q21 21.21 21 51T737.79-102q-21.21 21-51 21T636-102.21ZM235-741l110 228h288l125-228H235Zm-30-60h589.07q22.97 0 34.95 21 11.98 21-.02 42L694-495q-11 19-28.56 30.5T627-453H324l-56 104h461q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H277q-42 0-60.5-28t.5-63l64-118-152-322H81q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32Q68.25-880 81-880h68q9 0 16.2 4.43 7.2 4.44 10.8 12.57l29 62Zm140 288h288-288Z" fill="currentColor"></path>
    </svg>`;
  const paymentPartnersNavIconOutline = `
    <svg viewBox="0 -960 960 960" fill="none" aria-hidden="true">
      <path d="M140-160q-24 0-42-18t-18-42v-520q0-24 18-42t42-18h680q24 0 42 18t18 42v520q0 24-18 42t-42 18H140Zm0-60h680v-520H140v520Zm110-80h275q17 0 25.5-14.5t.5-29.5L389-644q-3.61-8-10.83-12-7.23-4-15.17-4H250q-12.75 0-21.37 8.62Q220-642.75 220-630v300q0 12.75 8.63 21.37Q237.25-300 250-300Zm343-255h95q22.1 0 37.05-15.5Q740-586 740-608.07t-15.5-37Q709-660 687-660h-95q-22.1 0-37.05 14.93-14.95 14.93-14.95 37t15.5 37.57Q571-555 593-555ZM140-220v-520 520Z" fill="currentColor"></path>
    </svg>`;
  const deliveryPartnersNavIconOutline = `
    <svg viewBox="0 -960 960 960" fill="none" aria-hidden="true">
      <path d="M140.5-195.42Q106-229.83 106-279H70q-12.75 0-21.37-8.63Q40-296.25 40-309v-431q0-24 18-42t42-18h519q24.75 0 42.38 17.62Q679-764.75 679-740v107h75q14.25 0 27 6.37 12.75 6.38 21 17.63l112 149q3 3.75 4.5 8.25T920-442v133q0 12.75-8.62 21.37Q902.75-279 890-279h-41q0 49-34.38 83.5t-83.5 34.5q-49.12 0-83.62-34.42Q613-229.83 613-279H342q0 49-34.38 83.5t-83.5 34.5q-49.12 0-83.62-34.42ZM265-238q17-17 17-41t-17-41q-17-17-41-17t-41 17q-17 17-17 41t17 41q17 17 41 17t41-17ZM100-339h22q17-27 43.04-43t58-16q31.96 0 58.46 16.5T325-339h294v-401H100v401Zm672 101q17-17 17-41t-17-41q-17-17-41-17t-41 17q-17 17-17 41t17 41q17 17 41 17t41-17Zm-93-187h186L754-573h-75v148ZM360-540Z" fill="currentColor"></path>
    </svg>`;
  const userDataNavIconOutline = `
    <svg viewBox="0 -960 960 960" fill="none" aria-hidden="true">
      <path d="M38-254q0-35 18-63.5t50-42.5q73-32 131.5-46T358-420q62 0 120 14t131 46q32 14 50.5 42.5T678-254v34q0 25-17.5 42.5T618-160H98q-25 0-42.5-17.5T38-220v-34Zm824 94H724q5-15 9.5-29.5T738-220v-34q0-63-29-101.5T622-420q69 8 130 22t99 34q33 19 52 47t19 63v34q0 25-17.5 42.5T862-160ZM250-523q-42-42-42-108t42-108q42-42 108-42t108 42q42 42 42 108t-42 108q-42 42-108 42t-108-42Zm426 0q-42 42-108 42-11 0-24.5-1.5T519-488q24-25 36.5-61.5T568-631q0-45-12.5-79.5T519-774q11-3 24.5-5t24.5-2q66 0 108 42t42 108q0 66-42 108ZM98-220h520v-34q0-16-9.5-31T585-306q-72-32-121-43t-106-11q-57 0-106.5 11T130-306q-14 6-23 21t-9 31v34Zm324.5-346.5Q448-592 448-631t-25.5-64.5Q397-721 358-721t-64.5 25.5Q268-670 268-631t25.5 64.5Q319-541 358-541t64.5-25.5ZM358-220Zm0-411Z" fill="currentColor"></path>
    </svg>`;
  const employeeDataNavIconOutline = `
    <svg viewBox="0 -960 960 960" fill="none" aria-hidden="true">
      <path d="M730-450q12.75 0 21.38-8.68 8.62-8.67 8.62-21.5 0-12.82-8.62-21.32-8.63-8.5-21.38-8.5H610q-12.75 0-21.37 8.68-8.63 8.67-8.63 21.5 0 12.82 8.63 21.32 8.62 8.5 21.37 8.5h120Zm0-120q12.75 0 21.38-8.68 8.62-8.67 8.62-21.5 0-12.82-8.62-21.32-8.63-8.5-21.38-8.5H610q-12.75 0-21.37 8.68-8.63 8.67-8.63 21.5 0 12.82 8.63 21.32 8.62 8.5 21.37 8.5h120ZM360-434q-38 0-66.64 6.5Q264.73-421 243-407q-20 11-31 28.13-11 17.14-11 36.87 0 9.43 6.68 15.71Q214.35-320 224-320h272q9.65 0 16.32-6.52Q519-333.03 519-343q0-17.69-10.5-34.35Q498-394 478-407q-22-14-51-20.5t-67-6.5Zm51.5-81.42q21.5-21.42 21.5-51.5t-21.42-51.58q-21.42-21.5-51.5-21.5t-51.58 21.42q-21.5 21.42-21.5 51.5t21.42 51.58q21.42 21.5 51.5 21.5t51.58-21.42ZM140-160q-24 0-42-18t-18-42v-520q0-24 18-42t42-18h680q24 0 42 18t18 42v520q0 24-18 42t-42 18H140Zm0-60h680v-520H140v520Zm0 0v-520 520Z" fill="currentColor"></path>
    </svg>`;
  const registerNavIconOutline = `
    <svg viewBox="0 -960 960 960" fill="none" aria-hidden="true">
      <path d="M730-530H630q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h100v-100q0-12.75 8.68-21.38 8.67-8.62 21.5-8.62 12.82 0 21.32 8.62 8.5 8.63 8.5 21.38v100h100q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H790v100q0 12.75-8.68 21.37-8.67 8.63-21.5 8.63-12.82 0-21.32-8.63-8.5-8.62-8.5-21.37v-100Zm-478 7q-42-42-42-108t42-108q42-42 108-42t108 42q42 42 42 108t-42 108q-42 42-108 42t-108-42ZM40-220v-34q0-35 17.5-63.5T108-360q75-33 133.34-46.5t118.5-13.5Q420-420 478-406.5T611-360q33 15 51 43t18 63v34q0 24.75-17.62 42.37Q644.75-160 620-160H100q-24.75 0-42.37-17.63Q40-195.25 40-220Zm60 0h520v-34q0-16-9-30.5T587-306q-71-33-120-43.5T360-360q-58 0-107.5 10.5T132-306q-15 7-23.5 21.5T100-254v34Zm324.5-346.5Q450-592 450-631t-25.5-64.5Q399-721 360-721t-64.5 25.5Q270-670 270-631t25.5 64.5Q321-541 360-541t64.5-25.5ZM360-631Zm0 411Z" fill="currentColor"></path>
    </svg>`;
  const registerNavIconFilled = `
    <svg viewBox="0 -960 960 960" fill="none" aria-hidden="true">
      <path d="M730-530H630q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h100v-100q0-12.75 8.68-21.38 8.67-8.62 21.5-8.62 12.82 0 21.32 8.62 8.5 8.63 8.5 21.38v100h100q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H790v100q0 12.75-8.68 21.37-8.67 8.63-21.5 8.63-12.82 0-21.32-8.63-8.5-8.62-8.5-21.37v-100Zm-478 7q-42-42-42-108t42-108q42-42 108-42t108 42q42 42 42 108t-42 108q-42 42-108 42t-108-42ZM40-220v-34q0-35 17.5-63.5T108-360q75-33 133.34-46.5t118.5-13.5Q420-420 478-406.5T611-360q33 15 51 43t18 63v34q0 24.75-17.62 42.37Q644.75-160 620-160H100q-24.75 0-42.37-17.63Q40-195.25 40-220Z" fill="currentColor"></path>
    </svg>`;
  const liveChatNavIconOutline = `
    <svg viewBox="0 -960 960 960" fill="none" aria-hidden="true">
      <path d="M240-240 131-131q-14 14-32.5 6.34Q80-132.31 80-152v-668q0-24 18-42t42-18h680q24 0 42 18t18 42v520q0 24-18 42t-42 18H240Zm-26-60h606v-520H140v600l74-80Zm-74 0v-520 520Zm194.5-234.5Q346-546 346-563t-11.5-28.5Q323-603 306-603t-28.5 11.5Q266-580 266-563t11.5 28.5Q289-523 306-523t28.5-11.5Zm177 0Q523-546 523-563t-11.5-28.5Q500-603 483-603t-28.5 11.5Q443-580 443-563t11.5 28.5Q466-523 483-523t28.5-11.5Zm170 0Q693-546 693-563t-11.5-28.5Q670-603 653-603t-28.5 11.5Q613-580 613-563t11.5 28.5Q636-523 653-523t28.5-11.5Z" fill="currentColor"></path>
    </svg>`;
  const liveChatNavIconFilled = `
    <svg viewBox="0 -960 960 960" fill="none" aria-hidden="true">
      <path d="M240-240 131-131q-14 14-32.5 6.34Q80-132.31 80-152v-668q0-24 18-42t42-18h680q24 0 42 18t18 42v520q0 24-18 42t-42 18H240Zm94.5-294.5Q346-546 346-563t-11.5-28.5Q323-603 306-603t-28.5 11.5Q266-580 266-563t11.5 28.5Q289-523 306-523t28.5-11.5Zm177 0Q523-546 523-563t-11.5-28.5Q500-603 483-603t-28.5 11.5Q443-580 443-563t11.5 28.5Q466-523 483-523t28.5-11.5Zm170 0Q693-546 693-563t-11.5-28.5Q670-603 653-603t-28.5 11.5Q613-580 613-563t11.5 28.5Q636-523 653-523t28.5-11.5Z" fill="currentColor"></path>
    </svg>`;
  const packingDashboardNavIconOutline = `
    <svg viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true">
      <path d="M180-80q-24.75 0-42.37-17.63Q120-115.25 120-140v-483q-17-6-28.5-21.39T80-680v-140q0-24.75 17.63-42.38Q115.25-880 140-880h680q24.75 0 42.38 17.62Q880-844.75 880-820v140q0 20.22-11.5 35.61T840-623v483q0 24.75-17.62 42.37Q804.75-80 780-80H180Zm0-540v480h600v-480H180Zm-40-60h680v-140H140v140Zm250 260h180q12.75 0 21.38-8.68 8.62-8.67 8.62-21.5 0-12.82-8.62-21.32-8.63-8.5-21.38-8.5H390q-12.75 0-21.37 8.68-8.63 8.67-8.63 21.5 0 12.82 8.63 21.32 8.62 8.5 21.37 8.5Zm90 40Z"></path>
    </svg>`;
  const packingDashboardNavIconFilled = `
    <svg viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true">
      <path d="M180-80q-24.75 0-42.37-17.63Q120-115.25 120-140v-483q-17-6-28.5-21.39T80-680v-140q0-24.75 17.63-42.38Q115.25-880 140-880h680q24.75 0 42.38 17.62Q880-844.75 880-820v140q0 20.22-11.5 35.61T840-623v483q0 24.75-17.62 42.37Q804.75-80 780-80H180Zm-40-600h680v-140H140v140Zm250 260h180q12.75 0 21.38-8.68 8.62-8.67 8.62-21.5 0-12.82-8.62-21.32-8.63-8.5-21.38-8.5H390q-12.75 0-21.37 8.68-8.63 8.67-8.63 21.5 0 12.82 8.63 21.32 8.62 8.5 21.37 8.5Z"></path>
    </svg>`;

  function installPendingEmployeeNavigationFilter() {
    document.documentElement.classList.add(pendingNavClass);
    if (document.getElementById(pendingNavStyleId)) {
      return;
    }

    const style = document.createElement("style");
    style.id = pendingNavStyleId;
    style.textContent = `
      html.${pendingNavClass} .dashboard-nav__item[href="/live_chat.html"],
      html.${pendingNavClass} .dashboard-nav__item[href="/employee_order_insight.html"],
      html.${pendingNavClass} .dashboard-nav__item[href="/employee_stock.html"],
      html.${pendingNavClass} .dashboard-nav__item[href="/main.html#inventory"],
      html.${pendingNavClass} .dashboard-nav__item[href^="/main.html?"][href*="#inventory"],
      html.${pendingNavClass} .dashboard-nav__item--sign-out {
        display: none !important;
      }
    `;

    if (document.head) {
      document.head.appendChild(style);
      return;
    }

    document.addEventListener("DOMContentLoaded", () => document.head?.appendChild(style), {
      once: true,
    });
  }

  function releasePendingEmployeeNavigationFilter() {
    document.documentElement.classList.remove(pendingNavClass);
  }

  installPendingEmployeeNavigationFilter();

  function normalizePosition(value) {
    return String(value ?? "").trim().toLowerCase();
  }

  const permissionKeyByPath = Object.freeze({
    "/main.html": "admin-dashboard",
    "/admin_dashboard.html": "admin-dashboard",
    "/employee_dashboard.html": "employee-dashboard",
    "/packing_dashboard.html": "packing-dashboard",
    "/live_chat.html": "live-chat",
    "/concern.html": "concern",
    "/employee_order_insight.html": "employee-order",
    "/employee_stock.html": "employee-inventory",
    "/insight.html": "insight",
    "/listing_insight.html": "product-insight",
    "/product_panel.html": "products",
    "/main_inventory_embed.html": "admin-inventory",
    "/stock.html": "admin-inventory",
    "/payment_partners.html": "payment-partners",
    "/delivery_partners.html": "delivery-partners",
    "/employee_data.html": "employee-data",
    "/register.html": "register",
  });
  const disabledEmployeePanelPermissions = new Set([
    "employee-order",
  ]);
  const employeePanelAccessPermissionKeys = new Set([
    "live-chat",
  ]);
  const inventoryAccessPermissionKeys = new Set([
    "admin-inventory",
    "employee-inventory",
  ]);
  const retiredEmployeeAccessPermissionKeys = new Set([
    "payment-partners",
    "delivery-partners",
  ]);

  function isInventoryAccessPermissionKey(permissionKey) {
    return inventoryAccessPermissionKeys.has(String(permissionKey ?? "").trim().toLowerCase());
  }

  function getEquivalentEmployeeAccessPermissionKeys(permissionKey) {
    const normalizedPermissionKey = String(permissionKey ?? "").trim().toLowerCase();
    if (isInventoryAccessPermissionKey(normalizedPermissionKey)) {
      return [...inventoryAccessPermissionKeys];
    }

    return normalizedPermissionKey ? [normalizedPermissionKey] : [];
  }

  function createEmployeeAccessPermissionSet(accessPermissions) {
    const allowedPermissions = new Set();
    for (const permissionKey of Array.isArray(accessPermissions) ? accessPermissions : []) {
      const normalizedPermissionKey = String(permissionKey ?? "").trim().toLowerCase();
      if (retiredEmployeeAccessPermissionKeys.has(normalizedPermissionKey)) {
        continue;
      }
      if (isInventoryAccessPermissionKey(normalizedPermissionKey)) {
        allowedPermissions.add("admin-inventory");
        continue;
      }

      if (normalizedPermissionKey) {
        allowedPermissions.add(normalizedPermissionKey);
      }
    }
    return allowedPermissions;
  }

  function hasEmployeeAccessPermission(accessPermissions, permissionKey) {
    const allowedPermissions = createEmployeeAccessPermissionSet(accessPermissions);
    return getEquivalentEmployeeAccessPermissionKeys(permissionKey).some((equivalentPermissionKey) =>
      allowedPermissions.has(equivalentPermissionKey),
    );
  }

  function redirectEmployeeInventoryToMainInventory() {
    const currentUrl = new URL(window.location.href);
    currentUrl.pathname = "/main.html";
    currentUrl.hash = "inventory";
    currentUrl.searchParams.set("role", "admin");
    currentUrl.searchParams.set("employee_inventory_table", "1");
    window.location.replace(`${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
  }

  const pathByPermissionKey = Object.freeze(
    Object.fromEntries(
      Object.entries(permissionKeyByPath).map(([path, permissionKey]) => [permissionKey, path]),
    ),
  );
  const employeeNavigationItems = Object.freeze([
    {
      permissionKey: "employee-dashboard",
      href: "/employee_dashboard.html",
      label: "Dashboard",
      title: "Employee dashboard",
      stockKey: "employee-dashboard",
      icon: employeeDashboardNavIconOutline,
      activeIcon: employeeDashboardNavIconFilled,
    },
    {
      permissionKey: "insight",
      href: "/insight.html",
      label: "Insight",
      title: "Insight",
      stockKey: "insight",
      icon: orderNavIconOutline,
    },
    {
      permissionKey: "product-insight",
      href: "/listing_insight.html",
      label: "Product Insight",
      title: "Product Insight",
      stockKey: "product-insight",
      icon: `
        <svg viewBox="0 -960 960 960" fill="none" aria-hidden="true">
          <path d="m363-390 117-71 117 71-31-133 104-90-137-11-53-126-53 126-137 11 104 90-31 133ZM80-80v-740q0-24 18-42t42-18h680q24 0 42 18t18 42v520q0 24-18 42t-42 18H240L80-80Zm134-220h606v-520H140v600l74-80Zm-74 0v-520 520Z" fill="currentColor"></path>
        </svg>`,
    },
    {
      permissionKey: "products",
      href: "/product_panel.html",
      label: "Products",
      title: "Products",
      stockKey: "products",
      icon: `
        <svg viewBox="0 -960 960 960" fill="none" aria-hidden="true">
          <path d="M450-154v-309L180-619v309l270 156Zm60 0 270-156v-310L510-463v309Zm-60 69L150-258q-14-8-22-22t-8-30v-340q0-16 8-30t22-22l300-173q14-8 30-8t30 8l300 173q14 8 22 22t8 30v340q0 16-8 30t-22 22L510-85q-14 8-30 8t-30-8Zm194-525 102-59-266-154-102 59 266 154Zm-164 96 104-61-267-154-104 60 267 155Z" fill="currentColor"></path>
        </svg>`,
    },
    {
      permissionKey: "admin-dashboard",
      href: "/main.html#dashboard",
      label: "Admin",
      title: "Store Overview",
      stockKey: "dashboard",
      icon: storeNavIconOutline,
      activeIcon: storeNavIconFilled,
    },
    {
      permissionKey: "admin-inventory",
      href: "/main.html?role=admin&employee_inventory_table=1#inventory",
      label: "Inventory",
      title: "Inventory",
      stockKey: "stock",
      icon: `
        <svg viewBox="0 -960 960 960" fill="none" aria-hidden="true">
          <path d="M465.5-419.5Q459-421 452-425L90-619q-8-5-11.5-11.5T75-645q0-8 3.5-14.5T90-671l362-194q7-4 13.5-5.5T480-872q8 0 14.5 1.5T508-865l362 194q8 5 12 11.5t4 14.5q0 8-4 14.5T870-619L508-425q-7 4-13.5 5.5T480-418q-8 0-14.5-1.5ZM480-479l315-166-315-166-314 166 314 166Zm1-166Zm-1 332 339-181q2-1 14-3 12 0 21 8.5t9 21.5q0 8-4 14.5T847-441L508-260q-7 4-13.5 5.5T480-253q-8 0-14.5-1.5T452-260L114-441q-8-5-12-11.5T98-467q0-13 9-21.5t21-8.5q4 0 7.5 1t6.5 3l338 180Zm0 165 339-181q2-1 14-3 12 0 21 8.5t9 21.5q0 8-4 14.5T847-276L508-95q-7 4-13.5 5.5T480-88q-8 0-14.5-1.5T452-95L114-276q-8-5-12-11.5T98-302q0-13 9-21.5t21-8.5q4 0 7.5 1t6.5 3l338 180Z" fill="currentColor"></path>
        </svg>`,
    },
    {
      permissionKey: "employee-data",
      href: "/Employee_data.html",
      label: "Employees",
      title: "Employee data",
      stockKey: "employee-data",
      icon: employeeDataNavIconOutline,
    },
    {
      permissionKey: "register",
      href: "/register.html",
      label: "Register",
      title: "Register",
      stockKey: "register",
      icon: registerNavIconOutline,
      activeIcon: registerNavIconFilled,
    },
    {
      permissionKey: "packing-dashboard",
      href: "/packing_dashboard.html",
      label: "Packing",
      title: "Packing dashboard",
      stockKey: "packing-dashboard",
      icon: packingDashboardNavIconOutline,
      activeIcon: packingDashboardNavIconFilled,
      iconClassName: "dashboard-nav__icon--packing-box",
    },
  ]);
  const employeeNavigationItemByPermissionKey = Object.freeze(
    Object.fromEntries(employeeNavigationItems.map((item) => [item.permissionKey, item])),
  );
  const employeeNavigationPermissionOrder = Object.freeze([
    "employee-dashboard",
    "insight",
    "product-insight",
    "products",
    "admin-dashboard",
    "admin-inventory",
    "user-data",
    "employee-data",
    "register",
    "packing-dashboard",
  ]);
  const orderedEmployeeNavigationItems = Object.freeze(
    employeeNavigationPermissionOrder
      .map((permissionKey) => employeeNavigationItemByPermissionKey[permissionKey])
      .filter(Boolean),
  );
  const workspaceAccountIcon = `
    <svg viewBox="0 -960 960 960" fill="none" aria-hidden="true">
      <path d="M80-224v-34q0-35 18-63.5t50-42.5q59-27 120.5-43.5T395-424q10 0 16 8t3 18q-6 23-8 46t-2 46q0 28 3.5 55t12.5 53q5 12-1.5 23T400-164H140q-25 0-42.5-17.5T80-224Zm672-39q22-22 22-58t-22-58q-22-22-58-22t-58 22q-22 22-22 58t22 58q22 22 58 22t58-22ZM292-527q-42-42-42-108t42-108q42-42 108-42t108 42q42 42 42 108t-42 108q-42 42-108 42t-108-42Zm372 384-7-43q-17-5-34.5-14.5T593-222l-38 8q-8 2-15-1t-11-10l-6-10q-5-8-3.5-16t7.5-14l33-31q-2-9-2-25t2-25l-33-31q-6-5-7.5-13.5T523-406l6-12q4-7 10.5-9.5t14.5-.5l39 8q12-12 29.5-21.5T657-456l7-43q2-10 9-16.5t17-6.5h8q10 0 17 6.5t9 16.5l7 43q17 5 34.5 14.5T795-420l38-8q8-2 15 1t11 10l6 10q5 8 3.5 16t-7.5 14l-33 31q2 9 2 25t-2 25l33 31q6 5 7.5 13.5T865-236l-6 12q-4 7-10.5 9.5t-14.5.5l-39-8q-12 12-29.5 21.5T731-186l-7 43q-2 10-9 16.5t-17 6.5h-8q-10 0-17-6.5t-9-16.5Z" fill="currentColor"></path>
    </svg>`;
  const workspaceSignOutIcon = `
    <svg viewBox="0 -960 960 960" fill="none" aria-hidden="true">
      <path d="M180-120q-24 0-42-18t-18-42v-600q0-24 18-42t42-18h269q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H180v600h269q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H180Zm545-330H390q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h333l-81-81q-9-9-8.5-21t9.5-21q9-9 21.5-9t21.5 9l133 133q9 9 9 21t-9 21L687-326q-8.8 9-20.9 8.5-12.1-.5-21.49-9.5-8.61-9-8.61-21.5t9-21.5l80-80Z" fill="currentColor"></path>
    </svg>`;
  const workspaceChevronIcon = `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m7 10 5 5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
    </svg>`;
  let latestEmployeeAccessPermissions = new Set();

  function readEmployeeSession() {
    try {
      const rawSession = window.sessionStorage.getItem("gms-employee-session");
      return rawSession ? JSON.parse(rawSession) : null;
    } catch (error) {
      console.warn("Unable to read employee session.", error);
      return null;
    }
  }

  function readAdminSession() {
    return readSessionStorageJson("gms-admin-session");
  }

  function hasActiveAdminSession() {
    const adminSession = readAdminSession();
    return Boolean(
      adminSession &&
      typeof adminSession === "object" &&
      (
        String(adminSession.role ?? "").trim().toLowerCase() === "admin" ||
        adminSession.adminId ||
        adminSession.email ||
        adminSession.id ||
        adminSession.accountCode
      ),
    );
  }

  function writeEmployeeSession(session) {
    try {
      window.sessionStorage.setItem("gms-employee-session", JSON.stringify(session));
    } catch (error) {
      console.warn("Unable to update employee session.", error);
    }
  }

  function readSessionStorageJson(key) {
    try {
      const rawSession = window.sessionStorage.getItem(key);
      return rawSession ? JSON.parse(rawSession) : null;
    } catch (error) {
      return null;
    }
  }

  function getFirstAdminScopeValue(source, keys) {
    for (const key of keys) {
      const value = String(source?.[key] ?? "").trim();
      if (value) {
        return value;
      }
    }

    return "";
  }

  function resolveAdminTenantIdFromSession(session, fallback = "") {
    if (!session || typeof session !== "object") {
      return fallback;
    }

    return getFirstAdminScopeValue(session, [
      "adminId",
      "ownerAdminId",
      "tenantId",
      "workspaceId",
      "storeAdminId",
      "id",
      "accountCode",
    ]) || fallback;
  }

  function getActiveAdminTenantId() {
    const adminSession = readAdminSession();
    const adminId = resolveAdminTenantIdFromSession(
      adminSession,
      adminSession && typeof adminSession === "object" ? "admin" : "",
    );
    if (adminId) {
      return adminId;
    }

    const employeeSession = readSessionStorageJson("gms-employee-session");
    const employeeAdminId = resolveAdminTenantIdFromSession(employeeSession, "");
    if (employeeAdminId) {
      return employeeAdminId;
    }

    return "";
  }

  function withAdminTenantHeaders(headers = {}) {
    const adminId = getActiveAdminTenantId();
    if (!adminId) {
      return headers;
    }

    return {
      ...headers,
      "X-GMS-Admin-ID": adminId,
    };
  }

  function getSessionMatchValues(session) {
    return [
      session?.id,
      session?.accountCode,
      session?.employeeId,
      session?.email,
    ]
      .map((value) => String(value ?? "").trim().toLowerCase())
      .filter(Boolean);
  }

  function isMatchingEmployeeAccount(account, sessionMatchValues) {
    if (!sessionMatchValues.length || !account || typeof account !== "object") {
      return false;
    }

    return [
      account.id,
      account.accountCode,
      account.employeeId,
      account.email,
    ]
      .map((value) => String(value ?? "").trim().toLowerCase())
      .some((value) => value && sessionMatchValues.includes(value));
  }

  async function refreshEmployeeSession(session) {
    if (!session || typeof session !== "object") {
      return session;
    }

    const sessionMatchValues = getSessionMatchValues(session);
    if (!sessionMatchValues.length) {
      return session;
    }

    try {
      const response = await fetch("/api/accounts", {
        cache: "no-store",
        headers: withAdminTenantHeaders({ Accept: "application/json" }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return session;
      }

      const accounts = Array.isArray(data?.accounts) ? data.accounts : [];
      const account = accounts.find((candidate) =>
        isMatchingEmployeeAccount(candidate, sessionMatchValues),
      );
      if (!account) {
        return session;
      }

      const nextSession = {
        ...session,
        ...account,
        dashboardPath: account.dashboardPath || session.dashboardPath,
        signedInAt: session.signedInAt || new Date().toISOString(),
      };
      writeEmployeeSession(nextSession);
      window.dispatchEvent(
        new CustomEvent("gms-employee-session-updated", {
          detail: { session: nextSession },
        }),
      );
      return nextSession;
    } catch (error) {
      console.warn("Unable to refresh employee access permissions.", error);
      return session;
    }
  }

  function onDocumentReady(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback, { once: true });
      return;
    }

    callback();
  }

  function ensureEmployeeAccountSettingsScript() {
    if (
      window.gmsEmployeeAccountSettingsLoaded
      || document.querySelector("script[data-employee-account-settings-script]")
    ) {
      return;
    }

    const scriptElement = document.createElement("script");
    scriptElement.src = "/employee_account_settings.js?v=seller-square-pen-1";
    scriptElement.defer = true;
    scriptElement.dataset.employeeAccountSettingsScript = "true";
    const appendScript = () => document.body?.appendChild(scriptElement);
    if (document.body) {
      appendScript();
    } else {
      document.addEventListener("DOMContentLoaded", appendScript, { once: true });
    }
  }

  function readEmployeeLeaveRequests() {
    try {
      const storedRequests = JSON.parse(
        window.localStorage.getItem(employeeLeaveRequestsStorageKey) || "[]",
      );
      return Array.isArray(storedRequests) ? storedRequests : [];
    } catch (error) {
      console.warn("Unable to read employee leave requests.", error);
      return [];
    }
  }

  function getEmployeeLeaveRequestStatus(request) {
    return String(request?.status ?? "pending").trim().toLowerCase() || "pending";
  }

  function normalizeEmployeeLeaveAdminScope(value) {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function getEmployeeLeaveRequestAdminScope(request) {
    return normalizeEmployeeLeaveAdminScope(
      request?.adminId ??
        request?.ownerAdminId ??
        request?.tenantId ??
        request?.workspaceId ??
        request?.storeAdminId,
    );
  }

  function isEmployeeLeaveRequestInActiveAdminScope(request) {
    const activeAdminId = normalizeEmployeeLeaveAdminScope(getActiveAdminTenantId());
    if (!activeAdminId) {
      return true;
    }

    return getEmployeeLeaveRequestAdminScope(request) === activeAdminId;
  }

  function hasAnyPendingEmployeeLeaveRequest() {
    return readEmployeeLeaveRequests().some((request) => (
      isEmployeeLeaveRequestInActiveAdminScope(request) &&
      getEmployeeLeaveRequestStatus(request) === "pending"
    ));
  }

  function isEmployeeDataNavigationItem(item) {
    return (
      item instanceof HTMLAnchorElement
      && getNavigationPathFromHref(item.href) === "/employee_data.html"
    );
  }

  function syncEmployeeLeaveNavBadge() {
    const hasPendingLeaveRequest = hasAnyPendingEmployeeLeaveRequest();
    document.querySelectorAll(".dashboard-nav__item").forEach((item) => {
      if (!isEmployeeDataNavigationItem(item)) {
        return;
      }

      if (latestEmployeeAccessPermissions.has("employee-data")) {
        item.hidden = false;
        item.removeAttribute("aria-hidden");
      }

      const navIcon = item.querySelector(".dashboard-nav__icon");
      if (!navIcon) {
        return;
      }

      let badge = item.querySelector("[data-employee-data-leave-nav-badge]");
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "employee-leave-nav-badge";
        badge.dataset.employeeDataLeaveNavBadge = "true";
        badge.setAttribute("aria-hidden", "true");
      }

      if (badge.parentElement !== navIcon) {
        navIcon.appendChild(badge);
      }

      badge.hidden = !hasPendingLeaveRequest;
    });
  }

  let employeeLeaveNavBadgeSyncScheduled = false;

  function scheduleEmployeeLeaveNavBadgeSync() {
    if (employeeLeaveNavBadgeSyncScheduled) {
      return;
    }

    employeeLeaveNavBadgeSyncScheduled = true;
    window.requestAnimationFrame(() => {
      employeeLeaveNavBadgeSyncScheduled = false;
      syncEmployeeLeaveNavBadge();
    });
  }

  function setupEmployeeLeaveNavBadgeObserver() {
    onDocumentReady(() => {
      syncEmployeeLeaveNavBadge();

      const observer = new MutationObserver(() => {
        scheduleEmployeeLeaveNavBadgeSync();
      });
      const observedTargets = new Set([
        document.body,
        ...document.querySelectorAll(".dashboard-sidebar, .dashboard-nav"),
      ].filter(Boolean));
      observedTargets.forEach((target) => {
        observer.observe(target, {
          attributes: true,
          attributeFilter: ["hidden", "href", "data-stock-nav-item", "data-employee-access-permission"],
          childList: true,
          subtree: true,
        });
      });
    });

    window.addEventListener(employeeLeaveRequestsChangedEventName, scheduleEmployeeLeaveNavBadgeSync);
    window.addEventListener("storage", (event) => {
      if (event.key === employeeLeaveRequestsStorageKey) {
        scheduleEmployeeLeaveNavBadgeSync();
      }
    });
  }

  function getLatestCustomerChatMessageTimestamp(thread) {
    const messages = Array.isArray(thread?.messages) ? thread.messages : [];
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (message?.isFromSupport === true) {
        continue;
      }

      const timestamp = String(message?.timestamp || "").trim();
      if (timestamp) {
        return timestamp;
      }
    }

    return "";
  }

  function hasUnreadCustomerChatMessage(thread) {
    const latestCustomerTimestamp = getLatestCustomerChatMessageTimestamp(thread);
    if (!latestCustomerTimestamp) {
      return false;
    }

    const latestCustomerDate = new Date(latestCustomerTimestamp);
    if (Number.isNaN(latestCustomerDate.getTime())) {
      return false;
    }

    const supportReadAt = String(thread?.supportReadAt || "").trim();
    if (!supportReadAt) {
      return true;
    }

    const supportReadDate = new Date(supportReadAt);
    if (Number.isNaN(supportReadDate.getTime())) {
      return true;
    }

    return latestCustomerDate.getTime() > supportReadDate.getTime();
  }

  function getUnreadLiveChatThreadCount(threads) {
    return (Array.isArray(threads) ? threads : []).filter(hasUnreadCustomerChatMessage).length;
  }

  function isLiveChatNavigationItem(item) {
    return (
      item instanceof HTMLAnchorElement
      && getNavigationPathFromHref(item.href) === "/live_chat.html"
    );
  }

  function setLiveChatUnreadCount(unreadCount) {
    const nextUnreadCount = Math.max(0, Math.trunc(Number(unreadCount) || 0));
    liveChatUnreadCount = nextUnreadCount;
    syncLiveChatNavBadge();
    return nextUnreadCount;
  }

  function syncLiveChatNavBadge() {
    const hasUnreadChat = liveChatUnreadCount > 0;
    document.querySelectorAll(".dashboard-nav__item").forEach((item) => {
      if (!isLiveChatNavigationItem(item)) {
        return;
      }

      if (latestEmployeeAccessPermissions.has("live-chat")) {
        item.hidden = false;
        item.removeAttribute("aria-hidden");
      }

      const navIcon = item.querySelector(".dashboard-nav__icon");
      if (!navIcon) {
        return;
      }

      let badge = item.querySelector("[data-live-chat-nav-badge]");
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "live-chat-nav-badge";
        badge.dataset.liveChatNavBadge = "true";
        badge.setAttribute("aria-hidden", "true");
      }

      if (badge.parentElement !== navIcon) {
        navIcon.appendChild(badge);
      }

      badge.textContent = "";
      badge.hidden = !hasUnreadChat;
    });
  }

  function scheduleLiveChatNavBadgeSync() {
    if (liveChatNavBadgeSyncScheduled) {
      return;
    }

    liveChatNavBadgeSyncScheduled = true;
    window.requestAnimationFrame(() => {
      liveChatNavBadgeSyncScheduled = false;
      syncLiveChatNavBadge();
    });
  }

  async function refreshLiveChatNavBadge() {
    if (liveChatNavBadgeRefreshInFlight) {
      liveChatNavBadgeRefreshQueued = true;
      return;
    }

    liveChatNavBadgeRefreshInFlight = true;
    try {
      const response = await fetch("/api/chat-support", {
        cache: "no-store",
        headers: withAdminTenantHeaders({
          Accept: "application/json",
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || "Unable to load live chat unread count.");
      }

      setLiveChatUnreadCount(getUnreadLiveChatThreadCount(data?.threads));
    } catch (_) {
      syncLiveChatNavBadge();
    } finally {
      liveChatNavBadgeRefreshInFlight = false;
      if (liveChatNavBadgeRefreshQueued) {
        liveChatNavBadgeRefreshQueued = false;
        void refreshLiveChatNavBadge();
      }
    }
  }

  function setupLiveChatNavBadgeObserver() {
    onDocumentReady(() => {
      syncLiveChatNavBadge();

      const observer = new MutationObserver(() => {
        scheduleLiveChatNavBadgeSync();
      });
      const observedTargets = new Set([
        document.body,
        ...document.querySelectorAll(".dashboard-sidebar, .dashboard-nav"),
      ].filter(Boolean));
      observedTargets.forEach((target) => {
        observer.observe(target, {
          attributes: true,
          attributeFilter: ["hidden", "href", "data-stock-nav-item", "data-employee-access-permission"],
          childList: true,
          subtree: true,
        });
      });
    });
  }

  function getEmployeeDisplayName(session) {
    const firstName = String(session?.firstName ?? "").trim();
    const lastName = String(session?.lastName ?? "").trim();
    const fullName = [firstName, lastName].filter(Boolean).join(" ");
    return (
      fullName
      || String(session?.name ?? "").trim()
      || String(session?.email ?? "").trim().split("@")[0]
      || "Employee"
    );
  }

  function getEmployeeDisplayPosition(session) {
    return String(session?.position ?? "").trim() || "Employee";
  }

  function getEmployeeProfileImageUrl(session) {
    const candidates = [
      session?.profileImageUrl,
      session?.avatarUrl,
      session?.photoUrl,
      session?.profilePhotoUrl,
      session?.employeePhotoUrl,
      session?.pictureUrl,
      session?.imageUrl,
    ];

    return candidates
      .map((value) => String(value ?? "").trim())
      .find(Boolean) || "";
  }

  function getEmployeeProfileFallbackIconMarkup() {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <circle cx="12" cy="8.2" r="3.4"></circle>
        <path d="M5.8 19.2a6.2 6.2 0 0 1 12.4 0" stroke-linecap="round"></path>
      </svg>`;
  }

  function applyEmployeeWorkspaceProfile(session = readEmployeeSession()) {
    if (!session || typeof session !== "object") {
      return;
    }

    const displayName = getEmployeeDisplayName(session);
    const position = getEmployeeDisplayPosition(session);
    const imageUrl = getEmployeeProfileImageUrl(session);

    onDocumentReady(() => {
      document.querySelectorAll(".product-panel-toolbar__profile").forEach((profile) => {
        profile.dataset.employeeWorkspaceProfile = "true";
        profile.setAttribute("aria-label", `${displayName} workspace summary`);

        const avatar = profile.querySelector(".product-panel-toolbar__avatar");
        const image = profile.querySelector(".product-panel-toolbar__avatar-image");
        const placeholder = profile.querySelector(".product-panel-toolbar__avatar-placeholder");
        if (avatar) {
          avatar.dataset.employeeWorkspaceAvatar = "true";
          avatar.removeAttribute("data-default-logo-src");
        }

        if (image instanceof HTMLImageElement) {
          if (imageUrl) {
            image.src = imageUrl;
            image.alt = `${displayName} profile picture`;
            image.hidden = false;
          } else {
            image.removeAttribute("src");
            image.alt = "";
            image.hidden = true;
          }
        }

        if (placeholder) {
          placeholder.innerHTML = getEmployeeProfileFallbackIconMarkup();
          placeholder.hidden = Boolean(imageUrl);
        }

        const nameElement = profile.querySelector(".product-panel-toolbar__profile-copy strong");
        const positionElement = profile.querySelector(".product-panel-toolbar__profile-copy span");
        if (nameElement) {
          nameElement.textContent = displayName;
        }
        if (positionElement) {
          positionElement.textContent = position;
        }
      });
    });
  }

  function getPermissionKeyForNavigationItem(item) {
    const explicitPermission = String(item?.dataset?.employeeAccessPermission ?? "")
      .trim()
      .toLowerCase();
    if (explicitPermission) {
      return explicitPermission;
    }

    const hrefPath = item instanceof HTMLAnchorElement
      ? new URL(item.href, window.location.origin).pathname.toLowerCase()
      : "";
    return permissionKeyByPath[hrefPath] || "";
  }

  function getNavigationPathFromHref(href) {
    return new URL(href, window.location.origin).pathname.toLowerCase();
  }

  function applyNavigationItemState(item, permissionKey) {
    const definition = employeeNavigationItemByPermissionKey[permissionKey];
    if (!definition || !(item instanceof HTMLAnchorElement)) {
      return item;
    }

    const itemPath = getNavigationPathFromHref(item.href);
    const currentPath = String(window.location.pathname || "").toLowerCase();
    const isActive = itemPath === currentPath;
    item.dataset.employeeAccessPermission = permissionKey;
    item.classList.toggle("is-active", isActive);
    if (isActive) {
      item.setAttribute("aria-current", "page");
    } else {
      item.removeAttribute("aria-current");
    }
    item.setAttribute("aria-label", definition.title);
    item.setAttribute("title", definition.title);
    item.dataset.navTooltip = definition.title;
    item.dataset.stockNavItem = definition.stockKey;
    const navIcon = item.querySelector(".dashboard-nav__icon");
    if (navIcon && definition.activeIcon) {
      navIcon.innerHTML = (isActive ? definition.activeIcon : definition.icon).trim();
    }
    return item;
  }

  function createEmployeeNavigationItem(definition) {
    const item = document.createElement("a");
    item.className = "dashboard-nav__item";
    item.href = definition.href;
    item.dataset.employeeAccessPermission = definition.permissionKey;
    item.dataset.navTooltip = definition.title;
    item.dataset.stockNavItem = definition.stockKey;
    item.setAttribute("aria-label", definition.title);
    item.setAttribute("title", definition.title);
    const iconClassName = definition.iconClassName ? ` ${definition.iconClassName}` : "";
    item.innerHTML = `
      <span class="dashboard-nav__icon${iconClassName}" aria-hidden="true">
        ${definition.icon.trim()}
      </span>
      <span class="dashboard-nav__label">${definition.label}</span>`;
    return applyNavigationItemState(item, definition.permissionKey);
  }

  function buildEmployeeWorkspaceMenuMarkup() {
    return `
      <button
        class="dashboard-workspace-toggle"
        type="button"
        aria-label="Workspace"
        aria-haspopup="menu"
        aria-expanded="false"
      title="Workspace"
      data-dashboard-workspace-toggle
    >
        <span class="dashboard-workspace-toggle__label">Workspace</span>
        <span class="dashboard-workspace-toggle__chevron" aria-hidden="true">
          ${workspaceChevronIcon.trim()}
        </span>
      </button>
      <div class="dashboard-workspace-dropdown" role="menu" hidden data-dashboard-workspace-dropdown>
        <a class="dashboard-workspace-dropdown__item" href="#" role="menuitem" data-employee-account-settings>
          <span class="dashboard-workspace-dropdown__icon" aria-hidden="true">
            ${workspaceAccountIcon.trim()}
          </span>
          <span>Account Settings</span>
        </a>
        <a class="dashboard-workspace-dropdown__item is-danger" href="/login.html?role=employee" role="menuitem" data-employee-sign-out>
          <span class="dashboard-workspace-dropdown__icon" aria-hidden="true">
            ${workspaceSignOutIcon.trim()}
          </span>
          <span>Sign Out</span>
        </a>
      </div>`;
  }

  function syncEmployeeWorkspaceMenus() {
    document.querySelectorAll(".product-panel-toolbar__profile").forEach((profile) => {
      let menu = profile.querySelector("[data-dashboard-workspace-menu]");
      if (!menu) {
        menu = document.createElement("div");
        menu.className = "dashboard-workspace-menu";
        menu.dataset.dashboardWorkspaceMenu = "true";
        profile.appendChild(menu);
      }

      menu.outerHTML = `
        <div class="dashboard-workspace-menu" data-dashboard-workspace-menu>
          ${buildEmployeeWorkspaceMenuMarkup()}
        </div>`;
    });
  }

  function setWorkspaceMenuOpen(menu, isOpen) {
    const toggle = menu?.querySelector("[data-dashboard-workspace-toggle]");
    const dropdown = menu?.querySelector("[data-dashboard-workspace-dropdown]");
    if (!menu || !toggle || !dropdown) {
      return;
    }

    menu.classList.toggle("is-open", isOpen);
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    dropdown.hidden = !isOpen;
  }

  function closeWorkspaceMenus(exceptMenu = null) {
    document.querySelectorAll("[data-dashboard-workspace-menu]").forEach((menu) => {
      if (menu !== exceptMenu) {
        setWorkspaceMenuOpen(menu, false);
      }
    });
  }

  function setupDashboardWorkspaceMenus() {
    if (window.__gmsDashboardWorkspaceMenuSetup) {
      return;
    }
    window.__gmsDashboardWorkspaceMenuSetup = true;

    document.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) {
        return;
      }

      const toggle = target.closest("[data-dashboard-workspace-toggle]");
      if (toggle) {
        event.preventDefault();
        const menu = toggle.closest("[data-dashboard-workspace-menu]");
        if (menu) {
          const isOpen = !menu.classList.contains("is-open");
          closeWorkspaceMenus(menu);
          setWorkspaceMenuOpen(menu, isOpen);
        }
        return;
      }

      if (!target.closest("[data-dashboard-workspace-menu]")) {
        closeWorkspaceMenus();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeWorkspaceMenus();
      }
    });
  }

  function syncEmployeeNavigationItems(accessPermissions) {
    const allowedPermissions = createEmployeeAccessPermissionSet(accessPermissions);
    document.querySelectorAll(".dashboard-nav").forEach((nav) => {
      nav.querySelectorAll('.dashboard-nav__item[href^="/live_chat.html"]').forEach((item) => {
        item.remove();
      });

      const signOutItems = Array.from(
        nav.querySelectorAll(".dashboard-nav__item--sign-out"),
      );
      const firstSignOutItem = signOutItems[0] || null;
      const itemByPermissionKey = new Map();

      nav.querySelectorAll(".dashboard-nav__item").forEach((item) => {
        if (item.classList.contains("dashboard-nav__item--sign-out")) {
          return;
        }

        const permissionKey = getPermissionKeyForNavigationItem(item);
        if (!permissionKey) {
          return;
        }

        itemByPermissionKey.set(
          permissionKey,
          applyNavigationItemState(item, permissionKey),
        );
      });

      orderedEmployeeNavigationItems.forEach((definition) => {
        if (!allowedPermissions.has(definition.permissionKey)) {
          return;
        }

        const item =
          itemByPermissionKey.get(definition.permissionKey)
          || createEmployeeNavigationItem(definition);
        itemByPermissionKey.set(definition.permissionKey, item);
        nav.insertBefore(item, firstSignOutItem);
      });

      signOutItems.forEach((item) => {
        item.hidden = true;
        item.setAttribute("aria-hidden", "true");
      });
    });
    syncEmployeeWorkspaceMenus();
    setupDashboardWorkspaceMenus();
    syncEmployeeLeaveNavBadge();
    syncLiveChatNavBadge();
  }

  function filterEmployeeNavigation(accessPermissions) {
    onDocumentReady(() => {
      const allowedPermissions = createEmployeeAccessPermissionSet(accessPermissions);
      latestEmployeeAccessPermissions = allowedPermissions;
      syncEmployeeNavigationItems(accessPermissions);
      document.querySelectorAll(".dashboard-nav__item").forEach((item) => {
        if (
          item.classList.contains("dashboard-nav__item--sign-out")
          || item.matches("button")
        ) {
          item.hidden = item.classList.contains("dashboard-nav__item--sign-out");
          if (item.hidden) {
            item.setAttribute("aria-hidden", "true");
          } else {
            item.removeAttribute("aria-hidden");
          }
          return;
        }

        const permissionKey = getPermissionKeyForNavigationItem(item);
        item.hidden = Boolean(permissionKey && !allowedPermissions.has(permissionKey));
      });

      const firstAllowedPath = accessPermissions
        .map((permissionKey) =>
          employeeNavigationItemByPermissionKey[permissionKey]?.href
          || pathByPermissionKey[permissionKey],
        )
        .find(Boolean);
      if (firstAllowedPath) {
        document.querySelectorAll(".dashboard-sidebar__logo").forEach((logo) => {
          if (logo instanceof HTMLAnchorElement) {
            logo.href = firstAllowedPath;
          }
        });
      }

      releasePendingEmployeeNavigationFilter();
      syncEmployeeLeaveNavBadge();
      syncLiveChatNavBadge();
    });
  }

  function getDefaultAccessPermissionsForPosition(position) {
    if (position === "admin employee") {
      return ["employee-dashboard", "live-chat"];
    }

    if (position === "packing") {
      return ["packing-dashboard"];
    }

    return position ? ["employee-dashboard"] : [];
  }

  function ensureRequiredAccessPermissions(accessPermissions, session) {
    const nextPermissions = Array.isArray(accessPermissions) ? [...accessPermissions] : [];
    const position = normalizePosition(session?.position);
    const hasEmployeePanelAccess = nextPermissions.some((permission) =>
      employeePanelAccessPermissionKeys.has(permission),
    );

    if (position === "admin employee" && !nextPermissions.includes("live-chat")) {
      nextPermissions.push("live-chat");
    }

    if (
      ((position && position !== "packing") || hasEmployeePanelAccess) &&
      !nextPermissions.includes("employee-dashboard")
    ) {
      nextPermissions.unshift("employee-dashboard");
    }

    return nextPermissions;
  }

  function getAccessPermissionsForSession(session) {
    if (
      Array.isArray(session?.accessPermissions)
      && (session.accessPermissionsConfigured || session.accessPermissions.length > 0)
    ) {
      return ensureRequiredAccessPermissions(
        session.accessPermissions
          .map((permission) => String(permission ?? "").trim().toLowerCase())
          .filter((permission) => !disabledEmployeePanelPermissions.has(permission)),
        session,
      );
    }

    return getDefaultAccessPermissionsForPosition(normalizePosition(session?.position));
  }

  function refreshEmployeeNavigationForSession(session) {
    applyEmployeeWorkspaceProfile(session);
    window.setTimeout(() => applyEmployeeWorkspaceProfile(session), 0);

    const accessPermissions = getAccessPermissionsForSession(session);
    if (accessPermissions.length) {
      filterEmployeeNavigation(accessPermissions);
      return;
    }

    releasePendingEmployeeNavigationFilter();
  }

  const allowedPositions = String(script?.dataset.allowedPositions || "")
    .split("|")
    .map(normalizePosition)
    .filter(Boolean);
  const shouldMonitorLiveChatNavBadge = allowedPositions.includes("admin employee");

  if (!allowedPositions.length) {
    return;
  }

  async function applyEmployeeAccessGuard() {
    if (hasActiveAdminSession()) {
      releasePendingEmployeeNavigationFilter();
      return null;
    }

    const session = await refreshEmployeeSession(readEmployeeSession());
    applyEmployeeWorkspaceProfile(session);
    window.setTimeout(() => applyEmployeeWorkspaceProfile(session), 0);

    const currentPath = String(window.location.pathname || "").toLowerCase();
    const currentPermissionKey = permissionKeyByPath[currentPath];
    if (
      Array.isArray(session?.accessPermissions)
      && (session.accessPermissionsConfigured || session.accessPermissions.length > 0)
    ) {
      const accessPermissions = getAccessPermissionsForSession(session);
      if (currentPermissionKey && hasEmployeeAccessPermission(accessPermissions, currentPermissionKey)) {
        if (currentPath === "/employee_stock.html") {
          redirectEmployeeInventoryToMainInventory();
          return session;
        }

        filterEmployeeNavigation(accessPermissions);
        return session;
      }

      if (window.location.pathname !== pendingAccessPath) {
        window.location.replace(pendingAccessPath);
      }
      return session;
    }

    const position = normalizePosition(session?.position);
    const defaultAccessPermissions = getDefaultAccessPermissionsForPosition(position);
    if (defaultAccessPermissions.length) {
      if (!currentPermissionKey || defaultAccessPermissions.includes(currentPermissionKey)) {
        filterEmployeeNavigation(defaultAccessPermissions);
        return session;
      }

      if (window.location.pathname !== pendingAccessPath) {
        window.location.replace(pendingAccessPath);
      }
      return session;
    }

    if (!position || allowedPositions.includes(position)) {
      releasePendingEmployeeNavigationFilter();
      return session;
    }

    if (window.location.pathname !== pendingAccessPath) {
      window.location.replace(pendingAccessPath);
    }
    return session;
  }

  let employeeAccessRefreshPromise = null;

  window.gmsRefreshEmployeeAccessSession = () => {
    if (!employeeAccessRefreshPromise) {
      employeeAccessRefreshPromise = refreshEmployeeSession(readEmployeeSession())
        .then((session) => {
          refreshEmployeeNavigationForSession(session);
          return session;
        })
        .finally(() => {
          employeeAccessRefreshPromise = null;
        });
    }

    return employeeAccessRefreshPromise;
  };
  window.gmsApplyEmployeeWorkspaceProfile = (session) => applyEmployeeWorkspaceProfile(session);
  window.addEventListener("gms-employee-session-updated", (event) => {
    applyEmployeeWorkspaceProfile(event.detail?.session);
  });
  ensureEmployeeAccountSettingsScript();
  setupEmployeeLeaveNavBadgeObserver();
  if (shouldMonitorLiveChatNavBadge) {
    window.gmsUpdateLiveChatNavUnreadCount = setLiveChatUnreadCount;
    window.gmsRefreshLiveChatNavBadge = refreshLiveChatNavBadge;
    setupLiveChatNavBadgeObserver();
    void refreshLiveChatNavBadge();
    window.setInterval(refreshLiveChatNavBadge, liveChatNavBadgeRefreshIntervalMs);
  }

  window.addEventListener("focus", () => {
    void window.gmsRefreshEmployeeAccessSession?.();
    scheduleEmployeeLeaveNavBadgeSync();
    if (shouldMonitorLiveChatNavBadge) {
      void refreshLiveChatNavBadge();
    }
  });

  window.addEventListener("storage", (event) => {
    if (event.key === employeeAccessUpdatedStorageKey) {
      void window.gmsRefreshEmployeeAccessSession?.();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      void window.gmsRefreshEmployeeAccessSession?.();
      scheduleEmployeeLeaveNavBadgeSync();
      if (shouldMonitorLiveChatNavBadge) {
        void refreshLiveChatNavBadge();
      }
    }
  });

  window.gmsEmployeeAccessReady = applyEmployeeAccessGuard();
})();
