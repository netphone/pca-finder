import { Template } from 'meteor/templating';
import { $ } from 'meteor/jquery';

Template.viewSegmentationDialog.onCreated(() => {
    // const instance = Template.instance();
});

Template.viewSegmentationDialog.onRendered(() => {
    // const instance = Template.instance();
    // const { viewportUtils } = OHIF.viewerbase;

    // instance.$viewportElement = instance.$('.viewport-element');
    // instance.viewportElement = instance.$viewportElement[0];

    // instance.autorun(() => {
    //     const activeViewport = viewportUtils.getActiveViewportElement();
    // });
});

Template.viewSegmentationDialog.events({
    // 'click .js-keep-aspect'(event, instance) {
    //     const currentState = instance.keepAspect.get();
    //     instance.keepAspect.set(!currentState);
    //     instance.$('[data-key=width]').trigger('input');
    // }
});

Template.viewSegmentationDialog.helpers({
    // showQuality() {
    //     const instance = Template.instance();
    //     instance.changeObserver.depend();
    //     if (!instance.form) return true;
    //     return instance.form.item('type').value() === 'jpeg';
    // }
});
