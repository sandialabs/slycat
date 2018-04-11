//Need to figure out what html tags you can use in JSX, because not all of the ones from slycat-login.html seem to work.

import React, { Component } from 'react';
import $ from 'jquery';
import URI from 'urijs';
import './styles.css';

class Form extends Component {

    constructor(props) {
        super(props);
        this.state = {credentials:
                {username: '',
                 password: ''
        }};
        this.changeUsername = this.changeUsername.bind(this);
        this.changePassword = this.changePassword.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    changeUsername(event) {
        const credentials = this.state.credentials;
        credentials.username = event.target.value;
        this.setState({credentials: credentials});
    }

    changePassword(event) {
        const credentials = this.state.credentials;
        credentials.password = event.target.value;
        this.setState({credentials: credentials});
    }

    handleSubmit(event) {
        console.log('Username: ' + this.state.credentials.username);
        console.log('Password: ' + this.state.credentials.password);

        $.ajax(
            {
                  contentType: "application/json",
                  type: "POST",
                  url: URI("/" + "login"),
                  data: this.state.credentials.username,//json payload
                  success: function(result)
                  {
                    console.log("success " + result);
                    //window.location.replace("/");
                    // window.location.replace(result.target);
                  },
                  error: function(request, status, reason_phrase)
                  {
                    console.log("error request:" + request.responseJSON +" status: "+ status + " reason: " + reason_phrase);
                    // $("#signin-alert").show(200);
                  }
            });

        event.preventDefault();
    }

    render() {
        return (
            <form className="form-signin" onSubmit={this.handleSubmit}>
                <label>
                    Username
                    <input type="text" value={this.state.credentials.username} onChange={this.changeUsername} />
                </label>
                <label>
                    Password
                    <input type="text" value={this.state.credentials.password} onChange={this.changePassword} />
                </label>
                <input type="submit" value="Submit" />
            </form>

        );
    }
}

export default Form;
