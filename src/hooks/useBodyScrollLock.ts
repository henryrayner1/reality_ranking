import { useLayoutEffect } from "react";

// Freezes the page behind a modal for as long as the calling component is
// mounted, then puts it back exactly where it was.
//
// Why position: fixed rather than overflow: hidden: on iOS, focusing an
// input scrolls the document to centre the field above the keyboard, and
// overflow: hidden doesn't stop that. With the body pinned at its current
// offset, there's no document scroll for iOS to change, so dismissing the
// keyboard no longer leaves the page scrolled somewhere else. It also stops
// the background scrolling under a modal in general.
//
// A counter keeps nested modals (one opened over another) from unlocking the
// page when only the inner one closes.
let lockCount = 0;
let savedScrollY = 0;
let savedStyle = "";

export const useBodyScrollLock = () => {
  useLayoutEffect(() => {
    const body = document.body;
    if (lockCount === 0) {
      savedScrollY = window.scrollY;
      savedStyle = body.getAttribute("style") ?? "";
      body.style.position = "fixed";
      body.style.top = `-${savedScrollY}px`;
      body.style.left = "0";
      body.style.right = "0";
      body.style.width = "100%";
    }
    lockCount += 1;
    return () => {
      lockCount -= 1;
      if (lockCount === 0) {
        if (savedStyle) body.setAttribute("style", savedStyle);
        else body.removeAttribute("style");
        // "instant": Bootstrap's reboot sets scroll-behavior: smooth on :root,
        // which would otherwise animate the page from the top back down to
        // where it was on every close.
        window.scrollTo({ top: savedScrollY, left: 0, behavior: "instant" });
      }
    };
  }, []);
};
