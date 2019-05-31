'use strict';
import Project from 'components/Project.tsx'
import * as React from 'react';

/**
 * list of project data objects
 */
export interface ProjectsListProps { 
  projects: ProjectData[]
}

/**
 * data representation for an object
 * @member name string name of the project
 * @member _id string id of the project
 * @member description string description for the project
 * @member creator string name of the creator
 * @member created string representation of the creation time
 */
export interface ProjectData{
  name: string
  _id: string
  description: string
  creator: string
  created: string
}

/**
 * not used
 */
export interface ProjectsListState {
}

/**
 * creates a list of projects
 */
export default class ProjectsList extends React.Component<ProjectsListProps, ProjectsListState> {
  /**
   * not used
   */
  public constructor(props:ProjectsListProps) {
    super(props)
    this.state = {}
  }
  /**
   * return a list of project components based on the projects list in props
   *
   * @memberof ProjectsList
   */
  getProjectMapping = () => {
    return this.props.projects.map((project) =>
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
  }

  render() {
    return this.props.projects.length > 0 ?
        <div className="container pt-0">
          <div className="card">
            <div className="list-group list-group-flush">
                {this.getProjectMapping()}
            </div>
          </div>
        </div>:null;
  }
}
