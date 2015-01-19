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

const Lang = imports.lang;
const OSMObject = imports.osmObject;
const OSMTag = imports.osmTag;

const OSMChangeset = new Lang.Class({
    Name: 'OSMChangeset',
    Extends: OSMObject.OSMObject,

    _init: function(comment) {
	// add default tags
	this.setTag(new OSMTag.OSMTag({key: 'created_by',
				       value: 'gnome-maps'})); // TODO: add real version number
	this.setTag(new OSMTag.OSMTag({key: 'comment',
				       value: comment}));

	// undefined changeset ID until the changeset has been opened
	this._id = undefined;
    },

    open: function(callback) {
	// TODO: call the OSM REST API to open the changeset, parse response,
	// call callback, etc.

    },

    close: function(callback) {
	// TODO: call the OSM REST API to close the changeset, parse response,
	// call callback, etc.

    }
})
