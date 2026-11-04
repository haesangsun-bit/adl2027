(() => {
  const list = document.getElementById("participant-list");
  const status = document.getElementById("participants-status");
  if (!list || !status) return;

  const endpoint = document.documentElement.dataset.participantsApi || "";
  const cacheKey = "adl2027-participants-v1";
  if (!endpoint) {
    status.textContent = "The participant list is not available yet.";
    return;
  }

  const surnameKey = (name) => {
    const parts = String(name || "").trim().split(/\s+/);
    return (parts[parts.length - 1] || "").toLocaleLowerCase();
  };

  const render = (participants) => {
    participants = [...participants].sort((a,b) => {
      const bySurname = surnameKey(a.name).localeCompare(surnameKey(b.name));
      return bySurname || String(a.name).localeCompare(String(b.name));
    });

    if (!participants.length) {
      list.hidden = true;
      status.hidden = false;
      status.textContent = "No participants have been listed yet.";
      return;
    }

    const fragment = document.createDocumentFragment();
    participants.forEach(({name, affiliation}) => {
      const row = document.createElement("div");
      row.className = "participant-row";

      const nameEl = document.createElement("div");
      nameEl.className = "participant-name";
      nameEl.textContent = name;

      const affEl = document.createElement("div");
      affEl.className = "participant-affiliation";
      affEl.textContent = affiliation;

      row.append(nameEl, affEl);
      fragment.appendChild(row);
    });

    list.replaceChildren(fragment);
    list.hidden = false;
    status.hidden = true;
  };

  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
    if (cached && Array.isArray(cached.participants)) {
      render(cached.participants);
    }
  } catch (_) {}

  fetch(endpoint, { headers: { "Accept": "application/json" } })
    .then(async (response) => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok !== true || !Array.isArray(data.participants)) {
        throw new Error("participants_unavailable");
      }
      return data.participants;
    })
    .then((participants) => {
      render(participants);
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          savedAt: Date.now(),
          participants
        }));
      } catch (_) {}
    })
    .catch(() => {
      if (list.hidden) {
        status.hidden = false;
        status.textContent = "The participant list is temporarily unavailable.";
      }
    });
})();