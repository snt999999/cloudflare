document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("leadForm");
  const note = document.getElementById("formNote");

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const data = Object.fromEntries(new FormData(form).entries());
      const text = [
        "Здравствуйте! Хочу записаться в СОЛНЦАНЕТ.",
        "",
        "Имя: " + (data.name || ""),
        "Телефон: " + (data.phone || ""),
        "Адрес: " + (data.address || ""),
        "Информация об объекте: " + (data.objectInfo || ""),
        "Что нужно сделать: " + (data.task || "")
      ].join("\n");

      try {
        await navigator.clipboard.writeText(text);
        if (note) note.textContent = "Текст заявки скопирован. Выберите Telegram или MAX и вставьте сообщение в чат.";
      } catch (err) {
        if (note) note.textContent = "Выберите Telegram или MAX для связи с нами.";
      }

      const choice = document.getElementById("messengerChoice");
      if (choice) {
        choice.scrollIntoView({ behavior: "smooth", block: "center" });
        choice.classList.add("contact-choice--highlight");
        setTimeout(() => choice.classList.remove("contact-choice--highlight"), 1800);
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
});
