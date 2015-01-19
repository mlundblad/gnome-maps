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
const OSMConnection = imports.osmConnection;

const OSMNode = new Lang.Class({
    Name: 'OSMNode',
    Extends: OSMObject.OSMObject,
    
    _init: function(params) {
	this._lat = params.lat;
	this._lon = params.lon;
	this.parent(params);
    },

    get lat() {
	return this._lat;
    },

    get lon() {
	return this._lon;
    },

    toString: function() {
	let s = 'node changeset: ' + this._changeset + ' lat: ' + this._lat +
	    ' lon: ' + this._lon;

	for (var v in this._tags) {
	    s += '\n';
	    s += '\t';
	    s += 'tag: k=' + v + ', v=' + this.getTag(v);
	}
	
	return s;
    }
});

OSMNode.download = function(conn, id, callback) {
    conn.getOSMObject('node', id, callback);

    // TODO: should parse the returned XML into an OSMNode object,
    // call the callback with that
}


