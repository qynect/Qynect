(function () {
  "use strict";

  const config = window.QYNECT_WEB_CONFIG || {};
  const sections = Array.isArray(config.sections) ? config.sections.slice() : [];
  const secret = typeof config.secret === "string" ? config.secret : "";
  const storageKey = "qynect_web_profile_v1";
  const core = window.QynectPass;

  const elements = {
    registerView: document.getElementById("register-view"),
    passView: document.getElementById("pass-view"),
    form: document.getElementById("register-form"),
    formTitle: document.getElementById("form-title"),
    formCopy: document.getElementById("form-copy"),
    schoolId: document.getElementById("school-id"),
    fullName: document.getElementById("full-name"),
    section: document.getElementById("section"),
    grade: document.getElementById("grade"),
    formError: document.getElementById("form-error"),
    submit: document.getElementById("submit-button"),
    cancelEdit: document.getElementById("cancel-edit"),
    editTop: document.getElementById("edit-top"),
    editDetails: document.getElementById("edit-details"),
    forget: document.getElementById("forget-device"),
    profileInitial: document.getElementById("profile-initial"),
    profileName: document.getElementById("profile-name"),
    profileId: document.getElementById("profile-id"),
    profileGradeSection: document.getElementById("profile-grade-section"),
    qrCode: document.getElementById("qr-code"),
    qrDot: document.getElementById("qr-dot"),
    qrCountdown: document.getElementById("qr-countdown"),
    qrProgress: document.getElementById("qr-progress"),
    passError: document.getElementById("pass-error"),
    secureWarning: document.getElementById("secure-warning"),
    installTip: document.getElementById("install-tip"),
  };

  let profile = null;
  let editing = false;
  let currentSlot = null;
  let qrSequence = 0;
  let ticker = null;
  let lastCountdown = null;
  let startupStorageError = "";

  function setView(view) {
    elements.registerView.hidden = view !== "register";
    elements.passView.hidden = view !== "pass";
    window.scrollTo(0, 0);
  }

  function setFormError(message) {
    elements.formError.textContent = message || "";
    elements.formError.hidden = !message;
  }

  function setPassError(message) {
    elements.passError.textContent = message || "";
    elements.passError.hidden = !message;
  }

  function populateSections() {
    elements.section.innerHTML = "";
    const placeholder = new Option("Select your section", "");
    placeholder.disabled = true;
    placeholder.selected = true;
    elements.section.appendChild(placeholder);
    sections.forEach(function (section) {
      elements.section.appendChild(new Option(section, section));
    });
  }

  function updateGrade() {
    elements.grade.value = core
      ? core.gradeForSection(elements.section.value)
      : "";
  }

  function setFormMode(nextEditing) {
    editing = nextEditing;
    elements.formTitle.textContent = editing
      ? "Edit your details"
      : "Create your web pass";
    elements.formCopy.textContent = editing
      ? "Update the details used by your live QR pass."
      : "Register once on this iPhone or iPad. Your pass is saved in this browser.";
    elements.submit.textContent = editing ? "Save changes" : "Create my pass";
    elements.cancelEdit.hidden = !editing;
  }

  function updateProfileSummary() {
    if (!profile) {
      return;
    }
    elements.profileName.textContent = profile.name;
    elements.profileId.textContent = "Student ID: " + profile.schoolId;
    elements.profileGradeSection.textContent =
      profile.grade + " \u00b7 " + profile.section;
    elements.profileInitial.textContent =
      profile.name.trim().charAt(0).toUpperCase() || "Q";
  }

  function renderQr(payload) {
    if (!window.qrcode) {
      throw new Error("The QR generator did not load. Reload the page.");
    }
    const qr = window.qrcode(0, "M");
    qr.addData(payload);
    qr.make();
    elements.qrCode.innerHTML = qr.createSvgTag({
      cellSize: 4,
      margin: 16,
      scalable: true,
      alt: "Live Qynect student QR pass",
      title: "Qynect student QR pass",
    });
    elements.qrCode.setAttribute(
      "aria-label",
      "Live QR pass for " + profile.name + ". It refreshes every 10 seconds.",
    );
  }

  function updateCountdown(now) {
    const remaining = core.remainingMilliseconds(now || Date.now());
    const seconds = Math.max(1, Math.ceil(remaining / 1000));
    if (seconds !== lastCountdown) {
      elements.qrCountdown.textContent = "Refreshes in " + seconds + "s";
      lastCountdown = seconds;
    }
    const low = seconds <= 3;
    const color = low ? "#dc2626" : "#16a34a";
    elements.qrCountdown.style.color = color;
    elements.qrDot.style.backgroundColor = color;
    elements.qrProgress.style.width =
      ((remaining / (core.QR_REFRESH_SECONDS * 1000)) * 100).toFixed(1) + "%";
    elements.qrProgress.style.backgroundColor = color;
  }

  async function refreshQr(force) {
    if (!profile || !core) {
      return;
    }
    const now = Date.now();
    const slot = core.slotForMilliseconds(now);
    if (!force && slot === currentSlot) {
      updateCountdown(now);
      return;
    }

    const sequence = ++qrSequence;
    const timestamp = core.timestampForSlot(slot);
    try {
      const payload = await core.buildPayload(profile, timestamp, secret);
      if (sequence !== qrSequence) {
        return;
      }
      currentSlot = slot;
      renderQr(payload);
      setPassError("");
    } catch (error) {
      if (sequence !== qrSequence) {
        return;
      }
      currentSlot = slot;
      elements.qrCode.textContent = "";
      setPassError(
        error && error.message
          ? error.message
          : "Could not create the live QR pass.",
      );
    }
    updateCountdown(now);
  }

  function tick() {
    if (!profile) {
      return;
    }
    const now = Date.now();
    if (core.slotForMilliseconds(now) === currentSlot) {
      updateCountdown(now);
      return;
    }
    refreshQr(false);
  }

  function startTicker() {
    stopTicker();
    lastCountdown = null;
    ticker = window.setInterval(tick, 200);
    tick();
  }

  function stopTicker() {
    if (ticker !== null) {
      window.clearInterval(ticker);
      ticker = null;
    }
  }

  async function showPass(nextProfile) {
    profile = nextProfile;
    editing = false;
    updateProfileSummary();
    setView("pass");
    setPassError("");
    await refreshQr(true);
    startTicker();
  }

  function showRegister(prefill) {
    setView("register");
    setFormMode(Boolean(prefill));
    setFormError("");
    elements.schoolId.value = prefill ? prefill.schoolId : "";
    elements.fullName.value = prefill ? prefill.name : "";
    elements.section.value = prefill ? prefill.section : "";
    updateGrade();
    window.setTimeout(function () {
      (prefill ? elements.fullName : elements.schoolId).focus();
    }, 50);
  }

  async function loadStoredProfile() {
    let raw = null;
    try {
      raw = window.localStorage.getItem(storageKey);
    } catch (error) {
      startupStorageError =
        "This browser is blocking local storage. Turn off Private Browsing and reload.";
      return null;
    }
    if (!raw) {
      return null;
    }
    try {
      const saved = JSON.parse(raw);
      const nextProfile = await core.makeProfile(saved);
      if (core.validateProfile(nextProfile, sections)) {
        return nextProfile;
      }
    } catch (error) {
      // Invalid saved data is cleared below.
    }
    try {
      window.localStorage.removeItem(storageKey);
    } catch (error) {
      // Ignore storage cleanup failures.
    }
    return null;
  }

  function saveProfile(nextProfile) {
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          schoolId: nextProfile.schoolId,
          name: nextProfile.name,
          section: nextProfile.section,
        }),
      );
    } catch (error) {
      throw new Error(
        "This browser is blocking local storage. Turn off Private Browsing and try again.",
      );
    }
  }

  function beginEdit() {
    if (!profile) {
      return;
    }
    stopTicker();
    qrSequence++;
    showRegister(profile);
  }

  function cancelEdit() {
    if (!profile) {
      return;
    }
    showPass(profile);
  }

  function forgetDevice() {
    if (
      !window.confirm(
        "Forget this device? Your saved details will be removed from this browser.",
      )
    ) {
      return;
    }
    stopTicker();
    profile = null;
    currentSlot = null;
    qrSequence++;
    elements.qrCode.textContent = "";
    setPassError("");
    try {
      window.localStorage.removeItem(storageKey);
    } catch (error) {
      // Ignore storage cleanup failures.
    }
    showRegister(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");

    const schoolId = core.normalizeSchoolId(elements.schoolId.value);
    const name = core.collapseWhitespace(elements.fullName.value);
    const section = elements.section.value;

    if (!core.isValidSchoolId(schoolId)) {
      setFormError("Enter a valid school ID using letters, numbers, or hyphens.");
      elements.schoolId.focus();
      return;
    }
    if (!name) {
      setFormError("Enter your full name.");
      elements.fullName.focus();
      return;
    }
    if (name.length > 120) {
      setFormError("Your name is too long. Use 120 characters or fewer.");
      elements.fullName.focus();
      return;
    }
    if (!sections.includes(section)) {
      setFormError("Select your section.");
      elements.section.focus();
      return;
    }
    if (!core) {
      setFormError("The pass generator did not load. Reload the page.");
      return;
    }

    elements.submit.disabled = true;
    elements.submit.textContent = "Creating...";
    try {
      const nextProfile = await core.makeProfile({ schoolId, name, section });
      if (!core.validateProfile(nextProfile, sections)) {
        throw new Error("Check your details and try again.");
      }
      saveProfile(nextProfile);
      await showPass(nextProfile);
    } catch (error) {
      setFormError(
        error && error.message
          ? error.message
          : "Could not create your pass. Try again.",
      );
    } finally {
      elements.submit.disabled = false;
      setFormMode(editing);
    }
  }

  function isStandalone() {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    );
  }

  function init() {
    populateSections();
    setFormMode(false);

    if (!core) {
      elements.submit.disabled = true;
      setFormError("The pass generator did not load. Reload the page.");
      return;
    }
    if (!sections.length || !secret) {
      elements.submit.disabled = true;
      setFormError("The web pass is not configured. Ask the school administrator.");
      return;
    }
    if (!window.crypto || !window.crypto.subtle) {
      elements.secureWarning.hidden = false;
    }
    if (isStandalone()) {
      elements.installTip.hidden = true;
    }

    elements.section.addEventListener("change", updateGrade);
    elements.form.addEventListener("submit", handleSubmit);
    elements.schoolId.addEventListener("input", function () {
      setFormError("");
    });
    elements.fullName.addEventListener("input", function () {
      setFormError("");
    });
    elements.section.addEventListener("change", function () {
      setFormError("");
    });
    elements.editTop.addEventListener("click", beginEdit);
    elements.editDetails.addEventListener("click", beginEdit);
    elements.cancelEdit.addEventListener("click", cancelEdit);
    elements.forget.addEventListener("click", forgetDevice);

    window.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible" && profile) {
        refreshQr(false);
      }
    });

    loadStoredProfile().then(function (savedProfile) {
      if (savedProfile) {
        showPass(savedProfile);
      } else {
        showRegister(null);
        if (startupStorageError) {
          setFormError(startupStorageError);
        }
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
