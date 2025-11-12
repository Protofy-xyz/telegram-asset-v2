// Reply directly to the pending job's res (skip is handled in agent_core)
const reqId = params.requestId ?? params.resquestId;
const jobRes = context.boards.getVar("job_" + reqId, true);
if (!jobRes) {
  throw "Unable to send reply: Empty res object in current job.";
}
jobRes.send(params.response);
return params
