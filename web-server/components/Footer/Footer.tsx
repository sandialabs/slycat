import React, { useEffect, useState } from "react";
import client from "js/slycat-web-client";

export const GITHUB_URL = "https://github.com/sandialabs/slycat";
export const DOCS_URL = "/docs/index.html";
export const RANDD100_URL = "https://www.rdworldonline.com/rd-100-2021-winner/slycat/";
export const ABOUT_MODAL_ID = "slycat-about";

const Footer: React.FC = () => {
  const year = new Date().getFullYear();
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
      <div className="container d-flex flex-column flex-sm-row align-items-center justify-content-between gap-2 p-0">
        <div className="copyright text-muted small me-5 w-50">
          © {year} National Technology & Engineering Solutions of Sandia, LLC (NTESS). Under the
          terms of Contract DE-NA0003525 with NTESS, the U.S. Government retains certain rights in
          this software.
        </div>
        <ul className="nav small">
          <li className="nav-item">
            <a
              className="nav-link px-4 text-muted"
              href="#"
              data-bs-toggle="modal"
              data-bs-target="#slycat-about"
            >
              About
            </a>
          </li>
          {supportHref && (
            <li className="nav-item">
              <a className="nav-link px-4 text-muted" href={supportHref}>
                Support
              </a>
            </li>
          )}
          <li className="nav-item">
            <a className="nav-link px-4 text-muted" href={DOCS_URL} target="_blank">
              Docs
            </a>
          </li>
          <li className="nav-item">
            <a className="nav-link px-4 text-muted" href={GITHUB_URL} target="_blank">
              GitHub
            </a>
          </li>
          <li className="nav-item">
            <a className="nav-link px-4 pe-0 text-muted" href={RANDD100_URL} target="_blank">
              R&D 100 Winner
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
};

export default Footer;
