(() => {
  const form = document.getElementById("registration-form");
  if (!form) return;

  const endpoint = document.documentElement.dataset.registrationApi || "";
  const submit = document.getElementById("registration-submit");
  const message = document.getElementById("registration-message");
  const success = document.getElementById("registration-success");

  if (!endpoint) {
    submit.disabled = true;
    message.className = "registration-message is-info";
    message.textContent = "Registration is being activated. Please check back shortly.";
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    message.textContent = "";
    message.className = "registration-message";

    if (!form.reportValidity()) return;

    const attendance = [...form.querySelectorAll('input[name="attendance"]:checked')]
      .map((input) => input.value);

    if (!attendance.length) {
      message.className = "registration-message is-error";
      message.textContent = "Please select at least one attendance date.";
      return;
    }

    const formData = new FormData(form);
    const payload = {
      name: formData.get("name"),
      email: formData.get("email"),
      affiliation: formData.get("affiliation"),
      position: formData.get("position"),
      attendance,
      dietary: formData.get("dietary"),
      comments: formData.get("comments"),
      website: formData.get("website")
    };

    submit.disabled = true;
    submit.textContent = "Submitting…";

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.ok !== true) {
        throw new Error(result.error || "submission_failed");
      }

      form.hidden = true;
      success.hidden = false;
      success.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (error) {
      console.error(error);
      message.className = "registration-message is-error";
      message.textContent = "We could not submit your registration. Please try again.";
      submit.disabled = false;
      submit.textContent = "Submit registration";
    }
  });
})();
