// Clear authentication tokens in browser localStorage
// Run this in browser console if you're getting 401 errors
localStorage.removeItem("archivio_user");
localStorage.removeItem("archivio_token");
console.log("Authentication tokens cleared. Please refresh the page and log in again.");
