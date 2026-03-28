(function () {
  "use strict";

  var SCRIPT = document.currentScript;
  var TOKEN = SCRIPT.getAttribute("data-token");
  var POSITION = SCRIPT.getAttribute("data-position") || "bottom-right";
  var TRIGGER = SCRIPT.getAttribute("data-trigger") || "3s";
  var API_BASE = SCRIPT.src.replace(/\/widget\/.*$/, "");

  var LS_KEY = "rw_submitted_" + TOKEN;
  var config = null;
  var container = null;
  var panelOpen = false;

  // Check if already submitted in last 24h
  var lastSubmit = localStorage.getItem(LS_KEY);
  if (lastSubmit && Date.now() - parseInt(lastSubmit) < 86400000) return;

  // Country codes
  var COUNTRIES = [
    { code: "+52", flag: "\uD83C\uDDF2\uD83C\uDDFD", name: "MX" },
    { code: "+1", flag: "\uD83C\uDDFA\uD83C\uDDF8", name: "US" },
    { code: "+57", flag: "\uD83C\uDDE8\uD83C\uDDF4", name: "CO" },
    { code: "+54", flag: "\uD83C\uDDE6\uD83C\uDDF7", name: "AR" },
    { code: "+56", flag: "\uD83C\uDDE8\uD83C\uDDF1", name: "CL" },
    { code: "+34", flag: "\uD83C\uDDEA\uD83C\uDDF8", name: "ES" },
    { code: "+55", flag: "\uD83C\uDDE7\uD83C\uDDF7", name: "BR" },
    { code: "+51", flag: "\uD83C\uDDF5\uD83C\uDDEA", name: "PE" },
  ];

  var CHANNEL_INFO = {
    whatsapp: { icon: "\uD83D\uDFE2", label: "WhatsApp" },
    sms: { icon: "\uD83D\uDCF1", label: "SMS" },
    telegram: { icon: "\u2708\uFE0F", label: "Telegram" },
    imessage: { icon: "\uD83D\uDCAC", label: "iMessage" },
  };

  function positionStyles() {
    var s = { position: "fixed", zIndex: "999999" };
    if (POSITION.indexOf("bottom") !== -1) s.bottom = "20px";
    else s.top = "20px";
    if (POSITION.indexOf("right") !== -1) s.right = "20px";
    else s.left = "20px";
    return s;
  }

  function applyStyles(el, styles) {
    for (var k in styles) el.style[k] = styles[k];
  }

  function loadConfig(cb) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", API_BASE + "/api/widgets/" + TOKEN + "/config");
    xhr.onload = function () {
      if (xhr.status === 200) {
        config = JSON.parse(xhr.responseText);
        cb(null, config);
      } else {
        cb(new Error("Widget not found"));
      }
    };
    xhr.onerror = function () { cb(new Error("Network error")); };
    xhr.send();
  }

  function createFAB() {
    var btn = document.createElement("div");
    applyStyles(btn, Object.assign({}, positionStyles(), {
      width: "60px", height: "60px", borderRadius: "50%",
      background: "#25D366", cursor: "pointer",
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      transition: "transform 0.3s ease, box-shadow 0.3s ease",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    }));
    btn.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"/></svg>';
    btn.onmouseenter = function () { btn.style.transform = "scale(1.1)"; btn.style.boxShadow = "0 6px 20px rgba(0,0,0,0.2)"; };
    btn.onmouseleave = function () { btn.style.transform = "scale(1)"; btn.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)"; };
    btn.onclick = togglePanel;
    return btn;
  }

  function createPanel() {
    var channels = (config && config.channels) || ["whatsapp", "sms", "telegram"];
    var welcome = (config && config.welcome_message) || "\u00BFC\u00F3mo podemos ayudarte?";

    var panel = document.createElement("div");
    applyStyles(panel, Object.assign({}, positionStyles(), {
      width: "340px", maxWidth: "calc(100vw - 40px)",
      background: "#fff", borderRadius: "16px",
      boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
      padding: "24px", display: "none",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      fontSize: "14px", color: "#1a1a1a", lineHeight: "1.5",
      boxSizing: "border-box",
    }));
    if (POSITION.indexOf("bottom") !== -1) panel.style.bottom = "90px";
    else panel.style.top = "90px";

    // Country options
    var countryOpts = COUNTRIES.map(function (c) {
      return '<option value="' + c.code + '">' + c.flag + " " + c.code + " " + c.name + "</option>";
    }).join("");

    // Channel buttons
    var channelBtns = channels.map(function (ch) {
      var info = CHANNEL_INFO[ch] || { icon: "\uD83D\uDCE8", label: ch };
      return '<button type="button" class="rw-ch-btn" data-channel="' + ch + '" style="flex:1;padding:10px 8px;border:2px solid #e0e0e0;border-radius:10px;background:#fff;cursor:pointer;font-size:13px;transition:all 0.2s;text-align:center;font-family:inherit">' + info.icon + "<br>" + info.label + "</button>";
    }).join("");

    panel.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">' +
        '<div style="font-size:18px;font-weight:600">\uD83D\uDCAC \u00BFTe contactamos ahora?</div>' +
        '<div id="rw-close" style="cursor:pointer;font-size:20px;color:#999;padding:0 4px">\u2715</div>' +
      "</div>" +
      '<div style="color:#555;margin-bottom:16px">' + escapeHtml(welcome) + "</div>" +
      '<label style="font-weight:500;display:block;margin-bottom:6px">\uD83D\uDCF1 Tu n\u00FAmero:</label>' +
      '<div style="display:flex;gap:8px;margin-bottom:16px">' +
        '<select id="rw-cc" style="padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;background:#fff;font-family:inherit">' + countryOpts + "</select>" +
        '<input id="rw-phone" type="tel" placeholder="555 123 4567" style="flex:1;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;font-family:inherit;min-width:0">' +
      "</div>" +
      '<div style="font-weight:500;margin-bottom:8px">Elige c\u00F3mo contactarte:</div>' +
      '<div id="rw-channels" style="display:flex;gap:8px;margin-bottom:16px">' + channelBtns + "</div>" +
      '<div style="font-size:11px;color:#888;margin-bottom:12px">Al continuar aceptas recibir mensajes en este n\u00FAmero</div>' +
      '<button id="rw-submit" style="width:100%;padding:14px;background:#25D366;color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;transition:background 0.2s;font-family:inherit">Contactarme ahora \u2192</button>' +
      '<div id="rw-result" style="display:none;text-align:center;padding:16px 0"></div>';

    return panel;
  }

  function escapeHtml(str) {
    var d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }

  var selectedChannel = null;

  function initPanel(panel) {
    panel.querySelector("#rw-close").onclick = togglePanel;

    var btns = panel.querySelectorAll(".rw-ch-btn");
    selectedChannel = btns.length > 0 ? btns[0].getAttribute("data-channel") : null;
    if (btns.length > 0) {
      btns[0].style.borderColor = "#25D366";
      btns[0].style.background = "#f0fdf4";
    }

    for (var i = 0; i < btns.length; i++) {
      btns[i].onclick = function () {
        for (var j = 0; j < btns.length; j++) {
          btns[j].style.borderColor = "#e0e0e0";
          btns[j].style.background = "#fff";
        }
        this.style.borderColor = "#25D366";
        this.style.background = "#f0fdf4";
        selectedChannel = this.getAttribute("data-channel");
      };
    }

    panel.querySelector("#rw-submit").onclick = submit;
  }

  function submit() {
    var phone = document.getElementById("rw-phone").value.trim();
    var cc = document.getElementById("rw-cc").value;
    var submitBtn = document.getElementById("rw-submit");
    var resultDiv = document.getElementById("rw-result");

    if (!phone || phone.length < 7) {
      document.getElementById("rw-phone").style.borderColor = "#ef4444";
      return;
    }
    document.getElementById("rw-phone").style.borderColor = "#ddd";

    submitBtn.disabled = true;
    submitBtn.textContent = "Enviando...";
    submitBtn.style.background = "#999";

    var xhr = new XMLHttpRequest();
    xhr.open("POST", API_BASE + "/api/leads");
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onload = function () {
      var data;
      try { data = JSON.parse(xhr.responseText); } catch (e) { data = { ok: false }; }

      if (data.ok) {
        localStorage.setItem(LS_KEY, Date.now().toString());

        var msgs = {
          whatsapp: "\u2705 Te enviamos un WhatsApp al " + cc + " " + phone,
          sms: "\u2705 Te enviamos un SMS al " + cc + " " + phone,
          telegram: "\u2705 Abre Telegram para iniciar la conversaci\u00F3n",
          imessage: "\u2705 Abre iMessage para contactarnos",
        };

        resultDiv.innerHTML = '<div style="font-size:24px;margin-bottom:8px">\uD83C\uDF89</div><div style="font-weight:600">' + (msgs[selectedChannel] || "\u2705 \u00A1Listo!") + "</div>";
        resultDiv.style.display = "block";
        submitBtn.style.display = "none";

        if (data.action_url && (selectedChannel === "telegram" || selectedChannel === "imessage")) {
          setTimeout(function () { window.open(data.action_url, "_blank"); }, 500);
        }
      } else {
        submitBtn.disabled = false;
        submitBtn.textContent = "Contactarme ahora \u2192";
        submitBtn.style.background = "#25D366";
        resultDiv.innerHTML = '<div style="color:#ef4444">\u274C ' + escapeHtml(data.error || "Error al enviar") + "</div>";
        resultDiv.style.display = "block";
      }
    };
    xhr.onerror = function () {
      submitBtn.disabled = false;
      submitBtn.textContent = "Contactarme ahora \u2192";
      submitBtn.style.background = "#25D366";
      resultDiv.innerHTML = '<div style="color:#ef4444">\u274C Error de conexi\u00F3n</div>';
      resultDiv.style.display = "block";
    };
    xhr.send(JSON.stringify({
      widget_token: TOKEN,
      phone: phone,
      country_code: cc,
      channel: selectedChannel,
      source_url: window.location.href,
    }));
  }

  function togglePanel() {
    panelOpen = !panelOpen;
    var fab = container.querySelector(".rw-fab");
    var panel = container.querySelector(".rw-panel");
    if (panelOpen) {
      panel.style.display = "block";
      fab.style.display = "none";
    } else {
      panel.style.display = "none";
      fab.style.display = "flex";
    }
  }

  function initTrigger(fab) {
    if (TRIGGER.match(/^\d+s$/)) {
      var secs = parseInt(TRIGGER);
      setTimeout(function () { if (!panelOpen) togglePanel(); }, secs * 1000);
    } else if (TRIGGER === "exit") {
      document.addEventListener("mouseout", function handler(e) {
        if (e.clientY < 5 && !panelOpen) {
          togglePanel();
          document.removeEventListener("mouseout", handler);
        }
      });
    } else if (TRIGGER.match(/^scroll:\d+%$/)) {
      var pct = parseInt(TRIGGER.split(":")[1]) / 100;
      window.addEventListener("scroll", function handler() {
        var scrolled = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
        if (scrolled >= pct && !panelOpen) {
          togglePanel();
          window.removeEventListener("scroll", handler);
        }
      });
    }
  }

  // Init
  loadConfig(function (err) {
    if (err) return console.warn("Reach Widget:", err.message);

    container = document.createElement("div");
    container.id = "reach-widget";

    var fab = createFAB();
    fab.className = "rw-fab";
    container.appendChild(fab);

    var panel = createPanel();
    panel.className = "rw-panel";
    container.appendChild(panel);
    initPanel(panel);

    document.body.appendChild(container);

    initTrigger(fab);
  });
})();
