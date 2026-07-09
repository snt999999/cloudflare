/* СОЛНЦАНЕТ v63: защита карточек от случайного закрытия при выделении текста мышью */
(function () {
  "use strict";

  const VERSION = "v63-dialog-safe";

  function stopBackdropClose(dialog) {
    if (!dialog || dialog.dataset.v63DialogSafe === "1") return;
    dialog.dataset.v63DialogSafe = "1";

    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) {
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
      }
    }, true);

    dialog.addEventListener("mousedown", function (event) {
      if (event.target === dialog) {
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
      }
    }, true);

    dialog.addEventListener("mouseup", function (event) {
      if (event.target === dialog) {
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
      }
    }, true);
  }

  function install() {
    document.querySelectorAll("dialog").forEach(stopBackdropClose);

    const observer = new MutationObserver(function () {
      document.querySelectorAll("dialog").forEach(stopBackdropClose);
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });

    window.SOLNCANET_V63 = window.SOLNCANET_V63 || {};
    window.SOLNCANET_V63.dialogSafe = { version: VERSION, install };
    console.info("СОЛНЦАНЕТ", VERSION, "installed");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install);
  } else {
    install();
  }
})();
