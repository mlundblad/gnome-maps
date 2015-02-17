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

const OSMRelation = new Lang.Class({
    Name: 'OSMRelation',
    Extends: OSMObject.OSMObject,

    _init: function(params) {
	this._members = params.members;
	
	this.parent(params);
    },

    get members() {
	return this._members;
    },

    toXML: function() {
	let tags = this._serializeTagsToList();
	let attrs = this._serializeAttributes();
	let result = '<osm>\n' +
	    '\t<relation ' + attrs + '">\n';

	for (var i = 0; i < this._members.length; i++) {
	    let member = this._members[i];
	    result += '\t\t<member type="' + member.type
		+ '" role="' + member.role + '" ref="' + member.ref
	        + '"/>\n';
	}
	
	for (var i = 0; i < tags.length; i++) {
	    result += '\t\t' + tags[i] + '\n';
	}

	result += '\t</relation>\n' +
	    '</osm>';

	return result;
    }
});
