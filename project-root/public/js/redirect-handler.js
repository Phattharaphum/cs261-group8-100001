// Function to handle 401 status and redirect to /index.html
function handleUnauthorized() {
  console.log("Unauthorized access. Redirecting to /index.html...");
  alert("You are not authorized. Redirecting to the home page."); // Optional alert
  window.location.href = "/index.html"; // Redirect to /index.html
}

// Function to fetch protected content and handle 401 status
function fetchProtectedContent(url) {
  fetch(url, {
    method: "GET",
    credentials: "include", // Include cookies with the request
  })
    .then((response) => {
      if (response.status === 401) {
        // Redirect immediately on 401 status
        handleUnauthorized();
      } else if (response.status === 200) {
        console.log("Protected content fetched successfully.");
      } else {
        console.error("Unexpected response status:", response.status);
      }
    })
    .catch((error) => {
      console.error("Error fetching protected content:", error);
    });
}

// Automatically run the redirection logic for the current page
fetchProtectedContent(window.location.pathname);
