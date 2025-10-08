import React from "react";
import Footer from "components/Footer/Footer";
import SearchWrapper from "components/SearchWrapper";

type ProjectsPageProps = {
  projects: any[];
};

const ProjectsPage: React.FC<ProjectsPageProps> = ({ projects }) => {
  return (
    <>
      <SearchWrapper items={projects} type="projects" />
      <Footer />
    </>
  );
};

export default ProjectsPage;
