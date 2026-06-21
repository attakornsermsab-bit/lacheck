(() => {
  const button = document.getElementById("refreshButton");
  if (!button || !window.location.hostname.endsWith("github.io")) return;

  button.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();

      button.disabled = true;
      button.textContent = "Refreshing...";

      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set("ts", Date.now().toString());
      window.location.replace(nextUrl.toString());
    },
    true
  );
})();
