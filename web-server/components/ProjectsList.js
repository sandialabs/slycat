import React from "react";
import client from 'js/slycat-web-client';
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
        <div className="container">
          <div className="panel panel-default">
            <div className="list-group">
              <React.Fragment>
                {projects}
              </React.Fragment>
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
      <a className="list-group-item" href={server_root + 'projects/' + this.props.id}>
        <span className="label label-default">project</span> <strong>{this.props.name}</strong>
        <p>
          <small>
            <span>{this.props.description}</span>
            <em>
            Created <span>{this.props.created}</span> by <span>{this.props.creator}</span>
            </em>
          </small>
        </p>
      </a>
    );
  }
}

export default ProjectsList;