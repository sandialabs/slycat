import ko from "knockout";

import slycat_edit_model from 'plugins/slycat-model-wizards/edit-ui';
import slycat_delete_model from 'plugins/slycat-model-wizards/delete-ui';
import slycat_apply_template from 'plugins/slycat-model-wizards/apply-template-ui';
import slycat_create_saved_bookmark from 'plugins/slycat-model-wizards/create-saved-bookmark-ui';
import slycat_create_template from 'plugins/slycat-model-wizards/create-template-ui';
import slycat_info_model from 'plugins/slycat-model-wizards/info-ui';
import slycat_reset_model from 'plugins/slycat-model-wizards/reset-ui';
import slycat_edit_project from 'plugins/slycat-project-wizards/edit-project-ui';

ko.components.register('slycat-edit-project', slycat_edit_project);
ko.components.register('slycat-edit-model', slycat_edit_model);
ko.components.register('slycat-delete-model', slycat_delete_model);
ko.components.register('slycat-apply-template', slycat_apply_template);
ko.components.register('slycat-create-saved-bookmark', slycat_create_saved_bookmark);
ko.components.register('slycat-create-template', slycat_create_template);
ko.components.register('slycat-info-model', slycat_info_model);
ko.components.register('slycat-reset-model', slycat_reset_model);