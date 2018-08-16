import ko from "knockout";

import slycat_create_project from 'plugins/slycat-project-wizards/create-ui';
import slycat_edit_project from 'plugins/slycat-project-wizards/edit-ui';
import slycat_info_project from 'plugins/slycat-project-wizards/info-ui';
import slycat_delete_project from 'plugins/slycat-project-wizards/delete-ui';

ko.components.register('slycat-create-project', slycat_create_project);
ko.components.register('slycat-edit-project', slycat_edit_project);
ko.components.register('slycat-info-project', slycat_info_project);
ko.components.register('slycat-delete-project', slycat_delete_project);