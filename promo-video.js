/* Öffentliches Promovideo: iPhone/Safari, Start nur nach Antippen. */
(() => {
  "use strict";
  const modal = document.getElementById("promo-modal");
  const player = document.getElementById("promo-video");
  const fallback = document.getElementById("promo-fallback");
  const note = document.getElementById("promo-fallback-note");
  const openers = document.querySelectorAll("[data-promo-open]");
  const closer = document.querySelector("[data-promo-close]");
  if (!modal || !player || !fallback || !note || !closer || !openers.length) return;

  const videoPath = "/assets/DachWerkPro_Instagram_Reel_9x16.mp4";
  let available = false;
  let previousFocus = null;

  // Die Video-Datei wird nur verwendet, wenn sie tatsächlich veröffentlicht ist.
  // Die Seite bleibt auch ohne die Datei voll funktionsfähig.
  fetch(videoPath, { method: "HEAD", cache: "no-cache" })
    .then((response) => {
      available = response.ok &&
        (response.headers.get("content-type") || "").toLowerCase().includes("video");
    })
    .catch(() => { available = false; });

  function openPromo() {
    previousFocus = document.activeElement;
    modal.classList.remove("is-hidden");
    document.body.classList.add("promo-modal-open");

    if (available) {
      player.classList.remove("is-hidden");
      fallback.classList.add("is-hidden");
      note.classList.add("is-hidden");
      if (!player.getAttribute("src")) {
        player.setAttribute("src", videoPath);
        player.load();
      }
      const started = player.play();
      if (started && typeof started.catch === "function") {
        // Falls Safari den automatischen Start ablehnt, bleiben die Controls bedienbar.
        started.catch(() => {});
      }
    } else {
      player.pause();
      player.classList.add("is-hidden");
      fallback.classList.remove("is-hidden");
      note.classList.remove("is-hidden");
    }
    closer.focus();
  }

  function closePromo() {
    player.pause();
    modal.classList.add("is-hidden");
    document.body.classList.remove("promo-modal-open");
    if (previousFocus && typeof previousFocus.focus === "function") previousFocus.focus();
  }

  openers.forEach((button) => button.addEventListener("click", openPromo));
  closer.addEventListener("click", closePromo);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closePromo();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.classList.contains("is-hidden")) closePromo();
    if (event.key !== "Tab" || modal.classList.contains("is-hidden")) return;
    const focusable = Array.from(modal.querySelectorAll("button, a, video"))
      .filter((item) => !item.classList.contains("is-hidden"));
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      last.focus(); event.preventDefault();
    } else if (!event.shiftKey && document.activeElement === last) {
      first.focus(); event.preventDefault();
    }
  });
})();
