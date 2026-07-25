const API_BASE = "https://codenpost-backend.onrender.com/api";

let isSignup = false;

const nameInput = document.getElementById("nameInput");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const errorBox = document.getElementById("errorBox");
const formTitle = document.getElementById("formTitle");
const submitBtn = document.getElementById("submitBtn");
const toggleText = document.getElementById("toggleText");
const toggleLink = document.getElementById("toggleLink");

const nameField = document.getElementById("nameField");

toggleLink.addEventListener("click", () => {
  isSignup = !isSignup;
  nameField.style.display = isSignup ? "block" : "none";
  formTitle.textContent = isSignup ? "Create Account" : "Log In";
  submitBtn.textContent = isSignup ? "Sign Up" : "Log In";
  toggleText.textContent = isSignup ? "Already have an account?" : "No account yet?";
  toggleLink.textContent = isSignup ? "Log In" : "Sign Up";
  errorBox.textContent = "";
});

submitBtn.addEventListener("click", async () => {
  errorBox.textContent = "";
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const name = nameInput.value.trim();

  if (!email || !password || (isSignup && !name)) {
    errorBox.textContent = "Please fill in all fields.";
    return;
  }

  const endpoint = isSignup ? "/auth/signup" : "/auth/login";
  const payload = isSignup ? { name, email, password } : { email, password };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) {
      errorBox.textContent = data.error || "Something went wrong.";
      return;
    }

    localStorage.setItem("token", data.token);
    window.location.href = "dashboard.html";
  } catch (err) {
    errorBox.textContent = "Could not reach the server. Is the backend running?";
  }
});