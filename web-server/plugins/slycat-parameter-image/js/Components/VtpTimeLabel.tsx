import React from "react";

interface VtpTimeLabelProps {
  timeValue: number;
  className?: string;
}

/**
 * Overlay showing a VTP file's TimeValue in the top-left of the 3D viewer.
 */
export const VtpTimeLabel: React.FC<VtpTimeLabelProps> = ({ timeValue, className = "" }) => {
  return (
    <div className={`vtp-time-label ${className}`}>
      Time: {timeValue}
    </div>
  );
};
