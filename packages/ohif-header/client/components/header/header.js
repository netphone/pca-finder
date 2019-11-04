import { Router } from 'meteor/iron:router';
import { Template } from 'meteor/templating';
import { $ } from 'meteor/jquery';
import { OHIF } from 'meteor/ohif:core';

//==================================================================================================
// ROUTER

Router.route('/upload', {
    template: 'upload',
    name: 'upload'
});

Router.route('/segmentation', {
    template: 'segmentation',
    name: 'segmentation'
});

Router.route('/incidence', {
    template: 'incidence',
    name: 'incidence'
});

Router.route('/mpmri', {
    template: 'mpmri',
    name: 'mpmri'
});

Router.route('/pirads', {
    template: 'pirads',
    name: 'pirads'
});

Router.route('/team', {
    template: 'team',
    name: 'team'
});

Router.route('/acknowledgment', {
    template: 'acknowledgment',
    name: 'acknowledgment'
});

Router.route('/contact', {
    template: 'contact',
    name: 'contact'
});

//==================================================================================================
// COMPONENT OUTPUTS

Template.header.onCreated(() => {
    const instance = Template.instance();

    instance.dropdownItems = [];
    instance.autorun(() => {
        OHIF.header.dropdown.observer.depend();
        instance.dropdownItems = OHIF.header.dropdown.getItems();
    });
});

Template.header.onRendered(() => {
    // Create Test Drive button dynamically
    let btnTestDrive = $('<button/>', {
        id: 'btnTestDrive',
        text: 'Explore Now',
        class: 'btn btn-success',
        // style: 'width: 150px;', //  style: 'position: absolute; width: 150px; top: 60px; right: 20px; padding-left: 0;',
        title: 'Explore Study lists',
        click: function () {
            // Login with demo user
            // ActiveEntry.signOut();
            // ActiveEntry.reset();
            // Go to signIn page for new entry
            // Router.go('/studylist'); 
            // Router.go('emailVerification', {}, { replaceState: true });
            // ActiveEntry.signOut();
            if (!Meteor.userId() && !Meteor.loggingIn()) {                
                ActiveEntry.signIn('demo@ohif.org', '12345678aA*');
            } else {
                Router.go('/studylist', {}, { replaceState: true });
                //return false;
            }
        }
    });

    const entrySignIn = $.find('#btnDemo');
    $(entrySignIn).append(btnTestDrive);
});

Template.header.events({
    'click .header-menu'(event, instance) {
        event.preventDefault();

        // Prevent dropdown from being opened if there's one already opened
        if ($(event.currentTarget).find('.dropdown').length) return;

        // Show the dropdown
        OHIF.ui.showDropdown(instance.dropdownItems, {
            parentElement: event.currentTarget,
            menuClasses: 'dropdown-menu-right',
            marginTop: '25px'
        });
    }
});
