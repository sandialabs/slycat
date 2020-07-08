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
    <dt>BF BOOT_FAIL</dt>
    <dd>
      Job terminated due to launch failure, typically due to a hardware failure (e.g. unable to boot
      the node or block and the job can not be requeued).
    </dd>
    <dt>CA CANCELLED</dt>
    <dd>
      Job was explicitly cancelled by the user or system administrator. The job may or may not have
      been initiated.
    </dd>
    <dt>CD COMPLETED</dt>
    <dd>Job has terminated all processes on all nodes with an exit code of zero.</dd>
    <dt>DL DEADLINE</dt>
    <dd>Job terminated on deadline.</dd>
    <dt>F FAILED</dt>
    <dd>Job terminated with non-zero exit code or other failure condition.</dd>
    <dt>NF NODE_FAIL</dt>
    <dd>Job terminated due to failure of one or more allocated nodes.</dd>
    <dt>OOM OUT_OF_MEMORY</dt>
    <dd>Job experienced out of memory error.</dd>
    <dt>PD PENDING</dt>
    <dd>Job is awaiting resource allocation.</dd>
    <dt>PR PREEMPTED</dt>
    <dd>Job terminated due to preemption.</dd>
    <dt>R RUNNING</dt>
    <dd>Job currently has an allocation.</dd>
    <dt>RQ REQUEUED</dt>
    <dd>Job was requeued.</dd>
    <dt>RS RESIZING</dt>
    <dd>Job is about to change size.</dd>
    <dt>RV REVOKED</dt>
    <dd>Sibling was removed from cluster due to other cluster starting the job.</dd>
    <dt>S SUSPENDED</dt>
    <dd>
      Job has an allocation, but execution has been suspended and CPUs have been released for other
      jobs.
    </dd>
    <dt>TO TIMEOUT</dt>
    <dd>Job terminated upon reaching its time limit. </dd>
  </React.Fragment>
);
