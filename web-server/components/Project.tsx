
import server_root from "js/slycat-server-root";
import * as React from 'react';
/**
 * @member name string name of the project
 * @member id string id of the project
 * @member description string description for the project
 * @member creator string name of the creator
 * @member created string representation of the creation time
 */
export interface ProjectProps { 
  name: string
  id: string
  description: string
  creator: string
  created: string
}

/**
 * not used
 */
export interface ProjectState {
}
/**
 * react component for project info on the project list
 *
 * @export default
 * @class Project
 * @extends {React.Component<ProjectProps, ProjectState>}
 */
export default class Project extends React.Component<ProjectProps, ProjectState> {
  render() {
    return (
      <div className='list-group-item list-group-item-action'>
        <a href={server_root + 'projects/' + this.props.id} style={{ color: 'inherit', textDecoration: 'inherit'}}>
          <div className='h6'>
            <span className='badge badge-secondary mr-1'>project</span> {this.props.name}
          </div>
          <p className='mb-2'>{this.props.description}</p>
          <small>
            <em>
            Created <span>{this.props.created}</span> by <span>{this.props.creator}</span>
            </em>
          </small>
        </a>
        <span className='float-right'>
            <button
                type='button'
                className='btn btn-sm btn-danger'
                name={this.props.id}
                onClick={() => console.log('delete')}
                title='Delete this template'
            >
                <span className='fa fa-trash-o' />
            </button>
        </span>
      </div>
    );
  }
}