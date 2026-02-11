import React, { useEffect, useState } from "react";
import client from "js/slycat-web-client";
import { COPYRIGHT_TEXT, COPYRIGHT_TEXT_SHORT, LICENSE_TEXT_SHORT } from "utils/copyright";

export const GITHUB_URL = "https://github.com/sandialabs/slycat";
export const DOCS_URL = "/docs/index.html";
export const RANDD100_URL = "https://www.rdworldonline.com/rd-100-2021-winner/slycat/";
export const ABOUT_MODAL_ID = "slycat-about";

const Footer: React.FC = () => {
  const [supportHref, setSupportHref] = useState<string | null>(null);

  useEffect(() => {
    try {
      client.get_configuration_support_email({
        success: function (email: any) {
          const address = email?.address;
          if (!address) {
            setSupportHref(null);
            return;
          }
          const subject = email?.subject ? encodeURIComponent(email.subject) : "";
          const href = subject ? `mailto:${address}?subject=${subject}` : `mailto:${address}`;
          setSupportHref(href);
        },
        error: function () {
          setSupportHref(null);
        },
      });
    } catch {
      setSupportHref(null);
    }
  }, []);

  return (
    <footer className="mt-auto py-3">
      <div className="container d-flex flex-row align-items-center justify-content-between gap-5">
        <div
          className="copyright text-muted small me-5 mb-0 flex-fill"
          data-bs-toggle="popover"
          data-bs-trigger="hover"
          data-bs-html="true"
          data-bs-content={
            "<p>" + COPYRIGHT_TEXT + "</p><p class='mb-0'>" + LICENSE_TEXT_SHORT + "</p>"
          }
        >
          {COPYRIGHT_TEXT_SHORT}...
        </div>
        <ul className="nav small align-self-start justify-content-end column-gap-4 row-gap-2 flex-nowrap text-nowrap">
          <li className="nav-item">
            <a
              className="nav-link p-0 text-muted"
              href="#"
              data-bs-toggle="modal"
              data-bs-target="#slycat-about"
            >
              About
            </a>
          </li>
          {supportHref && (
            <li className="nav-item">
              <a className="nav-link p-0 text-muted" href={supportHref}>
                Support
              </a>
            </li>
          )}
          <li className="nav-item">
            <a className="nav-link p-0 text-muted" href={DOCS_URL} target="_blank">
              Docs
            </a>
          </li>
          <li className="nav-item">
            <a className="nav-link p-0 text-muted" href={GITHUB_URL} target="_blank">
              GitHub
            </a>
          </li>
          <li className="nav-item">
            <a className="nav-link p-0 pe-0 text-muted" href={RANDD100_URL} target="_blank">
              R&D 100 Winner
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
};

export default Footer;
