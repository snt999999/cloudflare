document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("leadForm");
  const note = document.getElementById("formNote");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const text = [
      "Здравствуйте! Хочу записаться в СОЛНЦАНЕТ.",
      "",
      "Имя: " + data.name,
      "Телефон: " + data.phone,
      "Адрес: " + data.address,
      "Информация об объекте: " + data.objectInfo,
      "Что нужно сделать: " + data.task
    ].join("\n");
    note.textContent = "Заявка подготовлена. Открываю WhatsApp.";
    window.open("https://wa.me/79126629235?text=" + encodeURIComponent(text), "_blank", "noopener");
  });
});
