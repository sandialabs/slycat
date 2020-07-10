"use strict";
import * as React from "react";
import { JobCodesProps } from "./types";
/**
 * react component used to create a loading page
 *
 * @export
 * @class LoadingPage
 * @extends {React.Component<JobCodesProps>}
 */
export const JobCodes: React.FunctionComponent<JobCodesProps> = () => (
  <React.Fragment>
    <dt>JOB STATE CODES</dt>
    <dt>BOOT_FAIL (BF)</dt>
    <dd>
      Job terminated due to launch failure, typically due to a hardware failure (e.g. unable to boot
      the node or block and the job can not be requeued).
    </dd>
    <dt>CANCELLED (CA)</dt>
    <dd>
      Job was explicitly cancelled by the user or system administrator. The job may or may not have
      been initiated.
    </dd>
    <dt>COMPLETED (CD)</dt>
    <dd>Job has terminated all processes on all nodes with an exit code of zero.</dd>
    <dt>DEADLINE (DL)</dt>
    <dd>Job terminated on deadline.</dd>
    <dt>FAILED (F)</dt>
    <dd>Job terminated with non-zero exit code or other failure condition.</dd>
    <dt>NODE_FAIL (NF)</dt>
    <dd>Job terminated due to failure of one or more allocated nodes.</dd>
    <dt>OUT_OF_MEMORY (OOM)</dt>
    <dd>Job experienced out of memory error.</dd>
    <dt>PENDING (PD)</dt>
    <dd>Job is awaiting resource allocation.</dd>
    <dt>PREEMPTED (PR)</dt>
    <dd>Job terminated due to preemption.</dd>
    <dt>RUNNING (R)</dt>
    <dd>Job currently has an allocation.</dd>
    <dt>REQUEUED (RQ)</dt>
    <dd>Job was requeued.</dd>
    <dt>RESIZING (RS)</dt>
    <dd>Job is about to change size.</dd>
    <dt>REVOKED (RV)</dt>
    <dd>Sibling was removed from cluster due to other cluster starting the job.</dd>
    <dt>SUSPENDED (S)</dt>
    <dd>
      Job has an allocation, but execution has been suspended and CPUs have been released for other
      jobs.
    </dd>
    <dt>TIMEOUT (TO)</dt>
    <dd>Job terminated upon reaching its time limit. </dd>
  </React.Fragment>
);
