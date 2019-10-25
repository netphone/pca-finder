import { Template } from 'meteor/templating';
import { ActiveEntry } from 'meteor/clinical:active-entry';


Template.entrySignIn.hooks({

    rendered: function () {
        if (!Meteor.settings.public.demoUserEnabled) {
            return;
        }

        // Create Test Drive button dynamically
        let btnTestDrive = $('<button/>', {
            id: 'btnTestDrive',
            text: 'Demo',
            class: 'btn btn-success',
            style: 'width: 150px;background-color:#800000;border-color:#555555;margin-top: -9rem;', //  style: 'position: absolute; width: 150px; top: 60px; right: 20px; padding-left: 0;',
            title: 'Login with Demo User',
            click: function () {
                // Login with demo user
                ActiveEntry.signIn('demo@ohif.org', '12345678aA*');
            }
        });

        const entrySignIn = this.find('#btnDemo');
        $(entrySignIn).append(btnTestDrive);
    }

});