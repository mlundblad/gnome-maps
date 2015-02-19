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

const GLib = imports.gi.GLib;

const OSMObject = new Lang.Class({
    Name: 'OSMObject',
    Abstract: true,

    _init: function(params) {
	this._changeset = params.changeset;

	if (params.id)
	    this._id = params.id;
	else
	    this._id = undefined;

	if (params.version)
	    this._version = params.version;
	else
	    this._version = 1;
	
	if (params.tags)
	    this._tags = params.tags;
	else
	    this._tags = {}
    },
    
    get id() {
	return this._id;
    },

    set id(val) {
	this._id = val;
    },

    get version() {
	return this._version;
    },

    get changeset() {
	return this._changeset;
    },

    set changeset(changeset) {
	this._changeset = changeset;
    },

    setTag: function(key, value) {
	this._tags[key] = value;
    },    
    
    getTag: function(key) {
	return this._tags[key];
    },

    deleteTag: function(key) {
	delete this._tags[key];
    },

    // Abstract
    get type() { },
    
    //Abstract
    toXML: function() { },

    _serializeAttributes: function() {
	return 'id="' + this._id + '" changeset="' + this._changeset +
	    '" version="' + this._version + '"';
    },

    _serializeTagsToList: function() {
	let list = [];

	for (var v in this._tags) {
	    list.push('<tag k="' + GLib.markup_escape_text(v, -1) +
		      '" v="' + GLib.markup_escape_text(this.getTag(v), -1) +
		      '"/>');
	}

	return list;
    } 
});
