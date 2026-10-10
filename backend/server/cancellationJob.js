const { runCancellationCheck } = require('./supabaseClient');

let intervalTimer = null;

function startCancellationJob(intervalMs = 30000) {
  console.log(`⏱ 24-Hour Cancellation Policy Background Worker initiated (Polling every ${intervalMs / 1000}s)`);

  // Run initial check
  runCancellationCheck().then(res => {
    if (res.cancelled_count > 0) {
      console.log(`[Cancellation Worker] Auto-cancelled ${res.cancelled_count} expired booking(s).`);
    }
  }).catch(err => console.error('[Cancellation Worker Error]:', err.message));

  intervalTimer = setInterval(async () => {
    try {
      const res = await runCancellationCheck();
      if (res && res.cancelled_count > 0) {
        console.log(`[Cancellation Worker] Auto-cancelled ${res.cancelled_count} expired Pay-at-Hotel booking(s).`);
      }
    } catch (err) {
      console.error('[Cancellation Worker Error]:', err.message);
    }
  }, intervalMs);

  return intervalTimer;
}

function stopCancellationJob() {
  if (intervalTimer) {
    clearInterval(intervalTimer);
    intervalTimer = null;
  }
}

module.exports = {
  startCancellationJob,
  stopCancellationJob
};
