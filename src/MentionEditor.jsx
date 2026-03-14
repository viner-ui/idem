import { useState, useRef, useLayoutEffect, useEffect, useCallback } from 'react';

const USERS = [
  { id: 1, fullName: 'Иван Петров', username: 'ivan' },
  { id: 2, fullName: 'Мария Смирнова', username: 'maria' },
  { id: 3, fullName: 'Алексей Иванов', username: 'alexei' },
  { id: 4, fullName: 'Екатерина Кузнецова', username: 'katya' },
  { id: 5, fullName: 'Дмитрий Орлов', username: 'dmitry' },
  { id: 6, fullName: 'Анна Власова', username: 'anna' },
  { id: 7, fullName: 'Sergey Sokolov', username: 'sergey' },
  { id: 8, fullName: 'Product Manager', username: 'pm' },
  { id: 9, fullName: 'Team Lead', username: 'lead' },
];

function textToHtml(text) {
  return text
    .replace(/\n$/g, '\n\u200b')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>');
}

function filterUsers(query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return USERS;
  return USERS.filter(
    (user) =>
      user.fullName.toLowerCase().includes(q) ||
      user.username.toLowerCase().includes(q)
  );
}

function parseMention(text, caret) {
  const beforeCaret = text.slice(0, caret);
  let atPos = -1;
  for (let i = beforeCaret.length - 1; i >= 0; i--) {
    const ch = beforeCaret[i];
    if (ch === '@') {
      atPos = i;
      break;
    }
    if (/\s/.test(ch)) break;
  }
  if (atPos === -1) return null;
  const query = text.slice(atPos + 1, caret);
  return { start: atPos, query };
}

