const USERS = [
  { id: 1, fullName: "Иван Петров", username: "ivan" },
  { id: 2, fullName: "Мария Смирнова", username: "maria" },
  { id: 3, fullName: "Алексей Иванов", username: "alexei" },
  { id: 4, fullName: "Екатерина Кузнецова", username: "katya" },
  { id: 5, fullName: "Дмитрий Орлов", username: "dmitry" },
  { id: 6, fullName: "Анна Власова", username: "anna" },
  { id: 7, fullName: "Sergey Sokolov", username: "sergey" },
  { id: 8, fullName: "Product Manager", username: "pm" },
  { id: 9, fullName: "Team Lead", username: "lead" },
];

document.addEventListener("DOMContentLoaded", () => {
  const textarea = document.getElementById("message");
  const dropdown = document.getElementById("mention-dropdown");
  const mirror = document.getElementById("textarea-mirror");

  let mentionState = null;
  let highlightedIndex = 0;
  let currentResults = [];

  function syncMirrorStyles() {
    const style = window.getComputedStyle(textarea);
    mirror.style.font = style.font;
    mirror.style.lineHeight = style.lineHeight;
    mirror.style.padding = style.padding;
    mirror.style.whiteSpace = "pre-wrap";
    mirror.style.wordWrap = "break-word";
    mirror.style.width = `${textarea.clientWidth}px`;
  }

  function textToHtml(text) {
    return text
      .replace(/\n$/g, "\n\u200b")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br/>");
  }

  function getCaretCoordinates() {
    syncMirrorStyles();

    const value = textarea.value;
    const caretPos = textarea.selectionEnd;
    const before = value.slice(0, caretPos);
    const after = value.slice(caretPos);

    mirror.innerHTML =
      textToHtml(before) + '<span id="caret-marker">\u200b</span>' + textToHtml(after);

    const marker = mirror.querySelector("#caret-marker");
    if (!marker) {
      return null;
    }

    const wrapper = textarea.parentElement;
    if (!wrapper) {
      return null;
    }

    const wrapperRect = wrapper.getBoundingClientRect();
    const markerRect = marker.getBoundingClientRect();

    const offsetTop = markerRect.bottom - wrapperRect.top;
    const offsetLeft = markerRect.left - wrapperRect.left;

    return {
      top: offsetTop + 4,
      left: offsetLeft,
    };
  }

  function filterUsers(query) {
    const q = query.trim().toLowerCase();
    if (!q) return USERS;
    return USERS.filter((user) => {
      return (
        user.fullName.toLowerCase().includes(q) ||
        user.username.toLowerCase().includes(q)
      );
    });
  }

  function renderDropdown() {
    if (!mentionState || !mentionState.active) {
      dropdown.classList.add("mention-dropdown--hidden");
      dropdown.innerHTML = "";
      return;
    }

    currentResults = filterUsers(mentionState.query);
    highlightedIndex = Math.min(highlightedIndex, Math.max(currentResults.length - 1, 0));

    if (currentResults.length === 0) {
      dropdown.innerHTML =
        '<div class="mention-dropdown__empty">Пользователи не найдены</div>';
    } else {
      dropdown.innerHTML = currentResults
        .map((user, index) => {
          const initials = user.fullName
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase() ?? "")
            .join("");
          const isActive = index === highlightedIndex;
          return `
          <div
            class="mention-dropdown__item ${
              isActive ? "mention-dropdown__item--active" : ""
            }"
            data-index="${index}"
          >
            <div class="mention-dropdown__avatar">${initials}</div>
            <div class="mention-dropdown__meta">
              <div class="mention-dropdown__name">${user.fullName}</div>
              <div class="mention-dropdown__username">@${user.username}</div>
            </div>
          </div>
        `;
        })
        .join("");

      const hint = document.createElement("div");
      hint.className = "mention-dropdown__hint";
      hint.innerHTML = `
        <span>Навигация</span>
        <span>
          <span class="mention-dropdown__hint-kbd">↑ / ↓</span>
          <span class="mention-dropdown__hint-kbd">Enter</span>
          <span class="mention-dropdown__hint-kbd">Esc</span>
        </span>
      `;
      dropdown.appendChild(hint);
    }

    const caretCoords = getCaretCoordinates();
    if (!caretCoords) {
      dropdown.classList.add("mention-dropdown--hidden");
      return;
    }

    dropdown.style.top = `${caretCoords.top}px`;
    dropdown.style.left = `${caretCoords.left}px`;

    dropdown.classList.remove("mention-dropdown--hidden");
  }

  function hideDropdown() {
    mentionState = null;
    highlightedIndex = 0;
    currentResults = [];
    dropdown.classList.add("mention-dropdown--hidden");
    dropdown.innerHTML = "";
  }

  function updateMentionStateFromText() {
    const text = textarea.value;
    const caret = textarea.selectionEnd;

    const beforeCaret = text.slice(0, caret);
    let atPos = -1;
    for (let i = beforeCaret.length - 1; i >= 0; i--) {
      const ch = beforeCaret[i];
      if (ch === "@") {
        atPos = i;
        break;
      }
      if (/\s/.test(ch)) {
        break;
      }
    }

    if (atPos === -1) {
      mentionState = null;
      hideDropdown();
      return;
    }

    const query = text.slice(atPos + 1, caret);

    mentionState = {
      active: true,
      start: atPos,
      query,
    };

    renderDropdown();
  }

  function insertMention(user) {
    if (!mentionState) return;

    const caret = textarea.selectionEnd;
    const text = textarea.value;
    const prefix = text.slice(0, mentionState.start);
    const suffix = text.slice(caret);

    const mentionText = `@${user.username}`;
    const nextText = prefix + mentionText + suffix;
    textarea.value = nextText;

    const newCaret = prefix.length + mentionText.length;
    textarea.focus();
    textarea.setSelectionRange(newCaret, newCaret);

    mentionState = null;
    hideDropdown();
  }

  textarea.addEventListener("input", () => {
    updateMentionStateFromText();
  });

  textarea.addEventListener("keydown", (event) => {
    if (!mentionState || !mentionState.active) {
      if (event.key === "@") {
        queueMicrotask(() => {
          updateMentionStateFromText();
        });
      }
      return;
    }

    const hasResults = currentResults.length > 0;

    if (event.key === "ArrowDown" && hasResults) {
      event.preventDefault();
      highlightedIndex = (highlightedIndex + 1) % currentResults.length;
      renderDropdown();
      return;
    }

    if (event.key === "ArrowUp" && hasResults) {
      event.preventDefault();
      highlightedIndex =
        (highlightedIndex - 1 + currentResults.length) % currentResults.length;
      renderDropdown();
      return;
    }

    if (event.key === "Enter" && hasResults) {
      event.preventDefault();
      const user = currentResults[highlightedIndex];
      insertMention(user);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      hideDropdown();
      return;
    }
  });

  dropdown.addEventListener("mousedown", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const item = target.closest(".mention-dropdown__item");
    if (!item) return;
    event.preventDefault();
    const index = Number(item.getAttribute("data-index"));
    const user = currentResults[index];
    if (user) {
      insertMention(user);
    }
  });

  textarea.addEventListener("blur", () => {
    setTimeout(() => {
      hideDropdown();
    }, 80);
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (!textarea.contains(target) && !dropdown.contains(target)) {
      hideDropdown();
    }
  });
});

