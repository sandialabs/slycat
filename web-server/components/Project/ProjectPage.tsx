import React from "react";
import Footer from "components/Footer/Footer";
import SearchWrapper from "components/SearchWrapper";
import { TemplatesList } from "components/TemplateList";

type ProjectPageProps = {
  projectId: string;
  models: any[];
};

const ProjectPage: React.FC<ProjectPageProps> = ({ projectId, models }) => {
  return (
    <>
      <div id="slycat-models" className="mb-5">
        <SearchWrapper items={models} type="models" />
      </div>
      <div id="slycat-templates" className="mb-5">
        <TemplatesList projectId={projectId} />
      </div>
      <Footer />
    </>
  );
};

export default ProjectPage;
