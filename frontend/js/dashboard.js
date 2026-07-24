const API_BASE = "http://localhost:5001/api";
const token = localStorage.getItem("token");

if (!token) window.location.href = "index.html";

function authHeaders() {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

// --- Handle LinkedIn redirect back from callback, or check saved status ---
async function checkLinkedinStatus() {
  const params = new URLSearchParams(window.location.search);
  const statusEl = document.getElementById("linkedinStatus");

  if (params.get("linkedin") === "connected") {
    statusEl.textContent = "✅ connected";
    return;
  }
  if (params.get("linkedin") === "error") {
    statusEl.textContent = "❌ connection failed, try again";
    return;
  }

  // No redirect param - ask the backend for the real saved status
  try {
    const res = await fetch(`${API_BASE}/linkedin/status`, { headers: authHeaders() });
    const data = await res.json();
    statusEl.textContent = data.connected ? "✅ connected" : "not connected yet";
  } catch (err) {
    statusEl.textContent = "not connected yet";
  }
}
checkLinkedinStatus();

// --- Save GitHub / LeetCode usernames ---
document.getElementById("saveAccountsBtn").addEventListener("click", async () => {
  const btn = document.getElementById("saveAccountsBtn");
  const statusEl = document.getElementById("accountsStatus");
  const githubUsername = document.getElementById("githubInput").value.trim();
  const leetcodeUsername = document.getElementById("leetcodeInput").value.trim();

  btn.disabled = true;
  statusEl.textContent = "Saving...";

  try {
    const res = await fetch(`${API_BASE}/accounts/link`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ githubUsername, leetcodeUsername }),
    });
    const data = await res.json();
    statusEl.textContent = res.ok ? "Saved!" : data.error || "Failed to save.";
  } catch (err) {
    statusEl.textContent = "Could not reach the server. Is the backend running?";
  } finally {
    btn.disabled = false;
  }
});

// --- Connect LinkedIn ---
document.getElementById("connectLinkedinBtn").addEventListener("click", async () => {
  const btn = document.getElementById("connectLinkedinBtn");
  btn.disabled = true;
  try {
    const res = await fetch(`${API_BASE}/linkedin/connect`, { headers: authHeaders() });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      alert("Could not start LinkedIn connection. Try again.");
      btn.disabled = false;
    }
  } catch (err) {
    alert("Could not reach the server. Is the backend running?");
    btn.disabled = false;
  }
});

// --- Generate a new draft from recent activity ---
document.getElementById("generateBtn").addEventListener("click", async () => {
  const btn = document.getElementById("generateBtn");
  const statusEl = document.getElementById("generateStatus");
  btn.disabled = true;
  statusEl.textContent = "Generating...";

  try {
    const res = await fetch(`${API_BASE}/posts/generate`, {
      method: "POST",
      headers: authHeaders(),
    });
    const data = await res.json();

    if (!res.ok) {
      statusEl.textContent = data.error || "Failed to generate.";
      return;
    }
    statusEl.textContent = data.message || "Draft created!";
    loadPosts();
  } catch (err) {
    statusEl.textContent = "Could not reach the server. Is the backend running?";
  } finally {
    btn.disabled = false;
  }
});

// --- Load and render post history as a one-at-a-time carousel ---
let allPosts = [];
let currentIndex = 0;

async function loadPosts() {
  const list = document.getElementById("postsList");
  try {
    const res = await fetch(`${API_BASE}/posts`, { headers: authHeaders() });
    allPosts = await res.json();
  } catch (err) {
    list.innerHTML = `<p class="empty-state">Could not load posts. Is the backend running?</p>`;
    return;
  }

  if (allPosts.length === 0) {
    list.innerHTML = `<p class="empty-state">No posts yet. Generate one above.</p>`;
    return;
  }

  // Keep the same post in view after an edit/regenerate/publish refresh,
  // but clamp in case the list got shorter than the current index.
  if (currentIndex >= allPosts.length) currentIndex = allPosts.length - 1;

  renderCurrentPost();
}

function renderCurrentPost() {
  const list = document.getElementById("postsList");
  const post = allPosts[currentIndex];

  list.innerHTML = `
    <div class="card-row" style="margin-bottom:10px;">
      <button class="secondary" id="prevPostBtn" ${currentIndex === 0 ? "disabled" : ""}>← prev</button>
      <span class="status-line" style="margin:0;">${currentIndex + 1} / ${allPosts.length}</span>
      <button class="secondary" id="nextPostBtn" ${currentIndex === allPosts.length - 1 ? "disabled" : ""}>next →</button>
    </div>
    <div class="card status-${post.status}">
      <div class="card-row">
        <span class="badge badge-${post.status}">${post.status}</span>
        <button class="secondary deletePostBtn" data-id="${post._id}" style="padding:4px 10px; font-size:11px;">delete</button>
      </div>
      ${post.status === "failed" && post.errorMessage ? `<p class="error" style="margin-top:8px;">${post.errorMessage}</p>` : ""}
      <textarea rows="4" data-id="${post._id}" style="margin-top:12px;">${post.generatedText}</textarea>
      ${
        post.status === "draft"
          ? `<input type="text" class="regenInput" data-id="${post._id}" placeholder="e.g. make it more casual, focus only on leetcode, make it shorter" style="margin-bottom:8px;" />
             <div class="card-actions">
               <button class="secondary saveEditBtn" data-id="${post._id}">Save Edit</button>
               <button class="secondary regenBtn" data-id="${post._id}">Regenerate</button>
               <button class="publishBtn" data-id="${post._id}">Publish to LinkedIn</button>
             </div>`
          : ""
      }
    </div>
  `;

  document.getElementById("prevPostBtn").addEventListener("click", () => {
    if (currentIndex > 0) {
      currentIndex--;
      renderCurrentPost();
    }
  });
  document.getElementById("nextPostBtn").addEventListener("click", () => {
    if (currentIndex < allPosts.length - 1) {
      currentIndex++;
      renderCurrentPost();
    }
  });

  attachCardActionListeners();
}

