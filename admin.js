document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("leadForm");
  const note = document.getElementById("formNote");
  const submitBtn = document.getElementById("leadSubmitBtn");
  const startedAt = document.getElementById("formStartedAt");

  if (startedAt) startedAt.value = String(Date.now());

  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());
      const originalText = submitBtn ? submitBtn.textContent : "";

      setFormState(true, "Отправляем заявку...");

      try {
        const response = await fetch("/create-public-lead", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok || !result.ok) {
          throw new Error(result.error || "Заявку не удалось отправить");
        }

        const emailText = result.emailSent
          ? "Копия заявки отправлена на почту."
          : "Заявка сохранена в админке. Почта Web3Forms пока не подключена.";

        if (note) {
          note.textContent = `Заявка отправлена. Мы свяжемся с вами в ближайшее время. ${emailText}`;
          note.classList.remove("is-error");
          note.classList.add("is-success");
        }

        form.reset();
        if (startedAt) startedAt.value = String(Date.now());
      } catch (error) {
        if (note) {
          note.textContent = `${error.message}. Можно написать нам напрямую в Telegram или MAX — текст заявки скопирован в буфер.`;
          note.classList.remove("is-success");
          note.classList.add("is-error");
        }
        await copyLeadText(data);
        highlightMessengers();
      } finally {
        setFormState(false, originalText || "Отправить заявку");
      }
    });
  }

  document.querySelectorAll(".floating-contact__main").forEach((button) => {
    button.addEventListener("click", () => {
      const root = button.closest(".floating-contact");
      if (root) root.classList.toggle("is-open");
    });
  });

  document.addEventListener("click", (event) => {
    document.querySelectorAll(".floating-contact.is-open").forEach((root) => {
      if (!root.contains(event.target)) root.classList.remove("is-open");
    });
  });

  function setFormState(isLoading, text) {
    if (!submitBtn) return;
    submitBtn.disabled = isLoading;
    submitBtn.textContent = text;
  }

  async function copyLeadText(data) {
    const text = [
      "Здравствуйте! Хочу оставить заявку в СОЛНЦАНЕТ.",
      "",
      "Имя: " + (data.name || ""),
      "Телефон: " + (data.phone || ""),
      "Услуга: " + (data.service || ""),
      "Дата: " + (data.preferredDate || ""),
      "Время: " + (data.preferredTime || ""),
      "Адрес: " + (data.address || ""),
      "Информация об объекте: " + (data.objectInfo || ""),
      "Комментарий: " + (data.task || "")
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
    } catch (_) {
      // Если браузер запретил буфер, просто оставляем сообщение с кнопками связи.
    }
  }

  function highlightMessengers() {
    const choice = document.getElementById("messengerChoice");
    if (!choice) return;
    choice.scrollIntoView({ behavior: "smooth", block: "center" });
    choice.classList.add("contact-choice--highlight");
    setTimeout(() => choice.classList.remove("contact-choice--highlight"), 1800);
  }
});
