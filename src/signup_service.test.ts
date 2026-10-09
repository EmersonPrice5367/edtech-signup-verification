import { strict as assert } from "node:assert";
import { courseStatus } from "./signup_service";
const now = new Date("2026-01-10T00:00:00.000Z");
assert.equal(courseStatus("2026-01-11T00:00:00.000Z", now), "on_track");
assert.equal(courseStatus("2026-01-09T00:00:00.000Z", now), "overdue");
console.log("course deadline decision: ok");
