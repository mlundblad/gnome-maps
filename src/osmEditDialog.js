/* -*- Mode: JS2; indent-tabs-mode: nil; js2-basic-offset: 4 -*- */
/* vim: set et ts=4 sw=4: */
/*
 * Copyright (c) 2015 Marcus Lundblad
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
 * Author: Marcus Lundblad <ml@update.uu.se>
 */

const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;

const Application = imports.application;

const Response = {
    SUCCESS: 0,
    CANCELLED: 1,
};

const OSMEditDialog = new Lang.Class({
    Name: 'OSMEditDialog',
    Extends: Gtk.Dialog,
    Template: 'resource:///org/gnome/Maps/ui/osm-edit-dialog.ui',
    InternalChildren: [ 'cancelButton',
			'saveButton',
			'stack'],
    
    _init: function(params) {
	this._place = params.place;
	delete params.place;
	
	// This is a construct-only property and cannot be set by GtkBuilder
        params.use_header_bar = true;

	this.parent(params);

	this._cancellable = new Gio.Cancellable();
	this._cancellable.connect((function() {
            this.response(Response.CANCELLED);
        }).bind(this));

        this.connect('delete-event', (function() {
            this._cancellable.cancel();
        }).bind(this));

	Application.osmEditManager.fetchObject(this._place,
					       this._fetchOSMObjectCB.bind(this),
					       this._cancellable);
    },

    _fetchOSMObjectCB: function(success, status, data) {
	if (success) {
	    this._loadOSMData(data);
	} else {
	    this._showError(status);
	}
    },

    _loadOSMData: function(data) {
	this._stack.set_visible_child_name('editor');
    },

    _showError: function(status) {

    }
});
