import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "prune processed telegram updates",
  { hours: 1 },
  internal.telegram.processedUpdates.prune,
  {},
);

crons.interval(
  "dead man's switch: overdue reminders",
  { hours: 1 },
  internal.telegram.reminders.checkDeadManSwitch,
  {},
);

crons.interval(
  "prune fired match reminders",
  { hours: 24 },
  internal.matchReminders.pruneFired,
  {},
);

crons.interval(
  "prune web login requests",
  { hours: 1 },
  internal.webLogin.prune,
  {},
);

export default crons;
