import React from "react";
import server_root from 'js/slycat-server-root';

class ProjectsList extends React.Component {
  render() {
    const projects = this.props.projects.map((project) =>
    {
      return  (
                <Project 
                  name={project.name} 
                  key={project._id}
                  id={project._id} 
                  description={project.description} 
                  created={project.created}
                  creator={project.creator} 
                />
              );
    });

    if(projects.length > 0)
    {
      return (
        <div className="container pt-0">
          <div className="card">
            <div className="list-group list-group-flush">
                {projects}
            </div>
          </div>
        </div>
      );
    }
    else
    {
      return null;
    }
  }
}

class Project extends React.Component {
  render() {
    return (
      <a className="list-group-item list-group-item-action" href={server_root + 'projects/' + this.props.id}>
        <div className="h6">
          <span className="badge badge-secondary mr-1">project</span> {this.props.name}
        </div>
        <p className="mb-2">{this.props.description}</p>
        <small>
          <em>
          Created <span>{this.props.created}</span> by <span>{this.props.creator}</span>
          </em>
        </small>
      </a>
    );
  }
}

export default ProjectsList;