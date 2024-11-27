// sessionTimeout.js
document.addEventListener("DOMContentLoaded", function () {
  function checkSession() {
    fetch("/session-info")
      .then((response) => {
        if (response.status === 401) {
          alert("Your session has expired. Please log in again.");
          window.location.href = "/index.html";
        }
      })
      .catch((error) => {
        console.error("Error checking session:", error);
      });
  }
  checkSession();
});
