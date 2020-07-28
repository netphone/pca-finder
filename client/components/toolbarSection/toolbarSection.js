import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { OHIF } from 'meteor/ohif:core';
import { $ } from 'meteor/jquery';
import { Mongo } from 'meteor/mongo';
import { Session } from 'meteor/session';
import 'meteor/ohif:viewerbase';

function isThereSeries(studies) {
    if (studies.length === 1) {
        const study = studies[0];

        if (study.seriesList && study.seriesList.length > 1) {
            return true;
        }

        if (study.displaySets && study.displaySets.length > 1) {
            return true;
        }
    }

    return false;
}

function hasZoneOnModel() {
    const instance = Template.instance();
    const selectedModel = instance.selectedModel.get();

    if (selectedModel === 'Densenet_T2_ABK_auc_08') {
        Session.set('modelWithZone', true);
    } else {
        Session.set('modelWithZone', false);
    }
}

Template.toolbarSection.onCreated(() => {
    const instance = Template.instance();

    if (OHIF.uiSettings.leftSidebarOpen && isThereSeries(instance.data.studies)) {
        instance.data.state.set('leftSidebar', 'studies');
    }

    instance.selectedModel = new ReactiveVar('');
    instance.showsnackbar = new ReactiveVar(true);
});

Template.toolbarSection.helpers({
    leftSidebarToggleButtonData() {
        const instance = Template.instance();
        return {
            toggleable: true,
            key: 'leftSidebar',
            value: instance.data.state,
            options: [{
                value: 'studies',
                svgLink: '/packages/ohif_viewerbase/assets/icons.svg#icon-studies',
                svgWidth: 15,
                svgHeight: 13,
                bottomLabel: 'Series'
            }]
        };
    },

    rightSidebarToggleButtonData() {
        const instance = Template.instance();
        return {
            toggleable: true,
            key: 'rightSidebar',
            value: instance.data.state,
            class: 'report-btn',
            options: [{
                value: 'hangingprotocols',
                iconClasses: 'fa fa-file-text-o',
                bottomLabel: 'Report'
            }]
        };
    },

    toolbarButtons() {
        const extraTools = [];
        const buttonData = [];

        buttonData.push({
            id: 'resetViewport',
            title: 'Reset',
            classes: 'imageViewerCommand',
            iconClasses: 'fa fa-undo'
        });

        buttonData.push({
            id: 'zoom',
            title: 'Zoom',
            classes: 'imageViewerTool',
            svgLink: '/packages/ohif_viewerbase/assets/icons.svg#icon-tools-zoom'
        });

        buttonData.push({
            id: 'wwwc',
            title: 'Levels',
            classes: 'imageViewerTool',
            svgLink: '/packages/ohif_viewerbase/assets/icons.svg#icon-tools-levels'
        });

        buttonData.push({
            id: 'pan',
            title: 'Drag',
            classes: 'imageViewerTool',
            svgLink: '/packages/ohif_viewerbase/assets/icons.svg#icon-tools-pan'
        });

        buttonData.push({
            id: 'scrollSync',
            title: 'Scroll Sync',
            classes: 'imageViewerTool',
            iconClasses: 'fa fa-unsorted'
        });

        buttonData.push({
            id: 'aiFiducial',
            title: 'Predict PCa',
            classes: 'imageViewerTool',
            iconClasses: 'fa fa-magic'
        });

        // buttonData.push({
        //     id: 'fiducial',
        //     title: 'Fiducial',
        //     classes: 'imageViewerTool',
        //     iconClasses: 'fa fa-dot-circle-o'
        // });

        buttonData.push({
            id: 'length',
            title: 'Length',
            classes: 'imageViewerTool toolbarSectionButton',
            svgLink: '/packages/ohif_viewerbase/assets/icons.svg#icon-tools-measure-temp'
        });

        // buttonData.push({
        //     id: 'annotate',
        //     title: 'Annotate',
        //     classes: 'imageViewerTool',
        //     svgLink: '/packages/ohif_viewerbase/assets/icons.svg#icon-tools-measure-non-target'
        // });

        // buttonData.push({
        //     id: 'magnify',
        //     title: 'Magnify',
        //     classes: 'imageViewerTool toolbarSectionButton',
        //     iconClasses: 'fa fa-circle'
        // });

        // buttonData.push({
        //     id: 'wwwcRegion',
        //     title: 'ROI Level',
        //     classes: 'imageViewerTool',
        //     iconClasses: 'fa fa-square'
        // });

        // buttonData.push({
        //     id: 'toggleDownloadDialog',
        //     title: 'Capture',
        //     classes: 'imageViewerCommand',
        //     iconClasses: 'fa fa-camera',
        //     active: () => $('#downloadDialog').is(':visible')
        // });

        // buttonData.push({
        //     id: 'invert',
        //     title: 'Invert',
        //     classes: 'imageViewerCommand',
        //     iconClasses: 'fa fa-adjust'
        // });

        buttonData.push({
            id: 'toggleView3DModelDialog',
            title: '3D Model',
            classes: 'imageViewerCommand',
            iconClasses: 'fa fa-cube',
            active: () => $('#view3DModelDialog').is(':visible')
        });

        return buttonData;
    },

    hangingProtocolButtons() {
        let buttonData = [];

        buttonData.push({
            id: 'previousPatient',
            title: 'Previous',
            iconClasses: 'fa fa-step-backward',
            buttonTemplateName: 'previousPatientButton'
        });

        buttonData.push({
            id: 'nextPatient',
            title: 'Next',
            iconClasses: 'fa fa-step-forward',
            buttonTemplateName: 'nextPatientButton'
        });

        return buttonData;
    }
});

