
/*
=========================================================
 YAMA AI CREDIT ENGINE 1.0
 Internal demo credit wallet and transaction ledger
 Mode: LOCAL DEMO ONLY
=========================================================

IMPORTANT:
- This is not a real-money wallet.
- Credits have no monetary value.
- Data is stored in the current browser.
- Do not use this frontend as a production ledger.
*/

(function () {
  "use strict";

  const STORAGE_KEY = "yama_credit_engine_v1";

  const SERVICES = {
    chat: {
      name: "AI Chat",
      cost: 10
    },
    image: {
      name: "AI Image",
      cost: 50
    },
    coding: {
      name: "AI Coding",
      cost: 20
    },
    research: {
      name: "AI Research",
      cost: 30
    },
    voice: {
      name: "AI Voice",
      cost: 25
    },
    video: {
      name: "AI Video",
      cost: 100
    }
  };

  function createId() {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return crypto.randomUUID();
    }

    return "YAMA-" + Date.now() + "-" +
      Math.random().toString(16).slice(2);
  }

  function createInitialState() {
    const now = new Date().toISOString();

    return {
      version: 1,
      mode: "DEMO",
      balance: 1000,
      createdAt: now,
      updatedAt: now,
      transactions: [
        {
          id: createId(),
          type: "DEMO_INITIAL",
          amount: 1000,
          balanceAfter: 1000,
          description: "Initial demo credits",
          createdAt: now
        }
      ]
    };
  }

  function readState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (!raw) {
        const initial = createInitialState();
        saveState(initial);
        return initial;
      }

      const state = JSON.parse(raw);

      if (
        !state ||
        state.version !== 1 ||
        !Number.isInteger(state.balance) ||
        state.balance < 0 ||
        !Array.isArray(state.transactions)
      ) {
        throw new Error("Invalid demo wallet data");
      }

      return state;
    } catch (error) {
      console.error("YAMA Credit Engine:", error);

      const initial = createInitialState();
      saveState(initial);
      return initial;
    }
  }

  function saveState(state) {
    state.updatedAt = new Date().toISOString();

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(state)
    );
  }

  function validateAmount(amount) {
    return (
      Number.isSafeInteger(amount) &&
      amount > 0 &&
      amount <= 100000
    );
  }

  function addTransaction(
    state,
    type,
    amount,
    description
  ) {
    const transaction = {
      id: createId(),
      type,
      amount,
      balanceAfter: state.balance,
      description,
      createdAt: new Date().toISOString()
    };

    state.transactions.unshift(transaction);

    // Keep the most recent 200 demo transactions.
    state.transactions = state.transactions.slice(0, 200);

    saveState(state);

    return transaction;
  }

  function getBalance() {
    return readState().balance;
  }

  function getTransactions() {
    return readState().transactions;
  }

  function getServices() {
    return Object.keys(SERVICES).map(function (key) {
      return {
        id: key,
        name: SERVICES[key].name,
        cost: SERVICES[key].cost
      };
    });
  }

  function getSummary() {
    const state = readState();

    return {
      mode: state.mode,
      balance: state.balance,
      transactionCount: state.transactions.length,
      updatedAt: state.updatedAt
    };
  }

  function spend(serviceId) {
    const service = SERVICES[serviceId];

    if (!service) {
      return {
        success: false,
        message: "Unknown AI service."
      };
    }

    const state = readState();

    if (state.balance < service.cost) {
      return {
        success: false,
        message: "Insufficient demo credits."
      };
    }

    state.balance -= service.cost;

    addTransaction(
      state,
      "USAGE",
      -service.cost,
      service.name + " demo usage"
    );

    return {
      success: true,
      service: service.name,
      cost: service.cost,
      balance: state.balance,
      message: service.name + " demo usage completed."
    };
  }

  function grantDemo(amount) {
    if (!validateAmount(amount)) {
      return {
        success: false,
        message: "Invalid demo credit amount."
      };
    }

    const state = readState();

    if (state.balance + amount > 1000000) {
      return {
        success: false,
        message: "Demo wallet limit reached."
      };
    }

    state.balance += amount;

    addTransaction(
      state,
      "DEMO_GRANT",
      amount,
      "Manual demo credit allocation"
    );

    return {
      success: true,
      amount: amount,
      balance: state.balance,
      message: "Demo credits added."
    };
  }

  function resetDemo() {
    const initial = createInitialState();
    saveState(initial);

    return {
      success: true,
      balance: initial.balance,
      message: "Demo wallet reset."
    };
  }

  function formatDate(value) {
    return new Date(value).toLocaleString();
  }

  window.YAMACreditEngine = Object.freeze({
    version: "1.0.0",
    mode: "DEMO",
    getBalance,
    getTransactions,
    getServices,
    getSummary,
    spend,
    grantDemo,
    resetDemo,
    formatDate
  });

  console.log(
    "YAMA AI CREDIT ENGINE 1.0 loaded — DEMO MODE"
  );
})();
