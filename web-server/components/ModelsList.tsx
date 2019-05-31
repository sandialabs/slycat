import React from "react";
import ReactDOM from "react-dom";
import client from 'js/slycat-web-client';
import server_root from 'js/slycat-server-root';
import model_names from 'js/slycat-model-names';
import * as dialog from 'js/slycat-dialog';
import Spinner from 'components/Spinner.tsx';

class ModelsList extends React.Component {

  state = {
    markings: null,
  };

  componentDidMount() {
    // For testing purposes, to simulate a slow network, uncomment this setTimeout
    // setTimeout( () => {
    this._asyncRequest = client.get_configuration_markings_fetch().then(
      markings => {
        this._asyncRequest = null;
        this.setState({markings: markings});
      }
    );
    // For testing purposes, to simulate a slow network, uncomment this setTimeout
    // }, 10000);
  }

  componentWillUnmount() {
    if (this._asyncRequest) {
      this._asyncRequest.cancel();
    }
  }

  render() {
    if (this.state.markings === null) {
      // Render loading state ...
      return (
        <Spinner />
      );
    } else {
      // Render real UI ...
      const models = this.props.models.map((model) =>
      {
        return  (
                  <Model 
                    name={model.name} 
                    key={model._id}
                    id={model._id} 
                    description={model.description} 
                    created={model.created}
                    creator={model.creator} 
                    model_type={model['model-type']}
                    marking={model.marking}
                    markings={this.state.markings}
                    message={model.message}
                    result={model.result}
                  />
                );
      });

      if(models.length > 0)
      {
        return (
          <div className="container pt-0">
            <div className="card">
              <div className="list-group list-group-flush">
                <React.Fragment>
                  {models}
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
}

class Model extends React.Component {
  render() {
    let recognized_marking = this.props.markings.find(obj => obj.type == this.props.marking);
    return (
      <a className={`list-group-item list-group-item-action ${recognized_marking === undefined ? 'list-group-item-warning' : ''}`} 
        href={server_root + 'models/' + this.props.id}>
        <div className="h6">
          <span className="badge badge-secondary mr-1">{model_names.translate_model_type(this.props.model_type) + ' model'}</span>
          &nbsp;
          <strong>{this.props.name}</strong>
        </div>
        <MarkingsBadge marking={this.props.marking} recognized_marking={recognized_marking} />
        {this.props.result == 'failed' &&
        <span className="badge badge-danger" title={this.props.message}>Failed</span>
        }
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

class MarkingsBadge extends React.Component {
  render() {
    let badge;

    if(this.props.recognized_marking === undefined)
    {
      return (
        <div className="float-right marking-badge" style={{display: 'inline-block'}}>
          <span className="badge badge-danger">
            Unrecognized Marking
            {this.props.marking &&
              <span>: </span>
            }
            {this.props.marking}
          </span>
        </div>
      );
    }
    else {
      {/* badge() function returns HTML, which React escapes, so we need to use
          dangerouslySetInnerHTML per https://reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml */}
      return (
        <div className="float-right marking-badge" 
          style={{display: 'inline-block'}} 
          dangerouslySetInnerHTML={{__html: this.props.recognized_marking.badge}}></div>
      );
    }
  }
}

class TemplatesList extends React.Component {
  render() {
    const templates = this.props.templates
    .filter(function(reference)
    {
      return reference.bid && !reference.mid;
    })
    .map((reference) =>
    {
      return  (
                <Template 
                  name={reference.name} 
                  key={reference._id}
                  id={reference._id} 
                  created={reference.created}
                  creator={reference.creator} 
                  model_type={reference['model-type']}
                  project={reference.project}
                />
              );
    });

    if(templates.length > 0)
    {
      return (
        <div className="container">
          <h3 className="pl-4">Templates</h3>
          <div className="card">
            <div className="list-group list-group-flush">
              <React.Fragment>
                {templates}
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

class Template extends React.Component {
  constructor(props) {
    super(props);
    // This binding is necessary to make `this` work in the callback
    this.delete_template = this.delete_template.bind(this);
  }

  delete_template(e) {
    const template_id = this.props.id;
    const project_id = this.props.project;
    dialog.dialog(
    {
      title: "Delete Template?",
      message: 'The template "' + this.props.name + '" will be deleted immediately and there is no undo.  This will not affect any existing models.',
      buttons: [{className: "btn-light", label:"Cancel"}, {className: "btn-danger",label:"OK"}],
      callback: function(button)
      {
        if(button.label != "OK")
          return;
        client.delete_reference(
        {
          rid: template_id,
          success: function()
          {
            renderTemplates(project_id);
          },
          error: dialog.ajax_error("Couldn't delete template."),
        });
      },
    });
  }

  render() {
    return (
      <div className="list-group-item list-group-item-action">
        <span className="badge badge-secondary mr-1">{model_names.translate_model_type(this.props.model_type) + ' model'}</span>
        &nbsp;
        <strong>{this.props.name} </strong>
        <small>
          <em>
            Created <span>{this.props.created}</span> by <span>{this.props.creator}</span>
          </em>
        </small>
        <span className="float-right">
          {/* <button type="button" className="btn btn-sm btn-warning" data-bind="click: $parent.edit_template"><span className="fa fa-pencil"></span></button> */}
          <button type="button" className="btn btn-sm btn-danger" name={this.props.id} onClick={this.delete_template} title="Delete this template"><span className="fa fa-trash-o"></span></button>
        </span>
      </div>
    );
  }
}

function renderTemplates(project_id) {
  // Create a React TemplatesList component after getting the list of templates in this project
  client.get_project_references(
  {
    pid: project_id,
    success: function(result)
    {
      const templates_list = <TemplatesList templates={result} />
      ReactDOM.render(
        templates_list,
        document.getElementById('slycat-templates')
      );
    }
  });
}

export { ModelsList, TemplatesList, renderTemplates };