Template.toolbarSection.onRendered(function () {
    const instance = Template.instance();

    const objName = OHIF.viewer.Studies.all()[0]['patientName'];
    substringToCheck = "ProstateX";
    var isContains=objName.indexOf(substringToCheck) !== -1;
    if (isContains){
        $("#aiModels").prop("selectedIndex", 0);
        // $("#aiModels option:disabled").removeAttr('disabled');
        $("#aiModels").find("option").show();
        instance.selectedModel.set("CNN3D");
        Session.set('selectedModel', "CNN3D");
    }else{       
        $("#aiModels option").not(':last-child').each(function (index) {            
            // $(this).prop('disabled', true);
            $(this).hide();
        });
        // mark the last model option as selected
        // $("#aiModels option:last").prop("selected", true);
        $("#aiModels").prop("selectedIndex", 2);
        instance.selectedModel.set("MultiStream_Ensemble");
        Session.set('selectedModel', "MultiStream_Ensemble");
    }
    instance.$('#layout').dropdown();

    if (OHIF.uiSettings.displayEchoUltrasoundWorkflow) {
        OHIF.viewerbase.viewportUtils.toggleCineDialog();
    }

    // Set disabled/enabled tool buttons that are set in toolManager
    const states = OHIF.viewerbase.toolManager.getToolDefaultStates();
    const disabledToolButtons = states.disabledToolButtons;
    const allToolbarButtons = $('#toolbar').find('button');
    if (disabledToolButtons && disabledToolButtons.length > 0) {
        for (let i = 0; i < allToolbarButtons.length; i++) {
            const toolbarButton = allToolbarButtons[i];
            $(toolbarButton).prop('disabled', false);

            const index = disabledToolButtons.indexOf($(toolbarButton).attr('id'));
            if (index !== -1) {
                $(toolbarButton).prop('disabled', true);
            }
        }
    }
});

Template.toolbarSection.events({
    'click .js-aiModels'(event, instance) {
        let selectedModel = event.currentTarget.value;
        instance.selectedModel.set(selectedModel);

        if (instance.showsnackbar.get()) {
            $('#aiModels').change();
        }

        hasZoneOnModel();
    },

    'change .js-aiOption'(event, instance) {
        instance.showsnackbar.set(false);
        Session.set('selectedModel', event.currentTarget.value);
        let modal_snackbar = $('#modal_snackbar').addClass('show');
        setTimeout(() => {
            modal_snackbar.removeClass('show');
        }, 3000);
    },
});