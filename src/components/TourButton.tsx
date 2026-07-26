"use client";

/** A play button in the header that (re)starts the product tour. */
export function TourButton() {
  return (
    <button
      type="button"
      data-tour="help"
      onClick={() => window.dispatchEvent(new Event("ort:start-tour"))}
      aria-label="Take a tour"
      title="Take a tour"
      className="group grid h-[30px] w-[30px] cursor-pointer place-items-center rounded-full border border-line bg-card text-ink-4 transition-colors hover:border-brick hover:text-brick"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M7 5l12 7-12 7V5z" fill="currentColor" />
      </svg>
    </button>
  );
}
