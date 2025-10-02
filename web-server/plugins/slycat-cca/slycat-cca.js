import ko from "knockout";

import rerun_cca from 'plugins/slycat-cca/js/rerun-ui';

import cca_wizard from 'plugins/slycat-cca/js//wizard-ui';

ko.components.register('new-cca', cca_wizard);
ko.components.register('rerun-cca', rerun_cca);