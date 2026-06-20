import { useState, useRef, useEffect } from "react";
import { useAutocomplete } from "../hooks/useAutocomplete";
import { AutocompleteDropdown } from "./AutocompleteDropdown";
import styles from "./SearchInput.module.css";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (ticker: string) => void;
  isLoading: boolean;
}

export function SearchInput({
  value,
  onChange,
  onSubmit,
  isLoading,
}: SearchInputProps) {
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isListening, setIsListening] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const recognitionRef = useRef<InstanceType<typeof SpeechRecognition> | null>(
    null,
  );
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { suggestions, loading: acLoading } = useAutocomplete(value);

  useEffect(
    () => () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    },
    [],
  );

  function handleMicClick() {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }
    const SR = window.webkitSpeechRecognition ?? window.SpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript.trim().toUpperCase();
      onChange(transcript);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  const showDropdown =
    focused && !isLoading && (acLoading || suggestions.length > 0);

  function trySubmit(symbol: string) {
    const t = symbol.trim().toUpperCase();
    if (!t) return;
    if (!acLoading && !suggestions.some((s) => s.symbol === t)) {
      setValidationError(
        "Please select a valid ticker from the suggestions (e.g. AAPL, TSLA)",
      );
      return;
    }
    setValidationError(null);
    onSubmit(t);
  }

  function handleSelect(symbol: string) {
    onChange(symbol);
    setValidationError(null);
    setFocused(false);
    setActiveIndex(-1);
    onSubmit(symbol);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        handleSelect(suggestions[activeIndex].symbol);
      } else {
        trySubmit(value);
      }
    } else if (e.key === "Escape") {
      setFocused(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.pill}>
        <svg
          className={styles.searchIcon}
          width="18"
          height="18"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <circle cx="8.5" cy="8.5" r="5.5" />
          <line x1="13" y1="13" x2="18" y2="18" />
        </svg>

        <input
          className={styles.input}
          type="text"
          value={value}
          placeholder="Enter ticker, e.g., TSLA..."
          disabled={isLoading}
          onChange={(e) => {
            onChange(e.target.value.toUpperCase());
            setActiveIndex(-1);
            setValidationError(null);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            blurTimerRef.current = setTimeout(() => {
              setFocused(false);
              setActiveIndex(-1);
            }, 150);
          }}
          onKeyDown={handleKeyDown}
        />

        <button
          className={`${styles.micBtn} ${isListening ? styles.listening : ""}`}
          title={isListening ? "Stop listening" : "Voice input"}
          type="button"
          onClick={handleMicClick}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" />
            <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
            <line x1="12" y1="18" x2="12" y2="22" />
            <line x1="8" y1="22" x2="16" y2="22" />
          </svg>
        </button>
      </div>

      {validationError && (
        <div className={styles.validationError}>{validationError}</div>
      )}

      {showDropdown && (
        <AutocompleteDropdown
          suggestions={suggestions}
          activeIndex={activeIndex}
          loading={acLoading}
          onSelect={handleSelect}
          onHover={setActiveIndex}
        />
      )}
    </div>
  );
}
