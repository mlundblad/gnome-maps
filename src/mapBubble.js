/* -*- Mode: JS2; indent-tabs-mode: nil; js2-basic-offset: 4 -*- */
/* vim: set et ts=4 sw=4: */
/*
 * Copyright (c) 2014 Damián Nohales
 *
 * GNOME Maps is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by the
 * Free Software Foundation; either version 2 of the License, or (at your
 * option) any later version.
 *
 * GNOME Maps is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
 * or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with GNOME Maps; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
 *
 * Author: Damián Nohales <damiannohales@gmail.com>
 */

const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;
const Mainloop = imports.mainloop;

const Application = imports.application;
const OSMConnection = imports.osmConnection;
const Place = imports.place;
const PlaceStore = imports.placeStore;
const SendToDialog = imports.sendToDialog;
const Utils = imports.utils;

const Button = {
    NONE: 0,
    ROUTE: 2,
    SEND_TO: 4,
    FAVORITE: 8,
    CHECK_IN: 16,
    EDIT: 32
};

const MapBubble = new Lang.Class({
    Name: "MapBubble",
    Extends: Gtk.Popover,
    Abstract: true,

    _init: function(params) {
        this._place = params.place;
        delete params.place;

        this._mapView = params.mapView;
        params.relative_to = params.mapView;
        params.transitions_enabled = false;
        delete params.mapView;

        let buttonFlags = params.buttons || Button.NONE;
        delete params.buttons;

        let routeFrom = params.routeFrom;
        delete params.routeFrom;

        let checkInMatchPlace = params.checkInMatchPlace;
        if (checkInMatchPlace !== false)
            checkInMatchPlace = true;
        delete params.checkInMatchPlace;

        params.modal = false;

        this.parent(params);
        let ui = Utils.getUIObject('map-bubble', [ 'bubble-main-grid',
                                                   'bubble-image',
                                                   'bubble-content-area',
                                                   'bubble-button-area',
                                                   'bubble-route-button',
                                                   'bubble-send-to-button',
                                                   'bubble-favorite-button',
                                                   'bubble-check-in-button',
						   'bubble-edit-button']);
        this._image = ui.bubbleImage;
        this._content = ui.bubbleContentArea;

        if (!buttonFlags)
            ui.bubbleButtonArea.visible = false;
        else {
            if (buttonFlags & Button.ROUTE)
                this._initRouteButton(ui.bubbleRouteButton, routeFrom);
            if (buttonFlags & Button.SEND_TO)
                this._initSendToButton(ui.bubbleSendToButton);
            if (buttonFlags & Button.FAVORITE)
                this._initFavoriteButton(ui.bubbleFavoriteButton);
            if (buttonFlags & Button.CHECK_IN)
                this._initCheckInButton(ui.bubbleCheckInButton, checkInMatchPlace);
	    if (buttonFlags & Button.EDIT)
		this._initEditButton(ui.bubbleEditButton);
        }

        this.add(ui.bubbleMainGrid);
    },

    get image() {
        return this._image;
    },

    get place() {
        return this._place;
    },

    get content() {
        return this._content;
    },

    _initFavoriteButton: function(button) {
        let placeStore = Application.placeStore;
        let isFavorite = placeStore.exists(this._place,
                                           PlaceStore.PlaceType.FAVORITE);
        button.visible = true;
        button.active = isFavorite;
        button.connect('toggled', (function() {
            if (button.active)
                placeStore.addPlace(this._place,
                                    PlaceStore.PlaceType.FAVORITE);
            else
                placeStore.removePlace(this._place,
                                       PlaceStore.PlaceType.FAVORITE);
        }).bind(this));
    },

    _initSendToButton: function(button) {
        let dialog = new SendToDialog.SendToDialog({ transient_for: this.get_toplevel(),
                                                     place: this._place });
        if (!dialog.ensureApplications())
            return;

        button.visible = true;
        button.connect('clicked', function() {
            dialog.run();
            dialog.hide();
        });
    },

    _initRouteButton: function(button, routeFrom) {
        let query = Application.routeService.query;
        let route = Application.routeService.route;
        let from = query.points[0];
        let to = query.points[query.points.length - 1];

        button.visible = true;

        button.connect('clicked', (function() {
            query.freeze_notify();
            query.reset();
            route.reset();
            if (routeFrom) {
                from.place = this._place;
            } else {
                if (Application.geoclue.place)
                    from.place = Application.geoclue.place;
                to.place = this._place;
            }
            this.destroy();
            query.thaw_notify();
        }).bind(this));
    },

    _initCheckInButton: function(button, matchPlace) {
        Application.checkInManager.bind_property('hasCheckIn',
                                                 button, 'visible',
                                                 GObject.BindingFlags.DEFAULT |
                                                 GObject.BindingFlags.SYNC_CREATE);

        button.connect('clicked', (function() {
            Application.checkInManager.showCheckInDialog(this.get_toplevel(),
                                                         this.place,
                                                         matchPlace);
        }).bind(this));
    },

    _initEditButton: function(button) {
	button.connect('clicked', (function() {
	    print ('about to edit place: type: ' + this._place.osm_type + ' id: ' +
		   this._place.osm_id);

	    Application.osmEditManager.initEditing(this.place);
	}).bind(this));
    }
});
