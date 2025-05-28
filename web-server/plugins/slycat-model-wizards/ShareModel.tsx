import React, { useState, useEffect, useRef } from "react";

/**
 * ShareModel component for the Share Model dialog
 */
interface ShareModelProps {
  modelType?: string;
}

// Model feature configuration - defines which UI elements each model type supports
interface ModelFeatures {
  hasTable: boolean;
  hasBarplot: boolean;
  hasFilters: boolean;
  hasControls: boolean;
}

const MODEL_FEATURES: Record<string, ModelFeatures> = {
  cca: {
    hasTable: true,
    hasBarplot: true,
    hasFilters: false,
    hasControls: true,
  },
  "parameter-image": {
    hasTable: true,
    hasBarplot: false,
    hasFilters: true,
    hasControls: true,
  },
  // Default configuration for unknown model types
  default: {
    hasTable: true,
    hasBarplot: true,
    hasFilters: true,
    hasControls: true,
  },
};

const ShareModel: React.FC<ShareModelProps> = ({ modelType }) => {
  const [activeTab, setActiveTab] = useState<string>("link");
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const [embedUrl, setEmbedUrl] = useState<string>("");
  const [copyLinkSuccess, setCopyLinkSuccess] = useState<boolean>(false);
  const [copyEmbedSuccess, setCopyEmbedSuccess] = useState<boolean>(false);
  const [hideTable, setHideTable] = useState<boolean>(false);
  const [hideBarplot, setHideBarplot] = useState<boolean>(false);
  const [hideFilters, setHideFilters] = useState<boolean>(false);
  const [hideControls, setHideControls] = useState<boolean>(false);
  const [iframeWidth, setIframeWidth] = useState<string>("100");
  const [widthUnit, setWidthUnit] = useState<string>("%");
  const [iframeHeight, setIframeHeight] = useState<string>("600");
  const linkInputRef = useRef<HTMLInputElement>(null);
  const embedTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Get the features for the current model type
  const getModelFeatures = (): ModelFeatures => {
    if (!modelType || !MODEL_FEATURES[modelType]) {
      return MODEL_FEATURES.default;
    }
    return MODEL_FEATURES[modelType];
  };

  const features = getModelFeatures();

  useEffect(() => {
    const url = window.location.href;
    setCurrentUrl(url);
    updateEmbedUrl(url, hideTable, hideBarplot, hideFilters, hideControls);
  }, [hideTable, hideBarplot, hideFilters, hideControls]);

  const updateEmbedUrl = (
    baseUrl: string,
    hideTable: boolean,
    hideBarplot: boolean,
    hideFilters: boolean,
    hideControls: boolean,
  ) => {
    const urlObj = new URL(baseUrl);
    urlObj.searchParams.set("embed", "true");

    // Only add parameters for features that the model supports
    if (features.hasTable && hideTable) {
      urlObj.searchParams.set("hideTable", "true");
    } else {
      urlObj.searchParams.delete("hideTable");
    }

    if (features.hasBarplot && hideBarplot) {
      urlObj.searchParams.set("hideBarplot", "true");
    } else {
      urlObj.searchParams.delete("hideBarplot");
    }

    if (features.hasFilters && hideFilters) {
      urlObj.searchParams.set("hideFilters", "true");
    } else {
      urlObj.searchParams.delete("hideFilters");
    }

    if (features.hasControls && hideControls) {
      urlObj.searchParams.set("hideControls", "true");
    } else {
      urlObj.searchParams.delete("hideControls");
    }

    setEmbedUrl(urlObj.toString());
  };

  const handleHideTableChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHideTable(e.target.checked);
  };

  const handleHideBarplotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHideBarplot(e.target.checked);
  };

  const handleHideFiltersChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHideFilters(e.target.checked);
  };

  const handleHideControlsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHideControls(e.target.checked);
  };

  const handleCopyLink = () => {
    if (linkInputRef.current) {
      linkInputRef.current.select();
      document.execCommand("copy");
      setCopyLinkSuccess(true);
      setTimeout(() => {
        setCopyLinkSuccess(false);
      }, 2000);
    }
  };

  const handleCopyEmbed = () => {
    if (embedTextareaRef.current) {
      embedTextareaRef.current.select();
      document.execCommand("copy");
      setCopyEmbedSuccess(true);
      setTimeout(() => {
        setCopyEmbedSuccess(false);
      }, 2000);
    }
  };

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIframeWidth(e.target.value);
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIframeHeight(e.target.value);
  };

  const getIframeCode = () => {
    const widthValue = widthUnit === "%" ? `${iframeWidth}%` : iframeWidth;
    return `<iframe src='${embedUrl}' width='${widthValue}' height='${iframeHeight}'></iframe>`;
  };

  const readOnlyInputClasses = "bg-body-secondary text-dark-emphasis";

  return (
    <div className="share-model">
      <div className="modal-header">
        <h3 className="modal-title">Share Model</h3>
        <button
          type="button"
          className="btn-close"
          data-bs-dismiss="modal"
          aria-label="Close"
        ></button>
      </div>
      <div className="modal-body pb-4">
        <ul className="nav share-model-tabs nav-tabs mb-4">
          <li className="nav-item">
            <a
              className={`nav-link ${activeTab === "link" ? "active" : ""} fw-bold`}
              style={{ fontSize: "1.1rem", padding: "0.75rem 1.25rem" }}
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab("link");
              }}
            >
              Share Link
            </a>
          </li>
          <li className="nav-item">
            <a
              className={`nav-link ${activeTab === "embed" ? "active" : ""} fw-bold`}
              style={{ fontSize: "1.1rem", padding: "0.75rem 1.25rem" }}
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab("embed");
              }}
            >
              Embed Model
            </a>
          </li>
        </ul>

        {activeTab === "link" && (
          <div className="tab-content">
            <p>Share this link with others to give them access to this model.</p>
            <div className="input-group">
              <input
                type="text"
                className={`form-control ${readOnlyInputClasses}`}
                readOnly
                value={currentUrl}
                ref={linkInputRef}
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                className={`btn ${copyLinkSuccess ? "btn-success" : "btn-primary"}`}
                type="button"
                onClick={handleCopyLink}
              >
                {copyLinkSuccess ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        )}

        {activeTab === "embed" && (
          <div className="tab-content">
            <p>Copy the HTML Embed Code below to embed this model in your website.</p>

            <div className="mt-4">
              <h5>Display Options</h5>

              <div className="row mb-3">
                <div className="col-6">
                  <label htmlFor="iframeWidth">Width</label>
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control"
                      id="iframeWidth"
                      value={iframeWidth}
                      onChange={handleWidthChange}
                      placeholder={widthUnit === "%" ? "e.g. 100" : "e.g. 800"}
                    />
                    <button
                      className={`btn ${widthUnit === "%" ? "btn-secondary" : "btn-outline-secondary"}`}
                      type="button"
                      onClick={() => {
                        if (widthUnit !== "%") {
                          setWidthUnit("%");
                          setIframeWidth("100");
                        }
                      }}
                    >
                      %
                    </button>
                    <button
                      className={`btn ${widthUnit === "px" ? "btn-secondary" : "btn-outline-secondary"}`}
                      type="button"
                      onClick={() => {
                        if (widthUnit !== "px") {
                          setWidthUnit("px");
                          setIframeWidth("1024");
                        }
                      }}
                    >
                      px
                    </button>
                  </div>
                  <small className="form-text text-muted">
                    {widthUnit === "%" ? "Percentage of container width" : "Pixels"}
                  </small>
                </div>
                <div className="col-6">
                  <label htmlFor="iframeHeight">Height</label>
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control"
                      id="iframeHeight"
                      value={iframeHeight}
                      onChange={handleHeightChange}
                      placeholder="e.g. 600"
                    />
                    <span className="input-group-text">px</span>
                  </div>
                </div>
              </div>

              {features.hasFilters && (
                <div className="form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="hideFilters"
                    checked={hideFilters}
                    onChange={handleHideFiltersChange}
                  />
                  <label className="form-check-label" htmlFor="hideFilters">
                    Hide Filters
                  </label>
                </div>
              )}

              {features.hasControls && (
                <div className="form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="hideControls"
                    checked={hideControls}
                    onChange={handleHideControlsChange}
                  />
                  <label className="form-check-label" htmlFor="hideControls">
                    Hide Controls
                  </label>
                </div>
              )}

              {features.hasBarplot && (
                <div className="form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="hideBarplot"
                    checked={hideBarplot}
                    onChange={handleHideBarplotChange}
                  />
                  <label className="form-check-label" htmlFor="hideBarplot">
                    Hide Barplot
                  </label>
                </div>
              )}

              {features.hasTable && (
                <div className="form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="hideTable"
                    checked={hideTable}
                    onChange={handleHideTableChange}
                  />
                  <label className="form-check-label" htmlFor="hideTable">
                    Hide Table
                  </label>
                </div>
              )}
            </div>

            <div className="mt-5">
              <h5>HTML Embed Code</h5>
              <div className="input-group">
                <textarea
                  className={`form-control ${readOnlyInputClasses}`}
                  rows={3}
                  readOnly
                  value={getIframeCode()}
                  ref={embedTextareaRef}
                  onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                />
                <button
                  className={`btn ${copyEmbedSuccess ? "btn-success" : "btn-primary"}`}
                  type="button"
                  onClick={handleCopyEmbed}
                >
                  {copyEmbedSuccess ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="modal-footer">
        <button className="btn btn-secondary" data-bs-dismiss="modal">
          Close
        </button>
      </div>
    </div>
  );
};

export default ShareModel;
