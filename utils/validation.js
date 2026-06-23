// Shared request-param validation helpers, so controllers don't each redefine
// the same id checks. Database ids are positive integers; a malformed id is a
// client mistake (400) and should be told apart from a missing resource (404).

// True when a value is NOT a positive integer (rejects "abc", "-1", "0", "", 1.5).
function isInvalidId(value) {
    return !/^\d+$/.test(String(value)) || Number(value) <= 0;
}

module.exports = { isInvalidId };
