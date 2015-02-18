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

const GObject = imports.gi.GObject;
const Lang = imports.lang;

const OSMEditDialog = imports.osmEditDialog;
const OSMConnection = imports.osmConnection;

const OSMEditManager = new Lang.Class({
    Name: 'OSMEditManager',
    Extends: GObject.Object,

    _init: function() {
	this._osmConnection = new OSMConnection.OSMConnection();
    },

    showEditDialog: function(parentWindow, place) {
	let dialog = new OSMEditDialog.OSMEditDialog( { transient_for: parentWindow,
						        place: place });
	let response = dialog.run();

	dialog.destroy();
    },

    fetchObject: function(place, callback, cancellable) {
	let osmType = this._getOSMTypeName(place);
	
	this._osmConnection.getOSMObject(osmType, place.osm_id,
					 (function(success, status, data) {
					     print('success: ' + success);
					     print('status: ' + status);
					     print('data: ' + data);
					     callback(success, status, data);
					 }), cancellable);

    },

    _getOSMTypeName: function(place) {
	let osmType;

	switch (place.osm_type) {
	case 1:
	    osmType = 'node';
	    break;
	case 2:
	    osmType = 'relation';
	    break;
	case 3:
	    osmType = 'way';
	    break;
	default:
	    debug ('Unknown OSM type: ' + this._place.osm_type);
	    break;
	}

	return osmType;
    },

    uploadObject: function(object, comment, source, callback) {
	this._osmConnection.openChangeset(comment, source,
					  function(success, status,
						   changesetId) {
					      print('open changeset CB:');
					      print('success: ' + success);
					      print('status: ' + status);
					      print('changeset: ' + changesetId);
					      if (success)
						  this._uploadObject(object,
								     changesetId,
							             callback);
					      else
						  callback(false, status);
					  }.bind(this));
    },

    _uploadObject: function(object, changesetId, callback) {
	this._osmConnection.uploadObject(object, changesetId,
					 function(success, status,
						  response) {
					     print('upload object CB:');
					     print('success: ' + success);
					     print('status: ' + status);
					     print('response: ' + response);
					     if (success)
						 // TODO: set ID (if new object)
						 // or version, from response
						 this._closeChangeset(changesetId,
								      callback);
					     else
						 callback(false, status);
					 }.bind(this));
    },

    _closeChangeset: function(changesetId, callback) {
	this._osmConnection.closeChangeset(changesetId, callback);
    }
});