export default function MentionEditor() {
  const [value, setValue] = useState('');
  const [mentionState, setMentionState] = useState(null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [dropdownCoords, setDropdownCoords] = useState(null);

  const textareaRef = useRef(null);
  const mirrorRef = useRef(null);
  const wrapperRef = useRef(null);
  const dropdownRef = useRef(null);
  const caretAfterInsertRef = useRef(null);

  const filteredUsers = mentionState ? filterUsers(mentionState.query) : [];
  const showDropdown = mentionState && dropdownCoords;

  function syncMirrorStyles() {
    const ta = textareaRef.current;
    const mirror = mirrorRef.current;
    if (!ta || !mirror) return;
    const style = window.getComputedStyle(ta);
    mirror.style.font = style.font;
    mirror.style.lineHeight = style.lineHeight;
    mirror.style.padding = style.padding;
    mirror.style.whiteSpace = 'pre-wrap';
    mirror.style.wordWrap = 'break-word';
    mirror.style.width = `${ta.clientWidth}px`;
  }

  const getCaretCoordinates = useCallback(() => {
    const ta = textareaRef.current;
    const mirror = mirrorRef.current;
    const wrapper = wrapperRef.current;
    if (!ta || !mirror || !wrapper) return null;

    syncMirrorStyles();
    const caretPos = ta.selectionEnd;
    const before = value.slice(0, caretPos);
    const after = value.slice(caretPos);
    mirror.innerHTML =
      textToHtml(before) + '<span id="caret-marker">\u200b</span>' + textToHtml(after);

    const marker = mirror.querySelector('#caret-marker');
    if (!marker) return null;

    const wrapperRect = wrapper.getBoundingClientRect();
    const markerRect = marker.getBoundingClientRect();
    const offsetTop = markerRect.bottom - wrapperRect.top;
    const offsetLeft = markerRect.left - wrapperRect.left;
    return { top: offsetTop + 4, left: offsetLeft };
  }, [value]);

  useLayoutEffect(() => {
    if (!mentionState) {
      setDropdownCoords(null);
      return;
    }
    const coords = getCaretCoordinates();
    setDropdownCoords(coords);
  }, [mentionState, value, getCaretCoordinates]);

  useLayoutEffect(() => {
    if (caretAfterInsertRef.current === null) return;
    const ta = textareaRef.current;
    if (ta) {
      ta.focus();
      ta.setSelectionRange(caretAfterInsertRef.current, caretAfterInsertRef.current);
      caretAfterInsertRef.current = null;
    }
  }, [value]);

  useLayoutEffect(() => {
    if (!showDropdown || filteredUsers.length === 0) return;
    setHighlightedIndex((i) => Math.min(i, Math.max(filteredUsers.length - 1, 0)));
  }, [showDropdown, filteredUsers.length]);

  const hideDropdown = useCallback(() => {
    setMentionState(null);
    setHighlightedIndex(0);
  }, []);

  const insertMention = useCallback(
    (user) => {
      if (!mentionState) return;
      const caret = textareaRef.current?.selectionEnd ?? 0;
      const prefix = value.slice(0, mentionState.start);
      const suffix = value.slice(caret);
      const mentionText = `@${user.username}`;
      const nextText = prefix + mentionText + suffix;
      setValue(nextText);
      caretAfterInsertRef.current = prefix.length + mentionText.length;
      hideDropdown();
    },
    [mentionState, value, hideDropdown]
  );

  const handleInput = (e) => {
    const text = e.target.value;
    const caret = e.target.selectionEnd;
    setValue(text);
    const next = parseMention(text, caret);
    setMentionState(next);
    if (next) setHighlightedIndex(0);
  };

  const handleKeyDown = (e) => {
    if (!mentionState) {
      if (e.key === '@') {
        queueMicrotask(() => {
          const ta = textareaRef.current;
          if (ta) {
            const text = ta.value;
            const caret = ta.selectionEnd;
            const next = parseMention(text, caret);
            setMentionState(next);
          }
        });
      }
      return;
    }

    const hasResults = filteredUsers.length > 0;

    if (e.key === 'ArrowDown' && hasResults) {
      e.preventDefault();
      setHighlightedIndex((i) => (i + 1) % filteredUsers.length);
      return;
    }
    if (e.key === 'ArrowUp' && hasResults) {
      e.preventDefault();
      setHighlightedIndex((i) => (i - 1 + filteredUsers.length) % filteredUsers.length);
      return;
    }
    if (e.key === 'Enter' && hasResults) {
      e.preventDefault();
      insertMention(filteredUsers[highlightedIndex]);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      hideDropdown();
    }
  };

  const handleBlur = () => {
    setTimeout(hideDropdown, 80);
  };

  useEffect(() => {
    const handleDocumentClick = (e) => {
      const target = e.target;
      if (!wrapperRef.current?.contains(target) && !dropdownRef.current?.contains(target)) {
        hideDropdown();
      }
    };
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, [hideDropdown]);

  return (
    <div className="mention-box__editor-wrapper" ref={wrapperRef}>
      <textarea
        ref={textareaRef}
        id="message"
        className="mention-box__textarea"
        rows={8}
        placeholder="Например: Встречаемся завтра с @ivan ..."
        value={value}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
      />
      <div
        ref={mirrorRef}
        className="textarea-mirror"
        aria-hidden
      />
      <div
        ref={dropdownRef}
        className={`mention-dropdown ${showDropdown ? '' : 'mention-dropdown--hidden'}`}
        role="listbox"
        style={
          showDropdown && dropdownCoords
            ? { top: dropdownCoords.top, left: dropdownCoords.left }
            : undefined
        }
      >
        {showDropdown && filteredUsers.length === 0 && (
          <div className="mention-dropdown__empty">Пользователи не найдены</div>
        )}
        {showDropdown &&
          filteredUsers.length > 0 &&
          filteredUsers.map((user, index) => {
            const initials = user.fullName
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase() ?? '')
              .join('');
            const isActive = index === highlightedIndex;
            return (
              <div
                key={user.id}
                className={`mention-dropdown__item ${isActive ? 'mention-dropdown__item--active' : ''}`}
                role="option"
                aria-selected={isActive}
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(user);
                }}
              >
                <div className="mention-dropdown__avatar">{initials}</div>
                <div className="mention-dropdown__meta">
                  <div className="mention-dropdown__name">{user.fullName}</div>
                  <div className="mention-dropdown__username">@{user.username}</div>
                </div>
              </div>
            );
          })}
        {showDropdown && filteredUsers.length > 0 && (
          <div className="mention-dropdown__hint">
            <span>Навигация</span>
            <span>
              <span className="mention-dropdown__hint-kbd">↑ / ↓</span>
              <span className="mention-dropdown__hint-kbd">Enter</span>
              <span className="mention-dropdown__hint-kbd">Esc</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
