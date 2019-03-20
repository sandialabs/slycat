import React from "react";
import client from 'js/slycat-web-client';
import server_root from 'js/slycat-server-root';

class SearchWrapper extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      initialProjects: this.props.projects,
      projects: [],
      searchQuery: '',
    };
    this.filterList = this.filterList.bind(this);
    console.log(this.props.projects);
  }
  componentWillMount() {
      this.setState({projects: this.state.initialProjects});
  }
  filterList(e) {
    // console.log(`filter ${this}`);
    var updatedList = this.state.initialProjects;
    updatedList = updatedList.filter(function(item){
      // console.log('item: ' + item);
      return item.name.toLowerCase().search(
        e.target.value.toLowerCase()) !== -1 || item.description.toLowerCase().search(
          e.target.value.toLowerCase()) !== -1 || item.description.toLowerCase().search(
          e.target.value.toLowerCase()) !== -1 ;
    });
    this.setState({projects: updatedList, searchQuery: e.target.value});
  };
  render() {

    let message = '';

    if(this.state.projects.length == 0)
    {
      message = 
        <div className="container">
          <div className="alert alert-warning" role="alert">
            <p>No {this.props.type} match the current search - <strong>{this.state.searchQuery}</strong></p>
            <p className="mb-0">Clear it to see all {this.props.type}, or change it to search again.</p>
          </div>
        </div>
      ;
    }

    return (
      <React.Fragment>
        <div className="container pb-0">
          <div className="d-flex justify-content-between">
            <h3 className="px-4 text-capitalize">{this.props.type}</h3>
            <form className="form-inline mb-2">
              <input className="form-control" type="search" 
                placeholder={`Filter ${this.props.type}`} aria-label={`Filter ${this.props.type}`} 
                onChange={this.filterList}
              />
            </form>
          </div>
        </div>
        <ProjectsList projects={this.state.projects} />
        {message}
      </React.Fragment>
    );
  }
}

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

export default SearchWrapper;