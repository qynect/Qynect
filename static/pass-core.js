(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.QynectPass = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const QR_REFRESH_SECONDS = 10;
  const QR_PAYLOAD_VERSION = 2;
  const SCHOOL_ID_PATTERN = /^[A-Z0-9-]{1,32}$/;
  const encoder = new TextEncoder();

  let cachedHmacKey = null;
  let cachedHmacSecret = null;

  function collapseWhitespace(value) {
    return String(value == null ? "" : value)
      .trim()
      .replace(/\s+/g, " ");
  }

  function normalizeSchoolId(value) {
    return String(value == null ? "" : value)
      .replace(/\s+/g, "")
      .toUpperCase();
  }

  function isValidSchoolId(value) {
    return SCHOOL_ID_PATTERN.test(normalizeSchoolId(value));
  }

  function gradeForSection(section) {
    const cleaned = collapseWhitespace(section);
    return cleaned ? "Grade " + cleaned.split("-")[0] : "";
  }

  function slotForMilliseconds(milliseconds) {
    return Math.floor(milliseconds / 1000 / QR_REFRESH_SECONDS);
  }

  function timestampForSlot(slot) {
    return slot * QR_REFRESH_SECONDS;
  }

  function remainingMilliseconds(milliseconds) {
    const windowMs = QR_REFRESH_SECONDS * 1000;
    return windowMs - (milliseconds % windowMs);
  }

  function toHex(buffer) {
    return Array.from(new Uint8Array(buffer))
      .map(function (byte) {
        return byte.toString(16).padStart(2, "0");
      })
      .join("");
  }

  function webCrypto() {
    const cryptoApi = globalThis.crypto;
    if (!cryptoApi || !cryptoApi.subtle) {
      throw new Error(
        "Live QR codes need a secure connection. Open this page over HTTPS or localhost.",
      );
    }
    return cryptoApi;
  }

  async function sha256Hex(value) {
    const digest = await webCrypto().subtle.digest(
      "SHA-256",
      encoder.encode(value),
    );
    return toHex(digest);
  }

  async function hmacHex(secret, canonical) {
    const cryptoApi = webCrypto();
    if (!cachedHmacKey || cachedHmacSecret !== secret) {
      cachedHmacKey = await cryptoApi.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );
      cachedHmacSecret = secret;
    }
    const signature = await cryptoApi.subtle.sign(
      "HMAC",
      cachedHmacKey,
      encoder.encode(canonical),
    );
    return toHex(signature);
  }

  async function deriveStudentId(name, grade, section) {
    const normalized = [name, grade, section]
      .map(function (part) {
        return part.toLowerCase();
      })
      .join("|");
    const digest = await sha256Hex(normalized);
    return digest.slice(0, 12).toUpperCase();
  }

  async function makeProfile(input) {
    const schoolId = normalizeSchoolId(input && input.schoolId);
    const name = collapseWhitespace(input && input.name);
    const section = collapseWhitespace(input && input.section);
    const grade = gradeForSection(section);
    const id = await deriveStudentId(name, grade, section);
    return {
      schoolId: schoolId,
      name: name,
      grade: grade,
      section: section,
      id: id,
    };
  }

  function validateProfile(profile, sections) {
    if (!profile || typeof profile !== "object") {
      return false;
    }
    const schoolId = normalizeSchoolId(profile.schoolId);
    const name = collapseWhitespace(profile.name);
    const section = collapseWhitespace(profile.section);
    const grade = gradeForSection(section);
    const id = String(profile.id || "");

    if (!isValidSchoolId(schoolId) || !name || !section) {
      return false;
    }
    if (name.length > 120 || section.length > 120 || id.length !== 12) {
      return false;
    }
    if (grade !== collapseWhitespace(profile.grade)) {
      return false;
    }
    return Array.isArray(sections) && sections.includes(section);
  }

  async function signature(profile, timestamp, secret) {
    const canonical =
      QR_PAYLOAD_VERSION +
      "|" +
      profile.id +
      "|" +
      profile.schoolId +
      "|" +
      profile.name +
      "|" +
      profile.grade +
      "|" +
      profile.section +
      "|" +
      timestamp;
    const digest = await hmacHex(secret, canonical);
    return digest.slice(0, 16);
  }

  async function buildPayload(profile, timestamp, secret) {
    const sig = await signature(profile, timestamp, secret);
    return JSON.stringify({
      v: QR_PAYLOAD_VERSION,
      id: profile.id,
      sid: profile.schoolId,
      n: profile.name,
      g: profile.grade,
      s: profile.section,
      t: timestamp,
      sig: sig,
    });
  }

  return {
    QR_REFRESH_SECONDS: QR_REFRESH_SECONDS,
    QR_PAYLOAD_VERSION: QR_PAYLOAD_VERSION,
    collapseWhitespace: collapseWhitespace,
    normalizeSchoolId: normalizeSchoolId,
    isValidSchoolId: isValidSchoolId,
    gradeForSection: gradeForSection,
    slotForMilliseconds: slotForMilliseconds,
    timestampForSlot: timestampForSlot,
    remainingMilliseconds: remainingMilliseconds,
    makeProfile: makeProfile,
    validateProfile: validateProfile,
    signature: signature,
    buildPayload: buildPayload,
  };
});