function showConfirm(message) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed; inset:0; background:rgba(20,20,20,0.4); display:flex; align-items:center; justify-content:center; z-index:1000;";
    overlay.innerHTML = `
      <div style="background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:24px; max-width:340px; box-shadow:0 8px 30px rgba(0,0,0,0.15);">
        <p style="font-weight:600; margin-bottom:6px;">CodeNPost</p>
        <p style="font-size:14px; color:var(--text-muted); margin-bottom:18px;">${message}</p>
        <div style="display:flex; gap:8px; justify-content:flex-end;">
          <button class="secondary" id="confirmCancelBtn">Cancel</button>
          <button id="confirmOkBtn">Delete</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById("confirmOkBtn").addEventListener("click", () => {
      overlay.remove();
      resolve(true);
    });
    document.getElementById("confirmCancelBtn").addEventListener("click", () => {
      overlay.remove();
      resolve(false);
    });
  });
}

function attachCardActionListeners() {
  const deleteBtn = document.querySelector(".deletePostBtn");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", async () => {
      const confirmed = await showConfirm("Delete this post? This can't be undone.");
      if (!confirmed) return;
      const id = deleteBtn.dataset.id;
      deleteBtn.disabled = true;
      try {
        const res = await fetch(`${API_BASE}/posts/${id}`, {
          method: "DELETE",
          headers: authHeaders(),
        });
        if (!res.ok) throw new Error();
        // Step back one position so the view doesn't jump to index 0 unexpectedly
        if (currentIndex > 0) currentIndex--;
        loadPosts();
      } catch (err) {
        alert("Could not delete post. Is the backend running?");
        deleteBtn.disabled = false;
      }
    });
  }

  const regenBtn = document.querySelector(".regenBtn");
  if (regenBtn) {
    regenBtn.addEventListener("click", async () => {
      const id = regenBtn.dataset.id;
      const instruction = document.querySelector(`.regenInput[data-id="${id}"]`).value.trim();
      const originalText = regenBtn.textContent;
      regenBtn.textContent = "Regenerating...";
      regenBtn.disabled = true;

      try {
        const res = await fetch(`${API_BASE}/posts/${id}/regenerate`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ instruction }),
        });
        const data = await res.json();

        if (!res.ok) {
          alert(data.error || "Failed to regenerate");
          regenBtn.textContent = originalText;
          regenBtn.disabled = false;
          return;
        }
        loadPosts();
      } catch (err) {
        alert("Could not reach the server. Is the backend running?");
        regenBtn.textContent = originalText;
        regenBtn.disabled = false;
      }
    });
  }

  const saveEditBtn = document.querySelector(".saveEditBtn");
  if (saveEditBtn) {
    saveEditBtn.addEventListener("click", async () => {
      const id = saveEditBtn.dataset.id;
      const text = document.querySelector(`textarea[data-id="${id}"]`).value;
      const originalText = saveEditBtn.textContent;
      saveEditBtn.disabled = true;
      saveEditBtn.textContent = "Saving...";
      try {
        const res = await fetch(`${API_BASE}/posts/${id}`, {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify({ generatedText: text }),
        });
        if (!res.ok) throw new Error();
        loadPosts();
      } catch (err) {
        alert("Could not save edit. Is the backend running?");
        saveEditBtn.disabled = false;
        saveEditBtn.textContent = originalText;
      }
    });
  }

  const publishBtn = document.querySelector(".publishBtn");
  if (publishBtn) {
    publishBtn.addEventListener("click", async () => {
      const id = publishBtn.dataset.id;
      const originalText = publishBtn.textContent;
      publishBtn.disabled = true;
      publishBtn.textContent = "Publishing...";
      try {
        const res = await fetch(`${API_BASE}/posts/${id}/publish`, {
          method: "POST",
          headers: authHeaders(),
        });
        const data = await res.json();
        if (!res.ok) alert(data.error || "Failed to publish");
        loadPosts();
      } catch (err) {
        alert("Could not reach the server. Is the backend running?");
        publishBtn.disabled = false;
        publishBtn.textContent = originalText;
      }
    });
  }
}

loadPosts();