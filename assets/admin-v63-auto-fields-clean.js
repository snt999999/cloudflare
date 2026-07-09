/* СОЛНЦАНЕТ v63: чистая карточка для направления "Авто"
   - при выборе "Авто" скрывает и очищает: "Итоговый м²", "Адрес", общий материал/плёнку в верхней части блока авто;
   - поле "Материал" внутри строки услуги не трогает, потому что материал указывается к каждой услуге отдельно.
*/
(function () {
  "use strict";

  const VERSION = "v63-auto-fields-clean";
  const HIDDEN_ATTR = "data-v63-auto-hidden";

  function norm(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/ё/g, "е")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isVisible(el) {
    return !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));
  }

  function textOf(el) {
    return norm(el ? el.textContent : "");
  }

  function getFieldBox(el) {
    if (!el) return null;
    return el.closest(
      ".form-field, .field, .form-group, .input-group, .control, .crm-field, .modal-field, .request-field, .col, .cell"
    ) || el.parentElement;
  }

  function controlsInField(field) {
    return Array.from(field ? field.querySelectorAll("input, textarea, select") : []);
  }

  function clearField(field) {
    controlsInField(field).forEach((control) => {
      if (control.type === "checkbox" || control.type === "radio") {
        control.checked = false;
      } else if (control.tagName === "SELECT") {
        // Направление/статусы не трогаем. Очищаем только скрываемые поля.
        control.value = "";
      } else {
        control.value = "";
      }
      control.dispatchEvent(new Event("input", { bubbles: true }));
      control.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  function hideField(field, clear) {
    if (!field || field.getAttribute(HIDDEN_ATTR) === "1") return;
    field.setAttribute(HIDDEN_ATTR, "1");
    field.dataset.v63OldDisplay = field.style.display || "";
    if (clear) clearField(field);
    field.style.display = "none";
    field.hidden = true;
  }

  function showField(field) {
    if (!field || field.getAttribute(HIDDEN_ATTR) !== "1") return;
    field.style.display = field.dataset.v63OldDisplay || "";
    field.hidden = false;
    field.removeAttribute(HIDDEN_ATTR);
    delete field.dataset.v63OldDisplay;
  }

  function allLabels(root) {
    return Array.from((root || document).querySelectorAll("label, .label, .form-label, .field-label, .control-label, b, strong"));
  }

  function fieldByExactLabel(root, labelNames) {
    const allowed = new Set(labelNames.map(norm));
    return allLabels(root)
      .filter((label) => allowed.has(textOf(label).replace(/:$/, "")))
      .map(getFieldBox)
      .filter(Boolean);
  }

  function fieldByLabelStarts(root, prefixes) {
    const normalized = prefixes.map(norm);
    return allLabels(root)
      .filter((label) => {
        const t = textOf(label).replace(/:$/, "");
        return normalized.some((prefix) => t === prefix || t.startsWith(prefix + " "));
      })
      .map(getFieldBox)
      .filter(Boolean);
  }

  function getControlNearLabel(label) {
    if (!label) return null;
    if (label.htmlFor) {
      const byFor = document.getElementById(label.htmlFor);
      if (byFor) return byFor;
    }
    const field = getFieldBox(label);
    return field ? field.querySelector("select, input, textarea") : null;
  }

  function findDirectionControl(root) {
    const direct = (root || document).querySelector(
      "#direction, #requestDirection, [name='direction'], [name='Direction'], [name='Направление'], [data-field='direction']"
    );
    if (direct) return direct;

    const label = allLabels(root).find((el) => textOf(el).replace(/:$/, "") === "направление");
    return getControlNearLabel(label);
  }

  function isAutoDirection(root) {
    const control = findDirectionControl(root);
    if (!control) return false;
    return norm(control.value || control.textContent).includes("авто");
  }

  function findAutoSection(root) {
    const candidates = Array.from((root || document).querySelectorAll("section, fieldset, .section, .card, .panel, .box, .modal-section, .request-section, div"));
    const scored = candidates
      .filter((el) => {
        const t = textOf(el);
        return t.includes("автомобиль") && t.includes("услуги") && (t.includes("авто") || t.includes("пленка") || t.includes("пленка"));
      })
      .map((el) => ({ el, len: textOf(el).length }))
      .sort((a, b) => a.len - b.len);
    return scored[0]?.el || null;
  }

  function findServicesHeading(section) {
    if (!section) return null;
    return Array.from(section.querySelectorAll("h1,h2,h3,h4,h5,h6,b,strong,label,.section-title,.title"))
      .find((el) => textOf(el).includes("услуги") && textOf(el).includes("стоимость"));
  }

  function isBefore(a, b) {
    if (!a || !b) return false;
    return !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
  }

  function hideGeneralAutoMaterial(root) {
    const section = findAutoSection(root);
    if (!section) return [];

    const servicesHeading = findServicesHeading(section);
    const labels = allLabels(section);
    const fields = [];

    labels.forEach((label) => {
      const t = textOf(label).replace(/:$/, "");
      const isMaterialLabel = ["пленка", "пленка / материал", "материал", "пленка/материал"].includes(t);
      if (!isMaterialLabel) return;

      const field = getFieldBox(label);
      if (!field) return;

      // Не трогаем материал внутри строк "Услуги и стоимость".
      if (servicesHeading && !isBefore(field, servicesHeading)) return;

      const controls = controlsInField(field);
      const placeholder = norm(controls.map((c) => c.placeholder || c.getAttribute("aria-label") || "").join(" "));
      if (t.includes("плен") || t.includes("материал") || placeholder.includes("материал") || placeholder.includes("плен")) {
        fields.push(field);
      }
    });

    // Дополнительная защита: скрываем верхнее одиночное поле с placeholder "Плёнка / материал",
    // но только если оно стоит до заголовка "Услуги и стоимость".
    Array.from(section.querySelectorAll("input, textarea, select")).forEach((control) => {
      const placeholder = norm(control.placeholder || control.getAttribute("aria-label") || control.name || "");
      if (!placeholder.includes("материал") && !placeholder.includes("плен")) return;
      const field = getFieldBox(control);
      if (servicesHeading && field && !isBefore(field, servicesHeading)) return;
      if (field) fields.push(field);
    });

    return Array.from(new Set(fields));
  }

  function applyAutoLayout(root) {
    root = root || document;
    const auto = isAutoDirection(root);

    const fieldsToHide = [];

    // Для направления "Авто" итоговый м² не нужен вообще.
    fieldsToHide.push(...fieldByExactLabel(root, ["Итоговый м²", "Итоговый м2", "Итоговые м²", "Итоговые м2", "Итого м²", "Итого м2"]));

    // Для направления "Авто" адрес не нужен.
    fieldsToHide.push(...fieldByLabelStarts(root, ["Адрес", "Адрес объекта"]));

    // В верхней части блока "Авто" не нужен общий материал/плёнка.
    fieldsToHide.push(...hideGeneralAutoMaterial(root));

    const unique = Array.from(new Set(fieldsToHide.filter(Boolean)));

    if (auto) {
      unique.forEach((field) => hideField(field, true));
    } else {
      document.querySelectorAll(`[${HIDDEN_ATTR}='1']`).forEach(showField);
    }
  }

  function install() {
    const run = () => applyAutoLayout(document);

    document.addEventListener("change", (event) => {
      const target = event.target;
      if (target && (target.matches("select, input, textarea") || target.closest("select, input, textarea"))) {
        setTimeout(run, 0);
      }
    }, true);

    document.addEventListener("input", (event) => {
      const target = event.target;
      if (target && target.matches("select, input, textarea")) setTimeout(run, 0);
    }, true);

    const observer = new MutationObserver(() => {
      clearTimeout(install._timer);
      install._timer = setTimeout(run, 80);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["open", "style", "class", "value"] });

    run();
    window.SOLNCANET_V63 = window.SOLNCANET_V63 || {};
    window.SOLNCANET_V63.autoFieldsClean = { version: VERSION, apply: applyAutoLayout };
    console.info("СОЛНЦАНЕТ", VERSION, "installed");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install);
  } else {
    install();
  }
})();
