import React from "react";
import client from 'js/slycat-web-client';
import server_root from 'js/slycat-server-root';

class SearchWrapper extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      initialProjects: this.props.projects,
      projects: []
    };
    this.filterList = this.filterList.bind(this);
    console.log(this.props.projects);
  }
  componentWillMount() {
      this.setState({projects: this.state.initialProjects});
  }
  filterList(e) {
    console.log(`filter ${this}`);
    var updatedList = this.state.initialProjects;
    updatedList = updatedList.filter(function(item){
      return item.name.toLowerCase().search(
        e.target.value.toLowerCase()) !== -1 || item.description.toLowerCase().search(
          e.target.value.toLowerCase()) !== -1 || item.description.toLowerCase().search(
          e.target.value.toLowerCase()) !== -1 ;
    });
    this.setState({projects: updatedList});
  };
  render() {

    return (
      <div>
      <div className="filter-list">
        <form>
        <fieldset className="form-group">
        <input type="text" className="form-control form-control-lg" placeholder="Search" onChange={this.filterList}/>
        </fieldset>
        </form>
      </div>
      <div>
        <ProjectsList projects={this.state.projects} />
      </div>
      </div>
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
            <span>{this.props.description} - </span>
            <em>
            Created <span>{this.props.created}</span> by <span>{this.props.creator}</span>
            </em>
          </small>
        </p>
      </a>
    );
  }
}

export default SearchWrapper;