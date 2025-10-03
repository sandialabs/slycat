import React from "react";
import model_names from "js/slycat-model-names";

interface ModelTypeBadgeProps {
  modelType: string;
  className?: string;
}

/**
 * A badge component that displays the translated model type
 */
const ModelTypeBadge: React.FC<ModelTypeBadgeProps> = ({ modelType, className = "" }) => {
  const baseClasses = "badge rounded-pill bg-primary-subtle text-primary text-capitalize py-2 px-3";
  const combinedClasses = className ? `${baseClasses} ${className}` : baseClasses;

  return <span className={combinedClasses}>{model_names.translate_model_type(modelType)}</span>;
};

export default ModelTypeBadge;
