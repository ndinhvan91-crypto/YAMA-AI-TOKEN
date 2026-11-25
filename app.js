/* ==========================================
   YAMA AI - VIP PRO EDITION LOGIC
   Interactive Token Wallet & Multi-AI Core
   ========================================== */

document.addEventListener("DOMContentLoaded", () => {
  // STATE MANAGEMENT
  let state = {
    balance: parseInt(localStorage.getItem("yama_credits")) || 1000,
    maxBalance: 10000,
    history: JSON.parse(localStorage.getItem("yama_history")) || [
      { type: "claim", title: "Khởi tạo tài khoản VIP PRO", amount: 1000, time: "Hệ thống" }
    ]
  };

  // DOM ELEMENTS
  const balanceEl = document.getElementById("balance");
  const walletBalanceEl = document.getElementById("walletBalance");
  const walletProgressEl = document.getElementById("walletProgress");
  const claimBtn = document.getElementById("claimButton");
  const menuBtn = document.getElementById("menuButton");
  const navEl = document.getElementById("navigation");
  const noticeEl = document.getElementById("notice");
  const activityEmptyEl = document.getElementById("activityEmpty");

  // INITIALIZE APP
  function init() {
    updateUI();
    renderHistory();
    setupEventListeners();
  }

  // UPDATE BALANCE & PROGRESS UI
  function updateUI() {
    // Save to LocalStorage
    localStorage.setItem("yama_credits", state.balance);
    localStorage.setItem("yama_history", JSON.stringify(state.history));

    // Format Number with commas (e.g. 1,000)
    const formattedBalance = state.balance.toLocaleString();

    if (balanceEl) balanceEl.textContent = formattedBalance;
    if (walletBalanceEl) walletBalanceEl.textContent = formattedBalance;

    // Progress Bar (Maxed out at 10,000)
    if (walletProgressEl) {
      const percentage = Math.min((state.balance / state.maxBalance) * 100, 100);
      walletProgressEl.style.width = `${percentage}%`;
    }
  }

  // SHOW TOAST NOTICE
  let noticeTimeout;
  function showNotice(message) {
    if (!noticeEl) return;
    noticeEl.textContent = message;
    noticeEl.classList.add("show");

    clearTimeout(noticeTimeout);
    noticeTimeout = setTimeout(() => {
      noticeEl.classList.remove("show");
    }, 3000);
  }

  // RENDER TRANSACTION HISTORY
  function renderHistory() {
    const activityPanel = document.querySelector(".activity-panel");
    if (!activityPanel) return;

    // Keep only the last 5 items
    const recentHistory = state.history.slice(-5).reverse();

    // Clear previous rows except the empty indicator
    const existingRows = activityPanel.querySelectorAll(".activity-row");
    existingRows.forEach(row => row.remove());

    if (recentHistory.length > 0 && activityEmptyEl) {
      activityEmptyEl.style.display = "none";
    }

    recentHistory.forEach(item => {
      const row = document.createElement("div");
      row.className = "activity-row";

      const isPositive = item.amount > 0;
      const sign = isPositive ? "+" : "";
      const amountClass = isPositive ? "positive" : "";
      const icon = isPositive ? "＋" : "✦";

      row.innerHTML = `
        <span class="activity-icon">${icon}</span>
        <div class="activity-info">
          <strong>${item.title}</strong>
          <small>${item.time}</small>
        </div>
        <span class="activity-amount ${amountClass}">${sign}${item.amount}</span>
      `;

      activityPanel.insertBefore(row, activityEmptyEl);
    });
  }

  // ADD TRANSACTION
  function addTransaction(title, amount) {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    state.history.push({
      title: title,
      amount: amount,
      time: timeStr
    });
    renderHistory();
  }

  // EVENT LISTENERS
  function setupEventListeners() {
    // Mobile Menu Toggle
    if (menuBtn && navEl) {
      menuBtn.addEventListener("click", () => {
        const isExpanded = menuBtn.getAttribute("aria-expanded") === "true";
        menuBtn.setAttribute("aria-expanded", !isExpanded);
        navEl.classList.toggle("active");
      });

      // Close menu when clicking a link
      navEl.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => {
          navEl.classList.remove("active");
          menuBtn.setAttribute("aria-expanded", "false");
        });
      });
    }

    // Claim Free Demo Credits (+500)
    if (claimBtn) {
      claimBtn.addEventListener("click", () => {
        state.balance += 500;
        addTransaction("Cấp bổ sung Demo Credits", 500);
        updateUI();
        showNotice("⚡ Đã cộng thành công +500 YAMA Credits!");
      });
    }

    // AI Service Try Demo Buttons
    const useButtons = document.querySelectorAll(".use-button");
    useButtons.forEach(btn => {
      btn.addEventListener("click", (e) => {
        const cost = parseInt(e.target.getAttribute("data-cost")) || 10;
        const card = e.target.closest(".service-card");
        const serviceName = card ? card.querySelector("h3").textContent : "AI Service";

        if (state.balance >= cost) {
          state.balance -= cost;
          addTransaction(`Sử dụng ${serviceName}`, -cost);
          updateUI();
          showNotice(`🚀 Đã khởi chạy Demo ${serviceName} (-${cost} Credits)`);
        } else {
          showNotice("⚠️ Bạn không đủ Credits! Hãy nạp thêm Credits Demo.");
        }
      });
    });

    // Package Selection Buttons (Shop)
    const packageButtons = document.querySelectorAll(".package-button");
    packageButtons.forEach(btn => {
      btn.addEventListener("click", (e) => {
        const pkg = e.target.getAttribute("data-package");
        let amount = 0;
        let name = "STARTER";

        if (pkg === "starter") { amount = 500; name = "STARTER"; }
        else if (pkg === "pro") { amount = 2000; name = "PRO VIP"; }
        else if (pkg === "business") { amount = 5000; name = "BUSINESS"; }

        state.balance += amount;
        addTransaction(`Nhận gói Demo ${name}`, amount);
        updateUI();
        showNotice(`🎉 Đã mở khóa gói Demo ${name} (+${amount.toLocaleString()} Credits)!`);
      });
    });
  }

  // START APPLICATION
  init();
});
